import { Modal } from "./Modal";

interface WorkspaceActionModalProps {
  open: boolean;
  onClose: () => void;
  onCreateWorkspace: () => void;
  onJoinWorkspace: () => void;
}

export function WorkspaceActionModal({
  open,
  onClose,
  onCreateWorkspace,
  onJoinWorkspace,
}: WorkspaceActionModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Workspace">
      <div className="space-y-3 p-1">
        <button
          onClick={() => {
            onClose();
            onCreateWorkspace();
          }}
          className="w-full rounded-xl border-2 border-zinc-200 dark:border-zinc-700 p-6 text-left hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors group"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/60 transition-colors">
              <svg
                className="w-6 h-6 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                Create New Workspace
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Set up a new workspace for your team with custom name, description, and members.
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => {
            onClose();
            onJoinWorkspace();
          }}
          className="w-full rounded-xl border-2 border-zinc-200 dark:border-zinc-700 p-6 text-left hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors group"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/60 transition-colors">
              <svg
                className="w-6 h-6 text-emerald-600 dark:text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                Join Workspace
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Join an existing workspace using a 6-digit invite code.
              </p>
            </div>
          </div>
        </button>
      </div>
    </Modal>
  );
}
