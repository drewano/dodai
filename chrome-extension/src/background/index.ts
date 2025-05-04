import 'webextension-polyfill';
import {
  aiAgentStorage,
  mcpConfigStorage,
  mcpLoadedToolsStorage,
  type McpServersConfig,
  type McpServerConfigEntry,
  type McpToolInfo,
} from '@extension/storage'; // Assurez-vous que McpToolInfo et mcpLoadedToolsStorage sont exportés depuis storage
import { AIMessage, HumanMessage, BaseMessage } from '@langchain/core/messages';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatOllama } from '@langchain/ollama';
import { MultiServerMCPClient, type Connection } from '@langchain/mcp-adapters';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { StructuredToolInterface } from '@langchain/core/tools';
import logger from './logger';

// --- Types ---
type ChatHistoryMessage = { role: string; content: string };

// --- Variables Globales ---

let mcpClient: MultiServerMCPClient | null = null;
let loadedMcpTools: StructuredToolInterface[] = []; // Outils formatés pour LangChain
let agentExecutorInstance: AgentExecutor | null = null;

// État de connexion simplifié (pourrait être amélioré avec plus de détails)
let mcpConnectionState: Record<string, { status: 'connected' | 'error' | 'unknown'; error?: string }> = {};

// Stockage des ports de connexion pour le streaming
type StreamingPort = {
  port: chrome.runtime.Port;
  startTime: number;
};
const activeStreamingPorts: Map<string, StreamingPort> = new Map();

// --- Fonctions utilitaires ---

/**
 * Convertit l'historique du chat du format client vers le format LangChain
 */
function convertChatHistory(chatHistory: ChatHistoryMessage[] = []): BaseMessage[] {
  return chatHistory.map(msg => (msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)));
}

/**
 * Crée une instance de ChatOllama à partir des paramètres stockés
 */
async function createLLMInstance(): Promise<ChatOllama> {
  const settings = await aiAgentStorage.get();
  return new ChatOllama({
    baseUrl: settings.baseUrl || 'http://localhost:11434',
    model: settings.selectedModel || 'llama3',
    temperature: settings.temperature || 0.7,
  });
}

/**
 * Crée un client MCP à partir de la configuration
 */
async function createMcpClient(): Promise<{
  client: MultiServerMCPClient | null;
  config: Record<string, Connection>;
  initialStates: Record<string, { status: 'connected' | 'error' | 'unknown'; error?: string }>;
  prefixToolNameWithServerName: boolean;
  additionalToolNamePrefix: string;
}> {
  // Charger la configuration
  const storedConfig: McpServersConfig = await mcpConfigStorage.get();
  if (!storedConfig || Object.keys(storedConfig).length === 0) {
    logger.info('Aucune configuration de serveur MCP trouvée.');
    return {
      client: null,
      config: {},
      initialStates: {},
      prefixToolNameWithServerName: true,
      additionalToolNamePrefix: 'mcp',
    };
  }

  // Préparer la configuration pour MultiServerMCPClient (SSE uniquement)
  const clientConfig: Record<string, Connection> = {};
  const initialConnectionStates: Record<string, { status: 'connected' | 'error' | 'unknown'; error?: string }> = {};

  for (const [serverName, config] of Object.entries(storedConfig)) {
    clientConfig[serverName] = {
      transport: 'sse', // Forcé car seule option viable depuis extension
      url: config.url,
      headers: config.headers,
      useNodeEventSource: false, // Non applicable dans le navigateur
      reconnect: { enabled: true, maxAttempts: 3, delayMs: 2000 }, // Reconnexion par défaut
    };
    initialConnectionStates[serverName] = { status: 'unknown' }; // État initial
  }

  if (Object.keys(clientConfig).length === 0) {
    logger.info('Aucune configuration MCP valide trouvée.');
    return {
      client: null,
      config: {},
      initialStates: initialConnectionStates,
      prefixToolNameWithServerName: true,
      additionalToolNamePrefix: 'mcp',
    };
  }

  // Définis les options qui seront utilisées pour créer le client
  const mcpClientOptions = {
    prefixToolNameWithServerName: true,
    additionalToolNamePrefix: 'mcp',
  };

  // Créer le client MCP
  const client = new MultiServerMCPClient({
    mcpServers: clientConfig,
    prefixToolNameWithServerName: mcpClientOptions.prefixToolNameWithServerName,
    additionalToolNamePrefix: mcpClientOptions.additionalToolNamePrefix,
    throwOnLoadError: false, // Important: ne pas planter si un serveur échoue
  });

  return {
    client,
    config: clientConfig,
    initialStates: initialConnectionStates,
    prefixToolNameWithServerName: mcpClientOptions.prefixToolNameWithServerName,
    additionalToolNamePrefix: mcpClientOptions.additionalToolNamePrefix,
  };
}

