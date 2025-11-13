import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns';
import type { Conversation } from './types';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onNewChat: () => void;
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onNewChat,
}: ConversationSidebarProps) {
  const groupConversations = () => {
    const groups: {
      today: Conversation[];
      yesterday: Conversation[];
      lastWeek: Conversation[];
      older: Conversation[];
    } = {
      today: [],
      yesterday: [],
      lastWeek: [],
      older: [],
    };

    conversations.forEach((conv) => {
      const date = new Date(conv.created_at);
      if (isToday(date)) {
        groups.today.push(conv);
      } else if (isYesterday(date)) {
        groups.yesterday.push(conv);
      } else if (isThisWeek(date, { weekStartsOn: 0 })) {
        groups.lastWeek.push(conv);
      } else {
        groups.older.push(conv);
      }
    });

    return groups;
  };

  const groups = groupConversations();

  const ConversationItem = ({ conversation }: { conversation: Conversation }) => {
    const isActive = activeConversationId === conversation.id;
    const timeAgo = formatDistanceToNow(new Date(conversation.created_at), { addSuffix: true });

    return (
      <div
        onClick={() => onSelectConversation(conversation.id)}
        className={`group relative p-3 rounded-lg cursor-pointer transition-all ${
          isActive
            ? 'bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-600'
            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 border-l-4 border-transparent'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
              {conversation.title}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {timeAgo}
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
              {conversation.message_count} {conversation.message_count === 1 ? 'message' : 'messages'}
            </p>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Delete conversation "${conversation.title}"?`)) {
                onDeleteConversation(conversation.id);
              }
            }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
            title="Delete conversation"
            aria-label="Delete conversation"
          >
            <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-60 h-full bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={onNewChat}
          className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {conversations.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No conversations yet
            </p>
          </div>
        ) : (
          <>
            {groups.today.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 px-3">
                  Today
                </h3>
                <div className="space-y-1">
                  {groups.today.map((conv) => (
                    <ConversationItem key={conv.id} conversation={conv} />
                  ))}
                </div>
              </div>
            )}

            {groups.yesterday.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 px-3">
                  Yesterday
                </h3>
                <div className="space-y-1">
                  {groups.yesterday.map((conv) => (
                    <ConversationItem key={conv.id} conversation={conv} />
                  ))}
                </div>
              </div>
            )}

            {groups.lastWeek.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 px-3">
                  Last 7 Days
                </h3>
                <div className="space-y-1">
                  {groups.lastWeek.map((conv) => (
                    <ConversationItem key={conv.id} conversation={conv} />
                  ))}
                </div>
              </div>
            )}

            {groups.older.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 px-3">
                  Older
                </h3>
                <div className="space-y-1">
                  {groups.older.map((conv) => (
                    <ConversationItem key={conv.id} conversation={conv} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {conversations.length > 0 && (
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => {
              if (window.confirm('Clear all conversations? This cannot be undone.')) {
                conversations.forEach((conv) => onDeleteConversation(conv.id));
              }
            }}
            className="w-full text-xs text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            Clear all chats
          </button>
        </div>
      )}
    </div>
  );
}
