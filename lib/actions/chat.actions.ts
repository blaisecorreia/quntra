'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { auth } from '@/lib/better-auth/auth';
import { headers } from 'next/headers';
import { connectToDatabase } from '@/database/mongoose';
import { Chat } from '@/database/models/chat.model';
import { getWatchlistWithData } from '@/lib/actions/watchlist.actions';
import { getAlertsByUserId } from '@/lib/actions/alerts.actions';
import { CHATBOT_SYSTEM_PROMPT } from '@/lib/inngest/prompts';

const MODEL_NAME = 'gemini-2.5-flash-lite';
const MAX_STORED_MESSAGES = 40;
const MAX_HISTORY_FOR_CONTEXT = 20;

type StoredChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
};

export const getChatHistory = async (): Promise<{ success: boolean; data?: ChatMessage[]; error?: string }> => {
  try {
    await connectToDatabase();

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !session.user) {
      return { success: true, data: [] };
    }

    const doc = await Chat.findOne({ userId: session.user.id }).lean<{ messages: StoredChatMessage[] }>();
    const messages: ChatMessage[] = (doc?.messages || []).map((m) => ({
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    }));

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
    });

    const history = priorMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const chatSession = model.startChat({ history });
    const result = await chatSession.sendMessage(trimmed);
    const replyText = result.response.text();

    const userMsg: StoredChatMessage = { role: 'user', content: trimmed, createdAt: new Date() };
    const assistantMsg: StoredChatMessage = { role: 'assistant', content: replyText, createdAt: new Date() };

    await Chat.updateOne(
      { userId: user.id },
      { $push: { messages: { $each: [userMsg, assistantMsg], $slice: -MAX_STORED_MESSAGES } } },
      { upsert: true }
    );

    return {
      success: true,
      data: { role: 'assistant', content: replyText, createdAt: assistantMsg.createdAt.toISOString() },
    };
  } catch (error) {
    console.log('sendChatMessage failed', error);
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
};
