import { format } from "date-fns";

interface Workspace {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

interface Props {
  workspace: Workspace;
  onShowMembers: () => void;
}

export function WorkspaceInfoCard({ workspace, onShowMembers }: Props) {
  const formattedDate = format(new Date(workspace.createdAt), "MMMM d, yyyy");

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 bg-white dark:bg-zinc-900 shadow-sm">
      <div className="mb-3">
        <h2 className="text-xl font-semibold tracking-tight">
          {workspace.name}
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          {workspace.description}
        </p>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
        Created on {formattedDate}
      </p>
      <button
        onClick={onShowMembers}
        className="rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        View Members
      </button>
    </div>
  );
}