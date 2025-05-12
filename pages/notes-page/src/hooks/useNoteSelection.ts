import { useState, useEffect, useCallback } from 'react';
import type { NoteEntry } from '@extension/storage';
import { SCRATCHPAD_ID } from './useNotes';

export function useNoteSelection(
  notes: NoteEntry[] | null,
  getNote: (id: string) => Promise<NoteEntry | undefined>,
  addNote: (noteData: Omit<NoteEntry, 'createdAt' | 'updatedAt' | 'type'>) => Promise<string>,
) {
  const [selectedNote, setSelectedNote] = useState<NoteEntry | null>(null);

  // Handle selecting a note
  const handleSelectNote = useCallback((note: NoteEntry | null) => {
    setSelectedNote(note);
  }, []);

  // Create a new note
  const handleCreateNewNote = useCallback(
    async (parentId: string | null = null): Promise<NoteEntry | null> => {
      const timestamp = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const newNoteTitle = `Nouvelle Note (${timestamp})`;
      const newNoteContent = '';

      // Generate a unique ID for the note
      const tempId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);

      try {
        const newNoteId = await addNote({
          id: tempId,
          title: newNoteTitle,
          content: newNoteContent,
          parentId,
          tags: [],
        });

        // Get the new note to select it
        const newNote = await getNote(newNoteId);
        if (newNote) {
          setSelectedNote(newNote);
          return newNote;
        }
      } catch (error) {
        console.error('Erreur lors de la création de la note:', error);
      }

      return null;
    },
    [addNote, getNote],
  );

  // Check for URL parameters (for opening scratchpad directly)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const openScratchpad = searchParams.get('scratchpad') === 'true';
    const noteId = searchParams.get('note');
    const folderId = searchParams.get('folder');

    if (openScratchpad && notes) {
      const scratchpad = notes.find(note => note.id === SCRATCHPAD_ID);
      if (scratchpad && (!selectedNote || selectedNote.id !== SCRATCHPAD_ID)) {
        setSelectedNote(scratchpad);
      }
    } else if (noteId && notes) {
      const note = notes.find(note => note.id === noteId);
      if (note) {
        setSelectedNote(note);
      }
    } else if (folderId && notes) {
      const folder = notes.find(note => note.id === folderId && note.type === 'folder');
      if (folder) {
        setSelectedNote(folder);
      }
    }
  }, [notes, selectedNote]);

  // Si la note sélectionnée est supprimée, sélectionner une autre note
  useEffect(() => {
    if (selectedNote && notes && !notes.find(note => note.id === selectedNote.id)) {
      // La note sélectionnée n'existe plus
      const noteInSameFolder = notes
        .filter(note => note.parentId === selectedNote.parentId)
        .sort((a, b) => b.updatedAt - a.updatedAt)[0];

      if (noteInSameFolder) {
        setSelectedNote(noteInSameFolder);
      } else if (notes.length > 0) {
        // Fallback: sélectionner la note la plus récente
        const latestNote = [...notes].sort((a, b) => b.updatedAt - a.updatedAt)[0];
        setSelectedNote(latestNote);
      } else {
        setSelectedNote(null);
      }
    }
  }, [notes, selectedNote]);

  return {
    selectedNote,
    setSelectedNote,
    handleSelectNote,
    handleCreateNewNote,
  };
}
