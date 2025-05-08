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
  isEditing: boolean;
  editedTitle: string;
  onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
  isEditing,
  editedTitle,
  onTitleChange,
}) => {
  return (
    <header className="sticky top-0 z-10 bg-gray-800 bg-opacity-80 backdrop-blur-sm border-b border-gray-700 shadow-md py-2 px-4 flex items-center">
      {/* Logo et boutons de bascule des barres latérales */}
      <div className="flex items-center space-x-2 mr-4">
        <span className="text-xl font-bold text-blue-400 mr-2">DoDai Notes</span>

        {/* Bouton pour bascule de la barre latérale gauche */}
        <button
          onClick={toggleLeftSidebar}
          className={`p-1.5 rounded ${showLeftSidebar ? 'bg-gray-700' : 'bg-gray-600'} hover:bg-gray-600 transition-colors`}
          title={showLeftSidebar ? 'Masquer la barre latérale gauche' : 'Afficher la barre latérale gauche'}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={showLeftSidebar ? 'M11 19l-7-7 7-7m8 14l-7-7 7-7' : 'M13 5l7 7-7 7M5 5l7 7-7 7'}
            />
          </svg>
        </button>

        {/* Bouton pour bascule de la barre latérale droite */}
        <button
          onClick={toggleRightSidebar}
          className={`p-1.5 rounded ${showRightSidebar ? 'bg-gray-700' : 'bg-gray-600'} hover:bg-gray-600 transition-colors`}
          title={showRightSidebar ? 'Masquer la barre latérale droite' : 'Afficher la barre latérale droite'}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={showRightSidebar ? 'M13 5l7 7-7 7M5 5l7 7-7 7' : 'M11 19l-7-7 7-7m8 14l-7-7 7-7'}
            />
          </svg>
        </button>
      </div>

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
          <div className="font-medium text-lg text-white truncate">
            {isEditing ? (
              <input
                type="text"
                value={editedTitle}
                onChange={onTitleChange}
                placeholder="Titre de la note"
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500"
                aria-label="Titre de la note"
              />
            ) : (
              selectedNote.title
            )}
          </div>
        )}

        {/* Titre pour l'affichage d'un chat */}
        {selectedItemType === 'chat' && <div className="font-medium text-lg text-white">Conversation</div>}

        {/* Message par défaut si rien n'est sélectionné */}
        {!selectedNote && selectedItemType === 'note' && (
          <div className="font-medium text-lg text-gray-400">Sélectionnez une note</div>
        )}
      </div>

      {/* Espace pour d'autres actions ou menus */}
      <div className="flex items-center space-x-2">{/* Autres boutons d'action pourraient aller ici */}</div>
    </header>
  );
};

export default Header;
