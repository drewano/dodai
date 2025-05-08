import type React from 'react';
import type { Message } from '../types';
import { MarkdownRenderer as MemoizedReactMarkdown } from './MarkdownRenderer';
import { useState } from 'react';

// Constante pour le type de message (pour éviter d'importer directement depuis le background)
const SAVE_MESSAGE_AS_NOTE = 'SAVE_MESSAGE_AS_NOTE';

interface ChatMessageProps {
  message: Message;
  showReasoning: boolean;
  toggleShowReasoning: () => void;
}

/**
 * Composant pour afficher un message de chat
 */
export const ChatMessage: React.FC<ChatMessageProps> = ({ message, showReasoning, toggleShowReasoning }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isAssistant = message.role === 'assistant';
  const hasReasoning = message.reasoning && message.reasoning.trim() !== '';
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const containerClasses = `flex ${isUser ? 'justify-end' : 'justify-start'}`;
  const bubbleClasses = `max-w-[85%] p-3 rounded-lg shadow-md text-sm ${isUser ? 'bg-blue-600 text-white' : isSystem ? 'bg-yellow-700 text-yellow-100' : 'bg-gray-700 text-gray-200'}`;

  const handleSaveAsNote = () => {
    setIsSaving(true);
    setSavedSuccess(false);

    chrome.runtime.sendMessage(
      {
        type: SAVE_MESSAGE_AS_NOTE,
        content: message.content,
      },
      response => {
        setIsSaving(false);
        if (response && response.success) {
          setSavedSuccess(true);
          setTimeout(() => setSavedSuccess(false), 3000); // Masquer après 3 secondes
        } else {
          console.error('Erreur lors de la sauvegarde de la note:', response?.error);
          // On pourrait ajouter une notification d'erreur ici
        }
      },
    );
  };

  return (
    <div className={containerClasses}>
      <div className={bubbleClasses}>
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs font-medium text-gray-400">
            {isUser ? 'Vous' : isSystem ? 'Système' : 'Assistant'}
          </div>

          <div className="flex items-center space-x-2">
            {hasReasoning && (
              <button onClick={toggleShowReasoning} className="text-xs text-blue-400 hover:text-blue-300">
                {showReasoning ? 'Masquer le raisonnement' : 'Afficher le raisonnement'}
              </button>
            )}

            {isAssistant && (
              <button
                onClick={handleSaveAsNote}
                disabled={isSaving}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center"
                title="Enregistrer dans les notes">
                {isSaving ? (
                  <span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mr-1"></span>
                ) : savedSuccess ? (
                  <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M20 6L9 17L4 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H16L21 8V19C21 20.1046 20.1046 21 19 21Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M17 21V13H7V21"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M7 3V8H15"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                {isSaving ? 'Enregistrement...' : savedSuccess ? 'Enregistré' : 'Enregistrer dans les notes'}
              </button>
            )}
          </div>
        </div>

        <div className="whitespace-pre-wrap text-sm">
          <MemoizedReactMarkdown
            className="prose prose-sm prose-invert max-w-none break-words"
            content={message.content}
          />
        </div>

        {message.sourceDocuments && message.sourceDocuments.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-700">
            <div className="text-xs font-medium text-gray-400 mb-1">Sources:</div>
            <div className="space-y-1">
              {message.sourceDocuments.map((doc, idx) => (
                <div key={idx} className="text-xs p-2 bg-gray-700 rounded">
                  <div className="font-medium text-blue-300">{doc.title}</div>
                  <div className="text-gray-300 mt-1 text-xs">{doc.contentSnippet}</div>
                  {doc.sourceUrl && (
                    <a
                      href={doc.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline mt-1 inline-block">
                      Source originale
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {hasReasoning && showReasoning && (
          <div className="mt-2 p-2 bg-gray-700 rounded border border-gray-600">
            <div className="text-xs font-medium text-gray-400 mb-1">Raisonnement:</div>
            <div className="whitespace-pre-wrap text-xs text-gray-300">{message.reasoning}</div>
          </div>
        )}

        {message.isStreaming && (
          <div className="mt-1">
            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-150 ml-1"></span>
            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-300 ml-1"></span>
          </div>
        )}
      </div>
    </div>
  );
};
