import { useState, useEffect } from "react";
import { Modal } from "../modals/Modal";
import type { Resource } from "./ResourceApi";
import { updateResource } from "./ResourceApi";

interface ResourceEditModalProps {
  open: boolean;
  onClose: () => void;
  resource: Resource | null;
  onUpdate: (resource: Resource) => void;
}

export function ResourceEditModal({
  open,
  onClose,
  resource,
  onUpdate,
}: ResourceEditModalProps) {
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Initialize form when resource changes
  useEffect(() => {
    if (resource) {
      setName(resource.name);
      setTags(resource.tags.join(", "));
    }
  }, [resource]);

  const handleUpdate = async () => {
    if (!resource) return;

    if (!name.trim()) {
      alert("Please provide a name for the document");
      return;
    }

    setIsUpdating(true);

    try {
      // Parse tags (comma-separated)
      const tagArray = tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      // Update resource via API
      const updatedResource = await updateResource(resource.id, {
        name: name.trim(),
        tags: tagArray,
      });

      onUpdate(updatedResource);
      onClose();
    } catch (error) {
      console.error("Update failed:", error);
      alert("Failed to update document. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (!resource) return null;

  return (
    <Modal open={open} onClose={onClose} title={<div>Edit Document</div>}>
      <div className="space-y-4">
        {/* File Info (read-only) */}
        <div className="bg-zinc-50 dark:bg-zinc-950 rounded-xl p-3 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{resource.fileType === "pdf" ? "📄" : resource.fileType === "docx" ? "📝" : resource.fileType === "xlsx" ? "📊" : "📁"}</div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                {resource.fileName}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {resource.fileType.toUpperCase()} • {(resource.fileSize / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
          </div>
        </div>

        {/* Document Name */}
        <div>
          <label className="text-sm text-zinc-600 dark:text-zinc-400 block mb-2">
            Document Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Q4 Marketing Strategy"
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-blue-900"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="text-sm text-zinc-600 dark:text-zinc-400 block mb-2">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g., marketing, strategy, q4"
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-blue-900"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Separate multiple tags with commas
          </p>
        </div>

        {/* Update Button */}
        <div className="pt-2 flex gap-2">
          <button
            onClick={onClose}
            disabled={isUpdating}
            className="flex-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 px-4 py-2 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdate}
            disabled={isUpdating || !name.trim()}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {isUpdating ? "Updating..." : "Save Changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
