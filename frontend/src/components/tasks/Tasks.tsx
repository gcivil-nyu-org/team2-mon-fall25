import React, { useState, useMemo } from "react";
import { type Task } from "../../types";
import TaskBoard from "./TaskBoard";
import TaskList from "./TaskList";
import TaskModal from "../modals/TaskModal";
import { getTasks, createTask, updateTask, deleteTask } from "./TaskApi";
import { useEffect } from "react";
import { useAccessToken } from "../../auth/useAccessToken";

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const token = useAccessToken(); // Get Auth0 token

  // Get current workspace from localStorage to trigger reload on workspace change
  const [currentWorkspace, setCurrentWorkspace] = useState<string>(() =>
    localStorage.getItem("cd.workspace") || localStorage.getItem("workspace_id") || ""
  );

  // Listen for workspace changes in localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const newWorkspace = localStorage.getItem("cd.workspace") || localStorage.getItem("workspace_id") || "";
      setCurrentWorkspace(newWorkspace);
    };

    // Listen for storage events from other tabs/windows
    window.addEventListener("storage", handleStorageChange);

    // Poll for changes in the same tab (since storage events don't fire in the same tab)
    const interval = setInterval(handleStorageChange, 500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const loadTasks = async () => {
      if (!token) return; // Wait for token
      if (!currentWorkspace) {
        console.log("No workspace selected, skipping task load");
        setTasks([]);
        return;
      }

      try {
        console.log("Loading tasks for workspace:", currentWorkspace);
        const data: Task[] = await getTasks(token);
        setTasks(data);
      } catch (err) {
        console.error("Error loading tasks:", err);
        setTasks([]);
      }
    };
    loadTasks();
  }, [token, currentWorkspace]); // Reload when token OR workspace changes
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [view, setView] = useState<"board" | "list">("board");
  const [showModal, setShowModal] = useState(false);

  // Get all unique tags from tasks
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    tasks.forEach((task) => {
      task.tags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search filter
      const matchesSearch =
        !searchQuery ||
        task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        );

      // Priority filter
      const matchesPriority = !priorityFilter || task.priority === priorityFilter;

      // Tag filter
      const matchesTag = !tagFilter || task.tags.includes(tagFilter);

      // Status filter
      const matchesStatus = !statusFilter || task.status === statusFilter;

      return matchesSearch && matchesPriority && matchesTag && matchesStatus;
    });
  }, [tasks, searchQuery, priorityFilter, tagFilter, statusFilter]);

  const handleCreateTask = async (newTask: Task) => {
    const duplicate = tasks.find(
    (t) => t.name.toLowerCase() === newTask.name.toLowerCase()
  );
  if (duplicate) {
    alert("Task with this name already exists");
    return; // stop execution
  }
  try {
    await createTask(newTask, token); // save to backend
    const data = await getTasks(token); // refresh tasks
    setTasks(data);
    setShowModal(false);
  } catch (err) {
    console.error(err);
  }
};

  const handleQuickAddTask = async (taskName: string, status: Task["status"]) => {
    const duplicate = tasks.find(
      (t) => t.name.toLowerCase() === taskName.toLowerCase()
    );
    if (duplicate) {
      alert("Task with this name already exists");
      return;
    }

    const newTask: Task = {
      id: Date.now().toString(),
      name: taskName,
      description: "",
      dueDate: "",
      priority: "medium",
      tags: [],
      status,
    };

    try {
      await createTask(newTask, token);
      const data = await getTasks(token);
      setTasks(data);
    } catch (err) {
      console.error(err);
    }
  };
//   const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
//   try {
//     await updateTask(id, updates);
//     const data = await getTasks();
//     setTasks(data);
//   } catch (err) {
//     console.error(err);
//   }
// };

