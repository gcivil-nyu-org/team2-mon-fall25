import { useState } from 'react';
import { Modal } from '../modals/Modal';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onDiscard: () => Promise<void>;
  documentName?: string;
}

export function NewChatModal({
  isOpen,
  onClose,
  onSave,
  onDiscard,
  documentName,
}: NewChatModalProps) {
  const [isDiscarding, setIsDiscarding] = useState(false);

  const handleDiscard = async () => {
    setIsDiscarding(true);
    try {
      await onDiscard();
      onClose(); // Close modal after successful discard
    } catch (error) {
      console.error('Failed to discard conversation:', error);
    } finally {
      setIsDiscarding(false);
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Start a New Chat?">
      <div className="space-y-4">
        {/* Message */}
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          {documentName ? (
            <>
              You're currently working on <span className="font-medium text-zinc-900 dark:text-zinc-100">{documentName}</span>.
              <br />
              What would you like to do with this conversation?
            </>
          ) : (
            'What would you like to do with the current conversation?'
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          {/* Save & Continue */}
          <button
            onClick={() => {
              onSave();
              onClose();
            }}
            disabled={isDiscarding}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Save & Start New Chat
          </button>

          {/* Discard */}
          <button
            onClick={handleDiscard}
            disabled={isDiscarding}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isDiscarding ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Discarding...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Discard & Start New Chat
              </>
            )}
          </button>

          {/* Cancel */}
          <button
            onClick={onClose}
            disabled={isDiscarding}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
