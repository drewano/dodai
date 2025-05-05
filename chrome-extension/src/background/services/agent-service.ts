import type { BaseMessage } from '../types';
import { ChatOllama } from '@langchain/ollama';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { aiAgentStorage } from '@extension/storage';
import loggerImport from '../logger';
import { stateService } from './state-service';

// Use renamed import
const logger = loggerImport;

/**
 * Service pour gérer l'agent LLM et ses paramètres
 */
export class AgentService {
  private lastCheckTime: number = 0;
  private readonly CHECK_INTERVAL: number = 5000; // 5 seconds
  private availableModels: { name: string; id: string; modified_at?: string }[] = [];

  /**
   * Crée une instance de ChatOllama à partir des paramètres stockés
   */
  async createLLMInstance(): Promise<ChatOllama> {
    const settings = await aiAgentStorage.get();
    return new ChatOllama({
      baseUrl: settings.baseUrl || 'http://localhost:11434',
      model: settings.selectedModel || 'llama3',
      temperature: settings.temperature || 0.7,
    });
  }

  /**
   * Crée le prompt pour l'agent
   */
  createAgentPrompt(): ChatPromptTemplate {
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

  /**
   * Vérifie si l'agent est prêt à être utilisé
   */
  async isAgentReady(): Promise<boolean> {
    try {
      const settings = await aiAgentStorage.get();

      // Si l'agent est désactivé dans les paramètres
      if (!settings.isEnabled) {
        logger.info('Agent IA désactivé dans les paramètres');
        return false;
      }

      // Rate limit checks to avoid excessive requests
      const now = Date.now();
      if (now - this.lastCheckTime < this.CHECK_INTERVAL) {
        // Si nous avons vérifié récemment, retourner le résultat mis en cache
        return this.availableModels.length > 0;
      }

      this.lastCheckTime = now;

      // Vérifie si le serveur Ollama est en cours d'exécution
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      try {
        const response = await fetch(`${settings.baseUrl}/api/version`, {
          signal: controller.signal,
          mode: 'cors',
          headers: {
            Accept: 'application/json',
          },
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          // Si le serveur est en cours d'exécution, actualiser les modèles disponibles
          await this.refreshAvailableModels(settings.baseUrl);

          // Le serveur est prêt si nous avons au moins un modèle
          return this.availableModels.length > 0;
        }

        logger.warn('Serveur Ollama non disponible');
        return false;
      } catch (error) {
        clearTimeout(timeoutId);
        logger.error('Erreur de connexion au serveur Ollama:', error);
        return false;
      }
    } catch (error) {
      logger.error("Erreur lors de la vérification de l'état de l'agent:", error);
      return false;
    }
  }

  /**
   * Récupère les modèles disponibles à partir d'Ollama
   */
  async getAvailableModels(baseUrl?: string): Promise<{ name: string; id: string; modified_at?: string }[]> {
    try {
      const settings = await aiAgentStorage.get();
      const url = baseUrl || settings.baseUrl;

      const response = await fetch(`${url}/api/tags`, {
        mode: 'cors',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Échec de la récupération des modèles: ${response.statusText}`);
      }

      const data = await response.json();
      return data.models || [];
    } catch (error) {
      logger.error('Erreur lors de la récupération des modèles disponibles:', error);
      return [];
    }
  }

  /**
   * Rafraîchit la liste des modèles disponibles et vérifie si le modèle sélectionné existe
   */
  private async refreshAvailableModels(baseUrl?: string): Promise<void> {
    try {
      const settings = await aiAgentStorage.get();
      const models = await this.getAvailableModels(baseUrl);
      this.availableModels = models;

      // Si le modèle actuel n'existe pas, essayer de trouver un modèle de secours
      if (this.availableModels.length > 0 && !this.availableModels.some(m => m.name === settings.selectedModel)) {
        // Essayer de trouver un modèle par défaut comme llama3
        const defaultModels = ['llama3', 'mistral', 'gemma', 'llama2'];

        for (const model of defaultModels) {
          if (this.availableModels.some(m => m.name === model)) {
            logger.info(`Modèle sélectionné ${settings.selectedModel} non trouvé, repli sur ${model}`);
            await aiAgentStorage.updateModel(model);
            break;
          }
        }

        // Si aucun modèle par défaut n'est trouvé, prendre simplement le premier disponible
        if (!this.availableModels.some(m => m.name === settings.selectedModel) && this.availableModels.length > 0) {
          logger.info(`Aucun modèle par défaut trouvé, repli sur ${this.availableModels[0].name}`);
          await aiAgentStorage.updateModel(this.availableModels[0].name);
        }
      }
    } catch (error) {
      logger.error('Erreur lors du rafraîchissement des modèles disponibles:', error);
    }
  }

  /**
   * Initialise ou réinitialise l'AgentExecutor
   */
  async initializeAgent(): Promise<boolean> {
    try {
      const tools = stateService.getLoadedTools();

      // Si aucun outil n'est disponible, on ne peut pas créer l'agent
      if (tools.length === 0) {
        logger.info('Aucun outil MCP chargé, AgentExecutor non initialisé.');
        stateService.setAgentExecutor(null);
        return false;
      }

      logger.info('Initialisation de AgentExecutor...');

      const llm = await this.createLLMInstance();
      const prompt = this.createAgentPrompt();

      const agent = await createToolCallingAgent({
        llm,
        tools,
        prompt,
      });

      const executor = new AgentExecutor({
        agent,
        tools,
        verbose: false, // Désactivé pour réduire le bruit dans les logs
      });

      stateService.setAgentExecutor(executor);
      logger.info('AgentExecutor initialisé avec succès.');
      return true;
    } catch (error) {
      logger.error('Erreur lors de la création de AgentExecutor:', error);
      stateService.setAgentExecutor(null);
      return false;
    }
  }

  /**
   * Appelle directement le LLM sans outils (fallback)
   */
  async invokeLLM(input: string, history: BaseMessage[] = []): Promise<string> {
    try {
      const llm = await this.createLLMInstance();
      logger.debug('Appel direct LLM - configuration chargée');

      const response = await llm.invoke([...history, { type: 'human', content: input }]);

      if (typeof response.content === 'string') {
        return response.content;
      } else {
        logger.warn('Réponse LLM non textuelle:', response);
        return "Désolé, je n'ai pas pu générer une réponse valide.";
      }
    } catch (error) {
      logger.error("Erreur lors de l'appel direct au LLM:", error);
      throw new Error("Échec de l'appel au modèle de langage");
    }
  }

  /**
   * Appelle l'AgentExecutor avec les outils MCP
   */
  async invokeAgent(
    input: string,
    history: BaseMessage[] = [],
  ): Promise<{ response: string; toolUsed: boolean; error?: string }> {
    const agentExecutor = stateService.getAgentExecutor();

    if (!agentExecutor) {
      logger.warn('AgentExecutor non disponible, fallback sur appel LLM direct');
      try {
        const response = await this.invokeLLM(input, history);
        return { response, toolUsed: false };
      } catch (error: unknown) {
        return {
          response: "Désolé, je n'ai pas pu générer de réponse. Veuillez réessayer.",
          toolUsed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    try {
      logger.debug('Invocation de AgentExecutor avec historique de', history.length, 'messages');

      const result = await agentExecutor.invoke({
        input,
        chat_history: history,
      });

      logger.info('AgentExecutor.invoke a réussi');

      // Détecter si des outils ont été utilisés
      const toolUsed = result.intermediateSteps && result.intermediateSteps.length > 0;

      return {
        response: typeof result.output === 'string' ? result.output : JSON.stringify(result),
        toolUsed,
      };
    } catch (error: unknown) {
      logger.error("Erreur lors de l'invocation de AgentExecutor:", error);

      // Tenter de faire un fallback sur l'appel LLM direct
      try {
        logger.info('Tentative de fallback sur invokeLLM après erreur');
        const response = await this.invokeLLM(input, history);
        return {
          response,
          toolUsed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      } catch {
        // Si même le fallback échoue, retourner une erreur plus générique
        return {
          response: 'Désolé, une erreur est survenue lors du traitement de votre demande.',
          toolUsed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  }
}

// Export d'une instance singleton
export const agentService = new AgentService();
