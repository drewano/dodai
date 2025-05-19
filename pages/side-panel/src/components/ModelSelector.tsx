import type React from 'react';

interface ModelSelectorProps {
  selectedModel: string;
  availableModels: string[];
  loadingModels: boolean;
  showModelDropdown: boolean;
  isLoading: boolean;
  isEnabled: boolean;
  isReady: boolean;
  modelDropdownRef: React.RefObject<HTMLDivElement | null>;
  toggleModelDropdown: () => void;
  handleModelChange: (model: string) => void;
}

/**
 * Composant pour le sélecteur de modèle
 */
export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  availableModels,
  loadingModels,
  showModelDropdown,
  isLoading,
  isEnabled,
  isReady,
  modelDropdownRef,
  toggleModelDropdown,
  handleModelChange,
}) => {
  return (
    <div className="relative" ref={modelDropdownRef}>
      <button
        onClick={toggleModelDropdown}
        className="flex items-center text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-800/50 transition-colors group"
        disabled={isLoading || !isEnabled || !isReady}
        title="Cliquez pour changer de modèle">
        <svg
          className="w-4 h-4 mr-1 group-hover:text-blue-400 transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <span className="text-gray-400 group-hover:text-gray-300 transition-colors">
          {selectedModel || 'Non défini'}
        </span>
        <svg
          className={`ml-1 w-3 h-3 transform transition-transform ${
            showModelDropdown ? 'rotate-180' : ''
          } group-hover:text-blue-400`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showModelDropdown && (
        <div className="absolute bottom-full left-0 mb-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg overflow-hidden z-10 w-48 animate-fadeIn">
          <div className="p-2 border-b border-gray-700 flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-300">Modèles disponibles</h3>
            <button
              onClick={toggleModelDropdown}
              className="p-1 text-gray-400 hover:text-blue-400 rounded-full hover:bg-gray-700/50"
              title="Actualiser la liste">
              <svg
                className={`w-3.5 h-3.5 ${loadingModels ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>

          <div className="py-1 max-h-48 overflow-y-auto scrollbar-thin">
            {loadingModels ? (
              <div className="px-3 py-2 text-gray-400 text-center">
                <div className="inline-block w-4 h-4 border-2 border-gray-600 border-t-blue-400 rounded-full animate-spin mr-2"></div>
                Chargement...
              </div>
            ) : (
              availableModels.map(model => (
                <button
                  key={model}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-700 transition-colors ${
                    model === selectedModel ? 'bg-blue-900/30 text-blue-300' : 'text-gray-300'
                  }`}
                  onClick={() => handleModelChange(model)}>
                  {model}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
