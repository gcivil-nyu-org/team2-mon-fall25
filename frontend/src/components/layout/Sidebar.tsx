function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}
const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", emoji: "🏠" },
  { key: "notes", label: "Notes", emoji: "📝" },
  { key: "tasks", label: "Tasks", emoji: "✅" },
  { key: "calendar", label: "Calendar", emoji: "🗓️" },
  { key: "resources", label: "Resources", emoji: "📁" },
  { key: "message", label: "Message Board", emoji: "💬" },
  { key: "chat", label: "Chat", emoji: "🤖" },
  { key: "settings", label: "Settings", emoji: "⚙️" },
];

export function Sidebar({
  current, setCurrent,
}: { current: string; setCurrent: (k: string) => void; }) {
  return (
    <aside className="p-3">
      <nav className="space-y-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={() => setCurrent(item.key)}
            className={classNames(
              "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition",
              current === item.key
                ? "bg-zinc-100 font-medium dark:bg-zinc-800/70"
                : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
            )}
          >
            <span className="w-5 text-center">{item.emoji}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}