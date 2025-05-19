import { useState, useRef, useCallback, useEffect } from 'react';
import type { Message } from '../types';
import { useBaseStreamingConnection } from './useBaseStreamingConnection';
import { useChatHistory } from './useChatHistory';

interface UseUnifiedChatOptions {
  isReady: boolean;
  selectedModel: string;
  activeConversationId: string | null;
}

/**
 * Hook unifié qui gère la fonctionnalité du chat standard et RAG avec les notes
 */
export function useUnifiedChat({ isReady, selectedModel, activeConversationId }: UseUnifiedChatOptions) {
  // État partagé entre les modes (standard et RAG)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Bonjour! Comment puis-je vous aider aujourd'hui ?" },
  ]);
  const [input, setInput] = useState('');
  const [isRagMode, setIsRagMode] = useState<boolean>(false);
  const [showReasoning, setShowReasoning] = useState<boolean>(false);
  const [isFetchingPageContent, setIsFetchingPageContent] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>(messages);

  const { addMessageToConversation, saveCurrentMessages, createNewConversation } = useChatHistory();

  // Mettre à jour la référence lorsque les messages changent
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Fonction partagée pour mettre à jour les messages avec une erreur
  const updateMessagesWithError = useCallback((error: string) => {
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
        newMessages.push({
          role: 'system',
          content: `Erreur: ${error}`,
          isStreaming: false,
        });
      }

      return newMessages;
    });
  }, []);

  // Gestionnaires d'événements pour le streaming
  const handleStreamStart = useCallback((modelName?: string) => {
    console.log(`[UnifiedChat] Streaming démarré avec le modèle: ${modelName || 'non spécifié'}`);
  }, []);

  const handleStreamEnd = useCallback(
    (success: boolean = true) => {
      if (activeConversationId && success) {
        console.log('[UnifiedChat] Sauvegarde des messages à la fin du streaming:', messagesRef.current);
        saveCurrentMessages(messagesRef.current).catch(error => {
          console.error('[UnifiedChat] Erreur lors de la sauvegarde des messages:', error);
        });
      }
    },
    [saveCurrentMessages, activeConversationId],
  );

  const handleStreamError = useCallback(
    (error: string) => {
      console.error('[UnifiedChat] Stream error:', error);
      updateMessagesWithError(error);
    },
    [updateMessagesWithError],
  );

  // Utiliser notre hook de base pour le streaming
  const streamingConnection = useBaseStreamingConnection({
    streamingEventHandlers: {
      onStreamStart: handleStreamStart,
      onStreamEnd: handleStreamEnd,
      onStreamError: handleStreamError,
    },
  });

  // État de chargement combiné
  const isLoading = streamingConnection.isLoading;

  // Scroll vers le bas quand les messages changent
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

        // Si pas de conversation active et pas en mode RAG, créer une nouvelle conversation
        if (!activeConversationId && !isRagMode) {
          await createNewConversation("Bonjour! Comment puis-je vous aider aujourd'hui?", selectedModel);
          await addMessageToConversation(userMsg);
          await addMessageToConversation(errorMsg);
        } else if (!isRagMode) {
          // Ajouter les messages à la conversation existante (uniquement pour le mode standard)
          await addMessageToConversation(userMsg);
          await addMessageToConversation(errorMsg);
        }

        return;
      }

      const userMessage: Message = { role: 'user', content: input };
      setMessages(prev => [...prev, userMessage]);

      // Si en mode standard et c'est le premier message sans conversation, créer une nouvelle
      if (!isRagMode) {
        if (!activeConversationId) {
          await createNewConversation("Bonjour! Comment puis-je vous aider aujourd'hui?", selectedModel);
          await addMessageToConversation(userMessage);
        } else {
          // Ajouter le message à la conversation existante (uniquement pour le mode standard)
          await addMessageToConversation(userMessage);
        }
      }

      setInput('');

      try {
        if (isRagMode) {
          // Mode RAG - utiliser le streaming RAG
          setMessages(prev => [
            ...prev,
            {
              role: 'assistant',
              content: '',
              isStreaming: true,
              sourceDocuments: [],
            },
          ]);

          streamingConnection.startRagStreaming(input, messagesRef.current, setMessages, selectedModel);
        } else {
          // Mode standard - récupérer le contenu de la page et utiliser le streaming standard
          setIsFetchingPageContent(true);
          setMessages(prev => [
            ...prev,
            {
              role: 'system',
              content: 'Récupération du contenu de la page en cours...',
              isStreaming: true,
              isTemporary: true,
            },
          ]);

          // Avant de commencer le streaming standard, on prépare le message d'assistant qui recevra le stream
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
        }
      } catch (error) {
        console.error('[UnifiedChat] Error starting stream:', error);

        let errorMessage = 'Désolé, une erreur est survenue. Veuillez réessayer plus tard.';
        if (error instanceof Error) {
          errorMessage = error.message;
        }

        // Remplacer le message en streaming par un message d'erreur
        updateMessagesWithError(errorMessage);
      } finally {
        setIsFetchingPageContent(false);
      }
    },
    [
      input,
      isLoading,
      isFetchingPageContent,
      isReady,
      isRagMode,
      activeConversationId,
      selectedModel,
      streamingConnection,
      createNewConversation,
      addMessageToConversation,
      updateMessagesWithError,
    ],
  );

  return {
    messages,
    input,
    isLoading,
    isFetchingPageContent,
    showReasoning,
    isRagMode,
    messagesEndRef,
    setMessages,
    setInput,
    setShowReasoning,
    setIsRagMode,
    handleSubmit,
    resetOrLoadMessages,
  };
}
