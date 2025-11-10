import { useState, useRef, useEffect } from "react";
import type { Message } from "./MessageBoardApi";
import {
  formatRelativeTime,
  CURRENT_USER,
  REACTION_EMOJIS,
} from "./MessageBoardApi";

interface MessageItemProps {
  message: Message;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onReaction: (messageId: string, emoji: string) => void;
  onReply?: (message: Message) => void;
}

export function MessageItem({
  message,
  onEdit,
  onDelete,
  onReaction,
  onReply,
}: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const reactionPickerRef = useRef<HTMLDivElement>(null);

  const isCurrentUser = message.authorId === CURRENT_USER.id;

  // Close reaction picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        reactionPickerRef.current &&
        !reactionPickerRef.current.contains(event.target as Node)
      ) {
        setShowReactionPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  // Highlight @mentions in content
  const renderContent = () => {
    if (isEditing) {
      return (
        <div className="mt-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 resize-none"
            rows={3}
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleSaveEdit}
              className="px-3 py-1 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={handleCancelEdit}
              className="px-3 py-1 text-xs rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    const parts = message.content.split(/(@[A-Za-z\s]+?)(?=\s|$|[,.!?])/g);
    return (
      <p className="text-sm text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap break-words">
        {parts.map((part, index) => {
          if (part.startsWith("@")) {
            return (
              <span
                key={index}
                className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1 rounded"
              >
                {part}
              </span>
            );
          }
          return part;
        })}
        {message.isEdited && (
          <span className="text-xs text-zinc-400 dark:text-zinc-600 ml-1">
            (edited)
          </span>
        )}
      </p>
    );
  };

  return (
    <div
      className={`group bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 mb-3 hover:shadow-md transition-all ${
        isCurrentUser ? "ring-2 ring-blue-200 dark:ring-blue-900/50" : ""
      }`}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
            {message.author.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {message.author}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {formatRelativeTime(message.timestamp)}
            </span>
            {isCurrentUser && (
              <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                You
              </span>
            )}
          </div>

          {/* Content */}
          {renderContent()}

          {/* Reactions */}
          {message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {message.reactions.map((reaction, index) => {
                const hasReacted = reaction.users.includes(CURRENT_USER.name);
                return (
                  <button
                    key={index}
                    onClick={() => onReaction(message.id, reaction.emoji)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs transition-colors ${
                      hasReacted
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-700"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                    title={reaction.users.join(", ")}
                  >
                    <span>{reaction.emoji}</span>
                    <span>{reaction.count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-1 mt-2">
              {/* Add Reaction */}
              <div className="relative" ref={reactionPickerRef}>
                <button
                  onClick={() => setShowReactionPicker(!showReactionPicker)}
                  className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  title="Add reaction"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>

                {/* Reaction Picker Dropdown */}
                {showReactionPicker && (
                  <div className="absolute left-0 mt-1 p-2 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-lg z-10 flex gap-1">
                    {REACTION_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          onReaction(message.id, emoji);
                          setShowReactionPicker(false);
                        }}
                        className="text-lg hover:scale-125 transition-transform p-1"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reply (only for parent messages) */}
              {onReply && message.parentId === null && (
                <button
                  onClick={() => onReply(message)}
                  className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center gap-1"
                  title="Reply to thread"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                    />
                  </svg>
                  {message.replyCount > 0 && (
                    <span className="text-xs">{message.replyCount}</span>
                  )}
                </button>
              )}

              {/* Edit (own messages only) */}
              {isCurrentUser && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    title="Edit message"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => onDelete(message.id)}
                    className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                    title="Delete message"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
