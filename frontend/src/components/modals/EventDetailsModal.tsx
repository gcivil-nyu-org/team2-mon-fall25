import { format } from "date-fns";
import { Modal } from "./Modal";

export type CalEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  kind?: "meeting" | "unavailable";
  description?: string;
  location?: string;
  createdBy?: number;
  createdByName?: string;
};

interface EventDetailsModalProps {
  open: boolean;
  onClose: () => void;
  event: CalEvent | null;
  currentUserId?: number;
  onDelete?: (id: string) => void;
}

export function EventDetailsModal({
  open,
  onClose,
  event,
  currentUserId,
  onDelete,
}: EventDetailsModalProps) {
  if (!event) return null;

  const isUnavailable = event.kind === "unavailable";
  const isMyEvent = currentUserId !== undefined && event.createdBy === currentUserId;

  return (
    <Modal open={open} onClose={onClose} title="Event Details">
      <div className="space-y-4">
        {/* Event Title */}
        <div>
          <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            Title
          </label>
          <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {event.title}
          </div>
        </div>

        {/* Event Type */}
        <div>
          <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            Type
          </label>
          <div className="inline-flex items-center gap-2">
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                isMyEvent
                  ? (isUnavailable
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                      : "bg-[#E30B5D]/50 dark:bg-[#E30B5D]/50 text-[#E30B5D] dark:text-[#E30B5D]")
                  : (isUnavailable
                      ? "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                      : "bg-[#4169E1]/50 dark:bg-[#4169E1]/50 text-[#4169E1] dark:text-[#4169E1]")
              }`}
            >
              {isUnavailable ? "Unavailable" : "Meeting"}
            </span>
          </div>
        </div>

        {/* Date & Time */}
        <div>
          <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            Date & Time
          </label>
          <div className="text-sm text-zinc-900 dark:text-zinc-100">
            <div>{format(event.start, "EEEE, MMMM d, yyyy")}</div>
            <div className="text-zinc-600 dark:text-zinc-400">
              {format(event.start, "p")} – {format(event.end, "p")}
            </div>
          </div>
        </div>

        {/* Created By */}
        <div>
          <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            Created By
          </label>
          <div className="text-sm text-zinc-900 dark:text-zinc-100">
            {event.createdByName || "Unknown User"}
            {currentUserId !== undefined && event.createdBy === currentUserId && (
              <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">(You)</span>
            )}
          </div>
        </div>

        {/* Delete Button - Only show if user created the event */}
        {isMyEvent && onDelete && (
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => {
                onDelete(event.id);
                onClose();
              }}
              className="w-full rounded-md bg-red-600 hover:bg-red-700 text-white py-2 text-sm font-medium transition"
            >
              Delete Event
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
