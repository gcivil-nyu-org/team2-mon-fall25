import React, { useState, useRef, useEffect } from "react";

interface Props {
  onAdd: (taskName: string) => void;
  onOpenFullModal?: () => void;
  placeholder?: string;
  variant?: "board" | "list";
}

const QuickAddTask: React.FC<Props> = ({
  onAdd,
  onOpenFullModal,
  placeholder = "Add a task...",
  variant = "board",
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [taskName, setTaskName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when entering add mode
  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const handleSubmit = () => {
    const trimmedName = taskName.trim();
    if (trimmedName) {
      onAdd(trimmedName);
      setTaskName("");
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      setTaskName("");
      setIsAdding(false);
    }
  };

  const handleBlur = () => {
    // Small delay to allow clicking "More details" button
    setTimeout(() => {
      if (taskName.trim()) {
        handleSubmit();
      } else {
        setIsAdding(false);
      }
    }, 150);
  };

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className={`
          w-full text-left rounded-lg border-2 border-dashed
          border-zinc-300 dark:border-zinc-700
          hover:border-zinc-400 dark:hover:border-zinc-600
          hover:bg-zinc-50 dark:hover:bg-zinc-800/50
          transition-all
          ${variant === "board" ? "p-3 text-sm" : "p-2 text-xs"}
        `}
      >
        <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
          <span className="text-lg">+</span>
          <span>{placeholder}</span>
        </span>
      </button>
    );
  }

  return (
    <div
      className={`
        rounded-lg border-2 border-blue-500 dark:border-blue-400
        bg-white dark:bg-zinc-900
        shadow-sm
        ${variant === "board" ? "p-3" : "p-2"}
      `}
    >
      <input
        ref={inputRef}
        type="text"
        value={taskName}
        onChange={(e) => setTaskName(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`
          w-full bg-transparent
          text-zinc-900 dark:text-zinc-100
          placeholder:text-zinc-400 dark:placeholder:text-zinc-500
          focus:outline-none
          ${variant === "board" ? "text-sm" : "text-xs"}
        `}
      />
      {onOpenFullModal && (
        <button
          onClick={(e) => {
            e.preventDefault();
            onOpenFullModal();
          }}
          className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          + More details
        </button>
      )}
      <div className="mt-2 text-[10px] text-zinc-500 dark:text-zinc-400">
        Press Enter to save • Esc to cancel
      </div>
    </div>
  );
};

export default QuickAddTask;
