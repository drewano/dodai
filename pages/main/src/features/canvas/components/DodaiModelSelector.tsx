import type React from 'react';
import { useRef, useState, useEffect } from 'react';
import { useDodaiModelSelection, type OllamaModelInfo } from '../hooks/useDodaiModelSelection';

// A simple brain icon (replace with Lucide or other library if available)
const BrainIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}>
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v1.14a1.83 1.83 0 0 0 .66.458c.2.12.42.21.65.284.33.1.68.167 1.03.195.4.032.8.032 1.17-.02.25-.035.5-.086.74-.153.25-.07.49-.16.72-.273a1.33 1.33 0 0 0 .6-.387M9.5 2A2.5 2.5 0 0 0 7 4.5v1.14a1.83 1.83 0 0 1-.66.458c-.2.12-.42.21-.65.284-.33.1-.68.167-1.03.195-.4.032-.8.032-1.17-.02-.25-.035-.5-.086-.74-.153a1.67 1.67 0 0 1-.72-.273 1.33 1.33 0 0 1-.6-.387" />
    <path d="M12 11.5A2.5 2.5 0 0 1 9.5 9V7.5A2.5 2.5 0 0 1 12 5a2.5 2.5 0 0 1 2.5 2.5V9A2.5 2.5 0 0 1 12 11.5Z" />
    <path d="M15.5 22a2.5 2.5 0 0 1-2.5-2.5v-1.14a1.83 1.83 0 0 0-.66-.458c-.2-.12-.42-.21-.65-.284-.33-.1-.68-.167-1.03-.195-.4-.032-.8-.032-1.17-.02-.25-.035-.5-.086-.74-.153a1.67 1.67 0 0 1-.72-.273 1.33 1.33 0 0 1-.6-.387" />
    <path d="M15.5 22a2.5 2.5 0 0 0 2.5-2.5v-1.14a1.83 1.83 0 0 1 .66-.458c.2-.12.42-.21.65-.284.33-.1.68-.167 1.03-.195.4.032.8.032 1.17-.02.25-.035.5-.086.74-.153a1.67 1.67 0 0 0 .72-.273 1.33 1.33 0 0 0 .6-.387" />
    <path d="M4.5 12.5c0-1.04.26-2.02.74-2.89.49-.87 1.17-1.65 2.02-2.29" />
    <path d="M16.74 7.32c.85.64 1.53 1.42 2.02 2.29.48.87.74 1.85.74 2.89" />
    <path d="M12 12.5v1.86A2.5 2.5 0 0 1 9.5 17V19a2.5 2.5 0 0 0 5 0v-2A2.5 2.5 0 0 1 12 14.36V12.5Z" />
  </svg>
);

export const DodaiModelSelector: React.FC = () => {
  const {
    availableModels,
    selectedDodaiModel,
    loadingModels,
    error,
    handleModelChange,
    fetchAvailableModels, // For manual refresh
  } = useDodaiModelSelection();

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => {
    if (!showDropdown) {
      fetchAvailableModels(); // Refresh models when opening
    }
    setShowDropdown(prev => !prev);
  };

  const handleSelectModel = (modelName: string) => {
    handleModelChange(modelName);
    setShowDropdown(false);
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm 
                   bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 
                   border border-slate-700 hover:border-slate-600 
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-all duration-150 shadow-sm">
        <BrainIcon className="w-4 h-4 text-slate-400 group-hover:text-blue-400" />
        <span>
          {loadingModels && !selectedDodaiModel ? 'Chargement...' : selectedDodaiModel || 'Sélectionner modèle'}
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 transform transition-transform duration-150 ${showDropdown ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <div className="absolute left-0 mt-1 w-64 bg-slate-850 border border-slate-700 rounded-md shadow-xl z-20 overflow-hidden animate-fadeInUpMenu">
          <div className="p-2 border-b border-slate-700 flex justify-between items-center">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Modèles Disponibles</h3>
            <button
              onClick={() => fetchAvailableModels()} // Manual refresh button
              disabled={loadingModels}
              className="p-1 text-slate-400 hover:text-blue-400 rounded-full hover:bg-slate-700/50 focus:outline-none focus:ring-1 focus:ring-blue-500"
              title="Rafraîchir la liste">
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

          {error && <p className="px-3 py-2 text-xs text-red-400 bg-red-900/20">Erreur: {error}</p>}

          <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-850">
            {loadingModels && availableModels.length === 0 ? (
              <div className="px-3 py-2 text-slate-400 text-xs text-center">
                <div className="inline-block w-3 h-3 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin mr-1.5"></div>
                Chargement des modèles...
              </div>
            ) : availableModels.length > 0 ? (
              availableModels.map((model: OllamaModelInfo) => (
                <button
                  key={model.id || model.name} // Use model.id if available, fallback to name
                  className={`w-full text-left px-3 py-1.5 text-sm transition-colors duration-100 
                               ${
                                 model.name === selectedDodaiModel
                                   ? 'bg-blue-600/30 text-blue-300 hover:bg-blue-600/40'
                                   : 'text-slate-300 hover:bg-slate-700/50 hover:text-slate-100'
                               }`}
                  onClick={() => handleSelectModel(model.name)}>
                  {model.name}
                  {/* Optionally show model size or modification date if needed */}
                  {/* <span className="text-xs text-slate-500 ml-2">({model.size ? (model.size / 1e9).toFixed(2) + ' GB' : 'taille inconnue'})</span> */}
                </button>
              ))
            ) : (
              !loadingModels && <p className="px-3 py-2 text-xs text-slate-500 text-center">Aucun modèle trouvé.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
