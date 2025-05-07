import { withErrorBoundary, withSuspense } from '@extension/shared';
import { useCallback } from 'react';

// Hooks
import { useNotes } from './hooks/useNotes';
import { useFilterAndSort } from './hooks/useFilterAndSort';
import { useNoteSelection } from './hooks/useNoteSelection';
import { useNoteEditing } from './hooks/useNoteEditing';
import { useMarkdownTools } from './hooks/useMarkdownTools';

// Components
import Header from './components/Header';
import TagFilter from './components/TagFilter';
import NoteList from './components/NoteList';
import NoteDetail from './components/NoteDetail';

const NotesPage = () => {
  // Use the hooks to manage state and logic
  const { notes, allTags, scratchpad, addNote, updateNote, deleteNote, getNote, clearScratchpad } = useNotes();

  const { activeTag, sortOption, filteredAndSortedNotes, handleTagFilter, clearTagFilter, setSortOption } =
    useFilterAndSort(notes);

  const { selectedNote, handleSelectNote, handleCreateNewNote } = useNoteSelection(notes, getNote, addNote);

  const {
    editedTitle,
    editedContent,
    editedTags,
    tagInput,
    isEditing,
    showPreview,
    textareaRef,
    setEditedTitle,
    setEditedContent,
    setTagInput,
    setShowPreview,
    handleEditMode,
    handleSaveChanges,
    handleCancelEdit,
    handleAddTag,
    handleRemoveTag,
    handleTagInputKeyDown,
  } = useNoteEditing(selectedNote, updateNote);

  const { insertMarkdown, handleInsertLink, handleInsertImage } = useMarkdownTools(
    textareaRef as React.RefObject<HTMLTextAreaElement>,
    setEditedContent,
  );

  // Handle deleting the selected note
  const handleDeleteNote = useCallback(async () => {
    if (selectedNote && window.confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
      await deleteNote(selectedNote.id);
    }
  }, [selectedNote, deleteNote]);

  // Handle sort option change
  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSortOption(e.target.value as ReturnType<typeof useFilterAndSort>['sortOption']);
    },
    [setSortOption],
  );

  // Handle toggling preview
  const handleTogglePreview = useCallback(() => {
    setShowPreview(prev => !prev);
  }, [setShowPreview]);

  // Handle content change
  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setEditedContent(e.target.value);
    },
    [setEditedContent],
  );

  // Handle title change
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEditedTitle(e.target.value);
    },
    [setEditedTitle],
  );

  // Handle tag input change
  const handleTagInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTagInput(e.target.value);
    },
    [setTagInput],
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Tag filter */}
        <TagFilter tags={allTags} activeTag={activeTag} onTagSelect={handleTagFilter} onClearFilter={clearTagFilter} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Note list */}
          <NoteList
            notes={filteredAndSortedNotes}
            scratchpad={scratchpad || null}
            selectedNoteId={selectedNote?.id || null}
            sortOption={sortOption}
            onSelectNote={handleSelectNote}
            onCreateNote={handleCreateNewNote}
            onClearScratchpad={async () => {
              const result = await clearScratchpad();
              return result || null;
            }}
            onSortChange={handleSortChange}
          />

          {/* Note detail */}
          <NoteDetail
            selectedNote={selectedNote}
            isEditing={isEditing}
            editedTitle={editedTitle}
            editedContent={editedContent}
            editedTags={editedTags}
            tagInput={tagInput}
            showPreview={showPreview}
            textareaRef={textareaRef as React.RefObject<HTMLTextAreaElement>}
            onEditMode={handleEditMode}
            onSaveChanges={handleSaveChanges}
            onCancelEdit={handleCancelEdit}
            onDeleteNote={handleDeleteNote}
            onTitleChange={handleTitleChange}
            onContentChange={handleContentChange}
            onTagInputChange={handleTagInputChange}
            onTagInputKeyDown={handleTagInputKeyDown}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
            onTogglePreview={handleTogglePreview}
            insertMarkdown={insertMarkdown}
            handleInsertLink={handleInsertLink}
            handleInsertImage={handleInsertImage}
          />
        </div>
      </main>
    </div>
  );
};

export default withErrorBoundary(
  withSuspense(
    NotesPage,
    <div className="flex h-screen w-screen items-center justify-center bg-gray-900 text-gray-100">Chargement...</div>,
  ),
  <div className="flex h-screen w-screen items-center justify-center bg-gray-900 text-gray-100">
    Une erreur est survenue
  </div>,
);
