import { useState, useCallback, useRef, useEffect } from 'react';
import type { Message } from '../types';
import { useMarkdownProcessing } from './useMarkdownProcessing';
import { StreamEventType, MessageType } from '../../../../chrome-extension/src/background/types';

interface UseStreamingConnectionOptions {
  onStreamEnd: (success: boolean) => void;
  onStreamError: (error: string) => void;
}

/**
 * Hook qui gère la connexion de streaming avec le background script
 */
export function useStreamingConnection({ onStreamEnd, onStreamError }: UseStreamingConnectionOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const streamingPort = useRef<chrome.runtime.Port | null>(null);
  const streamingPortId = useRef<string | null>(null);
  const { extractReasoning } = useMarkdownProcessing();

  // État pour suivre le mode de streaming actuel
  const isInThinkMode = useRef<boolean>(false);
  const thinkContentBuffer = useRef<string>('');
  const thinkDepth = useRef<number>(0);

  // Nettoie la connexion de streaming
  const cleanupStreamingConnection = useCallback(() => {
    if (streamingPort.current) {
      try {
        streamingPort.current.disconnect();
      } catch (e) {
        console.warn('[SidePanel] Erreur lors de la déconnexion du port:', e);
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
  const initStreamingConnection = useCallback(() => {
    // Générer un ID unique pour ce port
    const uniquePortId = `ai_streaming_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
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
        `[SidePanel] Chunk reçu (${chunk.length} chars):`,
        chunk.length > 50 ? chunk.substring(0, 50) + '...' : chunk,
      );

      // Traiter le chunk complet pour séparer contenu et raisonnement
      let visibleContent = '';
      let reasoningContent = '';

      // Si le chunk contient <think>, faire la séparation immédiatement
      if (chunk.includes('<think>')) {
        // Extraire les blocs de raisonnement et le contenu propre
        const extracted = extractReasoning(chunk);
        visibleContent = extracted.cleanContent || '';
        reasoningContent = extracted.reasoning || '';

        // Loguer les résultats de l'extraction pour débogage
        console.log('[SidePanel] Séparation immédiate - Content:', visibleContent.substring(0, 50) + '...');
        console.log(
          '[SidePanel] Séparation immédiate - Reasoning:',
          reasoningContent?.substring(0, 50) + (reasoningContent?.length > 50 ? '...' : '') || 'aucun',
        );
      } else {
        // Pas de balise <think>, tout est du contenu visible
        visibleContent = chunk;
      }

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
    (success: boolean, setMessages: React.Dispatch<React.SetStateAction<Message[]>>) => {
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
              console.log('[SidePanel] Extraction finale nécessaire à la fin du streaming');
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

            // Enlever le marqueur de streaming et finaliser le contenu
            newMessages[streamingMessageIndex] = {
              ...currentMessage,
              content: finalContent,
              isStreaming: false,
              reasoning: finalReasoning,
            };
          }

          return newMessages;
        });
      }

      // Nettoyer les variables de streaming
      isInThinkMode.current = false;
      thinkContentBuffer.current = '';
      thinkDepth.current = 0;

      // Fermer et nettoyer le port
      cleanupStreamingConnection();

      // Appeler le callback onStreamEnd après un court délai pour s'assurer que les états sont à jour
      setTimeout(() => {
        onStreamEnd(success);
      }, 100);
    },
    [cleanupStreamingConnection, extractReasoning, onStreamEnd],
  );

  // Configure les écouteurs de port
  const setupPortListeners = useCallback(
    (port: chrome.runtime.Port, setMessages: React.Dispatch<React.SetStateAction<Message[]>>) => {
      port.onMessage.addListener(message => {
        switch (message.type) {
          case StreamEventType.STREAM_START:
            console.log('[SidePanel] Début du streaming');
            break;

          case StreamEventType.STREAM_CHUNK:
            handleStreamChunk(message.chunk, setMessages);
            break;

          case StreamEventType.STREAM_END:
            console.log('[SidePanel] Fin du streaming, success:', message.success);
            handleStreamEnd(message.success, setMessages);
            break;

          case StreamEventType.STREAM_ERROR:
            onStreamError(message.error);
            break;

          default:
            console.log('[SidePanel] Message de streaming inconnu:', message);
        }
      });

      port.onDisconnect.addListener(() => {
        console.log('[SidePanel] Port de streaming déconnecté');
        if (isLoading) {
          // Si toujours en chargement, c'est une déconnexion inattendue
          onStreamError('Connexion perdue avec le background');
        }
        streamingPort.current = null;
        streamingPortId.current = null;
      });
    },
    [handleStreamChunk, handleStreamEnd, isLoading, onStreamError],
  );

  // Commence le streaming avec le background
  const startStreaming = useCallback(
    (input: string, messages: Message[], setMessages: React.Dispatch<React.SetStateAction<Message[]>>) => {
      // Réinitialiser les variables de suivi du raisonnement
      isInThinkMode.current = false;
      thinkContentBuffer.current = '';
      thinkDepth.current = 0;

      // Initialiser le streaming
      const portId = initStreamingConnection();
      const port = streamingPort.current;

      if (!port) {
        onStreamError("Échec de l'initialisation de la connexion streaming");
        return false;
      }

      // Configurer les écouteurs de port
      setupPortListeners(port, setMessages);

      // Remplacer le message temporaire "Récupération du contenu de la page..." par un message d'assistant en streaming
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
          // Note: Le contenu de la page sera récupéré côté background
          // On n'a pas besoin de l'envoyer ici
        },
      };

      // Envoyer la requête au background
      chrome.runtime.sendMessage(requestPayload, response => {
        if (chrome.runtime.lastError) {
          console.error("[SidePanel] Erreur lors de l'envoi du message:", chrome.runtime.lastError);
          onStreamError(chrome.runtime.lastError.message || 'Erreur de communication avec le background');
          cleanupStreamingConnection();
          return;
        }

        if (!response || !response.success) {
          const errorMsg = response?.error || 'Erreur inconnue lors du lancement du streaming';
          onStreamError(errorMsg);
          cleanupStreamingConnection();
          return;
        }

        console.log('[SidePanel] Requête de streaming envoyée avec succès');
      });

      return true;
    },
    [cleanupStreamingConnection, initStreamingConnection, onStreamError, setupPortListeners],
  );

  return {
    isLoading,
    startStreaming,
    cleanupStreamingConnection,
    streamingPortId: streamingPortId.current,
  };
}
