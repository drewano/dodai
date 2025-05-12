import { withErrorBoundary, withSuspense, useStorage } from '@extension/shared';
import { useState, useCallback, useEffect, useRef } from 'react';
import { chatHistoryStorage } from '@extension/storage';
import { useCreateBlockNote } from '@blocknote/react';

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
  const [leftSidebarWidth, setLeftSidebarWidth] = useState<number>(240);
  const [rightSidebarWidth, setRightSidebarWidth] = useState<number>(180);
  const [isResizingLeft, setIsResizingLeft] = useState<boolean>(false);
  const [isResizingRight, setIsResizingRight] = useState<boolean>(false);
  const [selectedItemType, setSelectedItemType] = useState<'note' | 'chat'>('note');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showLeftSidebar, setShowLeftSidebar] = useState<boolean>(true);
  const [showRightSidebar, setShowRightSidebar] = useState<boolean>(true);

  // Store initial mouse position for accurate resizing
  const resizeInitPositionRef = useRef<number>(0);
  const initialWidthRef = useRef<number>(0);

  // Get chat history data (Might be needed by CenterPanel indirectly via selectedChatId)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _chatHistory = useStorage(chatHistoryStorage);
  const editor = useCreateBlockNote();

  // Use the hooks to manage state and logic for notes
  const { notes, allTags, getChildrenOf, addNote, updateNote, deleteNote, getNote, moveNoteToFolder, moveFolder } =
    useNotes();

  const { activeTag, currentFolderId, folderPath, handleTagFilter, clearTagFilter, navigateToFolder } =
    useFilterAndSort(notes);

  const { selectedNote, setSelectedNote, handleSelectNote, handleCreateNewNote } = useNoteSelection(
    notes,
    getNote,
    addNote,
  );

  const {
    editedTitle,
    editedTags,
    tagInput,
    saveStatus,
    lastError,
    isDirty,
    setEditedTitle,
    setEditedTags,
    setTagInput,
    handleSaveChanges,
    handleCancelEdit,
    handleAddTag,
    handleRemoveTag,
    syncInitialContent,
  } = useNoteEditing(selectedNote, updateNote, editor);

  // Extract sourceUrl state and setter
  const { editedSourceUrl, setEditedSourceUrl } = useNoteEditing(selectedNote, updateNote, editor);

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

  // Select note handler
  const handleSelectNoteItem = useCallback(
    (note: NoteEntry | null) => {
      if (isDirty && selectedNote && editor) {
        console.log('Sauvegarde automatique avant changement de note...');
        handleSaveChanges();
      }
      handleSelectNote(note);
      setSelectedItemType('note');
      setSelectedChatId(null);
    },
    [handleSelectNote, isDirty, selectedNote, editor, handleSaveChanges],
  );

  // Select chat handler (Kept for CenterPanel logic, but not triggered from NotesPage UI directly)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleSelectChat = useCallback(
    (chatId: string) => {
      if (isDirty && selectedNote && editor) {
        console.log('Sauvegarde automatique avant changement de chat...');
        handleSaveChanges();
      }
      setSelectedChatId(chatId);
      setSelectedItemType('chat');
      setSelectedNote(null);
    },
    [isDirty, selectedNote, editor, handleSaveChanges, setSelectedNote],
  );

  // Handle deleting the selected note
  /*
  const handleDeleteNote = useCallback(async () => {
    if (selectedNote && window.confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
      await deleteNote(selectedNote.id);
      // La désélection est maintenant gérée dans LeftSidebar après suppression via le menu contextuel
      // Si la note supprimée était celle en cours d'édition, il faut nettoyer les états d'édition.
      // useNoteSelection devrait idéalement désélectionner la note, ce qui déclencherait le useEffect dans useNoteEditing.
    }
  }, [selectedNote, deleteNote]);
  */

  // Handlers for resizing sidebars
  const handleMouseDownLeft = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizingLeft(true);
      setIsResizingRight(false);
      resizeInitPositionRef.current = e.clientX;
      initialWidthRef.current = leftSidebarWidth;
    },
    [leftSidebarWidth],
  );

  const handleMouseDownRight = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizingRight(true);
      setIsResizingLeft(false);
      resizeInitPositionRef.current = e.clientX;
      initialWidthRef.current = rightSidebarWidth;
    },
    [rightSidebarWidth],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        const delta = e.clientX - resizeInitPositionRef.current;
        const newWidth = Math.max(180, Math.min(500, initialWidthRef.current + delta));
        setLeftSidebarWidth(newWidth);
      } else if (isResizingRight) {
        const delta = resizeInitPositionRef.current - e.clientX;
        const newWidth = Math.max(150, Math.min(500, initialWidthRef.current + delta));
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
      document.body.classList.add('resize-active');
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('resize-active');
    };
  }, [isResizingLeft, isResizingRight]);

  // Gestion du beforeunload pour sauvegarder les modifications en attente
  useEffect(() => {
    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = 'Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter ?';
        await handleSaveChanges();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, handleSaveChanges]);

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
        editedTitle={editedTitle}
        setEditedTitle={setEditedTitle}
        editedTags={editedTags}
        setEditedTags={setEditedTags}
        tagInput={tagInput}
        setTagInput={setTagInput}
        saveStatus={saveStatus}
        lastError={lastError}
        isDirty={isDirty}
        handleAddTag={handleAddTag}
        handleRemoveTag={handleRemoveTag}
        handleSaveChanges={handleSaveChanges}
        handleCancelEdit={handleCancelEdit}
        editedSourceUrl={editedSourceUrl}
        setEditedSourceUrl={setEditedSourceUrl}
      />

      {/* Main Content - Using CSS Grid for responsive layout */}
      <main
        ref={mainContainerRef}
        className="flex-1 grid overflow-hidden relative"
        style={{
          gridTemplateColumns: `${showLeftSidebar ? leftSidebarWidth + 'px' : '0'} auto ${
            showRightSidebar ? rightSidebarWidth + 'px' : '0'
          }`,
        }}>
        {/* Left Sidebar with transition */}
        <div
          ref={leftSidebarRef}
          className={`bg-slate-800 border-r border-slate-700/70 transition-width duration-300 ease-in-out overflow-hidden relative ${
            !showLeftSidebar ? 'w-0 p-0 border-none' : ''
          }`}
          style={{ width: showLeftSidebar ? `${leftSidebarWidth}px` : '0' }}>
          {showLeftSidebar && (
            <LeftSidebar
              notes={notes || []}
              currentFolderId={currentFolderId}
              selectedNoteId={selectedNote?.id || null}
              activeTag={activeTag}
              onSelectNote={handleSelectNoteItem}
              onCreateNote={handleCreateNewNote}
              onNavigateToFolder={navigateToFolder}
              onMoveNoteToFolder={moveNoteToFolder}
              onMoveFolder={moveFolder}
              getChildrenOf={getChildrenOf}
              onDeleteItem={deleteNote}
              onUpdateNote={updateNote}
            />
          )}
        </div>

        {/* Left resize handle - positioned between sidebars */}
        {showLeftSidebar && (
          <button
            ref={leftResizeHandleRef}
            type="button"
            aria-label="Redimensionner la barre latérale gauche"
            style={{ left: `${leftSidebarWidth - 8}px` }}
            className={`absolute top-0 bottom-0 w-4 cursor-col-resize z-30 group flex items-center justify-center ${
              isResizingLeft ? 'bg-blue-500/20' : ''
            }`}
            onMouseDown={handleMouseDownLeft}>
            <div className="w-1 h-10 bg-slate-600 rounded-full group-hover:bg-blue-500 transition-colors duration-150"></div>
          </button>
        )}

        {/* Center Panel - Flexbox layout for the content */}
        <div className="flex flex-col overflow-hidden bg-slate-850 shadow-inner relative z-10">
          <CenterPanel
            editor={editor}
            selectedItemType={selectedItemType}
            selectedNote={selectedNote}
            selectedChatId={selectedChatId}
            onSyncInitialContent={syncInitialContent}
          />
        </div>

        {/* Right resize handle - positioned between center and right sidebar */}
        {showRightSidebar && (
          <button
            ref={rightResizeHandleRef}
            type="button"
            aria-label="Redimensionner la barre latérale droite"
            style={{ right: `${rightSidebarWidth - 8}px` }}
            className={`absolute top-0 bottom-0 w-4 cursor-col-resize z-30 group flex items-center justify-center ${
              isResizingRight ? 'bg-blue-500/20' : ''
            }`}
            onMouseDown={handleMouseDownRight}>
            <div className="w-1 h-10 bg-slate-600 rounded-full group-hover:bg-blue-500 transition-colors duration-150"></div>
          </button>
        )}

        {/* Right Sidebar with transition */}
        <div
          ref={rightSidebarRef}
          className={`bg-slate-800 border-l border-slate-700/70 transition-width duration-300 ease-in-out overflow-hidden ${
            !showRightSidebar ? 'w-0 p-0 border-none' : ''
          }`}
          style={{ width: showRightSidebar ? `${rightSidebarWidth}px` : '0' }}>
          {showRightSidebar && (
            <TagsPanel
              notes={notes || []}
              allTags={allTags}
              activeTag={activeTag}
              onTagSelect={handleTagFilter}
              onClearFilter={clearTagFilter}
            />
          )}
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
