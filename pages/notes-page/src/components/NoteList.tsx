import type React from 'react';
import type { NoteEntry } from '@extension/storage';
import NoteCard from './NoteCard';
import ScratchpadCard from './ScratchpadCard';
import SortOptions from './SortOptions';
import type { SortOption } from '../hooks/useFilterAndSort';

interface NoteListProps {
  notes: NoteEntry[];
  scratchpad: NoteEntry | null;
  selectedNoteId: string | null;
  sortOption: SortOption;
  onSelectNote: (note: NoteEntry) => void;
  onCreateNote: () => Promise<NoteEntry | null>;
  onClearScratchpad: () => Promise<NoteEntry | null>;
  onSortChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

const NoteList: React.FC<NoteListProps> = ({
  notes,
  scratchpad,
  selectedNoteId,
  sortOption,
  onSelectNote,
  onCreateNote,
  onClearScratchpad,
  onSortChange,
}) => {
  return (
    <section className="md:col-span-1 bg-gray-800 rounded-lg p-4 h-[calc(100vh-150px)] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-blue-400">Mes Notes</h2>
        <button
          onClick={onCreateNote}
          className="p-1.5 bg-blue-600 hover:bg-blue-700 rounded-full text-white transition flex items-center justify-center"
          title="Créer une nouvelle note">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Sort options */}
      <SortOptions value={sortOption} onChange={onSortChange} />

      {/* Scratchpad */}
      {scratchpad && (
        <ScratchpadCard
          scratchpad={scratchpad}
          isSelected={selectedNoteId === scratchpad.id}
          onSelect={onSelectNote}
          onClear={() => onClearScratchpad()}
        />
      )}

      {/* Notes list */}
      {notes.length === 0 && !scratchpad ? (
        <div className="text-center py-8">
          <p className="text-gray-400 italic mb-4">Aucune note pour le moment</p>
          <button
            onClick={onCreateNote}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white transition">
            Créer ma première note
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map(note => (
            <NoteCard key={note.id} note={note} isSelected={selectedNoteId === note.id} onSelect={onSelectNote} />
          ))}
        </div>
      )}
    </section>
  );
};

export default NoteList;
