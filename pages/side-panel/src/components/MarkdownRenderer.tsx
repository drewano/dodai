import type React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Composant pour le rendu Markdown avec styles personnalisés
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  return (
    <div className={`markdown-content text-sm leading-tight ${className || ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          // Style pour les paragraphes
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,

          // Style pour les titres
          h1: ({ children }) => <h1 className="text-lg font-bold my-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold my-1.5">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold my-1">{children}</h3>,

          // Style pour les listes
          ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
          li: ({ children }) => <li className="mb-0.5">{children}</li>,

          // Style pour les liens
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline">
              {children}
            </a>
          ),

          // Style pour les blocs de code
          code: props => {
            const { children, className } = props;
            // @ts-expect-error - inline est une propriété valide de react-markdown pour code
            const isInline = props.inline;

            if (isInline) {
              return <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs">{children}</code>;
            }
            return (
              <div className="bg-gray-100 dark:bg-gray-800 rounded-md mb-2 overflow-auto">
                <pre className="p-2 text-xs whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                  <code className={className}>{children}</code>
                </pre>
              </div>
            );
          },

          // Style pour les tableaux
          table: ({ children }) => (
            <div className="overflow-auto mb-2">
              <table className="min-w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-gray-100 dark:bg-gray-800">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-gray-200 dark:border-gray-700">{children}</tr>,
          th: ({ children }) => <th className="py-1 px-2 text-left font-semibold">{children}</th>,
          td: ({ children }) => <td className="py-1 px-2">{children}</td>,

          // Style pour les citations
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-2 py-0.5 italic text-gray-700 dark:text-gray-300 mb-2">
              {children}
            </blockquote>
          ),

          // Style pour le texte en gras et en italique
          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,

          // Style pour les séparateurs horizontaux
          hr: () => <hr className="my-2 border-t border-gray-300 dark:border-gray-600" />,
        }}>
        {content}
      </ReactMarkdown>
    </div>
  );
};
