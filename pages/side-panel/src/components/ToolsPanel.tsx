import type React from 'react';
import type { McpToolInfo } from '@extension/storage';

interface ToolsPanelProps {
  loadedTools: McpToolInfo[] | null;
}

/**
 * Composant pour le panneau d'outils
 */
export const ToolsPanel: React.FC<ToolsPanelProps> = ({ loadedTools }) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-800">
      <h2 className="text-lg font-semibold text-gray-200 mb-4">Outils MCP Disponibles</h2>
      {loadedTools === null ? (
        <p className="text-gray-400">Chargement des outils...</p>
      ) : loadedTools.length === 0 ? (
        <p className="text-gray-400">
          Aucun outil MCP n'est actuellement chargé ou connecté. Vérifiez la configuration dans les options.
        </p>
      ) : (
        <div className="space-y-3">
          {loadedTools.map((tool, index) => (
            <div key={index} className="bg-gray-700 p-3 rounded-lg shadow">
              <h3 className="text-sm font-medium text-blue-300 break-all">{tool.name}</h3>
              <p className="text-xs text-gray-400 mt-1 mb-2">Serveur: {tool.serverName}</p>
              <p className="text-xs text-gray-300">{tool.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
