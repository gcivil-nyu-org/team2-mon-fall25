import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Message } from "./MessageBoardApi";
import { useAuth0 } from "@auth0/auth0-react";
import {
  getReplies,
  createMessage,
  updateMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  extractMentions,
  formatRelativeTime,
} from "./MessageBoardApi";
import { MessageItem } from "./MessageItem";

interface ThreadModalProps {
  open: boolean;
  onClose: () => void;
  parentMessage: Message | null;
  onUpdate: () => void;
  incrementReplyCount?: () => void;
}

export function ThreadModal({
  open,
  onClose,
  parentMessage,
  onUpdate,
  incrementReplyCount,
}: ThreadModalProps) {
  const [replies, setReplies] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const repliesEndRef = useRef<HTMLDivElement>(null);
  const { user, getAccessTokenSilently } = useAuth0();
  const [parent, setParent] = useState<Message | null>(parentMessage);
  const CURRENT_USER = useMemo(() => ({
    id: user?.sub ?? "",  // Auth0 sub is the unique ID
    name: user?.name ?? user?.nickname ?? user?.email ?? "Unknown User",
    email: user?.email ?? "", 
  }), [user]);
  useEffect(() => {
  setParent(parentMessage);
}, [parentMessage]);

  // useEffect(() => {
  //   if (open && parentMessage) {
  //     loadReplies();
  //   } else {
  //     setReplies([]);
  //     setReplyContent("");
  //   }
  // }, [open, parentMessage]);

  // useEffect(() => {
  //   if (repliesEndRef.current) {
  //     repliesEndRef.current.scrollIntoView({ behavior: "smooth" });
  //   }
  // }, [replies.length]);

  const loadReplies = useCallback(async () => {
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
  }, [parentMessage, getAccessTokenSilently, CURRENT_USER]);

  useEffect(() => {
    if (open && parentMessage) {
      loadReplies();
    } else {
      setReplies([]);
      setReplyContent("");
    }
  }, [open, parentMessage, loadReplies]);
 
  useEffect(() => {
    if (repliesEndRef.current) {
      repliesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [replies.length]);
  
  const handleSendReply = async () => {
  if (!replyContent.trim() || !parentMessage || isSending) return;

  try {
    setIsSending(true);
    const token = await getAccessTokenSilently();

    const mentions = extractMentions(replyContent);
    const newReply = await createMessage(
      replyContent.trim(),
      mentions,
      parentMessage.id,
      token
    );
    const replyWithAuthor = {
      ...newReply,
      id: newReply.id, 
      content: replyContent.trim(), 
      authorId: CURRENT_USER.id,
      author: CURRENT_USER.name,
      reactions: [], 
      replyCount: 0, 
      timestamp: new Date().toISOString(), 
    };

    // Update local replies
    setReplies((prev) => [...prev, replyWithAuthor]);
    setParent((prev) => prev ? { ...prev, replyCount: (prev.replyCount || 0) + 1 } : prev);
    incrementReplyCount?.();
    onUpdate();
    setReplyContent("");
  } catch (error) {
    console.error("Failed to send reply:", error);
    alert("Failed to send reply. Please try again.");
  } finally {
    setIsSending(false);
  }
};

  const handleEditReply = async (id: string, content: string) => {
  const originalReply = replies.find((r) => r.id === id); 
  if (!originalReply) return;

  try {
    const token = await getAccessTokenSilently(); 
    const mentions = extractMentions(content);
    const updatedReply = await updateMessage(id, content, mentions, token);
    const replyWithAuthorFix = {
      ...originalReply,
      ...updatedReply,
      content,
      authorId: originalReply.authorId ?? CURRENT_USER.id,
      author: originalReply.author ?? CURRENT_USER.name,
      reactions: updatedReply.reactions ?? originalReply.reactions ?? [],
      timestamp: updatedReply.timestamp ?? new Date().toISOString(),
    };
    // 3. Update state
    setReplies((prev) =>
      prev.map((m) => (m.id === id ? replyWithAuthorFix : m))
    );

  } catch (error) {
    console.error("Failed to edit reply:", error);
  }
};

  const handleDeleteReply = async (id: string) => {
    if (!parentMessage) return;

    try {
      const token = await getAccessTokenSilently(); 
      await deleteMessage(id, token);
      setReplies((prev) => prev.filter((m) => m.id !== id));
      setParent((prev) =>
  prev ? { ...prev, replyCount: Math.max((prev.replyCount || 1) - 1, 0) } : prev
);
      onUpdate();
    } catch (error) {
      console.error("Failed to delete reply:", error);
      alert("Failed to delete reply. Please try again.");
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
  const message = replies.find((m) => m.id === messageId);
      if (!message) return;
  const hasReacted = message.reactions.some(
    (r) => r.emoji === emoji && r.users.includes(CURRENT_USER.id)
  );
  setReplies((prev) =>
    prev.map((m) => {
      if (m.id !== messageId) return m;

      let newReactions = [...m.reactions];

      if (hasReacted) {
        newReactions = newReactions
          .map((r) =>
            r.emoji === emoji
              ? {
                  ...r,
                  users: r.users.filter((u) => u !== CURRENT_USER.id),
                  count: r.users.filter((u) => u !== CURRENT_USER.id).length,
                }
              : r
          )
          .filter((r) => r.count > 0);
      } else {
        const existing = newReactions.find((r) => r.emoji === emoji);
        if (existing) {
          if (!existing.users.includes(CURRENT_USER.id)) {
            existing.users.push(CURRENT_USER.id);
            existing.count = existing.users.length;
          }
        } else {
          newReactions.push({ emoji, users: [CURRENT_USER.id], count: 1 });
        }
      }

      return { ...m, reactions: newReactions };
    })
  );
  try {
    const token = await getAccessTokenSilently();
    if (hasReacted) {
      await removeReaction(messageId, emoji, token);
    } else {
      await addReaction(messageId, emoji, token);
    }
  } catch (error) {
    console.error("Failed to persist message reaction:", error);
  }
};
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  if (!open || !parent) return null;

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
            {parent?.author?.charAt(0)?.toUpperCase() ?? "?"}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {/* If current user is the author, show “You” instead */}
                {parent?.authorId === CURRENT_USER.id ? CURRENT_USER.name : parent?.author ?? "Unknown"}
              </span>

              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {formatRelativeTime(parent?.timestamp ?? new Date().toISOString())}
              </span>
            </div>

            <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-words">
              {parent?.content ?? ""}
            </p>

            {/* ✅ Reply count (instant update without refresh) */}
            <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              {(parent?.replyCount ?? 0) === 0
                ? "No replies yet"
                : `${parent?.replyCount} ${
                    (parent?.replyCount ?? 0) === 1 ? "reply" : "replies"
                  }`}
            </div>
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
                  currentUser={CURRENT_USER}
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
