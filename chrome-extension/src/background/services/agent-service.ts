import type { BaseMessage } from '../types';
import { ChatOllama } from '@langchain/ollama';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { aiAgentStorage } from '@extension/storage';
import loggerImport from '../logger';
import { stateService } from './state-service';
import { StreamEventType } from '../types'; // For DodaiCanvas streaming

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
   * Crée une nouvelle instance du LLM Ollama
   */
  async createLLMInstance(modelOverride?: string): Promise<ChatOllama> {
    try {
      const settings = await aiAgentStorage.get();
      const modelToUse = modelOverride || settings.selectedModel;
      return new ChatOllama({
        baseUrl: settings.baseUrl,
        model: modelToUse,
        temperature: settings.temperature || 0.7,
        numCtx: settings.contextSize || 4096,
      });
    } catch (error) {
      logger.error("Erreur lors de la création de l'instance LLM:", error);
      throw error;
    }
  }

  /**
   * Crée le prompt pour l'agent
   */
  createAgentPrompt(): ChatPromptTemplate {
    return ChatPromptTemplate.fromMessages([
      [
        'system',
        "You are a helpful AI assistant. You have access to tools provided by external MCP servers. Use these tools ONLY when necessary to answer the user's query. Think step-by-step if you need to use a tool.\n\n" +
          'If page_content is provided, it contains the content of the current web page the user is viewing. ' +
          'Use this content to provide context-aware responses when the user asks about the page. ' +
          "If the user's query is related to the page content, use that information to provide a more accurate answer.",
      ],
      ['placeholder', '{chat_history}'],
      ['human', '{input}'],
      ['placeholder', '{agent_scratchpad}'],
      // Si du contenu de page est fourni, l'ajouter ici en tant que contexte
      ['placeholder', '{page_content}'],
    ]);
  }

  /**
   * Vérifie si l'agent est prêt à être utilisé
   */
  async isAgentReady(): Promise<boolean> {
    try {
      const settings = await aiAgentStorage.get();

      // Rate limit checks to avoid excessive requests
      const now = Date.now();
      if (now - this.lastCheckTime < this.CHECK_INTERVAL) {
        // Si nous avons vérifié récemment, retourner le résultat mis en cache
        return this.availableModels.length > 0 && settings.isEnabled;
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

          // Le serveur est prêt si nous avons au moins un modèle ET que l'agent est activé
          return this.availableModels.length > 0 && settings.isEnabled;
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
   * Vérifie si le serveur Ollama est en cours d'exécution, indépendamment de l'état d'activation de l'agent
   */
  async isOllamaServerRunning(): Promise<boolean> {
    try {
      const settings = await aiAgentStorage.get();

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

          // Le serveur est disponible si nous avons au moins un modèle
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
      logger.error("Erreur lors de la vérification de l'état du serveur Ollama:", error);
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
   * @param input Message de l'utilisateur
   * @param history Historique du chat
   * @param pageContent Contenu optionnel de la page web active
   */
  async invokeLLM(input: string, history: BaseMessage[] = [], pageContent?: string): Promise<string> {
    try {
      const llm = await this.createLLMInstance();
      logger.debug('Appel direct LLM - configuration chargée');

      // Préparer le message utilisateur avec le contenu de la page si disponible
      let userPrompt = input;
      if (pageContent) {
        userPrompt = `Voici le contenu de la page web que je consulte actuellement:\n\n${pageContent}\n\nMa question est: ${input}`;
      }

      const response = await llm.invoke([...history, { type: 'human', content: userPrompt }]);

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
   * Obtient une suggestion d'autocomplétion inline basée sur le contexte
   * @param currentText Texte tapé par l'utilisateur jusqu'au curseur
   * @param surroundingText Texte autour du curseur (précédent et suivant)
   * @param pageContent Contenu de la page active
   * @param selectedModel Modèle spécifique à utiliser (optionnel)
   */
  async getInlineCompletion(
    currentText: string,
    surroundingText: { preceding: string; succeeding: string },
    pageContent: string,
    selectedModel?: string,
  ): Promise<{ completion: string; model: string; error?: string }> {
    try {
      // Vérifier si le serveur Ollama est prêt
      const isReady = await this.isAgentReady();
      if (!isReady) {
        return {
          completion: '',
          model: '',
          error: "Le service d'IA n'est pas disponible. Vérifiez que le serveur Ollama est en cours d'exécution.",
        };
      }

      // Créer une instance LLM avec le modèle spécifié ou par défaut
      const llm = await this.createLLMInstance(selectedModel);
      const settings = await aiAgentStorage.get();
      const modelUsed = selectedModel || settings.selectedModel;

      // Préparer un extrait du contenu de la page (limiter la taille)
      const maxPageContentLength = 1500;
      const pageContentSnippet =
        pageContent.length > maxPageContentLength
          ? pageContent.substring(0, maxPageContentLength) + '...'
          : pageContent;

      // Construire le prompt pour l'autocomplétion
      const prompt = `Tu es un assistant d'écriture intelligent. Complète le texte de l'utilisateur.
L'utilisateur écrit dans un champ de texte sur une page web.

Contexte de la page web (contenu extrait):
---
${pageContentSnippet}
---

Contenu actuel du champ de texte:
${surroundingText.preceding}<CURSOR_POSITION>${surroundingText.succeeding}
---

Entrée de l'utilisateur jusqu'au curseur: "${currentText}"
---

Complète l'entrée de l'utilisateur avec une suggestion pertinente et concise. Ne renvoie que la suggestion, pas d'explications ni de guillemets. La suggestion doit être courte et contextuellement pertinente, idéale pour une autocomplétion.`;

      logger.debug("Envoi du prompt d'autocomplétion au LLM");

      // Appeler le LLM pour obtenir la suggestion
      const response = await llm.invoke([{ type: 'human', content: prompt }]);

      if (typeof response.content !== 'string') {
        return {
          completion: '',
          model: modelUsed,
          error: 'Format de réponse invalide du LLM',
        };
      }

      // Nettoyer la réponse: supprimer les guillemets, espaces en début/fin, et texte d'intro potentiel
      let completion = response.content.trim();

      // Supprimer les guillemets s'ils entourent complètement la réponse
      if (
        (completion.startsWith('"') && completion.endsWith('"')) ||
        (completion.startsWith("'") && completion.endsWith("'"))
      ) {
        completion = completion.substring(1, completion.length - 1);
      }

      // Supprimer les phrases d'introduction communes
      const introPatterns = [
        'Voici ma suggestion:',
        'Suggestion:',
        'Voici une suggestion:',
        'Je suggère:',
        'Complétion:',
      ];

      for (const pattern of introPatterns) {
        if (completion.startsWith(pattern)) {
          completion = completion.substring(pattern.length).trim();
          break;
        }
      }

      logger.debug(`Autocomplétion générée: "${completion}"`);

      return {
        completion,
        model: modelUsed,
      };
    } catch (error) {
      logger.error("Erreur lors de la génération d'autocomplétion:", error);
      return {
        completion: '',
        model: '',
        error:
          error instanceof Error ? error.message : "Une erreur s'est produite lors de la génération de la suggestion",
      };
    }
  }

  /**
   * Appelle l'AgentExecutor avec les outils MCP
   * @param input Message de l'utilisateur
   * @param history Historique du chat
   * @param pageContent Contenu optionnel de la page web active
   */
  async invokeAgent(
    input: string,
    history: BaseMessage[] = [],
    pageContent?: string,
  ): Promise<{ response: string; toolUsed: boolean; error?: string }> {
    const agentExecutor = stateService.getAgentExecutor();

    if (!agentExecutor) {
      logger.warn('AgentExecutor non disponible, fallback sur appel LLM direct');
      try {
        const response = await this.invokeLLM(input, history, pageContent);
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
      logger.debug('Invocation AgentExecutor avec outils MCP');
      const result = await agentExecutor.invoke({
        input,
        chat_history: history,
        page_content: pageContent || '',
      });

      const response = typeof result.output === 'string' ? result.output : JSON.stringify(result.output);
      const toolUsed = Boolean(result.intermediateSteps && result.intermediateSteps.length > 0);

      logger.debug(`Réponse de l'agent obtenue, outils utilisés: ${toolUsed}`);
      return { response, toolUsed };
    } catch (error: unknown) {
      logger.error("Erreur lors de l'appel à l'agent:", error);

      // Fallback sur appel LLM direct en cas d'erreur
      try {
        logger.info("Fallback sur appel LLM direct suite à l'erreur de l'agent");
        const response = await this.invokeLLM(input, history, pageContent);
        return {
          response,
          toolUsed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      } catch (secondError: unknown) {
        logger.error('Échec du fallback LLM:', secondError);
        return {
          response: "Désolé, je n'ai pas pu générer de réponse. Veuillez réessayer.",
          toolUsed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  }

  /**
   * Génère un artefact (Markdown/Code) en mode streaming pour Dodai Canvas.
   * Envoie les chunks via le port fourni.
   */
  async streamArtifactGeneration(
    prompt: string,
    history: BaseMessage[],
    port: chrome.runtime.Port,
    modelName: string,
  ): Promise<void> {
    logger.debug("[AgentService/DodaiCanvasStream] Démarrage de la génération d'artefact en streaming", {
      promptLength: prompt.length,
      historyLength: history.length,
    });

    try {
      const llm = await this.createLLMInstance(modelName);

      const systemPromptArtifact = `Tu es un assistant expert en rédaction. En te basant sur la demande suivante, génère un document Markdown complet et bien structuré.\\nTa réponse DOIT être uniquement le contenu Markdown brut et directement utilisable.\\nN'inclus AUCUNE introduction, phrase de politesse, conclusion, explication, commentaire, ni aucun type d'encapsulation de code (comme \\\`\\\`\\\`markdown ... \\\`\\\`\\\` ou des backticks simples autour de la réponse entière).\\nLa sortie doit commencer directement par le contenu Markdown (par exemple, un titre comme '# Mon Titre', une liste, ou du texte simple).\\n\\nSi la demande est explicitement de générer du CODE SOURCE (par exemple Python, JavaScript, etc.), alors seulement tu généreras uniquement le code demandé. Dans ce cas de figure, tu peux utiliser des backticks pour délimiter des blocs de code si cela fait partie de la syntaxe standard du langage demandé ou si c'est pour imbriquer un bloc de code dans un autre format. Mais pour une demande de document MARKDOWN, la sortie doit être le Markdown pur.\\n\\nDemande utilisateur: ${prompt}`;

      const streamIterator = await llm.stream([
        ...history,
        { type: 'system', content: systemPromptArtifact },
        { type: 'human', content: prompt },
      ]);

      let fullArtifactForLog = '';

      for await (const chunk of streamIterator) {
        if (typeof chunk.content === 'string' && chunk.content.length > 0) {
          port.postMessage({
            type: StreamEventType.STREAM_CHUNK,
            chunk: chunk.content,
          });
          fullArtifactForLog += chunk.content;
        }
      }

      logger.debug(
        "[AgentService/DodaiCanvasStream] Streaming d'artefact terminé. Longueur totale pour log:",
        fullArtifactForLog.length,
      );

      // Génération de la réponse conversationnelle après la génération de l'artefact
      if (fullArtifactForLog.trim()) {
        const systemPromptChat = `L'utilisateur a fait la demande suivante : "${prompt}".\nEn réponse, tu as généré l'artefact suivant :\n---\n${fullArtifactForLog.substring(0, 2000)}${fullArtifactForLog.length > 2000 ? '...' : ''}\n---\nFournis une réponse conversationnelle courte et pertinente à l'utilisateur, en accusant réception de sa demande et en mentionnant brièvement l'artefact généré. Ne répète pas le contenu de l'artefact. Sois concis.`;

        try {
          const chatResponseContent = await llm.invoke([
            // On pourrait inclure l'historique ici aussi si pertinent pour la réponse chat
            { type: 'system', content: systemPromptChat },
            { type: 'human', content: `J'ai bien reçu l'artefact. Que devrais-je dire à l'utilisateur ?` }, // Prompt simple pour déclencher la réponse
          ]);

          if (typeof chatResponseContent.content === 'string' && chatResponseContent.content.trim()) {
            port.postMessage({
              type: StreamEventType.ARTIFACT_CHAT_RESPONSE,
              chatResponse: chatResponseContent.content.trim(),
              model: modelName, // On peut aussi inclure le modèle ici
            });
            logger.debug('[AgentService/DodaiCanvasStream] Réponse conversationnelle générée et envoyée.');
          } else {
            logger.warn('[AgentService/DodaiCanvasStream] La réponse conversationnelle générée est vide.');
          }
        } catch (chatError) {
          logger.error(
            '[AgentService/DodaiCanvasStream] Erreur lors de la génération de la réponse conversationnelle:',
            chatError,
          );
          // Ne pas bloquer la fin du stream principal pour ça, mais logger l'erreur.
        }
      }

      port.postMessage({ type: StreamEventType.STREAM_END, success: true, model: modelName });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue pendant le streaming d'artefact";
      logger.error("[AgentService/DodaiCanvasStream] Erreur pendant le streaming d'artefact:", error);
      try {
        port.postMessage({
          type: StreamEventType.STREAM_ERROR,
          error: errorMessage,
        });
        port.postMessage({ type: StreamEventType.STREAM_END, success: false, model: modelName });
      } catch (portError) {
        logger.warn(
          "[AgentService/DodaiCanvasStream] Impossible d'envoyer l'erreur sur le port après échec interne:",
          portError,
        );
      }
    }
  }

  // New method for modifying selected text
  async modifyTextWithInstructions(
    selectedText: string,
    userInstructions: string,
    documentContextTitle?: string, // Optional context from the document
  ): Promise<{ modifiedText?: string; model?: string; error?: string }> {
    logger.debug('[AgentService] Demande de modification de texte', {
      selectedTextLength: selectedText.length,
      userInstructionsLength: userInstructions.length,
      documentContextTitle,
    });

    if (!selectedText.trim() || !userInstructions.trim()) {
      return { error: 'Selected text and user instructions cannot be empty.' };
    }

    try {
      const isReady = await this.isAgentReady();
      if (!isReady) {
        return { error: "L'agent IA n'est pas prêt. Vérifiez les paramètres." };
      }

      const settings = await aiAgentStorage.get();
      const modelName = settings.selectedModel;
      const llm = await this.createLLMInstance(modelName);

      const systemPrompt = `You are an AI assistant that modifies text based on user instructions. \nONLY output the modified text. Do not add any extra explanations, introductions, or pleasantries. \nDo not wrap the output in markdown code blocks unless the instruction explicitly asks for code and the original text is also code.`;

      let userPromptContent = `Original text:\\n\`\`\`\\n${selectedText}\\n\`\`\`\\n\\nInstructions:\\n${userInstructions}\\n\\nModified text:`;
      if (documentContextTitle) {
        userPromptContent = `Document Title (for context): ${documentContextTitle}\\n\\n${userPromptContent}`;
      }

      // For this task, we don't need chat history, just the direct instruction on the text.
      const response = await llm.invoke([
        { type: 'system', content: systemPrompt },
        { type: 'human', content: userPromptContent },
      ]);

      const modifiedText = typeof response.content === 'string' ? response.content.trim() : '';

      if (!modifiedText) {
        logger.warn('[AgentService] La modification de texte a retourné une chaîne vide.');
        // It might be desirable to return the original text or a specific error here.
        // For now, returning an error that no modification was made.
        return { error: 'The model did not return any modified text.', model: modelName };
      }

      logger.debug('[AgentService] Texte modifié avec succès', {
        modifiedTextLength: modifiedText.length,
        model: modelName,
      });
      return { modifiedText, model: modelName };
    } catch (error) {
      logger.error('[AgentService] Erreur lors de la modification du texte:', error);
      return {
        error: error instanceof Error ? error.message : 'Erreur inconnue lors de la modification du texte.',
      };
    }
  }
}

// Export d'une instance singleton
export const agentService = new AgentService();
