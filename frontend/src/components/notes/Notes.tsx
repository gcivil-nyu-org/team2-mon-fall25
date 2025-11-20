import { useState, useEffect } from 'react';
import { NotesList } from './NotesList';
import { NoteEditor } from './NoteEditor';
import { NotesApi } from './NotesApi';
// import type { Workspace } from '../../lib/api';
import type { Note, SortBy, ActiveTab, User, CreateNoteData } from './types';
import { toast } from 'sonner';

export function Notes({ workspaceId }: { workspaceId: string }) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('mine');
  const [myNotes, setMyNotes] = useState<Note[]>([]);
  const [sharedNotes, setSharedNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortBy>('modified');
  const [loading, setLoading] = useState(true);
  // const [error, setError] = useState('');


  // Modal states
  //TODO: commenting this now to avoid lint errors, will implement modals later

  // const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  // const [editingNote, setEditingNote] = useState<Note | null>(null);
  // const [viewingNote, setViewingNote] = useState<Note | null>(null);
  // const [sharingNote, setSharingNote] = useState<Note | null>(null);

  // Mock workspace members (replace with actual API call when backend is ready)
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [workspaceMembers] = useState<User[]>(NotesApi.getMockWorkspaceMembers());

  // Fetch notes
  useEffect(() => {
    loadNotes();
  }, [workspaceId, activeTab]);

  const loadNotes = async () => {
    setLoading(true);

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

  // Get selected note
  const selectedNote = selectedNoteId
    ? [...myNotes, ...sharedNotes].find((n) => n.id === selectedNoteId) || null
    : null;

  const handleCreateNew = () => {
    setSelectedNoteId(null);
    setIsCreatingNew(true);
  };

  const handleNoteSelect = (noteId: string) => {
    setSelectedNoteId(noteId);
    setIsCreatingNew(false);
  };

  const handleCreateNote = async (data: CreateNoteData) => {
    try {
      const newNote = await NotesApi.createNote({...data, workspace: workspaceId});
      await loadNotes();
      setSelectedNoteId(newNote.id);
      setIsCreatingNew(false);
      toast.success('Note created successfully');
    } catch (error) {
      console.error('Failed to create note:', error);
      toast.error('Failed to create note');
      throw error;
    }
  };

  const handleUpdateNote = async (data: CreateNoteData) => {
    if (!selectedNoteId) return;

    try {
      await NotesApi.updateNote(selectedNoteId, data);
      await loadNotes();
    } catch (error) {
      console.error('Failed to update note:', error);
      toast.error('Failed to update note');
      throw error;
    }
  };

  const handleDeleteNote = async (note: Note) => {
    try {
      await NotesApi.deleteNote(note.id);
      await loadNotes();
      setSelectedNoteId(null);
      setIsCreatingNew(false);
      toast.success('Note deleted successfully');
    } catch (error) {
      console.error('Failed to delete note:', error);
      toast.error('Failed to delete note');
      throw error;
    }
  };

  const handleCloseEditor = () => {
    setSelectedNoteId(null);
    setIsCreatingNew(false);
  };

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    setSelectedNoteId(null);
    setIsCreatingNew(false);
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-zinc-50 dark:bg-zinc-950 p-6">
      {/* Mobile: Show either list or editor */}
      <div className="flex flex-1 md:hidden">
        {selectedNoteId || isCreatingNew ? (
          <NoteEditor
            note={selectedNote}
            isNew={isCreatingNew}
            onSave={isCreatingNew ? handleCreateNote : handleUpdateNote}
            onDelete={handleDeleteNote}
            onClose={handleCloseEditor}
            workspaceMembers={workspaceMembers}
          />
        ) : (
          <div className="flex-1">
            <NotesList
              activeTab={activeTab}
              myNotes={myNotes}
              sharedNotes={sharedNotes}
              selectedNoteId={selectedNoteId}
              searchQuery={searchQuery}
              selectedTag={selectedTag}
              sortBy={sortBy}
              onTabChange={handleTabChange}
              onNoteSelect={handleNoteSelect}
              onSearchChange={setSearchQuery}
              onTagChange={setSelectedTag}
              onSortChange={setSortBy}
              onCreateNew={handleCreateNew}
            />
          </div>
        )}
      </div>

      {/* Desktop: Two-column layout */}
      <div className="hidden md:flex flex-1 gap-6">
        {/* Left Sidebar - Fixed width */}
        <div className="w-[300px] shrink-0">
          <NotesList
            activeTab={activeTab}
            myNotes={myNotes}
            sharedNotes={sharedNotes}
            selectedNoteId={selectedNoteId}
            searchQuery={searchQuery}
            selectedTag={selectedTag}
            sortBy={sortBy}
            onTabChange={handleTabChange}
            onNoteSelect={handleNoteSelect}
            onSearchChange={setSearchQuery}
            onTagChange={setSelectedTag}
            onSortChange={setSortBy}
            onCreateNew={handleCreateNew}
          />
        </div>

        {/* Right Editor - Flexible width */}
        <div className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-full rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
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
            <NoteEditor
              note={selectedNote}
              isNew={isCreatingNew}
              onSave={isCreatingNew ? handleCreateNote : handleUpdateNote}
              onDelete={handleDeleteNote}
              onClose={handleCloseEditor}
              workspaceMembers={workspaceMembers}
            />
          )}
        </div>
      </div>
    </div>
  );
}
