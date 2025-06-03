import type React from 'react';
import type { Message } from '../types';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { FileText, ExternalLink } from 'lucide-react';

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

        {/* Sources (pour les messages RAG) */}
        {!isUser && message.sourceDocuments && message.sourceDocuments.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-600/30">
            <div className="flex items-center gap-1.5 mb-2">
              <FileText size={14} className="text-text-secondary" />
              <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                Sources trouvées dans vos notes
              </span>
            </div>
            <div className="space-y-2">
              {message.sourceDocuments.map((source, index) => (
                <div
                  key={source.id || index}
                  className="bg-slate-800/50 rounded-lg p-2.5 border border-slate-700/50 hover:border-slate-600/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-medium text-text-primary truncate mb-1">{source.title}</h4>
                      <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                        {source.contentSnippet}
                      </p>
                    </div>
                    {source.sourceUrl && (
                      <a
                        href={source.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center p-1 rounded-md hover:bg-slate-700/50 text-text-secondary hover:text-text-accent transition-colors"
                        title="Ouvrir la source">
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
