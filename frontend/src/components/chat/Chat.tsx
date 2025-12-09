import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { DocumentUploadZone } from './DocumentUploadZone';
import { ResultView } from './ResultView';
import { RecentConversationsSidebar } from './RecentConversationsSidebar';
import { SaveToNotesModal } from './SaveToNotesModal';
import { NewChatModal } from './NewChatModal';
import { ChatApi } from './ChatApi';
import { NotesApi } from '../notes/NotesApi';
import type { Conversation, Document, Message } from './types';

export function Chat() {
  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [currentResult, setCurrentResult] = useState<Message | null>(null);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modal state
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [messageToSave, setMessageToSave] = useState<Message | null>(null);
  const [newChatModalOpen, setNewChatModalOpen] = useState(false);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Listen for workspace changes and reload data
  useEffect(() => {
    // Handle cross-tab workspace changes via storage event
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'cd.workspace') {
        console.log('Workspace changed (cross-tab), reloading conversations...');
        loadConversations();
        // Clear active conversation since it belongs to old workspace
        if (activeConversation) {
          setActiveConversation(null);
          setCurrentResult(null);
          setCurrentDocument(null);
        }
      }
    };

    // Handle same-tab workspace changes via custom event
    const onWorkspaceChanged = () => {
      console.log('Workspace changed (same-tab), reloading conversations...');
      loadConversations();
      // Clear active conversation since it belongs to old workspace
      if (activeConversation) {
        setActiveConversation(null);
        setCurrentResult(null);
        setCurrentDocument(null);
      }
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('workspaceChanged', onWorkspaceChanged);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('workspaceChanged', onWorkspaceChanged);
    };
  }, [activeConversation]);

  // Load conversations
  const loadConversations = async () => {
    try {
      const data = await ChatApi.getConversations();
      setConversations(data);
    } catch (_err) {
      console.error('Failed to load conversations:', _err);
    }
  };

  // Load conversation (show the result)
  const loadConversation = async (id: string) => {
    setLoading(true);
    setError('');

    try {
      const data = await ChatApi.getConversation(id);
      setActiveConversation(data.conversation);
      setCurrentDocument(data.conversation.document);

      // Find the AI assistant's response (the result)
      const assistantMessage = data.messages.find((m) => m.role === 'assistant');
      if (assistantMessage) {
        setCurrentResult(assistantMessage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
      console.error('Failed to load conversation:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle document upload and generation
  const handleDocumentUpload = async (file: File, actionType: 'summary' | 'plan') => {
    setIsUploading(true);
    setIsGenerating(false);
    setError('');
    setCurrentResult(null);

    try {
      // Step 1: Upload document
      const uploadData = await ChatApi.uploadDocument(file);
      setCurrentDocument(uploadData.document);

      // Step 2: Generate AI analysis
      setIsUploading(false);
      setIsGenerating(true);
      setStreamingContent('');

      // Create conversation with AI analysis
      const conversation = await ChatApi.createConversation(uploadData.document.id.toString(), actionType);
      setActiveConversation(conversation);

      // Step 3: Stream the response for UI effect
      await new Promise<void>((resolve, reject) => {
        ChatApi.createStreamingConnection(
          conversation.id,
          (chunk) => {
            setStreamingContent((prev) => prev + chunk);
          },
          async () => {
            try {
              // Fetch the complete conversation to get the AI response
              const data = await ChatApi.getConversation(conversation.id);
              const assistantMessage = data.messages.find((m) => m.role === 'assistant');

              if (assistantMessage) {
                setCurrentResult(assistantMessage);
              }

              setIsGenerating(false);
              setStreamingContent('');
              await loadConversations();
              resolve();
            } catch (err) {
              console.error('Failed to load result:', err);
              setError('Failed to load result');
              setIsGenerating(false);
              reject(err);
            }
          },
          (error) => {
            console.error('Streaming error:', error);
            setError('Failed to generate result');
            setIsGenerating(false);
            reject(error);
          },
          actionType,
          ''
        );
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process document');
      console.error('Failed to process document:', err);
      setIsUploading(false);
      setIsGenerating(false);
    }
  };

  // Handle back to upload
  const handleBack = () => {
    setCurrentResult(null);
    setCurrentDocument(null);
    setActiveConversation(null);
  };

  // Handle save to notes
  const handleSaveToNotes = () => {
    if (currentResult) {
      setMessageToSave(currentResult);
      setSaveModalOpen(true);
    }
  };

  const handleSaveToNotesConfirm = async (data: { title: string; content: string; tags: string[] }) => {
    try {
      await NotesApi.createNote(data);

      // Mark conversation as saved to notes
      if (activeConversation && currentResult) {
        await ChatApi.markMessageAsSaved(activeConversation.id);
        setCurrentResult({ ...currentResult, saved_to_notes: true });
      }

      // Show success message
      toast.success('Saved to Notes! View it in the Notes section.');
    } catch (err) {
      toast.error('Failed to save to notes');
      throw err;
    }
  };

  // Handle new action
  const handleNew = () => {
    if (currentDocument || currentResult) {
      setNewChatModalOpen(true);
    }
  };

  // Handle save and new
  const handleSaveAndNew = () => {
    // Conversation is already auto-saved, just reset state
    setActiveConversation(null);
    setCurrentResult(null);
    setCurrentDocument(null);
  };

  // Handle discard and new
  const handleDiscardAndNew = async () => {
    // Delete the current conversation
    if (activeConversation) {
      await handleDeleteConversation(activeConversation.id);
    }
    // Reset state for new action
    setActiveConversation(null);
    setCurrentResult(null);
    setCurrentDocument(null);
  };

  // Handle delete conversation
  const handleDeleteConversation = async (id: string) => {
    try {
      await ChatApi.deleteConversation(id);
      await loadConversations();

      if (activeConversation?.id === id) {
        setActiveConversation(null);
        setCurrentResult(null);
        setCurrentDocument(null);
      }
    } catch {
      toast.error('Failed to delete conversation');
    }
  };

  // Show chat interface
  return (
    <>
      {/* Error banner */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="flex gap-6">
        {/* Main Content Card */}
        <div className="flex-1 flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          ) : isGenerating ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="max-w-2xl w-full space-y-6">
                <div className="text-center">
                  <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    Generating...
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    📄 {currentDocument?.name}
                  </p>
                </div>

                {streamingContent && (
                  <div className="p-6 bg-zinc-50 dark:bg-zinc-800 rounded-xl max-h-96 overflow-y-auto">
                    <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
                      {streamingContent}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : currentResult ? (
            <ResultView
              result={currentResult}
              onBack={handleBack}
              onNew={handleNew}
              onSaveToNotes={handleSaveToNotes}
              isSaved={currentResult.saved_to_notes || false}
            />
          ) : (
            <DocumentUploadZone
              onUpload={handleDocumentUpload}
              isUploading={isUploading}
            />
          )}
        </div>

        {/* Saved Conversations Sidebar */}
        <RecentConversationsSidebar
          conversations={conversations}
          activeConversationId={activeConversation?.id || null}
          onSelectConversation={loadConversation}
          onDeleteConversation={handleDeleteConversation}
        />
      </div>

      {/* Save to Notes Modal */}
      <SaveToNotesModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onSave={handleSaveToNotesConfirm}
        message={messageToSave}
        documentName={currentDocument?.name}
      />

      {/* New Action Modal */}
      <NewChatModal
        isOpen={newChatModalOpen}
        onClose={() => setNewChatModalOpen(false)}
        onSave={handleSaveAndNew}
        onDiscard={handleDiscardAndNew}
        documentName={currentDocument?.name}
      />
    </>
  );
}
