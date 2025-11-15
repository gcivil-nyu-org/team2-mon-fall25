import { authenticatedFetch } from '../../lib/api';
import type { Conversation, Document, Message, SendMessageData } from './types';

const CHAT_BASE_URL = '/api/chat';
const USE_MOCK_DATA = true; // Set to false when backend is ready

// LocalStorage keys
const STORAGE_KEYS = {
  CONVERSATIONS: 'collabdesk-chat-conversations',
  MESSAGES: 'collabdesk-chat-messages',
  DOCUMENTS: 'collabdesk-chat-documents',
};

// Helper functions
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getConversationsFromStorage(): Conversation[] {
  const stored = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
  return stored ? JSON.parse(stored) : [];
}

function saveConversationsToStorage(conversations: Conversation[]): void {
  localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
}

function getMessagesFromStorage(): Message[] {
  const stored = localStorage.getItem(STORAGE_KEYS.MESSAGES);
  return stored ? JSON.parse(stored) : [];
}

function saveMessagesToStorage(messages: Message[]): void {
  localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
}

function getDocumentsFromStorage(): Document[] {
  const stored = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
  return stored ? JSON.parse(stored) : [];
}

function saveDocumentsToStorage(documents: Document[]): void {
  localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(documents));
}

// Initialize sample data on first load
function initializeSampleData(): void {
  const conversations = getConversationsFromStorage();
  if (conversations.length > 0) return; // Already initialized

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Sample document 1
  const doc1: Document = {
    id: generateId('doc'),
    name: 'Getting_Started.pdf',
    file_type: 'application/pdf',
    size: 245760,
    uploaded_at: yesterday.toISOString(),
    download_url: '#',
  };

  // Sample document 2
  const doc2: Document = {
    id: generateId('doc'),
    name: 'Project_Plan.docx',
    file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 128000,
    uploaded_at: now.toISOString(),
    download_url: '#',
  };

  // Sample conversation 1
  const conv1: Conversation = {
    id: generateId('conv'),
    document: doc1,
    created_at: yesterday.toISOString(),
    updated_at: yesterday.toISOString(),
    message_count: 4,
    title: 'Getting_Started.pdf',
  };

  // Sample conversation 2
  const conv2: Conversation = {
    id: generateId('conv'),
    document: doc2,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    message_count: 2,
    title: 'Project_Plan.docx',
  };

  // Sample messages for conversation 1
  const messages1: Message[] = [
    {
      id: generateId('msg'),
      conversation_id: conv1.id,
      role: 'user',
      content: 'Can you summarize this document for me?',
      created_at: yesterday.toISOString(),
      action_type: 'summary',
      saved_to_notes: false,
    },
    {
      id: generateId('msg'),
      conversation_id: conv1.id,
      role: 'assistant',
      content: `# Document Summary

This getting started guide covers the essential steps for setting up and using the CollabDesk platform:

## Key Points
- **Setup Process**: Installation and configuration requirements
- **Core Features**: Overview of workspace, tasks, and collaboration tools
- **Best Practices**: Recommended workflows for team productivity
- **Getting Help**: Support resources and community channels

The document emphasizes a structured onboarding approach to ensure teams can quickly become productive.`,
      created_at: new Date(yesterday.getTime() + 1000).toISOString(),
      action_type: 'summary',
      saved_to_notes: true,
    },
    {
      id: generateId('msg'),
      conversation_id: conv1.id,
      role: 'user',
      content: 'What are the system requirements?',
      created_at: new Date(yesterday.getTime() + 60000).toISOString(),
      action_type: null,
      saved_to_notes: false,
    },
    {
      id: generateId('msg'),
      conversation_id: conv1.id,
      role: 'assistant',
      content: `Based on the getting started guide, here are the system requirements:

**Minimum Requirements:**
- Modern web browser (Chrome, Firefox, Safari, or Edge)
- Stable internet connection (minimum 5 Mbps recommended)
- JavaScript enabled

**Recommended:**
- Latest browser version for optimal performance
- 10+ Mbps connection for video features
- Desktop or laptop for full feature access (mobile supported)

The platform is web-based, so no installation is required!`,
      created_at: new Date(yesterday.getTime() + 61000).toISOString(),
      action_type: null,
      saved_to_notes: false,
    },
  ];

  // Sample messages for conversation 2
  const messages2: Message[] = [
    {
      id: generateId('msg'),
      conversation_id: conv2.id,
      role: 'user',
      content: 'Create an action plan from this project document',
      created_at: now.toISOString(),
      action_type: 'plan',
      saved_to_notes: false,
    },
    {
      id: generateId('msg'),
      conversation_id: conv2.id,
      role: 'assistant',
      content: `# Project Action Plan

## Phase 1: Planning (Weeks 1-2)
- [ ] Finalize project requirements and scope
- [ ] Assemble core team members
- [ ] Set up project workspace and tools
- [ ] Define success metrics and KPIs

## Phase 2: Design (Weeks 3-4)
- [ ] Create initial design mockups
- [ ] Review with stakeholders
- [ ] Iterate based on feedback
- [ ] Finalize technical architecture

## Phase 3: Development (Weeks 5-10)
- [ ] Sprint 1: Core functionality
- [ ] Sprint 2: User interface
- [ ] Sprint 3: Integration and testing
- [ ] Code reviews and quality assurance

## Phase 4: Launch (Weeks 11-12)
- [ ] Beta testing with selected users
- [ ] Final bug fixes and polish
- [ ] Prepare launch materials
- [ ] Deploy to production

## Next Steps
1. Schedule kickoff meeting
2. Assign task owners
3. Set up tracking system`,
      created_at: new Date(now.getTime() + 2000).toISOString(),
      action_type: 'plan',
      saved_to_notes: false,
    },
  ];

  // Save all sample data
  saveDocumentsToStorage([doc1, doc2]);
  saveConversationsToStorage([conv1, conv2]);
  saveMessagesToStorage([...messages1, ...messages2]);
}

