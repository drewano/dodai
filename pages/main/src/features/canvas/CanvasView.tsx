import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@extension/ui';
import { useDodai } from './contexts/DodaiContext';
import ChatPanel from './components/ChatPanel';
import ArtifactPanel from './components/ArtifactPanel';
import { useState, useCallback, useEffect } from 'react';
import TagGraphView from '../notes/components/tag/TagGraphView';
import { useNotes } from '../notes/hooks/useNotes';
import { useTagGraph } from '../notes/hooks/useTagGraph';
import TextChatView from '../text-chat/components/TextChatView';
import DodaiCanvasHistoryPanel from './components/DodaiCanvasHistoryPanel';
import { useDodaiCanvasHistory } from './hooks/useDodaiCanvasHistory';
import { v4 as uuidv4 } from 'uuid';

const CanvasViewContent = () => {
  const {
    currentArtifact,
    selectedDodaiModel,
    setMessages,
    setCurrentArtifact,
    setSelectedDodaiModel,
    resetChatAndArtifact,
    setOnChatTurnEnd,
  } = useDodai();
  const {
    chatHistory,
    activeConversationId: activeHistoryConvId,
    loadConversation,
    deleteConversation,
    saveCurrentChatSession,
    createNewConversation,
    renameConversationInHistory,
  } = useDodaiCanvasHistory();

  const { notes } = useNotes();
  const tagData = useTagGraph(notes);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<'canvas' | 'chat'>('canvas');
  const [showHistoryPanel, setShowHistoryPanel] = useState<boolean>(false);

  const showArtifactPanel = !!currentArtifact;

  const handleTagSelect = (tag: string) => {
    setActiveTag(tag);
    console.log('Tag selected in CanvasView Hub:', tag);
  };

  const handleClearFilter = () => {
    setActiveTag(null);
    console.log('Filter cleared in CanvasView Hub');
  };

  const toggleHistoryPanel = () => {
    setShowHistoryPanel(prev => !prev);
  };

  const handleLoadConversation = useCallback(
    async (id: string) => {
      console.log('[CanvasView] Attempting to load conversation:', id);
      const result = await loadConversation(id);
      if (result.success && result.messages) {
        setMessages(result.messages);
        setCurrentArtifact(result.artifact || null);
        if (result.model) {
          setSelectedDodaiModel(result.model);
        }
        setShowHistoryPanel(false);
        console.log('[CanvasView] Conversation loaded successfully, new message count:', result.messages.length);
      } else {
        console.error('[CanvasView] Failed to load conversation:', result.error);
        // Afficher une notification à l'utilisateur ici si nécessaire
      }
    },
    [loadConversation, setMessages, setCurrentArtifact, setSelectedDodaiModel, setShowHistoryPanel],
  );

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      console.log('[CanvasView] Attempting to delete conversation:', id);
      const result = await deleteConversation(id);
      if (result.success) {
        console.log('[CanvasView] Conversation deleted. Was active:', result.wasActive);
        if (result.wasActive) {
          resetChatAndArtifact();
          setMessages([
            {
              id: uuidv4(),
              role: 'assistant',
              content: 'Conversation supprimée. Veuillez en sélectionner une autre ou en créer une nouvelle.',
              timestamp: Date.now(),
            },
          ]);
          // Optionnel: Créer automatiquement une nouvelle conversation vide dans l'historique ?
          // Pour l'instant, on laisse l'utilisateur choisir ou le contexte se réinitialiser.
        }
        // Pas besoin de fermer le panneau ici, car la liste se mettra à jour
        // et si la conv active a été supprimée, l'état du chat est déjà réinitialisé.
      } else {
        console.error('[CanvasView] Failed to delete conversation:', result.error);
        // Afficher une notification à l'utilisateur ici si nécessaire
      }
    },
    [
      deleteConversation,
      resetChatAndArtifact,
      setMessages,
      createNewConversation,
      setSelectedDodaiModel,
      selectedDodaiModel,
    ],
  );

  const handleRenameConversation = useCallback(
    async (id: string, newName: string) => {
      console.log(`[CanvasView] Attempting to rename conversation ${id} to "${newName}"`);
      const result = await renameConversationInHistory(id, newName);
      if (result) {
        console.log(`[CanvasView] Conversation ${id} renamed successfully to "${newName}"`);
        // Optional: Show success notification
      } else {
        console.error(`[CanvasView] Failed to rename conversation ${id}`);
        // Optional: Show error notification
      }
      // The history panel will close the input itself.
      // The chatHistory list from useDodaiCanvasHistory will update automatically due to useStorage.
    },
    [renameConversationInHistory],
  );

  // Effect to register the onChatTurnEnd handler
  useEffect(() => {
    console.log('[CanvasView] Registering onChatTurnEnd handler.');
    setOnChatTurnEnd((finalMessages, modelUsed) => {
      console.log('[CanvasView] onChatTurnEnd triggered. Saving session.');
      saveCurrentChatSession(finalMessages, currentArtifact, modelUsed || undefined);
    });

    // Cleanup: Unregister handler when component unmounts or dependencies change
    return () => {
      console.log('[CanvasView] Unregistering onChatTurnEnd handler.');
      setOnChatTurnEnd(null);
    };
  }, [setOnChatTurnEnd, saveCurrentChatSession, currentArtifact]); // Added currentArtifact as a dependency

  return (
    <div className="flex flex-1 h-full bg-background-primary text-text-primary font-sans overflow-hidden relative">
      {activeViewMode === 'canvas' ? (
        <ResizablePanelGroup direction="horizontal" className="flex flex-1 overflow-hidden rounded-md shadow-md">
          <ResizablePanel defaultSize={showArtifactPanel ? 35 : 70} minSize={30} className="min-w-[300px] relative">
            <div className="h-full bg-slate-800 rounded-md overflow-hidden">
              <ChatPanel
                activeViewMode={activeViewMode}
                setActiveViewMode={setActiveViewMode}
                onToggleHistory={toggleHistoryPanel}
              />
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
      ) : (
        <div className="flex flex-col flex-1 h-full">
          <div className="h-[56px] flex-shrink-0 bg-slate-800 rounded-t-md relative">
            <ChatPanel
              activeViewMode={activeViewMode}
              setActiveViewMode={setActiveViewMode}
              onToggleHistory={toggleHistoryPanel}
            />
          </div>
          <div className="flex-1 overflow-hidden bg-slate-800 rounded-b-md">
            <TextChatView />
          </div>
        </div>
      )}
      {showHistoryPanel && (
        <DodaiCanvasHistoryPanel
          chatHistory={chatHistory || []}
          activeConversationId={activeHistoryConvId}
          onLoadConversation={handleLoadConversation}
          onDeleteConversation={handleDeleteConversation}
          onRenameConversation={handleRenameConversation}
          onClose={() => setShowHistoryPanel(false)}
        />
      )}
    </div>
  );
};

const CanvasView = () => <CanvasViewContent />;

export default CanvasView;
