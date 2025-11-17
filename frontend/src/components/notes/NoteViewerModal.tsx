import { formatDistanceToNow } from 'date-fns';
import { Modal } from '../modals/Modal';
import { MarkdownRenderer } from '../shared/MarkdownRenderer';
import type { Note } from './types';

interface NoteViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: Note | null;
}

export function NoteViewerModal({ isOpen, onClose, note }: NoteViewerModalProps) {
  if (!note) return null;

  const timeAgo = formatDistanceToNow(new Date(note.updated_at), { addSuffix: true });

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={note.title}
      wide={true}
    >
      <div className="space-y-4">
        {/* Header Info */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
              Shared by {note.shared_by?.name || 'Unknown'}
            </span>
            {note.last_modified_by && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Modified by {note.last_modified_by.name}
              </span>
            )}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {timeAgo}
          </div>
        </div>

        {/* Tags */}
        {note.tags.length > 0 && (
          <div className="flex items-center flex-wrap gap-2">
            {note.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="max-h-[600px] overflow-y-auto">
          <div className="prose dark:prose-invert max-w-none">
            <MarkdownRenderer content={note.content} />
          </div>
        </div>

        {/* Read-only notice */}
        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">
            This note is shared with you as read-only. You cannot edit it.
          </p>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
