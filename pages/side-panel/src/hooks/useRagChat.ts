import { useState, useRef, useCallback, useEffect } from 'react';
import type { Message, RagSourceDocument } from '../types';
import { useRagStreamingConnection } from './useRagStreamingConnection';

/**
 * Hook qui gère la fonctionnalité du chat RAG avec les notes
 */
export function useRagChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Bonjour! Posez-moi une question sur vos notes.',
      sourceDocuments: [],
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>(messages); // To access latest messages in callbacks

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const handleStreamEnd = useCallback((success: boolean, sourceDocs?: RagSourceDocument[]) => {
    // If needed, handle source documents being attached to the last message
    // This is already handled by useRagStreamingConnection setting sourceDocuments on the streaming message
    console.log('[RAG Chat] Stream ended.', { success, sourceDocs });
    if (sourceDocs && sourceDocs.length > 0) {
      setMessages(prev =>
        prev.map(m => {
          if (m.role === 'assistant' && !m.isStreaming && (!m.sourceDocuments || m.sourceDocuments.length === 0)) {
            // Heuristic: find the last assistant message without sources and add them
            // This might need refinement if multiple assistant messages can exist before stream end.
            return { ...m, sourceDocuments: sourceDocs };
          }
          return m;
        }),
      );
    }
  }, []);

  const handleStreamError = useCallback((error: string) => {
    console.error('[RAG Chat] Stream error:', error);
    setMessages(prev => [...prev, { role: 'system', content: `Erreur: ${error}`, sourceDocuments: [] }]);
  }, []);

  const { isLoading, startStreaming } = useRagStreamingConnection({
    onStreamEnd: handleStreamEnd,
    onStreamError: handleStreamError,
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!input.trim() || isLoading) return;

      const userMessage: Message = { role: 'user', content: input, sourceDocuments: [] };
      setMessages(prev => [...prev, userMessage]);
      setInput('');

      // Start streaming with the current messages (for history) and the setMessages updater
      startStreaming(input, messagesRef.current, setMessages);
    },
    [input, isLoading, startStreaming, setMessages],
  );

  return {
    messages,
    input,
    isLoading,
    messagesEndRef,
    setInput,
    handleSubmit,
  };
}
