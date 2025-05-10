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
    <div className="h-full flex flex-col p-5 overflow-hidden">
      <div className="mb-5 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-blue-400">Tags</h2>

        {activeTag && (
          <button
            onClick={onClearFilter}
            className="text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-2 py-1 rounded-md transition-colors flex items-center">
            <svg className="w-3 h-3 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
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

      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {allTags.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-gray-800/30 rounded-lg border border-gray-700/50">
            <svg className="w-8 h-8 mx-auto mb-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 7h.01M7 12h.01M7 17h.01M11 7h6M11 12h6M11 17h6"
              />
            </svg>
            <p className="font-medium">Aucun tag disponible</p>
            <p className="text-xs mt-2 px-4">Ajoutez des tags à vos notes pour les voir apparaître ici</p>
          </div>
        ) : (
          <div className="space-y-5">
            {sortedGroups.map(group => (
              <div key={group} className="mb-2">
                <h3 className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-2 ml-1">{group}</h3>
                <div className="space-y-1.5">
                  {groupedTags[group].sort().map(tag => (
                    <button
                      key={tag}
                      onClick={() => onTagSelect(tag)}
                      className={`block w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 group ${
                        activeTag === tag
                          ? 'bg-blue-600/90 text-white shadow-md shadow-blue-900/30'
                          : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80 hover:text-white hover:shadow-sm'
                      }`}>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center">
                          <span
                            className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${
                              activeTag === tag ? 'bg-blue-200' : 'bg-gray-500 group-hover:bg-gray-400'
                            }`}></span>
                          #{tag}
                        </span>
                        {activeTag === tag && (
                          <svg className="w-4 h-4 text-blue-200" viewBox="0 0 20 20" fill="currentColor">
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

      <div className="pt-4 border-t border-gray-700/50 mt-4">
        <div className="text-xs text-gray-500 flex items-center">
          <svg className="w-3 h-3 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <p>Cliquez sur un tag pour filtrer les notes</p>
        </div>
      </div>
    </div>
  );
};

export default RightSidebar;
