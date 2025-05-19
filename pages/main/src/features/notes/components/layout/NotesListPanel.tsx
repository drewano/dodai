import type React from 'react';
import { /* useState, */ useCallback, useMemo } from 'react';
import type { NoteEntry } from '@extension/storage';
// import { exportNoteToMarkdown } from '@extension/shared'; // Unused import removed in previous steps
import NoteCard from '../list/NoteCard';
import FolderCard from '../list/FolderCard';
import { DndContext, useSensor, useSensors, MouseSensor, TouchSensor, closestCenter } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import ContextMenu from '../common/ContextMenu';

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

// Props for NotesListPanel (formerly LeftSidebarProps)
export interface NotesListPanelProps {
  // Renamed from LeftSidebarProps
  notes: NoteEntry[];
  currentFolderId: string | null;
  selectedNoteId: string | null;
  activeTag: string | null;
  onSelectNote: (note: NoteEntry | null) => void;
  // onCreateNote: (parentId?: string | null) => Promise<NoteEntry | null>; // To be handled by NavItems
  onNavigateToFolder: (folderId: string | null) => void;
  onMoveNoteToFolder: (noteId: string, folderId: string | null) => Promise<void>;
  onMoveFolder: (folderId: string, targetFolderId: string | null) => Promise<void>;
  getChildrenOf: (folderId: string) => NoteEntry[];
  onDeleteItem: (id: string) => Promise<void>;
  onUpdateNote: (id: string, updates: Partial<Omit<NoteEntry, 'id'>>) => Promise<void>;

  // Props for RecursiveNoteTree that need to be bubbled up or managed here
  expandedFolders: Record<string, boolean>;
  onToggleFolderExpand: (folderId: string) => void;
  handleOpenContextMenu: (event: React.MouseEvent, item: NoteEntry, isFolderItem?: boolean) => void;

  // Props for ContextMenu
  contextMenuState: ContextMenuState;
  onCloseContextMenu: () => void;
  onExportContextMenuItem: () => Promise<void>;
  onDeleteContextMenuItem: () => Promise<void>;
}

// Renamed ContextMenuState to be more specific if used only here, or keep as is if shared
interface ContextMenuState {
  isVisible: boolean;
  x: number;
  y: number;
  targetItem: NoteEntry | null;
  isFolder: boolean;
}

// --- Recursive Component for Hierarchy ---
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
        // Ensure title exists for sorting, default to empty string if not
        const titleA = a.title || '';
        const titleB = b.title || '';
        return titleA.localeCompare(titleB);
      });
  }, [notes, parentId]);

  if (children.length === 0 && level === 0 && parentId === null) {
    // Adjusted condition for root empty state
    return (
      <div className="p-4 text-center text-slate-500 text-sm">
        Aucune note ou dossier ici.
        <br />
        Cliquez sur '+' dans la barre latérale pour commencer.
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
              onContextMenu={event => handleOpenContextMenu(event, item)}
            />
          );
        }
      })}
    </div>
  );
};
// --- End Recursive Component ---

