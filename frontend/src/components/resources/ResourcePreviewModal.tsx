import { useEffect, useRef, useState } from "react";
import { Modal } from "../modals/Modal";
import type { Resource } from "./ResourceApi";
import { getResourcePreviewUrl } from "./ResourceApi";

interface ResourcePreviewModalProps {
  open: boolean;
  onClose: () => void;
  resource: Resource | null;
}

export function ResourcePreviewModal({
  open,
  onClose,
  resource,
}: ResourcePreviewModalProps) {
  const [imageError, setImageError] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const revokeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let isMounted = true;
    // Reset when resource or modal changes
    setImageError(false);
    setPreviewUrl(null);
    if (!open || !resource) return;

    (async () => {
      try {
        const { url, revoke } = await getResourcePreviewUrl(resource);
        if (!isMounted) return;
        setPreviewUrl(url);
        revokeRef.current = revoke ?? null;
      } catch (e) {
        console.error("Failed to get preview URL", e);
        setPreviewUrl(null);
      }
    })();

    return () => {
      isMounted = false;
      if (revokeRef.current) {
        try {
          revokeRef.current();
        } catch (err) {
          console.debug("Failed to revoke preview URL", err);
        } finally {
          revokeRef.current = null;
        }
      }
    };
  }, [open, resource]);

  if (!resource) return null;

  const isImage = ["png", "jpg", "jpeg", "gif", "svg"].includes(
    resource.fileType.toLowerCase()
  );
  const isPDF = resource.fileType.toLowerCase() === "pdf";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={<div className="truncate pr-8">{resource.name}</div>}
    >
      <div className="space-y-4">
        {/* File metadata */}
        <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-1.5">
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
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            <span className="uppercase font-medium">{resource.fileType}</span>
          </div>
          <div className="text-zinc-400 dark:text-zinc-600">•</div>
          <div>{(resource.fileSize / 1024 / 1024).toFixed(2)} MB</div>
        </div>

        {/* Preview content */}
        <div className="bg-zinc-50 dark:bg-zinc-950 rounded-xl p-4 max-h-[60vh] overflow-auto">
          {isImage ? (
            imageError ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-500 dark:text-zinc-400">
                <svg
                  className="w-16 h-16 mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                  <line
                    x1="4"
                    y1="4"
                    x2="20"
                    y2="20"
                    strokeLinecap="round"
                    strokeWidth={1.5}
                  />
                </svg>
                <p className="font-medium">Image unavailable</p>
                <p className="text-sm mt-1">Failed to load image preview</p>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <img
                  src={previewUrl || ''}
                  alt={resource.name}
                  className="max-w-full h-auto rounded-lg shadow-sm"
                  onError={() => setImageError(true)}
                />
              </div>
            )
          ) : isPDF ? (
            <div className="space-y-3">
              <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <iframe
                  src={previewUrl ? `${previewUrl}#view=FitH` : undefined}
                  className="w-full h-[50vh]"
                  title={`Preview of ${resource.name}`}
                  onError={() => {
                    console.error("Failed to load PDF preview");
                  }}
                />
              </div>
              <div className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                PDF preview
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500 dark:text-zinc-400">
              <svg
                className="w-16 h-16 mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
                <line
                  x1="4"
                  y1="4"
                  x2="20"
                  y2="20"
                  strokeLinecap="round"
                  strokeWidth={1.5}
                />
              </svg>
              <p className="font-medium">Preview not available</p>
              <p className="text-sm mt-1">
                This file type cannot be previewed
              </p>
              <p className="text-xs mt-2 text-zinc-400 dark:text-zinc-600">
                Download the file to view its contents
              </p>
            </div>
          )}
        </div>

        {/* Tags */}
        {resource.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Tags:</span>
            {resource.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
