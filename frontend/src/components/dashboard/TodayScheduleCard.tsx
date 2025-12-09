import { useState, useEffect } from "react";
import { type BackendEvent, fetchEvents } from "../../lib/api";
import { format, isToday, isBefore, isAfter } from "date-fns";

interface TodayScheduleCardProps {
  onEventClick?: (eventId: string) => void;
  onNavigate?: (route: string) => void;
}

export function TodayScheduleCard({ onEventClick, onNavigate }: TodayScheduleCardProps) {
  const [todayEvents, setTodayEvents] = useState<BackendEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextEventIndex, setNextEventIndex] = useState<number | null>(null);

  useEffect(() => {
    const loadTodayEvents = async () => {
      try {
        const allEvents = await fetchEvents();
        const now = new Date();

        // Filter for today's events
        const eventsToday = allEvents
          .filter((event) => isToday(new Date(event.start_time)))
          .sort(
            (a, b) =>
              new Date(a.start_time).getTime() -
              new Date(b.start_time).getTime()
          );

        setTodayEvents(eventsToday);

        // Find next upcoming event
        const nextIndex = eventsToday.findIndex((event) =>
          isAfter(new Date(event.start_time), now)
        );
        setNextEventIndex(nextIndex >= 0 ? nextIndex : null);
      } catch (error) {
        console.error("Failed to load today's events:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTodayEvents();
    // Refresh every minute to update "next event" status
    const interval = setInterval(loadTodayEvents, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <div className="animate-pulse">
          <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-32 mb-3"></div>
          <div className="space-y-2">
            <div className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div>
            <div className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (todayEvents.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Today's Schedule
          </h2>
        </div>
        <div className="p-4 text-center py-6">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No events today 🎉
          </p>
        </div>
      </div>
    );
  }

  const nextEvent =
    nextEventIndex !== null ? todayEvents[nextEventIndex] : null;
  const timeUntilNext = nextEvent
    ? Math.ceil(
        (new Date(nextEvent.start_time).getTime() - new Date().getTime()) /
          (1000 * 60)
      )
    : null;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Today's Schedule
          </h2>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {todayEvents.length} {todayEvents.length === 1 ? "event" : "events"}
          </span>
        </div>
      </div>

      <div className="p-4">
        {/* Next Event Countdown */}
        {nextEvent && timeUntilNext !== null && timeUntilNext > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-zinc-50 to-zinc-100/50 dark:from-zinc-800/50 dark:to-zinc-800/30 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-zinc-600 dark:text-zinc-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                Next event in{" "}
                <span className="text-sm font-bold">
                  {timeUntilNext < 60
                    ? `${timeUntilNext} min`
                    : `${Math.floor(timeUntilNext / 60)}h ${timeUntilNext % 60}m`}
                </span>
              </span>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="space-y-3">
          {todayEvents.map((event, index) => {
            const startTime = new Date(event.start_time);
            const endTime = new Date(event.end_time);
            const isNext = index === nextEventIndex;
            const isPast = isBefore(endTime, new Date());
            const isOngoing =
              isAfter(new Date(), startTime) && isBefore(new Date(), endTime);

            // Calculate duration in minutes
            const durationMinutes = Math.round(
              (endTime.getTime() - startTime.getTime()) / (1000 * 60)
            );
            const durationText =
              durationMinutes < 60
                ? `${durationMinutes}m`
                : `${Math.floor(durationMinutes / 60)}h${durationMinutes % 60 > 0 ? ` ${durationMinutes % 60}m` : ""}`;

            return (
              <button
                key={event.event_id}
                onClick={() => onEventClick?.(event.event_id)}
                className={`group relative flex gap-3 p-3 rounded-lg border transition-all duration-200 w-full text-left bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${onEventClick ? "cursor-pointer" : ""}`}
              >
                {/* Time Column */}
                <div className="flex-shrink-0 w-16">
                  <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    {format(startTime, "h:mm a")}
                  </div>
                  <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                    {durationText}
                  </div>
                </div>

                {/* Timeline Indicator */}
                <div className="flex flex-col items-center pt-1">
                  <div className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-500"></div>
                  {index < todayEvents.length - 1 && (
                    <div className="w-0.5 flex-1 bg-gradient-to-b from-zinc-300 to-zinc-200 dark:from-zinc-600 dark:to-zinc-700 mt-1.5"></div>
                  )}
                </div>

                {/* Event Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-semibold line-clamp-1 text-zinc-900 dark:text-zinc-100">
                      {event.title}
                    </h3>
                  </div>

                  {/* Location */}
                  {event.location && event.location !== "none" && (
                    <div className="flex items-center gap-1 mt-1">
                      <svg
                        className="w-3 h-3 text-zinc-400 dark:text-zinc-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span className="text-[10px] text-zinc-600 dark:text-zinc-400 line-clamp-1">
                        {event.location}
                      </span>
                    </div>
                  )}
                </div>

                {/* Hover arrow indicator */}
                {onEventClick && (
                  <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg
                      className="w-4 h-4 text-zinc-400 dark:text-zinc-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* View Full Calendar Link */}
        <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => onNavigate?.("calendar")}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
          >
            View Full Calendar →
          </button>
        </div>
      </div>
    </div>
  );
}
