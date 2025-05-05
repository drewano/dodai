import { BaseMessage } from '@langchain/core/messages';

// Type pour représenter un outil MCP simplifié
export type McpTool = {
  name: string;
  description: string;
  serverName?: string;
};

/**
 * Client pour communiquer avec le service worker pour les fonctionnalités IA
 */
export class AIAgent {
  /**
   * Vérifie si l'agent est prêt à être utilisé
   */
  async isReady(): Promise<boolean> {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CHECK_AGENT_STATUS',
      });

      if (response && response.success) {
        return response.isReady;
      }

      return false;
    } catch (error) {
      console.error("Erreur lors de la vérification de l'état de l'agent:", error);
      return false;
    }
  }

  /**
   * Récupère les modèles disponibles depuis Ollama
   */
  async getAvailableModels(baseUrl?: string): Promise<any[]> {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_AVAILABLE_MODELS',
        baseUrl,
      });

      if (response && response.success) {
        return response.models || [];
      }

      return [];
    } catch (error) {
      console.error('Erreur lors de la récupération des modèles disponibles:', error);
      return [];
    }
  }

  /**
   * Demande de chat simple sans outils
   */
  async chat(message: string): Promise<string> {
    try {
      const ready = await this.isReady();
      if (!ready) {
        throw new Error(
          "L'agent IA n'est pas prêt ou est désactivé. Vérifiez que le serveur Ollama est en cours d'exécution.",
        );
      }

      const response = await chrome.runtime.sendMessage({
        type: 'AI_CHAT_REQUEST',
        payload: {
          message,
          chatHistory: [],
        },
      });

      if (!response || !response.success) {
        throw new Error(response?.error || 'Erreur lors de la communication avec le background script');
      }

      return response.data;
    } catch (error) {
      console.error('Erreur lors du chat:', error);
      throw error;
    }
  }

  /**
   * Effectue un chat avec outils MCP
   */
  async chatWithTools(
    message: string,
    chatHistory: BaseMessage[] = [],
  ): Promise<{ response: string; toolUsed: boolean; error?: string }> {
    try {
      const ready = await this.isReady();
      if (!ready) {
        throw new Error(
          "L'agent IA n'est pas prêt ou est désactivé. Vérifiez que le serveur Ollama est en cours d'exécution.",
        );
      }

      // Format chat history to send to background
      const serializedHistory = chatHistory.map(msg => {
        if ('type' in msg) {
          return {
            type: msg.type,
            content: msg.content,
          };
        }
        // Fallback if the message doesn't have a type property
        return {
          type: 'human',
          content: String(msg),
        };
      });

      // Send to background script
      const response = await chrome.runtime.sendMessage({
        type: 'CHAT_WITH_TOOLS',
        query: message,
        history: serializedHistory,
      });

      if (!response || !response.success) {
        throw new Error(response?.error || 'Erreur lors de la communication avec le background script');
      }

      return {
        response: response.data,
        toolUsed: response.toolUsed || false,
        error: response.error,
      };
    } catch (error) {
      console.error('Error in chatWithTools:', error);
      throw error;
    }
  }

  /**
   * Récupère l'état des connexions MCP
   */
  async getMcpConnectionsState(): Promise<
    Record<string, { status: 'connected' | 'error' | 'unknown'; error?: string }>
  > {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_MCP_CONNECTION_STATUS',
      });

      if (response && response.success) {
        return response.connectionState || {};
      }

      return {};
    } catch (error) {
      console.error('Erreur lors de la récupération des états de connexion MCP:', error);
      return {};
    }
  }

  /**
   * Récupère les outils MCP chargés
   */
  async getMcpTools(): Promise<McpTool[]> {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_MCP_TOOLS',
      });

      if (response && response.success) {
        return response.tools || [];
      }

      return [];
    } catch (error) {
      console.error('Erreur lors de la récupération des outils MCP:', error);
      return [];
    }
  }
}

// Export d'une instance singleton
export const aiAgent = new AIAgent();
