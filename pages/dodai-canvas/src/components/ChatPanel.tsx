import { useRef, useEffect, useState } from 'react';
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import { useDodai } from '../contexts/DodaiContext';

const ChatPanel = () => {
  const { messages, input, setInput, isLoading, sendMessage, artifact } = useDodai();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [forceNewArtifact, setForceNewArtifact] = useState(false);

  // Déterminer si un artefact existe déjà avec du contenu
  const hasExistingContent =
    artifact.type === 'text'
      ? (artifact as { fullMarkdown: string }).fullMarkdown.trim().length > 0
      : (artifact as { code: string }).code.trim().length > 0;

  // Faire défiler vers le bas quand de nouveaux messages sont ajoutés
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Ignorer les soumissions vides
    if (!input.trim()) return;

    // Envoyer le message avec l'indication qu'il s'agit d'une nouvelle génération si demandé
    await sendMessage(input, forceNewArtifact);

    // Réinitialiser le mode après l'envoi
    setForceNewArtifact(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-800 text-white">
      {/* En-tête du panneau de chat */}
      <div className="p-3 border-b border-slate-700 flex justify-between items-center">
        <h2 className="text-lg font-medium text-blue-300">Chat</h2>

        {hasExistingContent && (
          <div className="flex space-x-2">
            <button
              onClick={() => setForceNewArtifact(!forceNewArtifact)}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                forceNewArtifact ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              title={
                forceNewArtifact
                  ? "Mode activé : création d'un nouvel artefact"
                  : "Cliquez pour créer un nouvel artefact plutôt que modifier l'existant"
              }>
              {forceNewArtifact ? 'Nouvel artefact ✓' : 'Nouvel artefact'}
            </button>
          </div>
        )}
      </div>

      {/* Zone d'affichage des messages */}
      <div className="flex-1 p-4 overflow-y-auto bg-slate-850">
        {messages.map(message => (
          <ChatMessage key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Zone de saisie */}
      <div className="p-4 border-t border-slate-700">
        <ChatInput
          input={input}
          setInput={setInput}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
          forceNewArtifact={forceNewArtifact}
        />
      </div>
    </div>
  );
};

export default ChatPanel;
