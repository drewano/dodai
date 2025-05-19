import type React from 'react';

interface ActionToolbarProps {
  onConcise: () => void;
  onProfessionalTone: () => void;
  onExplainSimply: () => void;
  // onInsertMarkdown: (before: string, after?: string) => void; // Ancienne prop
}

const MarkdownToolbar: React.FC<ActionToolbarProps> = ({ onConcise, onProfessionalTone, onExplainSimply }) => {
  const buttonClass =
    'p-2 hover:bg-slate-300 dark:hover:bg-slate-700 rounded text-sm transition-colors flex items-center space-x-1.5';
  const iconClass = 'w-4 h-4';

  return (
    <div className="flex flex-wrap items-center gap-1 p-1.5 bg-slate-200 dark:bg-slate-800 rounded-t-md border-b border-slate-300 dark:border-slate-700">
      <button onClick={onConcise} className={buttonClass} title="Rendre plus concis">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={iconClass}>
          <polyline points="10 19 2 12 10 5"></polyline>
          <polyline points="22 19 14 12 22 5"></polyline>
        </svg>
        <span>Conciser</span>
      </button>

      <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-1"></div>

      <button onClick={onProfessionalTone} className={buttonClass} title="Changer le ton en Professionnel">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={iconClass}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          <path d="M12 11v4" />
          <path d="M10 13h4" />
        </svg>
        <span>Ton Pro</span>
      </button>

      <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-1"></div>

      <button onClick={onExplainSimply} className={buttonClass} title="Expliquer plus simplement">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={iconClass}>
          <path d="M12 1a3 3 0 0 0-3 3v1a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M12 16.6A4.6 4.6 0 0 1 8 13v-2.5A4.5 4.5 0 0 1 12.5 6H13" />
          <path d="M8 10a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2" />
          <path d="M12 10a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2" />
          <path d="M16 10a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2" />
        </svg>
        <span>Simplifier</span>
      </button>
    </div>
  );
};

export default MarkdownToolbar;
