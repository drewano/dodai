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

  const containerClasses = `flex ${isUser ? 'justify-end' : 'justify-start'} my-3`;

  // Génère une bulle de message avec un style moderne et adaptatif
  const bubbleClasses = `relative max-w-[85%] p-4 rounded-lg shadow-md ${
    isUser
      ? 'bg-indigo-600 text-white rounded-tr-none'
      : isSystem
        ? 'bg-amber-700/80 text-amber-50 rounded-tl-none border border-amber-600/30'
        : 'bg-gray-800 text-gray-100 rounded-tl-none border border-gray-700'
  }`;

  return (
    <div className={containerClasses}>
      {/* Avatar (pour les messages non-utilisateur) */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
          {isSystem ? (
            <div className="bg-amber-700 text-amber-50 w-full h-full rounded-full flex items-center justify-center text-xs font-medium">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path
                  fillRule="evenodd"
                  d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          ) : (
            <div className="bg-gray-700 text-indigo-300 w-full h-full rounded-full flex items-center justify-center text-xs font-medium">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path
                  fillRule="evenodd"
                  d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </div>
      )}

      <div className={bubbleClasses}>
        {/* En-tête du message */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium opacity-80">{isUser ? 'Vous' : isSystem ? 'Système' : 'Assistant'}</div>

          {hasReasoning && toggleShowReasoning && (
            <button
              onClick={toggleShowReasoning}
              className={`text-xs ml-4 flex items-center ${
                isUser ? 'text-indigo-200 hover:text-white' : 'text-indigo-400 hover:text-indigo-300'
              }`}>
              <svg
                className="w-3.5 h-3.5 mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg">
                {showReasoning ? (
                  <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
                ) : (
                  <path
                    fillRule="evenodd"
                    d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                )}
              </svg>
              {showReasoning ? 'Masquer' : 'Raisonnement'}
            </button>
          )}
        </div>

        {/* Contenu du message avec Markdown */}
        <div className="whitespace-pre-wrap text-sm break-words">
          <div
            className={`
            prose prose-sm max-w-none 
            ${
              isUser
                ? 'prose-invert prose-a:text-indigo-200 prose-code:text-indigo-200 prose-strong:text-white'
                : isSystem
                  ? 'prose-invert prose-a:text-amber-200 prose-code:text-amber-200 prose-strong:text-amber-50'
                  : 'prose-invert prose-a:text-indigo-400 prose-code:text-teal-300 prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-700'
            } 
            prose-p:my-1 prose-headings:my-2
          `}>
            <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]} remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        </div>

        {/* Affichage du raisonnement (si disponible et activé) */}
        {hasReasoning && showReasoning && (
          <div className="mt-3 p-3 rounded bg-black/20 border border-white/10">
            <div className="text-xs font-medium opacity-80 mb-1 flex items-center">
              <svg
                className="w-3.5 h-3.5 mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg">
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
              </svg>
              Raisonnement
            </div>
            <div className="whitespace-pre-wrap text-xs opacity-90 font-mono">{message.reasoning}</div>
          </div>
        )}

        {/* Horodatage */}
        {message.timestamp && (
          <div className="mt-1 text-right">
            <span className="text-xs opacity-70">
              {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}

        {/* Petite flèche pour la bulle */}
        <div
          className={`absolute top-0 ${isUser ? 'right-0 -mr-2' : 'left-0 -ml-2'} w-2 h-2 overflow-hidden`}
          style={{ transform: 'translateY(10px)' }}>
          <div
            className={`absolute transform rotate-45 w-3 h-3 ${
              isUser
                ? 'bg-indigo-600'
                : isSystem
                  ? 'bg-amber-700/80 border border-amber-600/30'
                  : 'bg-gray-800 border border-gray-700'
            }`}
            style={{
              top: '-1.5px',
              [isUser ? 'left' : 'right']: '-1.5px',
              borderWidth: isUser ? '0' : '1px',
            }}></div>
        </div>
      </div>

      {/* Avatar (pour les messages utilisateur) - à droite */}
      {isUser && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center ml-2 mt-0.5 flex-shrink-0">
          <div className="bg-indigo-700 text-white w-full h-full rounded-full flex items-center justify-center text-xs font-medium">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};
