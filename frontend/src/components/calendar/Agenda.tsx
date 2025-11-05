import { format, compareAsc } from "date-fns";

export type CalEvent = { id: string; title: string; start: Date; end: Date; kind?: "meeting" | "unavailable" };

export function Agenda({
  events,
  onEventClick,
  calendarView,
  onViewChange,
}: {
  events: CalEvent[];
  onEventClick?: (id: string) => void;
  calendarView: "my" | "all";
  onViewChange: (view: "my" | "all") => void;
}) {
  const sorted = [...events].sort((a, b) => compareAsc(a.start, b.start));
  return (
    <aside className="hidden lg:block w-[300px] shrink-0 sticky top-14 self-start">
      <div className="rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        {/* View Toggle */}
        <div className="mb-3 flex items-center gap-2 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <button
            onClick={() => onViewChange("all")}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              calendarView === "all"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            All View
          </button>
          <button
            onClick={() => onViewChange("my")}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              calendarView === "my"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            My View
          </button>
        </div>

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
              <button
                key={e.id}
                onClick={() => onEventClick?.(e.id)}
                className={`w-full text-left rounded-xl border p-2 ${borderColor} ${
                  isUnavailable ? "border-l-4 border-l-zinc-500 dark:border-l-zinc-600" : ""
                } hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer`}
                title={`${e.title} • ${format(e.start, "EEE p")}–${format(e.end, "p")}`}
              >
                <div className="font-medium">
                  {e.title}
                </div>
                <div className="text-xs text-zinc-500">
                  {format(e.start, "EEE, MMM d")} • {format(e.start, "p")}–{format(e.end, "p")}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}