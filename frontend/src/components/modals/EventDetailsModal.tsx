import { format, parseISO } from "date-fns";
import { Modal } from "./Modal";
import { useState, useEffect } from "react";
import { updateEventRSVP, fetchEventById } from "../../lib/api";

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
  attendeesIds?: number[];
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
  onRsvpChange?: () => void;
  onEventUpdate?: (event: CalEvent) => void;
}

export function EventDetailsModal({
  open,
  onClose,
  event,
  currentUserId,
  onDelete,
  onRsvpChange,
  onEventUpdate,
}: EventDetailsModalProps) {
  const [currentEvent, setCurrentEvent] = useState<CalEvent | null>(event);
  const [rsvpStatus, setRsvpStatus] = useState<RSVPStatus>("pending");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Update local state when prop changes
  useEffect(() => {
    if (event) {
      setCurrentEvent(event);
      setRsvpStatus(event.userRsvpStatus || "pending");
    }
  }, [event]);

  // Fetch latest event details when modal opens
  useEffect(() => {
    if (open && event?.id) {
      let isMounted = true;
      const loadLatestDetails = async () => {
        setIsLoadingDetails(true);
        try {
          const backendEvent = await fetchEventById(event.id);

          if (!isMounted) return;
          // Prevent race condition: ensure the fetched event matches the current prop
          if (backendEvent.event_id !== event.id) return;

          // Merge backend data into current event
          const updatedEvent: CalEvent = {
            ...event, // Start with original event to keep fields not in backendEvent if any
            // Do NOT merge ...currentEvent here to avoid stale data from previous event view
            userRsvpStatus: backendEvent.userRsvpStatus,
            rsvpSummary: backendEvent.rsvpSummary,
            attendeesWithRsvp: backendEvent.attendeesWithRsvp,
            attendeesIds: (backendEvent.attendees_detail || []).map((p) => p.id).filter(Boolean),
            attendeesNames: (backendEvent.attendees_detail || []).map((p) => p.full_name).filter(Boolean),
            // Ensure other fields are updated too if they changed
            title: backendEvent.title,
            description: backendEvent.description,
            start: parseISO(backendEvent.start_time),
            end: parseISO(backendEvent.end_time),
            location: backendEvent.location,
          };

          setCurrentEvent(updatedEvent);

          // Also update local RSVP status state
          if (backendEvent.userRsvpStatus) {
            setRsvpStatus(backendEvent.userRsvpStatus);
          }

          // Propagate update to parent
          if (onEventUpdate) {
            onEventUpdate(updatedEvent);
          }
        } catch (error) {
          console.error("Failed to fetch latest event details:", error);
        } finally {
          if (isMounted) setIsLoadingDetails(false);
        }
      };
      loadLatestDetails();

      return () => {
        isMounted = false;
      };
    }
  }, [open, event?.id]);

  if (!currentEvent) return null;

  const isUnavailable = currentEvent.kind === "unavailable";
  const isMyEvent = currentUserId !== undefined && currentEvent.createdBy === currentUserId;
  const isAttendee = !isMyEvent && currentUserId !== undefined && currentEvent.attendeesIds?.includes(currentUserId);

  const handleRsvpChange = async (status: RSVPStatus) => {
    setIsSubmitting(true);
    try {
      await updateEventRSVP(currentEvent.id, status);
      setRsvpStatus(status);
      console.log(`RSVP updated to: ${status}`);
      if (onRsvpChange) {
        onRsvpChange();
      }
      // Optimistically update currentEvent
      const updatedEvent = currentEvent ? { ...currentEvent, userRsvpStatus: status } : null;
      setCurrentEvent(updatedEvent);

      // Propagate update to parent
      if (onEventUpdate && updatedEvent) {
        onEventUpdate(updatedEvent);
      }
    } catch (error) {
      console.error("Failed to update RSVP:", error);
      // Optionally show error toast here
    } finally {
      setIsSubmitting(false);
    }
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
      <div className="relative">
        {isLoadingDetails && (
          <div className="absolute inset-0 bg-white/50 dark:bg-zinc-900/50 z-10 flex items-center justify-center rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-zinc-100"></div>
          </div>
        )}
        <div className={`space-y-4 ${isLoadingDetails ? 'opacity-50' : ''}`}>
          {/* Event Title */}
          <div>
            <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Title
            </label>
            <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {currentEvent.title}
            </div>
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Type
            </label>
            <div className="inline-flex items-center gap-2">
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${isMyEvent
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
              <div>{format(currentEvent.start, "EEEE, MMMM d, yyyy")}</div>
              <div className="text-zinc-600 dark:text-zinc-400">
                {format(currentEvent.start, "p")} – {format(currentEvent.end, "p")}
              </div>
            </div>
          </div>

          {/* Created By */}
          <div>
            <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Created By
            </label>
            <div className="text-sm text-zinc-900 dark:text-zinc-100">
              {currentEvent.createdByName || "Unknown User"}
              {currentUserId !== undefined && currentEvent.createdBy === currentUserId && (
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
              {currentEvent.rsvpSummary && (
                <div className="mb-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-md">
                  <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                    RSVP Summary
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <span className="text-green-600 dark:text-green-400">✓</span>
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {currentEvent.rsvpSummary.accepted} Accepted
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-yellow-600 dark:text-yellow-400">?</span>
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {currentEvent.rsvpSummary.tentative} Tentative
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-red-600 dark:text-red-400">✗</span>
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {currentEvent.rsvpSummary.declined} Declined
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-zinc-500 dark:text-zinc-400">⏱</span>
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {currentEvent.rsvpSummary.pending} Pending
                      </span>
                    </span>
                  </div>
                </div>
              )}

              {/* Attendees List with RSVP Status */}
              <div className="text-sm text-zinc-900 dark:text-zinc-100">
                {currentEvent.attendeesWithRsvp && currentEvent.attendeesWithRsvp.length > 0 ? (
                  <ul className="space-y-2">
                    {currentEvent.attendeesWithRsvp.map((attendee, idx) => (
                      <li key={idx} className="flex items-center justify-between">
                        <span>{attendee.name}</span>
                        <span className={`flex items-center gap-1 text-xs font-medium ${getRsvpColor(attendee.status)}`}>
                          {getRsvpIcon(attendee.status)}
                          <span className="capitalize">{attendee.status}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : currentEvent.attendeesNames && currentEvent.attendeesNames.length > 0 ? (
                  <ul className="list-disc list-inside space-y-0.5">
                    {currentEvent.attendeesNames.map((name, idx) => (
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
                {currentEvent.attendeesNames && currentEvent.attendeesNames.length > 0 ? (
                  <ul className="list-disc list-inside space-y-0.5">
                    {currentEvent.attendeesNames.map((name, idx) => (
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
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all
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
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all
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
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all
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
                  onDelete(currentEvent.id);
                  onClose();
                }}
                className="w-full rounded-md bg-red-600 hover:bg-red-700 text-white py-2 text-sm font-medium transition"
              >
                Delete Event
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