// Generate contextual AI responses based on action type and content
function generateMockAIResponse(userMessage: string, actionType?: 'summary' | 'plan' | null): string {
  if (actionType === 'summary') {
    return `# Document Summary

Based on my analysis of the document, here are the key findings:

## Main Points
- The document covers important concepts and procedures
- Several actionable items are outlined
- Critical deadlines and milestones are mentioned

## Key Takeaways
1. **Primary Focus**: Understanding the core objectives
2. **Implementation**: Step-by-step approach recommended
3. **Timeline**: Estimated 2-4 weeks for completion

This summary captures the essential information you'll need to reference.`;
  }

  if (actionType === 'plan') {
    return `# Action Plan

## Immediate Actions (This Week)
- [ ] Review the document thoroughly
- [ ] Identify key stakeholders
- [ ] Schedule initial planning meeting

## Short-term Goals (Next 2 Weeks)
- [ ] Break down major objectives into tasks
- [ ] Assign responsibilities to team members
- [ ] Set up tracking and reporting system

## Long-term Strategy (Next Month)
- [ ] Execute on planned activities
- [ ] Monitor progress and adjust as needed
- [ ] Prepare for next phase

## Success Metrics
- Clear ownership of all tasks
- Regular progress updates
- On-time completion of milestones

Let me know if you'd like me to elaborate on any section!`;
  }

  // Regular question - provide helpful response
  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes('what') || lowerMessage.includes('explain')) {
    return `Great question! Based on the document, I can provide some insights:

The document discusses several important aspects that relate to your question. The key information includes detailed explanations of the processes, methodologies, and best practices outlined in the content.

Would you like me to focus on a specific section or provide more detailed information about any particular aspect?`;
  }

  if (lowerMessage.includes('how')) {
    return `Here's how you can approach this based on the document:

**Step 1**: Start by reviewing the relevant sections that address your question.

**Step 2**: Follow the recommended procedures and guidelines outlined.

**Step 3**: Apply the concepts to your specific situation, adapting as needed.

The document provides a comprehensive framework that should help you accomplish what you're asking about. Let me know if you need clarification on any specific step!`;
  }

  // Default response
  return `I understand your question about the document. Based on the content, I can help you explore this topic further.

The document contains relevant information that addresses your inquiry. Would you like me to:
- Provide more specific details about a particular section
- Explain any concepts in simpler terms
- Help you apply this information to your situation

Feel free to ask follow-up questions for more detailed assistance!`;
}

