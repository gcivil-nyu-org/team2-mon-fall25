import { useState, useEffect, useMemo } from "react";
import type { Resource } from "./ResourceApi";
import {
  getResources,
  deleteResource,
  downloadResource,
  getUniqueFileTypes,
  getUniqueTags,
} from "./ResourceApi";
import { ResourceList } from "./ResourceList";
import { ResourceUploadModal } from "./ResourceUploadModal";
import { ResourcePreviewModal } from "./ResourcePreviewModal";
import { ResourceEditModal } from "./ResourceEditModal";

export function Resources({ workspace, currentUserId, isWorkspaceOwner = false }: { workspace: string; currentUserId?: number; isWorkspaceOwner?: boolean }) {
  // State
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFileType, setSelectedFileType] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<string>("");

  // Modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  // Load resources
  useEffect(() => {
    if (!workspace) return;
    loadResources();
  }, [workspace]);

  const loadResources = async () => {
    try {
      setIsLoading(true);
      const data = await getResources();
      setResources(data);
    } catch (error) {
      console.error("Failed to load resources:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get unique values for filter dropdowns
  const availableFileTypes = useMemo(() => getUniqueFileTypes(resources), [resources]);
  const availableTags = useMemo(() => getUniqueTags(resources), [resources]);

  // Filter resources
  const filteredResources = useMemo(() => {
    return resources.filter((resource) => {
      // Search query
      if (searchQuery && !resource.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // File type filter
      if (selectedFileType && resource.fileType !== selectedFileType) {
        return false;
      }

      // Tag filter
      if (selectedTag && !resource.tags.includes(selectedTag)) {
        return false;
      }

      return true;
    });
  }, [resources, searchQuery, selectedFileType, selectedTag]);

  // Handlers
  const handleUpload = (newResource: Resource) => {
    setResources((prev) => [newResource, ...prev]);
  };

  const handlePreview = (resource: Resource) => {
    setSelectedResource(resource);
    setShowPreviewModal(true);
  };

  const handleDownload = async (resource: Resource) => {
    try {
      await downloadResource(resource);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to download document. Please try again.");
    }
  };

  const handleUpdate = (updatedResource: Resource) => {
    setResources((prev) =>
      prev.map((r) => (r.id === updatedResource.id ? updatedResource : r))
    );
  };

  const handleDelete = async (resource: Resource) => {
    if (!confirm(`Are you sure you want to delete "${resource.name}"?`)) {
      return;
    }

    try {
      await deleteResource(resource.id);
      setResources((prev) => prev.filter((r) => r.id !== resource.id));
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete document. Please try again.");
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedFileType("");
    setSelectedTag("");
  };

  const activeFilterCount =
    (searchQuery ? 1 : 0) +
    (selectedFileType ? 1 : 0) +
    (selectedTag ? 1 : 0);

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Resources
          </h1>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
          >
            <svg
              className="w-4 h-4 shrink-0"
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
            Upload
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full sm:min-w-[200px]">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
            />
          </div>

          {/* File Type Filter */}
          <select
            value={selectedFileType}
            onChange={(e) => setSelectedFileType(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 min-w-[120px] shrink"
          >
            <option value="">All Types</option>
            {availableFileTypes.map((type) => (
              <option key={type} value={type}>
                {type.toUpperCase()}
              </option>
            ))}
          </select>

          {/* Tag Filter */}
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 min-w-[120px] shrink"
          >
            <option value="">All Tags</option>
            {availableTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>

        {/* Active Filters */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Active filters:
            </span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                Search: {searchQuery}
                <button
                  onClick={() => setSearchQuery("")}
                  className="hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded"
                >
                  ×
                </button>
              </span>
            )}
            {selectedFileType && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                Type: {selectedFileType.toUpperCase()}
                <button
                  onClick={() => setSelectedFileType("")}
                  className="hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded"
                >
                  ×
                </button>
              </span>
            )}
            {selectedTag && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                Tag: {selectedTag}
                <button
                  onClick={() => setSelectedTag("")}
                  className="hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded"
                >
                  ×
                </button>
              </span>
            )}
            <button
              onClick={clearFilters}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-zinc-500 dark:text-zinc-400">Loading documents...</div>
          </div>
        ) : (
          <ResourceList
            resources={filteredResources}
            onPreview={handlePreview}
            onDownload={handleDownload}
            onDelete={handleDelete}
            currentUserId={currentUserId}
            isWorkspaceOwner={isWorkspaceOwner}
          />
        )}
      </div>

      {/* Modals */}
      <ResourceUploadModal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
      />

      <ResourcePreviewModal
        open={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setSelectedResource(null);
        }}
        resource={selectedResource}
      />

      <ResourceEditModal
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedResource(null);
        }}
        resource={selectedResource}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
