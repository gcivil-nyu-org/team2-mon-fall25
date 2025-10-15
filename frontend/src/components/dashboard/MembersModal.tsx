interface Member {
    id: string;
    name: string;
    role: string;
  }
  
  interface Props {
    open: boolean;
    onClose: () => void;
    members: Member[];
  }
  
  export function MembersModal({ open, onClose, members }: Props) {
    if (!open) return null;
  
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 w-[400px] shadow-lg">
          <h3 className="text-lg font-semibold mb-4">Workspace Members</h3>
  
          <ul className="space-y-2 mb-4">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex justify-between items-center rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2"
              >
                <span className="font-medium">{m.name}</span>
                <span className="text-sm text-zinc-500">{m.role}</span>
              </li>
            ))}
          </ul>
  
          <button
            onClick={onClose}
            className="mt-2 rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors w-full"
          >
            Close
          </button>
        </div>
      </div>
    );
  }