import { useStorage } from '@extension/shared';
import { notesStorage, type NoteEntry } from '@extension/storage';
import { useMemo } from 'react';

export const SCRATCHPAD_ID = '@Scratchpad';

export function useNotes() {
  const notes = useStorage(notesStorage);

  // Get all unique tags across all notes
  const allTags = useMemo(() => {
    if (!notes) return [];
    const tagSet = new Set<string>();
    notes.forEach(note => {
      if (note.tags && note.tags.length > 0) {
        note.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [notes]);

  // Find the scratchpad note
  const scratchpad = useMemo(() => {
    if (!notes) return null;
    return notes.find(note => note.id === SCRATCHPAD_ID);
  }, [notes]);

  // Core CRUD operations wrapped from storage
  const addNote = async (noteData: Omit<NoteEntry, 'createdAt' | 'updatedAt'>) => {
    return await notesStorage.addNote(noteData);
  };

  const updateNote = async (id: string, updates: Partial<Omit<NoteEntry, 'id'>>) => {
    await notesStorage.updateNote(id, updates);
  };

  const deleteNote = async (id: string) => {
    await notesStorage.deleteNote(id);
  };

  const getNote = async (id: string) => {
    return await notesStorage.getNote(id);
  };

  const clearScratchpad = async () => {
    if (scratchpad) {
      await notesStorage.updateNote(SCRATCHPAD_ID, {
        content:
          '# 📥 Scratchpad\n\nUtilisez cette note comme collecteur rapide pour vos idées et captures web.\n\n---\n\n',
      });
      return await notesStorage.getNote(SCRATCHPAD_ID);
    }
    return null;
  };

  return {
    notes,
    allTags,
    scratchpad,
    addNote,
    updateNote,
    deleteNote,
    getNote,
    clearScratchpad,
  };
}
