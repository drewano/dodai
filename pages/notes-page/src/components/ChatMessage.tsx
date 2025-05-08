import type React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning?: string | null;
  timestamp?: number;
}

interface ChatMessageProps {
  message: Message;
  showReasoning?: boolean;
  toggleShowReasoning?: () => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, showReasoning = false, toggleShowReasoning }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const hasReasoning = message.reasoning && message.reasoning.trim() !== '';

  const containerClasses = `flex ${isUser ? 'justify-end' : 'justify-start'}`;
  const bubbleClasses = `max-w-[85%] p-3 rounded-lg shadow-md text-sm ${
    isUser ? 'bg-blue-600 text-white' : isSystem ? 'bg-yellow-700 text-yellow-100' : 'bg-gray-700 text-gray-200'
  }`;

  return (
    <div className={containerClasses}>
      <div className={bubbleClasses}>
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs font-medium text-gray-400">
            {isUser ? 'Vous' : isSystem ? 'Système' : 'Assistant'}
          </div>

          {hasReasoning && toggleShowReasoning && (
            <button onClick={toggleShowReasoning} className="text-xs text-blue-400 hover:text-blue-300">
              {showReasoning ? 'Masquer le raisonnement' : 'Afficher le raisonnement'}
            </button>
          )}
        </div>

        <div className="whitespace-pre-wrap text-sm prose prose-sm prose-invert max-w-none break-words">
          <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]} remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>

        {hasReasoning && showReasoning && (
          <div className="mt-2 p-2 bg-gray-700 rounded border border-gray-600">
            <div className="text-xs font-medium text-gray-400 mb-1">Raisonnement:</div>
            <div className="whitespace-pre-wrap text-xs text-gray-300">{message.reasoning}</div>
          </div>
        )}

        {message.timestamp && (
          <div className="mt-1 text-right">
            <span className="text-xs text-gray-400">
              {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
