import { useRef, useEffect, useState } from 'react';
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import { useDodai } from '../contexts/DodaiContext';
import { History, Send, PlusCircle, LayoutDashboard, MessagesSquare } from 'lucide-react';
import { DodaiModelSelector } from './DodaiModelSelector';

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

type ChatPanelProps = {
  activeViewMode: 'canvas' | 'chat';
  setActiveViewMode: (mode: 'canvas' | 'chat') => void;
};

const ChatPanel: React.FC<ChatPanelProps> = ({ activeViewMode, setActiveViewMode }) => {
  const { messages, chatInput, setChatInput, isLoading, sendPromptAndGenerateArtifact } = useDodai();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [initialHubPrompt, setInitialHubPrompt] = useState('');

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
    setInitialHubPrompt('');
  };

  const handleSuggestionClick = (prompt: string) => {
    setInitialHubPrompt(prompt);
  };

  const renderInitialHubView = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 bg-background-secondary text-text-primary">
      <h2 className="text-2xl sm:text-3xl font-semibold text-text-primary mb-6 sm:mb-8 text-center">
        Comment puis-je vous aider aujourd'hui ?
      </h2>

      <form
        onSubmit={e => handleSendMessage(e, initialHubPrompt)}
        className="w-full max-w-md lg:max-w-lg relative flex flex-col items-center mb-6">
        <div className="w-full relative flex items-center">
          <PlusCircle className="text-text-muted w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <textarea
            rows={2}
            value={initialHubPrompt}
            onChange={e => setInitialHubPrompt(e.target.value)}
            placeholder="Votre chef-d'œuvre commence ici..."
            className="w-full p-4 pl-12 pr-14 rounded-xl bg-background-tertiary border border-border-primary focus:ring-2 focus:ring-border-accent focus:border-border-accent text-text-primary resize-none shadow-sm focus:shadow-lg transition-all duration-200 h-auto min-h-[60px] text-sm sm:text-base leading-relaxed"
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
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-2.5 rounded-lg hover:bg-background-quaternary text-text-muted hover:text-text-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            aria-label="Envoyer le prompt"
            title="Envoyer">
            <Send className="w-5 h-5 transition-colors duration-150" />
          </button>
        </div>
      </form>

      <p className="text-text-muted mb-4 sm:mb-6 text-sm">ou inspirez-vous de nos suggestions :</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 w-full max-w-2xl">
        {suggestionPrompts.map((suggestion, index) => (
          <button
            key={index}
            className="bg-background-tertiary p-4 rounded-xl border border-border-primary hover:border-border-accent cursor-pointer transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-border-accent focus:ring-opacity-75 text-left group"
            onClick={() => handleSuggestionClick(suggestion.fullPrompt)}>
            <h4 className="font-semibold text-text-primary group-hover:text-text-accent mb-1 text-sm sm:text-base transition-colors duration-150">
              {suggestion.title}
            </h4>
            <p className="text-text-secondary text-xs sm:text-sm">{suggestion.description}</p>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-background-tertiary text-text-primary shadow-md">
      <div className="p-3 flex justify-between items-center flex-shrink-0 h-[56px] bg-background-tertiary border-b border-border-primary">
        <div className="flex-shrink-0">
          <DodaiModelSelector />
        </div>
        <div className="flex items-center bg-background-quaternary rounded-full p-0.5">
          <button
            onClick={() => setActiveViewMode('canvas')}
            className={`flex items-center justify-center gap-1.5 py-1 px-3 rounded-full text-xs font-medium transition-all duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:ring-offset-background-quaternary
              ${activeViewMode === 'canvas' ? 'bg-blue-600 text-white shadow-sm' : 'text-text-secondary hover:bg-slate-700 hover:text-text-primary'}`}
            aria-pressed={activeViewMode === 'canvas'}
            title="Vue Canvas">
            <LayoutDashboard size={14} />
            <span className="hidden sm:inline">Canvas</span>
          </button>
          <button
            onClick={() => setActiveViewMode('chat')}
            className={`flex items-center justify-center gap-1.5 py-1 px-3 rounded-full text-xs font-medium transition-all duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 focus-visible:ring-offset-background-quaternary
              ${activeViewMode === 'chat' ? 'bg-blue-600 text-white shadow-sm' : 'text-text-secondary hover:bg-slate-700 hover:text-text-primary'}`}
            aria-pressed={activeViewMode === 'chat'}
            title="Vue Chat">
            <MessagesSquare size={14} />
            <span className="hidden sm:inline">Chat</span>
          </button>
        </div>
        {activeViewMode === 'chat' && (
          <button
            className="p-2 rounded-full text-text-secondary hover:text-text-primary hover:bg-background-quaternary transition-colors"
            title="Historique des chats (fonctionnalité à venir)"
            aria-label="Historique des chats"
            onClick={() => alert("Fonctionnalité d'historique à implémenter")}>
            <History size={20} />
          </button>
        )}
        {/* Placeholder for alignment if history button is hidden */}
        {activeViewMode === 'canvas' && <div className="w-[36px] h-[36px]" />}
      </div>

      {activeViewMode === 'canvas' &&
        (messages.length === 0 && !isLoading ? (
          renderInitialHubView()
        ) : (
          <>
            <div className="flex-1 p-3 sm:p-4 overflow-y-auto bg-background-secondary space-y-3 sm:space-y-4">
              {messages.map(message => (
                <ChatMessage key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 sm:p-4 border-t border-border-primary bg-background-tertiary">
              <ChatInput
                chatInput={chatInput}
                setChatInput={setChatInput}
                handleSubmit={handleSendMessage}
                isLoading={isLoading}
                placeholder="Envoyer un message..."
              />
            </div>
          </>
        ))}
    </div>
  );
};

export default ChatPanel;
