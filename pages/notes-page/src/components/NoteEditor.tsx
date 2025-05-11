import type React from 'react';
import { useEffect } from 'react';
// import ReactMarkdown from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
// import MarkdownToolbar from './MarkdownToolbar';
import TagEditor from './TagEditor';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import type { NoteEntry } from '@extension/storage';

interface NoteEditorProps {
  editedTitle: string;
  editedContent: string;
  editedTags: string[];
  tagInput: string;
  showPreview: boolean;
  selectedNote: NoteEntry | null;
  isEditing: boolean;
  // textareaRef: React.RefObject<HTMLTextAreaElement>;
  onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  // onContentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onTagInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTagInputKeyDown: (e: React.KeyboardEvent) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  onTogglePreview: () => void;
  onSave: () => void;
  onCancel: () => void;
  onExport: () => void;
  // insertMarkdown: (before: string, after?: string) => void;
  // handleInsertLink: () => void;
  // handleInsertImage: () => void;
}

const NoteEditor: React.FC<NoteEditorProps> = ({
  editedTitle,
  editedContent,
  editedTags,
  tagInput,
  showPreview,
  selectedNote,
  isEditing,
  // textareaRef,
  onTitleChange,
  // onContentChange,
  onTagInputChange,
  onTagInputKeyDown,
  onAddTag,
  onRemoveTag,
  onTogglePreview,
  onSave,
  onCancel,
  onExport,
  // insertMarkdown,
  // handleInsertLink,
  // handleInsertImage,
}) => {
  const editor = useCreateBlockNote();

  useEffect(() => {
    if (!editor) return;

    if (showPreview) {
      // Si l'aperçu est montré, on ne fait rien au contenu de BlockNote ici,
      // car il n'est pas visible.
      return;
    }

    // L'éditeur BlockNote est visible
    if (isEditing && selectedNote) {
      const markdownToLoad = selectedNote.content || '';
      const loadIntoEditor = async () => {
        try {
          const blocks = await editor.tryParseMarkdownToBlocks(markdownToLoad);
          editor.replaceBlocks(editor.document, blocks.length > 0 ? blocks : [{ type: 'paragraph', content: '' }]);
        } catch (error) {
          console.error('Failed to parse Markdown to blocks:', error);
          editor.replaceBlocks(editor.document, [{ type: 'paragraph', content: 'Error loading content.' }]);
        }
      };
      loadIntoEditor();
    } else {
      // Pas en mode édition, ou pas de note sélectionnée, ou création d'une nouvelle note
      // On vide l'éditeur ou on met un état par défaut.
      editor.replaceBlocks(editor.document, [{ type: 'paragraph', content: '' }]);
    }
  }, [editor, selectedNote, isEditing, showPreview]);

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header toolbar with action buttons */}
      <div className="flex items-center justify-end gap-2 pb-4 border-b border-gray-700 mb-5">
        <button
          onClick={onTogglePreview}
          className={`px-3 py-1.5 rounded text-sm transition-colors flex items-center gap-1 ${
            showPreview ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}>
          {showPreview ? (
            <>
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
              <span>Éditer</span>
            </>
          ) : (
            <>
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
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <span>Aperçu</span>
            </>
          )}
        </button>
        <button
          onClick={onSave}
          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-white text-sm transition-colors flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Sauvegarder</span>
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm transition-colors flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Annuler</span>
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
      </div>

      {/* Main editor content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {showPreview ? (
          <div className="flex-1 overflow-auto">
            {/* Title preview */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-white mb-4">{editedTitle || 'Sans titre'}</h1>

              {/* Tags preview */}
              {editedTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {editedTags.map(tag => (
                    <span key={tag} className="bg-indigo-900/40 text-indigo-300 px-3 py-1 rounded-full text-sm">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Content preview */}
            <div className="prose prose-invert prose-sm sm:prose-base lg:prose-lg max-w-none">
              <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]} remarkPlugins={[remarkGfm]}>
                {editedContent}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Title field */}
            <div className="mb-5">
              <input
                type="text"
                id="title"
                value={editedTitle}
                onChange={onTitleChange}
                placeholder="Titre de la note..."
                className="w-full px-3 py-3 bg-gray-800 border-0 border-b border-gray-700 text-white text-xl font-medium focus:outline-none focus:border-indigo-500 transition-colors placeholder-gray-500 mb-3"
              />
            </div>

            {/* Tag editor */}
            <TagEditor
              tags={editedTags}
              tagInput={tagInput}
              onAddTag={onAddTag}
              onRemoveTag={onRemoveTag}
              onTagInputChange={onTagInputChange}
              onTagInputKeyDown={onTagInputKeyDown}
            />

            {/* Markdown toolbar */}
            {/* <MarkdownToolbar
              onInsertMarkdown={insertMarkdown}
              onInsertLink={handleInsertLink}
              onInsertImage={handleInsertImage}
            /> */}

            {/* Content editor */}
            <div className="flex-1 w-full bg-gray-800 border border-gray-700 rounded-b-md text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-mono text-sm leading-relaxed">
              <BlockNoteView editor={editor} theme="dark" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NoteEditor;
