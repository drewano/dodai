import type React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { NoteEntry } from '@extension/storage';

interface ScratchpadCardProps {
  scratchpad: NoteEntry;
  isSelected: boolean;
  onSelect: (note: NoteEntry) => void;
  onClear: () => void;
}

const ScratchpadCard: React.FC<ScratchpadCardProps> = ({ scratchpad, isSelected, onSelect, onClear }) => {
  // Format the date for display
  const formatDate = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: fr });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      onSelect(scratchpad);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClear();
  };

  return (
    <div
      className={`mb-4 p-3 rounded-md cursor-pointer bg-gradient-to-r from-blue-900 to-gray-800 border border-blue-500 hover:bg-blue-800 transition ${
        isSelected ? 'border-l-4 border-blue-400' : ''
      }`}
      onClick={() => onSelect(scratchpad)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-pressed={isSelected}>
      <div className="flex justify-between items-center">
        <h3 className="font-bold flex items-center">
          <span className="mr-2">📥</span>
          Scratchpad
        </h3>
        {isSelected && (
          <button
            onClick={handleClear}
            className="text-xs px-2 py-1 bg-gray-700 hover:bg-red-700 rounded text-gray-300 hover:text-white transition"
            title="Vider le Scratchpad">
            Vider
          </button>
        )}
      </div>
      <p className="text-gray-300 text-sm mt-1 truncate">Capturez rapidement des contenus web et des idées</p>
      <div className="flex items-center mt-2 text-xs text-blue-300">
        <span className="mr-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
        </span>
        {formatDate(scratchpad.updatedAt)}
      </div>
    </div>
  );
};

export default ScratchpadCard;