/**
 * Crée le prompt pour l'agent
 */
function createAgentPrompt(): ChatPromptTemplate {
  return ChatPromptTemplate.fromMessages([
    [
      'system',
      "You are a helpful AI assistant. You have access to tools provided by external MCP servers. Use these tools ONLY when necessary to answer the user's query. Think step-by-step if you need to use a tool.",
    ],
    ['placeholder', '{chat_history}'],
    ['human', '{input}'],
    ['placeholder', '{agent_scratchpad}'],
  ]);
}

// --- Initialisation MCP et Agent ---

/**
 * Initialise ou réinitialise le client MCP et l'AgentExecutor associé.
 * Lit la configuration depuis le stockage, établit les connexions SSE,
 * charge les outils et configure l'agent LangChain.
 */
async function initializeOrReinitializeMcpClient(): Promise<boolean> {
  logger.info('Initialisation/Réinitialisation...');

  // 1. Nettoyage précédent
  if (mcpClient) {
    logger.info('Fermeture du client MCP existant...');
    await mcpClient.close().catch(err => {
      logger.error('Erreur lors de la fermeture:', err);
    });
  }
  mcpClient = null;
  loadedMcpTools = [];
  agentExecutorInstance = null;
  mcpConnectionState = {};
  await mcpLoadedToolsStorage.set([]); // Vide le stockage des outils

  try {
    // 2. Créer et configurer le client MCP
    const {
      client,
      config: clientConfig,
      initialStates,
      prefixToolNameWithServerName,
      additionalToolNamePrefix,
    } = await createMcpClient();

    if (!client) {
      return false;
    }

    mcpClient = client;
    mcpConnectionState = initialStates;

    logger.debug('Configuration Client:', clientConfig);
    logger.info('Connexion aux serveurs MCP...');

    // initializeConnections se connecte ET charge les outils en interne maintenant
    await mcpClient.initializeConnections();
    logger.info('Connexions MCP initialisées (ou tentative effectuée).');

    // 3. Charger les outils et mettre à jour l'état de connexion
    loadedMcpTools = await mcpClient.getTools(); // Récupère les outils chargés (peut être vide si erreur)

    // Mise à jour de l'état de connexion (simplifié)
    const serverNames = Object.keys(clientConfig);
    const toolsPerServer: Record<string, boolean> = {};
    loadedMcpTools.forEach(tool => {
      const parts = tool.name.split('__');
      if (parts.length >= 3 && parts[0] === 'mcp') {
        toolsPerServer[parts[1]] = true; // Marque le serveur comme ayant au moins un outil chargé
      }
    });

    serverNames.forEach(name => {
      if (toolsPerServer[name]) {
        mcpConnectionState[name] = { status: 'connected' };
      } else if (mcpConnectionState[name]?.status !== 'error') {
        // Si on n'a pas d'outil mais pas d'erreur explicite, on marque comme erreur de chargement
        mcpConnectionState[name] = { status: 'error', error: 'Impossible de charger les outils.' };
      }
      // Si déjà en erreur pendant initializeConnections, on ne l'écrase pas
    });
    logger.debug('État des connexions mis à jour:', mcpConnectionState);

    // 4. Stocker les infos des outils chargés pour l'UI
    const simplifiedToolsInfo = loadedMcpTools.map(tool => {
      const parts = tool.name.split('__');
      let serverName = 'unknown';

      // Utilise les options connues pour parser
      const prefix = additionalToolNamePrefix;
      const useServerPrefix = prefixToolNameWithServerName;

      if (prefix && useServerPrefix && parts.length >= 3 && parts[0] === prefix) {
        serverName = parts[1]; // Le nom du serveur est la 2ème partie
      } else if (useServerPrefix && !prefix && parts.length >= 2) {
        serverName = parts[0]; // Le nom du serveur est la 1ère partie
      } else if (!useServerPrefix && prefix && parts.length >= 2 && parts[0] === prefix) {
        serverName = 'global (prefixed)'; // Nom global mais avec préfixe additionnel
      } else if (!useServerPrefix && !prefix && parts.length >= 1) {
        serverName = 'global (no prefix)'; // Nom global simple
      }

      return {
        name: tool.name,
        description: tool.description || 'Pas de description.',
        serverName: serverName,
      };
    });
    await mcpLoadedToolsStorage.set(simplifiedToolsInfo);
    logger.info(`Outils MCP chargés et stockés (${simplifiedToolsInfo.length})`);

    // 5. Initialiser l'AgentExecutor SI des outils sont disponibles
    if (loadedMcpTools.length > 0) {
      logger.info('Initialisation de AgentExecutor...');
      try {
        const llm = await createLLMInstance();
        const prompt = createAgentPrompt();

        const agent = await createToolCallingAgent({
          llm,
          tools: loadedMcpTools,
          prompt,
        });

        agentExecutorInstance = new AgentExecutor({
          agent,
          tools: loadedMcpTools,
          verbose: false, // Désactivé pour réduire le bruit dans les logs
        });
        logger.info('AgentExecutor initialisé avec succès.');
      } catch (agentError) {
        logger.error('Erreur lors de la création de AgentExecutor:', agentError);
        agentExecutorInstance = null; // Assure la réinitialisation en cas d'échec
      }
    } else {
      logger.info('Aucun outil MCP chargé, AgentExecutor non initialisé.');
      agentExecutorInstance = null;
    }

    return true;
  } catch (error: any) {
    logger.error("Erreur majeure lors de l'initialisation du client MCP:", error);
    mcpClient = null;
    loadedMcpTools = [];
    agentExecutorInstance = null;
    mcpConnectionState = {}; // Réinitialise l'état
    await mcpLoadedToolsStorage.set([]);
    return false;
  }
}

