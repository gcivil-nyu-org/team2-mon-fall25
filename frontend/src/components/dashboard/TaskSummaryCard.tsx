import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { type Task } from "../../types";
import { getTasks } from "../tasks/TaskApi";

interface TaskStats {
  overdue: number;
  dueToday: number;
  inProgress: number;
  completed: number;
  total: number;
  completionPercentage: number;
}

interface TaskSummaryCardProps {
  onNavigate?: (route: string) => void;
}

export function TaskSummaryCard({ onNavigate }: TaskSummaryCardProps) {
  const { getAccessTokenSilently } = useAuth0();
  const [stats, setStats] = useState<TaskStats>({
    overdue: 0,
    dueToday: 0,
    inProgress: 0,
    completed: 0,
    total: 0,
    completionPercentage: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTaskStats = async () => {
      try {
        const token = await getAccessTokenSilently();
        const tasks = await getTasks(token);

        // Calculate stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const overdue = tasks.filter((task: Task) => {
          if (task.status === "done" || !task.dueDate) return false;
          const dueDate = new Date(task.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate < today;
        }).length;

        const dueToday = tasks.filter((task: Task) => {
          if (task.status === "done" || !task.dueDate) return false;
          const dueDate = new Date(task.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate.getTime() === today.getTime();
        }).length;

        const inProgress = tasks.filter(
          (task: Task) => task.status === "in-progress"
        ).length;

        const completed = tasks.filter((task: Task) => task.status === "done").length;

        const total = tasks.length;
        const completionPercentage = total > 0 ? (completed / total) * 100 : 0;

        setStats({ overdue, dueToday, inProgress, completed, total, completionPercentage });
      } catch (error) {
        console.error("Failed to load task stats:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTaskStats();
  }, [getAccessTokenSilently]);

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <div className="animate-pulse">
          <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-24 mb-3"></div>
          <div className="space-y-2">
            <div className="h-12 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div>
            <div className="h-12 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div>
            <div className="h-12 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  const hasActiveTasks = stats.total > 0;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 break-words min-w-0">
            My Tasks
          </h2>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap flex-shrink-0">
            {stats.total} {stats.total === 1 ? "task" : "tasks"}
          </span>
        </div>
      </div>

      <div className="p-4">
        {!hasActiveTasks ? (
          <div className="text-center py-6">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No tasks to show 🎉
            </p>
          </div>
        ) : (
          <div className="space-y-3">
              {/* Overdue */}
              {stats.overdue > 0 && (
                <div className="group relative flex items-center justify-between gap-2 p-3 rounded-lg bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-900/10 border border-red-200 dark:border-red-800 transition-all duration-200">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <svg
                      className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-sm font-medium text-red-900 dark:text-red-100 break-words">
                      Overdue
                    </span>
                  </div>
                  <span className="text-xl font-bold text-red-600 dark:text-red-400 tabular-nums flex-shrink-0">
                    {stats.overdue}
                  </span>
                </div>
              )}

              {/* Due Today */}
              {stats.dueToday > 0 && (
                <div className="group relative flex items-center justify-between gap-2 p-3 rounded-lg bg-gradient-to-r from-yellow-50 to-yellow-100/50 dark:from-yellow-900/20 dark:to-yellow-900/10 border border-yellow-200 dark:border-yellow-800 transition-all duration-200">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <svg
                      className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0"
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
                    <span className="text-sm font-medium text-yellow-900 dark:text-yellow-100 break-words">
                      Due Today
                    </span>
                  </div>
                  <span className="text-xl font-bold text-yellow-600 dark:text-yellow-400 tabular-nums flex-shrink-0">
                    {stats.dueToday}
                  </span>
                </div>
              )}

              {/* In Progress */}
              {stats.inProgress > 0 && (
                <div className="group relative flex items-center justify-between gap-2 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10 border border-blue-200 dark:border-blue-800 transition-all duration-200">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <svg
                      className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100 break-words">
                      In Progress
                    </span>
                  </div>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400 tabular-nums flex-shrink-0">
                    {stats.inProgress}
                  </span>
                </div>
              )}

              {/* Completed */}
              {stats.completed > 0 && (
                <div className="group relative flex items-center justify-between gap-2 p-3 rounded-lg bg-gradient-to-r from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-900/10 border border-green-200 dark:border-green-800 transition-all duration-200">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <svg
                      className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-sm font-medium text-green-900 dark:text-green-100 break-words">
                      Completed
                    </span>
                  </div>
                  <span className="text-xl font-bold text-green-600 dark:text-green-400 tabular-nums flex-shrink-0">
                    {stats.completed}
                  </span>
                </div>
              )}
            </div>
        )}
        {/* Completion Progress */}
      {stats.total > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Completion
            </span>
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {Math.round(stats.completionPercentage)}% completed
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
              stats.completionPercentage >= 80
                ? "bg-green-600"
                : stats.completionPercentage >= 40
                ? "bg-yellow-500"
                : "bg-red-500"
            }`}

              style={{ width: `${stats.completionPercentage}%` }}
            />
          </div>

          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 text-right">
            {100 - Math.round(stats.completionPercentage)}% left
          </div>
        </div>
      )}


        {/* View All Tasks Link */}
        <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => onNavigate?.("tasks")}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
          >
            View All Tasks →
          </button>
        </div>
      </div>
    </div>
  );
}