export class ChatApi {
  /**
   * Upload a document to start a new conversation
   */
  static async uploadDocument(file: File): Promise<{ conversation: Conversation; document: Document }> {
    if (USE_MOCK_DATA) {
      // Initialize sample data on first use
      initializeSampleData();

      // Create document metadata
      const document: Document = {
        id: generateId('doc'),
        name: file.name,
        file_type: file.type,
        size: file.size,
        uploaded_at: new Date().toISOString(),
        download_url: '#',
      };

      // Create conversation
      const conversation: Conversation = {
        id: generateId('conv'),
        document,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        message_count: 0,
        title: file.name,
      };

      // Save to storage
      const documents = getDocumentsFromStorage();
      documents.push(document);
      saveDocumentsToStorage(documents);

      const conversations = getConversationsFromStorage();
      conversations.push(conversation);
      saveConversationsToStorage(conversations);

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      return { conversation, document };
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await authenticatedFetch(`${CHAT_BASE_URL}/documents/upload/`, {
      method: 'POST',
      body: formData,
    });

    return response.json();
  }

  /**
   * Get all conversations for the current user
   */
  static async getConversations(): Promise<Conversation[]> {
    if (USE_MOCK_DATA) {
      // Initialize sample data on first use
      initializeSampleData();

      const conversations = getConversationsFromStorage();
      // Sort by updated_at descending (most recent first)
      return conversations.sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    }

    try {
      const response = await authenticatedFetch(`${CHAT_BASE_URL}/conversations/`);
      if (!response.ok) {
        throw new Error('Backend API not available');
      }
      return response.json();
    } catch (error) {
      console.warn('Chat API not available, returning empty array');
      return [];
    }
  }

  /**
   * Get a specific conversation with all messages
   */
  static async getConversation(id: string): Promise<{ conversation: Conversation; messages: Message[] }> {
    if (USE_MOCK_DATA) {
      const conversations = getConversationsFromStorage();
      const conversation = conversations.find((c) => c.id === id);

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const allMessages = getMessagesFromStorage();
      const messages = allMessages.filter((m) => m.conversation_id === id);

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 200));

      return { conversation, messages };
    }

