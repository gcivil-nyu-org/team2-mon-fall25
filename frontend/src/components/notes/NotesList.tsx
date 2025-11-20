import { useMemo } from 'react';
import type { Note, ActiveTab, SortBy } from './types';

interface NotesListProps {
  activeTab: ActiveTab;
  myNotes: Note[];
  sharedNotes: Note[];
  selectedNoteId: string | null;
  searchQuery: string;
  selectedTag: string;
  sortBy: SortBy;
  onTabChange: (tab: ActiveTab) => void;
  onNoteSelect: (noteId: string) => void;
  onSearchChange: (query: string) => void;
  onTagChange: (tag: string) => void;
  onSortChange: (sort: SortBy) => void;
  onCreateNew: () => void;
}

export function NotesList({
  activeTab,
  myNotes,
  sharedNotes,
  selectedNoteId,
  searchQuery,
  selectedTag,
  sortBy,
  onTabChange,
  onNoteSelect,
  onSearchChange,
  onTagChange,
  onSortChange,
  onCreateNew,
}: NotesListProps) {
  // Get all unique tags
  const allTags = useMemo(() => {
    const notes = activeTab === 'mine' ? myNotes : sharedNotes;
    const tagsSet = new Set<string>();
    notes.forEach((note) => {
      note.tags.forEach((tag) => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort();
  }, [myNotes, sharedNotes, activeTab]);

  // Filter and sort notes
  const filteredNotes = useMemo(() => {
    const notes = activeTab === 'mine' ? myNotes : sharedNotes;
    let filtered = [...notes];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (note) =>
          note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query)
      );
    }

    // Tag filter
    if (selectedTag) {
      filtered = filtered.filter((note) => note.tags.includes(selectedTag));
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      } else if (sortBy === 'created') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else {
        // modified (default)
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

    return filtered;
  }, [myNotes, sharedNotes, activeTab, searchQuery, selectedTag, sortBy]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Notes
          </h2>
          <button
            onClick={onCreateNew}
            className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            title="Create new note"
            aria-label="Create new note"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => onTabChange('mine')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-xl transition-colors ${
              activeTab === 'mine'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            Mine
          </button>
          <button
            onClick={() => onTabChange('shared')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-xl transition-colors ${
              activeTab === 'shared'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            Shared
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search notes..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700
                       bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                       placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       transition-all text-sm"
          />
        </div>

        {/* Filters */}
        <div className="space-y-2">
          <select
            value={selectedTag}
            onChange={(e) => onTagChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700
                       bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       transition-all text-sm h-[38px] flex items-center"
          >
            <option value="">All Tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortBy)}
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700
                       bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       transition-all text-sm h-[38px] flex items-center"
          >
            <option value="modified">Last Modified</option>
            <option value="created">Date Created</option>
            <option value="title">Title (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-3">
        {filteredNotes.length === 0 ? (
          <div className="text-center text-zinc-500 dark:text-zinc-400 text-xs py-8">
            {searchQuery || selectedTag
              ? 'No notes found matching your filters'
              : activeTab === 'mine'
              ? 'No notes yet. Create your first note!'
              : 'No notes have been shared with you'}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotes.map((note) => {
              const isActive = selectedNoteId === note.id;

              return (
                <div
                  key={note.id}
                  className={`group relative rounded-xl border p-2.5 transition-all ${
                    isActive
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                      : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <button
                    onClick={() => onNoteSelect(note.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3
                        className={`font-medium text-sm line-clamp-1 ${
                          isActive
                            ? 'text-blue-700 dark:text-blue-300'
                            : 'text-zinc-900 dark:text-zinc-100'
                        }`}
                      >
                        {note.title || 'Untitled'}
                      </h3>
                      {note.is_shared && (
                        <span className="flex-shrink-0 text-xs text-blue-600 dark:text-blue-400">
                          Shared
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-2">
                      {note.content.replace(/[#*`>\-\[\]]/g, '').trim() || 'No content'}
                    </p>

                    {note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {note.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                              isActive
                                ? 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                        {note.tags.length > 3 && (
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            +{note.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatDate(note.updated_at)}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
