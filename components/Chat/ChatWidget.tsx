'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { sendChatMessage, resolveChatAction } from '@/lib/actions/chat.actions';

const GREETING = "Hi! How can I help you today? Ask me about your watchlist, your alerts, or what might fit your goals.";

// Gemini's replies come back as markdown (bold, lists, links). These
// overrides keep that formatting readable inside a small chat bubble
// instead of react-markdown's default block spacing, which is built for
// full-width article text.
const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-4 mb-2 last:mb-0 space-y-0.5">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal pl-4 mb-2 last:mb-0 space-y-0.5">{children}</ol>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold">{children}</strong>,
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-yellow-500 underline hover:text-yellow-400">
      {children}
    </a>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="bg-gray-900/60 px-1 py-0.5 rounded text-xs">{children}</code>
  ),
};

const describeAction = (action: ChatAction, tense: 'propose' | 'done' = 'propose'): string => {
  if (action.type === 'add_to_watchlist') {
    const verb = tense === 'propose' ? 'Add' : 'Added';
    return `${verb} ${action.params.symbol} (${action.params.company}) to your watchlist`;
  }
  const { symbol, alertName, alertType, threshold } = action.params;
  const verb = tense === 'propose' ? 'Create alert' : 'Created alert';
  return `${verb} "${alertName}" — notify when ${symbol} goes ${alertType === 'upper' ? 'above' : 'below'} $${threshold?.toFixed(2)}`;
};

const ActionCard = ({
  action,
  isResolving,
  onDecide,
}: {
  action: ChatAction;
  isResolving: boolean;
  onDecide: (decision: 'confirm' | 'cancel') => void;
}) => {
  if (action.status === 'pending') {
    return (
      <div className="chat-action-card">
        <div className="chat-action-desc">{describeAction(action)}</div>
        <div className="chat-action-buttons">
          <button onClick={() => onDecide('cancel')} disabled={isResolving} className="chat-action-cancel">
            Cancel
          </button>
          <button onClick={() => onDecide('confirm')} disabled={isResolving} className="chat-action-confirm">
            {isResolving ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : 'Confirm'}
          </button>
        </div>
      </div>
    );
  }

  if (action.status === 'confirmed') {
    return (
      <div className="chat-action-status chat-action-status-ok">
        <CheckCircle2 size={14} /> {describeAction(action, 'done')}
      </div>
    );
  }

  if (action.status === 'cancelled') {
    return (
      <div className="chat-action-status chat-action-status-muted">
        <XCircle size={14} /> Cancelled
      </div>
    );
  }

  return (
    <div className="chat-action-status chat-action-status-error">
      <AlertTriangle size={14} /> {action.error || 'Could not complete this action'}
    </div>
  );
};

export const ChatWidget = ({ initialMessages }: ChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [resolvingActionId, setResolvingActionId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = { role: 'user', content: trimmed, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsSending(true);

    try {
      const res = await sendChatMessage({ message: trimmed });
      if (res.success && res.data) {
        setMessages((prev) => [...prev, res.data as ChatMessage]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: res.error || "Something went wrong. Please try again.", createdAt: new Date().toISOString() },
        ]);
      }
    } catch (error) {
      console.log('Chat send error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Please try again.', createdAt: new Date().toISOString() },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleActionDecision = async (messageId: string | undefined, decision: 'confirm' | 'cancel') => {
    if (!messageId) return;
    setResolvingActionId(messageId);

    try {
      const res = await resolveChatAction({ messageId, decision });
      if (res.success && res.data) {
        setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, action: res.data } : m)));
      } else {
        toast.error(res.error || 'Could not update this action');
      }
    } catch (error) {
      console.log('Chat action decision error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setResolvingActionId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={`chat-fab ${isOpen ? 'chat-fab-open' : ''}`}
        aria-label={isOpen ? 'Close assistant' : 'Open assistant'}
      >
        {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
        {!isOpen && <span>How can I help?</span>}
      </button>

      {isOpen && (
        <div className="chat-panel">
          <div className="chat-panel-header">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-yellow-500" />
              <span className="chat-panel-title">Quntra Assistant</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="chat-panel-close" aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <div ref={listRef} className="chat-panel-list">
            {messages.length === 0 && <div className="chat-greeting">{GREETING}</div>}
            {messages.map((m, i) => (
              <div key={m.id ?? i} className={`chat-message ${m.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'}`}>
                {m.role === 'assistant' ? (
                  <ReactMarkdown components={markdownComponents}>{m.content}</ReactMarkdown>
                ) : (
                  m.content
                )}
                {m.action && (
                  <ActionCard
                    action={m.action}
                    isResolving={resolvingActionId === m.id}
                    onDecide={(decision) => handleActionDecision(m.id, decision)}
                  />
                )}
              </div>
            ))}
            {isSending && (
              <div className="chat-message chat-message-assistant chat-message-loading">
                <Loader2 className="animate-spin h-4 w-4" />
                Thinking...
              </div>
            )}
          </div>

          <div className="chat-panel-input">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your portfolio..."
              rows={1}
              className="chat-textarea"
            />
            <button onClick={handleSend} disabled={isSending || !input.trim()} className="chat-send-btn" aria-label="Send">
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
