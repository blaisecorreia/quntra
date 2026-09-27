'use server';

import { GoogleGenerativeAI, SchemaType, type Tool } from '@google/generative-ai';
import mongoose from 'mongoose';
import { auth } from '@/lib/better-auth/auth';
import { headers } from 'next/headers';
import { connectToDatabase } from '@/database/mongoose';
import { Chat } from '@/database/models/chat.model';
import { getWatchlistWithData, addToWatchlist } from '@/lib/actions/watchlist.actions';
import { getAlertsByUserId, createAlert } from '@/lib/actions/alerts.actions';
import { CHATBOT_SYSTEM_PROMPT } from '@/lib/inngest/prompts';

const MODEL_NAME = 'gemini-2.5-flash-lite';
const MAX_STORED_MESSAGES = 40;
const MAX_HISTORY_FOR_CONTEXT = 20;

type StoredChatMessage = {
  _id?: mongoose.Types.ObjectId;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  action?: ChatAction;
};

// The model never executes anything directly — calling one of these only
// produces a pending action the user must explicitly confirm (see
// resolveChatAction below). That's what makes it safe to let the model
// propose an action whenever it looks like what the user asked for.
const CHAT_TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'add_to_watchlist',
        description: "Propose adding a stock to the user's watchlist.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            symbol: { type: SchemaType.STRING, description: 'The stock ticker symbol, e.g. AAPL' },
            company: { type: SchemaType.STRING, description: 'The full company name, e.g. Apple Inc.' },
          },
          required: ['symbol', 'company'],
        },
      },
      {
        name: 'create_alert',
        description: 'Propose creating a price alert for a stock.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            symbol: { type: SchemaType.STRING, description: 'The stock ticker symbol, e.g. AAPL' },
            company: { type: SchemaType.STRING, description: 'The full company name' },
            alertName: { type: SchemaType.STRING, description: 'A short human-readable name for the alert' },
            alertType: {
              type: SchemaType.STRING,
              format: 'enum',
              enum: ['upper', 'lower'],
              description: "'upper' to alert when price goes above threshold, 'lower' to alert when it goes below",
            },
            threshold: { type: SchemaType.NUMBER, description: 'The target price in USD' },
          },
          required: ['symbol', 'company', 'alertName', 'alertType', 'threshold'],
        },
      },
    ],
  },
];

// Messages stored before this feature's schema added per-message _id have
// none — `id` comes back undefined for those, which is fine: they're plain
// history with no action to ever confirm/cancel against.
const toChatMessage = (m: StoredChatMessage): ChatMessage => ({
  id: m._id?.toString(),
  role: m.role,
  content: m.content,
  createdAt: m.createdAt.toISOString(),
  action: m.action,
});

// Turns a raw Gemini function-call into a validated pending action, or null
// if the model supplied bad/incomplete arguments — in that case we fall
// back to treating the turn as plain text rather than showing a broken
// confirmation card.
const buildPendingAction = (name: string, args: Record<string, unknown>): ChatAction | null => {
  const symbol = typeof args.symbol === 'string' ? args.symbol.trim().toUpperCase() : '';
  const company = typeof args.company === 'string' ? args.company.trim() : '';
  if (!symbol || !company) return null;

  if (name === 'add_to_watchlist') {
    return { type: 'add_to_watchlist', params: { symbol, company }, status: 'pending' };
  }

  if (name === 'create_alert') {
    const alertName = typeof args.alertName === 'string' ? args.alertName.trim() : '';
    const alertType = args.alertType === 'upper' || args.alertType === 'lower' ? args.alertType : undefined;
    const threshold = typeof args.threshold === 'number' && Number.isFinite(args.threshold) && args.threshold > 0 ? args.threshold : undefined;
    if (!alertName || !alertType || !threshold) return null;

    return { type: 'create_alert', params: { symbol, company, alertName, alertType, threshold }, status: 'pending' };
  }

  return null;
};

export const getChatHistory = async (): Promise<{ success: boolean; data?: ChatMessage[]; error?: string }> => {
  try {
    await connectToDatabase();

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return { success: true, data: [] };
    }

    const doc = await Chat.findOne({ userId: session.user.id }).lean<{ messages: StoredChatMessage[] }>();
    const messages = (doc?.messages || []).map(toChatMessage);

    return { success: true, data: messages };
  } catch (error) {
    console.log('getChatHistory failed', error);
    return { success: true, data: [] };
  }
};

