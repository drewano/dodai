import '@src/SidePanel.css';
import { useState, useCallback } from 'react';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { aiAgentStorage, mcpLoadedToolsStorage } from '@extension/storage';

// Hooks personnalisés
import { useAgentStatus } from './hooks/useAgentStatus';
import { useChatHistory } from './hooks/useChatHistory';
import { useModelSelection } from './hooks/useModelSelection';
import { useUnifiedChat } from './hooks/useUnifiedChat';

// Composants
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { ModelSelector } from './components/ModelSelector';
import { ChatHistorySidebar } from './components/ChatHistorySidebar';
import { MemorySwitch } from './components/MemorySwitch';
import { ToolsPopover } from './components/ToolsPopover';

const SidePanel = () => {
  const settings = useStorage(aiAgentStorage);
  const loadedTools = useStorage(mcpLoadedToolsStorage);
  const [showToolsPopover, setShowToolsPopover] = useState(false);

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

  // Hook pour la gestion du chat unifié (standard + RAG)
  const {
    messages,
    input,
    isLoading,
    isFetchingPageContent,
    showReasoning,
    isRagMode,
    messagesEndRef,
    setInput,
    setShowReasoning,
    setIsRagMode,
    handleSubmit,
    resetOrLoadMessages,
  } = useUnifiedChat({
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
          {/* Bouton Outils MCP */}
          <ToolsPopover isOpen={showToolsPopover} onOpenChange={setShowToolsPopover} tools={loadedTools}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </ToolsPopover>

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

      {/* Main content - Chat view */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Title with chat name and history button */}
        <div className="p-3 border-b border-gray-700 bg-gray-900 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium flex items-center text-gray-100">
              <button
                className="mr-2 p-1 text-gray-400 hover:text-blue-400 rounded-full hover:bg-gray-800/50"
                onClick={() => setShowChatHistory(!showChatHistory)}
                title="Historique des conversations">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <line x1="8" y1="10" x2="16" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="8" y1="14" x2="16" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="8" y1="18" x2="12" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              <span className="truncate max-w-[250px]">{isRagMode ? 'Chat avec mes notes' : currentChatName}</span>
            </h2>

            {/* Bouton pour renommer la conversation */}
            {activeConversationId && !isRagMode && (
              <button
                className="p-1 text-gray-400 hover:text-blue-400 rounded-full hover:bg-gray-800/50"
                onClick={() => {
                  const newName = prompt('Renommer la conversation:', currentChatName);
                  if (newName && newName.trim() !== '') {
                    renameCurrentConversation(newName.trim());
                  }
                }}
                title="Renommer la conversation">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Chat history sidebar - conditionally rendered */}
        {showChatHistory && !isRagMode && (
          <ChatHistorySidebar
            chatHistory={chatHistory}
            activeConversationId={activeConversationId}
            createNewConversation={handleCreateNewConversation}
            loadConversation={handleLoadConversation}
            deleteConversation={handleDeleteConversation}
            onClose={() => setShowChatHistory(false)}
          />
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
          {messages.map((message, index) => (
            <ChatMessage
              key={index}
              message={message}
              showReasoning={showReasoning}
              toggleShowReasoning={() => setShowReasoning(!showReasoning)}
            />
          ))}
          <div ref={messagesEndRef}></div>
        </div>

        {/* Memory Switch */}
        <MemorySwitch isRagModeActive={isRagMode} onToggleRagMode={setIsRagMode} isEnabled={isReady} />

        {/* Input area */}
        <div className="p-3 border-t border-gray-700 bg-gray-900">
          <ChatInput
            input={input}
            setInput={setInput}
            handleSubmit={handleSubmit}
            isLoading={isLoading || isFetchingPageContent}
            isEnabled={settings.isEnabled}
            isReady={isReady}
          />
          <div className="flex justify-between items-center text-xs mt-1">
            <div className="flex items-center space-x-2">
              <ModelSelector
                selectedModel={settings.selectedModel || 'llama3'}
                availableModels={availableModels}
                loadingModels={loadingModels}
                showModelDropdown={showModelDropdown}
                isLoading={isLoading || isFetchingPageContent}
                isEnabled={settings.isEnabled}
                isReady={isReady}
                modelDropdownRef={modelDropdownRef}
                toggleModelDropdown={toggleModelDropdown}
                handleModelChange={handleModelChange}
              />
              {isFetchingPageContent && (
                <span className="text-blue-300 flex items-center">
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-1 animate-pulse"></span>
                  Récupération du contenu de la page...
                </span>
              )}
            </div>

            {!isReady && (
              <span className="text-red-400 flex items-center">
                <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                Non connecté
              </span>
            )}
            {isReady && (
              <span className="text-green-400 flex items-center">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                Connecté
              </span>
            )}
          </div>
        </div>
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
