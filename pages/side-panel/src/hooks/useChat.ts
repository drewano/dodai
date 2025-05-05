import { useState, useRef, useCallback, useEffect } from 'react';
import type { Message } from '../types';
import { useStreamingConnection } from './useStreamingConnection';
import { useChatHistory } from './useChatHistory';

interface UseChatOptions {
  isReady: boolean;
  selectedModel: string;
}

/**
 * Hook qui gère la fonctionnalité du chat
 */
export function useChat({ isReady, selectedModel }: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Bonjour! Comment puis-je vous aider aujourd'hui ?" },
  ]);
  const [input, setInput] = useState('');
  const [showReasoning, setShowReasoning] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { activeConversationId, addMessageToConversation, saveCurrentMessages, createNewConversation } =
    useChatHistory();

  // Gestion des callbacks pour le streaming
  const handleStreamEnd = useCallback(() => {
    // Sauvegarder la conversation après la fin du streaming
    saveCurrentMessages(messages).catch(console.error);
  }, [messages, saveCurrentMessages]);

  const handleStreamError = useCallback((error: string) => {
    console.error('Stream error:', error);

    // Mettre à jour le message en streaming avec l'erreur
    setMessages(prev => {
      const newMessages = [...prev];
      const streamingMessageIndex = newMessages.findIndex(m => m.isStreaming);

      if (streamingMessageIndex !== -1) {
        newMessages[streamingMessageIndex] = {
          role: 'system',
          content: `Erreur: ${error}`,
          isStreaming: false,
        };
      } else {
        // Ajouter un nouveau message d'erreur si aucun n'est en streaming
        newMessages.push({
          role: 'system',
          content: `Erreur: ${error}`,
          isStreaming: false,
        });
      }

      return newMessages;
    });
  }, []);

  // Intégration du hook de streaming
  const { isLoading, startStreaming, cleanupStreamingConnection } = useStreamingConnection({
    onStreamEnd: handleStreamEnd,
    onStreamError: handleStreamError,
  });

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, showReasoning]);

  // Fonction pour traiter la soumission du message
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      if (!input.trim() || isLoading) return;

      // Si agent is not ready, show a message directly without making API call
      if (!isReady) {
        const userMsg: Message = { role: 'user', content: input };
        const errorMsg: Message = {
          role: 'system',
          content:
            "Désolé, l'agent IA n'est pas disponible actuellement. Vérifiez qu'Ollama est en cours d'exécution et qu'un modèle est installé (commande: ollama pull llama3).",
        };

        setMessages(prev => [...prev, userMsg, errorMsg]);
        setInput('');

        // Si pas de conversation active, créer une nouvelle conversation
        if (!activeConversationId) {
          await createNewConversation("Bonjour! Comment puis-je vous aider aujourd'hui?", selectedModel);
          await addMessageToConversation(userMsg);
          await addMessageToConversation(errorMsg);
        } else {
          // Ajouter les messages à la conversation existante
          await addMessageToConversation(userMsg);
          await addMessageToConversation(errorMsg);
        }

        return;
      }

      const userMessage: Message = { role: 'user', content: input };
      setMessages(prev => [...prev, userMessage]);

      // Si c'est le premier message et qu'il n'y a pas de conversation active, créer une nouvelle
      if (!activeConversationId) {
        await createNewConversation("Bonjour! Comment puis-je vous aider aujourd'hui?", selectedModel);
        await addMessageToConversation(userMessage);
      } else {
        // Ajouter le message à la conversation existante
        await addMessageToConversation(userMessage);
      }

      setInput('');

      // Ajouter un message vide pour l'assistant qui sera rempli progressivement
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '',
          reasoning: '',
          isStreaming: true,
        },
      ]);

      try {
        // Démarrer le streaming
        await startStreaming(input, messages, setMessages);
      } catch (error) {
        console.error('Error starting stream:', error);

        let errorMessage = 'Désolé, une erreur est survenue. Veuillez réessayer plus tard.';
        if (error instanceof Error) {
          errorMessage = error.message;
        }

        // Remplacer le message en streaming par un message d'erreur
        setMessages(prev => {
          const newMessages = [...prev];
          const streamingMessageIndex = newMessages.findIndex(m => m.isStreaming);
          if (streamingMessageIndex !== -1) {
            newMessages[streamingMessageIndex] = {
              role: 'system',
              content: errorMessage,
            };
          } else {
            newMessages.push({ role: 'system', content: errorMessage });
          }
          return newMessages;
        });

        cleanupStreamingConnection();
      }
    },
    [
      input,
      isLoading,
      isReady,
      activeConversationId,
      selectedModel,
      cleanupStreamingConnection,
      startStreaming,
      messages,
      createNewConversation,
      addMessageToConversation,
    ],
  );

  return {
    messages,
    input,
    isLoading,
    showReasoning,
    messagesEndRef,
    setMessages,
    setInput,
    setShowReasoning,
    handleSubmit,
  };
}
