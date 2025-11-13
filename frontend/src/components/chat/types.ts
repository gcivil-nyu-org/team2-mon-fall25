export interface Document {
  id: string;
  name: string;
  file_type: string;
  size: number;
  uploaded_at: string;
  preview_url?: string;
  download_url: string;
}

export interface Conversation {
  id: string;
  document: Document;
  created_at: string;
  updated_at: string;
  message_count: number;
  title: string; // Auto-generated from document name
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string; // Markdown for assistant
  created_at: string;
  action_type?: 'summary' | 'plan' | null; // Set for actionable messages
  saved_to_notes?: boolean;
}

export interface UploadDocumentData {
  file: File;
}

export interface SendMessageData {
  content: string;
  action_type?: 'summary' | 'plan' | null;
}
