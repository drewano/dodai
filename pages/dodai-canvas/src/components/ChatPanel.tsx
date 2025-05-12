import { useRef, useEffect } from 'react';
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import { useDodai } from '../contexts/DodaiContext';

const ChatPanel = () => {
  // Utilise les états et la nouvelle fonction du contexte
  const { messages, chatInput, setChatInput, isLoading, sendPromptAndGenerateArtifact } = useDodai();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Faire défiler vers le bas quand de nouveaux messages sont ajoutés
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fonction pour envoyer un message via le contexte
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentInput = chatInput.trim();
    if (!currentInput) return;
    // Appelle la fonction du contexte qui gère l'ajout user/placeholder et l'appel backend
    await sendPromptAndGenerateArtifact(currentInput);
    // setChatInput('') est géré dans sendPromptAndGenerateArtifact
    // setIsLoading(true/false) est géré dans sendPromptAndGenerateArtifact
  };

  return (
    <div className="flex flex-col h-full bg-slate-800 text-white">
      {/* En-tête simple */}
      <div className="p-3 border-b border-slate-700">
        <h2 className="text-lg font-semibold text-slate-100">Chat</h2>
      </div>

      {/* Zone d'affichage des messages */}
      <div className="flex-1 p-4 overflow-y-auto bg-slate-850 space-y-4">
        {messages.map(message => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {/* L'indicateur de chargement placeholder est maintenant géré par le message "..." ajouté dans le contexte */}
        {/* {isLoading && messages[messages.length - 1]?.role === 'user' && ( ... ) } */}
        <div ref={messagesEndRef} />
      </div>

      {/* Zone de saisie */}
      <div className="p-4 border-t border-slate-700 bg-slate-800">
        <ChatInput
          chatInput={chatInput}
          setChatInput={setChatInput}
          handleSubmit={handleSendMessage} // Utilise la fonction qui appelle le contexte
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default ChatPanel;