//   const handleDeleteTask = async (id: string | number) => {
//   try {
//     await deleteTask(id);
//     const data = await getTasks();
//     setTasks(data);
//   } catch (err) {
//     console.error(err);
//   }
// };

  const handleTaskStatusChange = async (taskId: string, newStatus: Task["status"]) => {
  try {
    // Optimistically update UI
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );

    // Update backend
    await updateTask(taskId, { status: newStatus }, token);
  } catch (err) {
    console.error(err);
  }
};


  const handleTaskPriorityChange = async (
  taskId: string,
  newPriority: Task["priority"]
) => {
  try {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, priority: newPriority } : task
      )
    );

    await updateTask(taskId, { priority: newPriority }, token);
  } catch (err) {
    console.error(err);
  }
};


  const handleTaskDelete = async (taskId: string | number) => {
  try {
    await deleteTask(taskId, token);
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  } catch (err) {
    console.error(err);
  }
};


  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Tasks
        </h1>
      </div>

      {/* Filters and Controls Bar */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
          {/* Left side - Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
            {/* Search Bar */}
            <div className="relative flex-1 min-w-[200px]">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search tasks..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700
                           bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                           placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           transition-all text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <select
              className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700
                         bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all text-sm min-w-[140px]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="done">Done</option>
            </select>

            {/* Priority Filter */}
            <select
              className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700
                         bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all text-sm min-w-[140px]"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Tag Filter */}
            <select
              className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700
                         bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all text-sm min-w-[140px]"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
            >
              <option value="">All Tags</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>

          {/* Right side - View Toggle and New Task Button */}
          <div className="flex gap-2 items-center">
            {/* View Toggle */}
            <div className="inline-flex rounded-lg border border-zinc-300 dark:border-zinc-700 p-0.5">
              <button
                onClick={() => setView("board")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  view === "board"
                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                Board
              </button>
              <button
                onClick={() => setView("list")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  view === "list"
                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                List
              </button>
            </div>

            {/* New Task Button */}
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                         bg-black dark:bg-white text-white dark:text-black
                         hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
            >
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
              New Task
            </button>
          </div>
        </div>

        {/* Active Filters Display */}
        {(searchQuery || priorityFilter || tagFilter || statusFilter) && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Active filters:
            </span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                Search: {searchQuery}
                <button
                  onClick={() => setSearchQuery("")}
                  className="hover:text-blue-900 dark:hover:text-blue-100"
                >
                  ×
                </button>
              </span>
            )}
            {statusFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                Status: {statusFilter}
                <button
                  onClick={() => setStatusFilter("")}
                  className="hover:text-blue-900 dark:hover:text-blue-100"
                >
                  ×
                </button>
              </span>
            )}
            {priorityFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                Priority: {priorityFilter}
                <button
                  onClick={() => setPriorityFilter("")}
                  className="hover:text-blue-900 dark:hover:text-blue-100"
                >
                  ×
                </button>
              </span>
            )}
            {tagFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                Tag: {tagFilter}
                <button
                  onClick={() => setTagFilter("")}
                  className="hover:text-blue-900 dark:hover:text-blue-100"
                >
                  ×
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setSearchQuery("");
                setPriorityFilter("");
                setTagFilter("");
                setStatusFilter("");
              }}
              className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
      {/* Task View */}
      {view === "board" ? (
  <TaskBoard
    tasks={filteredTasks}
    onTaskStatusChange={handleTaskStatusChange}      // Dragging updates status
    onTaskDelete={handleTaskDelete}                 // Delete button works
    onTaskPriorityChange={handleTaskPriorityChange} // Priority change works
    onQuickAdd={handleQuickAddTask}                 // Quick add from columns
    onOpenFullModal={() => setShowModal(true)}      // Open full modal for details
  />
) : (
  <TaskList
    tasks={filteredTasks}
    onTaskStatusChange={handleTaskStatusChange}
    onTaskDelete={handleTaskDelete}
    onTaskPriorityChange={handleTaskPriorityChange}
  />
)}

      {/* Modal */}
      {showModal && (
        <TaskModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreateTask}
          availableTasks={tasks}
        />
      )}
    </div>
  );
};

export default Tasks;
