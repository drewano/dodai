import type React from 'react';
import { forwardRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { NoteEntry } from '@extension/storage';
import { useDraggable, useDroppable } from '@dnd-kit/core';

interface FolderCardProps {
  folder: NoteEntry;
  isSelected: boolean;
  isOpen?: boolean;
  onSelect: (folder: NoteEntry) => void;
  onOpen: (folder: NoteEntry) => void;
  notesCount: number;
}

const FolderCard = forwardRef<HTMLDivElement, FolderCardProps>(
  ({ folder, isSelected, isOpen = false, onSelect, onOpen, notesCount }) => {
    // Configuration du draggable
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

    // Configuration du droppable
    const { setNodeRef: setDropNodeRef, isOver } = useDroppable({
      id: `droppable-${folder.id}`,
      data: {
        type: 'folder',
        folderId: folder.id,
      },
    });

    // Combiner les refs
    const setNodeRef = (element: HTMLDivElement | null) => {
      setDragNodeRef(element);
      setDropNodeRef(element);
    };

    const style = transform
      ? {
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        }
      : undefined;

    // Format the date for display
    const formatDate = (timestamp: number) => {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: fr });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        onOpen(folder);
      } else if (e.key === ' ') {
        e.preventDefault();
        onSelect(folder);
      }
    };

    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className={`relative p-3.5 rounded-md cursor-pointer transition-all duration-200
          ${
            isSelected
              ? 'bg-slate-700 shadow-md shadow-slate-900/30 ring-1 ring-blue-500/20'
              : 'bg-slate-800/70 hover:bg-slate-700/70 hover:shadow-sm hover:shadow-slate-900/10'
          } 
          ${
            isDragging ? 'opacity-70 border-dashed border-2 border-blue-400 bg-slate-700/60 shadow-lg scale-[1.01]' : ''
          }
          ${isOver ? 'bg-slate-700/90 ring-2 ring-blue-400/30 shadow-md' : ''}`}
        onClick={() => onSelect(folder)}
        onDoubleClick={() => onOpen(folder)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected}
        style={style}>
        {/* Sélection marker */}
        {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-md" />}

        <div className="flex items-center gap-2.5">
          <div
            className={`text-blue-400 w-5 h-5 flex-shrink-0 ${isOpen ? 'text-amber-400' : isSelected ? 'text-blue-400' : 'text-amber-300/80'}`}>
            {isOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <path d="M5 19a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l2 2h4a2 2 0 0 1 2 2v1" />
                <path d="M15 13h5v6a2 2 0 0 1-2 2h-15" />
                <path d="M9 16h1" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <path d="M5 4h4l2 2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
              </svg>
            )}
          </div>
          <h3
            className={`font-medium truncate text-base leading-tight flex-grow ${isSelected ? 'text-white' : 'text-slate-200'}`}>
            {folder.title || 'Dossier sans nom'}
          </h3>
        </div>

        {/* Information du dossier */}
        <div className="mt-3 ml-7 flex items-center justify-between">
          <div className="flex items-center text-xs text-slate-500">
            <svg
              className="w-3 h-3 mr-1 text-slate-500"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {formatDate(folder.updatedAt)}
          </div>

          <div className="flex items-center">
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                notesCount > 0
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-slate-700/80 text-slate-400 border border-slate-600/40'
              }`}>
              <span className="flex items-center">
                <svg
                  className="w-3 h-3 mr-1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                  <path d="M14 3v5h5" />
                </svg>
                {notesCount} élément{notesCount !== 1 ? 's' : ''}
              </span>
            </span>
          </div>
        </div>

        {/* Indicateur visuel pour le drag & drop */}
        {isOver && <div className="absolute inset-0 border-2 border-blue-400/40 rounded-md pointer-events-none"></div>}
      </div>
    );
  },
);

FolderCard.displayName = 'FolderCard';

export default FolderCard;