// --- Écouteur de changements dans le stockage pour les paramètres de l'Agent AI ---
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes['ai-agent-settings']) {
    logger.debug("Changement détecté dans les paramètres de l'Agent AI:", changes['ai-agent-settings']);

    const oldSettings = changes['ai-agent-settings'].oldValue || {};
    const newSettings = changes['ai-agent-settings'].newValue || {};

    // Vérifier si un des paramètres critiques a changé
    const criticalParamsChanged =
      oldSettings.selectedModel !== newSettings.selectedModel ||
      oldSettings.temperature !== newSettings.temperature ||
      oldSettings.baseUrl !== newSettings.baseUrl;

    if (criticalParamsChanged) {
      logger.info("Paramètres critiques changés, réinitialisation de l'Agent AI...");
      initializeOrReinitializeMcpClient().then(success => {
        logger.info(`Réinitialisation Agent AI suite au changement de paramètres: ${success ? 'réussie' : 'échouée'}`);
      });
    }
  }
});

// --- Gestion du streaming ---

/**
 * Gère un port de connexion entrant pour le streaming.
 * @param port Le port de connexion à gérer
 */
function handleStreamingConnection(port: chrome.runtime.Port) {
  if (port.name.startsWith('ai_streaming_')) {
    const portId = port.name;
    logger.debug(`Nouvelle connexion de streaming établie: ${portId}`);

    // Stocker le port pour référence future
    activeStreamingPorts.set(portId, {
      port: port,
      startTime: Date.now(),
    });

    // Configurer la déconnexion
    port.onDisconnect.addListener(() => {
      logger.debug(`Port de streaming déconnecté: ${portId}`);
      activeStreamingPorts.delete(portId);
    });

    // Gérer les messages de contrôle du port (demandes, annulations, etc.)
    port.onMessage.addListener(message => {
      if (message.type === 'CANCEL_STREAMING') {
        logger.debug(`Annulation de streaming reçue: ${portId}`);
        // Logique d'annulation si nécessaire
      }
    });
  }
}

