import { format } from "date-fns";
import { Modal } from "./Modal";
import { useState } from "react";

export type RSVPStatus = "pending" | "accepted" | "declined" | "tentative";

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
  attendeesNames?: string[];
  // RSVP fields (to be populated by backend)
  userRsvpStatus?: RSVPStatus;
  rsvpSummary?: {
    accepted: number;
    declined: number;
    tentative: number;
    pending: number;
  };
  attendeesWithRsvp?: Array<{
    name: string;
    status: RSVPStatus;
  }>;
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
  const isAttendee = !isMyEvent && event.attendeesNames && event.attendeesNames.length > 0;

  // Local state for RSVP (mockup - will be replaced with API call)
  const [rsvpStatus, setRsvpStatus] = useState<RSVPStatus>(
    event.userRsvpStatus || "pending"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRsvpChange = async (status: RSVPStatus) => {
    setIsSubmitting(true);
    // TODO: Replace with actual API call
    // await updateEventRSVP(event.id, status);

    // Simulate API delay
    setTimeout(() => {
      setRsvpStatus(status);
      setIsSubmitting(false);
      // TODO: Show success toast
      console.log(`RSVP updated to: ${status}`);
    }, 500);
  };

  const getRsvpIcon = (status: RSVPStatus) => {
    switch (status) {
      case "accepted": return "✓";
      case "declined": return "✗";
      case "tentative": return "?";
      case "pending": return "⏱";
    }
  };

  const getRsvpColor = (status: RSVPStatus) => {
    switch (status) {
      case "accepted": return "text-green-600 dark:text-green-400";
      case "declined": return "text-red-600 dark:text-red-400";
      case "tentative": return "text-yellow-600 dark:text-yellow-400";
      case "pending": return "text-zinc-500 dark:text-zinc-400";
    }
  };

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

        {/* Attendees - For Event Creator */}
        {isMyEvent && !isUnavailable && (
          <div>
            <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Attendees
            </label>

            {/* RSVP Summary */}
            {event.rsvpSummary && (
              <div className="mb-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-md">
                <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                  RSVP Summary
                </div>
                <div className="flex flex-wrap gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="text-green-600 dark:text-green-400">✓</span>
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {event.rsvpSummary.accepted} Accepted
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-yellow-600 dark:text-yellow-400">?</span>
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {event.rsvpSummary.tentative} Tentative
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-red-600 dark:text-red-400">✗</span>
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {event.rsvpSummary.declined} Declined
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-zinc-500 dark:text-zinc-400">⏱</span>
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {event.rsvpSummary.pending} Pending
                    </span>
                  </span>
                </div>
              </div>
            )}

            {/* Attendees List with RSVP Status */}
            <div className="text-sm text-zinc-900 dark:text-zinc-100">
              {event.attendeesWithRsvp && event.attendeesWithRsvp.length > 0 ? (
                <ul className="space-y-2">
                  {event.attendeesWithRsvp.map((attendee, idx) => (
                    <li key={idx} className="flex items-center justify-between">
                      <span>{attendee.name}</span>
                      <span className={`flex items-center gap-1 text-xs font-medium ${getRsvpColor(attendee.status)}`}>
                        {getRsvpIcon(attendee.status)}
                        <span className="capitalize">{attendee.status}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : event.attendeesNames && event.attendeesNames.length > 0 ? (
                <ul className="list-disc list-inside space-y-0.5">
                  {event.attendeesNames.map((name, idx) => (
                    <li key={idx}>{name}</li>
                  ))}
                </ul>
              ) : (
                <span className="text-zinc-600 dark:text-zinc-400">No attendees</span>
              )}
            </div>
          </div>
        )}

        {/* Attendees - For Non-Creator (Simple List) */}
        {!isMyEvent && !isUnavailable && (
          <div>
            <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Attendees
            </label>
            <div className="text-sm text-zinc-900 dark:text-zinc-100">
              {event.attendeesNames && event.attendeesNames.length > 0 ? (
                <ul className="list-disc list-inside space-y-0.5">
                  {event.attendeesNames.map((name, idx) => (
                    <li key={idx}>{name}</li>
                  ))}
                </ul>
              ) : (
                <span className="text-zinc-600 dark:text-zinc-400">No attendees</span>
              )}
            </div>
          </div>
        )}

        {/* RSVP Section - Only for Attendees (not creator) on meetings */}
        {isAttendee && !isUnavailable && (
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">
              Your RSVP
            </label>

            {/* Current Status */}
            <div className="mb-3 text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Current status: </span>
              <span className={`font-medium capitalize ${getRsvpColor(rsvpStatus)}`}>
                {getRsvpIcon(rsvpStatus)} {rsvpStatus}
              </span>
            </div>

            {/* RSVP Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleRsvpChange("accepted")}
                disabled={isSubmitting || rsvpStatus === "accepted"}
                className={`px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap
                  ${rsvpStatus === "accepted"
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 ring-2 ring-green-500 dark:ring-green-400"
                    : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-green-50 dark:hover:bg-green-900/20 border border-zinc-300 dark:border-zinc-600"
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                ✓ Accept
              </button>
              <button
                onClick={() => handleRsvpChange("tentative")}
                disabled={isSubmitting || rsvpStatus === "tentative"}
                className={`px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap
                  ${rsvpStatus === "tentative"
                    ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 ring-2 ring-yellow-500 dark:ring-yellow-400"
                    : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 border border-zinc-300 dark:border-zinc-600"
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                ? Maybe
              </button>
              <button
                onClick={() => handleRsvpChange("declined")}
                disabled={isSubmitting || rsvpStatus === "declined"}
                className={`px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap
                  ${rsvpStatus === "declined"
                    ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 ring-2 ring-red-500 dark:ring-red-400"
                    : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-red-50 dark:hover:bg-red-900/20 border border-zinc-300 dark:border-zinc-600"
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                ✗ Decline
              </button>
            </div>

            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              You can change your RSVP anytime before the event.
            </p>
          </div>
        )}

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
