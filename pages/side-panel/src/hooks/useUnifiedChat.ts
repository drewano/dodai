import { useState, useRef, useCallback, useEffect } from 'react';
import type { Message, RagSourceDocument } from '../types';
import { useStreamingConnection } from './useStreamingConnection';
import { useRagStreamingConnection } from './useRagStreamingConnection';
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

  // Callbacks pour le streaming standard
  const handleStandardStreamEnd = useCallback(
    (success: boolean = true) => {
      if (activeConversationId && success) {
        console.log('[UnifiedChat] Sauvegarde des messages à la fin du streaming standard:', messagesRef.current);
        saveCurrentMessages(messagesRef.current).catch(error => {
          console.error('[UnifiedChat] Erreur lors de la sauvegarde des messages:', error);
        });
      }
    },
    [saveCurrentMessages, activeConversationId],
  );

  const handleStandardStreamError = useCallback(
    (error: string) => {
      console.error('[UnifiedChat] Stream error (standard):', error);
      updateMessagesWithError(error);
    },
    [updateMessagesWithError],
  );

  // Callbacks pour le streaming RAG
  const handleRagStreamEnd = useCallback(
    (success: boolean, sourceDocs?: RagSourceDocument[]) => {
      console.log('[UnifiedChat] Stream ended (RAG).', { success, sourceDocs });
      // Les sources sont désormais gérées directement dans useRagStreamingConnection
      // Nous n'avons plus besoin de les ajouter ici pour éviter les doublons

      // Sauvegarde de la conversation si nécessaire
      if (activeConversationId && success) {
        console.log('[UnifiedChat] Sauvegarde des messages à la fin du streaming RAG:', messagesRef.current);
        saveCurrentMessages(messagesRef.current).catch(error => {
          console.error('[UnifiedChat] Erreur lors de la sauvegarde des messages RAG:', error);
        });
      }
    },
    [saveCurrentMessages, activeConversationId],
  );

  const handleRagStreamError = useCallback(
    (error: string) => {
      console.error('[UnifiedChat] Stream error (RAG):', error);
      updateMessagesWithError(error);
    },
    [updateMessagesWithError],
  );

  // Intégration des hooks de streaming
  const standardStreaming = useStreamingConnection({
    onStreamEnd: handleStandardStreamEnd,
    onStreamError: handleStandardStreamError,
  });

  const ragStreaming = useRagStreamingConnection({
    onStreamEnd: handleRagStreamEnd,
    onStreamError: handleRagStreamError,
  });

  // État de chargement combiné
  const isLoading = standardStreaming.isLoading || ragStreaming.isLoading;

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

          ragStreaming.startStreaming(input, messagesRef.current, setMessages, selectedModel);
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

          // Démarrer le streaming standard
          await standardStreaming.startStreaming(input, messagesRef.current, setMessages);
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
      standardStreaming,
      ragStreaming,
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
