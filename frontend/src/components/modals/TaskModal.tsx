import React, { useState, useEffect } from "react";
import { type Task, type TaskDependency } from "../../types";
import { fetchWorkspaceMembers, type WorkspaceMemberExtended } from "../../lib/api";
import DependencySelector from "../tasks/DependencySelector";

interface Props {
  onClose: () => void;
  onCreate?: (task: Task) => void;
  onUpdate?: (taskId: string, updates: Partial<Task>) => void;
  task?: Task; // Existing task for edit mode
  availableTasks?: Task[]; // For dependency selection
  mode?: "create" | "edit";
}

const TaskModal: React.FC<Props> = ({
  onClose,
  onCreate,
  onUpdate,
  task,
  availableTasks = [],
  mode = "create"
}) => {
  const [name, setName] = useState(task?.name || "");
  const [description, setDescription] = useState(task?.description || "");
  const [dueDate, setDueDate] = useState(task?.dueDate || "");
  const [priority, setPriority] = useState<"high" | "medium" | "low">(task?.priority || "medium");
  const [tags, setTags] = useState<string>(task?.tags?.join(", ") || "");
  const [assigneeId, setAssigneeId] = useState<number | null>(task?.assignedToId || null);
  const [selectedDependencies, setSelectedDependencies] = useState<TaskDependency[]>(task?.dependencies || []);

  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMemberExtended[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // Fetch workspace members on mount
  useEffect(() => {
    const loadMembers = async () => {
      try {
        const workspaceId = localStorage.getItem("cd.workspace");
        if (workspaceId) {
          const members = await fetchWorkspaceMembers(workspaceId);
          setWorkspaceMembers(members);
        }
      } catch (error) {
        console.error("Failed to load workspace members:", error);
      } finally {
        setLoadingMembers(false);
      }
    };
    loadMembers();
  }, []);

  // Filter out current task from available dependencies when editing
  const filteredAvailableTasks = mode === "edit" && task
    ? availableTasks.filter(t => t.id !== task.id)
    : availableTasks;

  const handleSubmit = () => {
    if (!name.trim()) {
      alert("Please enter a task name");
      return;
    }

    const selectedMember = workspaceMembers.find(m => m.id === assigneeId);
    const incompleteDeps = selectedDependencies.filter(d => d.status !== 'done').length;
    const processedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);

    if (mode === "edit" && task && onUpdate) {
      // Edit mode: call onUpdate with changes
      const updates: Partial<Task> = {
        name,
        description,
        dueDate,
        priority,
        tags: processedTags,
        assignedToId: assigneeId || undefined,
        assignedTo: selectedMember ? selectedMember.full_name || selectedMember.email : undefined,
        dependencies: selectedDependencies.length > 0 ? selectedDependencies : undefined,
        canComplete: incompleteDeps === 0,
        incompleteDependencyCount: incompleteDeps,
      };
      onUpdate(task.id, updates);
    } else if (mode === "create" && onCreate) {
      // Create mode: call onCreate with new task
      const newTask: Task = {
        id: Date.now().toString(),
        name,
        description,
        dueDate,
        priority,
        tags: processedTags,
        status: "todo",
        assignedToId: assigneeId || undefined,
        assignedTo: selectedMember ? selectedMember.full_name || selectedMember.email : undefined,
        dependencies: selectedDependencies.length > 0 ? selectedDependencies : undefined,
        canComplete: incompleteDeps === 0,
        incompleteDependencyCount: incompleteDeps,
      };
      onCreate(newTask);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {mode === "edit" ? "Edit Task" : "Create New Task"}
          </h2>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Task Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Task Name
            </label>
            <input
              type="text"
              placeholder="Enter task name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700
                         bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                         placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all"
              autoFocus
            />
          </div>

          {/* Task Description */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Description
            </label>
            <textarea
              placeholder="Add a description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700
                         bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                         placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all resize-none"
            />
          </div>

          {/* Due Date and Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700
                           bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           transition-all"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as "high" | "medium" | "low")}
                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700
                           bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           transition-all"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Tags
            </label>
            <input
              type="text"
              placeholder="e.g., design, ux, onboarding (comma separated)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700
                         bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                         placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Separate multiple tags with commas
            </p>
          </div>

          {/* Assign To */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Assign To
            </label>
            <select
              value={assigneeId || ""}
              onChange={(e) => setAssigneeId(e.target.value ? Number(e.target.value) : null)}
              disabled={loadingMembers}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700
                         bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Unassigned</option>
              {workspaceMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name || member.email}
                </option>
              ))}
            </select>
            {loadingMembers && (
              <p className="mt-1 text-xs text-zinc-500">
                Loading workspace members...
              </p>
            )}
          </div>

          {/* Dependencies */}
          <DependencySelector
            availableTasks={filteredAvailableTasks}
            selectedDependencies={selectedDependencies}
            onAdd={(taskId) => {
              const foundTask = filteredAvailableTasks.find(t => t.id === taskId);
              if (foundTask) {
                setSelectedDependencies([
                  ...selectedDependencies,
                  { id: foundTask.id, title: foundTask.name, status: foundTask.status }
                ]);
              }
            }}
            onRemove={(taskId) => {
              setSelectedDependencies(selectedDependencies.filter(d => d.id !== taskId));
            }}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300
                       hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-black dark:bg-white
                       text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-100
                       transition-colors"
          >
            {mode === "edit" ? "Save Changes" : "Create Task"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
