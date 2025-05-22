import type { BaseStorage } from '../base/index.js';
import { createStorage, StorageEnum } from '../base/index.js';

// Définition de la structure d'un message
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning?: string | null;
  isStreaming?: boolean;
  timestamp?: number;
  model?: string;
}

// Définition de la structure pour l'artefact
export interface ChatArtifact {
  type: string;
  title: string;
  fullMarkdown: string;
}

// Définition de la structure d'un artefact complet avec historique
export interface ChatArtifactWithHistory {
  currentIndex: number;
  contents: ChatArtifact[];
}

// Définition de la structure d'une conversation
export interface ChatConversation {
  id: string;
  name: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  model?: string;
  artifact?: ChatArtifactWithHistory | null;
}

// État initial pour l'historique des conversations
const defaultChatHistory: ChatConversation[] = [];

// Type étendu pour le stockage avec des méthodes spécifiques
type ChatHistoryStorageType = BaseStorage<ChatConversation[]> & {
  addConversation: (conversation: Omit<ChatConversation, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateConversation: (id: string, updates: Partial<Omit<ChatConversation, 'id'>>) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  getConversation: (id: string) => Promise<ChatConversation | undefined>;
  updateMessages: (id: string, messages: ChatMessage[]) => Promise<void>;
  addMessageToConversation: (id: string, message: ChatMessage) => Promise<void>;
  renameConversation: (id: string, newName: string) => Promise<void>;
  clearAllConversations: () => Promise<void>;
};

// Création du stockage de base
const storage = createStorage<ChatConversation[]>('chat-history', defaultChatHistory, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

// Génération d'un ID unique
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

// Exportation du stockage étendu avec les méthodes additionnelles
export const chatHistoryStorage: ChatHistoryStorageType = {
  ...storage,

  // Ajouter une nouvelle conversation
  addConversation: async (conversation: Omit<ChatConversation, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = generateId();
    const now = Date.now();

    const newConversation: ChatConversation = {
      ...conversation,
      id,
      createdAt: now,
      updatedAt: now,
    };

    await storage.set((conversations: ChatConversation[]) => [...conversations, newConversation]);

    return id;
  },

  // Mettre à jour une conversation existante
  updateConversation: async (id: string, updates: Partial<Omit<ChatConversation, 'id'>>) => {
    await storage.set((conversations: ChatConversation[]) =>
      conversations.map((conv: ChatConversation) =>
        conv.id === id ? { ...conv, ...updates, updatedAt: Date.now() } : conv,
      ),
    );
  },

  // Supprimer une conversation
  deleteConversation: async (id: string) => {
    await storage.set((conversations: ChatConversation[]) =>
      conversations.filter((conv: ChatConversation) => conv.id !== id),
    );
  },

  // Récupérer une conversation spécifique
  getConversation: async (id: string) => {
    const conversations = await storage.get();
    return conversations.find((conv: ChatConversation) => conv.id === id);
  },

  // Mettre à jour les messages d'une conversation
  updateMessages: async (id: string, messages: ChatMessage[]) => {
    await storage.set((conversations: ChatConversation[]) =>
      conversations.map((conv: ChatConversation) =>
        conv.id === id ? { ...conv, messages, updatedAt: Date.now() } : conv,
      ),
    );
  },

  // Ajouter un message à une conversation
  addMessageToConversation: async (id: string, message: ChatMessage) => {
    await storage.set((conversations: ChatConversation[]) =>
      conversations.map((conv: ChatConversation) =>
        conv.id === id
          ? {
              ...conv,
              messages: [...conv.messages, { ...message, timestamp: Date.now() }],
              updatedAt: Date.now(),
            }
          : conv,
      ),
    );
  },

  // Renommer une conversation
  renameConversation: async (id: string, newName: string) => {
    await storage.set((conversations: ChatConversation[]) =>
      conversations.map((conv: ChatConversation) =>
        conv.id === id ? { ...conv, name: newName, updatedAt: Date.now() } : conv,
      ),
    );
  },

  // Supprimer toutes les conversations
  clearAllConversations: async () => {
    await storage.set([]);
  },
};
