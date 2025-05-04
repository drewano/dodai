import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import type { Connection } from '@langchain/mcp-adapters';
import { mcpConfigStorage, mcpLoadedToolsStorage, type McpServersConfig, type McpToolInfo } from '@extension/storage';
import logger from '../logger';
import { stateService } from './state-service';
import type { McpClientInitResult, McpConnectionsState } from '../types';
import { agentService } from './agent-service';

/**
 * Service pour gérer le client MCP, ses connexions et outils
 */
export class McpService {
  /**
   * Crée un client MCP à partir de la configuration stockée
   */
  async createMcpClient(): Promise<McpClientInitResult> {
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
    const initialConnectionStates: McpConnectionsState = {};

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
   * Initialise ou réinitialise le client MCP et ses connexions
   */
  async initializeOrReinitializeMcpClient(): Promise<boolean> {
    logger.info('Initialisation/Réinitialisation MCP...');

    // 1. Nettoyage précédent
    const currentClient = stateService.getMcpClient();
    if (currentClient) {
      logger.info('Fermeture du client MCP existant...');
      await currentClient.close().catch(err => {
        logger.error('Erreur lors de la fermeture:', err);
      });
    }

    // Réinitialiser l'état
    stateService.setMcpClient(null);
    stateService.setLoadedTools([]);
    stateService.setAgentExecutor(null);
    stateService.bulkUpdateMcpConnectionState({});
    await mcpLoadedToolsStorage.set([]); // Vide le stockage des outils

    try {
      // 2. Créer et configurer le client MCP
      const {
        client,
        config: clientConfig,
        initialStates,
        prefixToolNameWithServerName,
        additionalToolNamePrefix,
      } = await this.createMcpClient();

      if (!client) {
        return false;
      }

      stateService.setMcpClient(client);
      stateService.bulkUpdateMcpConnectionState(initialStates);

      logger.debug('Configuration Client:', clientConfig);
      logger.info('Connexion aux serveurs MCP...');

      // initializeConnections se connecte ET charge les outils en interne maintenant
      await client.initializeConnections();
      logger.info('Connexions MCP initialisées (ou tentative effectuée).');

      // 3. Charger les outils et mettre à jour l'état de connexion
      const tools = await client.getTools(); // Récupère les outils chargés (peut être vide si erreur)
      stateService.setLoadedTools(tools);

      // Mise à jour de l'état de connexion
      const serverNames = Object.keys(clientConfig);
      const toolsPerServer: Record<string, boolean> = {};

      tools.forEach(tool => {
        const parts = tool.name.split('__');
        if (parts.length >= 3 && parts[0] === 'mcp') {
          toolsPerServer[parts[1]] = true; // Marque le serveur comme ayant au moins un outil chargé
        }
      });

      serverNames.forEach(name => {
        if (toolsPerServer[name]) {
          stateService.updateMcpConnectionState(name, { status: 'connected' });
        } else if (stateService.getMcpConnectionState()[name]?.status !== 'error') {
          // Si on n'a pas d'outil mais pas d'erreur explicite, on marque comme erreur de chargement
          stateService.updateMcpConnectionState(name, {
            status: 'error',
            error: 'Impossible de charger les outils.',
          });
        }
        // Si déjà en erreur pendant initializeConnections, on ne l'écrase pas
      });

      logger.debug('État des connexions mis à jour:', stateService.getMcpConnectionState());

      // 4. Stocker les infos des outils chargés pour l'UI
      const simplifiedToolsInfo = tools.map(tool => {
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
      if (tools.length > 0) {
        await agentService.initializeAgent();
      } else {
        logger.info('Aucun outil MCP chargé, AgentExecutor non initialisé.');
        stateService.setAgentExecutor(null);
      }

      return true;
    } catch (error: any) {
      logger.error("Erreur majeure lors de l'initialisation du client MCP:", error);
      stateService.setMcpClient(null);
      stateService.setLoadedTools([]);
      stateService.setAgentExecutor(null);
      stateService.bulkUpdateMcpConnectionState({}); // Réinitialise l'état
      await mcpLoadedToolsStorage.set([]);
      return false;
    }
  }

  /**
   * Obtient la liste des outils chargés
   */
  async getLoadedTools(): Promise<McpToolInfo[]> {
    try {
      return await mcpLoadedToolsStorage.get();
    } catch (error) {
      logger.error('Erreur lors de la récupération des outils:', error);
      return [];
    }
  }

  /**
   * Notifie l'UI d'un changement d'état MCP
   */
  async notifyStateUpdated(): Promise<void> {
    try {
      await chrome.runtime.sendMessage({ type: 'MCP_STATE_UPDATED' });
    } catch (error) {
      logger.warn('Erreur lors de la notification MCP_STATE_UPDATED:', error);
    }
  }
}

// Export d'une instance singleton
export const mcpService = new McpService();
