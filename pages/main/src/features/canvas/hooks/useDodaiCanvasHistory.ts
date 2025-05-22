import { useState, useEffect, useCallback } from 'react';
import { useStorage } from '@extension/shared';
import {
  chatHistoryStorage,
  type ChatConversation, // Sera utilisé dans Omit<ChatConversation, ...>
  type ChatMessage,
  type ChatArtifact,
  type ChatArtifactWithHistory,
} from '@extension/storage';
import type { Message, ArtifactV3, ArtifactMarkdownV3 } from '../types'; // Importer le type Message spécifique au Canvas

/**
 * Hook pour gérer l'historique des conversations spécifiquement pour Dodai Canvas.
 */
export function useDodaiCanvasHistory() {
  const chatHistory = useStorage(chatHistoryStorage);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [currentChatName, setCurrentChatName] = useState<string>('Nouvelle conversation');

  // Optionnel : Effet pour charger la conversation la plus récente au démarrage,
  // similaire à useChatHistory.ts si ce comportement est désiré.
  useEffect(() => {
    if (!activeConversationId && chatHistory && chatHistory.length > 0) {
      // Trier pour trouver la plus récente conversation mise à jour
      const mostRecentConversation = [...chatHistory].sort((a, b) => b.updatedAt - a.updatedAt)[0];
      if (mostRecentConversation) {
        setActiveConversationId(mostRecentConversation.id);
        setCurrentChatName(mostRecentConversation.name);
      }
    }
    // Exécuter seulement si chatHistory change et qu'il n'y a pas d'ID actif
  }, [chatHistory, activeConversationId]);

  const canvasMessagesToStorage = (messages: Message[]): ChatMessage[] => {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      // reasoning: null, // Canvas 'Message' n'a pas de 'reasoning'
      isStreaming: msg.isStreaming || false,
      timestamp: msg.timestamp || Date.now(),
      model: msg.model,
    }));
  };

  const storageMessagesToCanvas = (messages: ChatMessage[], convId: string): Message[] => {
    return messages.map((msg, index) => ({
      id: `loaded-${convId}-${index}`,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp || Date.now(),
      isStreaming: msg.isStreaming || false,
      model: msg.model,
    }));
  };

  const canvasArtifactToStorage = (artifact: ArtifactV3): ChatArtifactWithHistory => {
    return {
      currentIndex: artifact.currentIndex,
      contents: artifact.contents.map(content => {
        const markdownContent = content as ArtifactMarkdownV3;
        return {
          type: markdownContent.type,
          title: markdownContent.title,
          fullMarkdown: markdownContent.fullMarkdown,
        };
      }),
    };
  };

  const storageArtifactToCanvas = (artifact: ChatArtifactWithHistory): ArtifactV3 => {
    return {
      currentIndex: artifact.currentIndex,
      contents: artifact.contents.map(content => {
        return {
          type: content.type,
          title: content.title,
          fullMarkdown: content.fullMarkdown,
        };
      }),
    };
  };

  const loadConversation = useCallback(
    async (id: string): Promise<{ success: boolean; messages?: Message[]; artifact?: ArtifactV3 | null; model?: string; error?: string }> => {
      try {
        const conversation = await chatHistoryStorage.getConversation(id);
        if (conversation) {
          setActiveConversationId(conversation.id);
          setCurrentChatName(conversation.name);
          const canvasMessages = storageMessagesToCanvas(conversation.messages, conversation.id);
          let canvasArtifact = null;
          if (conversation.artifact) {
            canvasArtifact = storageArtifactToCanvas(conversation.artifact);
          }
          return { 
            success: true, 
            messages: canvasMessages, 
            artifact: canvasArtifact, 
            model: conversation.model 
          };
        }
        return { success: false, error: 'Conversation non trouvée.' };
      } catch (error) {
        console.error('Erreur lors du chargement de la conversation:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
      }
    },
    [],
  );

  const deleteConversation = useCallback(
    async (id: string): Promise<{ success: boolean; wasActive: boolean; error?: string }> => {
      try {
        const wasActive = id === activeConversationId;
        await chatHistoryStorage.deleteConversation(id);

        if (wasActive) {
          setActiveConversationId(null);
          setCurrentChatName('Nouvelle conversation');
        }
        return { success: true, wasActive };
      } catch (error) {
        console.error('Erreur lors de la suppression de la conversation:', error);
        return {
          success: false,
          wasActive: false,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
        };
      }
    },
    [activeConversationId], // Dépend de activeConversationId pour la logique wasActive
  );

  const createNewConversation = useCallback(
    async (
      welcomeMessageContent: string,
      model?: string,
    ): Promise<{
      success: boolean;
      id: string | null;
      initialMessages?: Message[];
      model?: string;
      error?: string;
    }> => {
      const assistantChatMessage: ChatMessage = {
        role: 'assistant',
        content: welcomeMessageContent,
        timestamp: Date.now(),
        model: model,
      };

      const newConversationData: Omit<ChatConversation, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'Nouvelle conversation', // Nom par défaut, pourrait être généré plus tard
        messages: [assistantChatMessage],
        model: model, // Modèle global pour la conversation
        artifact: null, // Pas d'artefact au départ
      };

      try {
        const newId = await chatHistoryStorage.addConversation(newConversationData);
        setActiveConversationId(newId);
        setCurrentChatName(newConversationData.name); // Ou 'Nouvelle conversation'

        // Convertir le message initial pour le retour
        const initialCanvasMessages = storageMessagesToCanvas([assistantChatMessage], newId);

        return { success: true, id: newId, initialMessages: initialCanvasMessages, model: model };
      } catch (error) {
        console.error("Erreur lors de la création d'une nouvelle conversation:", error);
        return {
          success: false,
          id: null,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
        };
      }
    },
    [], // setActiveConversationId, setCurrentChatName sont stables
  );

  const renameCurrentConversation = useCallback(
    async (newName: string): Promise<boolean> => {
      if (!activeConversationId) {
        console.warn('Tentative de renommer sans conversation active.');
        return false;
      }
      try {
        await chatHistoryStorage.renameConversation(activeConversationId, newName);
        setCurrentChatName(newName);
        return true;
      } catch (error) {
        console.error('Erreur lors du renommage de la conversation:', error);
        return false;
      }
    },
    [activeConversationId], // setCurrentChatName est stable
  );

  const renameConversationInHistory = useCallback(
    async (id: string, newName: string): Promise<boolean> => {
      if (!newName.trim()) {
        console.warn('Tentative de renommer avec un nom vide.');
        return false;
      }
      try {
        await chatHistoryStorage.renameConversation(id, newName);
        if (id === activeConversationId) {
          setCurrentChatName(newName);
        }
        return true;
      } catch (error) {
        console.error("Erreur lors du renommage de la conversation (dans l'historique):", error);
        return false;
      }
    },
    [activeConversationId],
  );

  const addMessageToCurrentConversation = useCallback(
    async (message: Message): Promise<boolean> => {
      if (!activeConversationId) return false;
      try {
        const chatMessage: ChatMessage = {
          role: message.role,
          content: message.content,
          isStreaming: message.isStreaming || false,
          timestamp: message.timestamp || Date.now(),
          model: message.model,
        };
        await chatHistoryStorage.addMessageToConversation(activeConversationId, chatMessage);
        return true;
      } catch (error) {
        console.error("Erreur lors de l'ajout du message:", error);
        return false;
      }
    },
    [activeConversationId],
  );

  const extractNameFromMessages = (messages: Message[]): string => {
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (firstUserMessage?.content) {
      const cleanedContent = firstUserMessage.content.trim();
      if (cleanedContent) {
        const words = cleanedContent.split(' ');
        const nameCandidate = words.slice(0, 5).join(' ');
        if (nameCandidate) {
          return nameCandidate.length > 30 ? `${nameCandidate.substring(0, 27)}...` : nameCandidate;
        }
      }
    }
    // Fallback
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const year = today.getFullYear();
    return `Conversation du ${day}/${month}/${year}`;
  };

  const saveCurrentChatSession = useCallback(
    async (messages: Message[], currentArtifact?: ArtifactV3 | null, model?: string): Promise<boolean> => {
      const storageChatMessages = canvasMessagesToStorage(messages);
      let storageArtifact = null;
      if (currentArtifact) {
        storageArtifact = canvasArtifactToStorage(currentArtifact);
      }
      
      try {
        if (!activeConversationId) {
          // Nouvelle conversation
          const name = extractNameFromMessages(messages);
          const newConversationData: Omit<ChatConversation, 'id' | 'createdAt' | 'updatedAt'> = {
            name,
            messages: storageChatMessages,
            model,
            artifact: storageArtifact,
          };
          const newId = await chatHistoryStorage.addConversation(newConversationData);
          setActiveConversationId(newId);
          setCurrentChatName(name);
        } else {
          // Conversation existante
          await chatHistoryStorage.updateMessages(activeConversationId, storageChatMessages);
          
          // Update artifact
          await chatHistoryStorage.updateConversation(activeConversationId, { 
            artifact: storageArtifact
          });
          
          // Update model if changed
          const currentConversation = await chatHistoryStorage.getConversation(activeConversationId);
          if (model && currentConversation && currentConversation.model !== model) {
            await chatHistoryStorage.updateConversation(activeConversationId, { model });
          }
        }
        return true;
      } catch (error) {
        console.error('Erreur lors de la sauvegarde de la session de chat:', error);
        return false;
      }
    },
    [activeConversationId],
  );

  return {
    chatHistory,
    activeConversationId,
    currentChatName,
    setActiveConversationId, // Peut être retiré si la gestion est entièrement internalisée
    setCurrentChatName, // Peut être retiré si la gestion est entièrement internalisée
    loadConversation,
    deleteConversation,
    createNewConversation,
    renameCurrentConversation,
    renameConversationInHistory,
    addMessageToCurrentConversation,
    saveCurrentChatSession,
  };
}
