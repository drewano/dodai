import logger from '../logger';
import { convertChatHistory, MessageType } from '../types';
import { stateService } from '../services/state-service';
import { agentService } from '../services/agent-service';
import { mcpService } from '../services/mcp-service';
import { streamingService } from '../services/streaming-service';
import { mcpLoadedToolsStorage } from '@extension/storage';

/**
 * Gestionnaire central des messages runtime.
 * Utilise une approche à base de routage pour gérer les différents types de messages.
 */
export class MessageHandler {
  /**
   * Définit les gestionnaires pour chaque type de message
   */
  private messageHandlers: Record<string, (message: any, sender: chrome.runtime.MessageSender) => Promise<any>> = {
    [MessageType.AI_CHAT_REQUEST]: this.handleAiChatRequest.bind(this),
    [MessageType.GET_MCP_TOOLS]: this.handleGetMcpTools.bind(this),
    [MessageType.GET_MCP_CONNECTION_STATUS]: this.handleGetMcpConnectionStatus.bind(this),
    [MessageType.MCP_CONFIG_CHANGED]: this.handleMcpConfigChanged.bind(this),
  };

  /**
   * Point d'entrée principal pour la gestion des messages
   */
  handleMessage(message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void): boolean {
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
        sendResponse({ success: false, error: error.message || 'Erreur inconnue' });
      });

    return true; // Indique que nous enverrons une réponse asynchrone
  }

  /**
   * Gestionnaire pour les requêtes de chat avec l'agent AI
   */
  private async handleAiChatRequest(message: any): Promise<any> {
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
            error: error.message || 'Erreur lors du lancement du streaming',
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
        const output = await agentService.invokeAgent(userInput, history);
        return { success: true, data: output };
      } else {
        const output = await agentService.invokeLLM(userInput, history);
        return { success: true, data: output };
      }
    } catch (error: any) {
      logger.error("Erreur lors de l'appel à l'agent:", error);
      return {
        success: false,
        error: error.message || "Erreur inconnue lors de l'appel à l'agent",
      };
    }
  }

  /**
   * Gestionnaire pour obtenir la liste des outils MCP
   */
  private async handleGetMcpTools(): Promise<any> {
    try {
      const tools = await mcpLoadedToolsStorage.get();
      return { success: true, tools };
    } catch (error: any) {
      logger.error('Erreur lors de la récupération des outils MCP:', error);
      return { success: false, error: error.message, tools: [] };
    }
  }

  /**
   * Gestionnaire pour obtenir l'état des connexions MCP
   */
  private async handleGetMcpConnectionStatus(): Promise<any> {
    return {
      success: true,
      connectionState: stateService.getMcpConnectionState(),
    };
  }

  /**
   * Gestionnaire pour les changements de configuration MCP
   */
  private async handleMcpConfigChanged(): Promise<any> {
    logger.info('Configuration MCP changée, réinitialisation...');

    try {
      const success = await mcpService.initializeOrReinitializeMcpClient();

      // Notifier l'UI que les outils/status ont peut-être changé
      await mcpService.notifyStateUpdated();

      return { success };
    } catch (error: any) {
      logger.error('Erreur lors de la réinitialisation MCP:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export d'une instance singleton
export const messageHandler = new MessageHandler();
