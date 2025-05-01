import { ChatOllama } from '@langchain/ollama';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { aiAgentStorage } from '@extension/storage';

/**
 * AI Agent service using Langchain and Ollama
 */
export class AIAgent {
  private baseUrl: string = 'http://localhost:11434';
  private selectedModel: string = 'llama3';
  private temperature: number = 0.7;
  private isEnabled: boolean = true;
  private isInitialized: boolean = false;
  private lastCheckTime: number = 0;
  private readonly CHECK_INTERVAL: number = 5000; // 5 seconds
  private availableModels: string[] = [];

  /**
   * Initializes the AI Agent with current settings
   */
  constructor() {
    this.initializeSettings();
  }

  /**
   * Asynchronously initializes settings
   */
  private async initializeSettings() {
    try {
      await this.loadSettings();
      this.isInitialized = true;

      // Check for available models on initialization
      this.refreshAvailableModels();
    } catch (error) {
      console.error('Failed to initialize AI Agent settings:', error);
    }
  }

  /**
   * Loads settings from storage
   */
  async loadSettings() {
    try {
      const settings = await aiAgentStorage.get();
      this.baseUrl = settings.baseUrl || this.baseUrl;
      this.selectedModel = settings.selectedModel || this.selectedModel;
      this.temperature = typeof settings.temperature === 'number' ? settings.temperature : this.temperature;
      this.isEnabled = typeof settings.isEnabled === 'boolean' ? settings.isEnabled : this.isEnabled;
      console.log(
        `AI Agent settings loaded: Model=${this.selectedModel}, Temperature=${this.temperature}, Enabled=${this.isEnabled}`,
      );
      return settings;
    } catch (error) {
      console.error('Error loading AI Agent settings:', error);
      throw error;
    }
  }

  /**
   * Refreshes the list of available models and checks if selected model exists
   */
  private async refreshAvailableModels() {
    try {
      const models = await this.getAvailableModels();
      this.availableModels = models.map((m: { name: string }) => m.name);

      // If current model doesn't exist, try to find a fallback model
      if (this.availableModels.length > 0 && !this.availableModels.includes(this.selectedModel)) {
        // Try to find a default model like llama3
        const defaultModels = ['llama3', 'mistral', 'gemma', 'llama2'];
        for (const model of defaultModels) {
          if (this.availableModels.includes(model)) {
            console.log(`Selected model ${this.selectedModel} not found, falling back to ${model}`);
            this.selectedModel = model;
            await aiAgentStorage.updateModel(model);
            break;
          }
        }

        // If no default models found, just pick the first available
        if (!this.availableModels.includes(this.selectedModel) && this.availableModels.length > 0) {
          console.log(`No default models found, falling back to ${this.availableModels[0]}`);
          this.selectedModel = this.availableModels[0];
          await aiAgentStorage.updateModel(this.availableModels[0]);
        }
      }
    } catch (error) {
      console.error('Error refreshing available models:', error);
    }
  }

