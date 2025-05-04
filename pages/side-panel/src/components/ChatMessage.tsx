import React, { useState } from 'react';
import { Message } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ThinkingIcon } from './ThinkingIcon';
import { useMarkdownProcessing } from '../hooks/useMarkdownProcessing';

interface ChatMessageProps {
  message: Message;
  index: number;
  showReasoning: boolean;
  toggleShowReasoning: () => void;
}

/**
 * Composant pour afficher un message de chat
 */
export const ChatMessage: React.FC<ChatMessageProps> = ({ message, index, showReasoning, toggleShowReasoning }) => {
  const { extractReasoning } = useMarkdownProcessing();

  // Extraire le raisonnement et le contenu propre
  let displayContent = message.content || '';
  let displayReasoning = message.reasoning || '';

  // Si le contenu contient des balises <think>, les extraire
  if (displayContent && displayContent.includes('<think>')) {
    const extracted = extractReasoning(displayContent);
    displayContent = extracted.cleanContent;

    // Si on a extrait du raisonnement, l'ajouter à celui existant
    if (extracted.reasoning) {
      if (displayReasoning) {
        displayReasoning += '\n\n' + extracted.reasoning;
      } else {
        displayReasoning = extracted.reasoning;
      }
    }
  }

  const hasReasoning = displayReasoning && displayReasoning.length > 0;
  const isCurrentlyInThinkMode = message.isStreaming && hasReasoning && !displayContent.trim();

  // Vérifier si le contenu est vide (pour éviter d'afficher une bulle vide)
  const hasContent = displayContent && displayContent.trim().length > 0;

  return (
    <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-1.5`}>
      <div
        className={`message-bubble py-1.5 px-2.5 rounded-lg shadow-sm max-w-[85%] text-left ${
          message.role === 'user'
            ? 'bg-blue-600 text-white rounded-br-none'
            : message.role === 'assistant'
              ? 'bg-gray-700 text-gray-200 rounded-bl-none border border-gray-600'
              : 'bg-gray-600 text-gray-300 mx-auto text-xs rounded-full'
        }`}>
        {/* Indicateur de raisonnement en cours */}
        {isCurrentlyInThinkMode && (
          <div className="mb-1 text-xs text-blue-400 flex items-center">
            <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-pulse mr-1"></span>
            Utilisation d'outils en cours...
          </div>
        )}

        {/* Si le message est vide mais en streaming avec raisonnement, afficher un indicateur */}
        {message.isStreaming && !hasContent && hasReasoning && !isCurrentlyInThinkMode && (
          <div className="mb-1 text-xs text-blue-400 flex items-center">
            <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-pulse mr-1"></span>
            Traitement des informations...
          </div>
        )}

        {message.role === 'assistant' ? (
          <div className="message-content">
            {hasContent ? (
              <MarkdownRenderer content={displayContent} />
            ) : message.isStreaming && !isCurrentlyInThinkMode ? (
              <span className="inline-block w-3 h-3 bg-current animate-pulse rounded"></span>
            ) : null}
            {message.isStreaming && !isCurrentlyInThinkMode && hasContent && (
              <span className="inline-block w-1.5 h-4 ml-0.5 bg-current animate-pulse rounded"></span>
            )}
          </div>
        ) : (
          <p className="message-content whitespace-pre-wrap text-sm leading-tight m-0">
            {message.content}
            {message.isStreaming && !isCurrentlyInThinkMode && (
              <span className="inline-block w-1.5 h-4 ml-0.5 bg-current animate-pulse rounded"></span>
            )}
          </p>
        )}

        {/* Affichage du raisonnement si disponible et option activée */}
        {hasReasoning && showReasoning && (
          <div className="mt-2 pt-2 border-t border-gray-600 text-left">
            <div className="text-xs text-gray-400 mb-1">
              <span>Utilisation des outils et raisonnement:</span>
            </div>
            <pre className="text-xs bg-gray-800 p-2 rounded whitespace-pre-wrap text-gray-300 overflow-auto max-h-64 text-left">
              {displayReasoning}
            </pre>
          </div>
        )}

        {/* Bouton compact pour afficher/masquer le raisonnement si disponible */}
        {hasReasoning && (
          <div className="mt-1 flex justify-end">
            <button
              onClick={toggleShowReasoning}
              className={`inline-flex items-center text-xs px-2 py-0.5 rounded ${
                showReasoning ? 'bg-blue-800/40 text-blue-300' : 'bg-gray-800/40 text-gray-300 hover:bg-blue-900/20'
              }`}>
              <ThinkingIcon />
              <span className="ml-1">{showReasoning ? 'Masquer' : 'Afficher les détails'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
