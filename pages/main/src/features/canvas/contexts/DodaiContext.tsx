import type { ReactNode } from 'react';
import type React from 'react';
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid'; // Besoin pour les IDs de messages
import type { Message, ArtifactV3, ArtifactMarkdownV3 } from '../types'; // ArtifactContentV3 supprimé
import { MessageType, StreamEventType } from '../../../../../../chrome-extension/src/background/types'; // Importer MessageType and StreamEventType
import type {
  GenerateDodaiCanvasArtifactStreamResponse, // For handling stream responses
  ChatHistoryMessage,
  ModifyDodaiCanvasArtifactResponse, // Ajouter le type de réponse pour la modification
} from '../../../../../../chrome-extension/src/background/types'; // Formatage import

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
  isArtifactModeActive: boolean; // NEW: State for artifact vs simple chat mode
  setIsArtifactModeActive: (active: boolean) => void; // NEW: Setter for mode toggle
  selectedDodaiModel: string | null; // Added for Dodai Canvas specific model
  setSelectedDodaiModel: (model: string | null) => void; // Added setter
  sendPromptAndGenerateArtifact: (prompt: string) => Promise<void>;
  sendMessage: (prompt: string) => Promise<void>; // NEW: Unified send function
  updateCurrentArtifactContent: (newMarkdown: string) => void;
  modifyCurrentArtifact: (promptSuffix: string, currentMarkdown: string) => Promise<void>; // Nouvelle fonction
  cancelCurrentStreaming: () => void; // New function to cancel streaming
  resetChatAndArtifact: (onBeforeResetCallback?: () => Promise<void>) => Promise<void>; // Modified signature
  setOnChatTurnEnd: (handler: ((finalMessages: Message[], modelUsed?: string) => void) | null) => void; // New setter
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
  isArtifactModeActive: true, // NEW: Default to artifact mode
  setIsArtifactModeActive: () => {}, // NEW: Default setter
  selectedDodaiModel: null, // Initial state
  setSelectedDodaiModel: () => {}, // Default setter
  sendPromptAndGenerateArtifact: async () => {},
  sendMessage: async () => {}, // NEW: Default for unified send
  updateCurrentArtifactContent: () => {},
  modifyCurrentArtifact: async () => {}, // Valeur par défaut
  cancelCurrentStreaming: () => {}, // Default for cancel
  resetChatAndArtifact: async () => {}, // Modified default
  setOnChatTurnEnd: () => {}, // New default
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
  const [isArtifactModeActive, setIsArtifactModeActive] = useState<boolean>(true); // NEW: Mode toggle state
  const [selectedDodaiModel, setSelectedDodaiModel] = useState<string | null>(null); // State for selected model

  const streamingPort = useRef<chrome.runtime.Port | null>(null);
  const streamingPortId = useRef<string | null>(null);
  const currentStreamingPrompt = useRef<string | null>(null); // To store the prompt that initiated streaming
  const onChatTurnEndCallbackRef = useRef<((finalMessages: Message[], modelUsed?: string) => void) | null>(null);
  const currentAssistantMessageId = useRef<string | null>(null); // NEW: For simple chat streaming

  const setOnChatTurnEnd = useCallback((handler: ((finalMessages: Message[], modelUsed?: string) => void) | null) => {
    onChatTurnEndCallbackRef.current = handler;
  }, []);

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
    currentAssistantMessageId.current = null; // NEW: Reset assistant message ID
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
  const sendPromptAndGenerateArtifact = useCallback(
    async (prompt: string) => {
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
                      model: message.model, // Sauvegarder le modèle ici aussi
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
              if (currentArtifact) {
                setArtifactHistory(prev => [...prev, currentArtifact]);
              }
              // Ne mettre à jour le message que si aucune réponse chat n'a été reçue
              setMessages(prev => {
                const hasReceivedChatResponse = prev.some(
                  msg =>
                    msg.id === assistantPlaceholderId &&
                    msg.content !== "Génération de l'artefact en cours..." &&
                    !msg.content.includes('Génération avec') &&
                    !msg.content.includes('Artefact généré avec succès !'),
                );

                if (hasReceivedChatResponse) {
                  // Une réponse chat a déjà été reçue, ne pas écraser
                  // Mais quand même appeler le callback pour signaler la fin
                  onChatTurnEndCallbackRef.current?.(prev, message.model);
                  return prev;
                }

                const updatedMessages = prev.map((msg: Message) =>
                  msg.id === assistantPlaceholderId
                    ? {
                        ...msg,
                        content: `Artefact généré avec succès ! (Modèle: ${message.model || 'inconnu'})\nVous pouvez le consulter dans le panneau de droite.`,
                        model: message.model,
                        isStreaming: false,
                      }
                    : msg,
                );

                // Appeler le callback avec les messages mis à jour
                onChatTurnEndCallbackRef.current?.(updatedMessages, message.model);
                return updatedMessages;
              });
              cleanupStreamingConnection();
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
              cleanupStreamingConnection();
            }
            break;

          case StreamEventType.ARTIFACT_CHAT_RESPONSE: {
            console.log('[DodaiCanvas] Réponse chat reçue:', message.chatResponse);
            setMessages(prev => {
              const updatedMessages = prev.map((msg: Message) =>
                msg.id === assistantPlaceholderId
                  ? {
                      ...msg,
                      content: message.chatResponse
                        ? `${message.chatResponse}`
                        : `Artefact généré avec succès ! (Modèle: ${message.model || 'inconnu'})\nVous pouvez le consulter dans le panneau de droite.`,
                      model: message.model,
                      isStreaming: false,
                    }
                  : msg,
              );
              // Appeler le callback avec les messages mis à jour
              onChatTurnEndCallbackRef.current?.(updatedMessages, message.model);
              return updatedMessages;
            });
            // Note: cleanupStreamingConnection sera appelé dans STREAM_END
            break;
          }
          case StreamEventType.STREAM_ERROR: {
            console.error("[DodaiCanvas] Erreur de streaming d'artefact:", message.error);
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantPlaceholderId
                  ? {
                      ...msg,
                      content: `Erreur de streaming : ${message.error || 'Erreur inconnue'}`,
                      model: message.model,
                      isStreaming: false,
                    }
                  : msg,
              ),
            );
            cleanupStreamingConnection();
            break;
          }
          default: {
            console.warn("[DodaiCanvas] Message de streaming d'artefact inconnu:", message);
          }
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

        // Wait a bit for the port to be registered in the background service
        setTimeout(() => {
          chrome.runtime.sendMessage(
            {
              type: MessageType.GENERATE_DODAI_CANVAS_ARTIFACT_STREAM_REQUEST,
              payload: {
                prompt: prompt,
                history: historyToSend,
                portId: uniquePortId,
                modelName: selectedDodaiModel, // Pass selected model
              },
            },
            response => {
              if (chrome.runtime.lastError) {
                console.error(
                  "[DodaiCanvas] Erreur lors de l'envoi du message de streaming:",
                  chrome.runtime.lastError,
                );
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
        }, 100); // 100ms delay to ensure port registration
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
    },
    [isLoading, isStreamingArtifact, messages, selectedDodaiModel, currentArtifact, cleanupStreamingConnection],
  );

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
      content: "Modification de l'artefact en cours...",
      timestamp: Date.now() + 1,
      isStreaming: true, // Indiquer que c'est en cours
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
          modelName: selectedDodaiModel, // Pass selected model
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

        const updatedMessages = messages.map((msg: Message) =>
          msg.id === assistantPlaceholderId
            ? {
                ...msg,
                content: `Artefact modifié avec succès ! (Modèle: ${response.model || 'inconnu'})`,
                model: response.model,
                isStreaming: false,
              }
            : msg,
        );
        setMessages(updatedMessages);
        onChatTurnEndCallbackRef.current?.(updatedMessages, response.model);
      } else {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantPlaceholderId
              ? {
                  ...msg,
                  content: `Erreur lors de la modification : ${response.error || 'Erreur inconnue'}`,
                  model: response.model,
                  isStreaming: false,
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
                isStreaming: false,
              }
            : msg,
        ),
      );
    }
    setIsLoading(false);
  };

  // NEW: Function for simple chat messaging (adapted from useSimpleTextChat)
  const sendSimpleChatMessage = useCallback(
    async (prompt: string) => {
      if (!prompt.trim()) return;

      currentStreamingPrompt.current = prompt;

      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: prompt,
        timestamp: Date.now(),
      };

      const assistantMsgId = uuidv4();
      currentAssistantMessageId.current = assistantMsgId;
      const assistantPlaceholderMessage: Message = {
        id: assistantMsgId,
        role: 'assistant',
        content: '', // Start with empty content, will be filled by stream
        timestamp: Date.now() + 1,
        isStreaming: true,
      };

      setMessages(prev => [...prev, userMessage, assistantPlaceholderMessage]);
      setChatInput('');
      setIsLoading(true);

      // Setup streaming port
      const uniquePortId = `simple_chat_stream_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      streamingPortId.current = uniquePortId;
      const port = chrome.runtime.connect({ name: uniquePortId });
      streamingPort.current = port;

      port.onMessage.addListener((msg: GenerateDodaiCanvasArtifactStreamResponse) => {
        switch (msg.type) {
          case StreamEventType.STREAM_START:
            console.log('[DodaiCanvas] Simple chat stream started:', msg.model);
            setMessages(prev => prev.map(m => (m.id === assistantMsgId ? { ...m, model: msg.model, content: '' } : m)));
            break;
          case StreamEventType.STREAM_CHUNK:
            if (msg.chunk) {
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMsgId ? { ...m, content: m.content + msg.chunk, isStreaming: true } : m,
                ),
              );
            }
            break;
          case StreamEventType.STREAM_END: {
            console.log('[DodaiCanvas] Simple chat stream ended, success:', msg.success);
            setMessages(prev => prev.map(m => (m.id === assistantMsgId ? { ...m, isStreaming: false } : m)));

            if (!msg.success) {
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content: m.content + `\nErreur: ${msg.error || 'Erreur inconnue'}`,
                        isStreaming: false,
                      }
                    : m,
                ),
              );
            }

            // Call onChatTurnEnd for simple chat
            onChatTurnEndCallbackRef.current?.(
              messages.map(m => (m.id === assistantMsgId ? { ...m, isStreaming: false, model: msg.model } : m)),
              msg.model,
            );
            cleanupStreamingConnection();
            break;
          }
          case StreamEventType.STREAM_ERROR:
            console.error('[DodaiCanvas] Simple chat stream error:', msg.error);
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      content: `Erreur de streaming: ${msg.error || 'Erreur inconnue'}`,
                      isStreaming: false,
                    }
                  : m,
              ),
            );
            cleanupStreamingConnection();
            break;
          default:
            console.warn('[DodaiCanvas] Unknown simple chat stream message:', msg);
        }
      });

      port.onDisconnect.addListener(() => {
        if (isLoading) {
          console.warn('[DodaiCanvas] Simple chat port disconnected unexpectedly.');
          setMessages(prev =>
            prev.map(m =>
              m.id === currentAssistantMessageId.current && m.isStreaming
                ? { ...m, content: m.content + '\n(Connexion perdue)', isStreaming: false }
                : m,
            ),
          );
        }
        cleanupStreamingConnection();
      });

      const chatHistoryForPayload = messages
        .filter(m => m.id !== assistantMsgId) // Exclude current placeholder
        .map(m => ({ role: m.role, content: m.content }));

      // Wait longer for the port to be registered in the background service
      setTimeout(() => {
        chrome.runtime.sendMessage(
          {
            type: MessageType.AI_CHAT_REQUEST,
            payload: {
              message: prompt,
              chatHistory: chatHistoryForPayload,
              streamHandler: true,
              portId: uniquePortId,
              modelName: selectedDodaiModel, // Pass the model name
            },
          },
          response => {
            if (chrome.runtime.lastError) {
              console.error('[DodaiCanvas] Simple chat SendMessage error:', chrome.runtime.lastError);
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content: `Erreur (envoi): ${chrome.runtime.lastError?.message || 'Inconnue'}`,
                        isStreaming: false,
                      }
                    : m,
                ),
              );
              cleanupStreamingConnection();
              return;
            }
            if (response && !response.success && !response.streaming) {
              console.error('[DodaiCanvas] Background refused simple chat request:', response.error);
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content: `Erreur (refus BG): ${response.error || 'Inconnue'}`,
                        isStreaming: false,
                      }
                    : m,
                ),
              );
              cleanupStreamingConnection();
            }
          },
        );
      }, 500); // Increased delay to 500ms
    },
    [messages, isLoading, selectedDodaiModel, cleanupStreamingConnection],
  );

  // NEW: Unified send function that routes to artifact or simple chat based on mode
  const sendMessage = useCallback(
    async (prompt: string) => {
      if (!prompt.trim()) return;
      if (isLoading || isStreamingArtifact) {
        console.warn("[DodaiCanvas] Tentative d'envoi de message pendant une opération en cours.");
        return;
      }

      if (isArtifactModeActive) {
        await sendPromptAndGenerateArtifact(prompt);
      } else {
        await sendSimpleChatMessage(prompt);
      }
    },
    [isArtifactModeActive, isLoading, isStreamingArtifact, sendPromptAndGenerateArtifact, sendSimpleChatMessage],
  );

  // Implementation for resetChatAndArtifact
  const resetChatAndArtifact = useCallback(
    async (onBeforeResetCallback?: () => Promise<void>) => {
      if (onBeforeResetCallback) {
        console.log('[DodaiContext] Executing onBeforeResetCallback...');
        await onBeforeResetCallback();
        console.log('[DodaiContext] onBeforeResetCallback finished.');
      }

      setMessages([]);
      setCurrentArtifact(null);
      setChatInput('');
      setIsLoading(false);
      setIsStreamingArtifact(false);
      // Keep the current mode active when resetting (don't force artifact mode)
      // setIsArtifactModeActive(true); // Removed to preserve user's current mode choice

      if (streamingPort.current) {
        cleanupStreamingConnection();
      }
      console.log('[DodaiContext] Chat and artifact state has been reset.');
    },
    [cleanupStreamingConnection],
  );

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
    isArtifactModeActive, // NEW: Expose artifact mode state
    setIsArtifactModeActive, // NEW: Expose artifact mode setter
    selectedDodaiModel,
    setSelectedDodaiModel,
    sendPromptAndGenerateArtifact,
    sendMessage, // NEW: Unified send function
    updateCurrentArtifactContent,
    modifyCurrentArtifact,
    cancelCurrentStreaming,
    resetChatAndArtifact,
    setOnChatTurnEnd,
  };

  return <DodaiContext.Provider value={value}>{children}</DodaiContext.Provider>;
};
