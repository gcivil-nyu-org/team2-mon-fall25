import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Message } from "./MessageBoardApi";
import { useAuth0 } from "@auth0/auth0-react";
import { fetchAllUsers } from "../../lib/api";
import type { User as ApiUser } from "../../lib/api";
import { useDebounce } from './useDebounce';
import {
  getMessages,
  createMessage,
  updateMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  searchMessages,
  extractMentions,
  getMessage,
} from "./MessageBoardApi";
import { MessageFeed } from "./MessageFeed";
import { MessageComposer } from "./MessageComposer";
import { ConfirmModal } from "../modals/ConfirmModal";
import { ThreadModal } from "./ThreadModal";

// const PAGE_SIZE = 20; 

export function MessageBoard({ openThreadMessageId }: { openThreadMessageId?: string | null }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showNewMessageIndicator, setShowNewMessageIndicator] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // const firstLoadRef = useRef(true); 
  const [searchInput, setSearchInput] = useState("");
  const debouncedQuery = useDebounce(searchInput, 300);
  const [threadMessage, setThreadMessage] = useState<Message | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [userMap, setUserMap] = useState<Map<string, string>>(new Map());
  const messageEndRef = useRef<HTMLDivElement>(null);
  const { user, getAccessTokenSilently } = useAuth0();
  const lastMessageIdRef = useRef<string | null>(null);

  // Track current workspace to trigger reload on workspace change
  const [currentWorkspace, setCurrentWorkspace] = useState<string>(() =>
    localStorage.getItem("cd.workspace") || localStorage.getItem("workspace_id") || ""
  );

  const currentUser = useMemo(() => ({
    id: user?.sub ?? "",
    name: user?.name ?? user?.email ?? "Unknown User",
    email: user?.email ?? "",
  }), [user]);

  // Listen for workspace changes in localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const newWorkspace = localStorage.getItem("cd.workspace") || localStorage.getItem("workspace_id") || "";
      if (newWorkspace !== currentWorkspace) {
        console.log("Workspace changed from", currentWorkspace, "to", newWorkspace);
        setCurrentWorkspace(newWorkspace);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    // const interval = setInterval(handleStorageChange, 500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      // clearInterval(interval);
    };
  }, [currentWorkspace]);

  // Load all users for mentions
  useEffect(() => {
    const loadAllUsers = async () => {
      try {
        const usersData = await fetchAllUsers();
        const map = new Map<string, string>();
        usersData.forEach((u: ApiUser) => {
          map.set(String(u.id), u.full_name);
        });
        setUserMap(map);
      } catch (error) {
        console.error("Failed to load all users:", error);
      }
    };
    loadAllUsers();
  }, []);

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!currentWorkspace || userMap.size === 0) {
      console.log("No workspace selected, skipping message load");
      setMessages([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log("Loading messages for workspace:", currentWorkspace);
      const token = await getAccessTokenSilently();
      const data = debouncedQuery
        ? await searchMessages(debouncedQuery, token)
        : await getMessages(token);
      const currentUserId = currentUser.id;
      const cleanedMessages = data.map(m => {
        const displayAuthorName = userMap.get(m.authorId) || m.author;
        const isCurrentUserMessage = m.authorId === currentUserId;
        const finalAuthorName = isCurrentUserMessage ? currentUser.name : displayAuthorName;
        return {
          ...m,
          authorId: isCurrentUserMessage ? currentUserId : m.authorId,
          author: finalAuthorName
        };
      });
      cleanedMessages.reverse();
      setMessages(cleanedMessages);
    } catch (error) {
      console.error("Failed to load messages:", error);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, userMap, currentUser, currentWorkspace, getAccessTokenSilently]);

  // Reload messages when dependencies change
  useEffect(() => {
  loadMessages();
}, [loadMessages]);

  // Open thread when openThreadMessageId is provided
  useEffect(() => {
    if (openThreadMessageId && messages.length > 0) {
      const message = messages.find((m) => m.id === openThreadMessageId);
      if (message) {
        setThreadMessage(message);
      }
    }
  }, [openThreadMessageId, messages]);

  useEffect(() => {
  const container = scrollContainerRef.current;
  if (!container || !messages.length) return;

  const lastMessageId = messages[messages.length - 1].id;
  const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;

  if (lastMessageIdRef.current && lastMessageIdRef.current !== lastMessageId && !isAtBottom) {
    setShowNewMessageIndicator(true);
  } else if (isAtBottom) {
    setShowNewMessageIndicator(false);
    scrollToBottom();
  }

  lastMessageIdRef.current = lastMessageId;

  const handleScroll = () => {
    const isAtBottomScroll = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
    if (isAtBottomScroll) setShowNewMessageIndicator(false);
  };

  container.addEventListener("scroll", handleScroll);
  return () => container.removeEventListener("scroll", handleScroll);
}, [messages]);

  const handleSendMessage = async (content: string, mentions: string[]) => {
    if (!content.trim()) return;

    try {
      setIsSending(true);
      const token = await getAccessTokenSilently();

      const newMessage = await createMessage(content, mentions, null, token);
      const messageWithAuthor = {
        ...newMessage,
        authorId: currentUser.id,
        author: currentUser.name,
      };
      setMessages((prev) => [...prev, messageWithAuthor]);
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };
  const updateParentMessageLocally = (parentId: string) => {
  setMessages(prev =>
    prev.map(m =>
      m.id === parentId ? { ...m, replyCount: (m.replyCount || 0) + 1 } : m
    )
  );

  // also update in modal if open
  if (threadMessage?.id === parentId) {
    setThreadMessage(prev =>
      prev ? { ...prev, replyCount: (prev.replyCount || 0) + 1 } : prev
    );
  }
};
  const handleEditMessage = async (id: string, content: string) => {
    const originalMessage = messages.find(m => m.id === id);
    if (!originalMessage || originalMessage.content === content) return;

    try {
      const token = await getAccessTokenSilently();
      const mentions = extractMentions(content);
      const updatedMessage = await updateMessage(id, content, mentions, token);
      const messageWithAuthorFix = {
        ...updatedMessage,
        authorId: currentUser.id,
        author: currentUser.name,
        reactions: originalMessage.reactions,
      };

      setMessages((prev) =>
        prev.map((m) => (m.id === id ? messageWithAuthorFix : m))
      );
    } catch (error) {
      console.error("Error updating message:", error);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;

    setIsDeleting(true);
    try {
      const token = await getAccessTokenSilently();
      await deleteMessage(deleteConfirmId, token);
      setMessages((prev) => prev.filter((m) => m.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Error deleting message:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    const messageToUpdate = messages.find((m) => m.id === messageId);
    if (!messageToUpdate) return;
    const hasReacted = messageToUpdate.reactions.some(
      (r) => r.emoji === emoji && r.users.includes(currentUser.id)
    );
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;

        let newReactions = [...m.reactions];

        if (hasReacted) {
          newReactions = newReactions
            .map((r) =>
              r.emoji === emoji
                ? {
                  ...r,
                  users: r.users.filter((u) => u !== currentUser.id),
                  count: r.users.filter((u) => u !== currentUser.id).length,
                }
                : r
            )
            .filter((r) => r.count > 0);
        } else {
          const existing = newReactions.find((r) => r.emoji === emoji);
          if (existing) {
            if (!existing.users.includes(currentUser.id)) {
              existing.users.push(currentUser.id);
              existing.count = existing.users.length;
            }
          } else {
            newReactions.push({ emoji, users: [currentUser.id], count: 1 });
          }
        }

        return { ...m, reactions: newReactions };
      })
    );

    try {
      const token = await getAccessTokenSilently();
      let updatedMessageFromServer: Message;
      if (hasReacted) {
        updatedMessageFromServer = await removeReaction(messageId, emoji, token);
      } else {
        updatedMessageFromServer = await addReaction(messageId, emoji, token);
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...updatedMessageFromServer, author: m.author }
            : m
        )
      );
    } catch (error) {
      console.error("Failed to persist message reaction:", error);
    }
  };

  const handleUpdate = async () => {
    if (!threadMessage) return;

    const currentParentMessage = messages.find(m => m.id === threadMessage.id);
    const preservedReactions = currentParentMessage ? currentParentMessage.reactions : [];
    try {
      const latestParentMessage = await getMessage(threadMessage.id);
      if (latestParentMessage) {
        const isCurrentUserAuthor = latestParentMessage.authorId === currentUser.id;
        const fixedParentMessage = {
          ...latestParentMessage,
          authorId: isCurrentUserAuthor ? currentUser.id : latestParentMessage.authorId,
          author: isCurrentUserAuthor ? currentUser.name : latestParentMessage.author,
          reactions: preservedReactions,
        };

        setMessages((prev) =>
          prev.map((m) =>
            m.id === fixedParentMessage.id ? fixedParentMessage : m
          )
        );
        setThreadMessage(fixedParentMessage);
      }
    } catch (error) {
      console.error("Failed to update parent message in board:", error);
    }
  };

  
  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="h-screen w-full flex flex-col bg-white dark:bg-zinc-950">
      {/* HEADER - Fixed at top */}
      <header className="flex-shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Message Board
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Search Toggle */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`p-2 rounded-lg transition-colors ${
                showSearch
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
              title="Search messages"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            {/* Message count */}
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>{messages.length} messages</span>
            </div>
          </div>
        </div>

        {/* Search Bar - Shows under header when toggled */}
        {showSearch && (
          <div className="mt-4">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search messages..."
                autoFocus
                className="w-full pl-9 pr-10 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* MESSAGES - Scrollable middle section */}
      <main 
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
        
          <MessageFeed
            messages={messages}
            isLoading={isLoading}
            onEdit={handleEditMessage}
            onDelete={handleDeleteMessage}
            onReaction={handleReaction}
            onReply={(message) => setThreadMessage(message)}
            currentUser={currentUser}
          />
          <div ref={messageEndRef} />
          {showNewMessageIndicator && (
  <button
    onClick={scrollToBottom}
    className="absolute bottom-4 right-4 px-3 py-2 bg-blue-600 text-white rounded-full shadow-lg animate-bounce"
  >
    New Messages ↓
  </button>
)}

        {/* Scroll to Bottom Button */}
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 p-3 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors"
          title="Scroll to latest messages"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      </main>

      {/* FOOTER - Fixed at bottom with composer */}
      <footer className="flex-shrink-0 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <MessageComposer onSend={handleSendMessage} disabled={isSending} />
      </footer>

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
        onUpdate={handleUpdate}
        updateParentMessageLocally={updateParentMessageLocally}
      />
    </div>
  );
}

