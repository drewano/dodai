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
    <div>
      <label htmlFor="tags" className="block text-sm font-medium text-gray-400 mb-1">
        Tags
      </label>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map(tag => (
          <div key={tag} className="flex items-center bg-gray-700 text-white px-2 py-1 rounded-full text-sm">
            #{tag}
            <button
              onClick={() => onRemoveTag(tag)}
              className="ml-1 text-gray-400 hover:text-white"
              aria-label="Supprimer ce tag">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <div className="flex">
        <input
          type="text"
          id="tags"
          value={tagInput}
          onChange={onTagInputChange}
          onKeyDown={onTagInputKeyDown}
          placeholder="Ajouter un tag..."
          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-l-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={onAddTag}
          disabled={!tagInput.trim()}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-r-md text-white">
          Ajouter
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1">Appuyez sur Entrée pour ajouter rapidement un tag</p>
    </div>
  );
};

export default TagEditor;
