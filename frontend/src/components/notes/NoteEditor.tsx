import { useState, useEffect, useRef, useCallback } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { ShareNoteModal } from './ShareNoteModal';
import { NotesApi } from './NotesApi';
import type { Note, User, CreateNoteData } from './types';
import { toast } from 'sonner';

interface NoteEditorProps {
  note: Note | null;
  isNew: boolean;
  onSave: (data: CreateNoteData) => Promise<void>;
  onDelete: (note: Note) => Promise<void>;
  onClose: () => void;
  workspaceMembers: User[];
}

export function NoteEditor({
  note,
  isNew,
  onSave,
  onDelete,
  onClose,
  workspaceMembers,
}: NoteEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [sharingNote, setSharingNote] = useState<Note | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isReadOnly = note?.is_shared || false;

  // Initialize fields when note changes
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setTags(note.tags);
      setHasUnsavedChanges(false);
      setLastSaved(new Date(note.updated_at));
    } else if (isNew) {
      setTitle('');
      setContent('');
      setTags([]);
      setHasUnsavedChanges(false);
      setLastSaved(null);
    }
  }, [note, isNew]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (hasUnsavedChanges && !isReadOnly && !isNew) {
      // Clear existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      // Set new timer for 30 seconds
      autoSaveTimerRef.current = setTimeout(() => {
        handleAutoSave();
      }, 30000);
    }

    // Cleanup on unmount
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [hasUnsavedChanges, isReadOnly, isNew, title, content, tags]);

  // Warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleAutoSave = useCallback(async () => {
    if (isSaving || !note || isReadOnly) return;

    setIsSaving(true);
    try {
      await NotesApi.updateNote(note.id, { title, content, tags });
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      toast.success('Note auto-saved');
    } catch (error) {
      console.error('Auto-save failed:', error);
      toast.error('Auto-save failed');
    } finally {
      setIsSaving(false);
    }
  }, [note, title, content, tags, isReadOnly, isSaving]);

  const handleSave = async () => {
    if (isSaving || isReadOnly) return;

    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({ title, content, tags });
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      toast.success(isNew ? 'Note created' : 'Note saved');
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleDelete = async () => {
    if (!note) return;
    setShowDeleteConfirm(false);
    await onDelete(note);
    onClose();
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      const newTags = [...tags, trimmedTag];
      setTags(newTags);
      setTagInput('');
      if (!isNew) {
        setHasUnsavedChanges(true);
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter((tag) => tag !== tagToRemove);
    setTags(newTags);
    if (!isNew) {
      setHasUnsavedChanges(true);
    }
  };

  const handleShareNote = async (userIds: string[]) => {
    if (!note) return;
    try {
      await NotesApi.shareNote(note.id, { user_ids: userIds });
      toast.success('Note shared successfully');
      setSharingNote(null);
    } catch (error) {
      console.error('Share failed:', error);
      toast.error('Failed to share note');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd/Ctrl + S to save
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      if (!isReadOnly && (isNew || hasUnsavedChanges)) {
        handleSave();
      }
    }
    // Escape to close
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  if (!note && !isNew) {
    return (
      <div className="flex-1 flex items-center justify-center rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-zinc-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            No note selected
          </h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Select a note from the list or create a new one
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden"
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {isReadOnly && (
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Read Only
            </span>
          )}
          {isSaving && (
            <span className="flex-shrink-0 text-sm text-zinc-500 dark:text-zinc-400">
              Saving...
            </span>
          )}
          {!isSaving && lastSaved && !hasUnsavedChanges && (
            <span className="flex-shrink-0 text-sm text-zinc-500 dark:text-zinc-400">
              Saved {lastSaved.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
          {hasUnsavedChanges && (
            <span className="flex-shrink-0 text-sm text-amber-600 dark:text-amber-400">
              Unsaved changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isReadOnly && note && (
            <>
              <button
                onClick={() => setSharingNote(note)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </>
          )}
          {!isReadOnly && (isNew || hasUnsavedChanges) && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              {isNew ? 'Create' : 'Save'}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!isNew) setHasUnsavedChanges(true);
            }}
            placeholder="Note title..."
            disabled={isReadOnly}
            className="w-full text-3xl font-bold bg-transparent border-none outline-none
                       text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                       disabled:cursor-not-allowed"
          />

          {/* Tags */}
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm
                             bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                >
                  {tag}
                  {!isReadOnly && (
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </span>
              ))}
            </div>

            {!isReadOnly && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add tag..."
                  className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700
                             bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                             placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleAddTag}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-zinc-100 dark:bg-zinc-800
                             text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700
                             transition-colors"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          {/* Markdown Editor */}
          <div data-color-mode="light" className="dark:hidden">
            <MDEditor
              value={content}
              onChange={(val) => {
                setContent(val || '');
                if (!isNew) setHasUnsavedChanges(true);
              }}
              preview="edit"
              height={600}
              textareaProps={{
                placeholder: 'Write your note in markdown...',
                disabled: isReadOnly,
              }}
              style={{
                borderRadius: '0.5rem',
              }}
            />
          </div>
          <div data-color-mode="dark" className="hidden dark:block">
            <MDEditor
              value={content}
              onChange={(val) => {
                setContent(val || '');
                if (!isNew) setHasUnsavedChanges(true);
              }}
              preview="edit"
              height={600}
              textareaProps={{
                placeholder: 'Write your note in markdown...',
                disabled: isReadOnly,
              }}
              style={{
                borderRadius: '0.5rem',
              }}
            />
          </div>

          {/* Metadata */}
          {note && (
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-sm text-zinc-500 dark:text-zinc-400 space-y-1">
              <div>Created by {note.created_by.name} on {new Date(note.created_at).toLocaleDateString()}</div>
              {note.last_modified_by && (
                <div>Last modified by {note.last_modified_by.name} on {new Date(note.updated_at).toLocaleDateString()}</div>
              )}
              {note.shared_with.length > 0 && (
                <div>
                  Shared with: {note.shared_with.map(u => u.name).join(', ')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {sharingNote && (
        <ShareNoteModal
          isOpen={true}
          onClose={() => setSharingNote(null)}
          onShare={handleShareNote}
          note={sharingNote}
          workspaceMembers={workspaceMembers}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="relative rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Delete Note
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                Are you sure you want to delete "{title}"? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
