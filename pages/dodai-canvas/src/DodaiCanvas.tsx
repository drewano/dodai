// import React from 'react'; // REMOVED to see if JSX transform handles it
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './components/ui/resizable';
import { DodaiProvider, useDodai } from './contexts/DodaiContext';
import ChatPanel from './components/ChatPanel';
import ArtifactPanel from './components/ArtifactPanel';
import TagGraphView from '../../notes-page/src/components/tag/TagGraphView';
import { useNotes } from '../../notes-page/src/hooks/useNotes';
import { useTagGraph } from '../../notes-page/src/hooks/useTagGraph';
import DodaiSidebar, { type NavItemProps } from './components/DodaiSidebar'; // Import NavItemProps
import { PlusCircle, LayoutDashboard, NotebookText } from 'lucide-react'; // Import necessary icons

const DodaiCanvasContent = () => {
  const { currentArtifact, resetChatAndArtifact } = useDodai();

  const { notes } = useNotes(); // This remains for TagGraphView, not directly for sidebar
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

  const canvasNavItems: NavItemProps[] = [
    {
      id: 'new-canvas-item',
      label: 'Nouveau',
      icon: <PlusCircle />,
      onClick: () => resetChatAndArtifact(), // Directly call reset or use handleNavigate if preferred
      isActive: false, // Action item, not a page
      title: 'Nouvel élément Canvas',
    },
    {
      id: 'canvas',
      label: 'Canvas',
      icon: <LayoutDashboard />,
      onClick: () => handleNavigate('/dodai-canvas.html'), // Stays on canvas, might reset view via resetChatAndArtifact
      isActive: true, // Canvas is the current page
      title: 'Canvas Dodai',
    },
    {
      id: 'notes',
      label: 'Mes Notes',
      icon: <NotebookText />,
      onClick: () => handleNavigate('/notes-page.html'), // Navigates to notes page
      isActive: false,
      title: 'Mes Notes',
    },
  ];

  const historyLowerContent = <p className="text-sm text-slate-400">L'historique des conversations apparaîtra ici.</p>;

  const showArtifactPanel = !!currentArtifact;
  const panelGroupKey = showArtifactPanel ? 'artifactMode' : 'hubMode';

  return (
    <div className="flex h-screen w-full bg-slate-900 text-slate-100 font-sans overflow-hidden p-1 gap-1">
      <DodaiSidebar
        navItems={canvasNavItems}
        lowerContentTitle="HISTORIQUE"
        lowerContent={historyLowerContent}
        // initialIsExpanded and onExpansionChange can be added if needed,
        // otherwise DodaiSidebar handles its own state defaulting to expanded.
      />

      <ResizablePanelGroup key={panelGroupKey} direction="horizontal" className="flex flex-1 overflow-hidden">
        <ResizablePanel defaultSize={showArtifactPanel ? 35 : 70} minSize={30} className="min-w-[300px]">
          <div className="h-full">
            <div className="bg-slate-800 rounded-md shadow-md h-full overflow-hidden">
              <ChatPanel />
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={showArtifactPanel ? 65 : 30} minSize={30} className="min-w-[300px]">
          <div className="h-full">
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
