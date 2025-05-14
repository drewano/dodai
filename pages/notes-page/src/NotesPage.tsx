import { withErrorBoundary, withSuspense, exportNoteToMarkdown } from '@extension/shared';
import type React from 'react';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { Search, Settings, Github, Plus, LayoutGrid, NotebookText } from 'lucide-react';

// Hooks
import { useNotes } from './hooks/useNotes';
import { useFilterAndSort } from './hooks/useFilterAndSort';
import { useNoteSelection } from './hooks/useNoteSelection';
import { useNoteEditing } from './hooks/useNoteEditing';

// Components
import DodaiSidebar, { type NavItemProps } from '../../dodai-canvas/src/components/DodaiSidebar';
import CenterPanel from './components/layout/CenterPanel';
import TagsPanel from './components/tag/TagsPanel';
import FolderBreadcrumb from './components/common/FolderBreadcrumb';
import NoteCard from './components/list/NoteCard';
import FolderCard from './components/list/FolderCard';
import ContextMenu from './components/common/ContextMenu';
import { DndContext, closestCenter, useSensor, useSensors, MouseSensor, TouchSensor } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';

// Types
import type { NoteEntry } from '@extension/storage';

interface ContextMenuState {
  isVisible: boolean;
  x: number;
  y: number;
  targetItem: NoteEntry | null;
  isFolder: boolean;
}

interface RecursiveNoteTreeProps {
  notes: NoteEntry[];
  parentId: string | null;
  level: number;
  expandedFolders: Record<string, boolean>;
  onToggleFolderExpand: (folderId: string) => void;
  selectedNoteId: string | null;
  onSelectNote: (note: NoteEntry | null) => void;
  onNavigateToFolder: (folderId: string | null) => void;
  getChildrenOf: (folderId: string) => NoteEntry[];
  handleOpenContextMenu: (event: React.MouseEvent, item: NoteEntry, isFolderItem?: boolean) => void;
}

const RecursiveNoteTree: React.FC<RecursiveNoteTreeProps> = ({
  notes,
  parentId,
  level,
  expandedFolders,
  onToggleFolderExpand,
  selectedNoteId,
  onSelectNote,
  onNavigateToFolder,
  getChildrenOf,
  handleOpenContextMenu,
}) => {
  const children = useMemo(() => {
    return notes
      .filter(note => note.parentId === parentId)
      .sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        const titleA = a.title || '';
        const titleB = b.title || '';
        return titleA.localeCompare(titleB);
      });
  }, [notes, parentId]);

  if (children.length === 0 && level === 0) {
    return (
      <div className="p-4 text-center text-slate-500 text-sm">
        Aucune note ou dossier ici.
        <br />
        Cliquez sur '+' dans la sidebar.
      </div>
    );
  }

  return (
    <div className="space-y-0.5" style={{ paddingLeft: `${level > 0 ? 16 : 0}px` }}>
      {children.map(item => {
        const isSelected = selectedNoteId === item.id;
        const itemChildren = item.type === 'folder' ? getChildrenOf(item.id) : [];
        const hasChildren = itemChildren.length > 0;
        const isExpanded = item.type === 'folder' ? !!expandedFolders[item.id] : false;

        if (item.type === 'folder') {
          return (
            <div key={item.id}>
              <FolderCard
                folder={item}
                isSelected={isSelected}
                onSelect={onSelectNote}
                onOpen={() => onNavigateToFolder(item.id)}
                notesCount={itemChildren.length}
                onContextMenu={event => handleOpenContextMenu(event, item, true)}
                isExpanded={isExpanded}
                hasChildren={hasChildren}
                onToggleExpand={onToggleFolderExpand}
              />
              {isExpanded && hasChildren && (
                <RecursiveNoteTree
                  notes={notes}
                  parentId={item.id}
                  level={level + 1}
                  expandedFolders={expandedFolders}
                  onToggleFolderExpand={onToggleFolderExpand}
                  selectedNoteId={selectedNoteId}
                  onSelectNote={onSelectNote}
                  onNavigateToFolder={onNavigateToFolder}
                  getChildrenOf={getChildrenOf}
                  handleOpenContextMenu={handleOpenContextMenu}
                />
              )}
            </div>
          );
        } else {
          return (
            <NoteCard
              key={item.id}
              note={item}
              isSelected={isSelected}
              onSelect={onSelectNote}
              onContextMenu={event => handleOpenContextMenu(event, item, false)}
            />
          );
        }
      })}
    </div>
  );
};

