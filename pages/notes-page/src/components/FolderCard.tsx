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
        className={`p-3 rounded-md cursor-pointer hover:bg-gray-700 transition ${
          isSelected ? 'bg-gray-700 border-l-4 border-blue-400' : ''
        } ${isDragging ? 'opacity-50 border-dashed border-2 border-blue-400' : ''}
      ${isOver ? 'bg-gray-600 border-2 border-blue-300' : ''}`}
        onClick={() => onSelect(folder)}
        onDoubleClick={() => onOpen(folder)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-pressed={isSelected}
        style={style}>
        <div className="flex items-center gap-2">
          <div className="text-blue-300">
            {isOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z"
                  clipRule="evenodd"
                />
                <path d="M6 12a2 2 0 012-2h8a2 2 0 012 2v2a2 2 0 01-2 2H2h2a2 2 0 002-2v-2z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
            )}
          </div>
          <h3 className="font-medium truncate flex-grow">{folder.title}</h3>
        </div>

        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-500">{formatDate(folder.updatedAt)}</span>
          <span className="text-xs text-gray-400">
            {notesCount} élément{notesCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    );
  },
);

FolderCard.displayName = 'FolderCard';

export default FolderCard;
