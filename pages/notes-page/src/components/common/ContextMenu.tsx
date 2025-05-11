import type React from 'react';

interface ContextMenuProps {
  isVisible: boolean;
  x: number;
  y: number;
  onClose: () => void;
  onExport?: () => void; // Rendu optionnel pour les dossiers
  onDelete: () => void;
  isFolder: boolean; // Pour désactiver l'export sur les dossiers
}

const ContextMenu: React.FC<ContextMenuProps> = ({ isVisible, x, y, onClose, onExport, onDelete, isFolder }) => {
  if (!isVisible) {
    return null;
  }

  const handleExportClick = () => {
    if (onExport) {
      onExport();
    }
    onClose();
  };

  const handleDeleteClick = () => {
    onDelete();
    onClose();
  };

  return (
    <div
      className="fixed z-50 py-2 bg-slate-700 shadow-xl rounded-md border border-slate-600"
      style={{ top: y, left: x }}
      onClick={e => e.stopPropagation()} // Empêche la fermeture si on clique dans le menu
    >
      {!isFolder && onExport && (
        <button
          onClick={handleExportClick}
          className="flex items-center w-full px-4 py-2 text-sm text-slate-200 hover:bg-slate-600/70 transition-colors">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Exporter
        </button>
      )}
      <button
        onClick={handleDeleteClick}
        className="flex items-center w-full px-4 py-2 text-sm text-slate-200 hover:bg-slate-600/70 hover:text-red-300 transition-colors">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
        Supprimer
      </button>
    </div>
  );
};

export default ContextMenu;
