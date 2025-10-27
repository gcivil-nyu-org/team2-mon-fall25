import React from "react";
import { type Task } from "../../types";

interface Props {
  task: Task;
}

const TaskCard: React.FC<Props> = ({ task }) => {
  // Priority badge styling
  const getPriorityStyle = (priority: Task["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
      case "medium":
        return "bg-black text-white dark:bg-white dark:text-black";
      case "low":
        return "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300";
    }
  };

  // Format date to MM/DD/YYYY
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 mb-3 hover:shadow-md transition-shadow cursor-pointer group">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-zinc-900 dark:text-zinc-100 flex-1 pr-2">
          {task.name}
        </h3>
        <button className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M8 9C8.55228 9 9 8.55228 9 8C9 7.44772 8.55228 7 8 7C7.44772 7 7 7.44772 7 8C7 8.55228 7.44772 9 8 9Z"
              fill="currentColor"
            />
            <path
              d="M8 4C8.55228 4 9 3.55228 9 3C9 2.44772 8.55228 2 8 2C7.44772 2 7 2.44772 7 3C7 3.55228 7.44772 4 8 4Z"
              fill="currentColor"
            />
            <path
              d="M8 14C8.55228 14 9 13.5523 9 13C9 12.4477 8.55228 12 8 12C7.44772 12 7 12.4477 7 13C7 13.5523 7.44772 14 8 14Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Priority Badge */}
      <div className="mb-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityStyle(
            task.priority
          )}`}
        >
          {task.priority}
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
        {/* Due Date */}
        <div className="flex items-center text-xs text-zinc-500 dark:text-zinc-500">
          <svg
            className="w-3.5 h-3.5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span>Due {formatDate(task.dueDate)}</span>
        </div>

        {/* Assigned User Avatar */}
        {task.assignedTo && (
          <div className="w-6 h-6 rounded-full bg-zinc-300 dark:bg-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-700 dark:text-zinc-300">
            {task.assignedTo}
          </div>
        )}
      </div>

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {task.tags.map((tag, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskCard;
