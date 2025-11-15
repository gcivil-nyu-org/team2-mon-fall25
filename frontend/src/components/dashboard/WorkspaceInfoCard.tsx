import { useState } from "react";
import { format } from "date-fns";
import type { Workspace } from "../../lib/api";
import { updateWorkspace } from "../../lib/api";

interface Props {
  workspace: Workspace;
  currentUserId?: number;
  onWorkspaceUpdate?: (updatedWorkspace: Workspace) => void;
}

export function WorkspaceInfoCard({ workspace, currentUserId, onWorkspaceUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(workspace.name);
  const [editedDescription, setEditedDescription] = useState(workspace.description || "");
  const [isSaving, setIsSaving] = useState(false);

  const isOwner = currentUserId !== undefined && workspace.created_by_id === currentUserId;

  const formattedDate = workspace.created_at
    ? format(new Date(workspace.created_at), "MMMM d, yyyy")
    : "Unknown";

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const updated = await updateWorkspace(workspace.workspace_id, {
        name: editedName,
        description: editedDescription,
      });
      onWorkspaceUpdate?.(updated);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update workspace:", error);
      alert("Failed to update workspace. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedName(workspace.name);
    setEditedDescription(workspace.description || "");
    setIsEditing(false);
  };

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 bg-white dark:bg-zinc-900 shadow-sm">
      <div className="mb-3">
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Workspace Name
              </label>
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Workspace name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Description
              </label>
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Workspace description"
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={isSaving || !editedName.trim()}
                className="rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 text-sm font-medium transition"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="rounded-md border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-xl font-semibold tracking-tight">{workspace.name}</h2>
              <p className="text-zinc-600 dark:text-zinc-400">{workspace.description || "No description"}</p>
            </div>
            {isOwner && (
              <button
                onClick={() => setIsEditing(true)}
                className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
            )}
          </div>
        )}
      </div>
      {!isEditing && (
        <>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
            Created on {formattedDate}
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Total Members: {workspace.member_count ?? 0}
          </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Members: {workspace.members?.map(member => member.full_name).join(", ") || "No members"}
          </p>
        </>
      )}
    </div>
  );
}