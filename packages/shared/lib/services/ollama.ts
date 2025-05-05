import { ChatOllama } from '@langchain/ollama';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';

export type OllamaModelType = {
  id: string;
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
};

/**
 * Service for interacting with Ollama models
 */
export class OllamaService {
  private baseUrl: string = 'http://localhost:11434';

  /**
   * Lists available models from the Ollama server
   */
  async listModels(): Promise<OllamaModelType[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`);
      }
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Error listing Ollama models:', error);
      throw error;
    }
  }

  /**
   * Checks if Ollama server is running
   */
  async isServerRunning(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/version`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Creates a chat instance with the specified model
   */
  createChat(model: string) {
    return new ChatOllama({
      baseUrl: this.baseUrl,
      model,
      temperature: 0.7,
    });
  }

  /**
   * Creates a simple question answering chain
   */
  createQAChain(model: string) {
    const llm = this.createChat(model);

    const prompt = ChatPromptTemplate.fromTemplate(
      `Vous êtes un assistant IA intelligent qui aide l'utilisateur. 
      Répondez à la question suivante de façon précise et utile:
      
      {question}`,
    );

    return prompt.pipe(llm).pipe(new StringOutputParser());
  }

  /**
   * Sends a question to the Ollama model
   */
  async askQuestion(model: string, question: string): Promise<string> {
    try {
      const chain = this.createQAChain(model);
      return await chain.invoke({ question });
    } catch (error) {
      console.error('Error asking question to Ollama:', error);
      throw error;
    }
  }
}