/**
 * Traite un chunk de streaming de l'agent et le prépare pour l'envoi à l'UI
 * @param chunk Le chunk à traiter
 * @param fullTrace Référence au trace log à mettre à jour
 * @returns Le contenu formaté à envoyer à l'UI
 */
function processAgentStreamingChunk(chunk: any, fullTrace: string): { chunkToSend: string; updatedTrace: string } {
  let chunkToSend = '';
  let traceUpdate = '';

  // 1. Cas principal: output direct (contenu final ou partiel)
  if (chunk.output !== undefined && typeof chunk.output === 'string') {
    chunkToSend = chunk.output;
    traceUpdate = `OUTPUT: ${chunkToSend.substring(0, 100)}...\n`;
  }
  // 2. Cas des générations directes
  else if (
    chunk.generations &&
    Array.isArray(chunk.generations) &&
    chunk.generations.length > 0 &&
    Array.isArray(chunk.generations[0]) &&
    chunk.generations[0].length > 0
  ) {
    const gen = chunk.generations[0][0];
    if (gen && (typeof gen.text === 'string' || typeof gen.message?.content === 'string')) {
      chunkToSend = gen.text || gen.message?.content || '';
      traceUpdate = `GENERATIONS: ${chunkToSend.substring(0, 100)}...\n`;
    }
  }
  // 3. Cas des tokens de streaming
  else if (chunk.tokens && typeof chunk.tokens === 'string') {
    chunkToSend = chunk.tokens;
    traceUpdate = `TOKENS: ${chunkToSend.substring(0, 100)}...\n`;
  }
  // 4. Cas des informations sur les outils
  else if (chunk.steps && Array.isArray(chunk.steps) && chunk.steps.length > 0) {
    const latestStep = chunk.steps[chunk.steps.length - 1];

    if (latestStep?.action) {
      chunkToSend = `<think>Utilisation de l'outil: ${latestStep.action.tool}\nParams: ${JSON.stringify(latestStep.action.toolInput)}</think>`;
      traceUpdate = `TOOL ACTION: ${chunkToSend.substring(0, 100)}...\n`;
    } else if (latestStep?.observation) {
      chunkToSend = `<think>Résultat de l'outil: ${latestStep.observation.substring(0, 300)}${latestStep.observation.length > 300 ? '...' : ''}</think>`;
      traceUpdate = `TOOL OBSERVATION: ${chunkToSend.substring(0, 100)}...\n`;
    }
  }

  return {
    chunkToSend,
    updatedTrace: fullTrace + traceUpdate,
  };
}

/**
 * Exécute un appel d'agent avec streaming, envoie les chunks au port de streaming.
 * @param input Message de l'utilisateur
 * @param history Historique du chat
 * @param portId Identifiant du port de streaming
 * @param useAgent Si true, utilise AgentExecutor. Sinon appel direct au LLM.
 */
