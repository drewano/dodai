import { ChatOllama } from '@langchain/ollama';
import { StringOutputParser } from '@langchain/core/output_parsers';
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { aiAgentStorage, mcpConfigStorage, mcpLoadedToolsStorage, McpToolInfo } from '@extension/storage';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { BaseMessage } from '@langchain/core/messages';

// Type pour l'état d'une connexion MCP
export type McpConnectionStatus = {
  connected: boolean;
  errorMessage?: string;
  lastUpdated: number;
};

// Type pour l'état de toutes les connexions MCP
export type McpConnectionsState = Record<string, McpConnectionStatus>;

// Type pour représenter un outil MCP simplifié
export type McpTool = {
  name: string;
  description: string;
  serverName?: string;
};

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

    // Subscribe to MCP config changes to notify background script
    mcpConfigStorage.subscribe(() => {
      console.log('Détection de changement de configuration MCP. Notification au background...');
      chrome.runtime
        .sendMessage({
          type: 'MCP_CONFIG_CHANGED',
        })
        .catch(error => {
          console.error('Erreur lors de la notification du changement de configuration MCP :', error);
        });
    });
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

      throw new Error("Erreur lors de la requête à l'agent IA: " + errorMessage);
    }
  }

  /**
   * Creates a chat system without tools
   */
  createChatSystem() {
    try {
      const llm = new ChatOllama({
        baseUrl: this.baseUrl,
        model: this.selectedModel,
        temperature: this.temperature,
      });

      const prompt = ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate(
          `Vous êtes un assistant IA intelligent et utile. Répondez de manière précise, pertinente et aidez l'utilisateur du mieux possible. Soyez concis mais complet.`,
        ),
        new MessagesPlaceholder('chat_history'),
        HumanMessagePromptTemplate.fromTemplate('{input}'),
      ]);

      return prompt.pipe(llm).pipe(new StringOutputParser());
    } catch (error) {
      console.error('Error creating chat system:', error);
      throw new Error(
        `Impossible de créer le système de chat: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Performs a direct chat with Ollama without using LangChain
   */
  private async directOllamaChat(message: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.selectedModel,
          messages: [
            {
              role: 'user',
              content: message,
            },
          ],
          options: {
            temperature: this.temperature,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur lors de la requête Ollama: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      return data.message?.content || 'Pas de réponse du modèle.';
    } catch (error) {
      console.error('Error in direct Ollama chat:', error);
      throw error;
    }
  }

  /**
   * Stream chat response using LangChain streaming
   */
  async streamChat(
    message: string,
    onToken: (token: string) => void,
    onError: (error: Error) => void,
    onComplete: () => void,
  ): Promise<void> {
    try {
      const ready = await this.isReady();
      if (!ready) {
        throw new Error(
          "L'agent IA n'est pas prêt ou est désactivé. Vérifiez que le serveur Ollama est en cours d'exécution.",
        );
      }

      // Try direct Ollama streaming API first
      try {
        const response = await fetch(`${this.baseUrl}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.selectedModel,
            messages: [
              {
                role: 'user',
                content: message,
              },
            ],
            options: {
              temperature: this.temperature,
            },
            stream: true,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (!response.body) {
          throw new Error('ReadableStream not supported');
        }

        // Create a reader to process the stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let receivedText = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }

            // Decode the stream chunk and parse JSON
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(Boolean);

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6); // Remove 'data: ' prefix
                if (jsonStr === '[DONE]') continue;

                try {
                  const data = JSON.parse(jsonStr);
                  if (data.message?.content) {
                    const newContent = data.message.content;
                    const token = newContent.slice(receivedText.length);
                    if (token) {
                      receivedText = newContent;
                      onToken(token);
                    }
                  }
                } catch (e) {
                  console.error('Error parsing stream JSON:', e, jsonStr);
                }
              }
            }
          }

          onComplete();
        } catch (error) {
          reader.cancel();
          console.error('Stream reading error:', error);
          throw error;
        }
      } catch (directStreamError) {
        console.error('Direct Ollama streaming failed, falling back to LangChain:', directStreamError);
        // Fallback to LangChain streaming
        const llm = new ChatOllama({
          baseUrl: this.baseUrl,
          model: this.selectedModel,
          temperature: this.temperature,
        });

        const chain = this.createChatSystem();

        const stream = await chain.stream({
          input: message,
          chat_history: [],
        });

        for await (const chunk of stream) {
          onToken(chunk);
        }

        onComplete();
      }
    } catch (error) {
      console.error('Error in streamChat:', error);
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Regular chat without tools
   */
  async chat(message: string): Promise<string> {
    try {
      const ready = await this.isReady();
      if (!ready) {
        throw new Error(
          "L'agent IA n'est pas prêt ou est désactivé. Vérifiez que le serveur Ollama est en cours d'exécution.",
        );
      }

      // Try using LangChain by default for consistency
      try {
        const chain = this.createChatSystem();
        return await chain.invoke({
          input: message,
          chat_history: [],
        });
      } catch (langchainError) {
        console.error('Error using LangChain chat, falling back to direct Ollama API:', langchainError);

        // Fallback to direct Ollama API if LangChain fails
        return await this.directOllamaChat(message);
      }
    } catch (error) {
      console.error('Error in chat:', error);

      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Failed to fetch')) {
        throw new Error("Impossible de se connecter au serveur Ollama. Vérifiez qu'il est bien lancé.");
      }

      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Returns the connection status for all MCP servers
   * This now delegates to the background script
   */
  async getMcpConnectionsState(): Promise<McpConnectionsState> {
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
   * Returns the currently loaded MCP tools
   * This now delegates to the background script
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

  /**
   * Chat with the assistant using tools when available
   * This now delegates to the background script
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

      console.log('Délégation du chat avec outils au background script...');

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
        response: response.response,
        toolUsed: response.toolUsed || false,
        error: response.error,
      };
    } catch (error) {
      console.error('Error in chatWithTools:', error);

      // Try falling back to regular chat
      try {
        console.log('Fallback vers le chat standard après erreur.');
        const response = await this.chat(message);
        return {
          response,
          toolUsed: false,
          error: error instanceof Error ? error.message : String(error),
        };
      } catch (fallbackError) {
        // If even the fallback fails, throw the original error
        throw error;
      }
    }
  }
}

// Export a singleton instance
export const aiAgent = new AIAgent();
