import { logger } from '../logger';
import type { GlobalState, McpConnectionState, McpConnectionsState, StreamingPort } from '../types';
import type { MultiServerMCPClient } from '@langchain/mcp-adapters';
import type { AgentExecutor } from 'langchain/agents';
import type { StructuredToolInterface } from '@langchain/core/tools';

/**
 * Singleton gérant l'état global du service worker de background
 */
class StateService {
  private state: GlobalState = {
    mcpClient: null,
    loadedMcpTools: [],
    agentExecutorInstance: null,
    mcpConnectionState: {},
    activeStreamingPorts: new Map(),
  };

  constructor() {
    logger.debug('StateService initialisé');
  }

  /**
   * Réinitialise l'état complet à ses valeurs par défaut
   */
  resetState(): void {
    // Nettoyage des ports actifs
    this.state.activeStreamingPorts.forEach(portData => {
      try {
        portData.port.disconnect();
      } catch (e) {
        logger.warn('Erreur lors de la déconnexion du port:', e);
      }
    });

    this.state = {
      mcpClient: null,
      loadedMcpTools: [],
      agentExecutorInstance: null,
      mcpConnectionState: {},
      activeStreamingPorts: new Map(),
    };

    logger.info('StateService: état réinitialisé');
  }

  // --- Getters ---

  getMcpClient(): MultiServerMCPClient | null {
    return this.state.mcpClient;
  }

  getAgentExecutor(): AgentExecutor | null {
    return this.state.agentExecutorInstance;
  }

  getLoadedTools(): StructuredToolInterface[] {
    return this.state.loadedMcpTools;
  }

  getMcpConnectionState(): McpConnectionsState {
    return this.state.mcpConnectionState;
  }

  getStreamingPort(portId: string): StreamingPort | undefined {
    return this.state.activeStreamingPorts.get(portId);
  }

  getAllStreamingPorts(): Map<string, StreamingPort> {
    return this.state.activeStreamingPorts;
  }

  // --- Setters ---

  setMcpClient(client: MultiServerMCPClient | null): void {
    this.state.mcpClient = client;
  }

  setAgentExecutor(agent: AgentExecutor | null): void {
    this.state.agentExecutorInstance = agent;
  }

  setLoadedTools(tools: StructuredToolInterface[]): void {
    this.state.loadedMcpTools = tools;
  }

  updateMcpConnectionState(serverName: string, state: McpConnectionState): void {
    this.state.mcpConnectionState = {
      ...this.state.mcpConnectionState,
      [serverName]: state,
    };
  }

  bulkUpdateMcpConnectionState(states: McpConnectionsState): void {
    this.state.mcpConnectionState = {
      ...this.state.mcpConnectionState,
      ...states,
    };
  }

  // --- Gestion des ports de streaming ---

  addStreamingPort(portId: string, port: chrome.runtime.Port): void {
    this.state.activeStreamingPorts.set(portId, {
      port,
      startTime: Date.now(),
    });
    logger.debug(`Port de streaming ajouté: ${portId}`);
  }

  removeStreamingPort(portId: string): void {
    this.state.activeStreamingPorts.delete(portId);
    logger.debug(`Port de streaming retiré: ${portId}`);
  }

  // --- Utilitaires ---

  isReady(): boolean {
    return this.state.agentExecutorInstance !== null;
  }

  /**
   * Vérifie si au moins un serveur MCP est connecté
   */
  hasConnectedMcpServer(): boolean {
    return Object.values(this.state.mcpConnectionState).some(status => status.status === 'connected');
  }
}

// Export d'une instance singleton
export const stateService = new StateService();
