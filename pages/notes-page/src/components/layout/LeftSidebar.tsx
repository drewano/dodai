import type React from 'react';
import { useState, useCallback, useMemo } from 'react';
import type { NoteEntry } from '@extension/storage';
import { exportNoteToMarkdown } from '@extension/shared';
import NoteCard from '../list/NoteCard';
import FolderCard from '../list/FolderCard';
import { DndContext, useSensor, useSensors, MouseSensor, TouchSensor, closestCenter } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import ContextMenu from '../common/ContextMenu';
import { Search, Plus, Settings, Github, LayoutGrid } from 'lucide-react';

// Types pour les données de drag-and-drop
interface DragDataNote {
  type: 'note';
  note: NoteEntry;
}

interface DragDataFolder {
  type: 'folder';
  folder: NoteEntry;
  folderId?: string;
}

type DragData = DragDataNote | DragDataFolder;

interface LeftSidebarProps {
  notes: NoteEntry[];
  currentFolderId: string | null;
  selectedNoteId: string | null;
  activeTag: string | null;
  onSelectNote: (note: NoteEntry | null) => void;
  onCreateNote: (parentId?: string | null) => Promise<NoteEntry | null>;
  onNavigateToFolder: (folderId: string | null) => void;
  onMoveNoteToFolder: (noteId: string, folderId: string | null) => Promise<void>;
  onMoveFolder: (folderId: string, targetFolderId: string | null) => Promise<void>;
  getChildrenOf: (folderId: string) => NoteEntry[];
  onDeleteItem: (id: string) => Promise<void>;
  onUpdateNote: (id: string, updates: Partial<Omit<NoteEntry, 'id'>>) => Promise<void>;
}

// Ajouté : Type pour l'état du menu contextuel
interface ContextMenuState {
  isVisible: boolean;
  x: number;
  y: number;
  targetItem: NoteEntry | null;
  isFolder: boolean;
}

// --- New Recursive Component for Hierarchy ---
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
  // Filter and sort children (same as before)
  const children = useMemo(() => {
    // ... (sorting logic remains the same)
    return notes
      .filter(note => note.parentId === parentId)
      .sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        return a.title.localeCompare(b.title);
      });
  }, [notes, parentId]);

  // ... (empty state check remains the same)

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
              onContextMenu={event => handleOpenContextMenu(event, item)}
            />
          );
        }
      })}
    </div>
  );
};
// --- End Recursive Component ---

