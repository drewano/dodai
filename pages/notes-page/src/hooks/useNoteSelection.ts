import { useState, useEffect, useCallback } from 'react';
import type { NoteEntry } from '@extension/storage';
import { SCRATCHPAD_ID } from './useNotes';

export function useNoteSelection(
  notes: NoteEntry[] | null,
  getNote: (id: string) => Promise<NoteEntry | undefined>,
  addNote: (noteData: Omit<NoteEntry, 'createdAt' | 'updatedAt'>) => Promise<string>,
) {
  const [selectedNote, setSelectedNote] = useState<NoteEntry | null>(null);

  // Handle selecting a note
  const handleSelectNote = useCallback((note: NoteEntry) => {
    setSelectedNote(note);
  }, []);

  // Create a new note
  const handleCreateNewNote = useCallback(async () => {
    const timestamp = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const newNoteTitle = `Nouvelle Note (${timestamp})`;
    const newNoteContent = '';

    // Generate a unique ID for the note
    const tempId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);

    const newNoteId = await addNote({
      id: tempId,
      title: newNoteTitle,
      content: newNoteContent,
      tags: [],
    });

    // Get the new note to select it
    const newNote = await getNote(newNoteId);
    if (newNote) {
      setSelectedNote(newNote);
      return newNote;
    }
    return null;
  }, [addNote, getNote]);

  // Check for URL parameters (for opening scratchpad directly)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const openScratchpad = searchParams.get('scratchpad') === 'true';

    if (openScratchpad && notes) {
      const scratchpad = notes.find(note => note.id === SCRATCHPAD_ID);
      if (scratchpad && (!selectedNote || selectedNote.id !== SCRATCHPAD_ID)) {
        setSelectedNote(scratchpad);
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
