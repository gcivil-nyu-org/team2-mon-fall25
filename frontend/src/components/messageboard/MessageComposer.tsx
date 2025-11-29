import { useState, useRef, useEffect } from "react";
import { extractMentions } from "./MessageBoardApi";


// interface MessageComposerProps {
//   onSend: (content: string, mentions: string[]) => void;
//   disabled?: boolean;
// }

// Mock list of users for @mention autocomplete
// const USERS = [
//   "Sarah Chen",
//   "Alex Johnson",
//   "Mike Ross",
//   "Priya Nair",
//   "John Miller",
// ];
interface User{
  id: string;
  name: string;
}
interface MessageComposerProps {
  onSend: (content: string, mentions: string[]) => void;
  disabled?: boolean;
  users?: User[];  // <-- ADD THIS
}

export function MessageComposer({ onSend, disabled = false, users = [] }: MessageComposerProps) {
  const [content, setContent] = useState("");
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  // Handle @mention detection
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = content.substring(0, cursorPos);
    const lastAtSymbol = textBeforeCursor.lastIndexOf("@");

    if (lastAtSymbol !== -1 && lastAtSymbol === cursorPos - 1) {
      // Just typed @
      setMentionSearch("");
      setShowMentionDropdown(true);
      setSelectedMentionIndex(0);
    } else if (lastAtSymbol !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);
      if (!textAfterAt.includes(" ") && textAfterAt.length > 0) {
        setMentionSearch(textAfterAt);
        setShowMentionDropdown(true);
        setSelectedMentionIndex(0);
      } else if (textAfterAt.includes(" ")) {
        setShowMentionDropdown(false);
      }
    } else {
      setShowMentionDropdown(false);
    }
  }, [content]);

  const filteredUsers = users
  .map(u => u.name)
  .filter((userName) =>
    userName.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const handleSend = () => {
    if (!content.trim() || disabled) return;

    const mentions = extractMentions(content);
    onSend(content.trim(), mentions);
    setContent("");
    setShowMentionDropdown(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionDropdown && filteredUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev < filteredUsers.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredUsers[selectedMentionIndex]);
        return;
      } else if (e.key === "Escape") {
        setShowMentionDropdown(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey && !showMentionDropdown) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertMention = (username: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = content.substring(0, cursorPos);
    const textAfterCursor = content.substring(cursorPos);
    const lastAtSymbol = textBeforeCursor.lastIndexOf("@");

    const newContent =
      textBeforeCursor.substring(0, lastAtSymbol) +
      `@${username} ` +
      textAfterCursor;

    setContent(newContent);
    setShowMentionDropdown(false);

    // Set cursor position after mention
    setTimeout(() => {
      const newCursorPos = lastAtSymbol + username.length + 2;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  };

  return (
    <div>
      <div className="relative">
        {/* @Mention Dropdown */}
        {showMentionDropdown && filteredUsers.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute bottom-full mb-2 left-0 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-lg max-h-40 overflow-y-auto z-10"
            style={{ minWidth: "200px" }}
          >
            {filteredUsers.map((user, index) => (
              <button
                key={user}
                onClick={() => insertMention(user)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
                  index === selectedMentionIndex
                    ? "bg-blue-50 dark:bg-blue-900/30"
                    : ""
                } ${index === 0 ? "rounded-t-lg" : ""} ${
                  index === filteredUsers.length - 1 ? "rounded-b-lg" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                    {user.charAt(0)}
                  </div>
                  <span className="text-zinc-900 dark:text-zinc-100">{user}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (use @ to mention someone)"
            disabled={disabled}
            className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            rows={1}
            style={{ minHeight: "40px", maxHeight: "120px" }}
          />
          <button
            onClick={handleSend}
            disabled={!content.trim() || disabled}
            className="flex-shrink-0 p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Send message (Enter)"
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
      </div>
    </div>
  );
}
