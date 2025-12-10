import { format, parseISO } from "date-fns";
import { Modal } from "./Modal";
import { useState, useEffect } from "react";
import { updateEventRSVP, fetchEventById, updateEvent, getWorkspaceMembers, type WorkspaceMember } from "../../lib/api";

export type RSVPStatus = "pending" | "accepted" | "declined" | "tentative";

export type CalEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  kind?: "meeting" | "unavailable";
  eventType?: 'INDIVIDUAL' | 'GROUP';
  description?: string;
  location?: string;
  createdBy?: number;
  createdByName?: string;
  attendeesNames?: string[];
  attendeesIds?: number[];
  attendeesUserIds?: string[];
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
  const [isEditing, setIsEditing] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<WorkspaceMember[]>([]);
  const [editForm, setEditForm] = useState({
    title: "",
    location: "",
    start: "",
    end: "",
    attendees: [] as string[],
  });

  useEffect(() => {
    if (isEditing && availableUsers.length === 0) {
      getWorkspaceMembers().then(setAvailableUsers).catch(console.error);
    }
  }, [isEditing, availableUsers.length]);

  const handleEditClick = () => {
    if (!currentEvent) return;
    setEditForm({
      title: currentEvent.title,
      location: currentEvent.location || "",
      start: format(currentEvent.start, "yyyy-MM-dd'T'HH:mm"),
      end: format(currentEvent.end, "yyyy-MM-dd'T'HH:mm"),
      attendees: currentEvent.attendeesUserIds || [],
    });
    setIsEditing(true);
  };

  const toggleAttendee = (userId: string) => {
    setEditForm(prev => {
      const exists = prev.attendees.includes(userId);
      if (exists) {
        return { ...prev, attendees: prev.attendees.filter(id => id !== userId) };
      } else {
        return { ...prev, attendees: [...prev.attendees, userId] };
      }
    });
  };

  const handleSave = async () => {
    if (!currentEvent) return;
    setIsSubmitting(true);
    try {
      await updateEvent(currentEvent.id, {
        title: editForm.title,
        location: editForm.location,
        start_time: new Date(editForm.start).toISOString(),
        end_time: new Date(editForm.end).toISOString(),
        attendees: editForm.attendees,
      });

      // Refresh event details
      const refreshedEvent = await fetchEventById(currentEvent.id);
      const newEventState: CalEvent = {
        ...currentEvent,
        userRsvpStatus: refreshedEvent.userRsvpStatus,
        rsvpSummary: refreshedEvent.rsvpSummary,
        attendeesWithRsvp: refreshedEvent.attendeesWithRsvp,
        attendeesIds: (refreshedEvent.attendees_detail || []).map((p) => p.id).filter(Boolean),
        attendeesUserIds: (refreshedEvent.attendees_detail || []).map((p) => p.user_id).filter(Boolean),
        attendeesNames: (refreshedEvent.attendees_detail || []).map((p) => p.full_name).filter(Boolean),
        title: refreshedEvent.title,
        description: refreshedEvent.description,
        eventType: refreshedEvent.event_type,
        start: parseISO(refreshedEvent.start_time),
        end: parseISO(refreshedEvent.end_time),
        location: refreshedEvent.location,
      };
      setCurrentEvent(newEventState);
      if (onEventUpdate) onEventUpdate(newEventState);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update event:", error);
    } finally {
      setIsSubmitting(false);
    }
  };


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
            ...event,
            userRsvpStatus: backendEvent.userRsvpStatus,
            rsvpSummary: backendEvent.rsvpSummary,
            attendeesWithRsvp: backendEvent.attendeesWithRsvp,
            attendeesIds: (backendEvent.attendees_detail || []).map((p) => p.id).filter(Boolean),
            attendeesUserIds: (backendEvent.attendees_detail || []).map((p) => p.user_id).filter(Boolean),
            attendeesNames: (backendEvent.attendees_detail || []).map((p) => p.full_name).filter(Boolean),
            title: backendEvent.title,
            description: backendEvent.description,
            eventType: backendEvent.event_type,
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
  const currentUserUUID = availableUsers.find(u => u.id === currentUserId)?.user_id;

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
    <Modal
      open={open}
      onClose={() => {
        setIsEditing(false);
        onClose();
      }}
      title={isEditing ? "Edit Event" : "Event Details"}
    >
      <div className="relative">
        {isLoadingDetails && (
          <div className="absolute inset-0 bg-white/50 dark:bg-zinc-900/50 z-10 flex items-center justify-center rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-zinc-100"></div>
          </div>
        )}

        {isEditing ? (
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="text-sm text-zinc-600 dark:text-zinc-400">Event Title</label>
              <input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
            </div>

            {/* Location */}
            {!isUnavailable && (
              <div>
                <label className="text-sm text-zinc-600 dark:text-zinc-400">Location</label>
                <input
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
              </div>
            )}

            {/* Date/Time Grid */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="text-sm text-zinc-600 dark:text-zinc-400">Start Time</label>
                <input
                  type="datetime-local"
                  value={editForm.start}
                  onChange={(e) => setEditForm({ ...editForm, start: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-600 dark:text-zinc-400">End Time</label>
                <input
                  type="datetime-local"
                  value={editForm.end}
                  onChange={(e) => setEditForm({ ...editForm, end: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
              </div>
            </div>

            {/* Attendees - Hide for unavailable/block time events */}
            {!isUnavailable && (
              <div className="pt-2">
                <div className="mb-2 flex items-center gap-2 text-sm">
                  <span>👥</span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Select Attendees ({editForm.attendees.filter(id => id !== currentUserUUID).length})
                  </span>
                  {editForm.attendees.filter(id => id !== currentUserUUID).length === 0 && (
                    <span className="text-red-500 text-xs ml-2">* Select at least one attendee</span>
                  )}
                </div>
                <div className="rounded-xl border border-zinc-300 p-2 dark:border-zinc-700 max-h-60 overflow-y-auto">
                  {availableUsers.length === 0 ? (
                    <div className="p-3 text-sm text-zinc-500">Loading members…</div>
                  ) : (
                    availableUsers
                      .filter(user => !currentUserId || user.id !== currentUserId)
                      .map((user) => {
                        const active = editForm.attendees.includes(user.user_id);
                        const displayName = user.full_name || user.username;
                        return (
                          <button
                            key={user.user_id}
                            onClick={() => toggleAttendee(user.user_id)}
                            className={`mb-2 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left last:mb-0 ${active
                              ? "border border-purple-400/70 bg-purple-50/50 dark:border-purple-900/60 dark:bg-purple-900/20"
                              : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                              }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800 text-xs">
                                {displayName.charAt(0).toUpperCase()}
                              </span>
                              <span className="text-sm text-zinc-900 dark:text-zinc-100">{displayName}</span>
                            </span>
                            <span className="text-purple-500">{active ? "✔" : ""}</span>
                          </button>
                        );
                      })
                  )}
                  {availableUsers.filter(user => !currentUserId || user.id !== currentUserId).length === 0 && availableUsers.length > 0 && (
                    <p className="text-xs text-zinc-500 p-2 text-center">No other members in this workspace.</p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSubmitting || (!isUnavailable && editForm.attendees.filter(id => id !== currentUserUUID).length === 0)}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md ${isSubmitting || (!isUnavailable && editForm.attendees.filter(id => id !== currentUserUUID).length === 0)
                  ? "bg-zinc-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        ) : (
          <div className={`space-y-4 ${isLoadingDetails ? 'opacity-50' : ''}`}>
            {/* Header with Edit Button */}
            <div className="flex justify-between items-start">
              {/* Event Title */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Title
                </label>
                <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {currentEvent.title}
                </div>
              </div>

              {isMyEvent && (
                <button
                  onClick={handleEditClick}
                  className="p-1 text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-400 transition-colors"
                  title="Edit Event"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                  </svg>
                </button>
              )}
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

            {/* Location */}
            {currentEvent.location && (
              <div>
                <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  Location
                </label>
                <div className="text-sm text-zinc-900 dark:text-zinc-100">
                  {currentEvent.location}
                </div>
              </div>
            )}

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
        )}
      </div>
    </Modal>
  );
}
