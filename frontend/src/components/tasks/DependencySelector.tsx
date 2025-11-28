import React, { useState } from "react";
import { type Task, type TaskDependency } from "../../types";

interface Props {
  availableTasks: Task[];
  selectedDependencies: TaskDependency[];
  onAdd: (taskId: string) => void;
  onRemove: (taskId: string) => void;
}

export const DependencySelector: React.FC<Props> = ({
  availableTasks,
  selectedDependencies,
  onAdd,
  onRemove,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTasks = availableTasks.filter(
    (task) =>
      task.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !selectedDependencies.some((dep) => dep.id === task.id)
  );

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "done":
        return "✓";
      case "in-progress":
        return "⏳";
      case "todo":
        return "○";
    }
  };

  const getStatusColor = (status: Task["status"]) => {
    switch (status) {
      case "done":
        return "text-green-600 dark:text-green-400";
      case "in-progress":
        return "text-blue-600 dark:text-blue-400";
      case "todo":
        return "text-zinc-500 dark:text-zinc-400";
    }
  };

  const getStatusBadgeColor = (status: Task["status"]) => {
    switch (status) {
      case "done":
        return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";
      case "in-progress":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300";
      case "todo":
        return "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300";
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
        Dependencies
      </label>

      {/* Selected Dependencies */}
      {selectedDependencies.length > 0 && (
        <div className="mb-3 space-y-2">
          {selectedDependencies.map((dep) => (
            <div
              key={dep.id}
              className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className={`text-sm flex-shrink-0 ${getStatusColor(dep.status)}`}>
                  {getStatusIcon(dep.status)}
                </span>
                <span className="text-sm text-zinc-900 dark:text-zinc-100 truncate">
                  {dep.title}
                </span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${getStatusBadgeColor(
                    dep.status
                  )}`}
                >
                  {dep.status}
                </span>
              </div>
              <button
                onClick={() => onRemove(dep.id)}
                className="ml-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex-shrink-0"
                title="Remove dependency"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Dependency */}
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Search tasks to add as dependency..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700
                     bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                     placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     transition-all text-sm"
        />

        {searchQuery && filteredTasks.length > 0 && (
          <div className="max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800">
            {filteredTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => {
                  onAdd(task.id);
                  setSearchQuery("");
                }}
                className="w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700
                           flex items-center gap-2 text-sm transition-colors"
              >
                <span className={getStatusColor(task.status)}>
                  {getStatusIcon(task.status)}
                </span>
                <span className="text-zinc-900 dark:text-zinc-100 flex-1 truncate">
                  {task.name}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${getStatusBadgeColor(task.status)}`}>
                  {task.status}
                </span>
              </button>
            ))}
          </div>
        )}

        {searchQuery && filteredTasks.length === 0 && (
          <div className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-2">
            No tasks found
          </div>
        )}
      </div>

      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        This task will be blocked until all dependencies are completed
      </p>
    </div>
  );
};

export default DependencySelector;
