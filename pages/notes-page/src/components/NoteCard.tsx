import type React from 'react';
import { forwardRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { NoteEntry } from '@extension/storage';
import { useDraggable } from '@dnd-kit/core';

interface NoteCardProps {
  note: NoteEntry;
  isSelected: boolean;
  onSelect: (note: NoteEntry) => void;
}

const NoteCard = forwardRef<HTMLDivElement, NoteCardProps>(({ note, isSelected, onSelect }) => {
  // Configuration du draggable
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: note.id,
    data: {
      type: 'note',
      note,
    },
  });

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
      className={`p-3 rounded-md cursor-pointer hover:bg-gray-700 transition ${
        isSelected ? 'bg-gray-700 border-l-4 border-blue-400' : ''
      } ${isDragging ? 'opacity-50 border-dashed border-2 border-blue-400' : ''}`}
      onClick={() => onSelect(note)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-pressed={isSelected}
      style={style}>
      <div className="flex items-center gap-2">
        <div className="text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h3 className="font-medium truncate">{note.title}</h3>
      </div>

      <p className="text-gray-400 text-sm mt-1 truncate ml-6">
        {note.content.substring(0, 60)}
        {note.content.length > 60 ? '...' : ''}
      </p>

      {/* Display tags if present */}
      {note.tags && note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1 ml-6">
          {note.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-xs bg-gray-600 text-blue-300 px-1.5 py-0.5 rounded">
              #{tag}
            </span>
          ))}
          {note.tags.length > 3 && <span className="text-xs text-gray-400">+{note.tags.length - 3}</span>}
        </div>
      )}

      <div className="flex justify-between items-center mt-2">
        <span className="text-xs text-gray-500">{formatDate(note.updatedAt)}</span>
        {note.sourceUrl && <span className="text-xs text-blue-400">Source web</span>}
      </div>
    </div>
  );
});

NoteCard.displayName = 'NoteCard';

export default NoteCard;
