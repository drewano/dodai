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

  // Libellé pour l'affichage du modèle
  const assistantLabel = isAssistant && message.model ? `Assistant (${message.model})` : 'Assistant';

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
          <div className="text-xs font-medium text-gray-400 flex items-center">
            {isUser ? (
              <>
                <svg className="w-3.5 h-3.5 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M3 21V19C3 17.9391 3.42143 16.9217 4.17157 16.1716C4.92172 15.4214 5.93913 15 7 15H17C18.0609 15 19.0783 15.4214 19.8284 16.1716C20.5786 16.9217 21 17.9391 21 19V21"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Vous
              </>
            ) : isSystem ? (
              <>
                <svg className="w-3.5 h-3.5 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 16V12M12 8H12.01"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Système
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M19 17V22M21.5 19.5H16.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {assistantLabel}
              </>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {hasReasoning && (
              <button
                onClick={toggleShowReasoning}
                className="p-1 text-blue-400 hover:text-blue-300 rounded-full hover:bg-gray-600/50"
                title={showReasoning ? 'Masquer le raisonnement' : 'Afficher le raisonnement'}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {showReasoning ? (
                    <path
                      d="M18 15l-6-6-6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : (
                    <path
                      d="M6 9l6 6 6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </svg>
              </button>
            )}

            {isAssistant && (
              <button
                onClick={handleSaveAsNote}
                disabled={isSaving}
                className="p-1 text-blue-400 hover:text-blue-300 rounded-full hover:bg-gray-600/50"
                title="Enregistrer dans les notes">
                {isSaving ? (
                  <span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
                ) : savedSuccess ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M20 6L9 17L4 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5a2 2 0 002 2h2a2 2 0 002-2"
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
                )}
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
