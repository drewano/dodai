import type { BaseMessage } from '../types';
import { StreamEventType } from '../types';
import { logger } from '../logger';
import { stateService } from './state-service';
import { agentService } from './agent-service';
import { aiAgentStorage } from '@extension/storage';

/**
 * Interface pour représenter un chunk de streaming de l'agent
 */
interface AgentStreamingChunk {
  output?: string;
  generations?: Array<
    Array<{
      text?: string;
      message?: {
        content?: string;
      };
    }>
  >;
  tokens?: string;
  steps?: Array<{
    action?: {
      tool: string;
      toolInput: Record<string, unknown>;
    };
    observation?: string;
  }>;
}

/**
 * Service pour gérer le streaming des réponses LLM
 */
export class StreamingService {
  /**
   * Gère un port de connexion entrant pour le streaming.
   * @param port Le port de connexion à gérer
   */
  handleStreamingConnection(port: chrome.runtime.Port): void {
    if (
      port.name.startsWith('ai_streaming_') ||
      port.name.startsWith('rag_streaming_') ||
      port.name.startsWith('dodai_canvas_artifact_stream_')
    ) {
      const portId = port.name;
      logger.debug(`Nouvelle connexion de streaming établie: ${portId}`);

      // Stocker le port pour référence future
      stateService.addStreamingPort(portId, port);

      // Configurer la déconnexion
      port.onDisconnect.addListener(() => {
        logger.debug(`Port de streaming déconnecté: ${portId}`);
        stateService.removeStreamingPort(portId);
      });

      // Gérer les messages de contrôle du port (demandes, annulations, etc.)
      port.onMessage.addListener(message => {
        if (message.type === StreamEventType.CANCEL_STREAMING) {
          logger.debug(`Annulation de streaming reçue: ${portId}`);
          // Logique d'annulation si nécessaire
        }
      });
    }
  }

  /**
   * Traite un chunk de streaming de l'agent et le prépare pour l'envoi à l'UI
   * @param chunk Le chunk à traiter
   * @param fullTrace Référence au trace log à mettre à jour
   * @returns Le contenu formaté à envoyer à l'UI
   */
  processAgentStreamingChunk(
    chunk: AgentStreamingChunk,
    fullTrace: string,
  ): { chunkToSend: string; updatedTrace: string } {
    let chunkToSend = '';
    let traceUpdate = '';

    // 1. Cas principal: output direct (contenu final ou partiel)
    if (chunk.output !== undefined && typeof chunk.output === 'string') {
      chunkToSend = chunk.output;
      traceUpdate = `OUTPUT: ${chunkToSend.substring(0, 100)}...\n`;
    }
    // 2. Cas des générations directes
    else if (
      chunk.generations &&
      Array.isArray(chunk.generations) &&
      chunk.generations.length > 0 &&
      Array.isArray(chunk.generations[0]) &&
      chunk.generations[0].length > 0
    ) {
      const gen = chunk.generations[0][0];
      if (gen && (typeof gen.text === 'string' || typeof gen.message?.content === 'string')) {
        chunkToSend = gen.text || gen.message?.content || '';
        traceUpdate = `GENERATIONS: ${chunkToSend.substring(0, 100)}...\n`;
      }
    }
    // 3. Cas des tokens de streaming
    else if (chunk.tokens && typeof chunk.tokens === 'string') {
      chunkToSend = chunk.tokens;
      traceUpdate = `TOKENS: ${chunkToSend.substring(0, 100)}...\n`;
    }
    // 4. Cas des informations sur les outils
    else if (chunk.steps && Array.isArray(chunk.steps) && chunk.steps.length > 0) {
      const latestStep = chunk.steps[chunk.steps.length - 1];

      if (latestStep?.action) {
        chunkToSend = `<think>Utilisation de l'outil: ${latestStep.action.tool}\nParams: ${JSON.stringify(latestStep.action.toolInput)}</think>`;
        traceUpdate = `TOOL ACTION: ${chunkToSend.substring(0, 100)}...\n`;
      } else if (latestStep?.observation) {
        chunkToSend = `<think>Résultat de l'outil: ${latestStep.observation.substring(0, 300)}${latestStep.observation.length > 300 ? '...' : ''}</think>`;
        traceUpdate = `TOOL OBSERVATION: ${chunkToSend.substring(0, 100)}...\n`;
      }
    }

    return {
      chunkToSend,
      updatedTrace: fullTrace + traceUpdate,
    };
  }

