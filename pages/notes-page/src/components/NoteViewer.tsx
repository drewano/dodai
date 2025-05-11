import type React from 'react';
import { useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { NoteEntry } from '@extension/storage';
import { useCreateBlockNote } from '@blocknote/react';
import { type PartialBlock } from '@blocknote/core';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/style.css';
import '@blocknote/mantine/style.css';

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

  const editor = useCreateBlockNote();

  useEffect(() => {
    if (note && editor) {
      let blocksToLoad: PartialBlock[] = [];
      if (note.content) {
        try {
          const parsedContent = JSON.parse(note.content);
          if (Array.isArray(parsedContent) && parsedContent.length > 0 && 'type' in parsedContent[0]) {
            blocksToLoad = parsedContent as PartialBlock[];
          } else if (typeof parsedContent === 'object' && parsedContent !== null && 'type' in parsedContent) {
            blocksToLoad = [parsedContent as PartialBlock];
          } else {
            console.warn(
              "[NoteViewer] Le contenu JSON n'est pas un tableau de blocks valide, tentative de conversion Markdown.",
            );
            editor
              .tryParseMarkdownToBlocks(note.content)
              .then(mdBlocks => {
                if (JSON.stringify(editor.document) !== JSON.stringify(mdBlocks)) {
                  editor.replaceBlocks(editor.document, mdBlocks);
                }
              })
              .catch(e => {
                console.error('[NoteViewer] Erreur de parsing Markdown après échec JSON:', e);
                const fallbackBlock: PartialBlock = {
                  type: 'paragraph',
                  content: [{ type: 'text', text: note.content || '', styles: {} }],
                };
                editor.replaceBlocks(editor.document, [fallbackBlock]);
              });
            return;
          }
        } catch (e) {
          console.warn('[NoteViewer] Échec du parsing JSON, tentative de conversion Markdown :', e);
          editor
            .tryParseMarkdownToBlocks(note.content)
            .then(mdBlocks => {
              if (JSON.stringify(editor.document) !== JSON.stringify(mdBlocks)) {
                editor.replaceBlocks(editor.document, mdBlocks);
              }
            })
            .catch(error => {
              console.error('[NoteViewer] Erreur de parsing Markdown :', error);
              const fallbackBlock: PartialBlock = {
                type: 'paragraph',
                content: [{ type: 'text', text: note.content || '', styles: {} }],
              };
              editor.replaceBlocks(editor.document, [fallbackBlock]);
            });
          return;
        }
      }

      const currentBlocks = editor.document;
      if (JSON.stringify(currentBlocks) !== JSON.stringify(blocksToLoad)) {
        editor.replaceBlocks(currentBlocks, Array.isArray(blocksToLoad) ? blocksToLoad : []);
      }
    }
  }, [note, editor]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header with actions */}
      <div className="p-4 pb-2 border-b border-gray-700 mb-4">
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-2xl font-bold text-white">{note.title || 'Sans titre'}</h1>

          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded text-white text-sm transition-colors flex items-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              <span>Modifier</span>
            </button>
            <button
              onClick={onExport}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 rounded text-white text-sm transition-colors flex items-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <span>Exporter</span>
            </button>
            <button
              onClick={onDelete}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-white text-sm transition-colors flex items-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span>Supprimer</span>
            </button>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex justify-between items-center text-sm text-gray-400 mb-3">
          <span className="flex items-center">
            <svg className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
            Modifié {formatDate(note.updatedAt)}
          </span>
          <span className="flex items-center">
            <svg className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4 2a1 1 0 011-1h10a1 1 0 011 1v1H4V2zm1 4a1 1 0 00-1 1v10a2 2 0 002 2h8a2 2 0 002-2V7a1 1 0 00-1-1H5zm9 6a1 1 0 100-2H6a1 1 0 100 2h8z"
                clipRule="evenodd"
              />
            </svg>
            Créé {formatDate(note.createdAt)}
          </span>
        </div>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {note.tags.map(tag => (
              <span key={tag} className="bg-indigo-900/40 text-indigo-300 px-3 py-1 rounded-full text-sm">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Source URL if present */}
        {note.sourceUrl && (
          <div className="py-2 px-3 bg-gray-800 rounded text-sm">
            <span className="flex items-start">
              <svg className="h-4 w-4 mr-1.5 mt-0.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                <span className="text-gray-400">Source: </span>
                <a
                  href={note.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 hover:underline">
                  {note.sourceUrl}
                </a>
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto px-4 pb-4 bn-container">
        {editor && <BlockNoteView editor={editor} editable={false} theme="dark" />}
      </div>
    </div>
  );
};

export default NoteViewer;
