import type React from 'react';

interface MarkdownToolbarProps {
  onInsertMarkdown: (before: string, after?: string) => void;
  onInsertLink: () => void;
  onInsertImage: () => void;
}

const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({ onInsertMarkdown, onInsertLink, onInsertImage }) => {
  return (
    <div className="flex flex-wrap gap-1 mb-2 p-2 bg-gray-700 rounded-t-md border-t border-l border-r border-gray-600">
      <div className="flex space-x-1">
        <button
          onClick={() => onInsertMarkdown('# ')}
          className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm"
          title="Titre H1">
          H1
        </button>
        <button
          onClick={() => onInsertMarkdown('## ')}
          className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm"
          title="Titre H2">
          H2
        </button>
        <button
          onClick={() => onInsertMarkdown('### ')}
          className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm"
          title="Titre H3">
          H3
        </button>
      </div>

      <div className="h-6 w-px bg-gray-600 mx-1"></div>

      <div className="flex space-x-1">
        <button
          onClick={() => onInsertMarkdown('**', '**')}
          className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded font-bold text-sm"
          title="Gras">
          B
        </button>
        <button
          onClick={() => onInsertMarkdown('*', '*')}
          className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded italic text-sm"
          title="Italique">
          I
        </button>
        <button
          onClick={() => onInsertMarkdown('~~', '~~')}
          className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm line-through"
          title="Barré">
          S
        </button>
      </div>

      <div className="h-6 w-px bg-gray-600 mx-1"></div>

      <div className="flex space-x-1">
        <button
          onClick={() => onInsertMarkdown('- ')}
          className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm"
          title="Liste à puces">
          • Liste
        </button>
        <button
          onClick={() => onInsertMarkdown('1. ')}
          className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm"
          title="Liste numérotée">
          1. Liste
        </button>
        <button
          onClick={() => onInsertMarkdown('- [ ] ')}
          className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm"
          title="Liste à cocher">
          ☐ Tâche
        </button>
      </div>

      <div className="h-6 w-px bg-gray-600 mx-1"></div>

      <div className="flex space-x-1">
        <button
          onClick={() => onInsertMarkdown('> ')}
          className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm"
          title="Citation">
          " Quote
        </button>
        <button
          onClick={() => onInsertMarkdown('```\n', '\n```')}
          className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm"
          title="Bloc de code">
          {'<>'} Code
        </button>
        <button
          onClick={() => onInsertMarkdown('---\n')}
          className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm"
          title="Ligne horizontale">
          —
        </button>
      </div>

      <div className="h-6 w-px bg-gray-600 mx-1"></div>

      <div className="flex space-x-1">
        <button
          onClick={onInsertLink}
          className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm"
          title="Insérer un lien">
          🔗 Lien
        </button>
        <button
          onClick={onInsertImage}
          className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm"
          title="Insérer une image">
          🖼️ Image
        </button>
      </div>
    </div>
  );
};

export default MarkdownToolbar;
