import { useState, useEffect } from 'react';
import type { NoteEntry } from '@extension/storage';

export function useNoteEditing(
  selectedNote: NoteEntry | null,
  updateNote: (id: string, updates: Partial<Omit<NoteEntry, 'id'>>) => Promise<void>,
) {
  const [editedTitle, setEditedTitle] = useState<string>('');
  const [editedContent, setEditedContent] = useState<string>('');
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Update form when selected note changes
  useEffect(() => {
    if (selectedNote) {
      setEditedTitle(selectedNote.title);
      setEditedContent(selectedNote.content);
      setEditedTags(selectedNote.tags || []);
    } else {
      setEditedTitle('');
      setEditedContent('');
      setEditedTags([]);
      setIsEditing(false);
    }
  }, [selectedNote]);

  // Enter edit mode
  const handleEditMode = () => {
    setIsEditing(true);
  };

  // Save changes to note
  const handleSaveChanges = async (newContentJSON: string) => {
    if (!selectedNote) {
      setIsEditing(false);
      return;
    }

    const hasTitleChanged = editedTitle !== selectedNote.title;
    const hasContentChanged = newContentJSON !== selectedNote.content;
    const haveTagsChanged = !arraysEqual(editedTags, selectedNote.tags || []);

    if (hasTitleChanged || hasContentChanged || haveTagsChanged) {
      await updateNote(selectedNote.id, {
        title: editedTitle,
        content: newContentJSON,
        tags: editedTags,
      });
    }
    setIsEditing(false);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    if (selectedNote) {
      setEditedTitle(selectedNote.title);
      setEditedContent(selectedNote.content);
      setEditedTags(selectedNote.tags || []);
    }
    setIsEditing(false);
  };

  // Tag management
  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !editedTags.includes(trimmedTag)) {
      setEditedTags([...editedTags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditedTags(editedTags.filter(tag => tag !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Utility to compare arrays
  const arraysEqual = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, idx) => val === sortedB[idx]);
  };

  return {
    editedTitle,
    editedContent,
    editedTags,
    tagInput,
    isEditing,
    setEditedTitle,
    setEditedContent,
    setEditedTags,
    setTagInput,
    setIsEditing,
    handleEditMode,
    handleSaveChanges,
    handleCancelEdit,
    handleAddTag,
    handleRemoveTag,
    handleTagInputKeyDown,
  };
}