// --- Main LeftSidebar Component ---
const LeftSidebar: React.FC<LeftSidebarProps> = ({
  notes,
  currentFolderId,
  selectedNoteId,
  activeTag,
  onSelectNote,
  onCreateNote,
  onNavigateToFolder,
  onMoveNoteToFolder,
  onMoveFolder,
  getChildrenOf,
  onDeleteItem,
  onUpdateNote,
}) => {
  const [isSearchActive, setIsSearchActive] = useState(false);
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

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!active || !over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      if (activeId === overId) return;

      const activeData = active.data.current as DragData | undefined;
      const overData = over.data.current as DragData | undefined;

      const itemToMove = notes.find(n => n.id === activeId);
      if (!itemToMove) return;

      if (overId.startsWith('droppable-')) {
        const targetFolderId = overId.replace('droppable-', '');
        if (itemToMove.id === targetFolderId) return;

        if (itemToMove.type === 'folder') {
          let currentParentId: string | null = targetFolderId;
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
          await onMoveNoteToFolder(activeId, targetFolderId);
        } else if (itemToMove.type === 'folder') {
          if (itemToMove.parentId !== targetFolderId) {
            await onMoveFolder(activeId, targetFolderId);
          }
        }
      } else if (overData?.type === 'note') {
        const targetNote = overData.note;
        if (activeId === targetNote.id) return;

        if (activeData?.type === 'note') {
          await onUpdateNote(targetNote.id, {
            type: 'folder',
            content: '',
          });
          await onMoveNoteToFolder(activeId, targetNote.id);
        } else if (activeData?.type === 'folder') {
          const folderToMove = activeData.folder;
          let currentParentIdOfNote = targetNote.parentId;
          while (currentParentIdOfNote !== null) {
            if (currentParentIdOfNote === folderToMove.id) {
              console.error('Cannot make a note a parent of its own ancestor folder.');
              alert('Cannot make a note a parent of its own ancestor folder.');
              return;
            }
            const parentFolder = notes.find(n => n.id === currentParentIdOfNote);
            currentParentIdOfNote = parentFolder ? parentFolder.parentId : null;
          }
          await onUpdateNote(targetNote.id, { type: 'folder', content: '' });
          await onMoveFolder(folderToMove.id, targetNote.id);
        }
      } else if (overData?.type === 'folder') {
        const targetFolder = overData.folder;
        if (activeId === targetFolder.id) return;

        if (itemToMove.type === 'folder') {
          let currentParentId: string | null = targetFolder.id;
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
          await onMoveNoteToFolder(activeId, targetFolder.id);
        } else if (itemToMove.type === 'folder') {
          if (itemToMove.parentId !== targetFolder.id) {
            await onMoveFolder(activeId, targetFolder.id);
          }
        }
      } else if (over === null) {
        if (activeData?.type === 'note') {
          await onMoveNoteToFolder(activeId, null);
        } else if (activeData?.type === 'folder') {
          await onMoveFolder(activeId, null);
        }
      }
    },
    [notes, onMoveNoteToFolder, onMoveFolder, onUpdateNote],
  );

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

  const handleExportItem = useCallback(async () => {
    if (contextMenu.targetItem && contextMenu.targetItem.type !== 'folder') {
      try {
        await exportNoteToMarkdown(contextMenu.targetItem);
      } catch (error) {
        console.error("Erreur lors de l'export via menu contextuel:", error);
        alert("Erreur lors de l'exportation.");
      }
    }
  }, [contextMenu.targetItem]);

  const handleDeleteItemContext = useCallback(async () => {
    if (contextMenu.targetItem) {
      const itemToDelete = contextMenu.targetItem;
      const confirmMessage = `Êtes-vous sûr de vouloir supprimer "${itemToDelete.title || (itemToDelete.type === 'folder' ? 'ce dossier' : 'cette note')}"${
            itemToDelete.type === 'folder' ? ' et tout son contenu' : ''
          } ?`;

      if (window.confirm(confirmMessage)) {
        try {
          await onDeleteItem(itemToDelete.id);
        } catch (error) {
          console.error('Erreur lors de la suppression via menu contextuel:', error);
          alert('Erreur lors de la suppression.');
        }
      }
    }
  }, [contextMenu.targetItem, onDeleteItem]);

  const handleToggleFolderExpand = useCallback((folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  }, []);

  const handleSearchClick = useCallback(() => {
    setIsSearchActive(prev => !prev);
    console.log('Search toggled', !isSearchActive);
  }, [isSearchActive]);

  const handleNewNoteClick = useCallback(() => {
    onCreateNote(currentFolderId);
  }, [onCreateNote, currentFolderId]);

  const handleSettingsClick = useCallback(() => {
    chrome.runtime.openOptionsPage();
  }, []);

  const handleCanvasClick = useCallback(() => {
    const canvasUrl = chrome.runtime.getURL('pages/dodai-canvas/index.html');
    chrome.tabs.create({ url: canvasUrl });
  }, []);

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
      <div className="h-full flex flex-col overflow-hidden bg-slate-800 text-slate-100 select-none">
        {/* Header */}
        <div className="p-3 flex items-center justify-end gap-2 border-b border-slate-700/70 flex-shrink-0">
          <button
            onClick={handleCanvasClick}
            className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors"
            aria-label="Dodai Canvas"
            title="Open Dodai Canvas">
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={handleSearchClick}
            className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors"
            aria-label="Search Notes"
            title="Search Notes">
            <Search size={18} />
          </button>
          <button
            onClick={handleNewNoteClick}
            className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors"
            aria-label="New Note"
            title="Create New Note">
            <Plus size={18} />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {notes && notes.length > 0 ? (
            <RecursiveNoteTree
              notes={notes}
              parentId={null}
              level={0}
              expandedFolders={expandedFolders}
              onToggleFolderExpand={handleToggleFolderExpand}
              selectedNoteId={selectedNoteId}
              onSelectNote={onSelectNote}
              onNavigateToFolder={onNavigateToFolder}
              getChildrenOf={getChildrenOf}
              handleOpenContextMenu={handleOpenContextMenu}
            />
          ) : (
            <div className="text-center py-6 text-slate-500 text-sm">
              No notes or folders yet. <br />
              Click 'New Note' to start.
            </div>
          )}
        </div>

        {/* Active Tag Indicator */}
        {activeTag && (
          <div className="p-2 bg-slate-700/80 border-t border-slate-700 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center">
              <span className="text-xs text-slate-400 mr-2">Filtre actif:</span>
              <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-md"># {activeTag}</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-2 border-t border-slate-700/70 flex items-center justify-between flex-shrink-0">
          <button
            onClick={handleSettingsClick}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded text-sm text-slate-300 hover:text-slate-100 hover:bg-slate-700 transition-colors">
            <Settings size={16} className="text-slate-400" />
            Settings
          </button>
          <a
            href="https://github.com/assefdev/dodai-notes-chrome-extension" // Replace with your actual repo URL
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors"
            aria-label="View Source on GitHub"
            title="View Source on GitHub">
            <Github size={18} />
          </a>
        </div>

        {/* Context Menu Rendering */}
        <ContextMenu
          isVisible={contextMenu.isVisible}
          x={contextMenu.x}
          y={contextMenu.y}
          isFolder={contextMenu.isFolder}
          onClose={() => setContextMenu(prev => ({ ...prev, isVisible: false }))}
          onExport={handleExportItem}
          onDelete={handleDeleteItemContext}
        />
      </div>
    </DndContext>
  );
};

export default LeftSidebar;
