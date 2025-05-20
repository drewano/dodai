import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Message } from '../../canvas/types'; // Assuming Message type is in canvas/types
import {
  MessageType,
  StreamEventType,
  type ChatHistoryMessage,
  type GenerateDodaiCanvasArtifactStreamResponse, // More specific type for port messages
} from '../../../../../../chrome-extension/src/background/types';
import { dodaiCanvasConfigStorage } from '@extension/storage'; // Import storage

export interface UseSimpleTextChatReturn {
  messages: Message[];
  chatInput: string;
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>; // Allow null for initial ref value
  setChatInput: React.Dispatch<React.SetStateAction<string>>;
  handleSubmit: (e: React.FormEvent, promptToSend?: string) => Promise<void>;
}

export function useSimpleTextChat(): UseSimpleTextChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const streamingPort = useRef<chrome.runtime.Port | null>(null);
  const streamingPortId = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const currentAssistantMessageId = useRef<string | null>(null);

  const cleanupStreamingConnection = useCallback(() => {
    if (streamingPort.current) {
      try {
        streamingPort.current.disconnect();
      } catch (e) {
        console.warn('[SimpleTextChat] Error disconnecting port:', e);
      }
      streamingPort.current = null;
      streamingPortId.current = null;
    }
    setIsLoading(false);
    currentAssistantMessageId.current = null;
  }, []);

  useEffect(() => {
    return () => {
      cleanupStreamingConnection();
    };
  }, [cleanupStreamingConnection]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent, promptToSend?: string) => {
      e.preventDefault();
      const currentInput = (promptToSend || chatInput).trim();
      if (!currentInput || isLoading) return;

      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: currentInput,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, userMessage]);
      setChatInput('');
      setIsLoading(true);

      const assistantMsgId = uuidv4();
      currentAssistantMessageId.current = assistantMsgId;
      const assistantPlaceholderMessage: Message = {
        id: assistantMsgId,
        role: 'assistant',
        content: '', // Start with empty content, will be filled by stream
        timestamp: Date.now() + 1,
        isStreaming: true,
      };
      setMessages(prev => [...prev, assistantPlaceholderMessage]);

      const uniquePortId = `simple_text_chat_stream_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      streamingPortId.current = uniquePortId;
      const port = chrome.runtime.connect({ name: uniquePortId });
      streamingPort.current = port;

      // Read selected model from storage for the request
      let modelToUseForRequest: string | undefined;
      try {
        const canvasSettings = await dodaiCanvasConfigStorage.get();
        modelToUseForRequest = canvasSettings.selectedModel || undefined;
      } catch (err) {
        console.warn('[SimpleTextChat] Could not read selected model from dodaiCanvasConfigStorage', err);
        // Proceed without a specific model, background will use its default
      }

      port.onMessage.addListener((msg: GenerateDodaiCanvasArtifactStreamResponse) => {
        switch (msg.type) {
          case StreamEventType.STREAM_START:
            console.log('[SimpleTextChat] Stream started:', msg.model);
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
          case StreamEventType.STREAM_END:
            console.log('[SimpleTextChat] Stream ended, success:', msg.success);
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
            cleanupStreamingConnection();
            break;
          case StreamEventType.STREAM_ERROR:
            console.error('[SimpleTextChat] Stream error:', msg.error);
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
            console.warn('[SimpleTextChat] Unknown stream message:', msg);
        }
      });

      port.onDisconnect.addListener(() => {
        if (isLoading) {
          // Disconnected unexpectedly
          console.warn('[SimpleTextChat] Port disconnected unexpectedly.');
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

      const chatHistoryForPayload: ChatHistoryMessage[] = messages
        .filter(m => m.id !== assistantMsgId) // Exclude current placeholder/streaming message
        .map(m => ({ role: m.role, content: m.content }));

      chrome.runtime.sendMessage(
        {
          type: MessageType.AI_CHAT_REQUEST,
          payload: {
            message: currentInput,
            chatHistory: chatHistoryForPayload,
            streamHandler: true,
            portId: uniquePortId,
            modelName: modelToUseForRequest, // Pass the model name
            // pageContent: undefined, // Not needed for simple chat
          },
        },
        response => {
          if (chrome.runtime.lastError) {
            console.error('[SimpleTextChat] SendMessage error:', chrome.runtime.lastError);
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
            // If it wasn't a streaming setup success, and not a general success either
            console.error('[SimpleTextChat] Background refused request:', response.error);
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
          // If response.streaming is true, we wait for port messages.
        },
      );
    },
    [chatInput, isLoading, messages, cleanupStreamingConnection], // Added messages to dependency array for chatHistoryForPayload
  );

  return {
    messages,
    chatInput,
    isLoading,
    messagesEndRef,
    setChatInput,
    handleSubmit,
  };
}
