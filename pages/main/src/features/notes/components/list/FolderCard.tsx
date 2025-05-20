import type React from 'react';
import { forwardRef } from 'react';
import type { NoteEntry } from '@extension/storage';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface FolderCardProps {
  folder: NoteEntry;
  isSelected: boolean;
  onSelect: (folder: NoteEntry) => void;
  onOpen: (folder: NoteEntry) => void;
  notesCount: number;
  onContextMenu: (event: React.MouseEvent, folder: NoteEntry) => void;
  isExpanded?: boolean;
  hasChildren?: boolean;
  onToggleExpand?: (folderId: string) => void;
}

const FolderCard = forwardRef<HTMLDivElement, FolderCardProps>(
  ({
    folder,
    isSelected,
    onSelect,
    onOpen,
    notesCount,
    onContextMenu,
    isExpanded = false,
    hasChildren = false,
    onToggleExpand,
  }) => {
    const {
      attributes,
      listeners,
      setNodeRef: setDragNodeRef,
      transform,
      isDragging,
    } = useDraggable({
      id: folder.id,
      data: {
        type: 'folder',
        folder,
      },
    });

    const { setNodeRef: setDropNodeRef, isOver } = useDroppable({
      id: `droppable-${folder.id}`,
      data: {
        type: 'folder',
        folderId: folder.id,
      },
    });

    const setNodeRef = (element: HTMLDivElement | null) => {
      setDragNodeRef(element);
      setDropNodeRef(element);
    };

    const style = transform
      ? {
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        }
      : {};

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        onOpen(folder);
      } else if (e.key === ' ') {
        e.preventDefault();
        onSelect(folder);
      }
    };

    const handleToggleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onToggleExpand && hasChildren) {
        onToggleExpand(folder.id);
      }
    };

    const handleChevronKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        if (onToggleExpand && hasChildren) {
          onToggleExpand(folder.id);
        }
      }
    };

    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className={`group relative flex items-center gap-2 pr-3 pl-1 py-2 rounded-lg cursor-pointer transition-colors duration-100 ease-in-out
          ${isSelected ? 'bg-background-tertiary shadow-md' : 'hover:bg-background-tertiary/70'}
          ${isDragging ? 'opacity-50 border-dashed border border-blue-400 bg-background-tertiary/60 shadow-lg scale-[1.01] z-10' : ''}
          ${isOver ? 'bg-background-quaternary/50 ring-1 ring-blue-500/40' : ''}`}
        onClick={() => onSelect(folder)}
        onDoubleClick={() => onOpen(folder)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected}
        aria-expanded={hasChildren ? isExpanded : undefined}
        style={style}
        onContextMenu={e => onContextMenu(e, folder)}>
        <div
          className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-slate-600 ${
            !hasChildren || !onToggleExpand ? 'invisible' : ''
          }`}
          onClick={handleToggleClick}
          onKeyDown={handleChevronKeyDown}
          aria-hidden={!hasChildren || !onToggleExpand}
          role="button"
          tabIndex={hasChildren && onToggleExpand ? 0 : -1}
          aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}>
          {hasChildren &&
            onToggleExpand &&
            (isExpanded ? (
              <ChevronDown size={18} className="text-text-muted group-hover:text-text-secondary" />
            ) : (
              <ChevronRight size={18} className="text-text-muted group-hover:text-text-secondary" />
            ))}
        </div>

        <div className={`w-5 h-5 flex-shrink-0 ${isSelected ? 'text-amber-400' : 'text-amber-500 group-hover:text-amber-400'}`}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path>
          </svg>
        </div>

        <h3 className={`font-medium truncate text-sm flex-grow ${isSelected ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>
          {folder.title || 'Dossier sans nom'}
        </h3>

        <div className="flex-shrink-0 ml-auto">
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${notesCount > 0 ? 'bg-slate-700 text-text-secondary group-hover:text-text-primary' : 'text-text-muted'}`}>
            {notesCount}
          </span>
        </div>

        {isOver && <div className="absolute inset-0 border border-blue-400/50 rounded-lg pointer-events-none"></div>}
      </div>
    );
  },
);

FolderCard.displayName = 'FolderCard';

export default FolderCard;
