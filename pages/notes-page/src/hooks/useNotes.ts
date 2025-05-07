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

  // Récupère toutes les notes racine (sans parentId)
  const rootEntries = useMemo(() => {
    if (!notes) return [];
    return notes
      .filter(note => note.id !== SCRATCHPAD_ID && note.parentId === null)
      .sort((a, b) => {
        // Les dossiers d'abord, puis tri par orderIndex ou par date de mise à jour
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;

        if (a.orderIndex !== undefined && b.orderIndex !== undefined) {
          return a.orderIndex - b.orderIndex;
        }

        return b.updatedAt - a.updatedAt;
      });
  }, [notes]);

  // Récupère les enfants d'un dossier
  const getChildrenOf = (folderId: string) => {
    if (!notes) return [];
    return notes
      .filter(note => note.parentId === folderId)
      .sort((a, b) => {
        // Les dossiers d'abord, puis tri par orderIndex ou par date de mise à jour
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;

        if (a.orderIndex !== undefined && b.orderIndex !== undefined) {
          return a.orderIndex - b.orderIndex;
        }

        return b.updatedAt - a.updatedAt;
      });
  };

  // Core CRUD operations wrapped from storage
  const addNote = async (noteData: Omit<NoteEntry, 'createdAt' | 'updatedAt' | 'type'>) => {
    return await notesStorage.addNote(noteData);
  };

  const updateNote = async (id: string, updates: Partial<Omit<NoteEntry, 'id' | 'type'>>) => {
    await notesStorage.updateNote(id, updates);
  };

  const deleteNote = async (id: string) => {
    await notesStorage.deleteNote(id);
  };

  const getNote = async (id: string) => {
    return await notesStorage.getNote(id);
  };

  // Fonctions pour la gestion des dossiers
  const createFolder = async (parentId: string | null, title: string) => {
    return await notesStorage.createFolder(parentId, title);
  };

  const moveNoteToFolder = async (noteId: string, targetFolderId: string | null) => {
    await notesStorage.moveNoteToFolder(noteId, targetFolderId);
  };

  const moveFolder = async (folderId: string, targetFolderId: string | null) => {
    await notesStorage.moveFolder(folderId, targetFolderId);
  };

  const getNotesInFolder = async (folderId: string | null) => {
    return await notesStorage.getNotesInFolder(folderId);
  };

  const reorderNote = async (noteId: string, newOrderIndex: number) => {
    await notesStorage.reorderNote(noteId, newOrderIndex);
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

  // Créer un nouveau dossier à partir de deux notes
  const createFolderFromNotes = async (noteAId: string, noteBId: string, folderTitle: string) => {
    // Créer un nouveau dossier
    const folderId = await createFolder(null, folderTitle);

    // Déplacer les deux notes dans ce dossier
    await moveNoteToFolder(noteAId, folderId);
    await moveNoteToFolder(noteBId, folderId);

    return folderId;
  };

  return {
    notes,
    allTags,
    scratchpad,
    rootEntries,
    getChildrenOf,
    addNote,
    updateNote,
    deleteNote,
    getNote,
    clearScratchpad,
    // Fonctions de gestion des dossiers
    createFolder,
    moveNoteToFolder,
    moveFolder,
    getNotesInFolder,
    reorderNote,
    createFolderFromNotes,
  };
}
