import { useMemo, useState } from "react";
import { Modal } from "./Modal";
import {
  addMinutes,
  format,
  isValid,
  parse,
  set,
  startOfDay,
} from "date-fns";
import { createEvent } from "../../lib/api";

// Mock team directory
const PEOPLE = [
  { id: "alex", name: "Alex Johnson", avatar: "🧑🏽‍🦱" },
  { id: "sarah", name: "Sarah Chen", avatar: "👩🏻" },
  { id: "mike", name: "Mike Ross", avatar: "🧔🏼" },
];

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
}: {
  open: boolean;
  onClose: () => void;
  onScheduled: (m: ScheduledMeeting) => void;
}) {
  // Step 1 state
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(30); // minutes
  const [date, setDate] = useState(""); // yyyy-mm-dd
  const [selected, setSelected] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canFind = title.trim().length > 0 && date.length === 10 && selected.length > 0;

  // Step state
  const [step, setStep] = useState<"setup" | "recommendations">("setup");

  const recs: Recommended[] = useMemo(() => {
    if (!canFind) return [];
    // seed from 9:00 local at chosen date
    const baseDate = parse(date, "yyyy-MM-dd", new Date());
    if (!isValid(baseDate)) return [];
    const dayStart = startOfDay(baseDate);
    const s1 = set(dayStart, { hours: 9, minutes: 0 });
    const s2 = set(dayStart, { hours: 11, minutes: 0 });
    const s3 = set(dayStart, { hours: 14, minutes: 0 });
    return [
      { start: s1, end: addMinutes(s1, duration), score: "Best" },
      { start: s2, end: addMinutes(s2, duration), score: "Good" },
      { start: s3, end: addMinutes(s3, duration), score: "Alternative" },
    ];
  }, [canFind, date, duration]);

  function toggle(id: string) {
    setSelected((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
  }

  async function schedule(slot: Recommended) {
    setIsSubmitting(true);
    try {
      // Create event via API
      const response = await createEvent({
        title: title.trim(),
        description: `Meeting with ${selected.map(id => PEOPLE.find(p => p.id === id)?.name).join(", ")}`,
        start_time: slot.start.toISOString(),
        end_time: slot.end.toISOString(),
        event_type: "INDIVIDUAL",
        location: "none",
        created_by: 1, // TODO: Replace with actual user ID from auth context
        workspace_id: "cdb5abfe-dc99-4394-ac0e-e50a2f21d960", // TODO: Replace with actual workspace ID
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
              {PEOPLE.map((p) => {
                const active = selected.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggle(p.id)}
                    className={`mb-2 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left last:mb-0 ${
                      active
                        ? "border border-purple-400/70 bg-purple-50/50 dark:border-purple-900/60 dark:bg-purple-900/20"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800">
                        {p.avatar}
                      </span>
                      <span>{p.name}</span>
                    </span>
                    <span className="text-purple-500">{active ? "✔" : ""}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2">
            <button
              disabled={!canFind}
              onClick={() => setStep("recommendations")}
              className={`w-full rounded-xl px-4 py-2 text-white ${
                canFind
                  ? "bg-purple-600 hover:bg-purple-700"
                  : "cursor-not-allowed bg-purple-400/60"
              }`}
            >
              ✨ Find 3 Best Times
            </button>
          </div>
        </div>
      ) : (
        // Recommendations step
        <div className="space-y-4">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            Recommended Times ({format(recs[0].start, "EEE, MMM d")})
          </div>
          <div className="space-y-3">
            {recs.map((r, idx) => (
              <button
                key={idx}
                onClick={() => schedule(r)}
                disabled={isSubmitting}
                className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                  isSubmitting ? "cursor-not-allowed opacity-50" : ""
                } ${
                  r.score === "Best"
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