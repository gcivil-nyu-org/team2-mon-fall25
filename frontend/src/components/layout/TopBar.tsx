import { useEffect, useState } from "react";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import type { Workspace } from "./WorkspaceSwitcher";
import { fetchWorkspaceList } from "../../lib/api";

function useDarkMode() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("cd.theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) { root.classList.add("dark"); localStorage.setItem("cd.theme","dark"); }
    else { root.classList.remove("dark"); localStorage.setItem("cd.theme","light"); }
  }, [isDark]);
  return { isDark, setIsDark };
}

export function TopBar({
  workspaceName,
  onWorkspace,
}: {
  workspaceName: string;
  onWorkspace: (id: string) => void;
}) {
  const { isDark, setIsDark } = useDarkMode();
  const [workspaceList, setWorkspaceList] = useState<Workspace[]>([]);
    // Fetch workspace names on mount
  useEffect(() => {
    async function fetchWorkspaces() {
      try {
        const data = await fetchWorkspaceList();
        const formatted = data.map((w) => ({
          id: w.workspace_id,
          name: w.name,
        }));
        console.log("Workspaces fetched:", formatted);
        setWorkspaceList(formatted);
      } catch (error) {
        console.error("Error fetching workspaces:", error);
      }
    }
    fetchWorkspaces();
  }, []);
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
      <div className="flex h-14 items-center gap-3 px-4">
        <div className="text-xl font-semibold tracking-tight">CollabDesk</div>
        {/* workspace switcher */}
        <div className="ml-2">
          <WorkspaceSwitcher value={workspaceName} onChange={onWorkspace} workspaces={workspaceList} />
        </div>
        <div className="ml-auto">
          <button
            onClick={() => setIsDark(!isDark)}
            className="rounded-2xl border border-zinc-200 px-3 py-1.5 text-sm shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            aria-label="Toggle dark mode"
          >
            {isDark ? "🌙" : "☀️"}
          </button>
        </div>
      </div>
    </header>
  );
}