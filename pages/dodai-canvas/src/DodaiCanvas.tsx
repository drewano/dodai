import { useState } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './components/ui/resizable';
import { DodaiProvider, useDodai } from './contexts/DodaiContext';
import ChatPanel from './components/ChatPanel';
import ArtifactPanel from './components/ArtifactPanel';
import TagGraphView from '../../notes-page/src/components/tag/TagGraphView';
import { useNotes } from '../../notes-page/src/hooks/useNotes';
import { useTagGraph } from '../../notes-page/src/hooks/useTagGraph';
import { PlusCircle, Send } from 'lucide-react';

const DodaiCanvasContent = () => {
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [isCanvasActive, setIsCanvasActive] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState('');
  const { sendPromptAndGenerateArtifact } = useDodai();

  const { notes } = useNotes();
  const tagData = useTagGraph(notes);

  const handleGoBack = () => {
    if (isCanvasActive) {
      setIsCanvasActive(false);
      setInitialPrompt('');
    } else {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.close();
      }
    }
  };

  const handleSubmitInitialPrompt = async () => {
    if (!initialPrompt.trim()) return;
    await sendPromptAndGenerateArtifact(initialPrompt);
    setIsCanvasActive(true);
  };

  const suggestionPrompts = [
    {
      title: 'Écrire un poème',
      description: "Sur la beauté de l'automne.",
      fullPrompt:
        "Écris un poème sur la beauté de l'automne, en mettant en avant les couleurs chaudes et la mélancolie de la saison.",
    },
    {
      title: "Plan d'article de blog",
      description: 'Sur les voyages en solo.',
      fullPrompt:
        'Crée un plan détaillé pour un article de blog sur les avantages et les défis des voyages en solo, incluant des conseils pratiques.',
    },
    {
      title: 'Idée de recette rapide',
      description: 'Pour un dîner de semaine.',
      fullPrompt:
        'Propose une idée de recette rapide et saine pour un dîner de semaine, avec moins de 5 ingrédients principaux.',
    },
    {
      title: 'Email professionnel',
      description: 'Pour demander un feedback.',
      fullPrompt:
        'Rédige un email professionnel concis pour demander un feedback sur un projet récemment soumis à un collègue.',
    },
  ];

  const handleSuggestionClick = (prompt: string) => {
    setInitialPrompt(prompt);
  };

  const handleSuggestionKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, prompt: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setInitialPrompt(prompt);
    }
  };

  if (!isCanvasActive) {
    return (
      <div
        key="initialView"
        className="min-h-screen w-full bg-slate-900 text-slate-200 flex flex-col items-center justify-center font-sans p-4 animate-fade-in">
        <div className="w-full max-w-2xl h-72 md:h-96 mb-8">
          <TagGraphView
            tagData={tagData}
            activeTag={null}
            onTagSelect={() => {
              console.log('Tag selected in DodaiCanvas');
            }}
            onClearFilter={() => {
              console.log('Filter cleared in DodaiCanvas');
            }}
          />
        </div>
        <h2 className="text-3xl sm:text-4xl font-semibold text-slate-100 my-8 text-center">
          Que souhaitez-vous écrire aujourd'hui ?
        </h2>

        <div className="w-full max-w-xl lg:max-w-2xl relative flex items-center mb-6">
          <PlusCircle className="text-slate-400 w-6 h-6 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <textarea
            rows={3}
            value={initialPrompt}
            onChange={e => setInitialPrompt(e.target.value)}
            placeholder="Votre chef-d'œuvre commence avec cette invite..."
            className="w-full p-4 pl-14 pr-14 rounded-lg bg-slate-800 border border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-100 resize-none shadow-md focus:shadow-lg transition-shadow duration-200 h-auto min-h-[64px]"
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmitInitialPrompt();
              }
            }}
          />
          <button
            onClick={handleSubmitInitialPrompt}
            disabled={!initialPrompt.trim()}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-slate-700 text-slate-400 hover:text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            aria-label="Envoyer le prompt"
            title="Envoyer">
            <Send className="w-5 h-5 transition-colors duration-150" />
          </button>
        </div>

        <p className="text-slate-400 mb-6">ou inspirez-vous de nos suggestions :</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl mb-8">
          {suggestionPrompts.map((suggestion, index) => (
            <div
              key={index}
              role="button"
              tabIndex={0}
              className="bg-slate-800 p-4 rounded-lg border border-slate-700 hover:border-blue-500 cursor-pointer transition-all duration-200 hover:shadow-lg transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
              onClick={() => handleSuggestionClick(suggestion.fullPrompt)}
              onKeyDown={e => handleSuggestionKeyDown(e, suggestion.fullPrompt)}>
              <h4 className="font-semibold text-slate-100 mb-1">{suggestion.title}</h4>
              <p className="text-slate-400 text-sm">{suggestion.description}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      key="canvasView"
      className="h-screen w-full bg-slate-900 text-slate-100 overflow-hidden flex flex-col font-sans animate-fade-in">
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
            {/* {currentArtifact && currentArtifact.contents.length > 0 && (
              <span className="text-sm text-slate-400">- {currentArtifact.contents[0].title}</span>
            )} */}
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
          <ResizablePanel
            defaultSize={chatCollapsed ? 100 : 70}
            className="transition-all duration-300 bg-slate-800/30 p-4">
            <ArtifactPanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
};

const DodaiCanvas = () => (
  <DodaiProvider>
    <DodaiCanvasContent />
  </DodaiProvider>
);

export default DodaiCanvas;
