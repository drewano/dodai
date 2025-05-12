import type React from 'react';
import type { Message } from '../types';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  // On ne gère pas 'system' pour l'instant, on le traite comme assistant

  const containerClasses = `flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in`;
  const bubbleClasses = `max-w-[85%] p-3 rounded-lg shadow-md text-sm transition-colors border 
    ${
      isUser
        ? 'bg-blue-600 text-white border-blue-700/30 hover:shadow-blue-900/20'
        : 'bg-slate-700 text-slate-200 border-slate-600 hover:shadow-slate-900/20' // Style pour assistant
    }`;

  // Styles Markdown (simplifiés)
  const markdownClasses =
    'prose prose-sm prose-invert max-w-none break-words prose-p:m-0 prose-ul:m-0 prose-ol:m-0 prose-li:m-0 prose-a:text-blue-300 hover:prose-a:text-blue-200 prose-code:bg-slate-800/60 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-sm prose-code:text-blue-200 prose-pre:bg-slate-850 prose-pre:p-2 prose-pre:rounded-md';

  // Formater la date (optionnel, retiré pour simplicité pour l'instant)
  // const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
  //   hour: '2-digit',
  //   minute: '2-digit',
  // });

  return (
    <div className={containerClasses}>
      <div className={bubbleClasses}>
        {/* Header simple avec le rôle */}
        <div className="flex items-center mb-1.5">
          <span className={`text-xs font-semibold ${isUser ? 'text-blue-300' : 'text-slate-300'}`}>
            {isUser ? 'Vous' : 'Assistant'}
          </span>
          {/* <span className="ml-2 text-xs opacity-60">{formattedTime}</span> */}
        </div>

        {/* Contenu du message */}
        <div className={markdownClasses}>
          <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]} remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};