async function executeStreamingAgentOrLLM(
  input: string,
  history: BaseMessage[],
  portId: string,
  useAgent: boolean = true,
): Promise<void> {
  const streamingPort = activeStreamingPorts.get(portId);
  if (!streamingPort) {
    logger.error(`Port de streaming non trouvé: ${portId}`);
    return;
  }

  const { port } = streamingPort;

  try {
    // Notifier le début du streaming
    port.postMessage({ type: 'STREAM_START' });

    // Récupérer les paramètres de l'agent
    const llm = await createLLMInstance();

    if (useAgent && agentExecutorInstance) {
      // Utiliser l'AgentExecutor avec streaming
      logger.info('Démarrage du streaming via AgentExecutor...');

      const streamIterator = await agentExecutorInstance.stream({
        input: input,
        chat_history: history,
      });

      // Pour le débogage et l'analyse
      let fullTrace = '';

      for await (const chunk of streamIterator) {
        // Pour le débogage
        const chunkStr = JSON.stringify(chunk);
        logger.debug(
          `Chunk reçu (${chunkStr.length} chars):`,
          chunkStr.length > 200 ? chunkStr.substring(0, 200) + '...' : chunkStr,
        );

        fullTrace += `\nCHUNK TYPE: ${Object.keys(chunk).join(', ')}\n`;

        // Traiter le chunk et mettre à jour la trace
        const { chunkToSend, updatedTrace } = processAgentStreamingChunk(chunk, fullTrace);
        fullTrace = updatedTrace;

        // Envoyer le chunk s'il y a du contenu
        if (chunkToSend) {
          port.postMessage({
            type: 'STREAM_CHUNK',
            chunk: chunkToSend,
          });
        }
      }

      // Imprimer la trace pour l'analyse après la fin du streaming
      logger.debug('Trace complète du streaming:', fullTrace);
    } else {
      // Fallback: Appel direct au LLM avec streaming
      logger.info('Fallback: Démarrage du streaming via LLM direct...');

      // Nouveau stream avec l'historique complet + le message utilisateur
      const streamIterator = await llm.stream([...history, new HumanMessage(input)]);

      for await (const chunk of streamIterator) {
        if (typeof chunk.content === 'string') {
          port.postMessage({
            type: 'STREAM_CHUNK',
            chunk: chunk.content,
          });
        }
      }
    }

    // Notifier la fin du streaming
    port.postMessage({ type: 'STREAM_END', success: true });
  } catch (error: any) {
    logger.error('Erreur pendant le streaming:', error);

    // Envoyer l'erreur au client
    port.postMessage({
      type: 'STREAM_ERROR',
      error: error.message || 'Erreur inconnue pendant le streaming',
    });

    // Notifier la fin (avec erreur)
    port.postMessage({ type: 'STREAM_END', success: false });
  }
}

// --- Listener de Messages Runtime ---

