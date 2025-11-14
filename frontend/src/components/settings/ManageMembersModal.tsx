import { useState, useEffect } from 'react';
import { Modal } from '../modals/Modal';
import {
  fetchWorkspaceMembers,
  fetchAllUsers,
  addWorkspaceMembers,
  removeWorkspaceMember,
  type WorkspaceMemberExtended,
  type User,
} from '../../lib/api';

interface ManageMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  currentUserId: number;
  isOwner: boolean;
}

export function ManageMembersModal({
  isOpen,
  onClose,
  workspaceId,
  currentUserId,
  isOwner,
}: ManageMembersModalProps) {
  const [members, setMembers] = useState<WorkspaceMemberExtended[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadData();
      setSearchQuery('');
      setSelectedUserIds(new Set());
      setError('');
    }
  }, [isOpen, workspaceId]);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const [membersData, usersData] = await Promise.all([
        fetchWorkspaceMembers(workspaceId),
        fetchAllUsers(),
      ]);

      setMembers(membersData);
      setAvailableUsers(usersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Filter available users (exclude current members)
  const filteredAvailableUsers = availableUsers.filter((user) => {
    const isMember = members.some((m) => m.user_id === user.user_id);
    if (isMember) return false;

    const query = searchQuery.toLowerCase();
    return (
      user.full_name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query)
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

  const handleAddMembers = async () => {
    if (selectedUserIds.size === 0) return;

    setSaving(true);
    setError('');

    try {
      await addWorkspaceMembers(workspaceId, Array.from(selectedUserIds));
      await loadData();
      setSelectedUserIds(new Set());
      setSearchQuery('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add members');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!isOwner) return;

    const member = members.find((m) => m.user_id === userId);
    if (!member) return;

    if (member.role === 'owner') {
      setError('Cannot remove the workspace owner');
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to remove ${member.full_name} from the workspace?`
      )
    ) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      await removeWorkspaceMember(workspaceId, userId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      onClose();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Modal open={isOpen} onClose={handleClose} title="Manage Members" wide={true}>
      <div className="space-y-6">
        {/* Current Members Section */}
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            Current Members ({members.length})
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <svg
                className="animate-spin h-6 w-6 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
              >
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
            </div>
          ) : (
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg divide-y divide-zinc-200 dark:divide-zinc-800">
              {members.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center gap-3 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {member.profile_picture ? (
                      <img
                        src={member.profile_picture}
                        alt={member.full_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center font-semibold text-sm">
                        {getInitials(member.full_name)}
                      </div>
                    )}
                  </div>

                  {/* Member Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {member.full_name}
                        {member.id === currentUserId && (
                          <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                            (you)
                          </span>
                        )}
                      </div>
                      {member.role === 'owner' && (
                        <span className="flex-shrink-0 text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-medium">
                          Owner
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {member.email}
                    </div>
                  </div>

                  {/* Remove Button */}
                  {isOwner && member.role !== 'owner' && (
                    <button
                      onClick={() => handleRemoveMember(member.user_id)}
                      disabled={saving}
                      className="flex-shrink-0 p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Remove member"
                      aria-label={`Remove ${member.full_name}`}
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
              ))}
            </div>
          )}
        </div>

        {/* Add Members Section */}
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            Add Members
          </h3>

          {/* Search Input */}
          <div className="relative mb-3">
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
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
              disabled={saving || loading}
            />
          </div>

          {/* Available Users List */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                Loading...
              </div>
            ) : filteredAvailableUsers.length === 0 ? (
              <div className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                {searchQuery
                  ? 'No users found'
                  : 'All users are already members of this workspace'}
              </div>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredAvailableUsers.map((user) => (
                  <label
                    key={user.user_id}
                    className="flex items-center gap-3 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUserIds.has(user.user_id)}
                      onChange={() => toggleUser(user.user_id)}
                      disabled={saving}
                      className="w-4 h-4 text-blue-600 bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {user.full_name}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        {user.email}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Add Members Button */}
          {selectedUserIds.size > 0 && (
            <button
              onClick={handleAddMembers}
              disabled={saving}
              className="mt-3 w-full px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
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
                  Adding...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add {selectedUserIds.size} {selectedUserIds.size === 1 ? 'Member' : 'Members'}
                </>
              )}
            </button>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
            {error}
          </p>
        )}

        {/* Close Button */}
        <div className="flex items-center justify-end pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={handleClose}
            disabled={saving}
            className="px-6 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
