import type React from 'react';

interface TagFilterProps {
  tags: string[];
  activeTag: string | null;
  onTagSelect: (tag: string) => void;
  onClearFilter: () => void;
}

const TagFilter: React.FC<TagFilterProps> = ({ tags, activeTag, onTagSelect, onClearFilter }) => {
  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 overflow-x-auto">
      <div className="flex items-center space-x-2 pb-2">
        <h3 className="text-sm font-medium text-gray-400">Filtrer par tag:</h3>
        {activeTag && (
          <button
            onClick={onClearFilter}
            className="text-xs px-2 py-1 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-md flex items-center"
            title="Effacer le filtre">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            Effacer
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <button
            key={tag}
            onClick={() => onTagSelect(tag)}
            className={`text-xs px-2 py-1 rounded-full ${
              activeTag === tag ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}>
            #{tag}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TagFilter;
