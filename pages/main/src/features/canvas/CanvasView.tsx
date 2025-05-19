import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './components/ui/resizable';
import { useDodai } from './contexts/DodaiContext';
import ChatPanel from './components/ChatPanel';
import ArtifactPanel from './components/ArtifactPanel';
// Temporairement commenté car notes-page n'est pas encore migré
// import TagGraphView from '../../../../notes-page/src/components/tag/TagGraphView';
// import { useNotes } from '../../../../notes-page/src/hooks/useNotes';
// import { useTagGraph } from '../../../../notes-page/src/hooks/useTagGraph';

const CanvasViewContent = () => {
  const { currentArtifact } = useDodai();
  // const { notes } = useNotes();
  // const tagData = useTagGraph(notes);

  const showArtifactPanel = !!currentArtifact;
  const panelGroupKey = showArtifactPanel ? 'artifactMode' : 'hubMode';

  // TODO: Remplacer TagGraphView par un placeholder ou une version migrée
  const TagGraphViewPlaceholder = () => (
    <div className="flex items-center justify-center h-full text-slate-400">Tag Graph View Placeholder</div>
  );

  return (
    <div className="flex flex-1 h-full bg-slate-900 text-slate-100 font-sans overflow-hidden p-1 gap-1">
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
              // <TagGraphView
              //   tagData={tagData}
              //   activeTag={null}
              //   onTagSelect={tag => console.log('Tag selected in Hub:', tag)}
              //   onClearFilter={() => console.log('Filter cleared in Hub')}
              // />
              <TagGraphViewPlaceholder />
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

const CanvasView = () => <CanvasViewContent />;

export default CanvasView;
