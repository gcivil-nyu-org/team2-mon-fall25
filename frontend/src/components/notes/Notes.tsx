import { useState, useEffect, useMemo } from 'react';
import { NoteCard } from './NoteCard';
import { NoteEditorModal } from './NoteEditorModal';
import { NoteViewerModal } from './NoteViewerModal';
import { ShareNoteModal } from './ShareNoteModal';
import { NotesApi } from './NotesApi';
// import type { Workspace } from '../../lib/api';
import type { Note, ViewMode, SortBy, ActiveTab, User, CreateNoteData } from './types';

export function Notes({ workspaceId }: { workspaceId: string }) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('mine');
  const [myNotes, setMyNotes] = useState<Note[]>([]);
  const [sharedNotes, setSharedNotes] = useState<Note[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortBy>('modified');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');


  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [sharingNote, setSharingNote] = useState<Note | null>(null);

  // Mock workspace members (replace with actual API call when backend is ready)
  const [workspaceMembers] = useState<User[]>(NotesApi.getMockWorkspaceMembers());

  // Fetch notes
  useEffect(() => {
    loadNotes();
  }, [workspaceId, activeTab]);

  const loadNotes = async () => {
    setLoading(true);
    setError('');

    try {
      if (activeTab === 'mine') {
        const notes = await NotesApi.getMyNotes(workspaceId);
        setMyNotes(notes);
      } else {
        const notes = await NotesApi.getSharedNotes();
        setSharedNotes(notes);
      }
    } catch (err) {
      // Silently handle errors when backend is not available
      console.warn('Notes API not available:', err);
      if (activeTab === 'mine') {
        setMyNotes([]);
      } else {
        setSharedNotes([]);
      }
    } finally {
      setLoading(false);
    }
  };

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
  useEffect(() => {
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

    setFilteredNotes(filtered);
  }, [myNotes, sharedNotes, activeTab, searchQuery, selectedTag, sortBy]);

  // Handlers
  const handleCreateNote = async (data: { title: string; content: string; tags: string[] }) => {
    const selectedWorkspaceId = workspaceId;

    console.log("Creating note:", {
    ...data,
    workspace: selectedWorkspaceId,
  });

    await NotesApi.createNote({ ...data, workspace: selectedWorkspaceId });
    await loadNotes();
  };

  const handleUpdateNote = async (data: CreateNoteData) => {
    if (!editingNote) return;
    await NotesApi.updateNote(editingNote.id, data);
    await loadNotes();
    setEditingNote(null);
  };

  const handleDeleteNote = async (note: Note) => {
    if (window.confirm(`Are you sure you want to delete "${note.title}"?`)) {
      try {
        await NotesApi.deleteNote(note.id);
        await loadNotes();
      } catch{
        alert('Failed to delete note');
      }
    }
  };

  const handleShareNote = async (userIds: string[]) => {
    if (!sharingNote) return;
    await NotesApi.shareNote(sharingNote.id, { user_ids: userIds });
    await loadNotes();
    setSharingNote(null);
  };

  return (
    <div className="flex-1 overflow-auto bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Notes
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              title="Grid view"
              aria-label="Grid view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              title="List view"
              aria-label="List view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab('mine')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'mine'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Created by you
          </button>
          <button
            onClick={() => setActiveTab('shared')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'shared'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Shared with you
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
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
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700
                         bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                         placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all text-sm"
            />
          </div>

          {/* Tag Filter */}
          {allTags.length > 0 && (
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700
                         bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition-all text-sm min-w-[140px]"
            >
              <option value="">All Tags</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          )}

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700
                       bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       transition-all text-sm min-w-[140px]"
          >
            <option value="modified">Last Modified</option>
            <option value="created">Date Created</option>
            <option value="title">Title (A-Z)</option>
          </select>
        </div>

        {/* Notes Grid/List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={loadNotes}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              {searchQuery || selectedTag
                ? 'No notes found matching your filters'
                : activeTab === 'mine'
                ? 'No notes yet. Create your first note!'
                : 'No notes have been shared with you'}
            </p>
            {activeTab === 'mine' && !searchQuery && !selectedTag && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
              >
                Create Your First Note
              </button>
            )}
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                : 'flex flex-col gap-3'
            }
          >
            {filteredNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                viewMode={viewMode}
                activeTab={activeTab}
                onEdit={setEditingNote}
                onDelete={handleDeleteNote}
                onShare={setSharingNote}
                onView={setViewingNote}
              />
            ))}
          </div>
        )}

        {/* Modals */}
        <NoteEditorModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={handleCreateNote}
        />

        <NoteEditorModal
          isOpen={!!editingNote}
          onClose={() => setEditingNote(null)}
          onSave={handleUpdateNote}
          note={editingNote}
        />

        <NoteViewerModal
          isOpen={!!viewingNote}
          onClose={() => setViewingNote(null)}
          note={viewingNote}
        />

        <ShareNoteModal
          isOpen={!!sharingNote}
          onClose={() => setSharingNote(null)}
          onShare={handleShareNote}
          note={sharingNote}
          workspaceMembers={workspaceMembers}
        />
      </div>
    </div>
  );
}
