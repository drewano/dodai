import { useState, useEffect, useCallback } from 'react';
import type { NoteEntry } from '@extension/storage';

export function useNoteSelection(
  notes: NoteEntry[] | null,
  getNote: (id: string) => Promise<NoteEntry | undefined>,
  addNote: (noteData: Omit<NoteEntry, 'createdAt' | 'updatedAt' | 'type'>) => Promise<string>,
) {
  const [selectedNote, setSelectedNote] = useState<NoteEntry | null>(null);

  // Effet pour sélectionner la première note au chargement ou après suppression,
  // ou la note demandée via query param
  useEffect(() => {
    if (!notes) return;

    const searchParams = new URLSearchParams(window.location.search);
    const noteIdFromParam = searchParams.get('noteId');

    let noteToSelect: NoteEntry | undefined | null = null;

    if (noteIdFromParam) {
      noteToSelect = notes.find(note => note.id === noteIdFromParam);
    }

    // If a specific note was found via params and it's not already selected, select it.
    if (noteToSelect && (!selectedNote || selectedNote.id !== noteToSelect.id)) {
      setSelectedNote(noteToSelect);
    }
    // If no note is selected yet, select the most recently updated non-folder note.
    else if (!selectedNote && notes.length > 0) {
      const mostRecentNote = [...notes]
        .filter(note => note.type === 'note')
        .sort((a, b) => b.updatedAt - a.updatedAt)[0];

      if (mostRecentNote) {
        setSelectedNote(mostRecentNote);
      } else {
        // Fallback: If only folders exist, select the first item
        setSelectedNote(notes[0]);
      }
    }
    // If the currently selected note is no longer in the list (e.g., deleted)
    else if (selectedNote && !notes.some(note => note.id === selectedNote.id)) {
      // Select the most recent note remaining in the list as a fallback
      const fallbackNote = [...notes].sort((a, b) => b.updatedAt - a.updatedAt)[0];
      setSelectedNote(fallbackNote || null); // Select null if no notes remain
    }
  }, [notes, selectedNote]);

  const handleSelectNote = useCallback((note: NoteEntry | null) => {
    setSelectedNote(note);
  }, []);

  const handleCreateNewNote = useCallback(
    async (parentId: string | null = null): Promise<NoteEntry | null> => {
      try {
        // Add a temporary ID to satisfy the type checker
        const tempId = Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
        const newNoteId = await addNote({
          id: tempId, // Provide the temporary ID
          title: 'Nouvelle Note',
          content: '# Nouvelle Note\n\nCommencez à écrire ici...',
          tags: [],
          parentId: parentId,
        });
        const newNote = await getNote(newNoteId); // Fetch with the ID returned by addNote
        if (newNote) {
          setSelectedNote(newNote);
          return newNote;
        } else {
          console.error('Impossible de récupérer la nouvelle note créée');
          return null;
        }
      } catch (error) {
        console.error('Erreur lors de la création de la note:', error);
        return null;
      }
    },
    [addNote, getNote],
  );

  return {
    selectedNote,
    setSelectedNote,
    handleSelectNote,
    handleCreateNewNote,
  };
}
