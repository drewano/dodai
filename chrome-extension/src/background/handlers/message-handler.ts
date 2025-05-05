import * as loggerModule from '../logger';
import type {
  ChatResponse,
  AgentStatusResponse,
  AvailableModelsResponse,
  McpToolsResponse,
  McpConnectionStatusResponse,
  BaseRuntimeMessage,
  AIChatRequestMessage,
  GetAvailableModelsMessage,
  ChatWithToolsMessage,
} from '../types';
import { convertChatHistory, MessageType } from '../types';
import { stateService } from '../services/state-service';
import { agentService } from '../services/agent-service';
import { mcpService } from '../services/mcp-service';
import { streamingService } from '../services/streaming-service';
import { mcpLoadedToolsStorage } from '@extension/storage';

const logger = loggerModule.default;

/**
 * Gestionnaire central des messages runtime.
 * Utilise une approche à base de routage pour gérer les différents types de messages.
 */
export class MessageHandler {
  /**
   * Définit les gestionnaires pour chaque type de message
   */
  private messageHandlers: Record<
    string,
    (message: BaseRuntimeMessage, sender: chrome.runtime.MessageSender) => Promise<unknown>
  > = {
    [MessageType.AI_CHAT_REQUEST]: (message: BaseRuntimeMessage) =>
      this.handleAiChatRequest(message as AIChatRequestMessage),
    [MessageType.CHAT_WITH_TOOLS]: (message: BaseRuntimeMessage) =>
      this.handleChatWithTools(message as ChatWithToolsMessage),
    [MessageType.CHECK_AGENT_STATUS]: this.handleCheckAgentStatus.bind(this),
    [MessageType.GET_AVAILABLE_MODELS]: (message: BaseRuntimeMessage) =>
      this.handleGetAvailableModels(message as GetAvailableModelsMessage),
    [MessageType.GET_MCP_TOOLS]: this.handleGetMcpTools.bind(this),
    [MessageType.GET_MCP_CONNECTION_STATUS]: this.handleGetMcpConnectionStatus.bind(this),
    [MessageType.MCP_CONFIG_CHANGED]: this.handleMcpConfigChanged.bind(this),
  };

