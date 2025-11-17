import { formatDistanceToNow } from 'date-fns';
import { MarkdownRenderer } from '../shared/MarkdownRenderer';
import type { Message } from './types';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  onSaveToNotes?: () => void;
}

export function ChatMessage({ message, isStreaming = false, onSaveToNotes }: ChatMessageProps) {
  const timeAgo = formatDistanceToNow(new Date(message.created_at), { addSuffix: true });
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%]">
          <div className="bg-blue-600 text-white rounded-2xl px-4 py-3 shadow-sm">
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 text-right">
            You • {timeAgo}
          </div>
        </div>
      </div>
    );
  }

  // AI message
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🤖</span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            AI Assistant • {isStreaming ? 'typing...' : timeAgo}
          </span>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
          {isStreaming ? (
            <div className="flex items-center gap-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-zinc-400 dark:bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">Thinking...</span>
            </div>
          ) : (
            <div className="text-sm text-zinc-900 dark:text-zinc-100">
              <MarkdownRenderer content={message.content} />
            </div>
          )}
        </div>

        {!isStreaming && (message.action_type === 'summary' || message.action_type === 'plan') && (
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={onSaveToNotes}
              disabled={message.saved_to_notes}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors flex items-center gap-2 ${
                message.saved_to_notes
                  ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                />
              </svg>
              {message.saved_to_notes ? 'Saved to Notes' : 'Save to Notes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
