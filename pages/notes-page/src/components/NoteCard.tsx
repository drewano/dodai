import type React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { NoteEntry } from '@extension/storage';

interface NoteCardProps {
  note: NoteEntry;
  isSelected: boolean;
  onSelect: (note: NoteEntry) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, isSelected, onSelect }) => {
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
      className={`p-3 rounded-md cursor-pointer hover:bg-gray-700 transition ${
        isSelected ? 'bg-gray-700 border-l-4 border-blue-400' : ''
      }`}
      onClick={() => onSelect(note)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-pressed={isSelected}>
      <h3 className="font-medium truncate">{note.title}</h3>
      <p className="text-gray-400 text-sm mt-1 truncate">
        {note.content.substring(0, 60)}
        {note.content.length > 60 ? '...' : ''}
      </p>

      {/* Display tags if present */}
      {note.tags && note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
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
};

export default NoteCard;
