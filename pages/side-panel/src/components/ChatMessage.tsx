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
  const isAssistant = message.role === 'assistant';

  const containerClasses = `flex ${isUser ? 'justify-end' : 'justify-start'}`;
  const bubbleClasses = `max-w-[85%] p-3 rounded-lg shadow-md text-sm ${isUser ? 'bg-blue-600 text-white' : isSystem ? 'bg-yellow-700 text-yellow-100' : 'bg-gray-700 text-gray-200'}`;

  return (
    <div className={containerClasses}>
      <div className={bubbleClasses}>
        {isSystem && <p className="font-semibold mb-1">System Message:</p>}
        <MemoizedReactMarkdown
          className="prose prose-sm prose-invert max-w-none break-words"
          content={message.content}
        />
        {isAssistant && message.reasoning && (
          <button
            onClick={toggleShowReasoning}
            className="mt-2 text-xs text-blue-300 hover:text-blue-200 focus:outline-none">
            {showReasoning ? 'Cacher le raisonnement' : 'Montrer le raisonnement'}
          </button>
        )}
        {isAssistant && showReasoning && message.reasoning && (
          <pre className="mt-2 p-2 bg-gray-800 rounded text-xs whitespace-pre-wrap break-all">{message.reasoning}</pre>
        )}
        {/* Display Source Documents for RAG */}
        {message.sourceDocuments && message.sourceDocuments.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-600">
            <h4 className="text-xs font-semibold mb-1 text-gray-400">Sources:</h4>
            <ul className="space-y-1">
              {message.sourceDocuments.map(doc => (
                <li key={doc.id} className="text-xs">
                  <a
                    href={doc.sourceUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={doc.contentSnippet}
                    className={`hover:underline ${doc.sourceUrl ? 'text-blue-400' : 'text-gray-500 cursor-default'}`}>
                    {doc.title || 'Source Note'}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
