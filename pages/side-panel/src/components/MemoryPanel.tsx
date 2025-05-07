import type React from 'react';
import { useRagChat } from '../hooks/useRagChat';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

/**
 * Composant pour le panneau de mémoire, maintenant avec chat RAG
 */
export const MemoryPanel: React.FC = () => {
  const { messages, input, isLoading, messagesEndRef, setInput, handleSubmit } = useRagChat();

  return (
    <div className="flex-1 flex flex-col bg-gray-800 min-h-0">
      <div className="p-3 border-b border-gray-700 bg-gray-900 shadow-sm">
        <h2 className="text-base font-medium text-gray-100">Mémoire (Chat avec Notes)</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((message, index) => (
          <ChatMessage key={index} message={message} showReasoning={false} toggleShowReasoning={() => {}} />
        ))}
        <div ref={messagesEndRef}></div>
      </div>

      <div className="p-3 border-t border-gray-700 bg-gray-900">
        <ChatInput
          input={input}
          setInput={setInput}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
          isEnabled={true}
          isReady={true}
        />
        {isLoading && (
          <div className="text-xs text-blue-300 mt-1 flex items-center">
            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-1 animate-pulse"></span>
            Recherche dans les notes...
          </div>
        )}
      </div>
    </div>
  );
};
