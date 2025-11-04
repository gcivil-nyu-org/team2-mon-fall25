import { useState, useEffect, useRef } from "react";
import type { Message } from "./MessageBoardApi";
import {
  getMessages,
  createMessage,
  updateMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  searchMessages,
  CURRENT_USER,
  extractMentions,
} from "./MessageBoardApi";
import { MessageFeed } from "./MessageFeed";
import { MessageComposer } from "./MessageComposer";
import { ConfirmModal } from "../modals/ConfirmModal";
import { ThreadModal } from "./ThreadModal";

export function MessageBoard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [threadMessage, setThreadMessage] = useState<Message | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const messageEndRef = useRef<HTMLDivElement>(null);

  // Load messages on mount
  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const data = searchQuery.trim()
        ? await searchMessages(searchQuery)
        : await getMessages();
      setMessages(data);
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Reload messages when search query changes
  useEffect(() => {
    loadMessages();
  }, [searchQuery]);

  const handleSendMessage = async (content: string, mentions: string[]) => {
    try {
      setIsSending(true);
      const newMessage = await createMessage(content, mentions);
      setMessages((prev) => [...prev, newMessage]);
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleEditMessage = async (id: string, content: string) => {
    try {
      const mentions = extractMentions(content);
      const updatedMessage = await updateMessage(id, content, mentions);
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? updatedMessage : m))
      );
    } catch (error) {
      console.error("Failed to edit message:", error);
      alert("Failed to edit message. Please try again.");
    }
  };

  const handleDeleteMessage = async (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      setIsDeleting(true);
      await deleteMessage(deleteConfirmId);
      setMessages((prev) => prev.filter((m) => m.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Failed to delete message:", error);
      alert("Failed to delete message. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      const message = messages.find((m) => m.id === messageId);
      if (!message) return;

      // Check if user already reacted with this emoji
      const reaction = message.reactions.find((r) => r.emoji === emoji);
      const hasReacted = reaction?.users.includes(CURRENT_USER.name);

      let updatedMessage: Message;
      if (hasReacted) {
        // Remove reaction
        updatedMessage = await removeReaction(messageId, emoji, CURRENT_USER.name);
      } else {
        // Add reaction
        updatedMessage = await addReaction(messageId, emoji, CURRENT_USER.name);
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? updatedMessage : m))
      );
    } catch (error) {
      console.error("Failed to update reaction:", error);
    }
  };

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="h-full flex flex-col relative">
      {/* Header - Sticky at top */}
      <div className="flex-shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Message Board
            </h1>
          </div>

          {/* Message count */}
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>{messages.length} messages</span>
          </div>
        </div>
      </div>

      {/* Message Feed - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <MessageFeed
          messages={messages}
          isLoading={isLoading}
          onEdit={handleEditMessage}
          onDelete={handleDeleteMessage}
          onReaction={handleReaction}
          onReply={(message) => setThreadMessage(message)}
        />
        <div ref={messageEndRef} />
      </div>

      {/* Scroll to Bottom Button */}
      <button
        onClick={scrollToBottom}
        className="fixed bottom-24 right-8 p-3 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors z-20"
        title="Scroll to latest messages"
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
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </button>

      {/* Message Composer with Search - Sticky at bottom */}
      <div className="flex-shrink-0 bg-white dark:bg-zinc-950 sticky bottom-0 z-10 border-t border-zinc-200 dark:border-zinc-800">
        {/* Search Bar Popup */}
        {showSearch && (
          <div className="border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                autoFocus
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Composer with Search Toggle */}
        <div className="px-4 pb-4 pt-4">
          <div className="flex items-end gap-2 mb-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                showSearch
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
              title="Search messages"
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
            <div className="flex-1">
              <MessageComposer onSend={handleSendMessage} disabled={isSending} />
            </div>
          </div>
          {/* Helper text */}
          <div className="text-xs text-zinc-500 dark:text-zinc-400 ml-[calc(40px+0.5rem)]">
            <span>Press Enter to send, Shift+Enter for new line</span>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={deleteConfirmId !== null}
        onClose={() => !isDeleting && setDeleteConfirmId(null)}
        title="Delete Message?"
        confirmText="Delete"
        confirmVariant="danger"
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      >
        This message will be permanently deleted. This action cannot be undone.
      </ConfirmModal>

      {/* Thread Modal */}
      <ThreadModal
        open={threadMessage !== null}
        onClose={() => setThreadMessage(null)}
        parentMessage={threadMessage}
        onUpdate={loadMessages}
      />
    </div>
  );
}
