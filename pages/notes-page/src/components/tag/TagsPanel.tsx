import { useState } from 'react';
import type { FC } from 'react';
import RightSidebar from './RightSidebar';
import TagGraphView from './TagGraphView';
import type { NoteEntry } from '@extension/storage';
import { useTagGraph } from '../../hooks/useTagGraph';
import { List, GitBranch } from 'lucide-react';

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
    <div className="h-full flex flex-col bg-slate-800 text-slate-100">
      {/* Navigation tabs */}
      <div className="border-b border-slate-700/70 flex-shrink-0">
        <div className="flex px-2 pt-1">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors duration-150 rounded-t-md focus:outline-none focus:ring-1 focus:ring-blue-500/50 relative ${
              viewMode === 'list'
                ? 'text-slate-100 bg-slate-850'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/50'
            }`}>
            <List size={16} />
            Liste
            {viewMode === 'list' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>}
          </button>
          <button
            onClick={() => setViewMode('graph')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors duration-150 rounded-t-md focus:outline-none focus:ring-1 focus:ring-blue-500/50 relative ${
              viewMode === 'graph'
                ? 'text-slate-100 bg-slate-850'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/50'
            }`}>
            <GitBranch size={16} />
            Graphe
            {viewMode === 'graph' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>}
          </button>
        </div>
      </div>

      {/* View content */}
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
