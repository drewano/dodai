import { withErrorBoundary, withSuspense, exportNoteToMarkdown } from '@extension/shared';
import type React from 'react';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { PlusCircle, LayoutDashboard, NotebookText } from 'lucide-react';
import { DodaiSidebar, type NavItemProps } from '@extension/ui';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../../dodai-canvas/src/components/ui/resizable';

// Hooks
import { useNotes } from './hooks/useNotes';
import { useFilterAndSort } from './hooks/useFilterAndSort';
import { useNoteSelection } from './hooks/useNoteSelection';
import { useNoteEditing } from './hooks/useNoteEditing';

// Components
import NotesListPanel from './components/layout/NotesListPanel';
import type { NotesListPanelProps } from './components/layout/NotesListPanel';
import CenterPanel from './components/layout/CenterPanel';
import TagsPanel from './components/tag/TagsPanel';

// Types
import type { NoteEntry } from '@extension/storage';

interface ContextMenuState {
  isVisible: boolean;
  x: number;
  y: number;
  targetItem: NoteEntry | null;
  isFolder: boolean;
}

const NotesPage = () => {
  const rightSidebarRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const rightResizeHandleRef = useRef<HTMLButtonElement>(null);

  const [rightSidebarWidth, setRightSidebarWidth] = useState<number>(180);
  const [isResizingRight, setIsResizingRight] = useState<boolean>(false);
  const [_selectedItemType, setSelectedItemType] = useState<'note' | 'chat'>('note');
  const [_selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [showRightSidebar, setShowRightSidebar] = useState<boolean>(true);
  const [isDodaiSidebarExpanded, setIsDodaiSidebarExpanded] = useState<boolean>(true);

  const resizeInitPositionRef = useRef<number>(0);
  const initialWidthRef = useRef<number>(0);

  const editor = useCreateBlockNote();

  const { notes, allTags, getChildrenOf, addNote, updateNote, deleteNote, moveNoteToFolder, moveFolder, getNote } =
    useNotes();

  const { activeTag, currentFolderId, folderPath, handleTagFilter, clearTagFilter, navigateToFolder } =
    useFilterAndSort(notes);

  const { selectedNote, handleSelectNote, handleCreateNewNote } = useNoteSelection(notes, getNote, addNote);

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
    handleCancelEdit,
    setEditedTags,
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

  const handleMouseDownRight = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizingRight(true);
      resizeInitPositionRef.current = e.clientX;
      initialWidthRef.current = rightSidebarWidth;
    },
    [rightSidebarWidth],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingRight) {
        const delta = resizeInitPositionRef.current - e.clientX;
        const newWidth = Math.max(150, Math.min(500, initialWidthRef.current + delta));
        setRightSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingRight(false);
    };

    if (isResizingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingRight]);

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

  const [activePage, setActivePage] = useState<'notes' | 'canvas'>('notes');

  const handleNavigateToPage = useCallback((page: 'notes' | 'canvas' | string) => {
    if (page === 'canvas') {
      setActivePage('canvas');
      const canvasUrl = chrome.runtime.getURL('pages/dodai-canvas/index.html');
      if (window.location.pathname.includes('/dodai-canvas/')) return;
      window.location.href = canvasUrl;
    } else if (page === 'notes') {
      setActivePage('notes');
      if (window.location.pathname.includes('/notes-page/')) return;
      window.location.href = chrome.runtime.getURL('pages/notes-page/index.html');
    } else if (typeof page === 'string' && page.startsWith('http')) {
      chrome.tabs.create({ url: page });
    }
  }, []);

  const handleDodaiSidebarExpansionChange = useCallback((isExpanded: boolean) => {
    setIsDodaiSidebarExpanded(isExpanded);
  }, []);

  const navItems: NavItemProps[] = useMemo(
    () => [
      {
        id: 'new-note',
        label: 'Nouvelle Note',
        icon: <PlusCircle />,
        onClick: () => handleCreateNewNote(),
        isActive: false,
        title: 'Créer une nouvelle note',
      },
      {
        id: 'canvas',
        label: 'Canvas',
        icon: <LayoutDashboard />,
        onClick: () => handleNavigateToPage('canvas'),
        isActive: activePage === 'canvas',
        title: 'Ouvrir Dodai Canvas',
      },
      {
        id: 'notes',
        label: 'Mes Notes',
        icon: <NotebookText />,
        onClick: () => handleNavigateToPage('notes'),
        isActive: activePage === 'notes',
        title: 'Afficher mes notes',
      },
    ],
    [handleCreateNewNote, handleNavigateToPage, activePage],
  );

  useEffect(() => {
    if (window.location.pathname.includes('/dodai-canvas/')) {
      setActivePage('canvas');
    } else if (window.location.pathname.includes('/notes-page/')) {
      setActivePage('notes');
    }
  }, []);

  const notesListPanelContent = useMemo(() => {
    const panelProps: NotesListPanelProps = {
      notes,
      currentFolderId,
      selectedNoteId: selectedNote?.id || null,
      activeTag,
      onSelectNote: handleSelectNoteItem,
      onNavigateToFolder: navigateToFolder,
      onMoveNoteToFolder: moveNoteToFolder,
      onMoveFolder: moveFolder,
      getChildrenOf,
      onDeleteItem: handleDeleteItemContext,
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

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      <main
        className="flex-1 flex overflow-hidden relative"
        >
        <DodaiSidebar
          navItems={navItems}
          mainContentTitle={activePage === 'notes' ? 'MES NOTES' : undefined}
          mainContent={
            activePage === 'notes' ? (
              notesListPanelContent
            ) : (
              <div className="p-4 text-slate-400 text-sm">Vue Canvas (Contenu à venir)</div>
            )
          }
          initialIsExpanded={isDodaiSidebarExpanded}
          onExpansionChange={handleDodaiSidebarExpansionChange}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          {activePage === 'notes' ? (
            <ResizablePanelGroup direction="horizontal" units="pixels" className="flex-grow min-h-0">
              <ResizablePanel defaultSize={700} minSize={300}>
                <div className="flex flex-col overflow-hidden bg-slate-850 shadow-inner h-full w-full">
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
                    showRightSidebar={showRightSidebar && activePage === 'notes'}
                    toggleRightSidebar={toggleRightSidebar}
                  />
                </div>
              </ResizablePanel>
              {showRightSidebar && (
                <>
                  <ResizableHandle withHandle className="w-1.5 bg-slate-700 hover:bg-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500 data-[resize-handle-active=true]:bg-blue-600" />
                  <ResizablePanel
                    defaultSize={rightSidebarWidth}
                    minSize={150}
                    maxSize={500}
                    onResize={(newSize: number) => {
                      if (newSize !== undefined) {
                        setRightSidebarWidth(newSize);
                      }
                    }}
                    collapsible={true}
                    collapsedSize={0}
                    order={2}
                  >
                    <div ref={rightSidebarRef} className="bg-slate-800 border-l border-slate-700/70 h-full w-full overflow-hidden">
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
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-850 p-8 h-full">
              <h2 className="text-2xl font-semibold mb-4">Dodai Canvas</h2>
              <p>Chargement du Canvas...</p>
            </div>
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
