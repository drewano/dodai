import { useState } from 'react';
import type { FC } from 'react';
import RightSidebar from './RightSidebar';
import TagGraphView from './TagGraphView';
import type { NoteEntry } from '@extension/storage';
import { useTagGraph } from '../../hooks/useTagGraph';

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
    <div className="h-full flex flex-col bg-gray-900">
      {/* Navigation tabs */}
      <div className="border-b border-gray-700/50">
        <div className="flex">
          <button
            onClick={() => setViewMode('list')}
            className={`px-5 py-3 text-sm font-medium transition-colors duration-200 relative ${
              viewMode === 'list' ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'
            }`}>
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M8 6H21M8 12H21M8 18H21M3 6H3.01M3 12H3.01M3 18H3.01"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Liste
            </span>
            {viewMode === 'list' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-400"></span>}
          </button>
          <button
            onClick={() => setViewMode('graph')}
            className={`px-5 py-3 text-sm font-medium transition-colors duration-200 relative ${
              viewMode === 'graph' ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'
            }`}>
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M17 7C17 8.10457 16.1046 9 15 9C13.8954 9 13 8.10457 13 7C13 5.89543 13.8954 5 15 5C16.1046 5 17 5.89543 17 7Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M7 12C7 13.1046 6.10457 14 5 14C3.89543 14 3 13.1046 3 12C3 10.8954 3.89543 10 5 10C6.10457 10 7 10.8954 7 12Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M14 18C14 19.1046 13.1046 20 12 20C10.8954 20 10 19.1046 10 18C10 16.8954 10.8954 16 12 16C13.1046 16 14 16.8954 14 18Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path d="M13.5 8.5L6.5 11" stroke="currentColor" strokeWidth="2" />
                <path d="M11 16.5L6.5 13" stroke="currentColor" strokeWidth="2" />
              </svg>
              Graphe
            </span>
            {viewMode === 'graph' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-400"></span>}
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
