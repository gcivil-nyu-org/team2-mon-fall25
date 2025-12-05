import { format, compareAsc } from "date-fns";

export type RSVPStatus = "pending" | "accepted" | "declined" | "tentative";

export type CalEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  kind?: "meeting" | "unavailable";
  createdBy?: number;
  userRsvpStatus?: RSVPStatus; // User's RSVP status
  rsvpSummary?: { // For event creators
    accepted: number;
    declined: number;
    tentative: number;
    pending: number;
  };
};

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
  const now = new Date();
  // Filter out past events (events that have already ended)
  const upcomingEvents = events.filter((e) => e.end > now);
  const sorted = [...upcomingEvents].sort((a, b) => compareAsc(a.start, b.start));
  return (
    <aside className="hidden lg:block w-[300px] shrink-0 sticky top-14 self-start">
      <div className="rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        {/* View Toggle */}
        <div className="mb-3 flex items-center gap-2 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <button
            onClick={() => onViewChange("all")}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${calendarView === "all"
              ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
          >
            All View
          </button>
          <button
            onClick={() => onViewChange("my")}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${calendarView === "my"
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
            <div className="text-zinc-500">No upcoming events.</div>
          )}
          {sorted.map((e) => {
            const isUnavailable = e.kind === "unavailable";
            const isOwnEvent = currentUserId !== undefined && e.createdBy === currentUserId;
            const isPendingRsvp = !isOwnEvent && e.userRsvpStatus === 'pending';

            // Color scheme based on ownership and type - matching CalendarWeek
            const baseBorderColor = isOwnEvent
              ? (isUnavailable
                ? "border-zinc-300 bg-zinc-50/50 dark:border-zinc-500 dark:bg-zinc-900/30"
                : "border-[#E30B5D] bg-[#E30B5D]/20 dark:border-[#E30B5D] dark:bg-[#E30B5D]/20")
              : (isUnavailable
                ? "border-gray-600 bg-gray-200/60 dark:border-gray-700 dark:bg-gray-950/60"
                : "border-[#4169E1] bg-[#4169E1]/20 dark:border-[#4169E1] dark:bg-[#4169E1]/20");

            const borderColor = isPendingRsvp
              ? "border-amber-400 bg-amber-50/50 dark:border-amber-600 dark:bg-amber-900/20 ring-1 ring-amber-400/30 dark:ring-amber-600/30"
              : baseBorderColor;

            const leftBorderColor = isUnavailable
              ? (isOwnEvent
                ? "border-l-4 border-l-zinc-400 dark:border-l-zinc-400"
                : "border-l-4 border-l-gray-700 dark:border-l-gray-600")
              : (isPendingRsvp ? "border-l-4 border-l-amber-500 dark:border-l-amber-500" : "");

            const hoverColor = isOwnEvent
              ? (isUnavailable
                ? "hover:bg-zinc-100/60 dark:hover:bg-zinc-900/50"
                : "hover:bg-[#E30B5D]/30 dark:hover:bg-[#E30B5D]/30")
              : (isUnavailable
                ? "hover:bg-gray-300/60 dark:hover:bg-gray-950/70"
                : (isPendingRsvp ? "hover:bg-amber-100/50 dark:hover:bg-amber-900/30" : "hover:bg-[#4169E1]/30 dark:hover:bg-[#4169E1]/30"));

            // RSVP badge styling
            const getRsvpBadge = () => {
              if (isUnavailable) return null;

              // Show RSVP summary for event creator
              if (isOwnEvent && e.rsvpSummary) {
                const total = e.rsvpSummary.accepted + e.rsvpSummary.declined +
                  e.rsvpSummary.tentative + e.rsvpSummary.pending;
                if (total === 0) return null;

                return (
                  <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                    <span className="text-green-600 dark:text-green-400">{e.rsvpSummary.accepted}</span>/
                    <span className="text-yellow-600 dark:text-yellow-400">{e.rsvpSummary.tentative}</span>/
                    <span className="text-red-600 dark:text-red-400">{e.rsvpSummary.declined}</span>/
                    <span className="text-zinc-500 dark:text-zinc-400">{e.rsvpSummary.pending}</span>
                  </span>
                );
              }

              // Show user's RSVP status for events they're attending
              if (!isOwnEvent && e.userRsvpStatus) {
                const statusConfig: Record<string, { icon: string; bg: string; text: string; label: string }> = {
                  pending: { icon: "⏱", bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", label: "RSVP" },
                  accepted: { icon: "✓", bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300", label: "" },
                  declined: { icon: "✗", bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", label: "" },
                  tentative: { icon: "?", bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-300", label: "" },
                };
                const config = statusConfig[e.userRsvpStatus] || statusConfig.pending;

                if (e.userRsvpStatus === 'pending') {
                  return (
                    <span className={`ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${config.bg} ${config.text} border border-amber-200 dark:border-amber-800 shadow-sm`}>
                      {config.icon} {config.label}
                    </span>
                  );
                }

                return (
                  <span className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${config.bg} ${config.text}`}>
                    {config.icon}
                  </span>
                );
              }

              return null;
            };

            return (
              <button
                key={e.id}
                onClick={() => onEventClick?.(e.id)}
                className={`w-full text-left rounded-xl border p-2 ${borderColor} ${leftBorderColor} ${hoverColor} transition-colors cursor-pointer`}
                title={`${e.title} • ${format(e.start, "EEE p")}–${format(e.end, "p")}`}
              >
                <div className="font-medium flex items-center">
                  <span className="truncate">{e.title}</span>
                  {getRsvpBadge()}
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