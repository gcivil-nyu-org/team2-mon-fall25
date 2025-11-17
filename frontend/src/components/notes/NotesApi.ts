import { authenticatedFetch } from '../../lib/api';
import type { Note, CreateNoteData, UpdateNoteData, ShareNoteData, User } from './types';

const NOTES_BASE_URL = '/api/notes';
const USE_MOCK_DATA = true; // Set to false when backend is ready

// Mock current user
const mockCurrentUser: User = {
  id: 'current-user',
  name: 'You',
  email: 'you@example.com',
};

// Mock workspace members for sharing
const mockWorkspaceMembers: User[] = [
  { id: 'user-1', name: 'John Doe', email: 'john@example.com' },
  { id: 'user-2', name: 'Jane Smith', email: 'jane@example.com' },
  { id: 'user-3', name: 'Bob Wilson', email: 'bob@example.com' },
];

// LocalStorage helpers
const STORAGE_KEY = 'collabdesk-notes';

function getNotesFromStorage(): Note[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveNotesToStorage(notes: Note[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function generateId(): string {
  return `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export class NotesApi {
  /**
   * Fetch all notes created by the current user
   */
  static async getMyNotes(): Promise<Note[]> {
    if (USE_MOCK_DATA) {
      const allNotes = getNotesFromStorage();
      return allNotes.filter(note => note.created_by.id === mockCurrentUser.id && !note.is_shared);
    }

    try {
      const response = await authenticatedFetch(`${NOTES_BASE_URL}/`);
      if (!response.ok) {
        throw new Error('Backend API not available');
      }
      return response.json();
    } catch (error) {
      console.warn('Notes API not available, returning empty array', error);
      return [];
    }
  }

  /**
   * Fetch all notes shared with the current user
   */
  static async getSharedNotes(): Promise<Note[]> {
    if (USE_MOCK_DATA) {
      const allNotes = getNotesFromStorage();
      // Return notes where current user is in the shared_with list
      return allNotes.filter(note =>
        note.shared_with.some(user => user.id === mockCurrentUser.id)
      ).map(note => ({ ...note, is_shared: true }));
    }

    try {
      const response = await authenticatedFetch(`${NOTES_BASE_URL}/shared/`);
      if (!response.ok) {
        throw new Error('Backend API not available');
      }
      return response.json();
    } catch (error) {
      console.warn('Notes API not available, returning empty array',error);
      return [];
    }
  }

  /**
   * Get a single note by ID
   */
  static async getNote(id: string): Promise<Note> {
    if (USE_MOCK_DATA) {
      const allNotes = getNotesFromStorage();
      const note = allNotes.find(n => n.id === id);
      if (!note) throw new Error('Note not found');
      return note;
    }

    const response = await authenticatedFetch(`${NOTES_BASE_URL}/${id}/`);
    return response.json();
  }

  /**
   * Create a new note
   */
  static async createNote(data: CreateNoteData): Promise<Note> {
    if (USE_MOCK_DATA) {
      const newNote: Note = {
        id: generateId(),
        title: data.title,
        content: data.content,
        tags: data.tags,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: mockCurrentUser,
        is_shared: false,
        shared_with: [],
      };

      const allNotes = getNotesFromStorage();
      allNotes.push(newNote);
      saveNotesToStorage(allNotes);

      return newNote;
    }

    const response = await authenticatedFetch(`${NOTES_BASE_URL}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  }

  /**
   * Update an existing note
   */
  static async updateNote(id: string, data: UpdateNoteData): Promise<Note> {
    if (USE_MOCK_DATA) {
      const allNotes = getNotesFromStorage();
      const index = allNotes.findIndex(n => n.id === id);

      if (index === -1) throw new Error('Note not found');

      allNotes[index] = {
        ...allNotes[index],
        ...data,
        updated_at: new Date().toISOString(),
        last_modified_by: mockCurrentUser,
      };

      saveNotesToStorage(allNotes);
      return allNotes[index];
    }

    const response = await authenticatedFetch(`${NOTES_BASE_URL}/${id}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  }

  /**
   * Delete a note
   */
  static async deleteNote(id: string): Promise<void> {
    if (USE_MOCK_DATA) {
      const allNotes = getNotesFromStorage();
      const filtered = allNotes.filter(n => n.id !== id);
      saveNotesToStorage(filtered);
      return;
    }

    await authenticatedFetch(`${NOTES_BASE_URL}/${id}/`, {
      method: 'DELETE',
    });
  }

  /**
   * Share a note with workspace members
   */
  static async shareNote(id: string, data: ShareNoteData): Promise<Note> {
    if (USE_MOCK_DATA) {
      const allNotes = getNotesFromStorage();
      const index = allNotes.findIndex(n => n.id === id);

      if (index === -1) throw new Error('Note not found');

      // Get user objects for the IDs
      const sharedUsers = mockWorkspaceMembers.filter(user => data.user_ids.includes(user.id));

      allNotes[index] = {
        ...allNotes[index],
        shared_with: sharedUsers,
        updated_at: new Date().toISOString(),
      };

      saveNotesToStorage(allNotes);
      return allNotes[index];
    }

    const response = await authenticatedFetch(`${NOTES_BASE_URL}/${id}/share/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  }

  /**
   * Unshare a note with a specific user
   */
  static async unshareNote(id: string, userId: string): Promise<void> {
    if (USE_MOCK_DATA) {
      const allNotes = getNotesFromStorage();
      const index = allNotes.findIndex(n => n.id === id);

      if (index !== -1) {
        allNotes[index].shared_with = allNotes[index].shared_with.filter(
          user => user.id !== userId
        );
        saveNotesToStorage(allNotes);
      }
      return;
    }

    await authenticatedFetch(`${NOTES_BASE_URL}/${id}/share/${userId}/`, {
      method: 'DELETE',
    });
  }

  /**
   * Search notes by query and tags
   */
  static async searchNotes(query?: string, tags?: string[]): Promise<Note[]> {
    if (USE_MOCK_DATA) {
      const allNotes = getNotesFromStorage();
      return allNotes.filter(note => {
        if (query && !note.title.toLowerCase().includes(query.toLowerCase()) &&
            !note.content.toLowerCase().includes(query.toLowerCase())) {
          return false;
        }
        if (tags && tags.length > 0 && !tags.every(tag => note.tags.includes(tag))) {
          return false;
        }
        return true;
      });
    }

    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (tags && tags.length > 0) params.append('tags', tags.join(','));

    const response = await authenticatedFetch(
      `${NOTES_BASE_URL}/search/?${params.toString()}`
    );
    return response.json();
  }

  /**
   * Get mock workspace members (for testing)
   */
  static getMockWorkspaceMembers(): User[] {
    return mockWorkspaceMembers;
  }
}
