import type { ReactNode } from 'react';
import type React from 'react';
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid'; // Besoin pour les IDs de messages
import type { Message, ArtifactV3, ArtifactMarkdownV3 } from '../types'; // ArtifactContentV3 supprimé
import { MessageType, StreamEventType } from '../../../../chrome-extension/src/background/types'; // Importer MessageType and StreamEventType
import type {
  GenerateDodaiCanvasArtifactStreamResponse, // For handling stream responses
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
  isStreamingArtifact: boolean; // Added for artifact streaming state
  sendPromptAndGenerateArtifact: (prompt: string) => Promise<void>;
  updateCurrentArtifactContent: (newMarkdown: string) => void;
  modifyCurrentArtifact: (promptSuffix: string, currentMarkdown: string) => Promise<void>; // Nouvelle fonction
  cancelCurrentStreaming: () => void; // New function to cancel streaming
  resetChatAndArtifact: () => void; // Added new function signature
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
  isStreamingArtifact: false, // Added default value
  sendPromptAndGenerateArtifact: async () => {},
  updateCurrentArtifactContent: () => {},
  modifyCurrentArtifact: async () => {}, // Valeur par défaut
  cancelCurrentStreaming: () => {}, // Default for cancel
  resetChatAndArtifact: () => {}, // Added default for new function
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
  const [isStreamingArtifact, setIsStreamingArtifact] = useState(false); // Specific state for artifact streaming

  const streamingPort = useRef<chrome.runtime.Port | null>(null);
  const streamingPortId = useRef<string | null>(null);
  const currentStreamingPrompt = useRef<string | null>(null); // To store the prompt that initiated streaming

  // Fonction utilitaire pour générer un titre simple
  const generateTitleFromMarkdown = (markdown: string): string => {
    if (!markdown) return 'Nouvel Artefact';
    const firstLine = markdown.split('\n')[0];
    const rawTitle = firstLine.replace(/^#+ /, ''); // Enlever les # du Markdown
    return rawTitle.length > 50 ? `${rawTitle.substring(0, 47)}...` : rawTitle || 'Artefact édité';
  };

  const cleanupStreamingConnection = useCallback(() => {
    if (streamingPort.current) {
      try {
        streamingPort.current.disconnect();
      } catch (e) {
        console.warn('[DodaiCanvas] Erreur lors de la déconnexion du port:', e);
      }
      streamingPort.current = null;
      streamingPortId.current = null;
    }
    setIsLoading(false); // General loading
    setIsStreamingArtifact(false); // Specific artifact streaming loading
    currentStreamingPrompt.current = null;
  }, []);

  useEffect(() => {
    return () => {
      cleanupStreamingConnection();
    };
  }, [cleanupStreamingConnection]);

  const cancelCurrentStreaming = useCallback(() => {
    if (streamingPort.current && streamingPortId.current) {
      console.log('[DodaiCanvas] Annulation du streaming demandée pour le port:', streamingPortId.current);
      // Notify background to cancel if it supports it (not implemented in this iteration)
      // For now, just disconnect locally
      cleanupStreamingConnection();
      // Update messages to reflect cancellation
      setMessages(prev =>
        prev.map(msg =>
          msg.role === 'assistant' && msg.content.includes('...') // A simple way to find the placeholder
            ? { ...msg, content: "Génération d'artefact annulée par l'utilisateur." }
            : msg,
        ),
      );
    }
  }, [cleanupStreamingConnection]);

  // Fonction pour envoyer le prompt et générer/modifier l'artefact
  const sendPromptAndGenerateArtifact = async (prompt: string) => {
    if (!prompt.trim()) return;
    if (isLoading || isStreamingArtifact) {
      console.warn("[DodaiCanvas] Tentative d'envoi de prompt pendant une opération en cours.");
      return;
    }

    currentStreamingPrompt.current = prompt;

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };

    const assistantPlaceholderId = uuidv4();
    const assistantPlaceholderMessage: Message = {
      id: assistantPlaceholderId,
      role: 'assistant',
      content: "Génération de l'artefact en cours...", // Placeholder pendant la génération
      timestamp: Date.now() + 1,
    };

    setMessages(prev => [...prev, userMessage, assistantPlaceholderMessage]);
    setChatInput('');
    setIsLoading(true);
    setIsStreamingArtifact(true);

    // 1. Initialiser la connexion de streaming
    const uniquePortId = `dodai_canvas_artifact_stream_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    streamingPortId.current = uniquePortId;
    const port = chrome.runtime.connect({ name: uniquePortId });
    streamingPort.current = port;

    // 2. Configurer les écouteurs de port
    port.onMessage.addListener((message: GenerateDodaiCanvasArtifactStreamResponse) => {
      switch (message.type) {
        case StreamEventType.STREAM_START:
          console.log("[DodaiCanvas] Début du streaming d'artefact", message.model);
          // Initialiser l'artefact placeholder
          setCurrentArtifact({
            currentIndex: 0,
            contents: [
              {
                type: 'text', // Default to text
                title: `En cours: ${generateTitleFromMarkdown(currentStreamingPrompt.current || prompt)}`,
                fullMarkdown: '',
              },
            ],
          });
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantPlaceholderId
                ? {
                    ...msg,
                    content: `Génération avec ${message.model || 'le modèle par défaut'} commencée...`,
                  }
                : msg,
            ),
          );
          break;

        case StreamEventType.STREAM_CHUNK:
          if (message.chunk) {
            setCurrentArtifact(prevArtifact => {
              if (!prevArtifact) return null; // Should not happen if STREAM_START was handled
              const currentContent = prevArtifact.contents[0] as ArtifactMarkdownV3;
              const newMarkdown = currentContent.fullMarkdown + message.chunk;
              return {
                ...prevArtifact,
                contents: [
                  {
                    ...currentContent,
                    fullMarkdown: newMarkdown,
                    title: generateTitleFromMarkdown(newMarkdown), // Update title as content grows
                  },
                ],
              };
            });
          }
          break;

        case StreamEventType.STREAM_END:
          console.log("[DodaiCanvas] Fin du streaming d'artefact, succès:", message.success);
          if (message.success) {
            // Le message de succès est maintenant géré par ARTIFACT_CHAT_RESPONSE
            // ou affiché s'il n'y a pas de réponse chat.
            // On garde une trace de l'artefact ici.
            if (currentArtifact) {
              setArtifactHistory(prev => [...prev, currentArtifact]);
            }
            // Ne pas appeler cleanupStreamingConnection() ici si on attend ARTIFACT_CHAT_RESPONSE
          } else {
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantPlaceholderId
                  ? {
                      ...msg,
                      content: `Erreur lors de la génération : ${message.error || 'Erreur inconnue'}`,
                    }
                  : msg,
              ),
            );
            setCurrentArtifact(prev =>
              prev
                ? {
                    ...prev,
                    contents: [{ ...(prev.contents[0] as ArtifactMarkdownV3), title: 'Erreur de génération' }],
                  }
                : null,
            );
            cleanupStreamingConnection(); // Nettoyer en cas d'erreur de STREAM_END
          }
          break;

        case StreamEventType.ARTIFACT_CHAT_RESPONSE:
          console.log('[DodaiCanvas] Réponse chat reçue:', message.chatResponse);
          if (message.chatResponse) {
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantPlaceholderId
                  ? {
                      ...msg,
                      content: `${message.chatResponse} (Modèle: ${message.model || 'inconnu'})`,
                    }
                  : msg,
              ),
            );
          } else {
            // Fallback si ARTIFACT_CHAT_RESPONSE est vide mais STREAM_END était success
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantPlaceholderId
                  ? {
                      ...msg,
                      content: `Artefact généré avec succès ! (Modèle: ${message.model || 'inconnu'})
Vous pouvez le consulter dans le panneau de droite.`,
                    }
                  : msg,
              ),
            );
          }
          // C'est le vrai signal de fin de la séquence complète.
          cleanupStreamingConnection();
          break;

        case StreamEventType.STREAM_ERROR:
          console.error("[DodaiCanvas] Erreur de streaming d'artefact:", message.error);
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantPlaceholderId
                ? {
                    ...msg,
                    content: `Erreur de streaming : ${message.error || 'Erreur inconnue'}`,
                  }
                : msg,
            ),
          );
          cleanupStreamingConnection();
          break;

        default:
          console.warn("[DodaiCanvas] Message de streaming d'artefact inconnu:", message);
      }
    });

    port.onDisconnect.addListener(() => {
      console.log("[DodaiCanvas] Port de streaming d'artefact déconnecté");
      // Only consider it an error if it was not a clean STREAM_END
      if (isLoading && isStreamingArtifact) {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantPlaceholderId && msg.content.includes('...')
              ? {
                  ...msg,
                  content: "Connexion perdue pendant la génération de l'artefact.",
                }
              : msg,
          ),
        );
      }
      cleanupStreamingConnection(); // Ensure cleanup happens
    });

    // 3. Envoyer la requête au background
    try {
      const historyToSend: ChatHistoryMessage[] = messages
        .filter(msg => msg.id !== assistantPlaceholderId) // Exclude current placeholder
        .map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        }));

      chrome.runtime.sendMessage(
        {
          type: MessageType.GENERATE_DODAI_CANVAS_ARTIFACT_STREAM_REQUEST,
          payload: {
            prompt: prompt,
            history: historyToSend,
            portId: uniquePortId,
          },
        },
        response => {
          if (chrome.runtime.lastError) {
            console.error("[DodaiCanvas] Erreur lors de l'envoi du message de streaming:", chrome.runtime.lastError);
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantPlaceholderId
                  ? {
                      ...msg,
                      content: `Erreur de communication (envoi): ${chrome.runtime.lastError?.message || 'Inconnue'}`,
                    }
                  : msg,
              ),
            );
            cleanupStreamingConnection();
            return;
          }
          // The initial response from sendMessage is just an ack or immediate error, not the stream itself.
          if (response && !response.success) {
            console.error('[DodaiCanvas] Le background a refusé la requête de streaming:', response.error);
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantPlaceholderId
                  ? {
                      ...msg,
                      content: `Erreur (refus background): ${response.error || 'Inconnue'}`,
                    }
                  : msg,
              ),
            );
            cleanupStreamingConnection();
          }
          // else: Streaming setup was successful on background side, waiting for port messages.
        },
      );
    } catch (error) {
      console.error("[DodaiCanvas] Erreur lors de la préparation de l'envoi du message de streaming:", error);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantPlaceholderId
            ? {
                ...msg,
                content: `Erreur (préparation): ${error instanceof Error ? error.message : String(error)}`,
              }
            : msg,
        ),
      );
      cleanupStreamingConnection();
    }
  };

  // Fonction pour mettre à jour le contenu de l'artefact actuel via BlockNote
  const updateCurrentArtifactContent = (newMarkdown: string) => {
    if (isStreamingArtifact) return; // Ne pas permettre l'édition manuelle pendant le streaming

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

  // Implementation for resetChatAndArtifact
  const resetChatAndArtifact = useCallback(() => {
    setMessages([]);
    setCurrentArtifact(null);
    setChatInput('');
    // Potentially clear artifactHistory as well if a full reset is desired
    // setArtifactHistory([]);
    setIsLoading(false);
    setIsStreamingArtifact(false);
    // If a stream was active, ensure it is cleaned up
    if (streamingPort.current) {
      cleanupStreamingConnection();
    }
    console.log('[DodaiCanvas] Chat and artifact reset.');
  }, [cleanupStreamingConnection]); // Added cleanupStreamingConnection as dependency

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
    isStreamingArtifact,
    sendPromptAndGenerateArtifact,
    updateCurrentArtifactContent,
    modifyCurrentArtifact,
    cancelCurrentStreaming,
    resetChatAndArtifact, // Added new function to context value
  };

  return <DodaiContext.Provider value={value}>{children}</DodaiContext.Provider>;
};
