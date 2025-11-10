import { useState, useEffect, useRef } from "react";
import type { Message } from "./MessageBoardApi";
import {
  getReplies,
  createMessage,
  updateMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  CURRENT_USER,
  extractMentions,
  formatRelativeTime,
} from "./MessageBoardApi";
import { MessageItem } from "./MessageItem";

interface ThreadModalProps {
  open: boolean;
  onClose: () => void;
  parentMessage: Message | null;
  onUpdate: () => void;
}

export function ThreadModal({
  open,
  onClose,
  parentMessage,
  onUpdate,
}: ThreadModalProps) {
  const [replies, setReplies] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const repliesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && parentMessage) {
      loadReplies();
    } else {
      setReplies([]);
      setReplyContent("");
    }
  }, [open, parentMessage]);

  useEffect(() => {
    if (repliesEndRef.current) {
      repliesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [replies.length]);

  const loadReplies = async () => {
    if (!parentMessage) return;
    try {
      setIsLoading(true);
      const data = await getReplies(parentMessage.id);
      setReplies(data);
    } catch (error) {
      console.error("Failed to load replies:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyContent.trim() || !parentMessage || isSending) return;

    try {
      setIsSending(true);
      const mentions = extractMentions(replyContent);
      const newReply = await createMessage(
        replyContent.trim(),
        mentions,
        parentMessage.id
      );
      setReplies((prev) => [...prev, newReply]);
      setReplyContent("");
      onUpdate();
    } catch (error) {
      console.error("Failed to send reply:", error);
      alert("Failed to send reply. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleEditReply = async (id: string, content: string) => {
    try {
      const mentions = extractMentions(content);
      const updatedMessage = await updateMessage(id, content, mentions);
      setReplies((prev) => prev.map((m) => (m.id === id ? updatedMessage : m)));
      onUpdate();
    } catch (error) {
      console.error("Failed to edit reply:", error);
      alert("Failed to edit reply. Please try again.");
    }
  };

  const handleDeleteReply = async (id: string) => {
    try {
      await deleteMessage(id);
      setReplies((prev) => prev.filter((m) => m.id !== id));
      onUpdate();
    } catch (error) {
      console.error("Failed to delete reply:", error);
      alert("Failed to delete reply. Please try again.");
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      const message = replies.find((m) => m.id === messageId);
      if (!message) return;

      const reaction = message.reactions.find((r) => r.emoji === emoji);
      const hasReacted = reaction?.users.includes(CURRENT_USER.name);

      let updatedMessage: Message;
      if (hasReacted) {
        updatedMessage = await removeReaction(messageId, emoji, CURRENT_USER.name);
      } else {
        updatedMessage = await addReaction(messageId, emoji, CURRENT_USER.name);
      }

      setReplies((prev) =>
        prev.map((m) => (m.id === messageId ? updatedMessage : m))
      );
      onUpdate();
    } catch (error) {
      console.error("Failed to update reaction:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  if (!open || !parentMessage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Thread
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {replies.length} {replies.length === 1 ? "reply" : "replies"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5 text-zinc-600 dark:text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Parent Message */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex-shrink-0">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
              {parentMessage.author.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {parentMessage.author}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {formatRelativeTime(parentMessage.timestamp)}
                </span>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-words">
                {parentMessage.content}
              </p>
            </div>
          </div>
        </div>

        {/* Replies */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="text-center py-8 text-zinc-500">
              Loading replies...
            </div>
          ) : replies.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
              No replies yet. Be the first to respond!
            </div>
          ) : (
            <>
              {replies.map((reply) => (
                <MessageItem
                  key={reply.id}
                  message={reply}
                  onEdit={handleEditReply}
                  onDelete={handleDeleteReply}
                  onReaction={handleReaction}
                />
              ))}
              <div ref={repliesEndRef} />
            </>
          )}
        </div>

        {/* Reply Input */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 flex-shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write a reply..."
              disabled={isSending}
              className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              rows={2}
            />
            <button
              onClick={handleSendReply}
              disabled={!replyContent.trim() || isSending}
              className="flex-shrink-0 p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Send reply (Enter)"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
          <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
}
