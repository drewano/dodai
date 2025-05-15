// import React from 'react'; // REMOVED to see if JSX transform handles it
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './components/ui/resizable';
import { DodaiProvider, useDodai } from './contexts/DodaiContext';
import ChatPanel from './components/ChatPanel';
import ArtifactPanel from './components/ArtifactPanel';
import TagGraphView from '../../notes-page/src/components/tag/TagGraphView';
import { useNotes } from '../../notes-page/src/hooks/useNotes';
import { useTagGraph } from '../../notes-page/src/hooks/useTagGraph';
import { DodaiSidebar, type NavItemProps } from '@extension/ui'; // Updated import
import { PlusCircle, LayoutDashboard, NotebookText } from 'lucide-react'; // Import necessary icons
import { useState, useCallback } from 'react'; // Added useState and useCallback

const DodaiCanvasContent = () => {
  const { currentArtifact, resetChatAndArtifact } = useDodai();
  const { notes } = useNotes(); // This remains for TagGraphView, not directly for sidebar
  const tagData = useTagGraph(notes);

  const [isDodaiSidebarExpanded, setIsDodaiSidebarExpanded] = useState(true);

  const handleDodaiSidebarExpansionChange = useCallback((isExpanded: boolean) => {
    setIsDodaiSidebarExpanded(isExpanded);
  }, []);

  const handleNavigateToPage = useCallback(
    (page: 'notes' | 'canvas') => {
      if (page === 'notes') {
        const notesPageUrl = chrome.runtime.getURL('pages/notes-page/index.html');
        window.location.href = notesPageUrl;
      } else if (page === 'canvas') {
        // Already on canvas, could reset state if needed, or do nothing.
        // For now, let's ensure it resets the chat and artifact if clicked.
        resetChatAndArtifact();
      }
    },
    [resetChatAndArtifact],
  );

  const canvasNavItems: NavItemProps[] = [
    {
      id: 'new-canvas-item',
      label: 'Nouveau',
      icon: <PlusCircle />,
      onClick: () => resetChatAndArtifact(),
      isActive: false,
      title: 'Nouvel élément Canvas',
    },
    {
      id: 'canvas',
      label: 'Canvas',
      icon: <LayoutDashboard />,
      onClick: () => handleNavigateToPage('canvas'), // Does nothing or resets view
      isActive: true, // Canvas is the current page
      title: 'Canvas Dodai',
    },
    {
      id: 'notes',
      label: 'Mes Notes',
      icon: <NotebookText />,
      onClick: () => handleNavigateToPage('notes'),
      isActive: false,
      title: 'Mes Notes',
    },
  ];

  const historyPlaceholderContent = (
    <p className="p-4 text-sm text-slate-400">L'historique des conversations du Canvas apparaîtra ici.</p>
  );

  const showArtifactPanel = !!currentArtifact;
  const panelGroupKey = showArtifactPanel ? 'artifactMode' : 'hubMode';

  return (
    <div className="flex h-screen w-full bg-slate-900 text-slate-100 font-sans overflow-hidden p-1 gap-1">
      <DodaiSidebar
        navItems={canvasNavItems}
        mainContentTitle="HISTORIQUE"
        mainContent={historyPlaceholderContent}
        initialIsExpanded={isDodaiSidebarExpanded}
        onExpansionChange={handleDodaiSidebarExpansionChange}
      />

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
                activeTag={null}
                onTagSelect={tag => console.log('Tag selected in Hub:', tag)}
                onClearFilter={() => console.log('Filter cleared in Hub')}
              />
            )}
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
