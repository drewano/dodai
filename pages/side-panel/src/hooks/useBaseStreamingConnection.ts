import { useState, useCallback, useRef, useEffect } from 'react';
import type { Message, RagSourceDocument } from '../types';
import { useMarkdownProcessing } from './useMarkdownProcessing';
import { StreamEventType, MessageType } from '../../../../chrome-extension/src/background/types';

export type StreamingEventHandlers = {
  onStreamStart?: (modelName?: string) => void;
  onStreamEnd: (success: boolean, extraData?: Record<string, unknown>) => void;
  onStreamError: (error: string) => void;
};

export type MessageUpdater = (messages: Message[]) => void;

export interface UseBaseStreamingConnectionOptions {
  streamingEventHandlers: StreamingEventHandlers;
}

/**
 * Hook de base qui gère la connexion de streaming avec le background script
 */
export function useBaseStreamingConnection({ streamingEventHandlers }: UseBaseStreamingConnectionOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const streamingPort = useRef<chrome.runtime.Port | null>(null);
  const streamingPortId = useRef<string | null>(null);
  const { extractReasoning } = useMarkdownProcessing();

  // Nettoie la connexion de streaming
  const cleanupStreamingConnection = useCallback(() => {
    if (streamingPort.current) {
      try {
        streamingPort.current.disconnect();
      } catch (e) {
        console.warn('[BaseStreamingConnection] Erreur lors de la déconnexion du port:', e);
      }
      streamingPort.current = null;
      streamingPortId.current = null;
    }

    setIsLoading(false);
  }, []);

  // S'assure que la connexion est nettoyée lors du démontage du composant
  useEffect(() => {
    return () => {
      cleanupStreamingConnection();
    };
  }, [cleanupStreamingConnection]);

  // Initialise une connexion de streaming
  const initStreamingConnection = useCallback((type: 'ai' | 'rag') => {
    // Générer un ID unique pour ce port
    const prefix = type === 'ai' ? 'ai_streaming_' : 'rag_streaming_';
    const uniquePortId = `${prefix}${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    streamingPortId.current = uniquePortId;

    // Créer le port
    const port = chrome.runtime.connect({ name: uniquePortId });
    streamingPort.current = port;

    setIsLoading(true);

    return uniquePortId;
  }, []);

  // Met à jour le message avec le chunk reçu
  const handleStreamChunk = useCallback(
    (chunk: string, setMessages: React.Dispatch<React.SetStateAction<Message[]>>) => {
      // Logguer pour déboguer (en développement)
      console.log(
        `[BaseStreamingConnection] Chunk reçu (${chunk.length} chars):`,
        chunk.length > 50 ? chunk.substring(0, 50) + '...' : chunk,
      );

      // Traiter le chunk complet pour séparer contenu et raisonnement
      let visibleContent = '';
      let reasoningContent = '';

      // Extraire les blocs de raisonnement et le contenu propre
      const extracted = extractReasoning(chunk);
      visibleContent = extracted.cleanContent || '';
      reasoningContent = extracted.reasoning || '';

      // Mettre à jour le message en streaming
      setMessages(prev => {
        const newMessages = [...prev];
        const streamingMessageIndex = newMessages.findIndex(m => m.isStreaming);

        if (streamingMessageIndex !== -1) {
          // Mise à jour du message existant
          const currentMessage = newMessages[streamingMessageIndex];

          // Ajouter le nouveau contenu visible au contenu existant
          const updatedContent = currentMessage.content + visibleContent;

          // Mettre à jour le raisonnement si nécessaire
          let updatedReasoning = currentMessage.reasoning || '';
          if (reasoningContent) {
            if (updatedReasoning) {
              updatedReasoning += '\n' + reasoningContent;
            } else {
              updatedReasoning = reasoningContent;
            }
          }

          newMessages[streamingMessageIndex] = {
            ...currentMessage,
            content: updatedContent,
            reasoning: updatedReasoning,
            isStreaming: true,
          };
        }

        return newMessages;
      });
    },
    [extractReasoning],
  );

  // Gère la fin du streaming
  const handleStreamEnd = useCallback(
    (
      success: boolean,
      extraData: Record<string, unknown>,
      setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    ) => {
      if (success) {
        // Finaliser le message en streaming
        setMessages(prev => {
          const newMessages = [...prev];
          const streamingMessageIndex = newMessages.findIndex(m => m.isStreaming);

          if (streamingMessageIndex !== -1) {
            const currentMessage = newMessages[streamingMessageIndex];

            // Une dernière vérification pour s'assurer que tout contenu <think> a été extrait
            let finalContent = currentMessage.content;
            let finalReasoning = currentMessage.reasoning || '';

            if (finalContent.includes('<think>')) {
              console.log('[BaseStreamingConnection] Extraction finale nécessaire à la fin du streaming');
              const extractedContent = extractReasoning(finalContent);

              finalContent = extractedContent.cleanContent || '';

              if (extractedContent.reasoning) {
                if (finalReasoning) {
                  finalReasoning += '\n\n' + extractedContent.reasoning;
                } else {
                  finalReasoning = extractedContent.reasoning;
                }
              }
            }

            // Extraire le nom du modèle s'il est présent
            const modelName = extraData?.model as string | undefined;

            // Gérer les documents sources pour RAG si présents
            const sourceDocuments = extraData?.sourceDocuments as RagSourceDocument[] | undefined;

            // Enlever le marqueur de streaming et finaliser le contenu
            newMessages[streamingMessageIndex] = {
              ...currentMessage,
              content: finalContent,
              isStreaming: false,
              reasoning: finalReasoning,
              model: modelName,
              ...(sourceDocuments ? { sourceDocuments } : {}),
            };
          }

          return newMessages;
        });
      }

      // Fermer et nettoyer le port
      cleanupStreamingConnection();

      // Appeler le callback onStreamEnd après un court délai pour s'assurer que les états sont à jour
      setTimeout(() => {
        streamingEventHandlers.onStreamEnd(success, extraData);
      }, 100);
    },
    [cleanupStreamingConnection, extractReasoning, streamingEventHandlers],
  );

  // Configure les écouteurs de port
  const setupPortListeners = useCallback(
    (port: chrome.runtime.Port, setMessages: React.Dispatch<React.SetStateAction<Message[]>>) => {
      port.onMessage.addListener(message => {
        switch (message.type) {
          case StreamEventType.STREAM_START:
            console.log('[BaseStreamingConnection] Début du streaming');
            if (streamingEventHandlers.onStreamStart) {
              streamingEventHandlers.onStreamStart(message.model);
            }
            break;

          case StreamEventType.STREAM_CHUNK:
            handleStreamChunk(message.chunk, setMessages);
            break;

          case StreamEventType.STREAM_END:
            console.log('[BaseStreamingConnection] Fin du streaming, success:', message.success);
            // Transmettre toutes les données supplémentaires (model, sourceDocuments, etc.)
            handleStreamEnd(message.success, message as Record<string, unknown>, setMessages);
            break;

          case StreamEventType.STREAM_ERROR:
            streamingEventHandlers.onStreamError(message.error);
            break;

          default:
            console.log('[BaseStreamingConnection] Message de streaming inconnu:', message);
        }
      });

      port.onDisconnect.addListener(() => {
        console.log('[BaseStreamingConnection] Port de streaming déconnecté');
        if (isLoading) {
          // Si toujours en chargement, c'est une déconnexion inattendue
          streamingEventHandlers.onStreamError('Connexion perdue avec le background');
        }
        streamingPort.current = null;
        streamingPortId.current = null;
        setIsLoading(false);
      });
    },
    [handleStreamChunk, handleStreamEnd, isLoading, streamingEventHandlers],
  );

  // Commence le streaming standard avec le background
  const startStandardStreaming = useCallback(
    (input: string, messages: Message[], setMessages: React.Dispatch<React.SetStateAction<Message[]>>): boolean => {
      // Initialiser le streaming
      const portId = initStreamingConnection('ai');
      const port = streamingPort.current;

      if (!port) {
        streamingEventHandlers.onStreamError("Échec de l'initialisation de la connexion streaming");
        return false;
      }

      // Configurer les écouteurs de port
      setupPortListeners(port, setMessages);

      // Préparer le payload avec le message, l'historique et les infos de streaming
      const requestPayload = {
        type: MessageType.AI_CHAT_REQUEST,
        payload: {
          message: input,
          chatHistory: messages
            // Filtrer pour garder seulement les messages utilisateur et assistant
            .filter(msg => msg.role === 'user' || msg.role === 'assistant')
            // Convertir au format attendu par le background
            .map(msg => ({
              role: msg.role,
              content: msg.content,
            })),
          streamHandler: true,
          portId,
        },
      };

      // Envoyer la requête au background
      chrome.runtime.sendMessage(requestPayload, response => {
        if (chrome.runtime.lastError) {
          console.error("[BaseStreamingConnection] Erreur lors de l'envoi du message:", chrome.runtime.lastError);
          streamingEventHandlers.onStreamError(
            chrome.runtime.lastError.message || 'Erreur de communication avec le background',
          );
          cleanupStreamingConnection();
          return;
        }

        if (!response || !response.success) {
          const errorMsg = response?.error || 'Erreur inconnue lors du lancement du streaming';
          streamingEventHandlers.onStreamError(errorMsg);
          cleanupStreamingConnection();
          return;
        }

        console.log('[BaseStreamingConnection] Requête de streaming standard envoyée avec succès');
      });

      return true;
    },
    [cleanupStreamingConnection, initStreamingConnection, setupPortListeners, streamingEventHandlers],
  );

  // Commence le streaming RAG avec le background
  const startRagStreaming = useCallback(
    (
      input: string,
      messages: Message[],
      setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
      selectedModel?: string,
    ): boolean => {
      // Initialiser le streaming
      const portId = initStreamingConnection('rag');
      const port = streamingPort.current;

      if (!port) {
        streamingEventHandlers.onStreamError("Échec de l'initialisation de la connexion streaming RAG");
        return false;
      }

      // Configurer les écouteurs de port
      setupPortListeners(port, setMessages);

      // Préparer le payload RAG
      const requestPayload = {
        type: MessageType.RAG_CHAT_REQUEST,
        payload: {
          message: input,
          chatHistory: messages
            .filter(msg => msg.role === 'user' || msg.role === 'assistant')
            .map(msg => ({
              role: msg.role,
              content: msg.content,
            })),
          streamHandler: true,
          portId,
          selectedModel,
        },
      };

      // Envoyer la requête au background
      chrome.runtime.sendMessage(requestPayload, response => {
        if (chrome.runtime.lastError) {
          console.error("[BaseStreamingConnection] Erreur lors de l'envoi du message RAG:", chrome.runtime.lastError);
          streamingEventHandlers.onStreamError(
            chrome.runtime.lastError.message || 'Erreur de communication avec le background pour RAG',
          );
          cleanupStreamingConnection();
          return;
        }

        if (!response || !response.success) {
          const errorMsg = response?.error || 'Erreur inconnue lors du lancement du streaming RAG';
          streamingEventHandlers.onStreamError(errorMsg);
          cleanupStreamingConnection();
          return;
        }

        console.log('[BaseStreamingConnection] Requête de streaming RAG envoyée avec succès');
      });

      return true;
    },
    [cleanupStreamingConnection, initStreamingConnection, setupPortListeners, streamingEventHandlers],
  );

  return {
    isLoading,
    startStandardStreaming,
    startRagStreaming,
    cleanupStreamingConnection,
    streamingPortId: streamingPortId.current,
  };
}
