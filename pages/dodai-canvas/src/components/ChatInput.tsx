import type React from 'react';
import { useDodai } from '../contexts/DodaiContext';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoading?: boolean;
  forceNewArtifact?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  handleSubmit,
  isLoading = false,
  forceNewArtifact = false,
}) => {
  const { artifact } = useDodai();

  // Déterminer si un artefact existe déjà avec du contenu
  const hasExistingContent =
    artifact.type === 'text'
      ? (artifact as { fullMarkdown: string }).fullMarkdown.trim().length > 0
      : (artifact as { code: string }).code.trim().length > 0;

  // Si on force un nouvel artefact, ne pas montrer l'indicateur de modification
  const isModifyingArtifact = hasExistingContent && !forceNewArtifact;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      {isModifyingArtifact && (
        <div className="text-xs text-blue-400 mb-1 flex items-center">
          <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mr-1"></span>
          Votre message sera interprété comme une demande de modification de l'artefact actuel
        </div>
      )}
      {forceNewArtifact && hasExistingContent && (
        <div className="text-xs text-green-400 mb-1 flex items-center">
          <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-1"></span>
          Mode création d'un nouvel artefact activé
        </div>
      )}
      <div className="relative flex items-center">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={
            isModifyingArtifact
              ? "Demandez une modification de l'artefact existant..."
              : "Décrivez l'artefact que vous souhaitez créer..."
          }
          className="w-full p-2.5 pr-12 rounded-lg bg-slate-700 border border-slate-600 hover:border-slate-500 
          focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400 
          text-sm resize-none transition-colors"
          rows={3}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="absolute right-2 bottom-2 p-1.5 rounded-md text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 
          disabled:opacity-50 disabled:pointer-events-none transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
          {isLoading ? (
            <svg
              className="animate-spin h-5 w-5 text-blue-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M22 2L11 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M22 2L15 22L11 13L2 9L22 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Indicateur de statut */}
      {isLoading && (
        <div className="text-xs text-blue-400 mt-1 flex items-center animate-pulse">
          <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mr-1"></span>
          Génération en cours...
        </div>
      )}
    </form>
  );
};
