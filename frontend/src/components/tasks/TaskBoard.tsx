import React from "react";
import { type Task, type TaskDependency } from "../../types";
import TaskCard from "./TaskCard";
import QuickAddTask from "./QuickAddTask";
import BlockedTaskModal from "../modals/BlockedTaskModal";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";

interface Props {
  tasks: Task[];
  onTaskStatusChange?: (taskId: string, newStatus: Task["status"]) => void;
  onTaskDelete?: (taskId: string) => void;
  onTaskPriorityChange?: (taskId: string, newPriority: Task["priority"]) => void;
  onQuickAdd?: (taskName: string, status: Task["status"]) => void;
  onOpenFullModal?: () => void;
  onEdit?: (task: Task) => void;
}

interface DroppableColumnProps {
  status: Task["status"];
  label: string;
  count: number;
  color: string;
  tasks: Task[];
  onTaskDelete?: (taskId: string) => void;
  onTaskPriorityChange?: (taskId: string, newPriority: Task["priority"]) => void;
  onQuickAdd?: (taskName: string) => void;
  onOpenFullModal?: () => void;
  onEdit?: (task: Task) => void;
}

function DroppableColumn({
  status,
  label,
  count,
  color,
  tasks,
  onTaskDelete,
  onTaskPriorityChange,
  onQuickAdd,
  onOpenFullModal,
  onEdit,
}: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const getColumnColorClasses = (color: string) => {
    if (color === "blue") return "bg-blue-500";
    if (color === "green") return "bg-green-500";
    return "bg-zinc-400";
  };

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border ${
        isOver
          ? "border-blue-400 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/20"
          : "border-zinc-200 dark:border-zinc-800"
      } transition-all`}
    >
      {/* Column Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2 mb-1">
          <div
            className={`w-2 h-2 rounded-full ${getColumnColorClasses(color)}`}
          />
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            {label}
          </h2>
          <span className="ml-auto text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
            {count}
          </span>
        </div>
      </div>

      {/* Column Body - Scrollable */}
      <div className="flex-1 p-3 overflow-y-auto min-h-[400px] max-h-[calc(100vh-300px)] space-y-3">
        {/* Tasks */}
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onDelete={onTaskDelete}
            onPriorityChange={onTaskPriorityChange}
            onEdit={onEdit}
          />
        ))}

        {/* Empty State */}
        {tasks.length === 0 && !isOver && (
          <div className="text-center py-8 text-zinc-400 dark:text-zinc-600 text-sm">
            No tasks yet
          </div>
        )}

        {/* Drop Zone Indicator */}
        {isOver && (
          <div className="text-center py-8 text-blue-500 dark:text-blue-400 text-sm font-medium">
            Drop task here
          </div>
        )}

        {/* Quick Add Task */}
        {onQuickAdd && (
          <div className="mt-3">
            <QuickAddTask
              onAdd={onQuickAdd}
              onOpenFullModal={onOpenFullModal}
              variant="board"
            />
          </div>
        )}
      </div>
    </div>
  );
}

const TaskBoard: React.FC<Props> = ({
  tasks,
  onTaskStatusChange,
  onTaskDelete,
  onTaskPriorityChange,
  onQuickAdd,
  onOpenFullModal,
  onEdit,
}) => {
  const [activeTask, setActiveTask] = React.useState<Task | null>(null);
  const [blockedTask, setBlockedTask] = React.useState<{
    task: Task;
    incompleteDeps: TaskDependency[];
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    })
  );

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

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || !onTaskStatusChange) return;

    const taskId = active.id as string;
    const newStatus = over.id as Task["status"];

    // Find the task being moved
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== newStatus) {
      // Check if trying to mark as done with incomplete dependencies
      if (newStatus === "done" && task.dependencies && !task.canComplete) {
        const incompleteDeps = task.dependencies.filter(d => d.status !== "done");
        setBlockedTask({ task, incompleteDeps });
        return; // Don't change status
      }

      onTaskStatusChange(taskId, newStatus);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((column) => (
          <DroppableColumn
            key={column.status}
            status={column.status}
            label={column.label}
            count={column.count}
            color={column.color}
            tasks={tasks.filter((task) => task.status === column.status)}
            onTaskDelete={onTaskDelete}
            onTaskPriorityChange={onTaskPriorityChange}
            onQuickAdd={onQuickAdd ? (taskName) => onQuickAdd(taskName, column.status) : undefined}
            onOpenFullModal={onOpenFullModal}
            onEdit={onEdit}
          />
        ))}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeTask ? (
          <div className="rotate-3 opacity-80">
            <TaskCard task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>

      {/* Blocked Task Modal */}
      {blockedTask && (
        <BlockedTaskModal
          task={blockedTask.task}
          incompleteDependencies={blockedTask.incompleteDeps}
          onClose={() => setBlockedTask(null)}
        />
      )}
    </DndContext>
  );
};

export default TaskBoard;
