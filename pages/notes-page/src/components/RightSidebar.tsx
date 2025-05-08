import type React from 'react';

interface RightSidebarProps {
  allTags: string[];
  activeTag: string | null;
  onTagSelect: (tag: string) => void;
  onClearFilter: () => void;
}

const RightSidebar: React.FC<RightSidebarProps> = ({ allTags, activeTag, onTagSelect, onClearFilter }) => {
  // Grouper les tags par première lettre pour une meilleure organisation
  const groupedTags = allTags.reduce<Record<string, string[]>>((groups, tag) => {
    const firstChar = tag.charAt(0).toUpperCase();
    if (!groups[firstChar]) {
      groups[firstChar] = [];
    }
    groups[firstChar].push(tag);
    return groups;
  }, {});

  // Trier les groupes alphabétiquement
  const sortedGroups = Object.keys(groupedTags).sort();

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-blue-400">Tags</h2>

        {activeTag && (
          <button onClick={onClearFilter} className="text-xs text-gray-400 hover:text-blue-400 flex items-center">
            <svg className="w-3 h-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            Effacer le filtre
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {allTags.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <p>Aucun tag disponible</p>
            <p className="text-xs mt-2">Ajoutez des tags à vos notes pour les voir apparaître ici</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedGroups.map(group => (
              <div key={group} className="mb-2">
                <h3 className="text-sm font-medium text-gray-400 mb-1">{group}</h3>
                <div className="space-y-1">
                  {groupedTags[group].sort().map(tag => (
                    <button
                      key={tag}
                      onClick={() => onTagSelect(tag)}
                      className={`block w-full text-left px-3 py-1.5 rounded-md text-sm ${
                        activeTag === tag ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}>
                      <div className="flex items-center justify-between">
                        <span>#{tag}</span>
                        {activeTag === tag && (
                          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-gray-700 mt-4">
        <div className="text-xs text-gray-500">
          <p>Cliquez sur un tag pour filtrer les notes</p>
        </div>
      </div>
    </div>
  );
};

export default RightSidebar;
