import React, { useState } from "react";
import { type Task } from "../../types";

interface Props {
  tasks: Task[];
  onTaskStatusChange?: (taskId: string, newStatus: Task["status"]) => void;
  onTaskPriorityChange?: (taskId: string, newPriority: Task["priority"]) => void;
  onTaskDelete?: (taskId: string) => void;
}

const TaskList: React.FC<Props> = ({ tasks, onTaskStatusChange, onTaskPriorityChange, onTaskDelete }) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Priority badge styling
  const getPriorityStyle = (priority: Task["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
      case "medium":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "low":
        return "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300";
    }
  };

  // Status badge styling
  const getStatusStyle = (status: Task["status"]) => {
    switch (status) {
      case "todo":
        return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
      case "in-progress":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
      case "done":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
    }
  };

  // Format status label
  const getStatusLabel = (status: Task["status"]) => {
    switch (status) {
      case "todo":
        return "To Do";
      case "in-progress":
        return "In Progress";
      case "done":
        return "Done";
    }
  };

  // Format date to MM/DD/YYYY
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "No date";
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  };

  const handleDeleteClick = (taskId: string) => {
    setDeleteConfirmId(taskId);
  };

  const confirmDelete = (taskId: string) => {
    if (onTaskDelete) {
      onTaskDelete(taskId);
    }
    setDeleteConfirmId(null);
  };

  return (
    <>
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  Task Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {tasks.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400"
                  >
                    No tasks found
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr
                    key={task.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {task.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400 max-w-xs truncate">
                      {task.description || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {formatDate(task.dueDate)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {onTaskPriorityChange ? (
                        <select
                          value={task.priority}
                          onChange={(e) => onTaskPriorityChange(task.id, e.target.value as Task["priority"])}
                          className={`px-2 py-0.5 rounded text-xs font-medium border-0 cursor-pointer ${getPriorityStyle(task.priority)}`}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityStyle(
                            task.priority
                          )}`}
                        >
                          {task.priority}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {onTaskStatusChange ? (
                        <select
                          value={task.status}
                          onChange={(e) => onTaskStatusChange(task.id, e.target.value as Task["status"])}
                          className={`px-2 py-0.5 rounded text-xs font-medium border-0 cursor-pointer ${getStatusStyle(task.status)}`}
                        >
                          <option value="todo">To Do</option>
                          <option value="in-progress">In Progress</option>
                          <option value="done">Done</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusStyle(
                            task.status
                          )}`}
                        >
                          {getStatusLabel(task.status)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {task.tags.length > 0 ? (
                          task.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-600">
                            -
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {onTaskDelete && (
                        <button
                          onClick={() => handleDeleteClick(task.id)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete task"
                        >
                          🗑️
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-sm mx-4 border border-zinc-200 dark:border-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Delete Task?
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDelete(deleteConfirmId)}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TaskList;
