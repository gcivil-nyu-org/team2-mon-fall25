import {
    addMinutes,
    differenceInCalendarDays,
    eachDayOfInterval,
    format,
    isSameWeek,
  } from "date-fns";
  
  type CalendarEvent = {
    id: string;
    title: string;
    start: Date;
    end: Date;
    kind?: "meeting" | "unavailable";
  };
  
  const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 06–20
  
  export function CalendarWeek({
    weekStart,
    events,
    onEventClick,
  }: {
    weekStart: Date;
    events: CalendarEvent[];
    onEventClick?: (id: string) => void;
  }) {
    const weekDays = eachDayOfInterval({
      start: weekStart,
      end: addMinutes(weekStart, 6 * 24 * 60), // 7 days
    });
  
    const pxPerHour = 64;
    const dayColWidthPct = 100 / 8; // gutter + 7 days
  
    const now = new Date();
    const showNow = isSameWeek(now, weekStart, { weekStartsOn: 0 });
    const nowDayIdx = differenceInCalendarDays(now, weekStart);
    const nowTop =
      (now.getHours() + now.getMinutes() / 60 - HOURS[0]) * pxPerHour;
  
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {/* Header row */}
        <div className="grid grid-cols-8 border-b border-zinc-200 text-sm dark:border-zinc-800">
          <div className="p-2 text-zinc-500">{format(weekStart, "MMMM yyyy")}</div>
          {weekDays.map((d) => (
            <div key={d.toISOString()} className="p-2 text-center font-medium">
              <div>{format(d, "EEE")}</div>
              <div className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-xs dark:bg-zinc-800">
                {format(d, "d")}
              </div>
            </div>
          ))}
        </div>
  
        {/* Grid */}
        <div className="relative grid grid-cols-8">
          {/* Hour gutter */}
          <div className="border-r border-zinc-200 dark:border-zinc-800">
            {HOURS.map((h) => (
              <div
                key={h}
                className="h-16 select-none px-2 text-[11px] leading-[4rem] text-zinc-400"
              >
                {h <= 12 ? `${h} AM` : `${h - 12} PM`}
              </div>
            ))}
          </div>
  
          {/* Day columns */}
          {weekDays.map((d) => (
            <div
              key={d.toISOString()}
              className="relative border-r border-zinc-200 last:border-r-0 dark:border-zinc-800"
            >
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="h-16 border-b border-zinc-100 dark:border-zinc-800/60"
                />
              ))}
            </div>
          ))}
  
          {/* NOW bar */}
          {showNow && nowDayIdx >= 0 && nowDayIdx < 7 && nowTop >= 0 && (
            <div className="absolute left-0 right-0" style={{ pointerEvents: "none" }}>
              <div
                className="absolute h-px bg-red-500"
                style={{
                  top: nowTop,
                  left: `calc(${(nowDayIdx + 1) * dayColWidthPct}% + 0.25rem)`,
                  right: `calc(${(7 - nowDayIdx) * dayColWidthPct}% + 0.25rem)`,
                }}
              />
            </div>
          )}
  
          {/* Events */}
          {events.map((e) => {
            const dayIdx = differenceInCalendarDays(e.start, weekStart);
            if (dayIdx < 0 || dayIdx > 6) return null;
  
            const startFrac = e.start.getHours() + e.start.getMinutes() / 60 - HOURS[0];
            const endFrac = e.end.getHours() + e.end.getMinutes() / 60 - HOURS[0];
            const top = startFrac * pxPerHour;
            const height = Math.max(16, (endFrac - startFrac) * pxPerHour);
  
            const left = (dayIdx + 1) * dayColWidthPct;
            const width = dayColWidthPct - 0.5;
  
            const isUnavailable = e.kind === "unavailable";
            const baseColor = isUnavailable
              ? "border-zinc-300 bg-zinc-200/70 dark:border-zinc-700 dark:bg-zinc-800/60"
              : "border-blue-200 bg-blue-100/70 dark:border-blue-900/60 dark:bg-blue-900/40";

            const hoverColor = isUnavailable
              ? "hover:ring-2 hover:ring-zinc-400/60 dark:hover:ring-zinc-600/40"
              : "hover:ring-2 hover:ring-blue-300/60 dark:hover:ring-blue-600/40";

            return (
              <button
                key={e.id}
                onClick={() => onEventClick?.(e.id)}
                className={`absolute overflow-hidden rounded-xl p-2 text-xs text-left transition focus:outline-none ${baseColor} ${hoverColor} ${
                  isUnavailable ? "border-l-4 border-l-zinc-500 dark:border-l-zinc-600" : ""
                }`}
                style={{
                  top,
                  left: `calc(${left}% + 0.25rem)`,
                  width: `calc(${width}% - 0.5rem)`,
                  height,
                  backgroundImage: isUnavailable
                    ? "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(113, 113, 122, 0.15) 8px, rgba(113, 113, 122, 0.15) 16px)"
                    : undefined,
                }}
                title={`${e.title} • ${format(e.start, "EEE p")}–${format(e.end, "p")}`}
              >
                <div className="font-medium">
                  {e.title}
                </div>
                <div className="mt-0.5 opacity-70">
                  {format(e.start, "p")} – {format(e.end, "p")}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }