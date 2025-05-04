import '@src/SidePanel.css';
import { useState, useEffect, useRef } from 'react';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import {
  aiAgentStorage,
  exampleThemeStorage,
  chatHistoryStorage,
  ChatMessage,
  ChatConversation,
  mcpLoadedToolsStorage,
  McpToolInfo,
} from '@extension/storage';
import { aiAgent } from '@extension/shared/lib/services/ai-agent';
import { ToggleButton } from '@extension/ui';
import { t } from '@extension/i18n';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

type TabType = 'chat' | 'tools' | 'memory';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
  reasoning?: string | null; // Stocke le raisonnement si présent
}

// Variables globales pour le streaming
let streamingPort: chrome.runtime.Port | null = null;

// Fonction utilitaire pour extraire le raisonnement entre balises <think>...</think>
const extractReasoning = (content: string): { reasoning: string | null; cleanContent: string } => {
  const thinkPattern = /<think>([\s\S]*?)<\/think>/;
  const match = content.match(thinkPattern);

  if (match && match[1]) {
    // Retourne le contenu sans les balises <think> et le raisonnement séparément
    return {
      reasoning: match[1].trim(),
      cleanContent: content.replace(thinkPattern, '').trim(),
    };
  }

  // Aucun raisonnement détecté
  return {
    reasoning: null,
    cleanContent: content,
  };
};

// Icône pour le bouton de raisonnement
const ThinkingIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="16"></line>
    <line x1="12" y1="8" x2="12" y2="12"></line>
  </svg>
);

// Composant de rendu de Markdown personnalisé avec styles
const MarkdownRenderer = ({ content }: { content: string }) => {
  return (
    <div className="markdown-content text-sm leading-tight">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          // Style pour les paragraphes
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,

          // Style pour les titres
          h1: ({ children }) => <h1 className="text-lg font-bold my-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold my-1.5">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold my-1">{children}</h3>,

          // Style pour les listes
          ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
          li: ({ children }) => <li className="mb-0.5">{children}</li>,

          // Style pour les liens
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline">
              {children}
            </a>
          ),

          // Style pour les blocs de code
          code: props => {
            const { children, className } = props;
            // @ts-ignore - inline est une propriété valide de react-markdown pour code
            const isInline = props.inline;

            if (isInline) {
              return <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs">{children}</code>;
            }
            return (
              <div className="bg-gray-100 dark:bg-gray-800 rounded-md mb-2 overflow-auto">
                <pre className="p-2 text-xs whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                  <code className={className}>{children}</code>
                </pre>
              </div>
            );
          },

          // Style pour les tableaux
          table: ({ children }) => (
            <div className="overflow-auto mb-2">
              <table className="min-w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-gray-100 dark:bg-gray-800">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-gray-200 dark:border-gray-700">{children}</tr>,
          th: ({ children }) => <th className="py-1 px-2 text-left font-semibold">{children}</th>,
          td: ({ children }) => <td className="py-1 px-2">{children}</td>,

          // Style pour les citations
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-2 py-0.5 italic text-gray-700 dark:text-gray-300 mb-2">
              {children}
            </blockquote>
          ),

          // Style pour le texte en gras et en italique
          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,

          // Style pour les séparateurs horizontaux
          hr: () => <hr className="my-2 border-t border-gray-300 dark:border-gray-600" />,
        }}>
        {content}
      </ReactMarkdown>
    </div>
  );
};

