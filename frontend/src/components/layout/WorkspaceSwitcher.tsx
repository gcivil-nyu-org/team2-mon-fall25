import { useEffect, useState } from "react";

export type Workspace = { id: string; name: string };

// const DEFAULTS: Workspace[] = [
//   { id: "product", name: "Product Team" },
//   { id: "design", name: "Design Ops" },
//   { id: "sales", name: "Sales GTM" },
// ];

export function WorkspaceSwitcher({
  value,
  onChange,
  workspaces = [],
}: {
  value: string;
  onChange: (id: string) => void;
  workspaces?: Workspace[];
}) {
  const [open, setOpen] = useState(false);
  // const [workspaces] = useState<Workspace[]>(DEFAULTS);

  useEffect(() => {
    const last = localStorage.getItem("cd.workspace");
    if (!last) localStorage.setItem("cd.workspace", value);
  }, [value]);

  function select(id: string) {
    console.log("Selected Workspace ID:", id);
    localStorage.setItem("cd.workspace", id);
    onChange(id);
    setOpen(false);
  }

  const active = workspaces.find((w) => w.id === value)?.name ?? value;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-xl border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-700"
        aria-expanded={open}
      >
        {active} ▾
      </button>
      {open && (
        <div className="absolute left-0 mt-1 min-w-[12rem] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {workspaces.map((w) => (
            <button
              key={w.id}
              onClick={() => select(w.id)}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/70"
            >
              {w.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}