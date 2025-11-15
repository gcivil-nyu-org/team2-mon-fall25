import { useRef, useEffect } from "react";
import type { Message } from "./MessageBoardApi";
import { MessageItem } from "./MessageItem";

interface MessageFeedProps {
  messages: Message[];
  isLoading: boolean;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onReply?: (message: Message) => void;
  currentUser: { id: string; name: string; email: string };
}

export function MessageFeed({
  messages,
  isLoading,
  onEdit,
  onDelete,
  onReaction,
  onReply,
  currentUser,
}: MessageFeedProps) {
  const feedEndRef = useRef<HTMLDivElement>(null);
  const feedContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (feedEndRef.current) {
      feedEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-zinc-500 dark:text-zinc-400">Loading messages...</div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <svg
          className="w-16 h-16 mb-4 text-zinc-400 dark:text-zinc-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-1">
          No messages yet
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Be the first to start the conversation!
        </p>
      </div>
    );
  }

  // Filter to only show parent messages (not replies)
  const parentMessages = messages.filter((m) => m.parentId === null);

  return (
    <div ref={feedContainerRef} className="p-4">
      {parentMessages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          onEdit={onEdit}
          onDelete={onDelete}
          onReaction={onReaction}
          onReply={onReply}
          currentUser={currentUser}
        />
      ))}
      {/* Invisible element to scroll to */}
      <div ref={feedEndRef} />
    </div>
  );
}
