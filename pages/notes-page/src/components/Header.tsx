import type React from 'react';
import FolderBreadcrumb from './FolderBreadcrumb';
import type { NoteEntry } from '@extension/storage';

interface HeaderProps {
  showLeftSidebar: boolean;
  showRightSidebar: boolean;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  selectedNote: NoteEntry | null;
  selectedItemType: 'note' | 'chat';
  folderPath: NoteEntry[];
  navigateToFolder: (folderId: string | null) => void;
  currentFolderId: string | null;
}

const Header: React.FC<HeaderProps> = ({
  showLeftSidebar,
  showRightSidebar,
  toggleLeftSidebar,
  toggleRightSidebar,
  selectedNote,
  selectedItemType,
  folderPath,
  navigateToFolder,
  currentFolderId,
}) => {
  return (
    <header className="sticky top-0 z-20 bg-slate-800/85 backdrop-blur-lg border-b border-slate-700/50 shadow-sm py-3 px-4 flex items-center gap-3">
      {/* Logo et boutons de bascule des barres latérales */}
      <div className="flex items-center gap-3">
        <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-500 text-transparent bg-clip-text tracking-tight">
          DoDai Notes
        </span>

        <div className="flex items-center gap-1.5">
          {/* Bouton pour bascule de la barre latérale gauche */}
          <button
            onClick={toggleLeftSidebar}
            className={`p-1.5 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
              showLeftSidebar
                ? 'bg-slate-700/80 text-slate-200 hover:bg-slate-600'
                : 'bg-slate-700/40 text-slate-400 hover:bg-slate-700/60 hover:text-slate-300'
            }`}
            title={showLeftSidebar ? 'Masquer la barre latérale gauche' : 'Afficher la barre latérale gauche'}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              {showLeftSidebar ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <>
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M9 3v18" />
                </>
              )}
            </svg>
          </button>

          {/* Bouton pour bascule de la barre latérale droite */}
          <button
            onClick={toggleRightSidebar}
            className={`p-1.5 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
              showRightSidebar
                ? 'bg-slate-700/80 text-slate-200 hover:bg-slate-600'
                : 'bg-slate-700/40 text-slate-400 hover:bg-slate-700/60 hover:text-slate-300'
            }`}
            title={showRightSidebar ? 'Masquer la barre latérale droite' : 'Afficher la barre latérale droite'}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              {showRightSidebar ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <>
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M15 3v18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Séparateur vertical */}
      <div className="h-6 w-px bg-slate-700/50 mx-1"></div>

      {/* Fil d'Ariane et titre de la note */}
      <div className="flex-1 flex flex-col">
        {/* Fil d'Ariane si on est dans un dossier */}
        {currentFolderId && (
          <div className="text-sm">
            <FolderBreadcrumb path={folderPath} onNavigate={navigateToFolder} />
          </div>
        )}

        {/* Titre de la note sélectionnée */}
        {selectedItemType === 'note' && selectedNote && (
          <div className="font-medium text-lg text-slate-100 truncate mt-0.5">{selectedNote.title}</div>
        )}

        {/* Titre pour l'affichage d'un chat */}
        {selectedItemType === 'chat' && <div className="font-medium text-lg text-slate-100 mt-0.5">Conversation</div>}

        {/* Message par défaut si rien n'est sélectionné */}
        {!selectedNote && selectedItemType === 'note' && (
          <div className="font-medium text-lg text-slate-400 mt-0.5">Sélectionnez une note</div>
        )}
      </div>

      {/* Espace pour d'autres actions ou menus */}
      <div className="flex items-center gap-2">{/* Emplacement pour des actions futures */}</div>
    </header>
  );
};

export default Header;
