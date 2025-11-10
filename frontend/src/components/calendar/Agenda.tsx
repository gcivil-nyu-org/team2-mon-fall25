import { format, compareAsc } from "date-fns";

export type CalEvent = { id: string; title: string; start: Date; end: Date; kind?: "meeting" | "unavailable"; createdBy?: number; };

export function Agenda({
  events,
  onEventClick,
  calendarView,
  onViewChange,
  currentUserId,
}: {
  events: CalEvent[];
  onEventClick?: (id: string) => void;
  calendarView: "my" | "all";
  onViewChange: (view: "my" | "all") => void;
  currentUserId?: number;
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
            const isOwnEvent = currentUserId !== undefined && e.createdBy === currentUserId;

            // Color scheme based on ownership and type - matching CalendarWeek
            const borderColor = isOwnEvent
              ? (isUnavailable
                  ? "border-zinc-300 bg-zinc-50/50 dark:border-zinc-500 dark:bg-zinc-900/30"
                  : "border-[#E30B5D] bg-[#E30B5D]/20 dark:border-[#E30B5D] dark:bg-[#E30B5D]/20")
              : (isUnavailable
                  ? "border-gray-600 bg-gray-200/60 dark:border-gray-700 dark:bg-gray-950/60"
                  : "border-[#4169E1] bg-[#4169E1]/20 dark:border-[#4169E1] dark:bg-[#4169E1]/20");

            const leftBorderColor = isUnavailable
              ? (isOwnEvent
                  ? "border-l-4 border-l-zinc-400 dark:border-l-zinc-400"
                  : "border-l-4 border-l-gray-700 dark:border-l-gray-600")
              : "";

            const hoverColor = isOwnEvent
              ? (isUnavailable
                  ? "hover:bg-zinc-100/60 dark:hover:bg-zinc-900/50"
                  : "hover:bg-[#E30B5D]/30 dark:hover:bg-[#E30B5D]/30")
              : (isUnavailable
                  ? "hover:bg-gray-300/60 dark:hover:bg-gray-950/70"
                  : "hover:bg-[#4169E1]/30 dark:hover:bg-[#4169E1]/30");

            return (
              <button
                key={e.id}
                onClick={() => onEventClick?.(e.id)}
                className={`w-full text-left rounded-xl border p-2 ${borderColor} ${leftBorderColor} ${hoverColor} transition-colors cursor-pointer`}
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