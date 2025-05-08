import { withErrorBoundary, withSuspense, useStorage } from '@extension/shared';
import { useState, useCallback, useEffect, useRef } from 'react';
import { chatHistoryStorage } from '@extension/storage';

// Hooks
import { useNotes } from './hooks/useNotes';
import { useFilterAndSort } from './hooks/useFilterAndSort';
import { useNoteSelection } from './hooks/useNoteSelection';
import { useNoteEditing } from './hooks/useNoteEditing';
import { useMarkdownTools } from './hooks/useMarkdownTools';

// Components
import Header from './components/Header';
import LeftSidebar from './components/LeftSidebar.js';
import CenterPanel from './components/CenterPanel.js';
import RightSidebar from './components/RightSidebar.js';

// Types
import type { NoteEntry } from '@extension/storage';

const NotesPage = () => {
  // Refs for resizable panels
  const leftSidebarRef = useRef<HTMLDivElement>(null);
  const rightSidebarRef = useRef<HTMLDivElement>(null);

  // States for UI control
  const [leftSidebarWidth, setLeftSidebarWidth] = useState<number>(250);
  const [rightSidebarWidth, setRightSidebarWidth] = useState<number>(200);
  const [isResizingLeft, setIsResizingLeft] = useState<boolean>(false);
  const [isResizingRight, setIsResizingRight] = useState<boolean>(false);
  const [selectedItemType, setSelectedItemType] = useState<'note' | 'chat'>('note');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<'notes' | 'chats' | null>('notes');

  // Get chat history data
  const chatHistory = useStorage(chatHistoryStorage);

  // Use the hooks to manage state and logic for notes
  const {
    notes,
    allTags,
    scratchpad,
    getChildrenOf,
    addNote,
    updateNote,
    deleteNote,
    getNote,
    clearScratchpad,
    createFolder,
    moveNoteToFolder,
    moveFolder,
    createFolderFromNotes,
  } = useNotes();

  const {
    activeTag,
    sortOption,
    currentFolderId,
    folderPath,
    filteredAndSortedNotes,
    handleTagFilter,
    clearTagFilter,
    navigateToFolder,
    setSortOption,
  } = useFilterAndSort(notes);

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

  // Select note handler (switches to note view)
  const handleSelectNoteItem = useCallback(
    (note: NoteEntry) => {
      handleSelectNote(note);
      setSelectedItemType('note');
      setSelectedChatId(null);
    },
    [handleSelectNote],
  );

  // Select chat handler (switches to chat view)
  const handleSelectChat = useCallback((chatId: string) => {
    setSelectedChatId(chatId);
    setSelectedItemType('chat');
  }, []);

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

  // Toggle expanded section in left sidebar
  const handleToggleSection = useCallback((section: 'notes' | 'chats') => {
    setExpandedSection(prevSection => (prevSection === section ? null : section));
  }, []);

  // Créer un nouveau dossier
  const handleCreateFolder = useCallback(
    async (parentId: string | null, title: string) => {
      try {
        const folderId = await createFolder(parentId, title);
        return folderId;
      } catch (error) {
        console.error('Erreur lors de la création du dossier', error);
        return null;
      }
    },
    [createFolder],
  );

  // Handlers for resizing sidebars
  const handleMouseDownLeft = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingLeft(true);
  }, []);

  const handleMouseDownRight = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingRight(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        const newWidth = e.clientX;
        if (newWidth >= 150 && newWidth <= 400) {
          setLeftSidebarWidth(newWidth);
        }
      }
      if (isResizingRight) {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth >= 150 && newWidth <= 300) {
          setRightSidebarWidth(newWidth);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
    };

    if (isResizingLeft || isResizingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingLeft, isResizingRight]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div
          ref={leftSidebarRef}
          className="flex-shrink-0 bg-gray-800 border-r border-gray-700"
          style={{ width: `${leftSidebarWidth}px` }}>
          <LeftSidebar
            notes={filteredAndSortedNotes}
            scratchpad={scratchpad || null}
            chatHistory={chatHistory}
            currentFolderId={currentFolderId}
            folderPath={folderPath}
            selectedNoteId={selectedNote?.id || null}
            selectedChatId={selectedChatId}
            sortOption={sortOption}
            expandedSection={expandedSection}
            onToggleSection={handleToggleSection}
            onSelectNote={handleSelectNoteItem}
            onSelectChat={handleSelectChat}
            onCreateNote={handleCreateNewNote}
            onCreateFolder={handleCreateFolder}
            onNavigateToFolder={navigateToFolder}
            onClearScratchpad={clearScratchpad}
            onMoveNoteToFolder={moveNoteToFolder}
            onMoveFolder={moveFolder}
            onCreateFolderFromNotes={createFolderFromNotes}
            onSortChange={handleSortChange}
            getChildrenOf={getChildrenOf}
            activeTag={activeTag}
          />
        </div>

        {/* Resize Handle for Left Sidebar */}
        <button
          type="button"
          aria-label="Redimensionner la barre latérale gauche"
          className="cursor-col-resize w-1 bg-gray-700 hover:bg-blue-500 active:bg-blue-600 p-0 border-0 focus:outline-none"
          onMouseDown={handleMouseDownLeft}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
              setLeftSidebarWidth(prev => Math.max(150, prev - 10));
            } else if (e.key === 'ArrowRight') {
              setLeftSidebarWidth(prev => Math.min(400, prev + 10));
            }
          }}></button>

        {/* Center Panel */}
        <div className="flex-1 overflow-auto">
          <CenterPanel
            selectedItemType={selectedItemType}
            selectedNote={selectedNote}
            selectedChatId={selectedChatId}
            editedTitle={editedTitle}
            editedContent={editedContent}
            editedTags={editedTags}
            tagInput={tagInput}
            isEditing={isEditing}
            showPreview={showPreview}
            textareaRef={textareaRef as React.RefObject<HTMLTextAreaElement>}
            onEditMode={handleEditMode}
            onSaveChanges={handleSaveChanges}
            onCancelEdit={handleCancelEdit}
            onDeleteNote={handleDeleteNote}
            onTitleChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedTitle(e.target.value)}
            onContentChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditedContent(e.target.value)}
            onTagInputChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagInput(e.target.value)}
            onTagInputKeyDown={handleTagInputKeyDown}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
            onTogglePreview={() => setShowPreview(prev => !prev)}
            insertMarkdown={insertMarkdown}
            handleInsertLink={handleInsertLink}
            handleInsertImage={handleInsertImage}
          />
        </div>

        {/* Resize Handle for Right Sidebar */}
        <button
          type="button"
          aria-label="Redimensionner la barre latérale droite"
          className="cursor-col-resize w-1 bg-gray-700 hover:bg-blue-500 active:bg-blue-600 p-0 border-0 focus:outline-none"
          onMouseDown={handleMouseDownRight}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
              setRightSidebarWidth(prev => Math.min(300, prev + 10));
            } else if (e.key === 'ArrowRight') {
              setRightSidebarWidth(prev => Math.max(150, prev - 10));
            }
          }}></button>

        {/* Right Sidebar */}
        <div
          ref={rightSidebarRef}
          className="flex-shrink-0 bg-gray-800 border-l border-gray-700"
          style={{ width: `${rightSidebarWidth}px` }}>
          <RightSidebar
            allTags={allTags}
            activeTag={activeTag}
            onTagSelect={handleTagFilter}
            onClearFilter={clearTagFilter}
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
