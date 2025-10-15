import { useState } from "react";
import { Modal } from "../modals/Modal";
import { parse, set, isAfter } from "date-fns";
import { createEvent } from "../../lib/api";

export type BlockedTime = {
  id: string;
  title: string; // reason
  startISO: string;
  endISO: string;
  kind: "unavailable";
};

export function UnavailabilityModal({
  open,
  onClose,
  defaultStartISO,
  onBlocked,
}: {
  open: boolean;
  onClose: () => void;
  defaultStartISO?: string; // optional seed
  onBlocked: (b: BlockedTime) => void;
}) {
  const [reason, setReason] = useState("OOO");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Defaults: today + 09:30–17:30
  const d = defaultStartISO ? new Date(defaultStartISO) : new Date();
  const [startDate, setStartDate] = useState(
    d.toISOString().slice(0, 10) // yyyy-mm-dd
  );
  const [startTime, setStartTime] = useState("07:30");
  const [endDate, setEndDate] = useState(d.toISOString().slice(0, 10));
  const [endTime, setEndTime] = useState("17:30");

  async function submit() {
    const sd = parse(startDate, "yyyy-MM-dd", new Date());
    const st = set(sd, {
      hours: parseInt(startTime.slice(0, 2), 10),
      minutes: parseInt(startTime.slice(3, 5), 10),
    });
    const ed = parse(endDate, "yyyy-MM-dd", new Date());
    const et = set(ed, {
      hours: parseInt(endTime.slice(0, 2), 10),
      minutes: parseInt(endTime.slice(3, 5), 10),
    });

    if (!isAfter(et, st)) {
      alert("End must be after start.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create event via API with GROUP type for unavailability
      const response = await createEvent({
        title: reason.trim() || "Unavailable",
        description: "User marked as unavailable",
        start_time: st.toISOString(),
        end_time: et.toISOString(),
        event_type: "GROUP",
        location: "none",
        created_by: 1, // TODO: Replace with actual user ID from auth context
        workspace_id: "cdb5abfe-dc99-4394-ac0e-e50a2f21d960", // TODO: Replace with actual workspace ID
      });

      // Call the parent callback with the blocked time
      onBlocked({
        id: response.event_id,
        title: reason.trim() || "Unavailable",
        startISO: st.toISOString(),
        endISO: et.toISOString(),
        kind: "unavailable",
      });

      onClose();
      setReason("OOO");
    } catch (error) {
      console.error("Failed to create unavailability event:", error);
      alert("Failed to block time. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={<div>Schedule Unavailability</div>}>
      <div className="space-y-4">
        {/* Reason */}
        <div>
          <label className="text-sm text-zinc-600 dark:text-zinc-400">Reason</label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950"
            placeholder="e.g., OOO"
          />
        </div>

        {/* Start */}
        <div className="space-y-2">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Start</div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>
        </div>

        {/* End */}
        <div className="space-y-2">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">End</div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={submit}
            disabled={isSubmitting}
            className="w-full rounded-xl bg-amber-700 px-4 py-2 text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Blocking..." : "Block Time"}
          </button>
        </div>
      </div>
    </Modal>
  );
}