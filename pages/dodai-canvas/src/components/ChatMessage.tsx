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
  const isSystem = message.role === 'system';

  const containerClasses = `flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in`;
  const bubbleClasses = `max-w-[85%] p-3 rounded-lg shadow-md text-sm transition-all 
    ${
      isUser
        ? 'bg-blue-600 text-white border border-blue-700/30 hover:shadow-blue-900/20'
        : isSystem
          ? 'bg-yellow-700/80 text-yellow-50 border border-yellow-700 hover:shadow-yellow-900/20'
          : 'bg-slate-700 text-slate-200 border border-slate-600 hover:shadow-slate-900/20'
    }`;

  // Formater la date à partir du timestamp
  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Styles Markdown classes
  const markdownClasses =
    'prose prose-sm prose-invert max-w-none break-words prose-headings:font-medium prose-a:text-blue-300 dark:prose-a:text-blue-300 prose-a:underline prose-a:underline-offset-2 hover:prose-a:text-blue-200 prose-code:bg-slate-800/60 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-md prose-code:text-blue-200 prose-pre:bg-slate-900/80 prose-pre:border prose-pre:border-slate-700 prose-strong:font-semibold prose-strong:text-slate-100 prose-em:text-slate-300 prose-li:marker:text-slate-400';

  return (
    <div className={containerClasses}>
      <div className={bubbleClasses}>
        <div className="flex items-center mb-1">
          <div className="text-xs font-medium text-slate-400 flex items-center">
            {isUser ? (
              <>
                <svg
                  className="w-3.5 h-3.5 mr-1 text-blue-300"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg">
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
                <span className="font-medium text-blue-300">Vous</span>
              </>
            ) : isSystem ? (
              <>
                <svg
                  className="w-3.5 h-3.5 mr-1 text-yellow-300"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg">
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
                <span className="font-medium text-yellow-300">Système</span>
              </>
            ) : (
              <>
                <svg
                  className="w-3.5 h-3.5 mr-1 text-slate-300"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg">
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
                <span className="font-medium text-slate-300">Assistant</span>
              </>
            )}
            <span className="ml-2 text-xs opacity-70">{formattedTime}</span>
          </div>
        </div>

        <div className="whitespace-pre-wrap text-sm">
          <div className={markdownClasses}>
            <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]} remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};
