import React from 'react';
import { ChatConversation } from '@extension/storage';

interface ChatHistorySidebarProps {
  chatHistory: ChatConversation[];
  activeConversationId: string | null;
  createNewConversation: () => void;
  loadConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  onClose: () => void;
}

/**
 * Composant pour la barre latérale d'historique des chats
 */
export const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
  chatHistory,
  activeConversationId,
  createNewConversation,
  loadConversation,
  deleteConversation,
  onClose,
}) => {
  return (
    <div className="absolute left-0 top-[137px] bottom-0 w-64 bg-gray-800 border-r border-gray-700 shadow-lg z-10 overflow-y-auto p-3">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-gray-300">Historique des conversations</h3>
        <button
          className="p-1 text-gray-400 hover:text-blue-400 rounded-full hover:bg-gray-800/50"
          onClick={createNewConversation}
          title="Nouvelle conversation">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div className="space-y-2">
        {chatHistory && chatHistory.length > 0 ? (
          [...chatHistory]
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map(conversation => (
              <div
                key={conversation.id}
                className="flex items-center justify-between p-1 rounded-md hover:bg-gray-700/50">
                <button
                  className={`flex-1 text-left px-2 py-1.5 truncate ${
                    activeConversationId === conversation.id ? 'text-blue-300 font-medium' : 'text-gray-300'
                  }`}
                  onClick={() => loadConversation(conversation.id)}>
                  {conversation.name}
                </button>
                <button
                  className="p-1 text-gray-500 hover:text-red-400 rounded-full hover:bg-gray-700/50"
                  onClick={() => {
                    if (confirm(`Supprimer la conversation "${conversation.name}" ?`)) {
                      deleteConversation(conversation.id);
                    }
                  }}
                  title="Supprimer la conversation">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            ))
        ) : (
          <div className="text-gray-500 text-sm text-center py-3">
            Aucune conversation
            <button
              className="block mx-auto mt-2 px-3 py-1.5 bg-blue-900/50 text-blue-300 rounded-md hover:bg-blue-800/50"
              onClick={createNewConversation}>
              Créer une conversation
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
