import { formatDistanceToNow } from 'date-fns';
import type { Conversation } from './types';

interface RecentConversationsSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
}

export function RecentConversationsSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
}: RecentConversationsSidebarProps) {
  // Show only the 10 most recent conversations
  const recentConversations = conversations
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 10);

  return (
    <aside className="hidden lg:block w-[300px] shrink-0 sticky top-14 self-start">
      <div className="rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Recent
        </div>
        <div className="space-y-2 text-sm">
          {recentConversations.length === 0 ? (
            <div className="text-zinc-500 dark:text-zinc-400 text-xs">
              No conversations yet
            </div>
          ) : (
            recentConversations.map((conversation) => {
              const isActive = conversation.id === activeConversationId;
              const timeAgo = formatDistanceToNow(new Date(conversation.updated_at), {
                addSuffix: true,
              });

              return (
                <div
                  key={conversation.id}
                  className={`group relative rounded-xl border p-2.5 transition-all ${
                    isActive
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                      : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <button
                    onClick={() => onSelectConversation(conversation.id)}
                    className="w-full text-left"
                  >
                    <div
                      className={`font-medium truncate text-sm pr-6 ${
                        isActive
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-zinc-900 dark:text-zinc-100'
                      }`}
                    >
                      {conversation.title}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        {timeAgo}
                      </span>
                      {conversation.message_count > 0 && (
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                          }`}
                        >
                          {conversation.message_count}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete conversation "${conversation.title}"?`)) {
                        onDeleteConversation(conversation.id);
                      }
                    }}
                    className="absolute top-2 right-2 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 dark:hover:bg-red-900/30 text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                    title="Delete conversation"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
}
