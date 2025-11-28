import { useMemo, useState, useEffect } from "react";
import { Modal } from "./Modal";
import { format } from "date-fns";
import { createEvent, getRecommendedSlots, getWorkspaceMembers } from "../../lib/api";

// Fallback mock team directory (used if API fails)
const PEOPLE = [
  { id: "alex", name: "Alex Johnson", avatar: "🧑🏽‍🦱" },
  { id: "sarah", name: "Sarah Chen", avatar: "👩🏻" },
  { id: "mike", name: "Mike Ross", avatar: "🧔🏼" },
];

type Member = { id: string; name: string; avatar?: string };

type Recommended = { start: Date; end: Date; score: "Best" | "Good" | "Alternative" };

export type ScheduledMeeting = {
  id: string;
  title: string;
  startISO: string;
  endISO: string;
  attendees: string[]; // ids
};

export function SmartScheduleModal({
  open,
  onClose,
  onScheduled,
  currentUserId,
}: {
  open: boolean;
  onClose: () => void;
  onScheduled: (m: ScheduledMeeting) => void;
  currentUserId?: string;
}) {
  // Step 1 state
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(30); // minutes
  const [date, setDate] = useState(""); // yyyy-mm-dd
  const [selected, setSelected] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinding, setIsFinding] = useState(false);
  const [error, setError] = useState("");

  const canFind = title.trim().length > 0 && date.length === 10 && selected.length > 0;

  // Step state
  const [step, setStep] = useState<"setup" | "recommendations" | "no-slots">("setup");

  // Store API recommended slots
  const [apiRecs, setApiRecs] = useState<Recommended[]>([]);
  const [noSlotsMessage, setNoSlotsMessage] = useState("");

  // Workspace members fetched from backend
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState("");

  // When modal opens, fetch workspace members (header-based workspace context is added in authenticatedFetch)
  useEffect(() => {
    let mounted = true;
    async function loadMembers() {
      setMembersLoading(true);
      setMembersError("");
      try {
        const data = await getWorkspaceMembers();
        if (!mounted) return;
        const mapped: Member[] = data
          .filter((m) => m.user_id !== currentUserId)
          .map((m) => ({
            id: m.user_id,
            name: m.full_name || m.username,
            avatar: (m.full_name || m.username)?.slice(0, 1),
          }));
        setMembers(mapped);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load members";
        setMembersError(msg);
        setMembers([]);
      } finally {
        if (mounted) setMembersLoading(false);
      }
    }

    if (open) {
      loadMembers();
    } else {
      // reset when closed
      setMembers([]);
      setMembersError("");
      setMembersLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [open, currentUserId]);

  const recs: Recommended[] = useMemo(() => {
    // Prioritize API-returned recommended times
    if (apiRecs.length > 0) {
      return apiRecs;
    }

    // Return empty if no API data yet (prevent showing old hardcoded data)
    return [];
  }, [apiRecs]);

  function toggle(id: string) {
    setSelected((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
  }

  async function findBestTimes() {
    setIsFinding(true);
    setError("");
    setNoSlotsMessage("");

    try {
      // Ensure date format is yyyy-mm-dd, duration is number (minutes)
      console.log(`Calling API with date=${date}, duration=${duration}`);

      const result = await getRecommendedSlots(date, duration, selected);
      console.log("API Response:", result);

      // Check if no slots are available
      if (result.message && !result.recommended_slots) {
        setNoSlotsMessage(result.message);
        setStep("no-slots");
        return;
      }

      // Validate response format
      if (!result.recommended_slots || !Array.isArray(result.recommended_slots)) {
        throw new Error("Invalid API response format");
      }

      // If recommended_slots is empty array
      if (result.recommended_slots.length === 0) {
        setNoSlotsMessage(
          result.message || "No available time slots found for the specified date and duration during working hours (8:00-17:00)"
        );
        setStep("no-slots");
        return;
      }

      // Convert API response to Recommended format
      const slots: Recommended[] = result.recommended_slots.map(
        (slot: { start_time: string; end_time: string; period: string }, idx: number) => {
          const startDate = new Date(slot.start_time);
          const endDate = new Date(slot.end_time);

          // Validate date validity
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            throw new Error(`Invalid date in slot ${idx}: ${slot.start_time} - ${slot.end_time}`);
          }

          return {
            start: startDate,
            end: endDate,
            score: idx === 0 ? "Best" : idx === 1 ? "Good" : "Alternative",
          };
        }
      );

      console.log("Converted slots:", slots);
      setApiRecs(slots);
      setStep("recommendations");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to find best times";
      setError(errorMsg);
      console.error("Error finding best times:", err);
    } finally {
      setIsFinding(false);
    }
  }

  async function schedule(slot: Recommended) {
    setIsSubmitting(true);
    try {
      // Create event via API
      // workspace and created_by are automatically set from X-Workspace-ID header and authenticated user
      const currentPeople = members.length ? members : PEOPLE;
      const response = await createEvent({
        title: title.trim(),
        description: `Meeting with ${selected.map(id => currentPeople.find(p => p.id === id)?.name).join(", ")}`,
        start_time: slot.start.toISOString(),
        end_time: slot.end.toISOString(),
        event_type: "INDIVIDUAL",
        location: "none",
        attendees: selected,
      });

      // Call the parent callback with the scheduled meeting
      onScheduled({
        id: response.event_id,
        title: title.trim(),
        startISO: slot.start.toISOString(),
        endISO: slot.end.toISOString(),
        attendees: selected,
      });

      onClose();
      setStep("setup");
      setSelected([]);
      setTitle("");
      setDate("");
      setDuration(30);
      setApiRecs([]);
      setError("");
      setNoSlotsMessage("");
    } catch (error) {
      console.error("Failed to create event:", error);
      alert("Failed to create event. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        setStep("setup");
        setApiRecs([]);
        setError("");
        setNoSlotsMessage("");
      }}
      title="Smart Schedule"
      wide
    >
      {step === "setup" ? (
        <div className="space-y-4">
          {/* Title / Duration / Date */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm text-zinc-600 dark:text-zinc-400">Event Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Team Sync"
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-600 dark:text-zinc-400">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-zinc-600 dark:text-zinc-400">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="dd/mm/yyyy"
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
            </div>
          </div>

          {/* Attendees */}
          <div className="pt-2">
            <div className="mb-2 flex items-center gap-2 text-sm">
              <span>👥</span>
              <span className="text-zinc-600 dark:text-zinc-400">
                Select Attendees ({selected.length})
              </span>
            </div>
            <div className="rounded-xl border border-zinc-300 p-2 dark:border-zinc-700">
              {membersLoading ? (
                <div className="p-3 text-sm text-zinc-500">Loading members…</div>
              ) : membersError ? (
                <div className="p-3 text-sm text-red-600">{membersError}</div>
              ) : (
                (members.length ? members : PEOPLE).map((p) => (
                  (() => {
                    const active = selected.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => toggle(p.id)}
                        className={`mb-2 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left last:mb-0 ${active
                          ? "border border-purple-400/70 bg-purple-50/50 dark:border-purple-900/60 dark:bg-purple-900/20"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800">
                            {p.avatar ?? p.name?.slice(0, 1)}
                          </span>
                          <span>{p.name}</span>
                        </span>
                        <span className="text-purple-500">{active ? "✔" : ""}</span>
                      </button>
                    );
                  })()
                ))
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              disabled={!canFind || isFinding}
              onClick={findBestTimes}
              className={`w-full rounded-xl px-4 py-2 text-white ${canFind && !isFinding
                ? "bg-purple-600 hover:bg-purple-700"
                : "cursor-not-allowed bg-purple-400/60"
                }`}
            >
              {isFinding ? "🔄 Finding Best Times..." : "✨ Find 3 Best Times"}
            </button>
          </div>
        </div>
      ) : step === "no-slots" ? (
        // No available slots step
        <div className="space-y-4">
          <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20">
            <div className="mb-2 flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <div className="font-semibold text-amber-900 dark:text-amber-100">
                  No Available Time Slots
                </div>
                <div className="mt-2 text-sm text-amber-800 dark:text-amber-200">
                  {noSlotsMessage}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <div className="font-semibold mb-2">Suggestions:</div>
              <ul className="list-inside list-disc space-y-1">
                <li>Try selecting a different date</li>
                <li>Try reducing the meeting duration</li>
                <li>Try with fewer attendees (they may have conflicting schedules)</li>
                <li>Manually schedule the event outside working hours (8:00-17:00)</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep("setup")}
              className="flex-1 rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              ← Back
            </button>
            <button
              onClick={() => {
                // Allow user to proceed with manual scheduling
                setStep("setup");
                // Could also open a manual time picker here
              }}
              className="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Schedule Manually →
            </button>
          </div>
        </div>
      ) : (
        // Recommendations step
        <div className="space-y-4">
          {recs.length > 0 && (
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              Recommended Times ({format(recs[0].start, "EEE, MMM d")})
            </div>
          )}
          <div className="space-y-3">
            {recs.map((r, idx) => (
              <button
                key={idx}
                onClick={() => schedule(r)}
                disabled={isSubmitting}
                className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${isSubmitting ? "cursor-not-allowed opacity-50" : ""
                  } ${r.score === "Best"
                    ? "border-green-300 bg-green-50/60 dark:border-green-900/50 dark:bg-green-900/20"
                    : r.score === "Good"
                      ? "border-blue-300 bg-blue-50/60 dark:border-blue-900/50 dark:bg-blue-900/20"
                      : "border-amber-300 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-900/20"
                  }`}
              >
                <div>
                  <div className="text-sm font-medium">
                    {format(r.start, "p")} – {format(r.end, "p")}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {r.score} Match
                  </div>
                </div>
                <div className="text-lg">{isSubmitting ? "⏳" : "✔"}</div>
              </button>
            ))}
          </div>

          <div className="pt-2">
            <button
              onClick={() => setStep("setup")}
              disabled={isSubmitting}
              className="w-full rounded-xl border px-4 py-2 text-sm dark:border-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ← Back
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}