    const response = await authenticatedFetch(`${CHAT_BASE_URL}/conversations/${id}/`);
    return response.json();
  }

  /**
   * Create a new conversation (without document - for existing document)
   */
  static async createConversation(documentId: string): Promise<Conversation> {
    if (USE_MOCK_DATA) {
      const documents = getDocumentsFromStorage();
      const document = documents.find((d) => d.id === documentId);

      if (!document) {
        throw new Error('Document not found');
      }

      const conversation: Conversation = {
        id: generateId('conv'),
        document,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        message_count: 0,
        title: document.name,
      };

      const conversations = getConversationsFromStorage();
      conversations.push(conversation);
      saveConversationsToStorage(conversations);

      return conversation;
    }

    const response = await authenticatedFetch(`${CHAT_BASE_URL}/conversations/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ document_id: documentId }),
    });
    return response.json();
  }

  /**
   * Delete a conversation
   */
  static async deleteConversation(id: string): Promise<void> {
    if (USE_MOCK_DATA) {
      // Remove conversation
      const conversations = getConversationsFromStorage();
      const filtered = conversations.filter((c) => c.id !== id);
      saveConversationsToStorage(filtered);

      // Remove associated messages
      const messages = getMessagesFromStorage();
      const filteredMessages = messages.filter((m) => m.conversation_id !== id);
      saveMessagesToStorage(filteredMessages);

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 200));
      return;
    }

    await authenticatedFetch(`${CHAT_BASE_URL}/conversations/${id}/`, {
      method: 'DELETE',
    });
  }

  /**
   * Send a message in a conversation
   */
  static async sendMessage(conversationId: string, data: SendMessageData): Promise<Message> {
    if (USE_MOCK_DATA) {
      // Create user message
      const userMessage: Message = {
        id: generateId('msg'),
        conversation_id: conversationId,
        role: 'user',
        content: data.content,
        created_at: new Date().toISOString(),
        action_type: data.action_type || null,
        saved_to_notes: false,
      };

      // Save user message
      const messages = getMessagesFromStorage();
      messages.push(userMessage);
      saveMessagesToStorage(messages);

      // Update conversation
      const conversations = getConversationsFromStorage();
      const convIndex = conversations.findIndex((c) => c.id === conversationId);
      if (convIndex !== -1) {
        conversations[convIndex].message_count += 1;
        conversations[convIndex].updated_at = new Date().toISOString();
        saveConversationsToStorage(conversations);
      }

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 300));

      return userMessage;
    }

    const response = await authenticatedFetch(
      `${CHAT_BASE_URL}/conversations/${conversationId}/message/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );
    return response.json();
  }

  /**
   * Stream a response from the AI (using EventSource for SSE)
   * Enhanced mock implementation with contextual responses
   */
  static createStreamingConnection(
    conversationId: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void,
    actionType?: 'summary' | 'plan' | null,
    userMessage?: string
  ): { close: () => void } {
    if (USE_MOCK_DATA) {
      let closed = false;

      const mockStream = async () => {
        // Get the last user message to generate contextual response
        const messages = getMessagesFromStorage();
        const conversationMessages = messages.filter((m) => m.conversation_id === conversationId);
        const lastUserMessage = conversationMessages
          .filter((m) => m.role === 'user')
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

        // Generate contextual response
        const messageContent = userMessage || lastUserMessage?.content || 'Tell me about this document';
        const response = generateMockAIResponse(messageContent, actionType);

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

        // Save AI response as a message
        if (!closed && USE_MOCK_DATA) {
          const aiMessage: Message = {
            id: generateId('msg'),
            conversation_id: conversationId,
            role: 'assistant',
            content: response.trim(),
            created_at: new Date().toISOString(),
            action_type: actionType || null,
            saved_to_notes: false,
          };

          const allMessages = getMessagesFromStorage();
          allMessages.push(aiMessage);
          saveMessagesToStorage(allMessages);

          // Update conversation
          const conversations = getConversationsFromStorage();
          const convIndex = conversations.findIndex((c) => c.id === conversationId);
          if (convIndex !== -1) {
            conversations[convIndex].message_count += 1;
            conversations[convIndex].updated_at = new Date().toISOString();
            saveConversationsToStorage(conversations);
          }
        }

        if (!closed) {
          onComplete();
        }
      };

      mockStream().catch(onError);

      return {
        close: () => {
          closed = true;
        },
      };
    }

    // Production implementation would use EventSource or WebSocket
    // For now, keeping the original mock as fallback
    let closed = false;
    const mockStream = async () => {
      const chunks = [
        "Here's ",
        "a summary ",
        "of your ",
        "document:\n\n",
        "This document ",
        "discusses...",
      ];

      for (const chunk of chunks) {
        if (closed) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
        onChunk(chunk);
      }

      if (!closed) {
        onComplete();
      }
    };

    mockStream().catch(onError);

    return {
      close: () => {
        closed = true;
      },
    };
  }

  /**
   * Mark a message as saved to notes
   */
  static async markMessageAsSaved(messageId: string): Promise<void> {
    if (USE_MOCK_DATA) {
      const messages = getMessagesFromStorage();
      const messageIndex = messages.findIndex((m) => m.id === messageId);

      if (messageIndex !== -1) {
        messages[messageIndex].saved_to_notes = true;
        saveMessagesToStorage(messages);
      }

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 200));
      return;
    }

    await authenticatedFetch(`${CHAT_BASE_URL}/messages/${messageId}/mark-saved/`, {
      method: 'POST',
    });
  }
}
