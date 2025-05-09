import { useState, useRef, useCallback, useEffect } from 'react';
import type { Message } from '../types';
import { useBaseStreamingConnection } from './useBaseStreamingConnection';
import { useChatHistory } from './useChatHistory';

interface UseChatOptions {
  isReady: boolean;
  selectedModel: string;
  activeConversationId: string | null;
}

/**
 * Hook qui gère la fonctionnalité du chat
 */
export function useChat({ isReady, selectedModel, activeConversationId }: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Bonjour! Comment puis-je vous aider aujourd'hui ?" },
  ]);
  const [input, setInput] = useState('');
  const [showReasoning, setShowReasoning] = useState<boolean>(false);
  const [isFetchingPageContent, setIsFetchingPageContent] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Référence pour stocker la dernière valeur des messages
  const messagesRef = useRef<Message[]>(messages);

  const { addMessageToConversation, saveCurrentMessages, createNewConversation } = useChatHistory();

  // Mettre à jour la référence lorsque les messages changent
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Gestionnaires d'événements pour le streaming
  const handleStreamStart = useCallback((modelName?: string) => {
    console.log(`[Chat] Streaming démarré avec le modèle: ${modelName || 'non spécifié'}`);
  }, []);

  const handleStreamEnd = useCallback(
    (success: boolean = true) => {
      // Sauvegarder la conversation après la fin du streaming
      // Utiliser messagesRef.current pour accéder aux messages les plus récents
      if (activeConversationId && success) {
        console.log('[Chat] Sauvegarde des messages à la fin du streaming:', messagesRef.current);
        saveCurrentMessages(messagesRef.current).catch(error => {
          console.error('[Chat] Erreur lors de la sauvegarde des messages:', error);
        });
      }
    },
    [saveCurrentMessages, activeConversationId],
  );

  const handleStreamError = useCallback((error: string) => {
    console.error('[Chat] Stream error:', error);

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

  // Utiliser notre hook de base pour le streaming
  const streamingConnection = useBaseStreamingConnection({
    streamingEventHandlers: {
      onStreamStart: handleStreamStart,
      onStreamEnd: handleStreamEnd,
      onStreamError: handleStreamError,
    },
  });

  // État de chargement
  const isLoading = streamingConnection.isLoading;

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, showReasoning, isFetchingPageContent]);

  // Fonction pour réinitialiser les messages avec un message de bienvenue ou charger des messages existants
  const resetOrLoadMessages = useCallback((newMessages: Message[]) => {
    setMessages(newMessages);
  }, []);

  // Fonction pour traiter la soumission du message
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      if (!input.trim() || isLoading || isFetchingPageContent) return;

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

      // Afficher un message indiquant que nous récupérons le contenu de la page
      setIsFetchingPageContent(true);
      setMessages(prev => [
        ...prev,
        {
          role: 'system',
          content: 'Récupération du contenu de la page en cours...',
          isStreaming: true,
          isTemporary: true, // Marquer comme temporaire pour le remplacer plus tard
        },
      ]);

      try {
        // Préparer le message d'assistant qui recevra le stream
        setMessages(prev => {
          const newMessages = [...prev];
          const tempMessageIndex = newMessages.findIndex(m => m.isStreaming && m.isTemporary);

          if (tempMessageIndex !== -1) {
            newMessages[tempMessageIndex] = {
              role: 'assistant',
              content: '',
              reasoning: '',
              isStreaming: true,
            };
          }

          return newMessages;
        });

        // Démarrer le streaming standard
        streamingConnection.startStandardStreaming(input, messagesRef.current, setMessages);
      } catch (error) {
        console.error('[Chat] Error starting stream:', error);

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

        streamingConnection.cleanupStreamingConnection();
      } finally {
        setIsFetchingPageContent(false);
      }
    },
    [
      input,
      isLoading,
      isFetchingPageContent,
      isReady,
      activeConversationId,
      selectedModel,
      streamingConnection,
      createNewConversation,
      addMessageToConversation,
    ],
  );

  return {
    messages,
    input,
    isLoading,
    isFetchingPageContent,
    showReasoning,
    messagesEndRef,
    setMessages,
    setInput,
    setShowReasoning,
    handleSubmit,
    resetOrLoadMessages,
  };
}
