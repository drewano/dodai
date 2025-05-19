import { withErrorBoundary, withSuspense, exportNoteToMarkdown } from '@extension/shared';
import type React from 'react';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
// Removed DodaiSidebar and related imports (PlusCircle, LayoutDashboard, NotebookText, NavItemProps)
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@extension/ui'; // Adjusted path

// Hooks
import { useNotes } from './hooks/useNotes'; // Adjusted path
import { useFilterAndSort } from './hooks/useFilterAndSort'; // Adjusted path
import { useNoteSelection } from './hooks/useNoteSelection'; // Adjusted path
import { useNoteEditing } from './hooks/useNoteEditing'; // Adjusted path

// Components
import NotesListPanel from './components/layout/NotesListPanel'; // Adjusted path
import type { NotesListPanelProps } from './components/layout/NotesListPanel'; // Adjusted path
import CenterPanel from './components/layout/CenterPanel'; // Adjusted path
import TagsPanel from './components/tag/TagsPanel'; // Adjusted path

// Types
import type { NoteEntry } from '@extension/storage';

interface ContextMenuState {
  isVisible: boolean;
  x: number;
  y: number;
  targetItem: NoteEntry | null;
  isFolder: boolean;
}

const NotesView = () => {
  // Renamed from NotesPage
  const rightSidebarRef = useRef<HTMLDivElement>(null);
  // mainContainerRef and rightResizeHandleRef might not be needed if ResizablePanelGroup handles it well.
  // const mainContainerRef = useRef<HTMLDivElement>(null);
  // const rightResizeHandleRef = useRef<HTMLButtonElement>(null);

  const [rightSidebarWidth, setRightSidebarWidth] = useState<number>(180);
  // isResizingRight related states and effects might be handled by ResizablePanel or removed if not directly used by NotesView logic anymore
  // const [isResizingRight, setIsResizingRight] = useState<boolean>(false);
  const [_selectedItemType, setSelectedItemType] = useState<'note' | 'chat'>('note'); // Kept for CenterPanel
  const [_selectedChatId, setSelectedChatId] = useState<string | null>(null); // Kept for CenterPanel
  const [showRightSidebar, setShowRightSidebar] = useState<boolean>(true);
  // Removed isDodaiSidebarExpanded state

  // const resizeInitPositionRef = useRef<number>(0);
  // const initialWidthRef = useRef<number>(0);

  const editor = useCreateBlockNote();

  const { notes, allTags, getChildrenOf, addNote, updateNote, deleteNote, moveNoteToFolder, moveFolder, getNote } =
    useNotes();

  const { activeTag, currentFolderId, /* folderPath, */ handleTagFilter, clearTagFilter, navigateToFolder } =
    useFilterAndSort(notes); // folderPath might be used by a breadcrumb inside NotesListPanel or similar

  const { selectedNote, handleSelectNote /* handleCreateNewNote */ } = useNoteSelection(notes, getNote, addNote); // handleCreateNewNote removed, will be handled by MainLayout/Sidebar

  const {
    editedTitle,
    editedTags,
    tagInput,
    saveStatus,
    lastError,
    isDirty,
    setEditedTitle,
    setTagInput,
    handleSaveChanges,
    handleAddTag,
    handleRemoveTag,
    syncInitialContent,
    handleContentModification,
    editedSourceUrl,
    setEditedSourceUrl,
  } = useNoteEditing(selectedNote, updateNote, editor);

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isVisible: false,
    x: 0,
    y: 0,
    targetItem: null,
    isFolder: false,
  });

  const handleToggleFolderExpand = useCallback((folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  }, []);

  const handleOpenContextMenu = useCallback(
    (event: React.MouseEvent, item: NoteEntry, isFolderItem: boolean = false) => {
      event.preventDefault();
      event.stopPropagation();
      setContextMenu({
        isVisible: true,
        x: event.clientX,
        y: event.clientY,
        targetItem: item,
        isFolder: isFolderItem || item.type === 'folder',
      });
    },
    [],
  );

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, isVisible: false }));
  }, []);

  const handleExportItemContext = useCallback(async () => {
    if (contextMenu.targetItem && contextMenu.targetItem.type !== 'folder') {
      try {
        await exportNoteToMarkdown(contextMenu.targetItem);
      } catch (error) {
        console.error("Erreur lors de l'export via menu contextuel:", error);
        alert("Erreur lors de l'exportation.");
      }
    }
    handleCloseContextMenu();
  }, [contextMenu.targetItem, handleCloseContextMenu]);

  const handleDeleteItemContext = useCallback(async () => {
    if (contextMenu.targetItem) {
      const itemToDelete = contextMenu.targetItem;
      const confirmMessage = `Êtes-vous sûr de vouloir supprimer "${itemToDelete.title || (itemToDelete.type === 'folder' ? 'ce dossier' : 'cette note')}"${
        itemToDelete.type === 'folder' ? ' et tout son contenu' : ''
      } ?`;

      if (window.confirm(confirmMessage)) {
        try {
          await deleteNote(itemToDelete.id);
          if (selectedNote?.id === itemToDelete.id) {
            handleSelectNote(null);
          }
        } catch (error) {
          console.error('Erreur lors de la suppression via menu contextuel:', error);
          alert('Erreur lors de la suppression.');
        }
      }
    }
    handleCloseContextMenu();
  }, [contextMenu.targetItem, deleteNote, handleCloseContextMenu, selectedNote, handleSelectNote]);

  const toggleRightSidebar = useCallback(() => {
    setShowRightSidebar(prev => !prev);
  }, []);

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

  // Removed handleMouseDownRight and associated useEffect for resizing as ResizablePanelGroup should handle it.

  useEffect(() => {
    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = 'Vous avez des modifications non enregistrées. Voulez-vous vraiment quitter ?';
        // Consider if auto-save on unload is desired or if it should be handled by the browser prompt only.
        // For now, let's keep the explicit save.
        await handleSaveChanges();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, handleSaveChanges]);

  // Removed activePage, handleNavigateToPage, handleDodaiSidebarExpansionChange, navItems, and related useEffect for activePage.
  // This logic is now in MainLayout.

  const notesListPanelContent = useMemo(() => {
    const panelProps: NotesListPanelProps = {
      notes: notes || [], // Ensure notes is not null
      currentFolderId,
      selectedNoteId: selectedNote?.id || null,
      activeTag,
      onSelectNote: handleSelectNoteItem,
      onNavigateToFolder: navigateToFolder,
      onMoveNoteToFolder: moveNoteToFolder,
      onMoveFolder: moveFolder,
      getChildrenOf,
      onDeleteItem: handleDeleteItemContext, // This should be the ID, not the full function
      onUpdateNote: updateNote,
      expandedFolders,
      onToggleFolderExpand: handleToggleFolderExpand,
      handleOpenContextMenu,
      contextMenuState: contextMenu,
      onCloseContextMenu: handleCloseContextMenu,
      onExportContextMenuItem: handleExportItemContext,
      onDeleteContextMenuItem: handleDeleteItemContext,
    };
    return <NotesListPanel {...panelProps} />;
  }, [
    notes,
    currentFolderId,
    selectedNote,
    activeTag,
    handleSelectNoteItem,
    navigateToFolder,
    moveNoteToFolder,
    moveFolder,
    getChildrenOf,
    updateNote,
    expandedFolders,
    handleToggleFolderExpand,
    handleOpenContextMenu,
    contextMenu,
    handleCloseContextMenu,
    handleExportItemContext,
    handleDeleteItemContext,
  ]);

  // The main return structure is now simplified to just the Notes specific layout
  return (
    <div className="flex-1 flex flex-col overflow-hidden rounded-md h-full">
      <ResizablePanelGroup
        direction="horizontal"
        // units="pixels" // Consider if units is needed, or let it default
        className="flex-grow min-h-0 rounded-md shadow-md h-full">
        <ResizablePanel
          defaultSize={25}
          minSize={15}
          maxSize={40}
          className="min-w-[200px] flex flex-col bg-slate-800 rounded-l-md shadow-md">
          {notesListPanelContent}
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={75} minSize={30} className="flex-grow">
          <div className="flex flex-col overflow-hidden bg-slate-800 rounded-r-md shadow-md h-full w-full">
            <CenterPanel
              editor={editor}
              selectedItemType={_selectedItemType}
              selectedNote={selectedNote}
              selectedChatId={_selectedChatId}
              onSyncInitialContent={syncInitialContent}
              onNoteTextModified={handleContentModification}
              editedTitle={editedTitle}
              setEditedTitle={setEditedTitle}
              editedTags={editedTags}
              tagInput={tagInput}
              setTagInput={setTagInput}
              handleAddTag={handleAddTag}
              handleRemoveTag={handleRemoveTag}
              editedSourceUrl={editedSourceUrl}
              setEditedSourceUrl={setEditedSourceUrl}
              saveStatus={saveStatus}
              lastError={lastError}
              showRightSidebar={showRightSidebar}
              toggleRightSidebar={toggleRightSidebar}
            />
          </div>
        </ResizablePanel>
        {showRightSidebar && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel
              defaultSize={rightSidebarWidth} // Use state for this
              minSize={150}
              maxSize={500}
              onResize={(newSize: number) => {
                if (newSize !== undefined) {
                  setRightSidebarWidth(newSize);
                }
              }}
              collapsible={true}
              collapsedSize={0}
              order={2} // Ensure this panel is to the right
              className="bg-slate-800 rounded-r-md shadow-md" // Added rounding for consistency
            >
              <div
                ref={rightSidebarRef} // ref is kept for potential direct manipulations if any
                className="border-slate-700/70 h-full w-full overflow-hidden">
                <TagsPanel
                  notes={notes || []}
                  allTags={allTags}
                  activeTag={activeTag}
                  onTagSelect={handleTagFilter}
                  onClearFilter={clearTagFilter}
                />
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
};

// Keep HOCs for error boundary and suspense
export default withErrorBoundary(
  withSuspense(
    NotesView, // Changed from NotesPage
    <div className="flex h-full w-full items-center justify-center bg-slate-900 text-slate-100">
      <div className="animate-pulse">Chargement des notes...</div>
    </div>,
  ),
  <div className="flex h-full w-full items-center justify-center bg-slate-900 text-slate-100">
    <div className="text-red-400">Une erreur est survenue lors du chargement des notes.</div>
  </div>,
);
