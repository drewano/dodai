import type React from 'react';
// import type { Message } from '../../canvas/types'; // No longer directly needed here
import { ChatMessage } from '../../canvas/components/ChatMessage';
import { ChatInput } from '../../canvas/components/ChatInput';
import { useSimpleTextChat } from '../hooks/useSimpleTextChat'; // Import the new hook

// TextChatViewProps is no longer needed as props come from the hook
// interface TextChatViewProps {
//   messages: Message[];
//   chatInput: string;
//   setChatInput: (value: string) => void;
//   handleSubmit: (e: React.FormEvent, promptToSend?: string) => Promise<void>;
//   isLoading: boolean;
//   messagesEndRef: React.RefObject<HTMLDivElement>;
// }

const TextChatView: React.FC = () => {
  const { messages, chatInput, setChatInput, handleSubmit, isLoading, messagesEndRef } = useSimpleTextChat();

  // Static example messages are removed as the hook handles messages
  // const exampleMessages: Message[] = messages.length === 0 && !isLoading ? [
  //   { id: '1', role: 'assistant', content: 'Bonjour! Ceci est une vue de chat textuel.', timestamp: Date.now() },
  //   { id: '2', role: 'user', content: 'Super! Comment ça marche?', timestamp: Date.now() + 1000 },
  //   { id: '3', role: 'assistant', content: 'Vous pouvez taper votre message ci-dessous.', timestamp: Date.now() + 2000 },
  // ] : messages;

  return (
    <div className="flex flex-col h-full bg-background-secondary text-text-primary">
      {/* Messages area */}
      <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3 sm:space-y-4">
        {messages.map(message => (
          <ChatMessage key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-3 sm:p-4 border-t border-border-primary bg-background-tertiary">
        <ChatInput
          chatInput={chatInput}
          setChatInput={setChatInput}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
          placeholder="Envoyer un message en mode Chat..."
        />
      </div>
    </div>
  );
};

export default TextChatView;
