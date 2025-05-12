import { useMemo, useState } from 'react';
import type { NoteEntry } from '@extension/storage';

export type SortOption =
  | 'updatedAt_desc'
  | 'updatedAt_asc'
  | 'createdAt_desc'
  | 'createdAt_asc'
  | 'title_asc'
  | 'title_desc';

export function useFilterAndSort(notes: NoteEntry[] | null) {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('updatedAt_desc');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Handle tag filtering
  const handleTagFilter = (tag: string) => {
    setActiveTag(activeTag === tag ? null : tag);
    // Revenir à la racine lors du filtrage par tag
    setCurrentFolderId(null);
  };

  // Clear tag filter
  const clearTagFilter = () => {
    setActiveTag(null);
  };

  // Naviguer vers un dossier
  const navigateToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    // Désactiver le filtre par tag lors de la navigation dans les dossiers
    setActiveTag(null);
  };

  // Obtenir le chemin complet du dossier actuel (pour afficher une navigation en fil d'Ariane)
  const folderPath = useMemo(() => {
    if (!notes || !currentFolderId) return [];

    const path: NoteEntry[] = [];
    let currentId: string | null = currentFolderId;

    while (currentId) {
      const folder = notes.find(note => note.id === currentId);
      if (!folder) break;

      path.unshift(folder);
      currentId = folder.parentId;
    }

    return path;
  }, [notes, currentFolderId]);

  // Apply filtering and sorting
  const filteredAndSortedNotes = useMemo(() => {
    if (!notes) return [];

    // Filtrer d'abord par tag si un tag est actif
    let filteredNotes = notes;
    if (activeTag) {
      filteredNotes = notes.filter(note => note.tags && note.tags.includes(activeTag));
    }
    // Sinon filtrer par dossier courant
    else if (currentFolderId !== null) {
      filteredNotes = notes.filter(note => note.parentId === currentFolderId);
    }
    // Sinon afficher tous les éléments de niveau racine
    else {
      filteredNotes = notes.filter(note => note.parentId === null);
    }

    // Sort the notes according to the selected option
    return [...filteredNotes].sort((a, b) => {
      // Les dossiers d'abord, puis tri selon l'option sélectionnée
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;

      // Si les deux sont des dossiers ou des notes, utiliser le tri sélectionné
      switch (sortOption) {
        case 'updatedAt_desc':
          return b.updatedAt - a.updatedAt;
        case 'updatedAt_asc':
          return a.updatedAt - b.updatedAt;
        case 'createdAt_desc':
          return b.createdAt - a.createdAt;
        case 'createdAt_asc':
          return a.createdAt - b.createdAt;
        case 'title_asc':
          return a.title.localeCompare(b.title);
        case 'title_desc':
          return b.title.localeCompare(a.title);
        default:
          return b.updatedAt - a.updatedAt;
      }
    });
  }, [notes, activeTag, sortOption, currentFolderId]);

  return {
    activeTag,
    sortOption,
    currentFolderId,
    folderPath,
    filteredAndSortedNotes,
    handleTagFilter,
    clearTagFilter,
    navigateToFolder,
    setSortOption,
  };
}
