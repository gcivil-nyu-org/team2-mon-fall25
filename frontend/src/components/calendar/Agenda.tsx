import { format, compareAsc } from "date-fns";

export type CalEvent = { id: string; title: string; start: Date; end: Date; kind?: "meeting" | "unavailable" };

export function Agenda({
  events,
  onDelete,
}: {
  events: CalEvent[];
  onDelete?: (id: string) => void;
}) {
  const sorted = [...events].sort((a, b) => compareAsc(a.start, b.start));
  return (
    <aside className="hidden lg:block w-[300px] shrink-0 sticky top-14 self-start">
      <div className="rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-2 text-sm font-semibold">Upcoming</div>
        <div className="space-y-2 text-sm">
          {sorted.length === 0 && (
            <div className="text-zinc-500">No events this week.</div>
          )}
          {sorted.map((e) => {
            const isUnavailable = e.kind === "unavailable";
            const borderColor = isUnavailable
              ? "border-zinc-300 bg-zinc-100/50 dark:border-zinc-700 dark:bg-zinc-800/30"
              : "border-zinc-200 dark:border-zinc-800";

            return (
              <div
                key={e.id}
                className={`flex items-start justify-between rounded-xl border p-2 ${borderColor} ${
                  isUnavailable ? "border-l-4 border-l-zinc-500 dark:border-l-zinc-600" : ""
                }`}
                title={`${e.title} • ${format(e.start, "EEE p")}–${format(e.end, "p")}`}
              >
                <div>
                  <div className="font-medium">
                    {e.title}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {format(e.start, "EEE, MMM d")} • {format(e.start, "p")}–{format(e.end, "p")}
                  </div>
                </div>
                {onDelete ? (
                  <button
                    onClick={() => onDelete(e.id)}
                    className="ml-2 rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    aria-label="Delete"
                    title="Delete"
                  >
                    🗑️
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}