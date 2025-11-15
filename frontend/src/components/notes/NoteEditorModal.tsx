import { useState, useEffect } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { Modal } from '../modals/Modal';
import type { Note } from './types';

interface NoteEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; content: string; tags: string[] }) => Promise<void>;
  note?: Note | null;
}

export function NoteEditorModal({ isOpen, onClose, onSave, note }: NoteEditorModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setTagsInput(note.tags.join(', '));
    } else {
      setTitle('');
      setContent('');
      setTagsInput('');
    }
    setError('');
    setShowPreview(false);
  }, [note, isOpen]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const tags = tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      await onSave({ title: title.trim(), content, tags });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isSaving) {
      onClose();
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title={note ? 'Edit Note' : 'Create Note'}
      wide={true}
    >
      <div className="space-y-4" onKeyDown={handleKeyDown}>
        {/* Title Input */}
        <div>
          <label htmlFor="note-title" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="note-title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError('');
            }}
            placeholder="Enter note title..."
            className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
            disabled={isSaving}
            autoFocus
          />
          {error && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>}
        </div>

        {/* Tags Input */}
        <div>
          <label htmlFor="note-tags" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Tags (comma-separated)
          </label>
          <input
            id="note-tags"
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="work, project, ideas"
            className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
            disabled={isSaving}
          />
        </div>

        {/* Preview Toggle */}
        <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <button
            onClick={() => setShowPreview(false)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              !showPreview
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            disabled={isSaving}
          >
            Edit
          </button>
          <button
            onClick={() => setShowPreview(true)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              showPreview
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            disabled={isSaving}
          >
            Preview
          </button>
        </div>

        {/* Content Editor */}
        <div className="min-h-[400px] max-h-[500px]">
          {showPreview ? (
            <div
              data-color-mode="auto"
              className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 overflow-y-auto max-h-[500px] bg-white dark:bg-zinc-900"
            >
              <MDEditor.Markdown source={content} />
            </div>
          ) : (
            <div data-color-mode="auto">
              <MDEditor
                value={content}
                onChange={(value) => setContent(value || '')}
                height={400}
                preview="edit"
                hideToolbar={false}
                enableScroll={true}
                visibleDragbar={false}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>

          {note && note.shared_with && note.shared_with.length > 0 && (
            <div className="flex-1 text-sm text-zinc-500 dark:text-zinc-400">
              Shared with {note.shared_with.length} {note.shared_with.length === 1 ? 'person' : 'people'}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving || !title.trim()}
            className="px-6 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Saving...
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
