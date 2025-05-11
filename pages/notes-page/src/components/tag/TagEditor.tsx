import type React from 'react';

interface TagEditorProps {
  tags: string[];
  tagInput: string;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  onTagInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTagInputKeyDown: (e: React.KeyboardEvent) => void;
}

const TagEditor: React.FC<TagEditorProps> = ({
  tags,
  tagInput,
  onAddTag,
  onRemoveTag,
  onTagInputChange,
  onTagInputKeyDown,
}) => {
  return (
    <div className="mb-3">
      <label htmlFor="tags" className="block text-sm font-medium text-gray-300 mb-2">
        Tags
      </label>
      <div className="flex flex-wrap gap-2 mb-3">
        {tags.map(tag => (
          <div
            key={tag}
            className="flex items-center bg-indigo-900/40 text-indigo-300 px-3 py-1.5 rounded-full text-sm transition-colors hover:bg-indigo-800/50">
            <span className="mr-1">#</span>
            {tag}
            <button
              onClick={() => onRemoveTag(tag)}
              className="ml-1.5 text-indigo-300/70 hover:text-indigo-100 transition-colors"
              aria-label="Supprimer ce tag">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <div className="flex">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400">#</span>
          </div>
          <input
            type="text"
            id="tags"
            value={tagInput}
            onChange={onTagInputChange}
            onKeyDown={onTagInputKeyDown}
            placeholder="Ajouter un tag..."
            className="block w-full pl-7 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-l-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>
        <button
          onClick={onAddTag}
          disabled={!tagInput.trim()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed rounded-r-md text-white transition-colors"
          aria-label="Ajouter un tag">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1.5">Appuyez sur Entrée pour ajouter rapidement un tag</p>
    </div>
  );
};

export default TagEditor;
