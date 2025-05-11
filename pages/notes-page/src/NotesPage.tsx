import { withErrorBoundary, withSuspense, useStorage } from '@extension/shared';
import { useState, useCallback, useEffect, useRef } from 'react';
import { chatHistoryStorage } from '@extension/storage';

// Hooks
import { useNotes } from './hooks/useNotes';
import { useFilterAndSort } from './hooks/useFilterAndSort';
import { useNoteSelection } from './hooks/useNoteSelection';
import { useNoteEditing } from './hooks/useNoteEditing';
// import { useMarkdownTools } from './hooks/useMarkdownTools'; // Commenté

// Components
import Header from './components/layout/Header';
import LeftSidebar from './components/layout/LeftSidebar';
import CenterPanel from './components/layout/CenterPanel';
import TagsPanel from './components/tag/TagsPanel';

// Types
import type { NoteEntry } from '@extension/storage';

const NotesPage = () => {
  // Refs for resizable panels
  const leftSidebarRef = useRef<HTMLDivElement>(null);
  const rightSidebarRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const leftResizeHandleRef = useRef<HTMLButtonElement>(null);
  const rightResizeHandleRef = useRef<HTMLButtonElement>(null);

  // States for UI control
  const [leftSidebarWidth, setLeftSidebarWidth] = useState<number>(220);
  const [rightSidebarWidth, setRightSidebarWidth] = useState<number>(180);
  const [isResizingLeft, setIsResizingLeft] = useState<boolean>(false);
  const [isResizingRight, setIsResizingRight] = useState<boolean>(false);
  const [selectedItemType, setSelectedItemType] = useState<'note' | 'chat'>('note');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<'notes' | 'chats' | null>('notes');
  const [showLeftSidebar, setShowLeftSidebar] = useState<boolean>(true);
  const [showRightSidebar, setShowRightSidebar] = useState<boolean>(true);

  // Store initial mouse position for accurate resizing
  const resizeInitPositionRef = useRef<number>(0);
  const initialWidthRef = useRef<number>(0);

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
    editedTags,
    tagInput,
    isEditing,
    setEditedTitle,
    setTagInput,
    handleEditMode,
    handleSaveChanges,
    handleCancelEdit,
    handleAddTag,
    handleRemoveTag,
    handleTagInputKeyDown,
  } = useNoteEditing(selectedNote, updateNote);

  // const { insertMarkdown, handleInsertLink, handleInsertImage } = useMarkdownTools(
  //   textareaRef as React.RefObject<HTMLTextAreaElement>,
  //   setEditedContent,
  // ); // Commenté

  // Toggle sidebars with animation
  const toggleLeftSidebar = useCallback(() => {
    setShowLeftSidebar(prev => !prev);
  }, []);

  const toggleRightSidebar = useCallback(() => {
    setShowRightSidebar(prev => !prev);
  }, []);

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
  const handleMouseDownLeft = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizingLeft(true);
      setIsResizingRight(false); // Ensure only one resize operation at a time
      resizeInitPositionRef.current = e.clientX;
      initialWidthRef.current = leftSidebarWidth;
    },
    [leftSidebarWidth],
  );

  const handleMouseDownRight = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizingRight(true);
      setIsResizingLeft(false); // Ensure only one resize operation at a time
      resizeInitPositionRef.current = e.clientX;
      initialWidthRef.current = rightSidebarWidth;
    },
    [rightSidebarWidth],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        const delta = e.clientX - resizeInitPositionRef.current;
        const newWidth = Math.max(150, Math.min(400, initialWidthRef.current + delta));
        setLeftSidebarWidth(newWidth);
      } else if (isResizingRight) {
        const delta = resizeInitPositionRef.current - e.clientX;
        const newWidth = Math.max(150, Math.min(800, initialWidthRef.current + delta));
        setRightSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
    };

    if (isResizingLeft || isResizingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // Add a class to disable text selection during resize
      document.body.classList.add('resize-active');
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('resize-active');
    };
  }, [isResizingLeft, isResizingRight]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      <Header
        showLeftSidebar={showLeftSidebar}
        showRightSidebar={showRightSidebar}
        toggleLeftSidebar={toggleLeftSidebar}
        toggleRightSidebar={toggleRightSidebar}
        selectedNote={selectedNote}
        selectedItemType={selectedItemType}
        folderPath={folderPath}
        navigateToFolder={navigateToFolder}
        currentFolderId={currentFolderId}
      />

      {/* Main Content - Using CSS Grid for responsive layout */}
      <main
        ref={mainContainerRef}
        className="flex-1 grid overflow-hidden relative"
        style={{
          gridTemplateColumns: `${showLeftSidebar ? leftSidebarWidth + 'px' : '0'} 1fr ${
            showRightSidebar ? rightSidebarWidth + 'px' : '0'
          }`,
        }}>
        {/* Left Sidebar with transition */}
        <div
          ref={leftSidebarRef}
          className={`bg-slate-800 border-r border-slate-700/70 transition-all duration-300 ease-in-out overflow-hidden ${
            !showLeftSidebar ? 'w-0 opacity-0' : 'opacity-100'
          }`}>
          <LeftSidebar
            notes={filteredAndSortedNotes}
            scratchpad={scratchpad || null}
            chatHistory={chatHistory}
            currentFolderId={currentFolderId}
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

        {/* Left resize handle - positioned between sidebars */}
        {showLeftSidebar && (
          <button
            ref={leftResizeHandleRef}
            type="button"
            aria-label="Redimensionner la barre latérale gauche"
            style={{ left: `${leftSidebarWidth}px` }}
            className={`absolute top-0 h-full w-4 cursor-col-resize z-20 hover:z-50 bg-transparent border-0 p-0 m-0 resize-handle ${
              isResizingLeft ? 'z-50' : ''
            }`}
            onMouseDown={handleMouseDownLeft}>
            <div className="absolute left-0 top-0 h-full w-px bg-slate-700" />
            <div className="absolute left-0 top-0 h-full w-4 bg-transparent hover:bg-blue-500/10 flex items-center justify-center group">
              <div className="w-1 h-16 rounded-full opacity-0 group-hover:opacity-70 bg-blue-500 resize-handle-indicator"></div>
            </div>
          </button>
        )}

        {/* Center Panel - Flexbox layout for the content */}
        <div className="flex flex-col overflow-hidden bg-slate-850 shadow-inner relative">
          <CenterPanel
            selectedItemType={selectedItemType}
            selectedNote={selectedNote}
            selectedChatId={selectedChatId}
            editedTitle={editedTitle}
            editedTags={editedTags}
            tagInput={tagInput}
            isEditing={isEditing}
            onTitleChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedTitle(e.target.value)}
            onEditMode={handleEditMode}
            onSaveChanges={handleSaveChanges}
            onCancelEdit={handleCancelEdit}
            onDeleteNote={handleDeleteNote}
            onTagInputChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagInput(e.target.value)}
            onTagInputKeyDown={handleTagInputKeyDown}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
          />
        </div>

        {/* Right resize handle - positioned between center and right sidebar */}
        {showRightSidebar && (
          <button
            ref={rightResizeHandleRef}
            type="button"
            aria-label="Redimensionner la barre latérale droite"
            style={{ right: `${rightSidebarWidth}px` }}
            className={`absolute top-0 h-full w-4 cursor-col-resize z-20 hover:z-50 bg-transparent border-0 p-0 m-0 resize-handle ${
              isResizingRight ? 'z-50' : ''
            }`}
            onMouseDown={handleMouseDownRight}>
            <div className="absolute right-0 top-0 h-full w-px bg-slate-700" />
            <div className="absolute right-0 top-0 h-full w-4 bg-transparent hover:bg-blue-500/10 flex items-center justify-center group">
              <div className="w-1 h-16 rounded-full opacity-0 group-hover:opacity-70 bg-blue-500 resize-handle-indicator"></div>
            </div>
          </button>
        )}

        {/* Right Sidebar with transition */}
        <div
          ref={rightSidebarRef}
          className={`bg-slate-800 border-l border-slate-700/70 transition-all duration-300 ease-in-out overflow-hidden ${
            !showRightSidebar ? 'w-0 opacity-0' : 'opacity-100'
          }`}>
          <TagsPanel
            notes={notes}
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
    <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-slate-100">
      <div className="animate-pulse">Chargement...</div>
    </div>,
  ),
  <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-slate-100">
    <div className="text-red-400">Une erreur est survenue</div>
  </div>,
);
