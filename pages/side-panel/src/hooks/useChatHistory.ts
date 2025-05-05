import { useState, useCallback, useEffect } from 'react';
import { useStorage } from '@extension/shared';
import type { ChatMessage, ChatConversation } from '@extension/storage';
import { chatHistoryStorage } from '@extension/storage';
import type { Message } from '../types';

/**
 * Hook qui gère l'historique des conversations
 */
export function useChatHistory() {
  const chatHistory = useStorage(chatHistoryStorage);
  const [showChatHistory, setShowChatHistory] = useState<boolean>(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [currentChatName, setCurrentChatName] = useState<string>('Nouvelle conversation');

  // Charger les conversations au démarrage
  useEffect(() => {
    if (!activeConversationId && chatHistory && chatHistory.length > 0) {
      // Utiliser la conversation la plus récente par défaut
      const mostRecent = [...chatHistory].sort((a, b) => b.updatedAt - a.updatedAt)[0];
      if (mostRecent) {
        setActiveConversationId(mostRecent.id);
        setCurrentChatName(mostRecent.name);
      }
    }
  }, [chatHistory, activeConversationId]);

  // Fonction pour créer une nouvelle conversation
  const createNewConversation = useCallback(
    async (welcomeMessage: string = "Bonjour! Comment puis-je vous aider aujourd'hui?", model: string) => {
      const chatMessage: ChatMessage = {
        role: 'assistant',
        content: welcomeMessage,
        timestamp: Date.now(),
      };

      const newConversation: Omit<ChatConversation, 'id' | 'createdAt' | 'updatedAt'> = {
        name: 'Nouvelle conversation',
        messages: [chatMessage],
        model: model,
      };

      try {
        const newId = await chatHistoryStorage.addConversation(newConversation);
        setActiveConversationId(newId);
        setCurrentChatName('Nouvelle conversation');
        setShowChatHistory(false);
        return {
          id: newId,
          initialMessages: [{ role: 'assistant', content: welcomeMessage }] as Message[],
        };
      } catch (error) {
        console.error("Erreur lors de la création d'une nouvelle conversation:", error);
        return { id: null, initialMessages: [] };
      }
    },
    [],
  );

  // Fonction pour charger une conversation existante
  const loadConversation = useCallback(async (id: string) => {
    try {
      const conversation = await chatHistoryStorage.getConversation(id);
      if (conversation) {
        setActiveConversationId(conversation.id);
        setCurrentChatName(conversation.name);

        // Convertir les messages stockés au format attendu par l'interface
        const storedMessages: Message[] = conversation.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          reasoning: msg.reasoning || null,
          isStreaming: false,
        }));

        setShowChatHistory(false);
        return { success: true, messages: storedMessages, model: conversation.model };
      }
      return { success: false, messages: [], model: null };
    } catch (error) {
      console.error('Erreur lors du chargement de la conversation:', error);
      return { success: false, messages: [], model: null };
    }
  }, []);

  // Fonction pour renommer la conversation actuelle
  const renameCurrentConversation = useCallback(
    async (newName: string) => {
      if (activeConversationId) {
        try {
          await chatHistoryStorage.renameConversation(activeConversationId, newName);
          setCurrentChatName(newName);
          return true;
        } catch (error) {
          console.error('Erreur lors du renommage de la conversation:', error);
          return false;
        }
      }
      return false;
    },
    [activeConversationId],
  );

  // Fonction pour supprimer une conversation
  const deleteConversation = useCallback(async (id: string) => {
    try {
      await chatHistoryStorage.deleteConversation(id);
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression de la conversation:', error);
      return false;
    }
  }, []);

  // Fonction pour sauvegarder les messages de la conversation actuelle
  const saveCurrentMessages = useCallback(
    async (messages: Message[]) => {
      if (activeConversationId) {
        try {
          // Convertir les messages de l'interface au format de stockage
          const messagesToSave: ChatMessage[] = messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            reasoning: msg.reasoning || null,
            timestamp: Date.now(),
          }));

          await chatHistoryStorage.updateMessages(activeConversationId, messagesToSave);
          return true;
        } catch (error) {
          console.error('Erreur lors de la sauvegarde des messages:', error);
          return false;
        }
      }
      return false;
    },
    [activeConversationId],
  );

  // Fonction pour ajouter un message à la conversation active
  const addMessageToConversation = useCallback(
    async (message: Message) => {
      if (activeConversationId) {
        try {
          const chatMessage: ChatMessage = {
            role: message.role,
            content: message.content,
            reasoning: message.reasoning || null,
            timestamp: Date.now(),
          };

          await chatHistoryStorage.addMessageToConversation(activeConversationId, chatMessage);
          return true;
        } catch (error) {
          console.error("Erreur lors de l'ajout du message à la conversation:", error);
          return false;
        }
      }
      return false;
    },
    [activeConversationId],
  );

  // Fonction pour extraire un nom de conversation à partir du premier message
  const extractConversationName = useCallback((message: string): string => {
    // Prendre les premiers mots significatifs du message (jusqu'à 5 mots, max 30 caractères)
    const words = message.split(' ');
    const nameWords = words.slice(0, 5);
    let name = nameWords.join(' ');

    if (name.length > 30) {
      name = name.substring(0, 27) + '...';
    }

    return name;
  }, []);

  return {
    chatHistory,
    showChatHistory,
    activeConversationId,
    currentChatName,
    setShowChatHistory,
    createNewConversation,
    loadConversation,
    renameCurrentConversation,
    deleteConversation,
    saveCurrentMessages,
    addMessageToConversation,
    extractConversationName,
  };
}
