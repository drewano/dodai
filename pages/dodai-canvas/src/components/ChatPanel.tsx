import { useRef, useEffect, useState } from 'react';
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import { useDodai } from '../contexts/DodaiContext';
import { History, Send, PlusCircle } from 'lucide-react';

// Re-defined suggestion prompts (simplified for this example)
const suggestionPrompts = [
  {
    title: 'Écrire un poème',
    description: "Sur la beauté de l'automne.",
    fullPrompt:
      "Écris un poème sur la beauté de l'automne, en mettant en avant les couleurs chaudes et la mélancolie de la saison.",
  },
  {
    title: "Plan d'article de blog",
    description: 'Sur les voyages en solo.',
    fullPrompt:
      'Crée un plan détaillé pour un article de blog sur les avantages et les défis des voyages en solo, incluant des conseils pratiques.',
  },
  {
    title: 'Idée de recette rapide',
    description: 'Pour un dîner de semaine.',
    fullPrompt:
      'Propose une idée de recette rapide et saine pour un dîner de semaine, avec moins de 5 ingrédients principaux.',
  },
];

const ChatPanel = () => {
  const { messages, chatInput, setChatInput, isLoading, sendPromptAndGenerateArtifact } = useDodai();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [initialHubPrompt, setInitialHubPrompt] = useState(''); // For the dedicated input in hub empty state

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent, promptToSend?: string) => {
    e.preventDefault();
    const currentInput = (promptToSend || chatInput || initialHubPrompt).trim();
    if (!currentInput) return;
    await sendPromptAndGenerateArtifact(currentInput);
    setInitialHubPrompt(''); // Clear hub-specific input after sending
    // setChatInput('') is handled by sendPromptAndGenerateArtifact or DodaiContext
  };

  const handleSuggestionClick = (prompt: string) => {
    setInitialHubPrompt(prompt); // Set for the initial prompt area
    // Or, if preferred, directly send it:
    // sendPromptAndGenerateArtifact(prompt);
  };

  const renderInitialHubView = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-850 text-slate-200">
      <h2 className="text-2xl sm:text-3xl font-semibold text-slate-100 mb-6 sm:mb-8 text-center">
        Comment puis-je vous aider aujourd'hui ?
      </h2>

      {/* Initial Prompt Input Area */}
      <form
        onSubmit={e => handleSendMessage(e, initialHubPrompt)}
        className="w-full max-w-xl lg:max-w-2xl relative flex flex-col items-center mb-6">
        <div className="w-full relative flex items-center">
          <PlusCircle className="text-slate-400 w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <textarea
            rows={2}
            value={initialHubPrompt}
            onChange={e => setInitialHubPrompt(e.target.value)}
            placeholder="Votre chef-d'œuvre commence ici..."
            className="w-full p-3.5 pl-12 pr-12 rounded-lg bg-slate-800 border border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-100 resize-none shadow-md focus:shadow-lg transition-shadow duration-200 h-auto min-h-[56px] text-sm sm:text-base"
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e, initialHubPrompt);
              }
            }}
          />
          <button
            type="submit"
            disabled={!initialHubPrompt.trim() || isLoading}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-slate-700 text-slate-400 hover:text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            aria-label="Envoyer le prompt"
            title="Envoyer">
            <Send className="w-5 h-5 transition-colors duration-150" />
          </button>
        </div>
      </form>

      <p className="text-slate-400 mb-4 sm:mb-6 text-sm">ou inspirez-vous de nos suggestions :</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 w-full max-w-3xl">
        {suggestionPrompts.map((suggestion, index) => (
          <button
            key={index}
            className="bg-slate-800 p-3 sm:p-4 rounded-lg border border-slate-700 hover:border-blue-500 cursor-pointer transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 text-left"
            onClick={() => handleSuggestionClick(suggestion.fullPrompt)}>
            <h4 className="font-semibold text-slate-100 mb-1 text-sm sm:text-base">{suggestion.title}</h4>
            <p className="text-slate-400 text-xs sm:text-sm">{suggestion.description}</p>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-800 text-slate-100 shadow-md">
      {/* Header: Simplified, added History icon */}
      <div className="p-3 border-b border-slate-700 flex justify-between items-center flex-shrink-0 h-[50px] bg-slate-800">
        <h2 className="text-base font-semibold text-slate-200">Chat</h2>
        <button
          className="p-1.5 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors"
          title="Historique des chats (fonctionnalité à venir)"
          aria-label="Historique des chats"
          onClick={() => alert("Fonctionnalité d'historique à implémenter")}>
          <History size={18} />
        </button>
      </div>

      {messages.length === 0 && !isLoading ? (
        renderInitialHubView()
      ) : (
        <>
          {/* Zone d'affichage des messages */}
          <div className="flex-1 p-3 sm:p-4 overflow-y-auto bg-slate-850 space-y-3 sm:space-y-4">
            {messages.map(message => (
              <ChatMessage key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Zone de saisie */}
          <div className="p-3 sm:p-4 border-t border-slate-700 bg-slate-800">
            <ChatInput
              chatInput={chatInput} // Standard chat input for ongoing conversations
              setChatInput={setChatInput}
              handleSubmit={handleSendMessage}
              isLoading={isLoading}
              placeholder="Envoyer un message..."
            />
          </div>
        </>
      )}
    </div>
  );
};

export default ChatPanel;
