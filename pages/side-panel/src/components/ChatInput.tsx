import React from 'react';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  isEnabled: boolean;
  isReady: boolean;
}

/**
 * Composant pour le champ de saisie du chat
 */
export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  handleSubmit,
  isLoading,
  isEnabled,
  isReady,
}) => {
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <div className="relative flex items-center">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Envoyer un message..."
          className="w-full p-2.5 pr-10 rounded-lg bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400 text-sm"
          disabled={isLoading || !isEnabled || !isReady}
        />
        <button
          type="submit"
          disabled={isLoading || !isEnabled || !isReady || !input.trim()}
          className="absolute right-2 p-1.5 rounded-md text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 disabled:opacity-50 disabled:pointer-events-none transition-colors">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M22 2L11 13"></path>
            <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
          </svg>
        </button>
      </div>
    </form>
  );
};