  /**
   * Checks if the agent is ready to use
   */
  async isReady(): Promise<boolean> {
    if (!this.isEnabled) return false;

    try {
      // If not initialized yet, try to load settings
      if (!this.isInitialized) {
        await this.loadSettings();
        this.isInitialized = true;
      }

      // Rate limit checks to avoid excessive requests
      const now = Date.now();
      if (now - this.lastCheckTime < this.CHECK_INTERVAL) {
        // If we've checked recently, return cached result based on if we have models available
        return this.availableModels.length > 0;
      }

      this.lastCheckTime = now;

      // Check if Ollama server is running with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout (reduced from 3)

      try {
        const response = await fetch(`${this.baseUrl}/api/version`, {
          signal: controller.signal,
          mode: 'cors',
          headers: {
            Accept: 'application/json',
          },
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          // If server is running, refresh available models and check if selected model exists
          await this.refreshAvailableModels();

          // Server is ready if we have at least one model
          return this.availableModels.length > 0;
        }
        return false;
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('Error connecting to Ollama server:', error);
        return false;
      }
    } catch (error) {
      console.error('AI Agent error:', error);
      return false;
    }
  }

  /**
   * Gets available models from Ollama
   */
  async getAvailableModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        mode: 'cors',
        headers: {
          Accept: 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`);
      }
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Error getting available models:', error);
      return [];
    }
  }

  /**
   * Creates a simple Q&A chain
   */
  createQAChain() {
    try {
      const llm = new ChatOllama({
        baseUrl: this.baseUrl,
        model: this.selectedModel,
        temperature: this.temperature,
      });

      const prompt = ChatPromptTemplate.fromTemplate(
        `Vous êtes un assistant IA intelligent qui aide l'utilisateur. 
        Répondez à la question suivante de façon précise et utile:
        
        {question}`,
      );

      return RunnableSequence.from([prompt, llm, new StringOutputParser()]);
    } catch (error: unknown) {
      console.error('Error creating QA chain:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error('Impossible de créer la chaîne de langage: ' + errorMessage);
    }
  }

  /**
   * Ask a question to the AI
   */
  async ask(question: string): Promise<string> {
    const ready = await this.isReady();
    if (!ready) {
      throw new Error(
        "L'agent IA n'est pas prêt ou est désactivé. Vérifiez que le serveur Ollama est en cours d'exécution.",
      );
    }

    try {
      const chain = this.createQAChain();
      return await chain.invoke({ question });
    } catch (error: unknown) {
      console.error('Error asking question to AI Agent:', error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Failed to fetch')) {
        throw new Error("Impossible de se connecter au serveur Ollama. Vérifiez qu'il est bien lancé.");
      }
      throw error;
    }
  }

  /**
   * Creates a chat system with memory
   */
  createChatSystem() {
    try {
      const llm = new ChatOllama({
        baseUrl: this.baseUrl,
        model: this.selectedModel,
        temperature: this.temperature,
      });

      const prompt = ChatPromptTemplate.fromMessages([
        ['system', "Vous êtes un assistant IA intelligent et utile qui aide l'utilisateur."],
        ['human', '{input}'],
      ]);

      return prompt.pipe(llm).pipe(new StringOutputParser());
    } catch (error: unknown) {
      console.error('Error creating chat system:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error('Impossible de créer le système de chat: ' + errorMessage);
    }
  }

  /**
   * Send a message to the chat system using an alternative method
   * that works when LangChain fails due to CORS or other issues
   */
  private async directOllamaChat(message: string): Promise<string> {
    // Utiliser l'API native de l'extension Chrome pour contourner les restrictions CORS
    const self = this; // Capture this pour l'utiliser dans les callbacks

    try {
      // Création d'une requête XMLHttpRequest au lieu de fetch
      // Cette méthode permet d'éviter certaines restrictions CORS dans les extensions Chrome
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${self.baseUrl}/api/chat`, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Accept', 'application/json');

        xhr.onload = function () {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve(data.message?.content || "Désolé, je n'ai pas pu générer de réponse.");
            } catch (parseError) {
              reject(new Error("Erreur d'analyse de la réponse: " + parseError));
            }
          } else {
            let errorMessage = 'Erreur API Ollama';

            if (xhr.status === 403) {
              errorMessage = `Erreur 403: Accès interdit à l'API Ollama. Vérifiez les autorisations du serveur.`;
            } else if (xhr.status === 404) {
              errorMessage = `Le modèle "${self.selectedModel}" n'a pas été trouvé. Utilisez la commande "ollama pull ${self.selectedModel}".`;
            } else {
              errorMessage = `Erreur API Ollama (${xhr.status}): ${xhr.responseText}`;
            }

            reject(new Error(errorMessage));
          }
        };

        xhr.onerror = function () {
          reject(new Error('Erreur réseau lors de la communication avec Ollama'));
        };

        xhr.ontimeout = function () {
          reject(new Error('La requête a expiré. Vérifiez que le serveur Ollama répond correctement.'));
        };

        const payload = {
          model: self.selectedModel,
          messages: [
            {
              role: 'system',
              content: "Vous êtes un assistant IA intelligent et utile qui aide l'utilisateur.",
            },
            {
              role: 'user',
              content: message,
            },
          ],
          stream: false,
          options: {
            temperature: self.temperature,
          },
        };

