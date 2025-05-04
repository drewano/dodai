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

// --- Initialisation MCP et Agent ---

/**
 * Initialise ou réinitialise le client MCP et l'AgentExecutor associé.
 * Lit la configuration depuis le stockage, établit les connexions SSE,
 * charge les outils et configure l'agent LangChain.
 */
async function initializeOrReinitializeMcpClient(): Promise<boolean> {
  console.log('[MCP Background] Initialisation/Réinitialisation...');
  // 1. Nettoyage précédent
  if (mcpClient) {
    console.log('[MCP Background] Fermeture du client MCP existant...');
    await mcpClient.close().catch(err => {
      console.error('[MCP Background] Erreur lors de la fermeture:', err);
    });
  }
  mcpClient = null;
  loadedMcpTools = [];
  agentExecutorInstance = null;
  mcpConnectionState = {};
  await mcpLoadedToolsStorage.set([]); // Vide le stockage des outils

  try {
    // 2. Charger la configuration
    const storedConfig: McpServersConfig = await mcpConfigStorage.get();
    if (!storedConfig || Object.keys(storedConfig).length === 0) {
      console.log('[MCP Background] Aucune configuration de serveur MCP trouvée.');
      return false;
    }

    // 3. Préparer la configuration pour MultiServerMCPClient (SSE uniquement)
    const clientConfig: Record<string, Connection> = {};
    const initialConnectionStates: typeof mcpConnectionState = {};

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
    mcpConnectionState = initialConnectionStates; // Met à jour l'état global

    if (Object.keys(clientConfig).length === 0) {
      console.log('[MCP Background] Aucune configuration MCP valide trouvée.');
      return false;
    }

    // 4. Instancier et Initialiser le Client MCP
    console.log('[MCP Background] Configuration Client:', clientConfig);

    // Définis les options qui seront utilisées pour créer le client
    const mcpClientOptionsUsed = {
      prefixToolNameWithServerName: true, // Correspond à ce qui est passé au constructeur
      additionalToolNamePrefix: 'mcp', // Correspond à ce qui est passé au constructeur
    };

    mcpClient = new MultiServerMCPClient({
      mcpServers: clientConfig,
      // Utilise les mêmes valeurs:
      prefixToolNameWithServerName: mcpClientOptionsUsed.prefixToolNameWithServerName,
      additionalToolNamePrefix: mcpClientOptionsUsed.additionalToolNamePrefix,
      throwOnLoadError: false, // Important: ne pas planter si un serveur échoue
    });

    console.log('[MCP Background] Connexion aux serveurs MCP...');
    // initializeConnections se connecte ET charge les outils en interne maintenant
    await mcpClient.initializeConnections();
    console.log('[MCP Background] Connexions MCP initialisées (ou tentative effectuée).');

    // 5. Charger les outils et mettre à jour l'état de connexion
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
    console.log('[MCP Background] État des connexions mis à jour:', mcpConnectionState);

    // 6. Stocker les infos des outils chargés pour l'UI
    const simplifiedToolsInfo = loadedMcpTools.map(tool => {
      const parts = tool.name.split('__');
      let serverName = 'unknown';

      // Utilise les options connues (mcpClientOptionsUsed) pour parser
      const prefix = mcpClientOptionsUsed.additionalToolNamePrefix;
      const useServerPrefix = mcpClientOptionsUsed.prefixToolNameWithServerName;

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
    console.log(`[MCP Background] Outils MCP chargés et stockés (${simplifiedToolsInfo.length})`);

    // 7. Initialiser l'AgentExecutor SI des outils sont disponibles
    if (loadedMcpTools.length > 0) {
      console.log('[MCP Background] Initialisation de AgentExecutor...');
      try {
        const settings = await aiAgentStorage.get();
        const llm = new ChatOllama({
          baseUrl: settings.baseUrl || 'http://localhost:11434',
          model: settings.selectedModel || 'llama3', // Assurez-vous que ce modèle supporte les tool calls
          temperature: settings.temperature || 0.7,
        });

        // Option 1: Remplacer le template pour ne pas utiliser la variable tools externe
        const prompt = ChatPromptTemplate.fromMessages([
          [
            'system',
            "You are a helpful AI assistant. You have access to tools provided by external MCP servers. Use these tools ONLY when necessary to answer the user's query. Think step-by-step if you need to use a tool.",
          ],
          ['placeholder', '{chat_history}'],
          ['human', '{input}'],
          ['placeholder', '{agent_scratchpad}'],
        ]);

        const agent = await createToolCallingAgent({
          llm,
          tools: loadedMcpTools,
          prompt,
        });

        agentExecutorInstance = new AgentExecutor({
          agent,
          tools: loadedMcpTools,
          verbose: true, // Très utile pour le débogage
          // handleParsingErrors: true, // Peut aider si le LLM formate mal les tool calls
        });
        console.log('[MCP Background] AgentExecutor initialisé avec succès.');
      } catch (agentError) {
        console.error('[MCP Background] Erreur lors de la création de AgentExecutor:', agentError);
        agentExecutorInstance = null; // Assure la réinitialisation en cas d'échec
      }
    } else {
      console.log('[MCP Background] Aucun outil MCP chargé, AgentExecutor non initialisé.');
      agentExecutorInstance = null;
    }

    return true;
  } catch (error: any) {
    console.error("[MCP Background] Erreur majeure lors de l'initialisation du client MCP:", error);
    mcpClient = null;
    loadedMcpTools = [];
    agentExecutorInstance = null;
    mcpConnectionState = {}; // Réinitialise l'état
    await mcpLoadedToolsStorage.set([]);
    // Notifier l'utilisateur pourrait être utile ici
    return false;
  }
}

// --- Écouteur de changements dans le stockage pour les paramètres de l'Agent AI ---
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes['ai-agent-settings']) {
    console.log("[MCP Background] Changement détecté dans les paramètres de l'Agent AI:", changes['ai-agent-settings']);

    const oldSettings = changes['ai-agent-settings'].oldValue || {};
    const newSettings = changes['ai-agent-settings'].newValue || {};

    // Vérifier si un des paramètres critiques a changé
    const criticalParamsChanged =
      oldSettings.selectedModel !== newSettings.selectedModel ||
      oldSettings.temperature !== newSettings.temperature ||
      oldSettings.baseUrl !== newSettings.baseUrl;

    if (criticalParamsChanged) {
      console.log("[MCP Background] Paramètres critiques changés, réinitialisation de l'Agent AI...");
      initializeOrReinitializeMcpClient().then(success => {
        console.log(
          `[MCP Background] Réinitialisation Agent AI suite au changement de paramètres: ${success ? 'réussie' : 'échouée'}`,
        );
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
    console.log(`[MCP Background] Nouvelle connexion de streaming établie: ${portId}`);

    // Stocker le port pour référence future
    activeStreamingPorts.set(portId, {
      port: port,
      startTime: Date.now(),
    });

    // Configurer la déconnexion
    port.onDisconnect.addListener(() => {
      console.log(`[MCP Background] Port de streaming déconnecté: ${portId}`);
      activeStreamingPorts.delete(portId);
    });

    // Gérer les messages de contrôle du port (demandes, annulations, etc.)
    port.onMessage.addListener(message => {
      if (message.type === 'CANCEL_STREAMING') {
        console.log(`[MCP Background] Annulation de streaming reçue: ${portId}`);
        // Logique d'annulation si nécessaire
      }
    });
  }
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
    console.error(`[MCP Background] Port de streaming non trouvé: ${portId}`);
    return;
  }

  const { port } = streamingPort;

  try {
    // Notifier le début du streaming
    port.postMessage({ type: 'STREAM_START' });

    // Récupérer les paramètres de l'agent
    const settings = await aiAgentStorage.get();
    const llm = new ChatOllama({
      baseUrl: settings.baseUrl || 'http://localhost:11434',
      model: settings.selectedModel || 'llama3',
      temperature: settings.temperature || 0.7,
    });

    if (useAgent && agentExecutorInstance) {
      // Utiliser l'AgentExecutor avec streaming
      console.log('[MCP Background] Démarrage du streaming via AgentExecutor...');

      const streamIterator = await agentExecutorInstance.stream({
        input: input,
        chat_history: history,
      });

      for await (const chunk of streamIterator) {
        // Seuls les chunks avec output sont importants pour le streaming de texte
        if (chunk.output) {
          port.postMessage({
            type: 'STREAM_CHUNK',
            chunk: chunk.output,
          });
        }
        // Le client pourrait être intéressé par les tool_calls en cours
        else if (chunk.steps) {
          // Optionnel: envoyer des infos sur l'invocation d'outils
          // port.postMessage({ type: 'TOOL_USAGE', data: chunk.steps });
        }
      }
    } else {
      // Fallback: Appel direct au LLM avec streaming
      console.log('[MCP Background] Fallback: Démarrage du streaming via LLM direct...');

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
    console.error('[MCP Background] Erreur pendant le streaming:', error);

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
    console.log('[MCP Background] Reçu AI_CHAT_REQUEST', message.payload);

    // Vérifier si on veut du streaming
    const { message: userInput, chatHistory = [], streamHandler = false, portId } = message.payload;

    // Si streaming demandé et un portId fourni
    if (streamHandler && portId) {
      console.log(`[MCP Background] Mode streaming demandé avec portId: ${portId}`);

      // Convertir l'historique du chat
      const history = chatHistory.map((msg: { role: string; content: string }) =>
        msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content),
      );

      // Lancer le streaming en asynchrone
      executeStreamingAgentOrLLM(userInput, history, portId, !!agentExecutorInstance).catch(error => {
        console.error('[MCP Background] Erreur lors du lancement du streaming:', error);
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

    // Mode non-streaming (code existant, inchangé)
    if (!agentExecutorInstance) {
      console.error('[MCP Background] AgentExecutor non prêt pour AI_CHAT_REQUEST. Appel direct Ollama...');
      // Fallback: Appel direct à Ollama sans outils si l'agent n'est pas prêt
      aiAgentStorage
        .get()
        .then(settings => {
          console.log('[MCP Background] Fallback Ollama - configuration chargée');
          const llm = new ChatOllama({
            baseUrl: settings.baseUrl || 'http://localhost:11434',
            model: settings.selectedModel || 'llama3',
            temperature: settings.temperature || 0.7,
          });
          const history = (message.payload.chatHistory || []).map((msg: { role: string; content: string }) =>
            msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content),
          );
          console.log('[MCP Background] Fallback Ollama - appel à invoke avec historique:', history.length, 'messages');
          return llm.invoke([...history, new HumanMessage(message.payload.message)]);
        })
        .then(result => {
          console.log('[MCP Background] Fallback Ollama réussi avec contenu de longueur:', result.content.length);
          console.log(
            "[MCP Background] Fallback : Tentative d'envoi de la réponse SUCCESS via sendResponse. Données:",
            typeof result.content === 'string'
              ? result.content.substring(0, 100) + (result.content.length > 100 ? '...' : '')
              : JSON.stringify(result.content).substring(0, 100) + '...',
          );
          sendResponse({ success: true, data: result.content });
        })
        .catch((error: Error) => {
          console.error('[MCP Background] Erreur appel direct Ollama:', error);
          console.error("[MCP Background] Stack trace de l'erreur Ollama:", error.stack); // Loggue la stack trace
          console.error(
            "[MCP Background] Fallback : Tentative d'envoi de la réponse ERROR via sendResponse. Erreur:",
            error.message,
          );
          sendResponse({ success: false, error: "L'agent IA n'est pas prêt et l'appel direct a échoué." });
        });
      return true; // La réponse sera asynchrone
    }

    // --- Logique Agent Executor ---
    const history = chatHistory.map((msg: { role: string; content: string }) =>
      msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content),
    );

    console.log("[MCP Background] Préparation de l'invocation AgentExecutor...");
    console.log(
      '[MCP Background] Historique:',
      history.length,
      'messages, Entrée:',
      userInput.substring(0, 50) + (userInput.length > 50 ? '...' : ''),
    );

    agentExecutorInstance
      .invoke({
        input: userInput,
        chat_history: history,
        // Pas besoin de fournir 'tools' car le template ne l'utilise plus
      })
      .then(result => {
        console.log('[MCP Background] AgentExecutor.invoke a RÉSOLU avec succès:', result);
        try {
          // Vérifie si result.output existe et est une chaîne
          const output = typeof result?.output === 'string' ? result.output : JSON.stringify(result); // Fallback si output n'est pas string
          console.log('[MCP Background] Envoi de la réponse SUCCESS via sendResponse, longueur:', output.length);
          sendResponse({ success: true, data: output });
        } catch (e) {
          console.error('[MCP Background] Erreur DANS le .then() AVANT sendResponse:', e);
          sendResponse({ success: false, error: 'Erreur interne lors de la préparation de la réponse.' });
        }
      })
      .catch((error: Error) => {
        console.error("[MCP Background] AgentExecutor.invoke a ÉCHOUÉ (REJETÉ) avec l'erreur:", error);
        console.error("[MCP Background] Stack trace de l'erreur:", error.stack); // Loggue la stack trace
        try {
          console.log('[MCP Background] Envoi de la réponse ERROR via sendResponse:', error.message);
          sendResponse({
            success: false,
            error: error.message || "Erreur inconnue de l'agent",
          });
        } catch (e) {
          console.error('[MCP Background] Erreur DANS le .catch() AVANT sendResponse:', e);
          // Si sendResponse échoue ici, c'est probablement que le port est fermé
        }
      });
    console.log('[MCP Background] Appel AgentExecutor.invoke lancé (asynchrone). Attente de résolution...');

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
        console.error('[MCP Background] Erreur lecture stockage outils:', error);
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
    console.log('[MCP Background] Configuration MCP changée, réinitialisation...');
    initializeOrReinitializeMcpClient()
      .then(success => {
        sendResponse({ success: success });
        // Notifier l'UI que les outils/status ont peut-être changé
        chrome.runtime.sendMessage({ type: 'MCP_STATE_UPDATED' }).catch(console.warn);
      })
      .catch(error => {
        console.error('[MCP Background] Erreur réinitialisation MCP:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Asynchrone
  }

  // --- Message non géré ---
  console.log('[MCP Background] Message non géré reçu:', message);
  return false; // Indique que nous n'envoyons pas de réponse asynchrone
});

// --- Nettoyage ---
chrome.runtime.onSuspend?.addListener(() => {
  console.log('[MCP Background] Service worker suspendu. Nettoyage...');
  if (mcpClient) {
    mcpClient.close().catch(console.error);
    mcpClient = null;
  }
});

// --- Démarrage Initial ---
console.log('Background script chargé et prêt.');
initializeOrReinitializeMcpClient().then(success => {
  console.log(`[MCP Background] Initialisation initiale MCP ${success ? 'réussie' : 'échouée'}.`);
});

// Note: L'initialisation d'Ollama direct via `aiAgent` est retirée car
// la logique principale de l'agent (avec ou sans outils) passe par l'AgentExecutor ici.
// Si un appel direct à Ollama est toujours nécessaire comme fallback,
// il faut l'implémenter directement ici ou dans une fonction helper locale.
