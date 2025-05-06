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
  SummarizePageMessage,
  SummarizePageResponse,
  ListKeyPointsMessage,
  ListKeyPointsResponse,
  CustomPagePromptMessage,
  CustomPagePromptResponse,
} from '../types';
import { convertChatHistory, MessageType } from '../types';
import { stateService } from '../services/state-service';
import { agentService } from '../services/agent-service';
import { mcpService } from '../services/mcp-service';
import { streamingService } from '../services/streaming-service';
import { mcpLoadedToolsStorage, notesStorage } from '@extension/storage';

// Désactiver la vérification des variables non utilisées qui commencent par '_'
/* eslint-disable @typescript-eslint/no-unused-vars */

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
    [MessageType.SUMMARIZE_PAGE_REQUEST]: (message: BaseRuntimeMessage) =>
      this.handleSummarizePage(message as SummarizePageMessage),
    [MessageType.LIST_KEY_POINTS_REQUEST]: (message: BaseRuntimeMessage) =>
      this.handleListKeyPoints(message as ListKeyPointsMessage),
    [MessageType.CUSTOM_PAGE_PROMPT_REQUEST]: (message: BaseRuntimeMessage) =>
      this.handleCustomPagePrompt(message as CustomPagePromptMessage),
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
   * Gestionnaire pour la requête de résumé de page
   */
  private async handleSummarizePage(message: SummarizePageMessage): Promise<SummarizePageResponse> {
    try {
      logger.debug('Traitement de la requête de résumé de page');

      // Récupérer le contenu de la page active
      const pageContent = await this.fetchCurrentPageContent();

      if (!pageContent) {
        return {
          success: false,
          error: 'Impossible de récupérer le contenu de la page. Assurez-vous que la page est accessible.',
        };
      }

      // Extraire le titre et l'URL de la page depuis le contenu formaté
      const titleMatch = pageContent.match(/\[Titre de la page: (.*?)\]/);
      const urlMatch = pageContent.match(/\[URL: (.*?)\]/);

      const pageTitle = titleMatch ? titleMatch[1] : 'Page web';
      const pageUrl = urlMatch ? urlMatch[1] : '';

      // Construire le prompt pour l'LLM
      const prompt = `Fais un résumé concis du texte suivant : \n\n${pageContent}`;

      // Appeler l'LLM pour obtenir le résumé
      const summary = await agentService.invokeLLM(prompt);

      if (!summary) {
        return {
          success: false,
          error: 'Impossible de générer un résumé pour cette page.',
        };
      }

      // Sauvegarder le résumé dans les notes
      const noteTitle = `Résumé de ${pageTitle}`;
      await notesStorage.addNote({
        title: noteTitle,
        content: summary,
        sourceUrl: pageUrl,
      });

      return {
        success: true,
        summary,
      };
    } catch (error) {
      logger.error('Erreur lors du résumé de la page:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Une erreur s'est produite lors du résumé de la page.",
      };
    }
  }

  /**
   * Gestionnaire pour la requête de liste des points clés
   */
  private async handleListKeyPoints(message: ListKeyPointsMessage): Promise<ListKeyPointsResponse> {
    try {
      logger.debug('Traitement de la requête de liste des points clés');

      // Récupérer le contenu de la page active
      const pageContent = await this.fetchCurrentPageContent();

      if (!pageContent) {
        return {
          success: false,
          error: 'Impossible de récupérer le contenu de la page. Assurez-vous que la page est accessible.',
        };
      }

      // Extraire le titre et l'URL de la page depuis le contenu formaté
      const titleMatch = pageContent.match(/\[Titre de la page: (.*?)\]/);
      const urlMatch = pageContent.match(/\[URL: (.*?)\]/);

      const pageTitle = titleMatch ? titleMatch[1] : 'Page web';
      const pageUrl = urlMatch ? urlMatch[1] : '';

      // Construire le prompt pour l'LLM
      const prompt = `Liste les points clés importants du texte suivant sous forme de puces (bullet points) : \n\n${pageContent}`;

      // Appeler l'LLM pour obtenir les points clés
      const keyPoints = await agentService.invokeLLM(prompt);

      if (!keyPoints) {
        return {
          success: false,
          error: 'Impossible de générer la liste des points clés pour cette page.',
        };
      }

      // Sauvegarder les points clés dans les notes
      const noteTitle = `Points clés de ${pageTitle}`;
      await notesStorage.addNote({
        title: noteTitle,
        content: keyPoints,
        sourceUrl: pageUrl,
      });

      return {
        success: true,
        keyPoints,
      };
    } catch (error) {
      logger.error('Erreur lors de la génération des points clés:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Une erreur s'est produite lors de l'extraction des points clés.",
      };
    }
  }

  /**
   * Gestionnaire pour vérifier si l'agent est prêt
   */
  private async handleCheckAgentStatus(_message: BaseRuntimeMessage): Promise<AgentStatusResponse> {
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
    const {
      message: userInput,
      chatHistory = [],
      streamHandler = false,
      portId,
      pageContent: providedPageContent,
    } = message.payload;

    // Si streaming demandé et un portId fourni
    if (streamHandler && portId) {
      logger.debug(`Mode streaming demandé avec portId: ${portId}`);

      // Convertir l'historique du chat
      const history = convertChatHistory(chatHistory);

      // Récupérer le contenu de la page active si non fourni
      let pageContent = providedPageContent;
      if (!pageContent) {
        try {
          pageContent = await this.fetchCurrentPageContent();
          logger.debug(
            'Contenu de la page récupéré pour le streaming:',
            pageContent ? `${pageContent.substring(0, 100)}...` : 'Aucun',
          );
        } catch (error) {
          logger.warn('Erreur lors de la récupération du contenu de la page pour le streaming:', error);
        }
      }

      // Lancer le streaming en asynchrone
      streamingService
        .executeStreamingAgentOrLLM(userInput, history, portId, stateService.isReady(), pageContent)
        .catch(error => {
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

      // Récupérer le contenu de la page active si non fourni
      let pageContent = providedPageContent;
      if (!pageContent) {
        try {
          pageContent = await this.fetchCurrentPageContent();
          logger.debug('Contenu de la page récupéré:', pageContent ? `${pageContent.substring(0, 100)}...` : 'Aucun');
        } catch (error) {
          logger.warn('Erreur lors de la récupération du contenu de la page:', error);
        }
      }

      // Utiliser l'agent ou fallback au LLM direct selon l'état
      if (stateService.isReady()) {
        const result = await agentService.invokeAgent(userInput, history, pageContent);
        return {
          success: true,
          data: result.response,
          toolUsed: result.toolUsed,
          error: result.error,
        };
      } else {
        const output = await agentService.invokeLLM(userInput, history, pageContent);
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
   * Récupère le contenu de la page active dans l'onglet actuel
   */
  private async fetchCurrentPageContent(): Promise<string | undefined> {
    try {
      // Récupérer l'onglet actif
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs || tabs.length === 0 || !tabs[0].id) {
        logger.warn('Aucun onglet actif trouvé');
        return undefined;
      }

      const tabId = tabs[0].id;

      // Vérifier si on peut exécuter du script sur cet onglet
      if (
        !tabs[0].url ||
        tabs[0].url.startsWith('chrome://') ||
        tabs[0].url.startsWith('edge://') ||
        tabs[0].url.startsWith('brave://') ||
        tabs[0].url.startsWith('about:')
      ) {
        logger.warn(`Impossible d'exécuter du script sur cet onglet: ${tabs[0].url}`);
        return undefined;
      }

      // Injecter et exécuter le script pour récupérer le contenu
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          // Récupérer le texte visible de la page
          const title = document.title || '';
          const url = window.location.href || '';
          const bodyText = document.body ? document.body.innerText : '';

          // Limiter la taille du contenu (50000 caractères max)
          const maxLength = 50000;
          const trimmedText =
            bodyText.length > maxLength ? bodyText.substring(0, maxLength) + '... [contenu tronqué]' : bodyText;

          return {
            title,
            url,
            content: trimmedText,
          };
        },
      });

      if (!results || results.length === 0 || !results[0].result) {
        logger.warn('Aucun résultat retourné par le script injecté');
        return undefined;
      }

      const { title, url, content } = results[0].result;

      // Formater le contenu avec le titre et l'URL
      return `[Titre de la page: ${title}]\n[URL: ${url}]\n\n${content}`;
    } catch (error) {
      logger.error('Erreur lors de la récupération du contenu de la page:', error);
      return undefined;
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

      // Récupérer le contenu de la page active
      let pageContent: string | undefined;
      try {
        pageContent = await this.fetchCurrentPageContent();
        logger.debug(
          'Contenu de la page récupéré pour CHAT_WITH_TOOLS:',
          pageContent ? `${pageContent.substring(0, 100)}...` : 'Aucun',
        );
      } catch (error) {
        logger.warn('Erreur lors de la récupération du contenu de la page pour CHAT_WITH_TOOLS:', error);
      }

      // Convertir l'historique du chat
      const history = convertChatHistory(message.history || []);

      // Appeler l'agent avec les outils
      const result = await agentService.invokeAgent(message.query, history, pageContent);

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
  private async handleGetMcpTools(_message: BaseRuntimeMessage): Promise<McpToolsResponse> {
    try {
      const tools = await mcpLoadedToolsStorage.get();
      return { success: true, tools };
    } catch (error: unknown) {
      logger.error('Erreur lors de la récupération des outils MCP:', error);
      return { success: false, tools: [], error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Gestionnaire pour obtenir l'état des connexions MCP
   */
  private async handleGetMcpConnectionStatus(_message: BaseRuntimeMessage): Promise<McpConnectionStatusResponse> {
    return {
      success: true,
      connectionState: stateService.getMcpConnectionState(),
    };
  }

  /**
   * Gestionnaire pour les changements de configuration MCP
   */
  private async handleMcpConfigChanged(_message: BaseRuntimeMessage): Promise<{ success: boolean; error?: string }> {
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

  /**
   * Gestionnaire pour la requête de prompt personnalisé
   */
  private async handleCustomPagePrompt(message: CustomPagePromptMessage): Promise<CustomPagePromptResponse> {
    try {
      logger.debug('Traitement de la requête de prompt personnalisé', { userPrompt: message.userPrompt });

      // Vérifier que le prompt n'est pas vide
      if (!message.userPrompt || message.userPrompt.trim().length === 0) {
        return {
          success: false,
          error: 'Le prompt ne peut pas être vide.',
        };
      }

      // Récupérer le contenu de la page active
      const pageContent = await this.fetchCurrentPageContent();

      if (!pageContent) {
        return {
          success: false,
          error: 'Impossible de récupérer le contenu de la page. Assurez-vous que la page est accessible.',
        };
      }

      // Extraire le titre et l'URL de la page depuis le contenu formaté
      const titleMatch = pageContent.match(/\[Titre de la page: (.*?)\]/);
      const urlMatch = pageContent.match(/\[URL: (.*?)\]/);

      const pageTitle = titleMatch ? titleMatch[1] : 'Page web';
      const pageUrl = urlMatch ? urlMatch[1] : '';

      // Construire le prompt combiné pour l'LLM
      const prompt = `En te basant sur le contenu de la page web suivant : \n\n${pageContent}\n\nRéponds à la question/instruction suivante : \n\n${message.userPrompt}`;

      // Appeler l'LLM pour obtenir le résultat
      const result = await agentService.invokeLLM(prompt);

      if (!result) {
        return {
          success: false,
          error: 'Impossible de générer une réponse pour ce prompt.',
        };
      }

      // Créer un titre à partir du prompt utilisateur (tronqué si nécessaire)
      const maxTitleLength = 50;
      const promptPreview =
        message.userPrompt.length > maxTitleLength
          ? `${message.userPrompt.substring(0, maxTitleLength)}...`
          : message.userPrompt;

      // Sauvegarder le résultat dans les notes
      const noteTitle = `${promptPreview} - ${pageTitle}`;
      await notesStorage.addNote({
        title: noteTitle,
        content: `**Prompt:** ${message.userPrompt}\n\n**Réponse:**\n${result}`,
        sourceUrl: pageUrl,
      });

      return {
        success: true,
        result,
      };
    } catch (error) {
      logger.error('Erreur lors du traitement du prompt personnalisé:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Une erreur s'est produite lors du traitement du prompt.",
      };
    }
  }
}

// Export d'une instance singleton
export const messageHandler = new MessageHandler();
