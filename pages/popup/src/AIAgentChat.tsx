import { useState, useEffect, useRef } from 'react';
import { MessageType, McpConnectionsState } from '../../../chrome-extension/src/background/types';
import { aiAgentStorage } from '@extension/storage';
import { useStorage } from '@extension/shared';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  usedTool?: boolean;
  toolError?: string;
}

interface McpTool {
  name: string;
  description: string;
}

export const AIAgentChat = () => {
  const settings = useStorage(aiAgentStorage);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'system', content: "Comment puis-je vous aider aujourd'hui ?" },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [mcpTools, setMcpTools] = useState<McpTool[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<McpConnectionsState>({});
  const [showToolsInfo, setShowToolsInfo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Vérifier l'état de l'agent et les outils disponibles
  useEffect(() => {
    const checkAgentAndTools = async () => {
      try {
        // Vérifier l'état de l'agent
        const statusResponse = await chrome.runtime.sendMessage({
          type: MessageType.CHECK_AGENT_STATUS,
        });

        if (statusResponse && statusResponse.success) {
          setIsReady(statusResponse.isReady);

          if (statusResponse.isReady) {
            setConnectionError(null);

            // Récupérer les outils MCP disponibles
            try {
              const toolsResponse = await chrome.runtime.sendMessage({
                type: MessageType.GET_MCP_TOOLS,
              });

              if (toolsResponse && toolsResponse.success) {
                setMcpTools(toolsResponse.tools || []);
              }
            } catch (toolsError) {
              console.error('Erreur lors de la récupération des outils MCP:', toolsError);
            }

            // Récupérer l'état des connexions MCP
            try {
              const connectionsResponse = await chrome.runtime.sendMessage({
                type: MessageType.GET_MCP_CONNECTION_STATUS,
              });

              if (connectionsResponse && connectionsResponse.success) {
                setConnectionStatus(connectionsResponse.connectionState || {});
              }
            } catch (statusError) {
              console.error('Erreur lors de la récupération du statut des connexions MCP:', statusError);
            }
          } else {
            setConnectionError(
              "L'agent IA n'est pas disponible. Vérifiez qu'Ollama est en cours d'exécution et qu'un modèle est installé.",
            );
          }
        } else {
          setIsReady(false);
          setConnectionError(statusResponse?.error || "Impossible de vérifier l'état de l'agent IA.");
        }
      } catch (error) {
        console.error('Error checking agent status:', error);
        setIsReady(false);
        setConnectionError("Impossible de vérifier l'état de l'agent IA.");
      }
    };

    checkAgentAndTools();

    // Vérifier périodiquement
    const interval = setInterval(checkAgentAndTools, 15000);
    return () => clearInterval(interval);
  }, [settings]); // Rechecher quand les paramètres changent

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    // If agent is not ready, show a message directly without making API call
    if (!isReady) {
      setMessages(prev => [
        ...prev,
        { role: 'user', content: input },
        {
          role: 'system',
          content:
            "Désolé, l'agent IA n'est pas disponible actuellement. Vérifiez qu'Ollama est en cours d'exécution et qu'un modèle est installé (commande: ollama pull llama3).",
        },
      ]);
      setInput('');
      return;
    }

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Préparer le payload avec le message de l'utilisateur et l'historique de conversation
      const requestPayload = {
        message: input,
        chatHistory: messages.filter(m => m.role !== 'system'),
      };

      // Envoyer la demande au background script
      chrome.runtime.sendMessage(
        {
          type: MessageType.AI_CHAT_REQUEST,
          payload: requestPayload,
        },
        response => {
          // Vérifier s'il y a une erreur de communication
          const runtimeError = chrome.runtime.lastError;
          if (runtimeError) {
            console.error('Erreur de communication avec le background:', runtimeError.message);
            setMessages(prev => [
              ...prev,
              {
                role: 'system',
                content: `Erreur: ${runtimeError.message}`,
              },
            ]);
            setIsLoading(false);
            return;
          }

          if (response && response.success) {
            // Met à jour l'UI avec la réponse de l'assistant
            const assistantMessage: Message = {
              role: 'assistant',
              content: response.data,
              usedTool: response.toolUsed || false,
              toolError: response.error,
            };
            setMessages(prev => [...prev, assistantMessage]);
          } else {
            // Gérer une réponse d'erreur depuis le background
            console.error('Erreur retournée par le background:', response?.error);
            const errorMessage: Message = {
              role: 'system',
              content: `Erreur de l'agent: ${response?.error || 'Inconnue'}`,
            };
            setMessages(prev => [...prev, errorMessage]);
          }
          setIsLoading(false);
        },
      );
    } catch (error) {
      console.error('Error getting response:', error);
      let errorMessage = 'Désolé, une erreur est survenue. Veuillez réessayer plus tard.';

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setMessages(prev => [...prev, { role: 'system', content: errorMessage }]);
      setIsLoading(false);
    }
  };

  // Décider si on doit afficher l'indicateur d'infos d'outils
  const hasToolsConnected = Object.values(connectionStatus).some(status => status.status === 'connected');

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
      {/* Message d'erreur fixe en haut */}
      {connectionError && !isReady && (
        <div className="p-2 bg-red-50 dark:bg-red-900/30 text-sm text-red-600 dark:text-red-400 border-b border-red-200 dark:border-red-800">
          <p>{connectionError}</p>
          <p className="text-xs mt-1">
            Pour installer un modèle:{' '}
            <code className="bg-red-100 dark:bg-red-800/50 px-1 rounded">ollama pull llama3</code>
          </p>
        </div>
      )}

      {/* Titre avec bouton historique et indicateur d'outils */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mr-1.5 text-blue-500">
            <path
              d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          DoDai Assistant
        </h2>
        <div className="flex items-center space-x-2">
          {mcpTools.length > 0 && (
            <button
              className={`p-1 ${hasToolsConnected ? 'text-green-500' : 'text-gray-400'} hover:text-blue-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 relative`}
              onClick={() => setShowToolsInfo(!showToolsInfo)}
              title="Outils disponibles">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M14 6l-3 9-3-3-3 3m8-6l3-3 3 3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <rect x="14" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" />
              </svg>
              {hasToolsConnected && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full"></span>
              )}
            </button>
          )}
          <button
            className="p-1 text-gray-400 hover:text-blue-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => console.log('Historique des chats')}
            title="Historique des chats">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Panneau d'informations sur les outils (conditionnellement affiché) */}
      {showToolsInfo && (
        <div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-gray-700 dark:text-gray-300">Outils disponibles</h3>
            <button
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              onClick={() => setShowToolsInfo(false)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M6 18L18 6M6 6l12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {mcpTools.length > 0 ? (
            <div className="max-h-32 overflow-y-auto space-y-1 scrollbar-thin">
              {mcpTools.map((tool, index) => (
                <div
                  key={index}
                  className="flex items-start py-1 border-t border-gray-200 dark:border-gray-700 first:border-0">
                  <div className="flex-shrink-0 p-1">
                    <span className="h-2 w-2 bg-green-500 rounded-full inline-block"></span>
                  </div>
                  <div className="ml-1">
                    <div className="font-medium text-gray-800 dark:text-gray-200">{tool.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{tool.description}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-2">
              Aucun outil disponible. Vérifiez la configuration des serveurs MCP.
            </p>
          )}

          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            <p>Les outils permettent à l'assistant d'effectuer des actions spécifiques pour mieux vous aider.</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-3 space-y-2 scrollbar-thin">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`p-2 rounded-lg shadow-sm max-w-[85%] ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : message.role === 'assistant'
                    ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none border border-gray-200 dark:border-gray-600'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 mx-auto text-sm rounded-full'
              }`}>
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              {message.usedTool && (
                <div className="mt-1 pt-1 border-t border-gray-200 dark:border-gray-600 flex items-center text-xs">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="mr-1">
                    <path
                      d="M14 6l-3 9-3-3-3 3m8-6l3-3 3 3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span
                    className={
                      message.toolError ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                    }>
                    {message.toolError ? "Échec d'outil" : 'Outil utilisé'}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-700 text-gray-500 p-2 rounded-lg rounded-bl-none shadow-sm flex items-center space-x-2 border border-gray-200 dark:border-gray-600">
              <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span>
              <span
                className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-pulse"
                style={{ animationDelay: '0.2s' }}></span>
              <span
                className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-pulse"
                style={{ animationDelay: '0.4s' }}></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef}></div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-lg">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isReady ? 'Posez votre question...' : "L'agent IA n'est pas disponible"}
            className="flex-1 p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200 transition"
            disabled={isLoading}
          />
          <button
            type="submit"
            className={`px-3 py-1 rounded-lg font-medium transition-all text-sm ${
              !isLoading
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
            disabled={isLoading}>
            {isLoading ? (
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              'Envoyer'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
