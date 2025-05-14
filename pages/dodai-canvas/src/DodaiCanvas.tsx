// import React from 'react'; // REMOVED to see if JSX transform handles it
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './components/ui/resizable'; // RE-ADDED
import { DodaiProvider, useDodai } from './contexts/DodaiContext';
import ChatPanel from './components/ChatPanel';
import ArtifactPanel from './components/ArtifactPanel';
import TagGraphView from '../../notes-page/src/components/tag/TagGraphView';
import { useNotes } from '../../notes-page/src/hooks/useNotes';
import { useTagGraph } from '../../notes-page/src/hooks/useTagGraph';
import DodaiSidebar from './components/DodaiSidebar';

const DodaiCanvasContent = () => {
  const { currentArtifact, resetChatAndArtifact } = useDodai();

  const { notes } = useNotes();
  const tagData = useTagGraph(notes);

  const handleNavigate = (path: string) => {
    if (path === '/dodai-canvas.html') {
      resetChatAndArtifact();
    } else if (path === '/notes-page.html') {
      window.location.href = path;
    } else {
      window.location.href = path;
    }
  };

  const showArtifactPanel = !!currentArtifact;

  return (
    <div className="flex h-screen w-full bg-slate-900 text-slate-100 font-sans overflow-hidden">
      <DodaiSidebar onNavigate={handleNavigate} />

      <ResizablePanelGroup direction="horizontal" className="flex flex-1 overflow-hidden">
        <ResizablePanel defaultSize={showArtifactPanel ? 40 : 60} minSize={30} className="min-w-[300px]">
          <div className="p-1 h-full">
            <div className="bg-slate-800 rounded-md shadow-md h-full overflow-hidden">
              <ChatPanel />
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={showArtifactPanel ? 60 : 40} minSize={30} className="min-w-[300px]">
          <div className="p-1 h-full">
            <div className="bg-slate-800 rounded-md shadow-md h-full overflow-hidden">
              {showArtifactPanel ? (
                <ArtifactPanel />
              ) : (
                <TagGraphView
                  tagData={tagData}
                  activeTag={null}
                  onTagSelect={tag => console.log('Tag selected in Hub:', tag)}
                  onClearFilter={() => console.log('Filter cleared in Hub')}
                />
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

const DodaiCanvas = () => (
  <DodaiProvider>
    <DodaiCanvasContent />
  </DodaiProvider>
);

export default DodaiCanvas;