export const sendChatMessage = async ({ message }: { message: string }): Promise<{ success: boolean; data?: ChatMessage; error?: string }> => {
  try {
    const trimmed = message.trim();
    if (!trimmed) {
      return { success: false, error: 'Message cannot be empty' };
    }

    if (!process.env.GEMINI_API_KEY) {
      return { success: false, error: 'The AI assistant is not configured yet.' };
    }

    await connectToDatabase();

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { user } = session;

    const [watchlistRes, alertsRes, chatDoc] = await Promise.all([
      getWatchlistWithData(),
      getAlertsByUserId(),
      Chat.findOne({ userId: user.id }).lean<{ messages: StoredChatMessage[] }>(),
    ]);

    const watchlist = watchlistRes.success ? watchlistRes.data || [] : [];
    const alerts = alertsRes.success ? alertsRes.data || [] : [];
    const priorMessages = (chatDoc?.messages || []).slice(-MAX_HISTORY_FOR_CONTEXT);

    const userProfile = [
      `Name: ${user.name || 'Investor'}`,
      `Country: ${user.country || 'Not specified'}`,
      `Investment goals: ${user.investmentGoals || 'Not specified'}`,
      `Risk tolerance: ${user.riskTolerance || 'Not specified'}`,
      `Preferred industry: ${user.preferredIndustry || 'Not specified'}`,
    ].join('\n');

    const watchlistSummary = watchlist.length
      ? watchlist
          .map((s) => `- ${s.symbol} (${s.company}): ${s.priceFormatted}, ${s.changeFormatted}, P/E ${s.peRatio}, Market Cap ${s.marketCap}`)
          .join('\n')
      : 'No stocks in watchlist yet.';

    const alertsSummary = alerts.length
      ? alerts
          .map(
            (a) =>
              `- ${a.symbol} "${a.alertName}": alert when price goes ${a.alertType === 'upper' ? 'above' : 'below'} $${a.threshold.toFixed(2)} (currently $${a.currentPrice.toFixed(2)}, ${a.isActive ? 'active' : 'paused'})`
          )
          .join('\n')
      : 'No active alerts.';

    const systemPrompt = CHATBOT_SYSTEM_PROMPT.replace('{{userProfile}}', userProfile)
      .replace('{{watchlist}}', watchlistSummary)
      .replace('{{alerts}}', alertsSummary);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: systemPrompt,
      tools: CHAT_TOOLS,
    });

    const history = priorMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const chatSession = model.startChat({ history });
    const result = await chatSession.sendMessage(trimmed);

    // Only the first proposed action is used, even if the model somehow
    // returns more than one — keeps the confirmation UX to one action at
    // a time, which is what the system prompt asks for anyway.
    const functionCalls = result.response.functionCalls();
    const firstCall = functionCalls?.[0];
    const action = firstCall ? buildPendingAction(firstCall.name, firstCall.args as Record<string, unknown>) : null;

    const replyText = result.response.text() || (action ? 'Here’s what I’d like to do:' : '');

    const userMsg: StoredChatMessage = {
      _id: new mongoose.Types.ObjectId(),
      role: 'user',
      content: trimmed,
      createdAt: new Date(),
    };
    const assistantMsg: StoredChatMessage = {
      _id: new mongoose.Types.ObjectId(),
      role: 'assistant',
      content: replyText,
      createdAt: new Date(),
      action: action ?? undefined,
    };

    await Chat.updateOne(
      { userId: user.id },
      { $push: { messages: { $each: [userMsg, assistantMsg], $slice: -MAX_STORED_MESSAGES } } },
      { upsert: true }
    );

    return { success: true, data: toChatMessage(assistantMsg) };
  } catch (error) {
    console.log('sendChatMessage failed', error);
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
};

export const resolveChatAction = async ({
  messageId,
  decision,
}: {
  messageId: string;
  decision: 'confirm' | 'cancel';
}): Promise<{ success: boolean; data?: ChatAction; error?: string }> => {
  try {
    await connectToDatabase();

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const doc = await Chat.findOne({ userId: session.user.id, 'messages._id': messageId });
    if (!doc) {
      return { success: false, error: 'Message not found' };
    }

    const message = doc.messages.id(messageId);
    // Re-checking `pending` here (not just trusting the client) is what
    // stops a double-click, a stale tab, or a replayed request from
    // executing the same action twice.
    if (!message || !message.action || message.action.status !== 'pending') {
      return { success: false, error: 'This action is no longer pending' };
    }

    if (decision === 'cancel') {
      message.action.status = 'cancelled';
      await doc.save();
      return { success: true, data: message.action.toObject() };
    }

    const { type, params } = message.action;
    let execResult: { success: boolean; error?: string };

    if (type === 'add_to_watchlist') {
      execResult = await addToWatchlist({ symbol: params.symbol, company: params.company });
    } else if (type === 'create_alert') {
      execResult = await createAlert({
        symbol: params.symbol,
        company: params.company,
        alertName: params.alertName || `${params.symbol} alert`,
        alertType: params.alertType || 'upper',
        threshold: String(params.threshold ?? ''),
      });
    } else {
      execResult = { success: false, error: 'Unknown action type' };
    }

    message.action.status = execResult.success ? 'confirmed' : 'failed';
    if (!execResult.success) {
      message.action.error = execResult.error;
    }
    await doc.save();

    return { success: true, data: message.action.toObject() };
  } catch (error) {
    console.log('resolveChatAction failed', error);
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
};
