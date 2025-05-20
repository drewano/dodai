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

  const containerClasses = `flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 animate-fade-in`;
  const bubbleClasses = `max-w-[80%] p-3.5 rounded-xl shadow-md text-sm transition-colors border 
    ${
      isUser
        ? 'bg-background-accent text-white border-blue-700/20 hover:shadow-blue-900/30'
        : 'bg-background-tertiary text-text-primary border-border-primary hover:shadow-slate-900/20'
    }`;

  // Styles Markdown
  const markdownClasses =
    'prose prose-sm prose-invert max-w-none break-words prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-1 prose-a:text-text-accent hover:prose-a:text-blue-300 prose-code:bg-slate-900/70 prose-code:px-1.5 prose-code:py-1 prose-code:rounded-md prose-code:text-sky-300 prose-code:text-xs prose-pre:bg-slate-900/70 prose-pre:p-3 prose-pre:rounded-lg prose-pre:overflow-x-auto';

  // Formater la date (optionnel, retiré pour simplicité pour l'instant)
  // const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
  //   hour: '2-digit',
  //   minute: '2-digit',
  // });

  return (
    <div className={containerClasses}>
      <div className={bubbleClasses}>
        {/* Header simple avec le rôle */}
        <div className="flex items-center mb-1">
          <span className={`text-xs font-semibold ${isUser ? 'text-blue-200' : 'text-text-secondary'}`}>
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
