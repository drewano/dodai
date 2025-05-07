import React from 'react';
import type { NoteEntry } from '@extension/storage';

interface FolderBreadcrumbProps {
  path: NoteEntry[];
  onNavigate: (folderId: string | null) => void;
}

const FolderBreadcrumb: React.FC<FolderBreadcrumbProps> = ({ path, onNavigate }) => {
  if (path.length === 0) return null;

  return (
    <div className="flex items-center flex-wrap gap-1 mb-4 text-sm text-gray-300">
      <button onClick={() => onNavigate(null)} className="hover:text-blue-400 transition">
        Accueil
      </button>

      {path.map((folder, index) => (
        <React.Fragment key={folder.id}>
          <span className="text-gray-500">/</span>
          {index === path.length - 1 ? (
            <span className="font-medium text-blue-400">{folder.title}</span>
          ) : (
            <button onClick={() => onNavigate(folder.id)} className="hover:text-blue-400 transition">
              {folder.title}
            </button>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default FolderBreadcrumb;
