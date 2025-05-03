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

        const prompt = ChatPromptTemplate.fromMessages([
          [
            'system',
            "You are a helpful AI assistant. You have access to the following tools provided by external MCP servers:\n\n{tools}\n\nUse these tools ONLY when necessary to answer the user's query. Think step-by-step if you need to use a tool.",
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

// --- Listener de Messages Runtime ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // --- Requête de Chat avec Agent (et potentiellement outils MCP) ---
  if (message.type === 'AI_CHAT_REQUEST') {
    console.log('[MCP Background] Reçu AI_CHAT_REQUEST', message.payload);

    if (!agentExecutorInstance) {
      console.warn("[MCP Background] AgentExecutor non prêt pour AI_CHAT_REQUEST. Tentative d'appel direct Ollama.");
      // Fallback: Appel direct à Ollama sans outils si l'agent n'est pas prêt
      aiAgentStorage
        .get()
        .then(settings => {
          const llm = new ChatOllama({
            baseUrl: settings.baseUrl || 'http://localhost:11434',
            model: settings.selectedModel || 'llama3',
            temperature: settings.temperature || 0.7,
          });
          const history = (message.payload.chatHistory || []).map((msg: { role: string; content: string }) =>
            msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content),
          );
          return llm.invoke([...history, new HumanMessage(message.payload.message)]);
        })
        .then(result => {
          sendResponse({ success: true, data: result.content });
        })
        .catch((error: Error) => {
          console.error('[MCP Background] Erreur appel direct Ollama:', error);
          sendResponse({ success: false, error: "L'agent IA n'est pas prêt et l'appel direct a échoué." });
        });
      return true; // La réponse sera asynchrone
    }

    const { message: userInput, chatHistory = [] } = message.payload;
    const history = chatHistory.map((msg: { role: string; content: string }) =>
      msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content),
    );

    agentExecutorInstance
      .invoke({
        input: userInput,
        chat_history: history,
      })
      .then(result => {
        console.log("[MCP Background] Réponse de l'AgentExecutor:", result);
        sendResponse({ success: true, data: result.output });
      })
      .catch((error: Error) => {
        console.error("[MCP Background] Erreur lors de l'invocation de l'agent:", error);
        sendResponse({
          success: false,
          error: error.message || "Erreur inconnue de l'agent",
        });
      });

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
