import React from 'react';
import type { NoteEntry } from '@extension/storage';

interface FolderBreadcrumbProps {
  path: NoteEntry[];
  onNavigate: (folderId: string | null) => void;
}

const FolderBreadcrumb: React.FC<FolderBreadcrumbProps> = ({ path, onNavigate }) => {
  if (path.length === 0) return null;

  return (
    <nav aria-label="Hiérarchie des dossiers" className="flex items-center flex-wrap gap-1.5 text-sm text-slate-300">
      <button
        onClick={() => onNavigate(null)}
        className="hover:text-blue-400 transition-colors duration-150 px-1 py-0.5 rounded hover:bg-slate-700/40 focus:outline-none focus:ring-1 focus:ring-blue-400/30">
        <svg
          className="inline-block w-3.5 h-3.5 mr-1 -mt-0.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        Accueil
      </button>

      {path.map((folder, index) => (
        <React.Fragment key={folder.id}>
          <svg
            className="w-3 h-3 text-slate-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          {index === path.length - 1 ? (
            <span className="font-medium text-blue-400 px-1 py-0.5">{folder.title}</span>
          ) : (
            <button
              onClick={() => onNavigate(folder.id)}
              className="hover:text-blue-400 transition-colors duration-150 px-1 py-0.5 rounded hover:bg-slate-700/40 focus:outline-none focus:ring-1 focus:ring-blue-400/30">
              {folder.title}
            </button>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default FolderBreadcrumb;
