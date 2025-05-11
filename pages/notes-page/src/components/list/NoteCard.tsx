import type React from 'react';
import { forwardRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { NoteEntry } from '@extension/storage';
import { useDraggable } from '@dnd-kit/core';

interface StyledText {
  type: 'text';
  text: string;
  styles: Record<string, string | boolean | number>; // Simplifié
}

interface Link {
  type: 'link';
  content: StyledText[];
  href: string;
}

type InlineContent = StyledText | Link;

interface PartialBlock {
  id?: string;
  type?: string;
  props?: Record<string, unknown>;
  content?: string | InlineContent[]; // Peut être une chaîne (Markdown) ou un tableau d'InlineContent
  children?: PartialBlock[];
}

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

  const extractTextFromBlockNoteContent = (contentJson: string): string => {
    if (!contentJson) {
      return 'Contenu vide';
    }

    try {
      // Essayons d'abord de voir si c'est une chaîne simple qui n'est pas du JSON
      if (
        typeof contentJson === 'string' &&
        contentJson.length < 200 && // Arbitraire, pour éviter de parser de grosses chaînes non JSON
        !contentJson.trim().startsWith('[') &&
        !contentJson.trim().startsWith('{')
      ) {
        // Si ce n'est pas du JSON (ne commence pas par [ ou {), retourner directement si c'est court
        const preview = contentJson.substring(0, 150);
        return preview.length === 150 ? preview + '...' : preview;
      }

      const blocks = JSON.parse(contentJson) as PartialBlock[];
      if (!Array.isArray(blocks)) {
        return 'Aperçu non disponible (format)';
      }

      let extractedText = '';
      for (const block of blocks) {
        if (block.content && Array.isArray(block.content)) {
          for (const item of block.content) {
            if (item.type === 'text') {
              extractedText += item.text + ' ';
            } else if (item.type === 'link' && item.content) {
              for (const linkTextItem of item.content) {
                if (linkTextItem.type === 'text') {
                  extractedText += linkTextItem.text + ' ';
                }
              }
            }
          }
        } else if (typeof block.content === 'string') {
          extractedText += block.content + ' ';
        }
      }

      if (!extractedText.trim()) {
        return 'Note vide';
      }

      const preview = extractedText.trim().substring(0, 150);
      return preview.length === 150 ? preview + '...' : preview;
    } catch {
      // console.warn('[NoteCard] Erreur parsing JSON du contenu:', error);
      // Si le parsing échoue, et que la chaîne originale est courte et ne ressemble pas à du JSON, l'afficher
      if (
        typeof contentJson === 'string' &&
        contentJson.length < 150 &&
        !contentJson.trim().startsWith('[') &&
        !contentJson.trim().startsWith('{')
      ) {
        return contentJson;
      }
      return 'Aperçu indisponible';
    }
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
      className={`relative p-3.5 rounded-md cursor-pointer transition-all duration-200
        ${
          isSelected
            ? 'bg-slate-700 shadow-md shadow-slate-900/30 ring-1 ring-blue-500/20'
            : 'bg-slate-800/90 hover:bg-slate-700/80 hover:shadow-sm hover:shadow-slate-900/10'
        } 
        ${
          isDragging ? 'opacity-70 border-dashed border-2 border-blue-400 bg-slate-700/60 shadow-lg scale-[1.01]' : ''
        }`}
      onClick={() => onSelect(note)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-pressed={isSelected}
      style={style}>
      {/* Sélection marker */}
      {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-md" />}

      <div className="flex items-center gap-2.5">
        <div className={`text-blue-400 w-5 h-5 flex-shrink-0 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`}>
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
        <h3 className={`font-medium truncate text-base leading-tight ${isSelected ? 'text-white' : 'text-slate-200'}`}>
          {note.title || 'Sans titre'}
        </h3>
      </div>

      <p className="text-slate-400 text-sm mt-2 line-clamp-2 ml-7">{extractTextFromBlockNoteContent(note.content)}</p>

      {/* Footer avec métadonnées */}
      <div className="mt-3 ml-7 flex flex-wrap items-center gap-y-2">
        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mr-auto">
            {note.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="text-xs px-1.5 py-0.5 rounded-full bg-slate-700/80 text-blue-300 border border-slate-600/30">
                #{tag}
              </span>
            ))}
            {note.tags.length > 3 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-700/80 text-slate-400 border border-slate-600/30">
                +{note.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Info */}
        <div className="flex items-center gap-2 text-xs text-slate-500 ml-auto">
          {/* Date */}
          <span className="flex items-center">
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
            {formatDate(note.updatedAt)}
          </span>

          {/* Source Web */}
          {note.sourceUrl && (
            <span className="flex items-center text-blue-400">
              <svg
                className="w-3 h-3 mr-1"
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
    </div>
  );
});

NoteCard.displayName = 'NoteCard';

export default NoteCard;
