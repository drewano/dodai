import type React from 'react';
import type { McpToolInfo } from '@extension/storage';

interface ToolsPopoverProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tools: McpToolInfo[] | null;
  children: React.ReactNode;
}

/**
 * Composant qui affiche les outils MCP disponibles dans un popover
 */
export const ToolsPopover: React.FC<ToolsPopoverProps> = ({ isOpen, onOpenChange, tools, children }) => {
  // Gestionnaire pour les événements clavier
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') {
      onOpenChange(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => onOpenChange(!isOpen)}
        className="p-1 text-gray-200 hover:text-white rounded-full hover:bg-blue-800/50"
        title="Outils disponibles">
        {children}
      </button>

      {isOpen && (
        <>
          {/* Overlay pour fermer le popover en cliquant en dehors */}
          <div
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => onOpenChange(false)}
            role="button"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            aria-label="Fermer le menu d'outils"
          />

          {/* Contenu du popover */}
          <div className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-md shadow-lg p-4 z-50 border border-gray-700">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium text-gray-200">Outils disponibles</h3>
              <button onClick={() => onOpenChange(false)} className="text-gray-400 hover:text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {tools === null ? (
                <p className="text-gray-400 text-xs">Chargement des outils...</p>
              ) : tools.length === 0 ? (
                <p className="text-gray-400 text-xs">
                  Aucun outil MCP n'est actuellement chargé ou connecté. Vérifiez la configuration dans les options.
                </p>
              ) : (
                tools.map((tool, index) => (
                  <div key={index} className="bg-gray-700 p-3 rounded-lg">
                    <h4 className="text-xs font-medium text-blue-300 break-all">{tool.name}</h4>
                    <p className="text-xs text-gray-400 mt-1">Serveur: {tool.serverName}</p>
                    <p className="text-xs text-gray-300 mt-1">{tool.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