// Ajout du listener pour les connexions de streaming
chrome.runtime.onConnect.addListener(handleStreamingConnection);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // --- Requête de Chat avec Agent (et potentiellement outils MCP) ---
  if (message.type === 'AI_CHAT_REQUEST') {
    logger.debug('Reçu AI_CHAT_REQUEST', message.payload);

    // Vérifier si on veut du streaming
    const { message: userInput, chatHistory = [], streamHandler = false, portId } = message.payload;

    // Si streaming demandé et un portId fourni
    if (streamHandler && portId) {
      logger.debug(`Mode streaming demandé avec portId: ${portId}`);

      // Convertir l'historique du chat
      const history = convertChatHistory(chatHistory);

      // Lancer le streaming en asynchrone
      executeStreamingAgentOrLLM(userInput, history, portId, !!agentExecutorInstance).catch(error => {
        logger.error('Erreur lors du lancement du streaming:', error);
        // Essayer de notifier l'erreur via le port s'il existe encore
        const streamingPort = activeStreamingPorts.get(portId);
        if (streamingPort) {
          streamingPort.port.postMessage({
            type: 'STREAM_ERROR',
            error: error.message || 'Erreur lors du lancement du streaming',
          });
          streamingPort.port.postMessage({ type: 'STREAM_END', success: false });
        }
      });

      // Répondre immédiatement que le streaming a été lancé
      sendResponse({ success: true, streaming: true });
      return true;
    }

    // Mode non-streaming (appel direct)
    if (!agentExecutorInstance) {
      logger.warn('AgentExecutor non prêt pour AI_CHAT_REQUEST. Appel direct Ollama...');
      // Fallback: Appel direct à Ollama sans outils si l'agent n'est pas prêt
      createLLMInstance()
        .then(llm => {
          logger.debug('Fallback Ollama - configuration chargée');
          const history = convertChatHistory(message.payload.chatHistory);
          logger.debug('Fallback Ollama - appel à invoke avec historique:', history.length, 'messages');
          return llm.invoke([...history, new HumanMessage(message.payload.message)]);
        })
        .then(result => {
          logger.debug('Fallback Ollama réussi avec contenu de longueur:', result.content.length);
          sendResponse({ success: true, data: result.content });
        })
        .catch((error: Error) => {
          logger.error('Erreur appel direct Ollama:', error);
          sendResponse({ success: false, error: "L'agent IA n'est pas prêt et l'appel direct a échoué." });
        });
      return true; // La réponse sera asynchrone
    }

    // --- Logique Agent Executor ---
    const history = convertChatHistory(chatHistory);

    logger.debug("Préparation de l'invocation AgentExecutor...");
    logger.debug(
      'Historique:',
      history.length,
      'messages, Entrée:',
      userInput.substring(0, 50) + (userInput.length > 50 ? '...' : ''),
    );

    agentExecutorInstance
      .invoke({
        input: userInput,
        chat_history: history,
      })
      .then(result => {
        logger.info('AgentExecutor.invoke a RÉSOLU avec succès');
        try {
          // Vérifie si result.output existe et est une chaîne
          const output = typeof result?.output === 'string' ? result.output : JSON.stringify(result);
          sendResponse({ success: true, data: output });
        } catch (e) {
          logger.error('Erreur DANS le .then() AVANT sendResponse:', e);
          sendResponse({ success: false, error: 'Erreur interne lors de la préparation de la réponse.' });
        }
      })
      .catch((error: Error) => {
        logger.error("AgentExecutor.invoke a ÉCHOUÉ (REJETÉ) avec l'erreur:", error);
        try {
          sendResponse({
            success: false,
            error: error.message || "Erreur inconnue de l'agent",
          });
        } catch (e) {
          logger.error('Erreur DANS le .catch() AVANT sendResponse:', e);
          // Si sendResponse échoue ici, c'est probablement que le port est fermé
        }
      });
    logger.debug('Appel AgentExecutor.invoke lancé (asynchrone). Attente de résolution...');

    return true; // Réponse asynchrone
  }

  // --- Obtenir la liste des outils MCP chargés ---
  if (message.type === 'GET_MCP_TOOLS') {
    mcpLoadedToolsStorage
      .get()
      .then(simplifiedToolsFromStorage => {
        // Les serverName sont déjà corrects car définis lors de l'initialisation.
        // On renvoie directement ce qui est dans le stockage.
        sendResponse({ success: true, tools: simplifiedToolsFromStorage });
      })
      .catch((error: Error) => {
        logger.error('Erreur lecture stockage outils:', error);
        sendResponse({ success: false, error: error.message, tools: [] });
      });
    return true; // La lecture du stockage est asynchrone
  }

  // --- Obtenir l'état des connexions MCP ---
  if (message.type === 'GET_MCP_CONNECTION_STATUS') {
    // Renvoie l'état actuel stocké globalement
    sendResponse({
      success: true,
      connectionState: mcpConnectionState,
    });
    return false; // Réponse synchrone
  }

  // --- Changement de configuration MCP ---
  if (message.type === 'MCP_CONFIG_CHANGED') {
    logger.info('Configuration MCP changée, réinitialisation...');
    initializeOrReinitializeMcpClient()
      .then(success => {
        sendResponse({ success: success });
        // Notifier l'UI que les outils/status ont peut-être changé
        chrome.runtime
          .sendMessage({ type: 'MCP_STATE_UPDATED' })
          .catch(err => logger.warn('Erreur notification MCP_STATE_UPDATED:', err));
      })
      .catch(error => {
        logger.error('Erreur réinitialisation MCP:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Asynchrone
  }

  // --- Message non géré ---
  logger.debug('Message non géré reçu:', message);
  return false; // Indique que nous n'envoyons pas de réponse asynchrone
});

// --- Nettoyage ---
chrome.runtime.onSuspend?.addListener(() => {
  logger.info('Service worker suspendu. Nettoyage...');
  if (mcpClient) {
    mcpClient.close().catch(err => logger.error('Erreur fermeture client MCP:', err));
    mcpClient = null;
  }
});

// --- Démarrage Initial ---
logger.info('Background script chargé et prêt.');
initializeOrReinitializeMcpClient().then(success => {
  logger.info(`Initialisation initiale MCP ${success ? 'réussie' : 'échouée'}.`);
});

// Note: L'initialisation d'Ollama direct via `aiAgent` est retirée car
// la logique principale de l'agent (avec ou sans outils) passe par l'AgentExecutor ici.
// Si un appel direct à Ollama est toujours nécessaire comme fallback,
// il faut l'implémenter directement ici ou dans une fonction helper locale.
