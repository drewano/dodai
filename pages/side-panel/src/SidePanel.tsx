import '@src/SidePanel.css';
import { useState, useCallback } from 'react';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { aiAgentStorage, mcpLoadedToolsStorage } from '@extension/storage';

// Types et composants
import type { TabType } from './types';
import { TabNavigation } from './components/TabNavigation';
import { ChatPanel } from './components/ChatPanel';
import { ToolsPanel } from './components/ToolsPanel';
import { MemoryPanel } from './components/MemoryPanel';

// Hooks personnalisés
import { useAgentStatus } from './hooks/useAgentStatus';
import { useChat } from './hooks/useChat';
import { useChatHistory } from './hooks/useChatHistory';
import { useModelSelection } from './hooks/useModelSelection';

const SidePanel = () => {
  const settings = useStorage(aiAgentStorage);
  const loadedTools = useStorage(mcpLoadedToolsStorage);

  // État pour l'onglet actif
  const [activeTab, setActiveTab] = useState<TabType>('chat');

  // Hook pour le statut de l'agent IA
  const { isReady } = useAgentStatus();

  // Hook pour la gestion de l'historique des conversations
  const {
    chatHistory,
    showChatHistory,
    activeConversationId,
    currentChatName,
    setShowChatHistory,
    createNewConversation,
    loadConversation,
    renameCurrentConversation,
    deleteConversation,
  } = useChatHistory();

  // Hook pour la sélection du modèle
  const {
    availableModels,
    loadingModels,
    showModelDropdown,
    modelDropdownRef,
    handleModelChange,
    toggleModelDropdown,
  } = useModelSelection();

  // Hook pour la gestion du chat
  const {
    messages,
    input,
    isLoading,
    isFetchingPageContent,
    showReasoning,
    messagesEndRef,
    setInput,
    setShowReasoning,
    handleSubmit,
    resetOrLoadMessages,
  } = useChat({
    isReady,
    selectedModel: settings.selectedModel || 'llama3',
    activeConversationId,
  });

  // Gestionnaires pour les actions liées aux conversations
  const handleCreateNewConversation = useCallback(async () => {
    const result = await createNewConversation(
      "Bonjour! Comment puis-je vous aider aujourd'hui?",
      settings.selectedModel || 'llama3',
    );

    if (result.success && result.initialMessages) {
      resetOrLoadMessages(result.initialMessages);
    }
  }, [createNewConversation, settings.selectedModel, resetOrLoadMessages]);

  const handleLoadConversation = useCallback(
    async (id: string) => {
      const result = await loadConversation(id);

      if (result.success && result.messages) {
        resetOrLoadMessages(result.messages);

        // Mise à jour du modèle si nécessaire
        if (result.model && result.model !== settings.selectedModel) {
          handleModelChange(result.model);
        }
      }
    },
    [loadConversation, resetOrLoadMessages, handleModelChange, settings.selectedModel],
  );

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      const result = await deleteConversation(id);

      // Si la conversation supprimée était active, créer une nouvelle conversation
      if (result.isActive) {
        handleCreateNewConversation();
      }
    },
    [deleteConversation, handleCreateNewConversation],
  );

  // Fonction pour ouvrir la page de notes
  const openNotesPage = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('notes-page/index.html') });
  };

  return (
    <div className="fixed inset-0 w-full h-full flex flex-col bg-gray-900 text-white">
      {/* Header with app name and buttons */}
      <div className="flex items-center justify-between p-2 bg-blue-950 shadow-md">
        <div className="flex items-center">
          <span className="text-2xl mr-2">🦤</span>
          <h1 className="text-base font-medium">DoDai</h1>
        </div>
        <div className="flex items-center space-x-2">
          {/* Bouton Voir mes notes */}
          <button
            className="p-1 text-gray-200 hover:text-white rounded-full hover:bg-blue-800/50"
            onClick={openNotesPage}
            title="Voir mes notes">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9 12h6M9 16h6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Bouton Options */}
          <button
            className="p-1 text-gray-200 hover:text-white rounded-full hover:bg-blue-800/50"
            onClick={() => chrome.runtime.openOptionsPage()}
            title="Options">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs navigation */}
      <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main content based on active tab */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeTab === 'chat' && (
          <ChatPanel
            messages={messages}
            input={input}
            currentChatName={currentChatName}
            showReasoning={showReasoning}
            showChatHistory={showChatHistory}
            isLoading={isLoading}
            isFetchingPageContent={isFetchingPageContent}
            isReady={isReady}
            selectedModel={settings.selectedModel || 'llama3'}
            availableModels={availableModels}
            loadingModels={loadingModels}
            showModelDropdown={showModelDropdown}
            modelDropdownRef={modelDropdownRef}
            chatHistory={chatHistory || []}
            activeConversationId={activeConversationId}
            setInput={setInput}
            handleSubmit={handleSubmit}
            setShowReasoning={setShowReasoning}
            setShowChatHistory={setShowChatHistory}
            createNewConversation={handleCreateNewConversation}
            loadConversation={handleLoadConversation}
            deleteConversation={handleDeleteConversation}
            renameCurrentConversation={renameCurrentConversation}
            toggleModelDropdown={() => toggleModelDropdown(settings.baseUrl)}
            handleModelChange={handleModelChange}
            messagesEndRef={messagesEndRef}
            isEnabled={settings.isEnabled}
          />
        )}

        {activeTab === 'tools' && <ToolsPanel loadedTools={loadedTools} />}

        {activeTab === 'memory' && <MemoryPanel />}
      </div>
    </div>
  );
};

export default withErrorBoundary(
  withSuspense(
    SidePanel,
    <div className="flex items-center justify-center h-full bg-gray-900 text-gray-400">Chargement...</div>,
  ),
  <div className="flex items-center justify-center h-full bg-gray-900 text-red-400">Une erreur est survenue</div>,
);
