import { formatDistanceToNow } from 'date-fns';
import type { Document } from './types';

interface DocumentContextProps {
  document: Document | null;
  onRemove: () => void;
}

export function DocumentContext({ document, onRemove }: DocumentContextProps) {
  if (!document) return null;

  const timeAgo = formatDistanceToNow(new Date(document.uploaded_at), { addSuffix: true });
  const fileSizeInMB = (document.size / (1024 * 1024)).toFixed(2);

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('text') || fileType.includes('markdown')) return '📃';
    return '📁';
  };

  const getFileExtension = (name: string) => {
    return name.split('.').pop()?.toUpperCase() || 'FILE';
  };

  return (
    <div className="w-70 h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Document Context
        </h3>
      </div>

      {/* Document Info */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* File Icon and Name */}
          <div className="flex items-start gap-3">
            <div className="text-4xl">{getFileIcon(document.file_type)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 break-words">
                {document.name}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {getFileExtension(document.name)}
              </p>
            </div>
          </div>

          {/* Preview (if available) */}
          {document.preview_url && (
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
              <img
                src={document.preview_url}
                alt="Document preview"
                className="w-full h-auto"
              />
            </div>
          )}

          {/* Metadata */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-600 dark:text-zinc-400">Size:</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {fileSizeInMB} MB
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600 dark:text-zinc-400">Uploaded:</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {timeAgo}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Remove Document */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => {
            if (window.confirm('Remove this document? The conversation will also be cleared.')) {
              onRemove();
            }
          }}
          className="w-full px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Remove Document
        </button>
      </div>
    </div>
  );
}
