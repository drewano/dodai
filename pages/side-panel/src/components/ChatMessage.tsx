import type React from 'react';
import type { Message } from '../types';
import { MarkdownRenderer as MemoizedReactMarkdown } from './MarkdownRenderer';

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
  const hasReasoning = message.reasoning && message.reasoning.trim() !== '';

  const containerClasses = `flex ${isUser ? 'justify-end' : 'justify-start'}`;
  const bubbleClasses = `max-w-[85%] p-3 rounded-lg shadow-md text-sm ${isUser ? 'bg-blue-600 text-white' : isSystem ? 'bg-yellow-700 text-yellow-100' : 'bg-gray-700 text-gray-200'}`;

  return (
    <div className={containerClasses}>
      <div className={bubbleClasses}>
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs font-medium text-gray-400">
            {isUser ? 'Vous' : isSystem ? 'Système' : 'Assistant'}
          </div>

          {hasReasoning && (
            <button onClick={toggleShowReasoning} className="text-xs text-blue-400 hover:text-blue-300">
              {showReasoning ? 'Masquer le raisonnement' : 'Afficher le raisonnement'}
            </button>
          )}
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
