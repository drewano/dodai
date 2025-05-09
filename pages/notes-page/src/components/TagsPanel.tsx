import { useState } from 'react';
import type { FC } from 'react';
import RightSidebar from './RightSidebar';
import TagGraphView from './TagGraphView';
import type { NoteEntry } from '@extension/storage';
import { useTagGraph } from '../hooks/useTagGraph';

interface TagsPanelProps {
  notes: NoteEntry[] | null;
  allTags: string[];
  activeTag: string | null;
  onTagSelect: (tag: string) => void;
  onClearFilter: () => void;
}

const TagsPanel: FC<TagsPanelProps> = ({ notes, allTags, activeTag, onTagSelect, onClearFilter }) => {
  const [viewMode, setViewMode] = useState<'list' | 'graph'>('list');
  const tagGraphData = useTagGraph(notes);

  return (
    <div className="h-full flex flex-col">
      {/* Onglets de navigation */}
      <div className="bg-gray-900 border-b border-gray-700">
        <div className="flex">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 text-sm ${
              viewMode === 'list'
                ? 'text-blue-400 border-b-2 border-blue-400 font-medium'
                : 'text-gray-400 hover:text-gray-300'
            }`}>
            Liste
          </button>
          <button
            onClick={() => setViewMode('graph')}
            className={`px-4 py-2 text-sm ${
              viewMode === 'graph'
                ? 'text-blue-400 border-b-2 border-blue-400 font-medium'
                : 'text-gray-400 hover:text-gray-300'
            }`}>
            Graphe
          </button>
        </div>
      </div>

      {/* Contenu de la vue */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'list' ? (
          <RightSidebar
            allTags={allTags}
            activeTag={activeTag}
            onTagSelect={onTagSelect}
            onClearFilter={onClearFilter}
          />
        ) : (
          <TagGraphView
            tagData={tagGraphData}
            activeTag={activeTag}
            onTagSelect={onTagSelect}
            onClearFilter={onClearFilter}
          />
        )}
      </div>
    </div>
  );
};

export default TagsPanel;
