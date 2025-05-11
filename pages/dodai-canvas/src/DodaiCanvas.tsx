import { useState } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './components/ui/resizable';
import ChatPanel from './components/ChatPanel';
import ArtifactPanel from './components/ArtifactPanel';
import { DodaiProvider } from './contexts/DodaiContext';

const DodaiCanvas = () => {
  const [chatCollapsed, setChatCollapsed] = useState(false);

  // Fonction pour retourner à la page précédente
  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  };

  return (
    <DodaiProvider>
      <div className="h-screen w-full bg-slate-900 text-slate-100 overflow-hidden flex flex-col font-sans">
        {/* Header */}
        <header className="h-12 border-b border-slate-700 flex items-center justify-between px-4 bg-slate-800/80 shadow-md">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleGoBack}
              className="p-1.5 rounded-full hover:bg-slate-700/50 text-slate-300 hover:text-slate-100 transition-colors"
              aria-label="Retour"
              title="Retour">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M19 12H5M5 12L12 19M5 12L12 5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🦤</span>
              <h1 className="text-lg font-semibold">Dodai Canvas</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="p-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
              onClick={() => setChatCollapsed(!chatCollapsed)}
              title={chatCollapsed ? 'Afficher le panneau de chat' : 'Masquer le panneau de chat'}>
              {chatCollapsed ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M8 5H18M18 5V15M18 5L8 15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M18 19H8M8 19V9M8 19L18 9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </header>

        {/* Panneaux redimensionnables */}
        <main className="flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {!chatCollapsed && (
              <>
                <ResizablePanel defaultSize={30} minSize={20} maxSize={50} className="transition-all duration-300">
                  <ChatPanel />
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>
            )}
            <ResizablePanel defaultSize={chatCollapsed ? 100 : 70} className="transition-all duration-300">
              <ArtifactPanel />
            </ResizablePanel>
          </ResizablePanelGroup>
        </main>
      </div>
    </DodaiProvider>
  );
};

export default DodaiCanvas;
