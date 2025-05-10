import type React from 'react';

interface MarkdownToolbarProps {
  onInsertMarkdown: (before: string, after?: string) => void;
  onInsertLink: () => void;
  onInsertImage: () => void;
}

const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({ onInsertMarkdown, onInsertLink, onInsertImage }) => {
  return (
    <div className="flex flex-wrap items-center gap-0.5 p-1.5 bg-gray-800 rounded-t-md border border-gray-700">
      {/* Headings */}
      <div className="flex">
        <button
          onClick={() => onInsertMarkdown('# ')}
          className="p-1.5 hover:bg-gray-700 rounded text-sm transition-colors"
          title="Titre H1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4">
            <path d="M4 12h16"></path>
            <path d="M4 18h12"></path>
            <path d="M4 6h8"></path>
          </svg>
        </button>
        <button
          onClick={() => onInsertMarkdown('## ')}
          className="p-1.5 hover:bg-gray-700 rounded text-sm transition-colors"
          title="Titre H2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4">
            <path d="M6 12h12"></path>
            <path d="M6 18h8"></path>
            <path d="M6 6h4"></path>
          </svg>
        </button>
        <button
          onClick={() => onInsertMarkdown('### ')}
          className="p-1.5 hover:bg-gray-700 rounded text-sm transition-colors"
          title="Titre H3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4">
            <path d="M8 12h8"></path>
            <path d="M8 18h6"></path>
            <path d="M8 6h2"></path>
          </svg>
        </button>
      </div>

      <div className="h-6 w-px bg-gray-700 mx-1"></div>

      {/* Text formatting */}
      <div className="flex">
        <button
          onClick={() => onInsertMarkdown('**', '**')}
          className="p-1.5 hover:bg-gray-700 rounded text-sm transition-colors"
          title="Gras">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4">
            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
            <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
          </svg>
        </button>
        <button
          onClick={() => onInsertMarkdown('*', '*')}
          className="p-1.5 hover:bg-gray-700 rounded text-sm transition-colors"
          title="Italique">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4">
            <line x1="19" y1="4" x2="10" y2="4"></line>
            <line x1="14" y1="20" x2="5" y2="20"></line>
            <line x1="15" y1="4" x2="9" y2="20"></line>
          </svg>
        </button>
        <button
          onClick={() => onInsertMarkdown('~~', '~~')}
          className="p-1.5 hover:bg-gray-700 rounded text-sm transition-colors"
          title="Barré">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <path d="M16 6C16 6 14.5 8 12 8C9.5 8 7 6 7 6"></path>
            <path d="M7 18C7 18 9.5 16 12 16C14.5 16 16 18 16 18"></path>
          </svg>
        </button>
      </div>

      <div className="h-6 w-px bg-gray-700 mx-1"></div>

      {/* Lists */}
      <div className="flex">
        <button
          onClick={() => onInsertMarkdown('- ')}
          className="p-1.5 hover:bg-gray-700 rounded text-sm transition-colors"
          title="Liste à puces">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
        </button>
        <button
          onClick={() => onInsertMarkdown('1. ')}
          className="p-1.5 hover:bg-gray-700 rounded text-sm transition-colors"
          title="Liste numérotée">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4">
            <line x1="10" y1="6" x2="21" y2="6"></line>
            <line x1="10" y1="12" x2="21" y2="12"></line>
            <line x1="10" y1="18" x2="21" y2="18"></line>
            <path d="M4 6h1v4"></path>
            <path d="M4 10h2"></path>
            <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path>
          </svg>
        </button>
        <button
          onClick={() => onInsertMarkdown('- [ ] ')}
          className="p-1.5 hover:bg-gray-700 rounded text-sm transition-colors"
          title="Liste à cocher">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4">
            <rect x="3" y="5" width="6" height="6" rx="1"></rect>
            <rect x="3" y="13" width="6" height="6" rx="1"></rect>
            <path d="M11 6h9"></path>
            <path d="M11 14h9"></path>
          </svg>
        </button>
      </div>

      <div className="h-6 w-px bg-gray-700 mx-1"></div>

      {/* Block elements */}
      <div className="flex">
        <button
          onClick={() => onInsertMarkdown('> ')}
          className="p-1.5 hover:bg-gray-700 rounded text-sm transition-colors"
          title="Citation">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4">
            <path d="M10 11h-4a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1h3a1 1 0 0 1 1 1v6c0 2.667 -1.333 4.333 -4 5"></path>
            <path d="M19 11h-4a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1h3a1 1 0 0 1 1 1v6c0 2.667 -1.333 4.333 -4 5"></path>
          </svg>
        </button>
        <button
          onClick={() => onInsertMarkdown('```\n', '\n```')}
          className="p-1.5 hover:bg-gray-700 rounded text-sm transition-colors"
          title="Bloc de code">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </svg>
        </button>
        <button
          onClick={() => onInsertMarkdown('---\n')}
          className="p-1.5 hover:bg-gray-700 rounded text-sm transition-colors"
          title="Ligne horizontale">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4">
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>

      <div className="h-6 w-px bg-gray-700 mx-1"></div>

      {/* Links and media */}
      <div className="flex">
        <button
          onClick={onInsertLink}
          className="p-1.5 hover:bg-gray-700 rounded text-sm transition-colors"
          title="Insérer un lien">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
        </button>
        <button
          onClick={onInsertImage}
          className="p-1.5 hover:bg-gray-700 rounded text-sm transition-colors"
          title="Insérer une image">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default MarkdownToolbar;
