import { useState, useEffect } from 'react';
import { ChatWindow } from './ChatWindow';
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
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

  // Load conversations
  const loadConversations = async () => {
    try {
      const data = await ChatApi.getConversations();
      setConversations(data);
    } catch (_err) {
      console.error('Failed to load conversations:', _err);
    }
  };

  // Load conversation messages
  const loadConversation = async (id: string) => {
    setLoading(true);
    setError('');

    try {
      const data = await ChatApi.getConversation(id);
      setActiveConversation(data.conversation);
      setMessages(data.messages);
      setCurrentDocument(data.conversation.document);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
      console.error('Failed to load conversation:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle document upload
  const handleDocumentUpload = async (file: File, actionType: 'summary' | 'plan') => {
    setIsUploading(true);
    setError('');

    try {
      const data = await ChatApi.uploadDocument(file);
      setCurrentDocument(data.document);
      setActiveConversation(data.conversation);
      setMessages([]);
      await loadConversations();

      // Automatically send the action message
      setTimeout(() => {
        handleSendMessage('', actionType);
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
      console.error('Failed to upload document:', err);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle send message
  const handleSendMessage = async (content: string, actionType?: 'summary' | 'plan') => {
    if (!activeConversation) return;

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: activeConversation.id,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
      action_type: actionType,
    };

    // Add user message to state immediately
    setMessages((prev) => [...prev, userMessage]);

    // Start streaming AI response
    setIsStreaming(true);
    setStreamingContent('');

    try {
      // In a real implementation, this would use the streaming API
      // For now, we'll simulate streaming with the mock implementation
      const stream = ChatApi.createStreamingConnection(
        activeConversation.id,
        (chunk) => {
          setStreamingContent((prev) => prev + chunk);
        },
        async () => {
          // Streaming complete - save the message
          try {
            const savedMessage = await ChatApi.sendMessage(activeConversation.id, {
              content,
              action_type: actionType,
            });

            // Replace user message with saved one and add AI response
            setMessages((prev) => {
              const filtered = prev.filter((m) => m.id !== userMessage.id);
              return [
                ...filtered,
                { ...userMessage, id: savedMessage.id },
                {
                  id: `ai-${savedMessage.id}`,
                  conversation_id: activeConversation.id,
                  role: 'assistant',
                  content: streamingContent,
                  created_at: new Date().toISOString(),
                  action_type: actionType,
                },
              ];
            });

            setIsStreaming(false);
            setStreamingContent('');
            await loadConversations();
          } catch (err) {
            console.error('Failed to save message:', err);
            setError('Failed to save message');
            setIsStreaming(false);
          }
        },
        (error) => {
          console.error('Streaming error:', error);
          setError('Failed to get AI response');
          setIsStreaming(false);
        },
        actionType,
        content
      );

      // Store the stream reference if needed for cancellation
      return () => stream.close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setIsStreaming(false);
    }
  };

  // Handle save to notes
  const handleSaveToNotes = (message: Message) => {
    setMessageToSave(message);
    setSaveModalOpen(true);
  };

  const handleSaveToNotesConfirm = async (data: { title: string; content: string; tags: string[] }) => {
    try {
      await NotesApi.createNote(data);

      // Mark message as saved
      if (messageToSave) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageToSave.id ? { ...m, saved_to_notes: true } : m
          )
        );
        await ChatApi.markMessageAsSaved(messageToSave.id);
      }

      // Show success message (you could add a toast here)
      alert('Saved to Notes! View it in the Notes section.');
    } catch (err) {
      alert('Failed to save to notes');
      throw err;
    }
  };

  // Handle new chat
  const handleNewChat = () => {
    if (currentDocument || messages.length > 0) {
      setNewChatModalOpen(true);
    }
  };

  // Handle save and new chat
  const handleSaveAndNewChat = () => {
    // Conversation is already auto-saved, just reset state
    setActiveConversation(null);
    setMessages([]);
    setCurrentDocument(null);
  };

  // Handle discard and new chat
  const handleDiscardAndNewChat = async () => {
    // Delete the current conversation
    if (activeConversation) {
      await handleDeleteConversation(activeConversation.id);
    }
    // Reset state for new chat
    setActiveConversation(null);
    setMessages([]);
    setCurrentDocument(null);
  };

  // Handle delete conversation
  const handleDeleteConversation = async (id: string) => {
    try {
      await ChatApi.deleteConversation(id);
      await loadConversations();

      if (activeConversation?.id === id) {
        setActiveConversation(null);
        setMessages([]);
        setCurrentDocument(null);
      }
    } catch {
      alert('Failed to delete conversation');
    }
  };

  // Show chat interface
  return (
    <div className="flex-1 flex flex-col gap-4">
      {/* Error banner */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="flex gap-6 min-h-[700px]">
        {/* Main Chat Card */}
        <div className="flex-1 flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden min-h-[700px]">
          {currentDocument && (
            <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                📄 {currentDocument.name}
              </p>
              <button
                onClick={handleNewChat}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Chat
              </button>
            </div>
          )}

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
          ) : (
            <ChatWindow
              messages={messages}
              isStreaming={isStreaming}
              streamingContent={streamingContent}
              onSaveToNotes={handleSaveToNotes}
              currentDocument={currentDocument}
              onUpload={handleDocumentUpload}
              isUploading={isUploading}
            />
          )}
        </div>

        {/* Recent Conversations Sidebar */}
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

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={newChatModalOpen}
        onClose={() => setNewChatModalOpen(false)}
        onSave={handleSaveAndNewChat}
        onDiscard={handleDiscardAndNewChat}
        documentName={currentDocument?.name}
      />
    </div>
  );
}
