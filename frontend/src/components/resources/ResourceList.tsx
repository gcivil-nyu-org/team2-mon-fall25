import type { Resource } from "./ResourceApi";
import {
  formatFileSize,
  formatDate,
  canPreview,
} from "./ResourceApi";
import { FileTypeBadge } from "./FileTypeBadge";

interface ResourceListProps {
  resources: Resource[];
  onPreview: (resource: Resource) => void;
  onDownload: (resource: Resource) => void;
  onDelete: (resource: Resource) => void;
  currentUserId?: number;
  isWorkspaceOwner?: boolean;
}

export function ResourceList({
  resources,
  onPreview,
  onDownload,
  onDelete,
  currentUserId,
  isWorkspaceOwner = false,
}: ResourceListProps) {
  if (resources.length === 0) {
    return (
      <div className="text-center py-16">
        <svg
          className="w-16 h-16 mx-auto mb-4 text-zinc-400 dark:text-zinc-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
        <p className="text-zinc-500 dark:text-zinc-400">
          No documents match your filters
        </p>
        <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-2">
          Try adjusting your search or filters
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="text-left py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Name
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300 hidden md:table-cell">
              Type
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300 hidden lg:table-cell">
              Size
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300 hidden lg:table-cell">
              Uploaded By
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300 hidden xl:table-cell">
              Uploaded
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300 hidden xl:table-cell">
              Tags
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {resources.map((resource) => (
            <tr
              key={resource.id}
              className="border-b border-zinc-100 dark:border-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
            >
              {/* Name Column */}
              <td className="py-3 px-4">
                <div className="min-w-0">
                  <div
                    className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate"
                    title={resource.name}
                  >
                    {resource.name}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 md:hidden">
                    {formatFileSize(resource.fileSize)} • {resource.uploadedBy}
                  </div>
                </div>
              </td>

              {/* Type Column (hidden on mobile) */}
              <td className="py-3 px-4 hidden md:table-cell">
                <FileTypeBadge fileType={resource.fileType} />
              </td>

              {/* Size Column (hidden on mobile and tablet) */}
              <td className="py-3 px-4 text-sm text-zinc-600 dark:text-zinc-400 hidden lg:table-cell">
                {formatFileSize(resource.fileSize)}
              </td>

              {/* Uploaded By Column (hidden on mobile and tablet) */}
              <td className="py-3 px-4 text-sm text-zinc-600 dark:text-zinc-400 hidden lg:table-cell">
                {resource.uploadedBy}
              </td>

              {/* Upload Date Column (hidden on mobile, tablet, and medium desktop) */}
              <td className="py-3 px-4 text-sm text-zinc-600 dark:text-zinc-400 hidden xl:table-cell">
                {formatDate(resource.uploaded)}
              </td>

              {/* Tags Column (hidden on mobile, tablet, and medium desktop) */}
              <td className="py-3 px-4 hidden xl:table-cell">
                {resource.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {resource.tags.slice(0, 2).map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      >
                        {tag}
                      </span>
                    ))}
                    {resource.tags.length > 2 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        +{resource.tags.length - 2}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-zinc-400 dark:text-zinc-600">—</span>
                )}
              </td>

              {/* Actions Column */}
              <td className="py-3 px-4">
                <div className="flex items-center justify-end gap-1">
                  {canPreview(resource.fileType) && (
                    <button
                      onClick={() => onPreview(resource)}
                      className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                      title="Preview"
                      aria-label="Preview document"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => onDownload(resource)}
                    className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    title="Download"
                    aria-label="Download document"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                  </button>
                  {(resource.uploadedById === currentUserId || isWorkspaceOwner) && (
                    <button
                      onClick={() => onDelete(resource)}
                      className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                      title="Delete"
                      aria-label="Delete document"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
