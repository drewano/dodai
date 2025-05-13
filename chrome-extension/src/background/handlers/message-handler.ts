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
  RagChatRequestMessage,
  RagChatResponse,
  SaveMessageAsNoteMessage,
  SaveMessageAsNoteResponse,
  GetInlineCompletionRequestMessage,
  GetInlineCompletionResponseMessage,
  GenerateDodaiCanvasArtifactRequest,
  GenerateDodaiCanvasArtifactResponse,
  ModifyDodaiCanvasArtifactRequest,
  ModifyDodaiCanvasArtifactResponse,
  GenerateDodaiCanvasArtifactStreamRequestMessage,
  ModifySelectedTextRequestMessage,
  ModifySelectedTextResponse,
  SaveArtifactAsNoteRequestMessage,
  SaveArtifactAsNoteResponseMessage,
} from '../types';
import { convertChatHistory, MessageType, StreamEventType } from '../types';
import { stateService } from '../services/state-service';
import { agentService } from '../services/agent-service';
import { mcpService } from '../services/mcp-service';
import { streamingService } from '../services/streaming-service';
import { ragService } from '../services/rag-service';
import { mcpLoadedToolsStorage, notesStorage, aiAgentStorage } from '@extension/storage';

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
    [MessageType.RAG_CHAT_REQUEST]: (message: BaseRuntimeMessage) =>
      this.handleRagChatRequest(message as RagChatRequestMessage),
    [MessageType.SAVE_MESSAGE_AS_NOTE]: (message: BaseRuntimeMessage) =>
      this.handleSaveMessageAsNote(message as SaveMessageAsNoteMessage),
    [MessageType.GET_INLINE_COMPLETION_REQUEST]: (message: BaseRuntimeMessage) =>
      this.handleGetInlineCompletion(message as GetInlineCompletionRequestMessage),
    [MessageType.GENERATE_DODAI_CANVAS_ARTIFACT_REQUEST]: (message: BaseRuntimeMessage, sender) =>
      this.handleGenerateDodaiCanvasArtifact(message as GenerateDodaiCanvasArtifactRequest, sender),
    [MessageType.MODIFY_DODAI_CANVAS_ARTIFACT_REQUEST]: (message: BaseRuntimeMessage, sender) =>
      this.handleModifyDodaiCanvasArtifact(message as ModifyDodaiCanvasArtifactRequest, sender),
    [MessageType.GENERATE_DODAI_CANVAS_ARTIFACT_STREAM_REQUEST]: (message: BaseRuntimeMessage, sender) =>
      this.handleGenerateDodaiCanvasArtifactStream(message as GenerateDodaiCanvasArtifactStreamRequestMessage, sender),
    [MessageType.MODIFY_SELECTED_TEXT_REQUEST]: (message: BaseRuntimeMessage) =>
      this.handleModifySelectedText(message as ModifySelectedTextRequestMessage),
    [MessageType.SAVE_ARTIFACT_AS_NOTE_REQUEST]: (message: BaseRuntimeMessage) =>
      this.handleSaveArtifactAsNoteRequest(message as SaveArtifactAsNoteRequestMessage),
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

    // Logs de débogage ajoutés
    logger.debug('[MessageHandler] Attempting to handle message.');
    logger.debug('[MessageHandler] Received message object:', JSON.stringify(message, null, 2));
    logger.debug('[MessageHandler] Received message type:', type);
    logger.debug('[MessageHandler] Available handler keys:', Object.keys(this.messageHandlers));
    logger.debug('[MessageHandler] Looking for handler for type:', type, 'Exists:', !!this.messageHandlers[type]);

    if (!type || !this.messageHandlers[type]) {
      logger.warn('[MessageHandler] Unhandled message. Type was:', type, '. Full message:', message);
      // logger.debug('Message non géré reçu:', message); // Ancien log, remplacé par un plus détaillé
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
   * Génère des tags pour une note à partir de son contenu via l'IA
   */
  async generateTagsWithAI(content: string, title: string, url?: string): Promise<string[]> {
    try {
      // Construit un prompt pour extraire des tags pertinents
      const prompt = `Extrais 3-5 mots-clés pertinents (tags) à partir du texte suivant et de son titre/URL. 
      Ne propose que des mots simples ou des expressions très courtes (1-3 mots maximum).
      Retourne uniquement une liste JSON de chaînes de caractères, sans commentaires ni explications.
      
      Titre: ${title}
      ${url ? `URL: ${url}` : ''}
      
      Contenu:
      ${content.substring(0, 1500)}${content.length > 1500 ? '...' : ''}`;

      // Appeler l'LLM pour obtenir les tags
      const response = await agentService.invokeLLM(prompt);

      // Tentative d'extraction du JSON depuis la réponse
      try {
        // Si la réponse contient du texte avant ou après le JSON, on essaie de l'extraire
        const jsonMatch = response.match(/\[.*?\]/s);
        if (jsonMatch) {
          const tags = JSON.parse(jsonMatch[0]);
          return Array.isArray(tags) ? tags.filter(tag => typeof tag === 'string').slice(0, 10) : [];
        }
        // Sinon, on essaie de parser directement
        const tags = JSON.parse(response);
        return Array.isArray(tags) ? tags.filter(tag => typeof tag === 'string').slice(0, 10) : [];
      } catch (parseError) {
        // Si le parsing échoue, on essaie de fallback sur une extraction basique
        logger.warn('Échec du parsing JSON des tags:', parseError);
        const tagMatches = response.match(/["']([^"']+)["']/g);
        if (tagMatches) {
          return tagMatches.map(tag => tag.replace(/["']/g, '')).slice(0, 10);
        }
        return [];
      }
    } catch (error) {
      logger.error('Erreur lors de la génération des tags avec IA:', error);
      return [];
    }
  }

  /**
   * Gestionnaire pour les requêtes d'autocomplétion inline
   */
  private async handleGetInlineCompletion(
    message: GetInlineCompletionRequestMessage,
  ): Promise<GetInlineCompletionResponseMessage> {
    logger.debug("Traitement de la requête d'autocomplétion inline", {
      currentTextLength: message.currentText.length,
      pageContentLength: message.pageContent.length,
    });

    try {
      // Vérifier si le contenu est vide
      if (!message.currentText.trim()) {
        return {
          type: MessageType.GET_INLINE_COMPLETION_RESPONSE,
          success: false,
          error: "Le texte de l'utilisateur est vide",
        };
      }

      // Demander l'autocomplétion via l'agent service
      const result = await agentService.getInlineCompletion(
        message.currentText,
        message.surroundingText,
        message.pageContent,
        message.selectedModel,
      );

      // Si une erreur est retournée
      if (result.error) {
        logger.warn("Erreur lors de la génération d'autocomplétion:", result.error);
        return {
          type: MessageType.GET_INLINE_COMPLETION_RESPONSE,
          success: false,
          error: result.error,
          model: result.model,
        };
      }

      // Si aucune complétion n'est générée
      if (!result.completion) {
        logger.debug("Aucune suggestion d'autocomplétion générée");
        return {
          type: MessageType.GET_INLINE_COMPLETION_RESPONSE,
          success: false,
          error: 'Aucune suggestion générée',
          model: result.model,
        };
      }

      logger.debug('Autocomplétion générée avec succès:', {
        completionLength: result.completion.length,
        model: result.model,
      });

      // Supprimer les points de suspension en début de complétion
      let processedCompletion = result.completion;
      if (processedCompletion.trim().startsWith('...')) {
        const originalLength = processedCompletion.length;
        processedCompletion = processedCompletion.replace(/^\s*\.\.\.+\s*/, '');
        logger.debug('Points de suspension supprimés en début de complétion:', {
          avant: originalLength,
          après: processedCompletion.length,
        });
      }

      return {
        type: MessageType.GET_INLINE_COMPLETION_RESPONSE,
        success: true,
        completion: processedCompletion,
        model: result.model,
      };
    } catch (error) {
      logger.error("Erreur inattendue lors du traitement de la requête d'autocomplétion:", error);
      return {
        type: MessageType.GET_INLINE_COMPLETION_RESPONSE,
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue lors de la génération d'autocomplétion",
      };
    }
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

      // Générer des tags à partir du résumé et des méta-informations
      const noteTitle = `Résumé de ${pageTitle}`;
      const tags = await this.generateTagsWithAI(summary, noteTitle, pageUrl);

      // Générer un ID temporaire
      const tempId = Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

      // Sauvegarder le résumé dans les notes avec les tags
      await notesStorage.addNote({
        id: tempId,
        title: noteTitle,
        content: summary,
        sourceUrl: pageUrl,
        tags: tags,
        parentId: null,
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

      // Générer des tags à partir des points clés et des méta-informations
      const noteTitle = `Points clés de ${pageTitle}`;
      const tags = await this.generateTagsWithAI(keyPoints, noteTitle, pageUrl);

      // Générer un ID temporaire
      const tempId = Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

      // Sauvegarder les points clés dans les notes avec les tags
      await notesStorage.addNote({
        id: tempId,
        title: noteTitle,
        content: keyPoints,
        sourceUrl: pageUrl,
        tags: tags,
        parentId: null,
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
      const isServerRunning = await agentService.isOllamaServerRunning();
      return { success: true, isReady, isServerRunning };
    } catch (error: unknown) {
      logger.error("Erreur lors de la vérification de l'état de l'agent:", error);
      return {
        success: false,
        isReady: false,
        isServerRunning: false,
        error: error instanceof Error ? error.message : String(error),
      };
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

      // Générer des tags à partir du résultat et des méta-informations
      const noteTitle = `${promptPreview} - ${pageTitle}`;
      const noteContent = `**Prompt:** ${message.userPrompt}\n\n**Réponse:**\n${result}`;
      const tags = await this.generateTagsWithAI(noteContent, noteTitle, pageUrl);

      // Générer un ID temporaire
      const tempId = Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

      // Sauvegarder le résultat dans les notes avec les tags
      await notesStorage.addNote({
        id: tempId,
        title: noteTitle,
        content: noteContent,
        sourceUrl: pageUrl,
        tags: tags,
        parentId: null,
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

  /**
   * Gestionnaire pour les requêtes de chat RAG avec les notes de l'utilisateur
   */
  private async handleRagChatRequest(message: RagChatRequestMessage): Promise<RagChatResponse> {
    logger.debug('Reçu RAG_CHAT_REQUEST', message.payload);
    const { message: userInput, chatHistory = [], streamHandler = false, portId, selectedModel } = message.payload;

    if (streamHandler && portId) {
      logger.debug(`[Message Handler] Mode streaming RAG demandé avec portId: ${portId}`);
      const streamingPortInfo = stateService.getStreamingPort(portId);

      if (!streamingPortInfo || !streamingPortInfo.port) {
        logger.error(`[Message Handler] Port de streaming RAG non trouvé pour portId: ${portId}`);
        return {
          success: false,
          error: `Port de streaming ${portId} non trouvé ou invalide.`,
          streaming: true,
        };
      }

      // Lancer le streaming RAG en asynchrone
      // ragService.processRagStreamRequest gère lui-même l'envoi des messages sur le port.
      ragService.processRagStreamRequest(userInput, chatHistory, streamingPortInfo.port, selectedModel).catch(error => {
        logger.error('[Message Handler] Erreur lors du lancement du streaming RAG:', error);
        // Essayer de notifier l'erreur via le port s'il existe encore
        try {
          streamingPortInfo.port.postMessage({
            type: 'STREAM_ERROR', // Consistent with StreamEventType but might need to align with RagChatStreamResponse
            error: error instanceof Error ? error.message : 'Erreur lors du lancement du streaming RAG',
          });
          streamingPortInfo.port.postMessage({ type: 'STREAM_END', success: false });
        } catch (portError) {
          logger.warn("[Message Handler] Impossible d'envoyer l'erreur RAG sur le port:", portError);
        }
      });

      return { success: true, streaming: true };
    } else {
      // Mode non-streaming pour RAG (fallback ou test)
      logger.debug('[Message Handler] Mode non-streaming RAG demandé.');
      try {
        const result = await ragService.invokeRagChain(userInput, chatHistory);
        return {
          success: !result.error,
          data: result.answer,
          sourceDocuments: result.sources,
          error: result.error,
        };
      } catch (error) {
        logger.error("[Message Handler] Erreur lors de l'appel non-stream RAG:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erreur inconnue lors du RAG non-streaming.',
        };
      }
    }
  }

  /**
   * Gestionnaire pour sauvegarder un message comme note
   */
  private async handleSaveMessageAsNote(message: SaveMessageAsNoteMessage): Promise<SaveMessageAsNoteResponse> {
    try {
      logger.debug('Traitement de la requête de sauvegarde de message comme note');

      if (!message.content || message.content.trim() === '') {
        return {
          success: false,
          error: 'Le contenu du message ne peut pas être vide.',
        };
      }

      // Générer un titre basé sur le contenu du message
      const maxTitleLength = 50;
      let title = message.content.trim().split('\n')[0]; // Première ligne du message

      // Tronquer le titre si nécessaire
      if (title.length > maxTitleLength) {
        title = title.substring(0, maxTitleLength) + '...';
      }

      // Générer des tags à partir du contenu si possible
      let tags: string[] = [];
      try {
        tags = await this.generateTagsWithAI(message.content, title, message.sourceUrl);
      } catch (error) {
        logger.warn('Échec de la génération des tags pour la note:', error);
        // Continuer sans tags si la génération échoue
      }

      // Sauvegarder le message comme note
      const noteId = await notesStorage.addNote({
        id: Date.now().toString(36) + Math.random().toString(36).substring(2, 9),
        title: `Réponse: ${title}`,
        content: message.content,
        sourceUrl: message.sourceUrl,
        tags,
        parentId: null,
      });

      return {
        success: true,
        noteId,
      };
    } catch (error) {
      logger.error('Erreur lors de la sauvegarde du message comme note:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Une erreur s'est produite lors de la sauvegarde de la note.",
      };
    }
  }

  /**
   * Gestionnaire pour la génération d'artefacts Markdown/Code pour Dodai Canvas.
   * Note: Pour un vrai streaming, il faudrait utiliser chrome.runtime.connect et gérer un port,
   * comme dans handleAiChatRequest ou handleRagChatRequest.
   * Ici, nous allons collecter la réponse complète du stream LLM et l'envoyer en une fois.
   */
  private async handleGenerateDodaiCanvasArtifact(
    message: GenerateDodaiCanvasArtifactRequest,
    sender: chrome.runtime.MessageSender,
  ): Promise<GenerateDodaiCanvasArtifactResponse> {
    const { prompt, history: chatHistoryPayload } = message.payload;
    logger.debug("[DodaiCanvas] Traitement de la requête de génération d'artefact", {
      promptLength: prompt.length,
      historyLength: chatHistoryPayload?.length || 0,
    });

    try {
      const isReady = await agentService.isAgentReady();
      if (!isReady) {
        return {
          success: false,
          error: "L'agent IA n'est pas prêt. Vérifiez les paramètres.",
        };
      }

      const history = chatHistoryPayload ? convertChatHistory(chatHistoryPayload) : [];
      const settings = await aiAgentStorage.get();
      const modelName = settings.selectedModel;

      const systemPrompt = `Tu es un assistant expert en rédaction. En te basant sur la demande suivante, génère un document Markdown complet et bien structuré.
Ta réponse DOIT être uniquement le contenu Markdown brut et directement utilisable.
N'inclus AUCUNE introduction, phrase de politesse, conclusion, explication, commentaire, ni aucun type d'encapsulation de code (comme \`\`\`markdown ... \`\`\` ou des backticks simples autour de la réponse entière).
La sortie doit commencer directement par le contenu Markdown (par exemple, un titre comme '# Mon Titre', une liste, ou du texte simple).

Si la demande est explicitement de générer du CODE SOURCE (par exemple Python, JavaScript, etc.), alors seulement tu généreras uniquement le code demandé. Dans ce cas de figure, tu peux utiliser des backticks pour délimiter des blocs de code si cela fait partie de la syntaxe standard du langage demandé ou si c'est pour imbriquer un bloc de code dans un autre format. Mais pour une demande de document MARKDOWN, la sortie doit être le Markdown pur.

Demande utilisateur: ${prompt}`;

      const llm = await agentService.createLLMInstance();
      const stream = await llm.stream([
        ...history,
        { type: 'system', content: systemPrompt },
        { type: 'human', content: prompt },
      ]);

      let fullArtifact = '';
      for await (const chunk of stream) {
        if (typeof chunk.content === 'string') {
          fullArtifact += chunk.content;
        }
      }

      if (!fullArtifact.trim()) {
        return {
          success: false,
          error: 'Aucun contenu généré par le modèle.',
          model: modelName,
        };
      }

      logger.debug('[DodaiCanvas] Artefact généré avec succès', {
        artifactLength: fullArtifact.length,
        model: modelName,
      });

      return {
        success: true,
        artifact: fullArtifact,
        model: modelName,
      };
    } catch (error) {
      logger.error("[DodaiCanvas] Erreur lors de la génération d'artefact:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue lors de la génération.',
      };
    }
  }

  /**
   * Gestionnaire pour la modification d'artefacts pour Dodai Canvas.
   */
  private async handleModifyDodaiCanvasArtifact(
    message: ModifyDodaiCanvasArtifactRequest,
    sender: chrome.runtime.MessageSender,
  ): Promise<ModifyDodaiCanvasArtifactResponse> {
    const { prompt, currentArtifact, artifactType, history: chatHistoryPayload } = message.payload;
    logger.debug("[DodaiCanvas] Traitement de la requête de modification d'artefact", {
      promptLength: prompt.length,
      currentArtifactLength: currentArtifact.length,
      artifactType,
      historyLength: chatHistoryPayload?.length || 0,
    });

    // Pour l'instant, on ne gère que la modification de texte
    if (artifactType !== 'text') {
      logger.warn("[DodaiCanvas] Type d'artefact non supporté pour la modification:", artifactType);
      return {
        success: false,
        error: `Modification non supportée pour le type d'artefact: ${artifactType}`,
      };
    }

    try {
      const isReady = await agentService.isAgentReady();
      if (!isReady) {
        return {
          success: false,
          error: "L'agent IA n'est pas prêt. Vérifiez les paramètres.",
        };
      }

      const history = chatHistoryPayload ? convertChatHistory(chatHistoryPayload) : [];
      const settings = await aiAgentStorage.get();
      const modelName = settings.selectedModel;

      // Prompt système spécifique pour la modification
      const systemPrompt = `Tu es un assistant d'édition expert. Modifie le texte Markdown suivant en suivant précisément l'instruction donnée.
Ta réponse DOIT être uniquement le texte Markdown modifié intégralement et brut.
N'inclus AUCUNE introduction, phrase de politesse, conclusion, explication, commentaire, ni aucun type d'encapsulation de code (par exemple, ne pas envelopper la réponse dans des backticks \`\`\`markdown ... \`\`\` ou des backticks simples autour de la réponse entière).
La sortie doit être directement le contenu Markdown modifié.

Texte original à modifier:
---
${currentArtifact}
---

Instruction de modification: ${prompt}`;

      const llm = await agentService.createLLMInstance();
      // On n'utilise pas l'historique du chat pour la modification, seulement le prompt système et l'instruction.
      const stream = await llm.stream([
        { type: 'system', content: systemPrompt },
        // Optionnel: On pourrait ajouter un message 'human' vide ou répétitif si l'API l'exige,
        // mais idéalement, le system prompt suffit.
        // { type: 'human', content: "Modifie le texte selon l'instruction ci-dessus." }
      ]);

      let modifiedArtifact = '';
      for await (const chunk of stream) {
        if (typeof chunk.content === 'string') {
          modifiedArtifact += chunk.content;
        }
      }

      if (!modifiedArtifact.trim()) {
        // Si le modèle ne renvoie rien, on renvoie l'original pour éviter de perdre le contenu
        logger.warn("[DodaiCanvas] Modification a retourné une chaîne vide. Retour de l'original.");
        return {
          success: true, // Considéré comme succès car on ne perd pas de données
          artifact: currentArtifact, // Renvoyer l'original
          model: modelName,
        };
        // Alternative: retourner une erreur
        // return {
        //   success: false,
        //   error: 'Aucun contenu modifié généré par le modèle.',
        //   model: modelName,
        // };
      }

      logger.debug('[DodaiCanvas] Artefact modifié avec succès', {
        modifiedArtifactLength: modifiedArtifact.length,
        model: modelName,
      });

      return {
        success: true,
        artifact: modifiedArtifact,
        model: modelName,
      };
    } catch (error) {
      logger.error("[DodaiCanvas] Erreur lors de la modification d'artefact:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue lors de la modification.',
      };
    }
  }

  /**
   * Gestionnaire pour la génération d'artefacts en streaming pour Dodai Canvas.
   */
  private async handleGenerateDodaiCanvasArtifactStream(
    message: GenerateDodaiCanvasArtifactStreamRequestMessage,
    _sender: chrome.runtime.MessageSender,
  ): Promise<{ success: boolean; streaming?: boolean; error?: string }> {
    const { prompt, history: chatHistoryPayload, portId } = message.payload;
    logger.debug('[DodaiCanvasStream] Traitement de la requête de génération en streaming', {
      promptLength: prompt.length,
      historyLength: chatHistoryPayload?.length || 0,
      portId: portId,
    });

    const streamingPortInfo = stateService.getStreamingPort(portId);

    if (!streamingPortInfo || !streamingPortInfo.port) {
      logger.error(`[DodaiCanvasStream] Port de streaming non trouvé pour portId: ${portId}`);
      return {
        success: false,
        error: `Port de streaming ${portId} non trouvé ou invalide.`,
      };
    }
    const { port } = streamingPortInfo;

    try {
      const isReady = await agentService.isAgentReady();
      if (!isReady) {
        port.postMessage({
          type: StreamEventType.STREAM_ERROR,
          error: "L'agent IA n'est pas prêt. Vérifiez les paramètres.",
        });
        port.postMessage({ type: StreamEventType.STREAM_END, success: false });
        return { success: false, error: 'Agent not ready', streaming: true };
      }

      const history = chatHistoryPayload ? convertChatHistory(chatHistoryPayload) : [];
      const settings = await aiAgentStorage.get();
      const modelName = settings.selectedModel;

      port.postMessage({ type: StreamEventType.STREAM_START, model: modelName });

      agentService
        .streamArtifactGeneration(prompt, history, port, modelName)
        .then(() => {
          logger.debug('[DodaiCanvasStream] Streaming terminé avec succès par agentService pour le port', portId);
        })
        .catch(error => {
          logger.error("[DodaiCanvasStream] Erreur lors du streaming d'artefact via agentService:", error);
          try {
            port.postMessage({
              type: StreamEventType.STREAM_ERROR,
              error: error instanceof Error ? error.message : "Erreur inconnue durant le streaming d'artefact",
            });
            port.postMessage({ type: StreamEventType.STREAM_END, success: false });
          } catch (portError) {
            logger.warn(
              "[DodaiCanvasStream] Impossible d'envoyer l'erreur sur le port après échec agentService:",
              portError,
            );
          }
        });

      return { success: true, streaming: true };
    } catch (error) {
      logger.error("[DodaiCanvasStream] Erreur majeure avant le lancement du streaming d'artefact:", error);
      try {
        port.postMessage({
          type: StreamEventType.STREAM_ERROR,
          error: error instanceof Error ? error.message : "Erreur inconnue avant le lancement du streaming d'artefact",
        });
        port.postMessage({ type: StreamEventType.STREAM_END, success: false });
      } catch (portError) {
        logger.warn("[DodaiCanvasStream] Impossible d'envoyer l'erreur sur le port après erreur majeure:", portError);
      }
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Erreur inconnue lors de la préparation du streaming d'artefact",
        streaming: true,
      };
    }
  }

  private async handleModifySelectedText(
    message: ModifySelectedTextRequestMessage,
  ): Promise<ModifySelectedTextResponse> {
    const { selectedText, userInstructions, documentTitle } = message.payload;
    logger.debug('[MessageHandler] Traitement de MODIFY_SELECTED_TEXT_REQUEST', {
      selectedTextLength: selectedText.length,
      userInstructionsLength: userInstructions.length,
      documentTitle,
    });

    try {
      const result = await agentService.modifyTextWithInstructions(
        selectedText,
        userInstructions,
        documentTitle, // Pass documentTitle as context
      );

      if (result.error) {
        return { success: false, error: result.error, model: result.model };
      }
      return { success: true, modifiedText: result.modifiedText, model: result.model };
    } catch (error) {
      logger.error('[MessageHandler] Erreur lors de la modification du texte sélectionné:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue lors de la modification du texte.',
      };
    }
  }

  /**
   * Gestionnaire pour sauvegarder un artefact Dodai Canvas comme note avec des tags générés par IA.
   */
  private async handleSaveArtifactAsNoteRequest(
    message: SaveArtifactAsNoteRequestMessage,
  ): Promise<SaveArtifactAsNoteResponseMessage> {
    const { title, content, sourceUrl } = message.payload;
    logger.debug('[MessageHandler] Traitement de SAVE_ARTIFACT_AS_NOTE_REQUEST', {
      titleLength: title.length,
      contentLength: content.length,
      sourceUrl,
    });

    if (!title.trim() || !content.trim()) {
      return {
        success: false,
        error: "Le titre et le contenu de l'artefact ne peuvent pas être vides.",
      };
    }

    try {
      const settings = await aiAgentStorage.get();
      const modelName = settings.selectedModel; // Pour potentiellement retourner quel modèle a généré les tags

      // 1. Générer les tags avec l'IA
      const tags = await this.generateTagsWithAI(content, title, sourceUrl);
      logger.debug("[MessageHandler] Tags générés pour l'artefact:", tags);

      // 2. Sauvegarder la note avec les tags
      // notesStorage.addNote s'attend à ce que l'ID soit fourni dans noteData, ou il le génère si absent.
      // Pour être cohérent avec l'ancienne logique de saveToNotes, on génère un ID ici.
      const noteId = Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

      await notesStorage.addNote({
        id: noteId,
        title: title, // Le titre est déjà préparé par le frontend
        content: content, // Le contenu est déjà formaté (Markdown ou bloc de code en Markdown)
        tags: tags,
        parentId: null, // Sauvegarder à la racine par défaut
        sourceUrl: sourceUrl, // Optionnel
      });

      return {
        success: true,
        noteId: noteId,
        model: modelName, // Informer quel modèle a été utilisé pour les tags
      };
    } catch (error) {
      logger.error("[MessageHandler] Erreur lors de la sauvegarde de l'artefact comme note:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue lors de la sauvegarde de l'artefact.",
      };
    }
  }
}

// Export d'une instance singleton
export const messageHandler = new MessageHandler();
