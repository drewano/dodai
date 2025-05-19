import type React from 'react';
import { XCircle, Info, Tag, Check } from 'lucide-react';

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
    <div className="h-full flex flex-col p-4 overflow-hidden text-slate-200">
      <div className="mb-4 flex justify-between items-center flex-shrink-0">
        <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          <Tag size={18} className="text-blue-400" />
          Tags
        </h2>

        {activeTag && (
          <button
            onClick={onClearFilter}
            className="text-xs bg-slate-600 hover:bg-slate-500 text-slate-200 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1">
            <XCircle size={14} />
            Effacer
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar -mr-2">
        {allTags.length === 0 ? (
          <div className="text-center py-10 px-4 text-slate-500 bg-slate-850/60 rounded-lg border border-slate-700/50 mt-4">
            <Tag size={24} className="w-10 h-10 mx-auto mb-3 text-slate-600" strokeWidth={1.5} />
            <p className="font-medium text-slate-400">Aucun tag disponible</p>
            <p className="text-xs mt-1.5">Ajoutez des tags à vos notes pour les voir apparaître ici</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedGroups.map(group => (
              <div key={group}>
                <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2 px-1">{group}</h3>
                <div className="space-y-1">
                  {groupedTags[group].sort().map(tag => (
                    <button
                      key={tag}
                      onClick={() => onTagSelect(tag)}
                      className={`block w-full text-left px-3 py-1.5 rounded-md text-sm transition-all duration-150 group focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${
                        activeTag === tag
                          ? 'bg-blue-600 text-white font-medium'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-slate-100'
                      }`}>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <span
                            className={`inline-block w-1.5 h-1.5 rounded-full ${
                              activeTag === tag ? 'bg-white/70' : 'bg-slate-500 group-hover:bg-slate-400'
                            }`}></span>
                          {tag}
                        </span>
                        {activeTag === tag && <Check size={16} className="text-blue-100" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-slate-700/70 mt-4 flex-shrink-0">
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <Info size={14} />
          Cliquez sur un tag pour filtrer les notes
        </div>
      </div>
    </div>
  );
};

export default RightSidebar;
