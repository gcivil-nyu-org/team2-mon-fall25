import React from "react";
import { type Task, type TaskDependency } from "../../types";

interface Props {
  task: Task;
  incompleteDependencies: TaskDependency[];
  onClose: () => void;
  onViewDependencies?: () => void;
}

export const BlockedTaskModal: React.FC<Props> = ({
  task,
  incompleteDependencies,
  onClose,
  onViewDependencies,
}) => {
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
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <span className="text-red-600 dark:text-red-400 text-xl">⚠</span>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Cannot Complete Task
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                "{task.name}" has incomplete dependencies
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-4">
            Complete these tasks first, or remove dependencies to continue:
          </p>

          <div className="space-y-2">
            {incompleteDependencies.map((dep) => (
              <div
                key={dep.id}
                className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700"
              >
                <span className={`${getStatusColor(dep.status)}`}>
                  {getStatusIcon(dep.status)}
                </span>
                <span className="text-sm text-zinc-900 dark:text-zinc-100 flex-1">
                  {dep.title}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${getStatusBadgeColor(
                    dep.status
                  )}`}
                >
                  {dep.status}
                </span>
              </div>
            ))}
          </div>

          {incompleteDependencies.length > 3 && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3 text-center">
              Showing {incompleteDependencies.length} incomplete{" "}
              {incompleteDependencies.length === 1 ? "dependency" : "dependencies"}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
          {onViewDependencies && (
            <button
              onClick={() => {
                onViewDependencies();
                onClose();
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300
                         bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700
                         hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            >
              View Dependencies
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-black dark:bg-white
                       text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-100
                       transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlockedTaskModal;