        xhr.send(JSON.stringify(payload));
      });
    } catch (error) {
      console.error('Erreur XHR avec Ollama:', error);
      throw error;
    }
  }

  /**
   * Stream a chat response from Ollama
   * @param message The user message
   * @param onToken Callback that receives each token as it arrives
   * @param onError Callback for error handling
   * @param onComplete Callback when stream is complete
   */
  async streamChat(
    message: string,
    onToken: (token: string) => void,
    onError: (error: Error) => void,
    onComplete: () => void,
  ): Promise<void> {
    // Force a fresh check of server status and reload settings
    this.lastCheckTime = 0;
    try {
      // Reload settings to ensure we're using the latest model
      await this.loadSettings();

      const ready = await this.isReady();
      if (!ready) {
        if (this.availableModels.length === 0) {
          throw new Error(
            `Aucun modèle disponible dans Ollama. Veuillez installer un modèle avec la commande: ollama pull llama3`,
          );
        } else {
          throw new Error("L'agent IA n'est pas prêt. Vérifiez que le serveur Ollama est en cours d'exécution.");
        }
      }

      // Essayer l'approche XHR directe avec streaming
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.baseUrl}/api/chat`, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Accept', 'application/json');

      let buffer = '';
      let responseComplete = false;

      // Utiliser le gestionnaire d'événements onprogress pour traiter les chunks de données
      xhr.onprogress = function () {
        // Ignorer si la réponse est déjà marquée comme complète
        if (responseComplete) return;

        // Récupérer uniquement les nouveaux chunks de données
        const newData = xhr.responseText.substring(buffer.length);
        buffer = xhr.responseText;

        if (newData) {
          // Le stream de Ollama est au format JSON par ligne
          // Chaque ligne est un objet JSON avec un champ "message" qui contient le token
          const lines = newData.split('\n');

          for (const line of lines) {
            if (!line.trim()) continue;

            try {
              const data = JSON.parse(line);
              if (data.message?.content) {
                onToken(data.message.content);
              }

              // Vérifier si c'est le dernier message du stream
              if (data.done) {
                responseComplete = true;
                onComplete();
              }
            } catch (e) {
              console.warn('Impossible de parser la ligne JSON:', line, e);
            }
          }
        }
      };

      xhr.onload = function () {
        if (!responseComplete) {
          responseComplete = true;
          onComplete();
        }
      };

      xhr.onerror = function () {
        onError(new Error('Erreur réseau lors de la communication avec Ollama'));
      };

      xhr.ontimeout = function () {
        onError(new Error('La requête a expiré. Vérifiez que le serveur Ollama répond correctement.'));
      };

      const payload = {
        model: this.selectedModel,
        messages: [
          {
            role: 'system',
            content: "Vous êtes un assistant IA intelligent et utile qui aide l'utilisateur.",
          },
          {
            role: 'user',
            content: message,
          },
        ],
        stream: true, // Activer le streaming
        options: {
          temperature: this.temperature,
        },
      };

      xhr.send(JSON.stringify(payload));
    } catch (error) {
      console.error('Error streaming chat with AI Agent:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Provide better error messages
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Failed to fetch')) {
        onError(new Error("Impossible de se connecter au serveur Ollama. Vérifiez qu'il est bien lancé."));
      } else if (errorMessage.includes('404')) {
        onError(
          new Error(
            `Le modèle "${this.selectedModel}" n'a pas été trouvé. Utilisez la commande "ollama pull ${this.selectedModel}" pour le télécharger.`,
          ),
        );
      } else if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
        onError(new Error('La connexion au serveur Ollama a expiré. Vérifiez que le serveur répond correctement.'));
      } else {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  /**
   * Send a message to the chat system
   */
  async chat(message: string): Promise<string> {
    try {
      // Force a fresh check of server status
      this.lastCheckTime = 0;
      const ready = await this.isReady();
      if (!ready) {
        if (this.availableModels.length === 0) {
          throw new Error(
            `Aucun modèle disponible dans Ollama. Veuillez installer un modèle avec la commande: ollama pull llama3`,
          );
        } else {
          throw new Error("L'agent IA n'est pas prêt. Vérifiez que le serveur Ollama est en cours d'exécution.");
        }
      }

      // Essayer l'approche XHR directe qui contourne les restrictions CORS
      try {
        return await this.directOllamaChat(message);
      } catch (directApiError) {
        console.error('Direct API error, falling back to LangChain:', directApiError);

        // Si l'approche directe XHR échoue, essayer LangChain
        try {
          const chain = this.createChatSystem();
          return await chain.invoke({ input: message });
        } catch (langchainError) {
          console.error('LangChain error:', langchainError);

          // Si les deux méthodes échouent, renvoyer un message clair à l'utilisateur
          if (directApiError instanceof Error) {
            throw directApiError; // Renvoyer l'erreur originale qui contient plus d'informations
          } else {
            throw new Error('Impossible de communiquer avec Ollama.');
          }
        }
      }
    } catch (error: unknown) {
      console.error('Error chatting with AI Agent:', error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      // Provide better error messages
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Failed to fetch')) {
        throw new Error("Impossible de se connecter au serveur Ollama. Vérifiez qu'il est bien lancé.");
      } else if (errorMessage.includes('404')) {
        throw new Error(
          `Le modèle "${this.selectedModel}" n'a pas été trouvé. Utilisez la commande "ollama pull ${this.selectedModel}" pour le télécharger.`,
        );
      } else if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
        throw new Error('La connexion au serveur Ollama a expiré. Vérifiez que le serveur répond correctement.');
      }

      throw error;
    }
  }
}

// Export a singleton instance
export const aiAgent = new AIAgent();