const NotesPage = () => {
  const rightSidebarRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const rightResizeHandleRef = useRef<HTMLButtonElement>(null);

  const [rightSidebarWidth, setRightSidebarWidth] = useState<number>(180);
  const [isResizingRight, setIsResizingRight] = useState<boolean>(false);
  const [_selectedItemType, setSelectedItemType] = useState<'note' | 'chat'>('note');
  const [_selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<'notes' | 'canvas'>('notes');
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
  } = useNoteEditing(selectedNote, updateNote, editor);

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isVisible: false,
    x: 0,
    y: 0,
    targetItem: null,
    isFolder: false,
  });

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

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

  const handleExportItemContext = useCallback(async () => {
    if (contextMenu.targetItem && contextMenu.targetItem.type !== 'folder') {
      try {
        await exportNoteToMarkdown(contextMenu.targetItem);
      } catch (error) {
        console.error("Erreur lors de l'export via menu contextuel:", error);
        alert("Erreur lors de l'exportation.");
      }
    }
    setContextMenu(prev => ({ ...prev, isVisible: false }));
  }, [contextMenu.targetItem]);

  const handleDeleteItemContext = useCallback(async () => {
    if (contextMenu.targetItem) {
      const itemToDelete = contextMenu.targetItem;
      const confirmMessage = `Êtes-vous sûr de vouloir supprimer "${itemToDelete.title || (itemToDelete.type === 'folder' ? 'ce dossier' : 'cette note')}"${
        itemToDelete.type === 'folder' ? ' et tout son contenu' : ''
      } ?`;

      if (window.confirm(confirmMessage)) {
        try {
          await deleteNote(itemToDelete.id);
        } catch (error) {
          console.error('Erreur lors de la suppression via menu contextuel:', error);
          alert('Erreur lors de la suppression.');
        }
      }
    }
    setContextMenu(prev => ({ ...prev, isVisible: false }));
  }, [contextMenu.targetItem, deleteNote]);

  type DragData = { type: 'note'; note: NoteEntry } | { type: 'folder'; folder: NoteEntry; folderId?: string };

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!active || !over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      if (activeId === overId) return;

      const overData = over.data.current as DragData | undefined;

      const itemToMove = notes.find(n => n.id === activeId);
      if (!itemToMove) return;

      let targetFolderIdForDrop: string | null = null;

      if (overId.startsWith('droppable-')) {
        targetFolderIdForDrop = overId.replace('droppable-', '');
      } else if (overData?.type === 'folder') {
        targetFolderIdForDrop = overData.folder.id;
      } else if (overData?.type === 'note') {
        const targetNote = overData.note;
        if (activeId === targetNote.id) return;
        console.warn('Feature: Converting note to folder on drop is temporarily adjusted. Note type not changed.');
        targetFolderIdForDrop = targetNote.id;
      }

      if (itemToMove.type === 'folder' && targetFolderIdForDrop) {
        let currentParentId: string | null = targetFolderIdForDrop;
        while (currentParentId !== null) {
          if (currentParentId === activeId) {
            console.error('Cannot move folder into itself or a descendant.');
            alert('Cannot move folder into itself or a descendant.');
            return;
          }
          const parentFolder = notes.find(n => n.id === currentParentId);
          currentParentId = parentFolder ? parentFolder.parentId : null;
        }
      }

      if (itemToMove.type === 'note') {
        await moveNoteToFolder(activeId, targetFolderIdForDrop);
      } else if (itemToMove.type === 'folder') {
        if (itemToMove.parentId !== targetFolderIdForDrop) {
          await moveFolder(activeId, targetFolderIdForDrop);
        }
      }
    },
    [notes, moveNoteToFolder, moveFolder],
  );

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
      document.body.classList.add('resize-active');
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('resize-active');
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

  const handleDodaiSidebarNavigation = (pageOrPath: 'canvas' | 'notes' | string) => {
    if (pageOrPath === 'canvas') {
      setCurrentPage('canvas');
      const canvasUrl = chrome.runtime.getURL('pages/dodai-canvas/index.html');
      if (window.location.pathname !== '/pages/dodai-canvas/index.html') {
        window.location.href = canvasUrl;
      }
    } else if (pageOrPath === 'notes') {
      setCurrentPage('notes');
      if (window.location.pathname !== '/pages/notes-page/index.html') {
        // If already on notes page, ensure we are on the root of it if coming from canvas
        // window.location.href = chrome.runtime.getURL('pages/notes-page/index.html'); // Or simply ensure state is correct
      }
    } else if (typeof pageOrPath === 'string') {
      if (pageOrPath.startsWith('http') || pageOrPath.startsWith('chrome://extensions')) {
        chrome.tabs.create({ url: pageOrPath });
      } else if (pageOrPath.includes('dodai-canvas')) {
        setCurrentPage('canvas');
        const canvasUrl = chrome.runtime.getURL('pages/dodai-canvas/index.html');
        if (window.location.pathname !== '/pages/dodai-canvas/index.html') {
          window.location.href = canvasUrl;
        }
      }
    }
  };

  const handleSearchClick = useCallback(() => {
    console.log('Search clicked');
  }, []);

  const handleSettingsClick = useCallback(() => {
    chrome.runtime.openOptionsPage();
  }, []);

  const handleGithubClick = useCallback(() => {
    chrome.tabs.create({ url: 'https://github.com/assefdev/dodai-notes-chrome-extension' });
  }, []);

  const handleDodaiSidebarExpansionChange = useCallback((isExpanded: boolean) => {
    setIsDodaiSidebarExpanded(isExpanded);
  }, []);

  const navItems: NavItemProps[] = [
    {
      id: 'new-note',
      label: 'Nouvelle Note',
      icon: <Plus />,
      onClick: () => handleCreateNewNote(currentFolderId),
      isActive: false,
      title: 'Créer une nouvelle note',
    },
    {
      id: 'canvas',
      label: 'Canvas',
      icon: <LayoutGrid />,
      onClick: () => handleDodaiSidebarNavigation('canvas'),
      isActive: currentPage === 'canvas',
      title: 'Ouvrir Dodai Canvas',
    },
    {
      id: 'notes',
      label: 'Mes Notes',
      icon: <NotebookText />,
      onClick: () => handleDodaiSidebarNavigation('notes'),
      isActive: currentPage === 'notes',
      title: 'Afficher mes notes',
    },
    {
      id: 'search',
      label: 'Recherche',
      icon: <Search />,
      onClick: handleSearchClick,
      isActive: false,
      title: 'Rechercher dans les notes',
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: <Settings />,
      onClick: handleSettingsClick,
      isActive: false,
      title: 'Ouvrir les paramètres',
    },
    {
      id: 'github',
      label: 'GitHub',
      icon: <Github />,
      onClick: handleGithubClick,
      isActive: false,
      title: 'Voir le code source sur GitHub',
    },
  ];

  const lowerContentNotes = useMemo(() => {
    return (
      <DndContext sensors={sensors} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
        <div className="flex flex-col h-full overflow-hidden">
          {folderPath && folderPath.length > 0 && (
            <div className="p-2 border-b border-slate-700/60 flex-shrink-0">
              <FolderBreadcrumb path={folderPath} onNavigate={navigateToFolder} />
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {notes && notes.length > 0 ? (
              <RecursiveNoteTree
                notes={notes}
                parentId={currentFolderId}
                level={0}
                expandedFolders={expandedFolders}
                onToggleFolderExpand={handleToggleFolderExpand}
                selectedNoteId={selectedNote?.id || null}
                onSelectNote={handleSelectNoteItem}
                onNavigateToFolder={navigateToFolder}
                getChildrenOf={getChildrenOf}
                handleOpenContextMenu={handleOpenContextMenu}
              />
            ) : (
              <div className="text-center py-6 text-slate-500 text-sm">Aucune note ou dossier ici.</div>
            )}
          </div>
          {activeTag && (
            <div className="p-2 bg-slate-700/80 border-t border-slate-700 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center">
                <span className="text-xs text-slate-400 mr-2">Filtre actif:</span>
                <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-md"># {activeTag}</span>
              </div>
            </div>
          )}
        </div>
        <ContextMenu
          isVisible={contextMenu.isVisible}
          x={contextMenu.x}
          y={contextMenu.y}
          isFolder={contextMenu.isFolder}
          onClose={() => setContextMenu(prev => ({ ...prev, isVisible: false }))}
          onExport={handleExportItemContext}
          onDelete={handleDeleteItemContext}
        />
      </DndContext>
    );
  }, [
    notes,
    currentFolderId,
    folderPath,
    expandedFolders,
    selectedNote,
    activeTag,
    contextMenu,
    sensors,
    handleDragEnd,
    navigateToFolder,
    handleToggleFolderExpand,
    handleSelectNoteItem,
    getChildrenOf,
    handleOpenContextMenu,
    handleExportItemContext,
    handleDeleteItemContext,
  ]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      <main
        ref={mainContainerRef}
        className="flex-1 grid overflow-hidden relative"
        style={{
          gridTemplateColumns: `${isDodaiSidebarExpanded ? '256px' : '64px'} auto ${showRightSidebar && currentPage === 'notes' ? rightSidebarWidth + 'px' : '0'}`,
        }}>
        <DodaiSidebar
          navItems={navItems}
          lowerContentTitle={currentPage === 'notes' ? 'MES NOTES' : undefined}
          lowerContent={
            currentPage === 'notes' ? (
              lowerContentNotes
            ) : (
              <div className="p-4 text-slate-400 text-sm">Contenu spécifique au Canvas ici...</div>
            )
          }
          initialIsExpanded={isDodaiSidebarExpanded}
          onExpansionChange={handleDodaiSidebarExpansionChange}
        />

        {currentPage === 'notes' ? (
          <div className="flex flex-col overflow-hidden bg-slate-850 shadow-inner relative z-10">
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
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 bg-slate-850 p-8 h-full">
            <h2 className="text-2xl font-semibold mb-4">Page Canvas</h2>
            <p>Chargement du Canvas...</p>
          </div>
        )}

        {currentPage === 'notes' && showRightSidebar && (
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
        {currentPage === 'notes' && (
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
        )}
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
