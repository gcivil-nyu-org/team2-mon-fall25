export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string; // markdown
  tags: string[];
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  created_by: User;
  last_modified_by?: User; // Only for shared notes
  is_shared: boolean; // True if I'm viewing someone else's note
  shared_by?: User; // Set when is_shared=true
  shared_with: User[]; // List of users I've shared with (if owner)
}

export interface CreateNoteData {
  title: string;
  content: string;
  tags: string[];
  workspace?: string;
}

export interface UpdateNoteData {
  title?: string;
  content?: string;
  tags?: string[];
}

export interface ShareNoteData {
  user_ids: string[];
}

export type ViewMode = 'grid' | 'list';
export type SortBy = 'modified' | 'created' | 'title';
export type ActiveTab = 'mine' | 'shared';
