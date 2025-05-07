import type React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import type { NoteEntry } from '@extension/storage';

interface NoteViewerProps {
  note: NoteEntry;
  onEdit: () => void;
  onDelete: () => void;
  onExport: () => void;
}

const NoteViewer: React.FC<NoteViewerProps> = ({ note, onEdit, onDelete, onExport }) => {
  // Format the date for display
  const formatDate = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: fr });
  };

  return (
    <div className="space-y-4 flex-1">
      {/* Action buttons */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold text-blue-400">{note.title}</h2>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={onEdit}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors">
            Modifier
          </button>
          <button
            onClick={onExport}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors">
            Exporter en MD
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors">
            Supprimer
          </button>
        </div>
      </div>

      {/* Date info */}
      <div className="flex justify-between items-center text-sm text-gray-400">
        <span>Modifié {formatDate(note.updatedAt)}</span>
        <span>Créé {formatDate(note.createdAt)}</span>
      </div>

      {/* Tags */}
      {note.tags && note.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 py-2">
          {note.tags.map(tag => (
            <span key={tag} className="bg-gray-700 text-blue-300 px-2 py-1 rounded-full text-sm">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Source URL if present */}
      {note.sourceUrl && (
        <div className="py-2 px-3 bg-gray-700 rounded text-sm">
          <span className="text-gray-400">Source: </span>
          <a href={note.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
            {note.sourceUrl}
          </a>
        </div>
      )}

      {/* Markdown content */}
      <div className="prose prose-invert prose-sm sm:prose-base lg:prose-lg max-w-none bg-gray-700 p-4 rounded-md">
        <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]} remarkPlugins={[remarkGfm]}>
          {note.content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default NoteViewer;
