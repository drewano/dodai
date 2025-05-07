import type React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import MarkdownToolbar from './MarkdownToolbar';
import TagEditor from './TagEditor';

interface NoteEditorProps {
  editedTitle: string;
  editedContent: string;
  editedTags: string[];
  tagInput: string;
  showPreview: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onContentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onTagInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTagInputKeyDown: (e: React.KeyboardEvent) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  onTogglePreview: () => void;
  onSave: () => void;
  onCancel: () => void;
  onExport: () => void;
  insertMarkdown: (before: string, after?: string) => void;
  handleInsertLink: () => void;
  handleInsertImage: () => void;
}

const NoteEditor: React.FC<NoteEditorProps> = ({
  editedTitle,
  editedContent,
  editedTags,
  tagInput,
  showPreview,
  textareaRef,
  onTitleChange,
  onContentChange,
  onTagInputChange,
  onTagInputKeyDown,
  onAddTag,
  onRemoveTag,
  onTogglePreview,
  onSave,
  onCancel,
  onExport,
  insertMarkdown,
  handleInsertLink,
  handleInsertImage,
}) => {
  return (
    <div className="flex-1 flex flex-col space-y-4">
      {/* Action buttons */}
      <div className="flex justify-between items-center mb-4">
        <div>{/* Title is edited in the form below */}</div>
        <div className="flex space-x-2">
          <button
            onClick={onTogglePreview}
            className={`px-3 py-1 ${showPreview ? 'bg-gray-600' : 'bg-purple-600 hover:bg-purple-700'} rounded text-white text-sm transition flex items-center gap-1`}>
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
            className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-white text-sm transition flex items-center gap-1">
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
            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-white text-sm transition flex items-center gap-1">
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
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors">
            Exporter en MD
          </button>
        </div>
      </div>

      {/* Title field */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-400 mb-1">
          Titre
        </label>
        <input
          type="text"
          id="title"
          value={editedTitle}
          onChange={onTitleChange}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* Content editor with preview toggle */}
      {showPreview ? (
        <div className="flex-1 overflow-auto">
          <div className="p-4 bg-gray-700 border border-gray-600 rounded-md h-full overflow-y-auto">
            <h3 className="text-lg font-semibold text-blue-400 mb-2">Aperçu</h3>
            {/* Preview des tags */}
            {editedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {editedTags.map(tag => (
                  <span key={tag} className="bg-gray-600 text-blue-300 px-2 py-1 rounded-full text-sm">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            <div className="prose prose-invert prose-sm sm:prose-base lg:prose-lg max-w-none">
              <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]} remarkPlugins={[remarkGfm]}>
                {editedContent}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="mb-1">
            <label htmlFor="content" className="block text-sm font-medium text-gray-400">
              Contenu (supporte la syntaxe Markdown)
            </label>
          </div>

          {/* Markdown toolbar */}
          <MarkdownToolbar
            onInsertMarkdown={insertMarkdown}
            onInsertLink={handleInsertLink}
            onInsertImage={handleInsertImage}
          />

          {/* Content textarea */}
          <textarea
            id="content"
            ref={textareaRef}
            value={editedContent}
            onChange={onContentChange}
            className="flex-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-b-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm leading-relaxed"
            placeholder="Entrez votre texte ici. Vous pouvez utiliser la syntaxe Markdown pour mettre en forme votre contenu."
          />
        </div>
      )}
    </div>
  );
};

export default NoteEditor;
