import { formatDistanceToNow } from 'date-fns';
import type { Note, ViewMode, ActiveTab } from './types';

interface NoteCardProps {
  note: Note;
  viewMode: ViewMode;
  activeTab: ActiveTab;
  onEdit: (note: Note) => void;
  onDelete: (note: Note) => void;
  onShare: (note: Note) => void;
  onView: (note: Note) => void;
}

export function NoteCard({ note, viewMode, activeTab, onEdit, onDelete, onShare, onView }: NoteCardProps) {
  const handleClick = () => {
    if (note.is_shared) {
      onView(note);
    } else {
      onEdit(note);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(note);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(note);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShare(note);
  };

  // Extract preview text from markdown content (remove markdown syntax)
  const getPreviewText = (content: string) => {
    return content
      .replace(/#{1,6}\s/g, '') // Remove headers
      .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.+?)\*/g, '$1') // Remove italic
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links
      .replace(/`(.+?)`/g, '$1') // Remove inline code
      .replace(/\n/g, ' ') // Replace newlines with spaces
      .trim()
      .substring(0, 150);
  };

  const timeAgo = formatDistanceToNow(new Date(note.updated_at), { addSuffix: true });

  if (viewMode === 'list') {
    return (
      <div
        onClick={handleClick}
        className="flex items-start gap-4 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {note.title}
            </h3>
            {note.is_shared && (
              <span className="flex-shrink-0 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                Shared
              </span>
            )}
          </div>

          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3 line-clamp-2">
            {getPreviewText(note.content)}
          </p>

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
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            {activeTab === 'mine' ? (
              <div className="text-right">Last modified {timeAgo}</div>
            ) : (
              <div className="text-right">
                <div>Last modified {timeAgo}</div>
                {note.last_modified_by && (
                  <div>by {note.last_modified_by.name}</div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {!note.is_shared && (
              <>
                <button
                  onClick={handleShare}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  title="Share note"
                  aria-label="Share note"
                >
                  <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
                <button
                  onClick={handleEdit}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  title="Edit note"
                  aria-label="Edit note"
                >
                  <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </>
            )}
            {!note.is_shared && (
              <button
                onClick={handleDelete}
                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Delete note"
                aria-label="Delete note"
              >
                <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div
      onClick={handleClick}
      className="flex flex-col p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer h-64"
    >
      {note.is_shared && (
        <div className="flex justify-end mb-2">
          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
            Shared
          </span>
        </div>
      )}

      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2 line-clamp-2">
        {note.title}
      </h3>

      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3 line-clamp-3 flex-grow">
        {getPreviewText(note.content)}
      </p>

      <div className="flex items-center flex-wrap gap-2 mb-3 overflow-x-auto">
        {note.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="flex-shrink-0 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full"
          >
            {tag}
          </span>
        ))}
        {note.tags.length > 3 && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            +{note.tags.length - 3} more
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {activeTab === 'mine' ? (
            <div>Last modified {timeAgo}</div>
          ) : (
            <div>
              <div>Last modified {timeAgo}</div>
              {note.last_modified_by && (
                <div>by {note.last_modified_by.name}</div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {!note.is_shared && (
            <>
              <button
                onClick={handleShare}
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                title="Share note"
                aria-label="Share note"
              >
                <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
              <button
                onClick={handleEdit}
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                title="Edit note"
                aria-label="Edit note"
              >
                <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </>
          )}
          {!note.is_shared && (
            <button
              onClick={handleDelete}
              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Delete note"
              aria-label="Delete note"
            >
              <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
