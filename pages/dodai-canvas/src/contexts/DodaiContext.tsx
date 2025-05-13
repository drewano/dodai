import type { ReactNode } from 'react';
import type React from 'react';
import { createContext, useContext, useState } from 'react';
import { v4 as uuidv4 } from 'uuid'; // Besoin pour les IDs de messages
import type { Message, ArtifactV3, ArtifactMarkdownV3 } from '../types'; // ArtifactContentV3 supprimé
import { MessageType } from '../../../../chrome-extension/src/background/types'; // Importer MessageType
import type {
  GenerateDodaiCanvasArtifactResponse,
  ChatHistoryMessage,
  ModifyDodaiCanvasArtifactResponse, // Ajouter le type de réponse pour la modification
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
  sendPromptAndGenerateArtifact: (prompt: string) => Promise<void>;
  updateCurrentArtifactContent: (newMarkdown: string) => void;
  modifyCurrentArtifact: (promptSuffix: string, currentMarkdown: string) => Promise<void>; // Nouvelle fonction
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
  sendPromptAndGenerateArtifact: async () => {},
  updateCurrentArtifactContent: () => {},
  modifyCurrentArtifact: async () => {}, // Valeur par défaut
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

  // Fonction utilitaire pour générer un titre simple
  const generateTitleFromMarkdown = (markdown: string): string => {
    if (!markdown) return 'Nouvel Artefact';
    const firstLine = markdown.split('\n')[0];
    const rawTitle = firstLine.replace(/^#+ /, ''); // Enlever les # du Markdown
    return rawTitle.length > 50 ? `${rawTitle.substring(0, 47)}...` : rawTitle || 'Artefact édité';
  };

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
          title: generateTitleFromMarkdown(response.artifact), // Utiliser la fonction utilitaire
          fullMarkdown: response.artifact,
          // language: 'plaintext', // Pourrait être ajouté si type 'code'
        };

        const newArtifact: ArtifactV3 = {
          currentIndex: 0, // Le nouveau contenu est à l'index 0
          contents: [artifactContent], // Commence avec un seul contenu
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

  // Fonction pour mettre à jour le contenu de l'artefact actuel via BlockNote
  const updateCurrentArtifactContent = (newMarkdown: string) => {
    setCurrentArtifact(prevArtifact => {
      if (!prevArtifact) return null; // Ne rien faire si pas d'artefact

      const currentContentIndex = prevArtifact.currentIndex;
      const originalContent = prevArtifact.contents[currentContentIndex];

      // Vérifier si c'est bien du texte et si le contenu a changé
      if (
        !originalContent ||
        originalContent.type !== 'text' ||
        (originalContent as ArtifactMarkdownV3).fullMarkdown === newMarkdown
      ) {
        return prevArtifact; // Retourner l'état précédent si pas de changement ou pas texte
      }

      // Créer une nouvelle version du contenu
      const newTitle = generateTitleFromMarkdown(newMarkdown);
      const newContentVersion: ArtifactMarkdownV3 = {
        type: 'text',
        title: newTitle,
        fullMarkdown: newMarkdown,
      };

      // Créer le nouveau tableau de contenus (crée une branche si on édite une ancienne version)
      const updatedContentsArray = [...prevArtifact.contents.slice(0, currentContentIndex + 1), newContentVersion];
      const newCurrentIndex = updatedContentsArray.length - 1;

      // Créer le nouvel état de l'artefact
      const newArtifactState: ArtifactV3 = {
        ...prevArtifact, // Conserver autres props si jamais il y en a
        contents: updatedContentsArray,
        currentIndex: newCurrentIndex,
      };

      // Ajouter ce nouvel état à l'historique global (pourrait être optimisé plus tard)
      setArtifactHistory(prevHistory => [...prevHistory, newArtifactState]);

      return newArtifactState; // Mettre à jour l'artefact courant
    });
  };

  // Fonction pour modifier l'artefact actuel via un prompt
  const modifyCurrentArtifact = async (promptSuffix: string, currentMarkdown: string) => {
    if (!currentArtifact || !currentMarkdown.trim()) return;

    const userMessageContent = `Modification demandée : "${promptSuffix}"`;
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: userMessageContent,
      timestamp: Date.now(),
    };

    const assistantPlaceholderId = uuidv4();
    const assistantPlaceholderMessage: Message = {
      id: assistantPlaceholderId,
      role: 'assistant',
      content: "Modification de l'artefact en cours...", // Guillemets doubles, sans échappement inutile
      timestamp: Date.now() + 1,
    };

    setMessages(prev => [...prev, userMessage, assistantPlaceholderMessage]);
    setIsLoading(true);

    try {
      const historyToSend: ChatHistoryMessage[] = messages
        .filter(msg => msg.id !== assistantPlaceholderId) // Exclure le placeholder actuel
        .map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        }));

      const response: ModifyDodaiCanvasArtifactResponse = await chrome.runtime.sendMessage({
        type: MessageType.MODIFY_DODAI_CANVAS_ARTIFACT_REQUEST,
        payload: {
          prompt: promptSuffix,
          currentArtifact: currentMarkdown,
          artifactType: 'text',
          history: historyToSend,
        },
      });

      if (response.success && response.artifact) {
        const newMarkdown = response.artifact;
        const newTitle = generateTitleFromMarkdown(newMarkdown);

        const newContentVersion: ArtifactMarkdownV3 = {
          type: 'text',
          title: newTitle,
          fullMarkdown: newMarkdown,
        };

        setCurrentArtifact(prevArtifact => {
          if (!prevArtifact) return null;
          const updatedContentsArray = [
            ...prevArtifact.contents.slice(0, prevArtifact.currentIndex + 1),
            newContentVersion,
          ];
          const newCurrentIndex = updatedContentsArray.length - 1;
          const newArtifactState: ArtifactV3 = {
            ...prevArtifact,
            contents: updatedContentsArray,
            currentIndex: newCurrentIndex,
          };
          setArtifactHistory(prevHistory => [...prevHistory, newArtifactState]);
          return newArtifactState;
        });

        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantPlaceholderId
              ? {
                  ...msg,
                  content: `Artefact modifié avec succès ! (Modèle: ${response.model || 'inconnu'})`,
                }
              : msg,
          ),
        );
      } else {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantPlaceholderId
              ? {
                  ...msg,
                  content: `Erreur lors de la modification : ${response.error || 'Erreur inconnue'}`,
                }
              : msg,
          ),
        );
      }
    } catch (error) {
      console.error("Erreur lors de la modification de l'artefact:", error);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantPlaceholderId
            ? {
                ...msg,
                content: `Erreur de communication: ${error instanceof Error ? error.message : String(error)}`,
              }
            : msg,
        ),
      );
    }
    setIsLoading(false);
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
    sendPromptAndGenerateArtifact,
    updateCurrentArtifactContent,
    modifyCurrentArtifact,
  };

  return <DodaiContext.Provider value={value}>{children}</DodaiContext.Provider>;
};
