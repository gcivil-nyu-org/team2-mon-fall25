import { Modal } from "./Modal";

export function AddToCalendar({
  open,
  onClose,
  onSmartSchedule,
  onBlockTime,
}: {
  open: boolean;
  onClose: () => void;
  onSmartSchedule: () => void;
  onBlockTime: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Add to Calendar">
      <p className="mb-4 text-sm text-zinc-500">
        Choose what you’d like to add:
      </p>

      <div className="space-y-3">
        <button
          onClick={() => {
            onClose();
            onSmartSchedule();
          }}
          className="block w-full rounded-xl border border-purple-300/60 bg-purple-50/60 p-4 text-left transition hover:bg-purple-50 dark:border-purple-900/60 dark:bg-purple-900/20 dark:hover:bg-purple-900/30"
        >
          <div className="flex items-start gap-3">
            <div className="mt-1">✨</div>
            <div>
              <div className="font-medium">Smart Schedule</div>
              <div className="text-sm text-zinc-500">
                AI finds the best meeting times for your team based on
                availability
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => {
            onClose();
            onBlockTime();
          }}
          className="block w-full rounded-xl border border-amber-300/60 bg-amber-50/70 p-4 text-left transition hover:bg-amber-50 dark:border-amber-900/60 dark:bg-amber-900/20 dark:hover:bg-amber-900/30"
        >
          <div className="flex items-start gap-3">
            <div className="mt-1">🚫</div>
            <div>
              <div className="font-medium">Schedule Unavailability</div>
              <div className="text-sm text-zinc-500">
                Block time when you’re unavailable for meetings
              </div>
            </div>
          </div>
        </button>
      </div>
    </Modal>
  );
}