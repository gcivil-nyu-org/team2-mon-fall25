import React from "react";
import { type Task } from "../../types";
import TaskCard from "./TaskCard";

interface Props {
  tasks: Task[];
  onTaskStatusChange?: (taskId: string, newStatus: Task["status"]) => void;
}

const TaskBoard: React.FC<Props> = ({ tasks, onTaskStatusChange: _ }) => {
  const columns: Array<{
    status: Task["status"];
    label: string;
    count: number;
    color: string;
  }> = [
    {
      status: "todo",
      label: "To Do",
      count: tasks.filter((t) => t.status === "todo").length,
      color: "zinc",
    },
    {
      status: "in-progress",
      label: "In Progress",
      count: tasks.filter((t) => t.status === "in-progress").length,
      color: "blue",
    },
    {
      status: "done",
      label: "Done",
      count: tasks.filter((t) => t.status === "done").length,
      color: "green",
    },
  ];

  const getColumnColorClasses = (color: string) => {
    if (color === "blue") return "bg-blue-500";
    if (color === "green") return "bg-green-500";
    return "bg-zinc-400";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {columns.map((column) => (
        <div
          key={column.status}
          className="flex flex-col bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800"
        >
          {/* Column Header */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 mb-1">
              <div
                className={`w-2 h-2 rounded-full ${getColumnColorClasses(
                  column.color
                )}`}
              />
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
                {column.label}
              </h2>
              <span className="ml-auto text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                {column.count}
              </span>
            </div>
          </div>

          {/* Column Body - Scrollable */}
          <div className="flex-1 p-3 overflow-y-auto min-h-[400px] max-h-[calc(100vh-300px)]">
            {/* Add Task Button */}
            <button className="w-full mb-3 py-2 px-3 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-500 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors flex items-center justify-center gap-1">
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Task
            </button>

            {/* Tasks */}
            {tasks
              .filter((task) => task.status === column.status)
              .map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}

            {/* Empty State */}
            {tasks.filter((task) => task.status === column.status).length ===
              0 && (
              <div className="text-center py-8 text-zinc-400 dark:text-zinc-600 text-sm">
                No tasks yet
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TaskBoard;
