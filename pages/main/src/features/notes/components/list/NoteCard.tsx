import type React from 'react';
import { forwardRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { NoteEntry } from '@extension/storage';
import { useDraggable, useDroppable } from '@dnd-kit/core';

interface NoteCardProps {
  note: NoteEntry;
  isSelected: boolean;
  onSelect: (note: NoteEntry) => void;
  onContextMenu: (event: React.MouseEvent, note: NoteEntry) => void;
}

const NoteCard = forwardRef<HTMLDivElement, NoteCardProps>(({ note, isSelected, onSelect, onContextMenu }) => {
  // Configuration du draggable
  const {
    attributes,
    listeners,
    setNodeRef: setDragNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: note.id,
    data: {
      type: 'note',
      note,
    },
  });

  const { setNodeRef: setDropNodeRef, isOver } = useDroppable({
    id: note.id, // Use note.id as the droppable ID
    data: {
      type: 'note', // Keep type as 'note' for over.data.current.note to work
      note: note,
    },
  });

  const setNodeRef = (element: HTMLDivElement | null) => {
    setDragNodeRef(element);
    setDropNodeRef(element); // Combine refs
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
    if (e.key === 'Enter' || e.key === ' ') {
      onSelect(note);
    }
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`relative p-3 rounded-lg cursor-pointer transition-all duration-150 ease-in-out group
        ${
          isSelected
            ? 'bg-background-tertiary shadow-lg shadow-slate-900/40 ring-2 ring-border-accent'
            : 'bg-background-tertiary/60 hover:bg-background-tertiary/90 hover:shadow-md hover:shadow-slate-900/20'
        }
        ${isDragging ? 'opacity-60 border-dashed border-2 border-blue-400 bg-background-tertiary/80 shadow-xl scale-[1.02] z-10' : ''}
        ${isOver ? 'ring-2 ring-green-500/70 bg-background-tertiary/90 shadow-lg' : ''}`}
      onClick={() => onSelect(note)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-pressed={isSelected}
      style={style}
      onContextMenu={e => onContextMenu(e, note)}>
      {/* Sélection marker - more subtle */}
      {isSelected && <div className="absolute left-0 top-2 bottom-2 w-1 bg-border-accent rounded-r-full" />}

      <div className="flex items-center gap-3">
        <div
          className={`flex-shrink-0 w-5 h-5 ${isSelected ? 'text-text-accent' : 'text-text-secondary group-hover:text-text-accent'}`}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
          </svg>
        </div>
        <h3
          className={`font-medium truncate text-sm leading-tight ${isSelected ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>
          {note.title || 'Sans titre'}
        </h3>
      </div>

      {/* Footer avec métadonnées */}
      <div className="mt-2.5 ml-8 flex flex-col gap-2 text-xs">
        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {note.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-md bg-slate-700/70 text-sky-300 group-hover:bg-slate-600/70 group-hover:text-sky-200 border border-slate-600/50">
                {tag} {/* Removed #, assuming tags are stored without it, or add it here if needed */}
              </span>
            ))}
            {note.tags.length > 3 && (
              <span className="text-xs px-2 py-0.5 rounded-md bg-slate-700/70 text-text-muted group-hover:bg-slate-600/70 border border-slate-600/50">
                +{note.tags.length - 3} autres
              </span>
            )}
          </div>
        )}

        {/* Info - Source Web only if it exists, date can be more subtle or integrated elsewhere if too cluttered */}
        <div className="flex items-center gap-2 text-text-muted">
          {/* Date - can be made more subtle if needed */}
          <span className="flex items-center">
            <svg
              className="w-3 h-3 mr-1 flex-shrink-0"
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
            {formatDate(note.updatedAt)}
          </span>
          {note.sourceUrl && (
            <span className="flex items-center text-blue-400 hover:text-blue-300 transition-colors">
              <svg
                className="w-3 h-3 mr-1 flex-shrink-0"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              Web
            </span>
          )}
        </div>
      </div>
      {isOver && (
        <div
          className="absolute inset-0 bg-green-600 opacity-10 rounded-lg pointer-events-none ring-1 ring-green-500"
          aria-hidden="true"></div>
      )}
    </div>
  );
});

NoteCard.displayName = 'NoteCard';

export default NoteCard;