// --- Main NotesListPanel Component (formerly LeftSidebar) ---
const NotesListPanel: React.FC<NotesListPanelProps> = ({
  notes,
  currentFolderId, // This will be the parentId for the root level of RecursiveNoteTree
  selectedNoteId,
  activeTag,
  onSelectNote,
  onNavigateToFolder,
  onMoveNoteToFolder,
  onMoveFolder,
  getChildrenOf,
  // onDeleteItem, // Will be passed to ContextMenu handler
  onUpdateNote,
  expandedFolders,
  onToggleFolderExpand,
  handleOpenContextMenu,
  contextMenuState,
  onCloseContextMenu,
  onExportContextMenuItem,
  onDeleteContextMenuItem,
}) => {
  // Removed: useState for isSearchActive
  // Removed: useState for contextMenu (now passed as prop: contextMenuState)
  // Removed: useState for expandedFolders (now passed as prop)

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

      // const activeData = active.data.current as DragData | undefined; // Unused variable removed in previous steps
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
        // Convert note to folder if a note is dropped onto another note.
        // This logic might need refinement based on desired UX.
        // For now, we assume the targetNote might become a folder or its parent is used.
        // Simplified: drop into the same parent as the target note, or make target note a folder.
        // This was complex. Let's ensure it uses onUpdateNote to change type and then moves.
        console.warn('Feature: Converting note to folder on drop needs review.');
        // Defaulting to moving into the parent of the target note.
        // Or, if the intent is to make targetNote a folder:
        // await onUpdateNote(targetNote.id, { type: 'folder', content: '' });
        // targetFolderIdForDrop = targetNote.id;
        // For now, let's assume it's about placing it relative to the note in its current parent.
        // This drag logic is complex and might need a separate session.
        // The provided existing logic is:
        await onUpdateNote(targetNote.id, {
          type: 'folder',
          content: '', // Clearing content when converting to folder
        });
        targetFolderIdForDrop = targetNote.id; // Target is the new folder
      }

      if (targetFolderIdForDrop && itemToMove.id === targetFolderIdForDrop) return; // Cannot drop on itself

      // Prevent moving a folder into itself or its descendants
      if (itemToMove.type === 'folder') {
        let currentParentCheck: string | null = targetFolderIdForDrop;
        while (currentParentCheck !== null) {
          if (currentParentCheck === itemToMove.id) {
            console.error('Cannot move folder into itself or a descendant.');
            alert('Cannot move folder into itself or a descendant.');
            return;
          }
          const parentFolder = notes.find(n => n.id === currentParentCheck);
          currentParentCheck = parentFolder ? parentFolder.parentId : null;
        }
      }

      if (itemToMove.type === 'note') {
        await onMoveNoteToFolder(activeId, targetFolderIdForDrop);
      } else if (itemToMove.type === 'folder') {
        if (itemToMove.parentId !== targetFolderIdForDrop) {
          // Avoid redundant move if already in target
          await onMoveFolder(activeId, targetFolderIdForDrop);
        }
      }
    },
    [notes, onMoveNoteToFolder, onMoveFolder, onUpdateNote],
  );

  // Removed: handleOpenContextMenu (passed as prop)
  // Removed: handleExportItem (passed as prop: onExportContextMenuItem)
  // Removed: handleDeleteItemContext (passed as prop: onDeleteContextMenuItem)
  // Removed: handleToggleFolderExpand (passed as prop)
  // Removed: Header button handlers (handleSearchClick, handleNewNoteClick, handleSettingsClick, handleCanvasClick)

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
      <div className="h-full flex flex-col overflow-hidden bg-transparent text-slate-100 select-none">
        {/* Header removed */}

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
          {' '}
          {/* Adjusted padding slightly */}
          {notes && (notes.length > 0 || currentFolderId !== null) ? ( // Show tree even if current folder is empty but exists
            <RecursiveNoteTree
              notes={notes}
              parentId={currentFolderId} // Display content of the current folder
              level={0}
              expandedFolders={expandedFolders}
              onToggleFolderExpand={onToggleFolderExpand}
              selectedNoteId={selectedNoteId}
              onSelectNote={onSelectNote}
              onNavigateToFolder={onNavigateToFolder}
              getChildrenOf={getChildrenOf}
              handleOpenContextMenu={handleOpenContextMenu}
            />
          ) : (
            <div className="p-4 text-center text-slate-500 text-sm">
              Aucune note ou dossier ici.
              <br />
              Cliquez sur '+' dans la barre latérale pour commencer.
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

        {/* Footer removed */}

        {/* Context Menu Rendering */}
        <ContextMenu
          isVisible={contextMenuState.isVisible}
          x={contextMenuState.x}
          y={contextMenuState.y}
          isFolder={contextMenuState.isFolder}
          onClose={onCloseContextMenu}
          onExport={onExportContextMenuItem}
          onDelete={onDeleteContextMenuItem}
          // Add other actions if necessary, e.g., rename
        />
      </div>
    </DndContext>
  );
};

export default NotesListPanel; // Renamed export
