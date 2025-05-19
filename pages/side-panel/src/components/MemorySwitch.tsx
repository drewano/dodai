import type React from 'react';

interface MemorySwitchProps {
  isRagModeActive: boolean;
  onToggleRagMode: (active: boolean) => void;
  isEnabled: boolean;
}

/**
 * Composant qui affiche un interrupteur pour basculer entre le mode chat normal et le mode RAG (avec notes)
 */
export const MemorySwitch: React.FC<MemorySwitchProps> = ({ isRagModeActive, onToggleRagMode, isEnabled }) => {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-t border-gray-700">
      <div className="flex items-center">
        <label htmlFor="rag-mode-switch" className="text-xs text-gray-300 mr-2">
          Rechercher dans mes notes
        </label>
        <button
          id="rag-mode-switch"
          type="button"
          role="switch"
          aria-checked={isRagModeActive}
          disabled={!isEnabled}
          className={`relative inline-flex flex-shrink-0 h-5 w-10 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            isEnabled ? (isRagModeActive ? 'bg-blue-600' : 'bg-gray-600') : 'bg-gray-700 cursor-not-allowed opacity-50'
          }`}
          onClick={() => onToggleRagMode(!isRagModeActive)}>
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
              isRagModeActive ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
      {isRagModeActive && (
        <div className="text-xs text-blue-300 flex items-center">
          <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
          Mode notes activé
        </div>
      )}
    </div>
  );
};
