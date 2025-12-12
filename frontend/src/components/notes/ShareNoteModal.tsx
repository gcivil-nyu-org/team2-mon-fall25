import { useState, useEffect } from 'react';
import { Modal } from '../modals/Modal';
import type { Note, User } from './types';

interface ShareNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: (userIds: string[]) => Promise<void>;
  note: Note | null;
  workspaceMembers: User[];
}

export function ShareNoteModal({
  isOpen,
  onClose,
  onShare,
  note,
  workspaceMembers,
}: ShareNoteModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (note && isOpen) {
      // Pre-select currently shared users
      const sharedIds = new Set(note.shared_with.map((user) => user.id));
      console.log("🔁 Pre-selecting shared user IDs:", Array.from(sharedIds));
      setSelectedUserIds(sharedIds);
    }
    setSearchQuery('');
    setError('');
  }, [note, isOpen]);

  useEffect(() => {
    console.log("🚨 ShareNoteModal received workspaceMembers:", workspaceMembers);
  }, [workspaceMembers]);

  const filteredMembers = workspaceMembers.filter((member) => {
    const query = searchQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query)
    );
  });

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUserIds(newSelected);
  };

  const handleShare = async () => {
    setIsSharing(true);
    setError('');

    try {
      await onShare(Array.from(selectedUserIds));
      console.log('Note sharing updated successfully', selectedUserIds);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update sharing');
    } finally {
      setIsSharing(false);
    }
  };

  const handleClose = () => {
    if (!isSharing) {
      onClose();
    }
  };

  if (!note) return null;

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title={`Share "${note.title}"`}
      wide={false}
    >
      <div className="space-y-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Share with workspace members (view only)
        </p>

        {/* Search Input */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400"
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search members..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
            disabled={isSharing}
          />
        </div>

        {/* Members List */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg max-h-64 overflow-y-auto">
          {filteredMembers.length === 0 ? (
            <div className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
              No members found
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredMembers.map((member) => (
                <label
                  key={member.id}
                  className="flex items-center gap-3 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedUserIds.has(member.id)}
                    onChange={() => toggleUser(member.id)}
                    disabled={isSharing}
                    className="w-4 h-4 text-blue-600 bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {member.name}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {member.email}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Currently Shared */}
        {note.shared_with.length > 0 && (
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            Currently shared with:{' '}
            {note.shared_with.map((user, index) => (
              <span key={user.id}>
                {user.name}
                {index < note.shared_with.length - 1 ? ', ' : ''}
              </span>
            ))}
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={handleClose}
            disabled={isSharing}
            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            Cancel
          </button>

          <button
            onClick={handleShare}
            disabled={isSharing}
            className="px-6 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
          >
            {isSharing ? (
              <>
                <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Updating...
              </>
            ) : (
              'Update Sharing'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
