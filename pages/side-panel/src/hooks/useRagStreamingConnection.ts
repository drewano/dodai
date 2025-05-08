import { useState, useCallback, useRef, useEffect } from 'react';
import type { Message, RagSourceDocument } from '../types'; // Assuming Message and RagSourceDocument are in side-panel/src/types
import { StreamEventType, MessageType } from '../../../../chrome-extension/src/background/types';

interface UseRagStreamingConnectionOptions {
  onStreamEnd: (success: boolean, sourceDocuments?: RagSourceDocument[]) => void;
  onStreamError: (error: string) => void;
}

export function useRagStreamingConnection({ onStreamEnd, onStreamError }: UseRagStreamingConnectionOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const streamingPort = useRef<chrome.runtime.Port | null>(null);
  const streamingPortId = useRef<string | null>(null);

  const cleanupStreamingConnection = useCallback(() => {
    if (streamingPort.current) {
      try {
        streamingPort.current.disconnect();
      } catch (e) {
        console.warn('[RAG SidePanel] Erreur lors de la déconnexion du port RAG:', e);
      }
      streamingPort.current = null;
      streamingPortId.current = null;
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      cleanupStreamingConnection();
    };
  }, [cleanupStreamingConnection]);

  const initStreamingConnection = useCallback(() => {
    const uniquePortId = `rag_streaming_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    streamingPortId.current = uniquePortId;
    const port = chrome.runtime.connect({ name: uniquePortId });
    streamingPort.current = port;
    setIsLoading(true);
    return uniquePortId;
  }, []);

  const handleStreamChunk = useCallback(
    (chunk: string, setMessages: React.Dispatch<React.SetStateAction<Message[]>>) => {
      // Nettoyer les réponses JSON malformées
      let cleanedChunk = chunk;
      // Si le chunk commence par { ou contient "answer":
      if (chunk.trim().startsWith('{') || chunk.includes('"answer":')) {
        try {
          // Tenter de parser le JSON
          const parsedChunk = JSON.parse(chunk);
          if (parsedChunk.answer) {
            cleanedChunk = parsedChunk.answer;
          }
        } catch {
          // Si le parsing échoue, essayer d'extraire la valeur answer avec une regex
          const answerMatch = chunk.match(/"answer"\s*:\s*"([^"]*)"/);
          if (answerMatch && answerMatch[1]) {
            cleanedChunk = answerMatch[1];
          }
        }
      }

      setMessages(prev => {
        const newMessages = [...prev];
        const streamingMessageIndex = newMessages.findIndex(m => m.isStreaming);
        if (streamingMessageIndex !== -1) {
          newMessages[streamingMessageIndex] = {
            ...newMessages[streamingMessageIndex],
            content: newMessages[streamingMessageIndex].content + cleanedChunk,
            isStreaming: true,
          };
        } else {
          // Should ideally not happen if a streaming message placeholder was added
          newMessages.push({ role: 'assistant', content: cleanedChunk, isStreaming: true });
        }
        return newMessages;
      });
    },
    [],
  );

  const handleStreamEndEvent = useCallback(
    (
      success: boolean,
      sourceDocuments: RagSourceDocument[] | undefined,
      setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    ) => {
      // Seulement marquer les messages comme n'étant plus en streaming
      setMessages(prev => prev.map(m => (m.isStreaming ? { ...m, isStreaming: false } : m)));
      cleanupStreamingConnection();
      // Transmettre les sources au callback parent qui s'occupera de les ajouter
      onStreamEnd(success, sourceDocuments);
    },
    [cleanupStreamingConnection, onStreamEnd],
  );

  const setupPortListeners = useCallback(
    (port: chrome.runtime.Port, setMessages: React.Dispatch<React.SetStateAction<Message[]>>) => {
      port.onMessage.addListener(message => {
        // Ensure message structure aligns with RagChatStreamResponse
        const event = message as {
          type: StreamEventType;
          chunk?: string;
          sourceDocuments?: RagSourceDocument[];
          success?: boolean;
          error?: string;
        };

        switch (event.type) {
          case StreamEventType.STREAM_CHUNK:
            if (event.chunk) {
              handleStreamChunk(event.chunk, setMessages);
            }
            break;
          case StreamEventType.STREAM_END:
            handleStreamEndEvent(event.success ?? false, event.sourceDocuments, setMessages);
            break;
          case StreamEventType.STREAM_ERROR:
            if (event.error) {
              onStreamError(event.error);
            }
            // End stream on error as well
            handleStreamEndEvent(false, undefined, setMessages);
            break;
          default:
            console.log('[RAG SidePanel] Message de streaming RAG inconnu:', event);
        }
      });

      port.onDisconnect.addListener(() => {
        console.log('[RAG SidePanel] Port de streaming RAG déconnecté');
        if (isLoading) {
          onStreamError('Connexion RAG perdue avec le background');
          // Ensure stream is marked as ended in UI
          setMessages(prev => prev.map(m => (m.isStreaming ? { ...m, isStreaming: false } : m)));
        }
        streamingPort.current = null;
        streamingPortId.current = null;
      });
    },
    [handleStreamChunk, handleStreamEndEvent, isLoading, onStreamError],
  );

  const startStreaming = useCallback(
    (
      input: string,
      currentMessages: Message[],
      setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
      selectedModel?: string,
    ) => {
      const portId = initStreamingConnection();
      const port = streamingPort.current;

      if (!port) {
        onStreamError("Échec de l'initialisation de la connexion streaming RAG");
        return false;
      }

      setupPortListeners(port, setMessages);

      // Add assistant placeholder message for streaming response
      setMessages(prev => [...prev, { role: 'assistant', content: '', isStreaming: true, sourceDocuments: [] }]);

      const requestPayload = {
        type: MessageType.RAG_CHAT_REQUEST,
        payload: {
          message: input,
          chatHistory: currentMessages
            .filter(msg => msg.role === 'user' || msg.role === 'assistant')
            .map(msg => ({ role: msg.role, content: msg.content })),
          streamHandler: true,
          portId,
          selectedModel,
        },
      };

      chrome.runtime.sendMessage(requestPayload, response => {
        if (chrome.runtime.lastError) {
          console.error("[RAG SidePanel] Erreur lors de l'envoi du message RAG:", chrome.runtime.lastError);
          onStreamError(chrome.runtime.lastError.message || 'Erreur de communication RAG avec le background');
          cleanupStreamingConnection();
          setMessages(prev => prev.map(m => (m.isStreaming ? { ...m, isStreaming: false } : m)));
          return;
        }
        if (!response || !response.success) {
          const errorMsg = response?.error || 'Erreur inconnue lors du lancement du streaming RAG';
          onStreamError(errorMsg);
          cleanupStreamingConnection();
          setMessages(prev => prev.map(m => (m.isStreaming ? { ...m, isStreaming: false } : m)));
          return;
        }
        console.log('[RAG SidePanel] Requête de streaming RAG envoyée avec succès');
      });
      return true;
    },
    [initStreamingConnection, setupPortListeners, onStreamError, cleanupStreamingConnection],
  );

  return {
    isLoading,
    startStreaming,
    cleanupStreamingConnection,
  };
}