  /**
   * Exécute un appel d'agent avec streaming, envoie les chunks au port de streaming.
   * @param input Message de l'utilisateur
   * @param history Historique du chat
   * @param portId Identifiant du port de streaming
   * @param useAgent Si true, utilise AgentExecutor. Sinon appel direct au LLM.
   * @param pageContent Contenu optionnel de la page web active
   */
  async executeStreamingAgentOrLLM(
    input: string,
    history: BaseMessage[],
    portId: string,
    useAgent: boolean = true,
    pageContent?: string,
  ): Promise<void> {
    const streamingPortData = stateService.getStreamingPort(portId);
    if (!streamingPortData) {
      logger.error(`Port de streaming non trouvé: ${portId}`);
      return;
    }

    const { port } = streamingPortData;

    try {
      // Vérifier d'abord si l'agent est prêt
      const ready = await agentService.isAgentReady();
      if (!ready) {
        port.postMessage({
          type: StreamEventType.STREAM_ERROR,
          error: "L'agent IA n'est pas prêt ou est désactivé. Vérifiez que le serveur Ollama est en cours d'exécution.",
        });
        port.postMessage({ type: StreamEventType.STREAM_END, success: false });
        return;
      }

      // Récupérer les paramètres de l'agent
      const settings = await aiAgentStorage.get();
      const modelName = settings.selectedModel;

      // Notifier le début du streaming avec le nom du modèle
      port.postMessage({ type: StreamEventType.STREAM_START, model: modelName });

      // Récupérer l'instance LLM
      const llm = await agentService.createLLMInstance();

      if (useAgent && stateService.getAgentExecutor()) {
        // Utiliser l'AgentExecutor avec streaming
        logger.info('Démarrage du streaming via AgentExecutor...');

        const agentExecutor = stateService.getAgentExecutor()!;
        const streamIterator = await agentExecutor.stream({
          input: input,
          chat_history: history,
          page_content: pageContent || '',
        });

        // Pour le débogage et l'analyse
        let fullTrace = '';

        for await (const chunk of streamIterator) {
          // Pour le débogage
          const chunkStr = JSON.stringify(chunk);
          logger.debug(
            `Chunk reçu (${chunkStr.length} chars):`,
            chunkStr.length > 200 ? chunkStr.substring(0, 200) + '...' : chunkStr,
          );

          fullTrace += `\nCHUNK TYPE: ${Object.keys(chunk).join(', ')}\n`;

          // Traiter le chunk et mettre à jour la trace
          const { chunkToSend, updatedTrace } = this.processAgentStreamingChunk(chunk, fullTrace);
          fullTrace = updatedTrace;

          // Envoyer le chunk s'il y a du contenu
          if (chunkToSend) {
            port.postMessage({
              type: StreamEventType.STREAM_CHUNK,
              chunk: chunkToSend,
            });
          }
        }

        // Imprimer la trace pour l'analyse après la fin du streaming
        logger.debug('Trace complète du streaming:', fullTrace);
      } else {
        // Fallback: Appel direct au LLM avec streaming
        logger.info('Fallback: Démarrage du streaming via LLM direct...');

        // Préparer le prompt avec le contenu de la page si disponible
        let userPrompt = input;
        if (pageContent) {
          userPrompt = `Voici le contenu de la page web que je consulte actuellement:\n\n${pageContent}\n\nMa question est: ${input}`;
        }

        // Nouveau stream avec l'historique complet + le message utilisateur
        const streamIterator = await llm.stream([...history, { type: 'human', content: userPrompt }]);

        for await (const chunk of streamIterator) {
          if (typeof chunk.content === 'string') {
            port.postMessage({
              type: StreamEventType.STREAM_CHUNK,
              chunk: chunk.content,
            });
          }
        }
      }

      // Notifier la fin du streaming avec le nom du modèle
      port.postMessage({ type: StreamEventType.STREAM_END, success: true, model: modelName });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue pendant le streaming';
      logger.error('Erreur pendant le streaming:', error);

      // Envoyer l'erreur au client
      port.postMessage({
        type: StreamEventType.STREAM_ERROR,
        error: errorMessage,
      });

      // Notifier la fin (avec erreur)
      port.postMessage({ type: StreamEventType.STREAM_END, success: false });
    }
  }
}

// Export d'une instance singleton
export const streamingService = new StreamingService();
