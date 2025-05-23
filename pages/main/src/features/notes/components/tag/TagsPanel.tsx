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
    <div className="h-full flex flex-col bg-background-tertiary text-text-primary">
      {/* Navigation tabs */}
      <div className="p-2 bg-background-tertiary border-b border-border-primary shadow-sm flex-shrink-0">
        <div className="flex space-x-1 bg-background-secondary p-1 rounded-lg">
          <button
            onClick={() => setViewMode('list')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium transition-all duration-150 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background-secondary relative ${
              viewMode === 'list'
                ? 'bg-background-tertiary text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-background-quaternary/50'
            }`}>
            <List size={16} />
            Liste
          </button>
          <button
            onClick={() => setViewMode('graph')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium transition-all duration-150 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background-secondary relative ${
              viewMode === 'graph'
                ? 'bg-background-tertiary text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-background-quaternary/50'
            }`}>
            <GitBranch size={16} />
            Graphe
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