  /**
   * Point d'entrée principal pour la gestion des messages
   */
  handleMessage(
    message: BaseRuntimeMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void,
  ): boolean {
    const { type } = message;

    if (!type || !this.messageHandlers[type]) {
      logger.debug('Message non géré reçu:', message);
      return false; // Indique que nous n'envoyons pas de réponse asynchrone
    }

    // Appeler le gestionnaire approprié
    this.messageHandlers[type](message, sender)
      .then(sendResponse)
      .catch(error => {
        logger.error(`Erreur lors du traitement du message de type ${type}:`, error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' });
      });

    return true; // Indique que nous enverrons une réponse asynchrone
  }

  /**
   * Gestionnaire pour vérifier si l'agent est prêt
   */
  private async handleCheckAgentStatus(): Promise<AgentStatusResponse> {
    try {
      const isReady = await agentService.isAgentReady();
      return { success: true, isReady };
    } catch (error: unknown) {
      logger.error("Erreur lors de la vérification de l'état de l'agent:", error);
      return { success: false, isReady: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Gestionnaire pour obtenir les modèles disponibles
   */
  private async handleGetAvailableModels(message: GetAvailableModelsMessage): Promise<AvailableModelsResponse> {
    try {
      const models = await agentService.getAvailableModels(message.baseUrl);
      return { success: true, models };
    } catch (error: unknown) {
      logger.error('Erreur lors de la récupération des modèles disponibles:', error);
      return { success: false, models: [], error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Gestionnaire pour les requêtes de chat avec l'agent AI
   */
  private async handleAiChatRequest(message: AIChatRequestMessage): Promise<ChatResponse> {
    logger.debug('Reçu AI_CHAT_REQUEST', message.payload);

    // Vérifier si on veut du streaming
    const { message: userInput, chatHistory = [], streamHandler = false, portId } = message.payload;

    // Si streaming demandé et un portId fourni
    if (streamHandler && portId) {
      logger.debug(`Mode streaming demandé avec portId: ${portId}`);

      // Convertir l'historique du chat
      const history = convertChatHistory(chatHistory);

      // Lancer le streaming en asynchrone
      streamingService.executeStreamingAgentOrLLM(userInput, history, portId, stateService.isReady()).catch(error => {
        logger.error('Erreur lors du lancement du streaming:', error);
        // Essayer de notifier l'erreur via le port s'il existe encore
        const streamingPort = stateService.getStreamingPort(portId);
        if (streamingPort) {
          streamingPort.port.postMessage({
            type: 'STREAM_ERROR',
            error: error instanceof Error ? error.message : 'Erreur lors du lancement du streaming',
          });
          streamingPort.port.postMessage({ type: 'STREAM_END', success: false });
        }
      });

      // Répondre immédiatement que le streaming a été lancé
      return { success: true, streaming: true };
    }

    // Mode non-streaming (appel direct)
    try {
      const history = convertChatHistory(chatHistory);

      // Utiliser l'agent ou fallback au LLM direct selon l'état
      if (stateService.isReady()) {
        const result = await agentService.invokeAgent(userInput, history);
        return {
          success: true,
          data: result.response,
          toolUsed: result.toolUsed,
          error: result.error,
        };
      } else {
        const output = await agentService.invokeLLM(userInput, history);
        return { success: true, data: output };
      }
    } catch (error: unknown) {
      logger.error("Erreur lors de l'appel à l'agent:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue lors de l'appel à l'agent",
      };
    }
  }

  /**
   * Gestionnaire pour les requêtes de chat avec outils
   */
  private async handleChatWithTools(message: ChatWithToolsMessage): Promise<ChatResponse> {
    try {
      logger.debug('Reçu CHAT_WITH_TOOLS', { query: message.query });

      // Vérifier d'abord si l'agent est prêt
      const isReady = await agentService.isAgentReady();
      if (!isReady) {
        return {
          success: false,
          error: "L'agent IA n'est pas prêt ou est désactivé. Vérifiez que le serveur Ollama est en cours d'exécution.",
        };
      }

      // Convertir l'historique du chat
      const history = convertChatHistory(message.history || []);

      // Appeler l'agent avec les outils
      const result = await agentService.invokeAgent(message.query, history);

      return {
        success: true,
        data: result.response,
        toolUsed: result.toolUsed,
        error: result.error,
      };
    } catch (error: unknown) {
      logger.error('Erreur lors du chat avec outils:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue lors du chat avec outils',
      };
    }
  }

  /**
   * Gestionnaire pour obtenir la liste des outils MCP
   */
  private async handleGetMcpTools(): Promise<McpToolsResponse> {
    try {
      const tools = await mcpLoadedToolsStorage.get();
      return { success: true, tools };
    } catch (error: unknown) {
      logger.error('Erreur lors de la récupération des outils MCP:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error), tools: [] };
    }
  }

  /**
   * Gestionnaire pour obtenir l'état des connexions MCP
   */
  private async handleGetMcpConnectionStatus(): Promise<McpConnectionStatusResponse> {
    return {
      success: true,
      connectionState: stateService.getMcpConnectionState(),
    };
  }

  /**
   * Gestionnaire pour les changements de configuration MCP
   */
  private async handleMcpConfigChanged(): Promise<{ success: boolean; error?: string }> {
    logger.info('Configuration MCP changée, réinitialisation...');

    try {
      const success = await mcpService.initializeOrReinitializeMcpClient();

      // Notifier l'UI que les outils/status ont peut-être changé
      await mcpService.notifyStateUpdated();

      return { success };
    } catch (error: unknown) {
      logger.error('Erreur lors de la réinitialisation MCP:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}

// Export d'une instance singleton
export const messageHandler = new MessageHandler();
