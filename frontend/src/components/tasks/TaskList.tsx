import React from "react";
import { type Task } from "../../types";

interface Props {
  tasks: Task[];
}

const TaskList: React.FC<Props> = ({ tasks }) => {
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

  return (
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
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {tasks.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400"
                >
                  No tasks found
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr
                  key={task.id}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer"
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
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityStyle(
                        task.priority
                      )}`}
                    >
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusStyle(
                        task.status
                      )}`}
                    >
                      {getStatusLabel(task.status)}
                    </span>
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TaskList;
