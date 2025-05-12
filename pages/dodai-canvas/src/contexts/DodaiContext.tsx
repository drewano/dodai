import type { ReactNode } from 'react';
import type React from 'react';
import { createContext, useContext, useState } from 'react';
import { v4 as uuidv4 } from 'uuid'; // Besoin pour les IDs de messages
import type { Message, ArtifactV3, ArtifactMarkdownV3 } from '../types';
import { MessageType } from '../../../../chrome-extension/src/background/types'; // Importer MessageType
import type {
  GenerateDodaiCanvasArtifactResponse,
  ChatHistoryMessage,
} from '../../../../chrome-extension/src/background/types'; // Formatage import

interface DodaiContextType {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  chatInput: string;
  setChatInput: React.Dispatch<React.SetStateAction<string>>;
  currentArtifact: ArtifactV3 | null;
  setCurrentArtifact: React.Dispatch<React.SetStateAction<ArtifactV3 | null>>;
  artifactHistory: ArtifactV3[];
  setArtifactHistory: React.Dispatch<React.SetStateAction<ArtifactV3[]>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  sendPromptAndGenerateArtifact: (prompt: string) => Promise<void>; // Nouvelle fonction
}

const defaultContext: DodaiContextType = {
  messages: [],
  setMessages: () => {},
  chatInput: '',
  setChatInput: () => {},
  currentArtifact: null,
  setCurrentArtifact: () => {},
  artifactHistory: [],
  setArtifactHistory: () => {},
  isLoading: false,
  setIsLoading: () => {},
  sendPromptAndGenerateArtifact: async () => {}, // Initialisation
};

const DodaiContext = createContext<DodaiContextType>(defaultContext);

export const useDodai = () => useContext(DodaiContext);

interface DodaiProviderProps {
  children: ReactNode;
}

export const DodaiProvider: React.FC<DodaiProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [currentArtifact, setCurrentArtifact] = useState<ArtifactV3 | null>(null);
  const [artifactHistory, setArtifactHistory] = useState<ArtifactV3[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fonction pour envoyer le prompt et générer/modifier l'artefact
  const sendPromptAndGenerateArtifact = async (prompt: string) => {
    if (!prompt.trim()) return;

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };

    // Ajouter le message user et un message placeholder pour l'assistant
    const assistantPlaceholderId = uuidv4();
    const assistantPlaceholderMessage: Message = {
      id: assistantPlaceholderId,
      role: 'assistant',
      content: '...', // Placeholder pendant la génération
      timestamp: Date.now() + 1, // Légèrement après le message user
    };

    setMessages(prev => [...prev, userMessage, assistantPlaceholderMessage]);
    setChatInput(''); // Vider l'input après envoi
    setIsLoading(true);

    try {
      // Préparer l'historique pour le backend
      const historyToSend: ChatHistoryMessage[] = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant', // Simplification role
        content: msg.content,
      }));

      // Envoyer la requête au background script
      // Pour l'instant, on appelle toujours GENERATE, la modification viendra plus tard
      const response: GenerateDodaiCanvasArtifactResponse = await chrome.runtime.sendMessage({
        type: MessageType.GENERATE_DODAI_CANVAS_ARTIFACT_REQUEST,
        payload: {
          prompt: prompt,
          history: historyToSend,
        },
      });

      if (response.success && response.artifact) {
        // Créer le nouvel artefact
        const artifactContent: ArtifactMarkdownV3 = {
          type: 'text', // TODO: Détecter le type (code/text) plus tard
          title: response.artifact.substring(0, 30).split('\n')[0] || 'Nouvel Artefact', // Titre simple
          fullMarkdown: response.artifact,
          // language: 'plaintext', // Pourrait être ajouté si type 'code'
        };

        const newArtifact: ArtifactV3 = {
          currentIndex: artifactHistory.length, // Simple index basé sur l'historique
          contents: [artifactContent], // Pour l'instant, un seul contenu par artefact
        };

        // Mettre à jour les états
        setCurrentArtifact(newArtifact);
        setArtifactHistory(prev => [...prev, newArtifact]);

        // Mettre à jour le message de l'assistant avec une confirmation
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantPlaceholderId
              ? {
                  ...msg,
                  content: `Artefact généré avec succès ! (Modèle: ${response.model || 'inconnu'})\n\nVous pouvez le consulter dans le panneau de droite.`,
                }
              : msg,
          ),
        );
      } else {
        // Gérer l'erreur
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantPlaceholderId
              ? {
                  ...msg,
                  content: `Désolé, une erreur est survenue: ${response.error || 'Erreur inconnue'}`,
                }
              : msg,
          ),
        );
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi du message au background:", error);
      // Gérer l'erreur de communication
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantPlaceholderId
            ? {
                ...msg,
                content: `Erreur de communication avec l'extension: ${error instanceof Error ? error.message : String(error)}`,
              }
            : msg,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    messages,
    setMessages,
    chatInput,
    setChatInput,
    currentArtifact,
    setCurrentArtifact,
    artifactHistory,
    setArtifactHistory,
    isLoading,
    setIsLoading,
    sendPromptAndGenerateArtifact, // Exposer la nouvelle fonction
  };

  return <DodaiContext.Provider value={value}>{children}</DodaiContext.Provider>;
};
