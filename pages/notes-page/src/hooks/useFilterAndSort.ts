import { useMemo, useState } from 'react';
import type { NoteEntry } from '@extension/storage';
import { SCRATCHPAD_ID } from './useNotes';

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

  // Handle tag filtering
  const handleTagFilter = (tag: string) => {
    setActiveTag(activeTag === tag ? null : tag);
  };

  // Clear tag filter
  const clearTagFilter = () => {
    setActiveTag(null);
  };

  // Apply filtering and sorting
  const filteredAndSortedNotes = useMemo(() => {
    if (!notes) return [];

    // Filter by tag if a tag is active
    let filteredNotes = notes;
    if (activeTag) {
      filteredNotes = notes.filter(note => note.tags && note.tags.includes(activeTag));
    }

    // Exclude the scratchpad from the regular notes list
    const regularNotes = filteredNotes.filter(note => note.id !== SCRATCHPAD_ID);

    // Sort the notes according to the selected option
    return [...regularNotes].sort((a, b) => {
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
  }, [notes, activeTag, sortOption]);

  return {
    activeTag,
    sortOption,
    filteredAndSortedNotes,
    handleTagFilter,
    clearTagFilter,
    setSortOption,
  };
}
