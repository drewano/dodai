import type React from 'react';
import type { Message } from '../types';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ModelSelector } from './ModelSelector';
import { ChatHistorySidebar } from './ChatHistorySidebar';
import type { ChatConversation } from '@extension/storage';

interface ChatPanelProps {
  // Données de chat
  messages: Message[];
  input: string;
  currentChatName: string;
  showReasoning: boolean;
  showChatHistory: boolean;
  isLoading: boolean;
  isFetchingPageContent?: boolean;
  isReady: boolean;
  // Données de modèle
  selectedModel: string;
  availableModels: string[];
  loadingModels: boolean;
  showModelDropdown: boolean;
  modelDropdownRef: React.RefObject<HTMLDivElement | null>;
  // Chat history
  chatHistory: ChatConversation[];
  activeConversationId: string | null;
  // Callbacks
  setInput: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  setShowReasoning: (show: boolean) => void;
  setShowChatHistory: (show: boolean) => void;
  createNewConversation: () => void;
  loadConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  renameCurrentConversation: (newName: string) => void;
  toggleModelDropdown: () => void;
  handleModelChange: (model: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  isEnabled: boolean;
}

/**
 * Composant pour le panneau de chat
 */
export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  input,
  currentChatName,
  showReasoning,
  showChatHistory,
  isLoading,
  isFetchingPageContent = false,
  isReady,
  selectedModel,
  availableModels,
  loadingModels,
  showModelDropdown,
  modelDropdownRef,
  chatHistory,
  activeConversationId,
  setInput,
  handleSubmit,
  setShowReasoning,
  setShowChatHistory,
  createNewConversation,
  loadConversation,
  deleteConversation,
  renameCurrentConversation,
  toggleModelDropdown,
  handleModelChange,
  messagesEndRef,
  isEnabled,
}) => {
  return (
    <>
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
            <span className="truncate max-w-[250px]">{currentChatName}</span>
          </h2>

          {/* Bouton pour renommer la conversation */}
          {activeConversationId && (
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
      {showChatHistory && (
        <ChatHistorySidebar
          chatHistory={chatHistory}
          activeConversationId={activeConversationId}
          createNewConversation={createNewConversation}
          loadConversation={loadConversation}
          deleteConversation={deleteConversation}
          onClose={() => setShowChatHistory(false)}
        />
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.map((message, index) => (
          <ChatMessage
            key={index}
            message={message}
            index={index}
            showReasoning={showReasoning}
            toggleShowReasoning={() => setShowReasoning(!showReasoning)}
          />
        ))}
        <div ref={messagesEndRef}></div>
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-gray-700 bg-gray-900">
        <ChatInput
          input={input}
          setInput={setInput}
          handleSubmit={handleSubmit}
          isLoading={isLoading || isFetchingPageContent}
          isEnabled={isEnabled}
          isReady={isReady}
        />
        <div className="flex justify-between items-center text-xs mt-1">
          <div className="flex items-center space-x-2">
            <ModelSelector
              selectedModel={selectedModel}
              availableModels={availableModels}
              loadingModels={loadingModels}
              showModelDropdown={showModelDropdown}
              isLoading={isLoading || isFetchingPageContent}
              isEnabled={isEnabled}
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
    </>
  );
};
