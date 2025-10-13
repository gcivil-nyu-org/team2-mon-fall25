import { format } from "date-fns";

interface Workspace {
  workspace_id: string;
  name: string;
  description: string;
  created_at: string;
  member_count: number;
  is_member: boolean;
  is_public: boolean;
}

interface Props {
  workspace: Workspace;
  onShowMembers?: () => void;
}

export function WorkspaceInfoCard({ workspace }: Props) {
  const formattedDate = format(new Date(workspace.created_at), "MMMM d, yyyy");

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 bg-white dark:bg-zinc-900 shadow-sm">
      <div className="mb-3">
        <h2 className="text-xl font-semibold tracking-tight">{workspace.name}</h2>
        <p className="text-zinc-600 dark:text-zinc-400">{workspace.description}</p>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
        Created on {formattedDate}
      </p>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Members: {workspace.member_count}
      </p>
    </div>
  );
}