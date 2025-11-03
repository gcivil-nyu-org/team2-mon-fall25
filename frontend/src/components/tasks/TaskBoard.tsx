import React from "react";
import { type Task } from "../../types";
import TaskCard from "./TaskCard";
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
}

interface DroppableColumnProps {
  status: Task["status"];
  label: string;
  count: number;
  color: string;
  tasks: Task[];
  onTaskDelete?: (taskId: string) => void;
  onTaskPriorityChange?: (taskId: string, newPriority: Task["priority"]) => void;
}

function DroppableColumn({
  status,
  label,
  count,
  color,
  tasks,
  onTaskDelete,
  onTaskPriorityChange,
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
      <div className="flex-1 p-3 overflow-y-auto min-h-[400px] max-h-[calc(100vh-300px)]">
        {/* Tasks */}
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onDelete={onTaskDelete}
            onPriorityChange={onTaskPriorityChange}
          />
        ))}

        {/* Empty State */}
        {tasks.length === 0 && (
          <div className="text-center py-8 text-zinc-400 dark:text-zinc-600 text-sm">
            {isOver ? "Drop task here" : "No tasks yet"}
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
}) => {
  const [activeTask, setActiveTask] = React.useState<Task | null>(null);

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
    </DndContext>
  );
};

export default TaskBoard;
