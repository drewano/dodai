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
    if (window.confirm('Êtes-vous sûr de vouloir vider le Scratchpad ?')) {
      onClear();
    }
  };

  return (
    <div
      className={`mb-4 p-3 rounded-md cursor-pointer bg-gradient-to-r from-blue-900/70 to-slate-800 border border-blue-600/50 hover:from-blue-800/70 hover:to-slate-700 transition-all duration-200 shadow-sm ${
        isSelected ? 'ring-2 ring-blue-500/50' : ''
      }`}
      onClick={() => onSelect(scratchpad)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-pressed={isSelected}>
      <div className="flex justify-between items-center">
        <h3 className="font-semibold flex items-center text-blue-100">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 text-blue-300">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          Scratchpad
        </h3>
        <button
          onClick={handleClear}
          aria-label="Vider le scratchpad"
          className="text-slate-300 hover:text-white p-1 rounded-full hover:bg-red-500/20 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/30"
          title="Vider le Scratchpad">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-slate-300 hover:text-red-300">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </button>
      </div>
      <p className="text-slate-300 text-sm mt-1 truncate">Capturez rapidement des contenus web et des idées</p>
      <div className="flex items-center mt-2 text-xs text-blue-300/90">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-1">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        {formatDate(scratchpad.updatedAt)}
      </div>
    </div>
  );
};

export default ScratchpadCard;
