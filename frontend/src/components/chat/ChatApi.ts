import { authenticatedFetch, API_BASE_URL } from '../../lib/api';
import type { Conversation, Document, Message, SendMessageData } from './types';

const CHAT_BASE_URL = `${API_BASE_URL}/api/chat`;

export class ChatApi {
  /**
   * Upload a document to start a new conversation
   */
  static async uploadDocument(file: File): Promise<{ conversation: Conversation; document: Document }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await authenticatedFetch(`${CHAT_BASE_URL}/documents/upload/`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload document');
    }

    const document = await response.json();

    // Return document as both conversation and document for compatibility
    // Frontend expects a conversation object, but backend returns just document
    return {
      document,
      conversation: {
        id: document.id.toString(),
        document,
        created_at: document.uploaded_at,
        updated_at: document.uploaded_at,
        message_count: 0,
        title: document.file_name,
      }
    };
  }

  /**
   * Get all conversations for the current user
   */
  static async getConversations(): Promise<Conversation[]> {
    try {
      const response = await authenticatedFetch(`${CHAT_BASE_URL}/conversations/`);

      if (!response.ok) {
        console.warn('Failed to fetch conversations');
        return [];
      }

      const data = await response.json();

      // Transform backend response to frontend format
      return data.map((conv: { id: number; document_name: string; action_type: string; title: string; created_at: string; saved_to_notes: boolean }) => ({
        id: conv.id.toString(),
        document: {
          id: conv.id.toString(),
          name: conv.document_name,
          file_type: 'application/pdf', // Backend doesn't return this
          size: 0, // Backend doesn't return this
          uploaded_at: conv.created_at,
          download_url: '#',
        },
        created_at: conv.created_at,
        updated_at: conv.created_at,
        message_count: 1, // Each conversation has one AI response
        title: conv.title,
      }));
    } catch (error) {
      console.warn('Chat API not available, returning empty array', error);
      return [];
    }
  }

  /**
   * Get a specific conversation with all messages
   */
  static async getConversation(id: string): Promise<{ conversation: Conversation; messages: Message[] }> {
    const response = await authenticatedFetch(`${CHAT_BASE_URL}/conversations/${id}/`);

    if (!response.ok) {
      throw new Error('Conversation not found');
    }

    const data = await response.json();

    // Transform backend response to frontend format
    const conversation: Conversation = {
      id: data.id.toString(),
      document: {
        id: data.document.id.toString(),
        name: data.document.file_name,
        file_type: 'application/pdf',
        size: data.document.file_size,
        uploaded_at: data.document.uploaded_at,
        download_url: '#',
      },
      created_at: data.created_at,
      updated_at: data.created_at,
      message_count: 1,
      title: data.title,
    };

    // Create message from AI response
    const messages: Message[] = [
      {
        id: data.id.toString(),
        conversation_id: data.id.toString(),
        role: 'assistant',
        content: data.ai_response,
        created_at: data.created_at,
        action_type: data.action_type,
        saved_to_notes: data.saved_to_notes,
      }
    ];

    return { conversation, messages };
  }

  /**
   * Create a new conversation with AI analysis (summary or plan)
   */
  static async createConversation(documentId: string, actionType: 'summary' | 'plan'): Promise<Conversation> {
    const response = await authenticatedFetch(`${CHAT_BASE_URL}/conversations/create/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_id: parseInt(documentId),
        action_type: actionType
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create conversation');
    }

    const data = await response.json();

    return {
      id: data.id.toString(),
      document: {
        id: data.document.id.toString(),
        name: data.document.file_name,
        file_type: 'application/pdf',
        size: data.document.file_size,
        uploaded_at: data.document.uploaded_at,
        download_url: '#',
      },
      created_at: data.created_at,
      updated_at: data.created_at,
      message_count: 1,
      title: data.title,
    };
  }

  /**
   * Delete a conversation
   */
  static async deleteConversation(id: string): Promise<void> {
    const response = await authenticatedFetch(`${CHAT_BASE_URL}/conversations/${id}/delete/`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete conversation');
    }
  }

  /**
   * Send a message in a conversation
   * Note: Backend doesn't support multi-message conversations yet
   * This is a placeholder for future use
   */
  static async sendMessage(_conversationId: string, _data: SendMessageData): Promise<Message> {
    // For now, we don't support sending additional messages
    // as backend only stores one AI response per conversation
    throw new Error('Sending additional messages not supported yet');
  }

  /**
   * Stream a response from the AI
   * Note: Backend generates response synchronously, so this simulates streaming
   * by chunking the pre-generated response
   */
  static createStreamingConnection(
    conversationId: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void,
    _actionType?: 'summary' | 'plan' | null,
    _userMessage?: string
  ): { close: () => void } {
    let closed = false;

    const simulateStream = async () => {
      try {
        // Fetch the conversation to get the AI response
        const { messages } = await this.getConversation(conversationId);

        if (messages.length === 0 || closed) {
          onComplete();
          return;
        }

        const aiMessage = messages[0];
        const response = aiMessage.content;

        // Split response into words for streaming effect
        const words = response.split(' ');
        const chunks: string[] = [];

        // Create natural chunks (2-4 words per chunk)
        for (let i = 0; i < words.length; i += 3) {
          const chunk = words.slice(i, i + 3).join(' ') + ' ';
          chunks.push(chunk);
        }

        // Stream chunks with realistic timing
        for (const chunk of chunks) {
          if (closed) break;
          await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 50));
          onChunk(chunk);
        }

        if (!closed) {
          onComplete();
        }
      } catch (error) {
        if (!closed) {
          onError(error instanceof Error ? error : new Error('Streaming failed'));
        }
      }
    };

    simulateStream();

    return {
      close: () => {
        closed = true;
      },
    };
  }

  /**
   * Mark a message as saved to notes
   */
  static async markMessageAsSaved(conversationId: string): Promise<void> {
    const response = await authenticatedFetch(
      `${CHAT_BASE_URL}/conversations/${conversationId}/save-notes/`,
      {
        method: 'POST',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to save to notes');
    }
  }
}
