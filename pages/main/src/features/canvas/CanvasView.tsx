import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@extension/ui';
import { useDodai } from './contexts/DodaiContext';
import ChatPanel from './components/ChatPanel';
import ArtifactPanel from './components/ArtifactPanel';
import { useState } from 'react';
import TagGraphView from '../notes/components/tag/TagGraphView';
import { useNotes } from '../notes/hooks/useNotes';
import { useTagGraph } from '../notes/hooks/useTagGraph';

const CanvasViewContent = () => {
  const { currentArtifact } = useDodai();
  const { notes } = useNotes();
  const tagData = useTagGraph(notes);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const showArtifactPanel = !!currentArtifact;
  const panelGroupKey = showArtifactPanel ? 'artifactMode' : 'hubMode';

  const handleTagSelect = (tag: string) => {
    setActiveTag(tag);
    console.log('Tag selected in CanvasView Hub:', tag);
  };

  const handleClearFilter = () => {
    setActiveTag(null);
    console.log('Filter cleared in CanvasView Hub');
  };

  return (
    <div className="flex flex-1 h-full bg-background-primary text-text-primary font-sans overflow-hidden">
      <ResizablePanelGroup
        key={panelGroupKey}
        direction="horizontal"
        className="flex flex-1 overflow-hidden rounded-md shadow-md">
        <ResizablePanel defaultSize={showArtifactPanel ? 35 : 70} minSize={30} className="min-w-[300px]">
          <div className="h-full bg-slate-800 rounded-md overflow-hidden">
            <ChatPanel />
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={showArtifactPanel ? 65 : 30} minSize={30} className="min-w-[300px]">
          <div className="h-full bg-slate-800 rounded-md overflow-hidden">
            {showArtifactPanel ? (
              <ArtifactPanel />
            ) : (
              <TagGraphView
                tagData={tagData}
                activeTag={activeTag}
                onTagSelect={handleTagSelect}
                onClearFilter={handleClearFilter}
              />
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

const CanvasView = () => <CanvasViewContent />;

export default CanvasView;
