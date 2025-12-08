import React from "react";

export function UpcomingEventsCard({ events }: { events: any[] }) {
  // Graceful empty UI
  if (!events || events.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No upcoming events 🎉
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Upcoming Events
        </h2>
      </div>

      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {events.map((event) => (
          <div key={event.id} className="px-6 py-4">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {event.title}
              </span>

              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {new Date(event.start_time).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