const SidePanel = () => {
  const theme = useStorage(exampleThemeStorage);
  const settings = useStorage(aiAgentStorage);
  const chatHistory = useStorage(chatHistoryStorage);
  const loadedTools = useStorage(mcpLoadedToolsStorage);
  const isLight = false; // Toujours utiliser le thème sombre

  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Bonjour! Comment puis-je vous aider aujourd'hui ?" },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showReasoning, setShowReasoning] = useState<boolean>(false);
  const [currentChatName, setCurrentChatName] = useState<string>('Nouvelle conversation');
  const [showChatHistory, setShowChatHistory] = useState<boolean>(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Nouvel état pour le menu déroulant des modèles
  const [showModelDropdown, setShowModelDropdown] = useState<boolean>(false);
  // Liste de modèles disponibles par défaut
  const [availableModels, setAvailableModels] = useState<string[]>([
    'llama3',
    'llama3:8b',
    'llama3:70b',
    'mistral',
    'mixtral',
    'phi3',
    'gemma',
    'codellama',
  ]);
  const [loadingModels, setLoadingModels] = useState<boolean>(false);

  // État pour suivre le mode de streaming actuel (normal ou raisonnement)
  const isInThinkMode = useRef<boolean>(false);
  const thinkContentBuffer = useRef<string>('');
  const thinkDepth = useRef<number>(0);

  // Nouvel état pour gérer le portId de streaming
  const streamingPortId = useRef<string | null>(null);

  // Charger les conversations lors du premier rendu
  useEffect(() => {
    // Si aucune conversation active et que l'historique existe
    if (!activeConversationId && chatHistory && chatHistory.length > 0) {
      // Utiliser la conversation la plus récente par défaut
      const mostRecent = [...chatHistory].sort((a, b) => b.updatedAt - a.updatedAt)[0];
      if (mostRecent) {
        setActiveConversationId(mostRecent.id);
        setCurrentChatName(mostRecent.name);

        // Convertir les messages stockés au format attendu par l'interface
        const storedMessages: Message[] = mostRecent.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          reasoning: msg.reasoning || null,
          isStreaming: false,
        }));

        if (storedMessages.length > 0) {
          setMessages(storedMessages);
        }
      }
    }
  }, [chatHistory, activeConversationId]);

  // Fonction pour créer une nouvelle conversation
  const createNewConversation = async () => {
    const welcomeMessage: ChatMessage = {
      role: 'assistant',
      content: "Bonjour! Comment puis-je vous aider aujourd'hui?",
      timestamp: Date.now(),
    };

    const newConversation: Omit<ChatConversation, 'id' | 'createdAt' | 'updatedAt'> = {
      name: 'Nouvelle conversation',
      messages: [welcomeMessage],
      model: settings.selectedModel,
    };

    try {
      const newId = await chatHistoryStorage.addConversation(newConversation);
      setActiveConversationId(newId);
      setCurrentChatName('Nouvelle conversation');
      setMessages([{ role: 'assistant', content: welcomeMessage.content }]);
      setShowChatHistory(false);
    } catch (error) {
      console.error("Erreur lors de la création d'une nouvelle conversation:", error);
    }
  };

  // Fonction pour charger une conversation existante
  const loadConversation = async (id: string) => {
    try {
      const conversation = await chatHistoryStorage.getConversation(id);
      if (conversation) {
        setActiveConversationId(conversation.id);
        setCurrentChatName(conversation.name);

        // Convertir les messages stockés au format attendu par l'interface
        const storedMessages: Message[] = conversation.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          reasoning: msg.reasoning || null,
          isStreaming: false,
        }));

        setMessages(storedMessages);
        setShowChatHistory(false);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la conversation:', error);
    }
  };

  // Fonction pour sauvegarder les messages de la conversation actuelle
  const saveCurrentMessages = async () => {
    if (activeConversationId) {
      try {
        // Convertir les messages de l'interface au format de stockage
        const messagesToSave: ChatMessage[] = messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          reasoning: msg.reasoning || null, // Assurer que le raisonnement est bien stocké
          timestamp: Date.now(),
        }));

        await chatHistoryStorage.updateMessages(activeConversationId, messagesToSave);
      } catch (error) {
        console.error('Erreur lors de la sauvegarde des messages:', error);
      }
    }
  };

  // Mettre à jour la conversation après chaque changement de messages
  useEffect(() => {
    if (activeConversationId && messages.length > 0 && !isLoading) {
      saveCurrentMessages();
    }
  }, [messages, isLoading]);

  // Fonction pour renommer la conversation actuelle
  const renameCurrentConversation = async (newName: string) => {
    if (activeConversationId) {
      try {
        await chatHistoryStorage.renameConversation(activeConversationId, newName);
        setCurrentChatName(newName);
      } catch (error) {
        console.error('Erreur lors du renommage de la conversation:', error);
      }
    }
  };

  // Fonction pour supprimer une conversation
  const deleteConversation = async (id: string) => {
    try {
      await chatHistoryStorage.deleteConversation(id);

      // Si c'était la conversation active, créer une nouvelle conversation
      if (id === activeConversationId) {
        createNewConversation();
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de la conversation:', error);
    }
  };

  // Fonction pour récupérer les modèles disponibles depuis Ollama
  const fetchAvailableModels = async () => {
    if (!settings.baseUrl) return;

    setLoadingModels(true);
    try {
      // L'API correcte d'Ollama pour obtenir les modèles
      const response = await fetch(`${settings.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      // La structure de la réponse d'Ollama : { models: [{ name: "llama3", ... }, ...] }
      if (data && Array.isArray(data.models)) {
        // Extraire juste les noms des modèles
        const modelNames = data.models.map((model: any) => model.name);
        if (modelNames.length > 0) {
          setAvailableModels(modelNames);
        }
      } else {
        // Fallback si la structure n'est pas comme attendu
        console.warn('Format de réponse Ollama inattendu:', data);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des modèles:', error);
      // On garde la liste par défaut en cas d'erreur
    } finally {
      setLoadingModels(false);
    }
  };

  // Nouvelle fonction pour changer le modèle
  const handleModelChange = async (model: string) => {
    try {
      await aiAgentStorage.updateModel(model);
      setShowModelDropdown(false);

      // Forcer le rechargement immédiat des paramètres
      await aiAgent.loadSettings();

      // Ajouter un message système pour confirmer le changement
      setMessages(prev => [
        ...prev,
        {
          role: 'system',
          content: `Modèle changé pour ${model}. Les nouveaux messages utiliseront ce modèle.`,
        },
      ]);
    } catch (error) {
      console.error('Erreur lors du changement de modèle:', error);

      // Ajouter un message système pour indiquer l'erreur
      setMessages(prev => [
        ...prev,
        {
          role: 'system',
          content: `Erreur lors du changement de modèle. Veuillez réessayer.`,
        },
      ]);
    }
  };

  // Ouvrir le dropdown et tenter de récupérer les modèles disponibles
  const handleOpenModelDropdown = () => {
    if (!showModelDropdown) {
      fetchAvailableModels();
    }
    setShowModelDropdown(!showModelDropdown);
  };

  // Référence pour détecter les clics à l'extérieur du dropdown
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Fermer le dropdown quand on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, showReasoning]);

  useEffect(() => {
    const checkAgentStatus = async () => {
      try {
        const ready = await aiAgent.isReady();
        setIsReady(ready);
        if (ready) {
          setConnectionError(null);
        } else {
          setConnectionError(
            "L'agent IA n'est pas disponible. Vérifiez qu'Ollama est en cours d'exécution et qu'un modèle est installé.",
          );
        }
      } catch (error) {
        console.error('Error checking agent status:', error);
        setIsReady(false);
        setConnectionError("Impossible de vérifier l'état de l'agent IA.");
      }
    };

    checkAgentStatus();

    // Check every 10 seconds if the agent is ready
    const interval = setInterval(checkAgentStatus, 10000);
    return () => clearInterval(interval);
  }, [settings]);

  // Fonction pour traiter les tokens en streaming avec détection du raisonnement
  const processStreamToken = (token: string) => {
    // Vérifier si on entre dans un bloc de raisonnement <think>
    if (token.includes('<think>')) {
      isInThinkMode.current = true;
      thinkDepth.current += 1;

      // Extraire la partie avant <think> pour l'ajouter au contenu visible
      const parts = token.split('<think>');
      const contentBeforeThink = parts[0];

      // Ajouter le début de la balise <think> au buffer de raisonnement
      thinkContentBuffer.current += '<think>';

      if (parts.length > 1) {
        // Ajouter le contenu après <think> au buffer de raisonnement
        thinkContentBuffer.current += parts[1];
      }

      // Retourner seulement la partie avant <think> pour affichage
      return { visibleContent: contentBeforeThink, reasoningContent: token };
    }

    // Vérifier si on sort d'un bloc de raisonnement </think>
    if (token.includes('</think>')) {
      thinkDepth.current -= 1;

      // Ajouter au buffer de raisonnement
      thinkContentBuffer.current += token;

      // Si c'est la fin du dernier bloc de raisonnement, passer en mode normal
      if (thinkDepth.current === 0) {
        isInThinkMode.current = false;
      }

      // Extraire la partie après </think> pour l'ajouter au contenu visible
      const parts = token.split('</think>');
      const contentAfterThink = parts.length > 1 ? parts[1] : '';

      return { visibleContent: contentAfterThink, reasoningContent: token };
    }

    // Si on est en mode raisonnement, ajouter au buffer de raisonnement
    if (isInThinkMode.current) {
      thinkContentBuffer.current += token;
      return { visibleContent: '', reasoningContent: token };
    }

    // Sinon, c'est du contenu normal
    return { visibleContent: token, reasoningContent: '' };
  };

  // Gère la réception des chunks de streaming depuis le background
  const handleStreamChunk = (chunk: string) => {
    // Traiter le chunk avec la fonction processStreamToken
    const { visibleContent, reasoningContent } = processStreamToken(chunk);

    // Mettre à jour le message en streaming
    setMessages(prev => {
      const newMessages = [...prev];
      const streamingMessageIndex = newMessages.findIndex(m => m.isStreaming);

      if (streamingMessageIndex !== -1) {
        // Mise à jour du message existant
        const currentMessage = newMessages[streamingMessageIndex];

        // Mettre à jour le raisonnement
        let updatedReasoning = currentMessage.reasoning || '';
        if (reasoningContent) {
          updatedReasoning += reasoningContent;
        }

        // Si on quitte un bloc think et qu'on a du contenu dans le buffer, l'utiliser comme raisonnement
        if (thinkDepth.current === 0 && thinkContentBuffer.current !== '') {
          // Extraire le contenu du buffer
          const { reasoning } = extractReasoning(thinkContentBuffer.current);
          if (reasoning) {
            updatedReasoning = reasoning;
            // Ne pas réinitialiser thinkContentBuffer ici car il peut contenir plusieurs blocs
          }
        }

        newMessages[streamingMessageIndex] = {
          ...currentMessage,
          content: currentMessage.content + visibleContent,
          reasoning: updatedReasoning,
          isStreaming: true,
        };
      }

      return newMessages;
    });
  };

  // Gère la fin du streaming et finalise le message
  const handleStreamEnd = (success: boolean) => {
    if (success) {
      // Finaliser le message en streaming
      setMessages(prev => {
        const newMessages = [...prev];
        const streamingMessageIndex = newMessages.findIndex(m => m.isStreaming);

        if (streamingMessageIndex !== -1) {
          const currentMessage = newMessages[streamingMessageIndex];

          // Traiter une dernière fois pour extraire tout raisonnement
          let finalReasoning = currentMessage.reasoning || '';
          if (thinkContentBuffer.current !== '') {
            const { reasoning } = extractReasoning(thinkContentBuffer.current);
            if (reasoning) {
              finalReasoning = reasoning;
            }
          }

          // Enlever le marqueur de streaming et finaliser le contenu
          newMessages[streamingMessageIndex] = {
            ...currentMessage,
            isStreaming: false,
            reasoning: finalReasoning,
          };
        }

        return newMessages;
      });
    } else {
      // En cas d'erreur, laisser le message avec une indication d'erreur
      console.error('Streaming ended with error');
    }

    // Nettoyer les variables de streaming
    isInThinkMode.current = false;
    thinkContentBuffer.current = '';
    thinkDepth.current = 0;

    // Fermer et nettoyer le port
    cleanupStreamingConnection();

    // Marquer comme non chargement
    setIsLoading(false);
  };

  // Gère les erreurs de streaming
  const handleStreamError = (error: string) => {
    console.error('Stream error:', error);

    // Mettre à jour le message en streaming avec l'erreur
    setMessages(prev => {
      const newMessages = [...prev];
      const streamingMessageIndex = newMessages.findIndex(m => m.isStreaming);

      if (streamingMessageIndex !== -1) {
        newMessages[streamingMessageIndex] = {
          role: 'system',
          content: `Erreur: ${error}`,
          isStreaming: false,
        };
      } else {
        // Ajouter un nouveau message d'erreur si aucun n'est en streaming
        newMessages.push({
          role: 'system',
          content: `Erreur: ${error}`,
          isStreaming: false,
        });
      }

      return newMessages;
    });

    // Nettoyer le streaming
    cleanupStreamingConnection();
    setIsLoading(false);
  };

  // Initialise une connexion de streaming
  const initStreamingConnection = () => {
    // Générer un ID unique pour ce port
    const uniquePortId = `ai_streaming_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    streamingPortId.current = uniquePortId;

    // Créer le port
    const port = chrome.runtime.connect({ name: uniquePortId });
    streamingPort = port;

    // Configurer les listeners
    port.onMessage.addListener(message => {
      switch (message.type) {
        case 'STREAM_START':
          console.log('[SidePanel] Début du streaming');
          break;

        case 'STREAM_CHUNK':
          handleStreamChunk(message.chunk);
          break;

        case 'STREAM_END':
          console.log('[SidePanel] Fin du streaming, success:', message.success);
          handleStreamEnd(message.success);
          break;

        case 'STREAM_ERROR':
          handleStreamError(message.error);
          break;

        default:
          console.log('[SidePanel] Message de streaming inconnu:', message);
      }
    });

    port.onDisconnect.addListener(() => {
      console.log('[SidePanel] Port de streaming déconnecté');
      if (isLoading) {
        // Si toujours en chargement, c'est une déconnexion inattendue
        handleStreamError('Connexion perdue avec le background');
      }
      streamingPort = null;
      streamingPortId.current = null;
    });

    return uniquePortId;
  };

  // Nettoie la connexion de streaming
  const cleanupStreamingConnection = () => {
    if (streamingPort) {
      try {
        streamingPort.disconnect();
      } catch (e) {
        console.warn('[SidePanel] Erreur lors de la déconnexion du port:', e);
      }
      streamingPort = null;
      streamingPortId.current = null;
    }

    // Sauvegarder la conversation après la fin du streaming
    saveCurrentMessages().catch(console.error);
  };

  // Modifions le gestionnaire de soumission pour utiliser le streaming
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    // Si agent is not ready, show a message directly without making API call
    if (!isReady) {
      const userMsg: Message = { role: 'user', content: input };
      const errorMsg: Message = {
        role: 'system',
        content:
          "Désolé, l'agent IA n'est pas disponible actuellement. Vérifiez qu'Ollama est en cours d'exécution et qu'un modèle est installé (commande: ollama pull llama3).",
      };

      setMessages(prev => [...prev, userMsg, errorMsg]);
      setInput('');

      // Si pas de conversation active, créer une nouvelle conversation
      if (!activeConversationId) {
        const newConversation: Omit<ChatConversation, 'id' | 'createdAt' | 'updatedAt'> = {
          name: extractConversationName(input),
          messages: [
            { role: 'user', content: input, timestamp: Date.now() },
            { role: 'system', content: errorMsg.content, timestamp: Date.now() },
          ],
          model: settings.selectedModel,
        };

        const newId = await chatHistoryStorage.addConversation(newConversation);
        setActiveConversationId(newId);
        setCurrentChatName(newConversation.name);
      } else {
        // Ajouter les messages à la conversation existante
        const messagesToSave: ChatMessage[] = [
          { role: 'user', content: input, timestamp: Date.now() },
          { role: 'system', content: errorMsg.content, timestamp: Date.now() },
        ];

        messagesToSave.forEach(async msg => {
          await chatHistoryStorage.addMessageToConversation(activeConversationId, msg);
        });
      }

      return;
    }

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);

    // Si c'est le premier message et qu'il n'y a pas de conversation active, créer une nouvelle
    if (!activeConversationId) {
      const newName = extractConversationName(input);
      const newConversation: Omit<ChatConversation, 'id' | 'createdAt' | 'updatedAt'> = {
        name: newName,
        messages: [
          { role: 'assistant', content: "Bonjour! Comment puis-je vous aider aujourd'hui?", timestamp: Date.now() },
          { role: 'user', content: input, timestamp: Date.now() },
        ],
        model: settings.selectedModel,
      };

      const newId = await chatHistoryStorage.addConversation(newConversation);
      setActiveConversationId(newId);
      setCurrentChatName(newName);
    } else {
      // Ajouter le message à la conversation existante
      await chatHistoryStorage.addMessageToConversation(activeConversationId, {
        role: 'user',
        content: input,
        timestamp: Date.now(),
      });
    }

    setInput('');
    setIsLoading(true);

    // Réinitialiser les variables de suivi du raisonnement
    isInThinkMode.current = false;
    thinkContentBuffer.current = '';
    thinkDepth.current = 0;

    // Ajouter un message vide pour l'assistant qui sera rempli progressivement
    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: '',
        reasoning: '',
        isStreaming: true,
      },
    ]);

    try {
      // Initialiser le streaming
      const portId = initStreamingConnection();

      // Préparer le payload avec le message, l'historique et les infos de streaming
      const requestPayload = {
        message: input,
        chatHistory: messages.filter(m => m.role !== 'system'),
        streamHandler: true, // Indique au background qu'on veut utiliser le streaming
        portId: portId, // ID du port pour que le background puisse envoyer les chunks
      };

      // Envoyer la requête au background script
      chrome.runtime.sendMessage(
        {
          type: 'AI_CHAT_REQUEST',
          payload: requestPayload,
        },
        response => {
          console.log('[SidePanel] Callback sendMessage reçu avec la réponse:', response);

          // Vérifier s'il y a une erreur de communication
          const runtimeError = chrome.runtime.lastError;
          if (runtimeError) {
            // CORRECTION: Accéder correctement au message d'erreur
            const errorMessage = runtimeError.message || 'Communication avec le background impossible';
            console.error('[SidePanel] Erreur de communication détectée:', errorMessage);

            // Mettre à jour le message en streaming avec une erreur
            setMessages(prev => {
              const newMessages = [...prev];
              const streamingMessageIndex = newMessages.findIndex(m => m.isStreaming);
              if (streamingMessageIndex !== -1) {
                newMessages[streamingMessageIndex] = {
                  role: 'system',
                  content: `Erreur: ${errorMessage}`,
                };
              }
              return newMessages;
            });

            setIsLoading(false);
            cleanupStreamingConnection();
            return;
          }

          // Vérifier si le streaming a bien été lancé
          if (!response || !response.success) {
            console.error('[SidePanel] Echec du lancement du streaming:', response?.error);

            // Mettre à jour le message en streaming avec l'erreur
            setMessages(prev => {
              const newMessages = [...prev];
              const streamingMessageIndex = newMessages.findIndex(m => m.isStreaming);
              if (streamingMessageIndex !== -1) {
                newMessages[streamingMessageIndex] = {
                  role: 'system',
                  content: `Erreur: ${response?.error || 'Erreur inconnue'}`,
                };
              }
              return newMessages;
            });

            setIsLoading(false);
            cleanupStreamingConnection();
          }

          // Si streaming démarré avec succès, la suite se fera via les messages du port
        },
      );
    } catch (error) {
      console.error('Error starting stream:', error);

      let errorMessage = 'Désolé, une erreur est survenue. Veuillez réessayer plus tard.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      // Remplacer le message en streaming par un message d'erreur
      setMessages(prev => {
        const newMessages = [...prev];
        const streamingMessageIndex = newMessages.findIndex(m => m.isStreaming);
        if (streamingMessageIndex !== -1) {
          newMessages[streamingMessageIndex] = {
            role: 'system',
            content: errorMessage,
          };
        } else {
          newMessages.push({ role: 'system', content: errorMessage });
        }
        return newMessages;
      });

      setIsLoading(false);
      cleanupStreamingConnection();

      // Réinitialiser les variables de suivi du raisonnement
      isInThinkMode.current = false;
      thinkContentBuffer.current = '';
      thinkDepth.current = 0;
    }
  };

  // Fonction pour extraire un nom de conversation à partir du premier message
  const extractConversationName = (message: string): string => {
    // Prendre les premiers mots significatifs du message (jusqu'à 5 mots, max 30 caractères)
    const words = message.split(' ');
    const nameWords = words.slice(0, 5);
    let name = nameWords.join(' ');

    if (name.length > 30) {
      name = name.substring(0, 27) + '...';
    }

    return name;
  };

  // Rendu d'un message avec prise en charge du raisonnement
  const renderMessage = (message: Message, index: number) => {
    const hasReasoning = message.reasoning && message.reasoning.length > 0;
    const isCurrentlyInThinkMode = message.isStreaming && isInThinkMode.current;

    return (
      <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-1.5`}>
        <div
          className={`message-bubble py-1.5 px-2.5 rounded-lg shadow-sm max-w-[85%] text-left ${
            message.role === 'user'
              ? 'bg-blue-600 text-white rounded-br-none'
              : message.role === 'assistant'
                ? 'bg-gray-700 text-gray-200 rounded-bl-none border border-gray-600'
                : 'bg-gray-600 text-gray-300 mx-auto text-xs rounded-full'
          }`}>
          {/* Indicateur de raisonnement en cours */}
          {isCurrentlyInThinkMode && (
            <div className="mb-1 text-xs text-blue-400 flex items-center">
              <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-pulse mr-1"></span>
              Thinking...
            </div>
          )}

          {message.role === 'assistant' ? (
            <div className="message-content">
              <MarkdownRenderer content={message.content} />
              {message.isStreaming && !isInThinkMode.current && (
                <span className="inline-block w-1.5 h-4 ml-0.5 bg-current animate-pulse rounded"></span>
              )}
            </div>
          ) : (
            <p className="message-content whitespace-pre-wrap text-sm leading-tight m-0">
              {message.content}
              {message.isStreaming && !isInThinkMode.current && (
                <span className="inline-block w-1.5 h-4 ml-0.5 bg-current animate-pulse rounded"></span>
              )}
            </p>
          )}

          {/* Affichage du raisonnement si disponible et option activée */}
          {hasReasoning && showReasoning && (
            <div className="mt-2 pt-2 border-t border-gray-600 text-left">
              <div className="text-xs text-gray-400 mb-1">
                <span>Raisonnement:</span>
              </div>
              <pre className="text-xs bg-gray-800 p-2 rounded whitespace-pre-wrap text-gray-300 overflow-auto max-h-64 text-left">
                {message.reasoning}
              </pre>
            </div>
          )}

          {/* Bouton compact pour afficher/masquer le raisonnement si disponible */}
          {hasReasoning && (
            <div className="mt-1 flex justify-end">
              <button
                onClick={() => setShowReasoning(!showReasoning)}
                className={`inline-flex items-center text-xs px-2 py-0.5 rounded ${
                  showReasoning ? 'bg-blue-800/40 text-blue-300' : 'bg-gray-800/40 text-gray-300 hover:bg-blue-900/20'
                }`}>
                <ThinkingIcon />
                <span className="ml-1">{showReasoning ? 'Masquer' : 'Afficher le raisonnement'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleClosePanel = () => {
    // Ferme le panneau latéral
    chrome.runtime.sendMessage({ action: 'closeSidePanel' });
  };

  // Nettoyage des connexions de streaming à la fermeture
  useEffect(() => {
    return () => {
      cleanupStreamingConnection();
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full flex flex-col bg-gray-900 text-white">
      {/* Header with app name and close button */}
      <div className="flex items-center justify-between p-2 bg-blue-950 shadow-md">
        <div className="flex items-center">
          <span className="text-2xl mr-2">🦤</span>
          <h1 className="text-base font-medium">DoDai</h1>
        </div>
        <button
          className="p-1 text-gray-200 hover:text-white rounded-full hover:bg-blue-800/50"
          onClick={() => chrome.runtime.openOptionsPage()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Tabs navigation */}
      <div className="flex bg-blue-950 text-sm font-medium">
        <button
          className={`flex-1 py-2.5 text-center transition-colors ${
            activeTab === 'chat'
              ? 'text-white border-b-2 border-blue-400'
              : 'text-gray-300 hover:text-white hover:bg-blue-900/30'
          }`}
          onClick={() => setActiveTab('chat')}>
          <div className="flex items-center justify-center">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="mr-1.5">
              <path
                d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M12 12H8M12 8V12V8ZM12 12V16V12ZM12 12H16H12Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Chat
          </div>
        </button>
        <button
          className={`flex-1 py-2.5 text-center transition-colors ${
            activeTab === 'tools'
              ? 'text-white border-b-2 border-blue-400'
              : 'text-gray-300 hover:text-white hover:bg-blue-900/30'
          }`}
          onClick={() => setActiveTab('tools')}>
          <div className="flex items-center justify-center">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="mr-1.5">
              <path
                d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Outils
          </div>
        </button>
        <button
          className={`flex-1 py-2.5 text-center transition-colors ${
            activeTab === 'memory'
              ? 'text-white border-b-2 border-blue-400'
              : 'text-gray-300 hover:text-white hover:bg-blue-900/30'
          }`}
          onClick={() => setActiveTab('memory')}>
          <div className="flex items-center justify-center">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="mr-1.5">
              <path
                d="M9 3H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M9 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 20h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 8h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Mémoire
          </div>
        </button>
      </div>

      {/* Main content based on active tab */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeTab === 'chat' && (
          <>
            {/* Title with chat name and history button */}
            <div className="p-3 border-b border-gray-700 bg-gray-900 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-medium flex items-center text-gray-100">
                  <button
                    className="mr-2 p-1 text-gray-400 hover:text-blue-400 rounded-full hover:bg-gray-800/50"
                    onClick={() => setShowChatHistory(!showChatHistory)}
                    title="Historique des conversations">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <line
                        x1="8"
                        y1="10"
                        x2="16"
                        y2="10"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <line
                        x1="8"
                        y1="14"
                        x2="16"
                        y2="14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <line
                        x1="8"
                        y1="18"
                        x2="12"
                        y2="18"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                  <span className="truncate max-w-[250px]">{currentChatName}</span>
                </h2>

                {/* Bouton pour renommer la conversation */}
                {activeConversationId && (
                  <button
                    className="p-1 text-gray-400 hover:text-blue-400 rounded-full hover:bg-gray-800/50"
                    onClick={() => {
                      const newName = prompt('Renommer la conversation:', currentChatName);
                      if (newName && newName.trim() !== '') {
                        renameCurrentConversation(newName.trim());
                      }
                    }}
                    title="Renommer la conversation">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Chat history sidebar - conditionally rendered */}
            {showChatHistory && (
              <div className="absolute left-0 top-[137px] bottom-0 w-64 bg-gray-800 border-r border-gray-700 shadow-lg z-10 overflow-y-auto p-3">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-medium text-gray-300">Historique des conversations</h3>
                  <button
                    className="p-1 text-gray-400 hover:text-blue-400 rounded-full hover:bg-gray-800/50"
                    onClick={createNewConversation}
                    title="Nouvelle conversation">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M12 5v14M5 12h14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>

                <div className="space-y-2">
                  {chatHistory && chatHistory.length > 0 ? (
                    [...chatHistory]
                      .sort((a, b) => b.updatedAt - a.updatedAt)
                      .map(conversation => (
                        <div
                          key={conversation.id}
                          className="flex items-center justify-between p-1 rounded-md hover:bg-gray-700/50">
                          <button
                            className={`flex-1 text-left px-2 py-1.5 truncate ${
                              activeConversationId === conversation.id ? 'text-blue-300 font-medium' : 'text-gray-300'
                            }`}
                            onClick={() => loadConversation(conversation.id)}>
                            {conversation.name}
                          </button>
                          <button
                            className="p-1 text-gray-500 hover:text-red-400 rounded-full hover:bg-gray-700/50"
                            onClick={() => {
                              if (confirm(`Supprimer la conversation "${conversation.name}" ?`)) {
                                deleteConversation(conversation.id);
                              }
                            }}
                            title="Supprimer la conversation">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg">
                              <path
                                d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        </div>
                      ))
                  ) : (
                    <div className="text-gray-500 text-sm text-center py-3">
                      Aucune conversation
                      <button
                        className="block mx-auto mt-2 px-3 py-1.5 bg-blue-900/50 text-blue-300 rounded-md hover:bg-blue-800/50"
                        onClick={createNewConversation}>
                        Créer une conversation
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Messages area - use flex-1 and min-h-0 to make it take available space */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
              {messages.map((message, index) => renderMessage(message, index))}
              <div ref={messagesEndRef}></div>
            </div>

            {/* Input area - fixed at bottom */}
            <div className="p-3 border-t border-gray-700 bg-gray-900">
              <form onSubmit={handleSubmit} className="flex flex-col gap-1">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Envoyer un message..."
                    className="w-full p-2.5 pr-10 rounded-lg bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400 text-sm"
                    disabled={isLoading || !settings.isEnabled || !isReady}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !settings.isEnabled || !isReady || !input.trim()}
                    className="absolute right-2 p-1.5 rounded-md text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 disabled:opacity-50 disabled:pointer-events-none transition-colors">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round">
                      <path d="M22 2L11 13"></path>
                      <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
                    </svg>
                  </button>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <div className="relative" ref={modelDropdownRef}>
                    <button
                      onClick={handleOpenModelDropdown}
                      className="flex items-center text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-800/50 transition-colors group"
                      disabled={isLoading || !settings.isEnabled || !isReady}
                      title="Cliquez pour changer de modèle">
                      <svg
                        className="w-4 h-4 mr-1 group-hover:text-blue-400 transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="text-gray-400 group-hover:text-gray-300 transition-colors">
                        {settings.selectedModel || 'Non défini'}
                      </span>
                      <svg
                        className={`ml-1 w-3 h-3 transform transition-transform ${showModelDropdown ? 'rotate-180' : ''} group-hover:text-blue-400`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showModelDropdown && (
                      <div className="absolute bottom-full left-0 mb-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg overflow-hidden z-10 w-48 animate-fadeIn">
                        <div className="p-2 border-b border-gray-700 flex justify-between items-center">
                          <h3 className="text-sm font-medium text-gray-300">Modèles disponibles</h3>
                          <button
                            onClick={fetchAvailableModels}
                            className="p-1 text-gray-400 hover:text-blue-400 rounded-full hover:bg-gray-700/50"
                            title="Actualiser la liste">
                            <svg
                              className={`w-3.5 h-3.5 ${loadingModels ? 'animate-spin' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                              />
                            </svg>
                          </button>
                        </div>

                        <div className="py-1 max-h-48 overflow-y-auto scrollbar-thin">
                          {loadingModels ? (
                            <div className="px-3 py-2 text-gray-400 text-center">
                              <div className="inline-block w-4 h-4 border-2 border-gray-600 border-t-blue-400 rounded-full animate-spin mr-2"></div>
                              Chargement...
                            </div>
                          ) : (
                            availableModels.map(model => (
                              <button
                                key={model}
                                className={`w-full text-left px-3 py-2 hover:bg-gray-700 transition-colors ${
                                  model === settings.selectedModel ? 'bg-blue-900/30 text-blue-300' : 'text-gray-300'
                                }`}
                                onClick={() => handleModelChange(model)}>
                                {model}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {!isReady && (
                    <span className="text-red-400 flex items-center">
                      <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                      Non connecté
                    </span>
                  )}
                  {isReady && (
                    <span className="text-green-400 flex items-center">
                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                      Connecté
                    </span>
                  )}
                </div>
              </form>
            </div>
          </>
        )}

        {activeTab === 'tools' && (
          <div className="flex-1 overflow-y-auto p-4 bg-gray-800">
            <h2 className="text-lg font-semibold text-gray-200 mb-4">Outils MCP Disponibles</h2>
            {loadedTools === null ? (
              <p className="text-gray-400">Chargement des outils...</p>
            ) : loadedTools.length === 0 ? (
              <p className="text-gray-400">
                Aucun outil MCP n'est actuellement chargé ou connecté. Vérifiez la configuration dans les options.
              </p>
            ) : (
              <div className="space-y-3">
                {loadedTools.map((tool, index) => (
                  <div key={index} className="bg-gray-700 p-3 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-blue-300 break-all">{tool.name}</h3>
                    <p className="text-xs text-gray-400 mt-1 mb-2">Serveur: {tool.serverName}</p>
                    <p className="text-xs text-gray-300">{tool.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'memory' && (
          <div className="flex-1 flex items-center justify-center bg-gray-800">
            <p className="text-gray-400">Fonctionnalité Mémoire en développement</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default withErrorBoundary(
  withSuspense(
    SidePanel,
    <div className="flex items-center justify-center h-full bg-gray-900 text-gray-400">Chargement...</div>,
  ),
  <div className="flex items-center justify-center h-full bg-gray-900 text-red-400">Une erreur est survenue</div>,
);
