import { useState, useEffect } from 'react';
import { Modal } from '../modals/Modal';
import { MarkdownRenderer } from '../shared/MarkdownRenderer';
import type { Message } from './types';

interface SaveToNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; content: string; tags: string[] }) => Promise<void>;
  message: Message | null;
  documentName?: string;
}

export function SaveToNotesModal({
  isOpen,
  onClose,
  onSave,
  message,
  documentName,
}: SaveToNotesModalProps) {
  const [title, setTitle] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (message && isOpen) {
      // Auto-fill title and tags based on message type
      const actionType = message.action_type;
      const defaultTitle = actionType
        ? `${actionType === 'summary' ? 'Summary' : 'Plan'}${documentName ? ` - ${documentName}` : ''}`
        : documentName || 'AI Actions Response';

      const defaultTag = actionType === 'summary' ? 'Summary' : actionType === 'plan' ? 'Plan' : 'AI Actions';

      setTitle(defaultTitle);
      setTagsInput(defaultTag);
    }
    setError('');
  }, [message, documentName, isOpen]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!message) {
      setError('No message to save');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const tags = tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      await onSave({
        title: title.trim(),
        content: message.content,
        tags,
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save to notes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      onClose();
    }
  };

  if (!message) return null;

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title="Save to Notes"
      wide={true}
    >
      <div className="space-y-4">
        {/* Title Input */}
        <div>
          <label htmlFor="note-title" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Note Title <span className="text-red-500">*</span>
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
            placeholder="Summary, Plan, AI Actions"
            className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500"
            disabled={isSaving}
          />
        </div>

        {/* Info */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            This content will be saved as a markdown note. You can view and edit it in the Notes section.
          </p>
        </div>

        {/* Preview */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Preview
          </label>
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 max-h-80 overflow-y-auto bg-white dark:bg-zinc-900">
            <MarkdownRenderer content={message.content} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving || !title.trim()}
            className="px-6 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
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
              <>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  />
                </svg>
                Save to Notes
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
