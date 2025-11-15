import { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSendMessage: (content: string, actionType?: 'summary' | 'plan') => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, isStreaming, disabled = false }: ChatInputProps) {
  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  const handleSend = (actionType?: 'summary' | 'plan') => {
    if (!inputValue.trim() && !actionType) return;

    let content = inputValue.trim();
    if (actionType === 'summary') {
      content = 'Please create a comprehensive summary of this document.';
    } else if (actionType === 'plan') {
      content = 'Please create an execution plan based on this document.';
    }

    onSendMessage(content, actionType);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isDisabled = disabled || isStreaming;

  return (
    <div className="border-t border-zinc-200 dark:border-zinc-800 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Input Area */}
        <div className="relative flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your document..."
              disabled={isDisabled}
              rows={1}
              className="w-full px-4 py-3 pr-12 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
            <div className="absolute right-3 bottom-3 text-xs text-zinc-400 dark:text-zinc-500">
              {isStreaming ? 'AI is typing...' : 'Enter to send'}
            </div>
          </div>

          <button
            onClick={() => handleSend()}
            disabled={isDisabled || !inputValue.trim()}
            className="flex-shrink-0 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            aria-label="Send message"
          >
            {isStreaming ? (
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
