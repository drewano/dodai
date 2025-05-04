import { BaseMessage } from '../types';
import { ChatOllama } from '@langchain/ollama';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { aiAgentStorage } from '@extension/storage';
import logger from '../logger';
import { stateService } from './state-service';

/**
 * Service pour gérer l'agent LLM et ses paramètres
 */
export class AgentService {
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
  async invokeAgent(input: string, history: BaseMessage[] = []): Promise<string> {
    const agentExecutor = stateService.getAgentExecutor();

    if (!agentExecutor) {
      logger.warn('AgentExecutor non disponible, fallback sur appel LLM direct');
      return this.invokeLLM(input, history);
    }

    try {
      logger.debug('Invocation de AgentExecutor avec historique de', history.length, 'messages');

      const result = await agentExecutor.invoke({
        input,
        chat_history: history,
      });

      logger.info('AgentExecutor.invoke a réussi');
      return typeof result.output === 'string' ? result.output : JSON.stringify(result);
    } catch (error) {
      logger.error("Erreur lors de l'invocation de AgentExecutor:", error);
      throw error;
    }
  }
}

// Export d'une instance singleton
export const agentService = new AgentService();
