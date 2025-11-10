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
    createdBy?: number;
  };
  
  const HOURS = Array.from({ length: 24 }, (_, i) => i); // 00–23 (full day)

  // Helper function to detect if two events overlap
  function eventsOverlap(e1: CalendarEvent, e2: CalendarEvent): boolean {
    return e1.start < e2.end && e2.start < e1.end;
  }

  export function CalendarWeek({
    weekStart,
    events,
    onEventClick,
    currentUserId,
  }: {
    weekStart: Date;
    events: CalendarEvent[];
    onEventClick?: (id: string) => void;
    currentUserId?: number;
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
                {h === 0 ? "12 AM" : h <= 11 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
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
          {/* Sort events: OOO first (render behind), then meetings */}
          {[...events].sort((a, b) => {
            // OOO events render first (will appear behind)
            if (a.kind === "unavailable" && b.kind !== "unavailable") return -1;
            if (a.kind !== "unavailable" && b.kind === "unavailable") return 1;
            // Within same type, sort by start time
            return a.start.getTime() - b.start.getTime();
          }).flatMap((event) => {
            // Check if event spans multiple days
            const eventStartDay = differenceInCalendarDays(event.start, weekStart);
            const eventEndDay = differenceInCalendarDays(event.end, weekStart);

            // Skip events outside the visible week
            if (eventEndDay < 0 || eventStartDay >= 7) return [];

            // Determine if this is a multi-day event
            const isMultiDay = eventStartDay !== eventEndDay;

            if (!isMultiDay) {
              // Single-day event: render once
              const dayIdx = eventStartDay;
              if (dayIdx < 0 || dayIdx > 6) return [];
  
              const e = event; // For single-day event, use as-is
              const startFrac = e.start.getHours() + e.start.getMinutes() / 60 - HOURS[0];
              const endFrac = e.end.getHours() + e.end.getMinutes() / 60 - HOURS[0];
              const top = startFrac * pxPerHour;
              const height = Math.max(40, (endFrac - startFrac) * pxPerHour);

              // Detect overlapping events in the same day
              const sortedEvents = [...events].sort((a, b) => {
                if (a.kind === "unavailable" && b.kind !== "unavailable") return -1;
                if (a.kind !== "unavailable" && b.kind === "unavailable") return 1;
                return a.start.getTime() - b.start.getTime();
              });

              // Find events that SPAN this day (not just start on it)
              const dayEvents = sortedEvents.filter(ev => {
                const evStartDay = differenceInCalendarDays(ev.start, weekStart);
                const evEndDay = differenceInCalendarDays(ev.end, weekStart);
                // Include events that start on or before this day AND end on or after this day
                return evStartDay <= dayIdx && evEndDay >= dayIdx;
              });

              // Only consider overlaps with events of the same type
              // Events share space with events, OOO shares space with OOO
              const overlappingEvents = dayEvents.filter(ev =>
                eventsOverlap(ev, e) && ev.kind === e.kind
              );

              // Calculate width and position based on overlaps
              const totalOverlapping = Math.min(overlappingEvents.length, 4); // Max 4 columns
              const eventIndex = overlappingEvents.findIndex(oe => oe.id === e.id);

              const baseLeft = (dayIdx + 1) * dayColWidthPct;
              const adjustedWidth = (dayColWidthPct - 0.5) / totalOverlapping;
              const left = baseLeft + (adjustedWidth * eventIndex);
              const width = adjustedWidth;

              const isUnavailable = e.kind === "unavailable";
              const isOwnEvent = currentUserId !== undefined && e.createdBy === currentUserId;

              // Color scheme based on ownership and type
              const baseColor = isOwnEvent
                ? (isUnavailable
                    ? "border-zinc-300 bg-zinc-50/60 dark:border-zinc-500 dark:bg-zinc-900/40"
                    : "border-[#E30B5D] bg-[#E30B5D]/50 dark:border-[#E30B5D] dark:bg-[#E30B5D]/50")
                : (isUnavailable
                    ? "border-gray-600 bg-gray-200/70 dark:border-gray-700 dark:bg-gray-950/70"
                    : "border-[#4169E1] bg-[#4169E1]/50 dark:border-[#4169E1] dark:bg-[#4169E1]/50");

              const hoverColor = isOwnEvent
                ? (isUnavailable
                    ? "hover:ring-2 hover:ring-zinc-400/60 dark:hover:ring-zinc-400/40"
                    : "hover:ring-2 hover:ring-[#E30B5D]/60 dark:hover:ring-[#E30B5D]/60")
                : (isUnavailable
                    ? "hover:ring-2 hover:ring-gray-600/60 dark:hover:ring-gray-600/40"
                    : "hover:ring-2 hover:ring-[#4169E1]/60 dark:hover:ring-[#4169E1]/60");

              return [
                <button
                  key={e.id}
                  onClick={() => onEventClick?.(e.id)}
                  className={`absolute overflow-hidden rounded-xl p-2 text-xs text-left transition focus:outline-none ${baseColor} ${hoverColor} ${
                    isUnavailable ? (isOwnEvent ? "border-l-4 border-l-zinc-400 dark:border-l-zinc-400" : "border-l-4 border-l-gray-700 dark:border-l-gray-600") : ""
                  }`}
                  style={{
                    top,
                    left: `calc(${left}% + 0.25rem)`,
                    width: `calc(${width}% - 0.5rem)`,
                    height,
                    zIndex: isUnavailable ? 0 : 10,
                    backgroundImage: isUnavailable
                      ? (isOwnEvent
                          ? "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(113, 113, 122, 0.12) 8px, rgba(113, 113, 122, 0.12) 16px)"
                          : "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(55, 65, 81, 0.2) 8px, rgba(55, 65, 81, 0.2) 16px)")
                      : undefined,
                  }}
                  title={`${e.title} • ${format(e.start, "EEE p")}–${format(e.end, "p")}`}
                >
                  <div className="font-medium truncate">
                    {e.title}
                  </div>
                  {height >= 50 && (
                    <div className="mt-0.5 opacity-70 truncate">
                      {format(e.start, "p")} – {format(e.end, "p")}
                    </div>
                  )}
                </button>
              ];
            } else {
              // Multi-day event: create segments for each day
              const firstVisibleDay = Math.max(0, eventStartDay);
              const lastVisibleDay = Math.min(6, eventEndDay);

              const segments = [];
              for (let dayOffset = firstVisibleDay; dayOffset <= lastVisibleDay; dayOffset++) {
                const dayIdx = dayOffset;
                const segmentDate = new Date(weekStart);
                segmentDate.setDate(weekStart.getDate() + dayOffset);

                const dayStartTime = new Date(segmentDate);
                dayStartTime.setHours(0, 0, 0, 0);

                const dayEndTime = new Date(segmentDate);
                dayEndTime.setHours(23, 59, 59, 999);

                // Determine segment start and end
                const segmentStart = dayOffset === eventStartDay ? event.start : dayStartTime;
                const segmentEnd = dayOffset === eventEndDay ? event.end : dayEndTime;

                // Create a segment event object
                const e = {
                  ...event,
                  id: `${event.id}__seg_${dayOffset}`,
                  start: segmentStart,
                  end: segmentEnd,
                };

                const startFrac = segmentStart.getHours() + segmentStart.getMinutes() / 60 - HOURS[0];
                const endFrac = segmentEnd.getHours() + segmentEnd.getMinutes() / 60 - HOURS[0];
                const top = startFrac * pxPerHour;
                const height = Math.max(40, (endFrac - startFrac) * pxPerHour);

                // Detect overlapping events in the same day
                const sortedEvents = [...events].sort((a, b) => {
                  if (a.kind === "unavailable" && b.kind !== "unavailable") return -1;
                  if (a.kind !== "unavailable" && b.kind === "unavailable") return 1;
                  return a.start.getTime() - b.start.getTime();
                });

                // For multi-day segments, we need to find events that SPAN this day, not just START on it
                const dayEvents = sortedEvents.filter(ev => {
                  const evStartDay = differenceInCalendarDays(ev.start, weekStart);
                  const evEndDay = differenceInCalendarDays(ev.end, weekStart);
                  // Include events that start on or before this day AND end on or after this day
                  return evStartDay <= dayIdx && evEndDay >= dayIdx;
                });

                // Only consider overlaps with events of the same type
                const overlappingEvents = dayEvents.filter(ev =>
                  eventsOverlap(ev, e) && ev.kind === e.kind
                );

                // Calculate width and position based on overlaps
                const totalOverlapping = Math.min(overlappingEvents.length, 4);
                const eventIndex = overlappingEvents.findIndex(oe => oe.id === e.id || oe.id.startsWith(event.id));

                const baseLeft = (dayIdx + 1) * dayColWidthPct;
                const adjustedWidth = (dayColWidthPct - 0.5) / totalOverlapping;
                const left = baseLeft + (adjustedWidth * eventIndex);
                const width = adjustedWidth;

                const isUnavailable = e.kind === "unavailable";
                const isOwnEvent = currentUserId !== undefined && e.createdBy === currentUserId;

                // Color scheme based on ownership and type
                const baseColor = isOwnEvent
                  ? (isUnavailable
                      ? "border-zinc-300 bg-zinc-50/60 dark:border-zinc-500 dark:bg-zinc-900/40"
                      : "border-[#E30B5D] bg-[#E30B5D]/50 dark:border-[#E30B5D] dark:bg-[#E30B5D]/50")
                  : (isUnavailable
                      ? "border-gray-600 bg-gray-200/70 dark:border-gray-700 dark:bg-gray-950/70"
                      : "border-[#4169E1] bg-[#4169E1]/50 dark:border-[#4169E1] dark:bg-[#4169E1]/50");

                const hoverColor = isOwnEvent
                  ? (isUnavailable
                      ? "hover:ring-2 hover:ring-zinc-400/60 dark:hover:ring-zinc-400/40"
                      : "hover:ring-2 hover:ring-[#E30B5D]/60 dark:hover:ring-[#E30B5D]/60")
                  : (isUnavailable
                      ? "hover:ring-2 hover:ring-gray-600/60 dark:hover:ring-gray-600/40"
                      : "hover:ring-2 hover:ring-[#4169E1]/60 dark:hover:ring-[#4169E1]/60");

                segments.push(
                  <button
                    key={e.id}
                    onClick={() => onEventClick?.(event.id)} // Use original event ID for click handler
                    className={`absolute overflow-hidden rounded-xl p-2 text-xs text-left transition focus:outline-none ${baseColor} ${hoverColor} ${
                      isUnavailable ? (isOwnEvent ? "border-l-4 border-l-zinc-400 dark:border-l-zinc-400" : "border-l-4 border-l-gray-700 dark:border-l-gray-600") : ""
                    }`}
                    style={{
                      top,
                      left: `calc(${left}% + 0.25rem)`,
                      width: `calc(${width}% - 0.5rem)`,
                      height,
                      zIndex: isUnavailable ? 0 : 10,
                      backgroundImage: isUnavailable
                        ? (isOwnEvent
                            ? "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(113, 113, 122, 0.12) 8px, rgba(113, 113, 122, 0.12) 16px)"
                            : "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(55, 65, 81, 0.2) 8px, rgba(55, 65, 81, 0.2) 16px)")
                        : undefined,
                    }}
                    title={`${event.title} • ${format(event.start, "EEE p")}–${format(event.end, "p")}`}
                  >
                    <div className="font-medium truncate">
                      {event.title}
                    </div>
                    {height >= 50 && (
                      <div className="mt-0.5 opacity-70 truncate">
                        {format(segmentStart, "p")} – {format(segmentEnd, "p")}
                      </div>
                    )}
                  </button>
                );
              }

              return segments;
            }
          })}
        </div>
      </div>
    );
  }