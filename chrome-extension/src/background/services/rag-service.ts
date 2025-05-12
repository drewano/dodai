import type { ChatOllama } from '@langchain/ollama';
import { OllamaEmbeddings } from '@langchain/ollama';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { Document } from '@langchain/core/documents';
// import type { BaseMessage as LangchainBaseMessage } from '@langchain/core/messages'; // Unused
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { createRetrievalChain } from 'langchain/chains/retrieval';
// ChatOllama is imported from @langchain/ollama already
// import type { ChatOllama } from '@langchain/ollama';

import { notesStorage, type NoteEntry } from '@extension/storage';
import { aiAgentStorage } from '@extension/storage';
import loggerImport from '../logger';
import { agentService } from './agent-service'; // To get LLM instance
import type { RagSourceDocument, ChatHistoryMessage } from '../types';
import { StreamEventType, convertChatHistory } from '../types';
import { stateService } from './state-service';
// import { stateService } from './state-service'; // Unused currently

const logger = loggerImport;

const RAG_PROMPT_TEMPLATE = `You are an assistant for question-answering tasks based on the user's personal notes.
Use the following pieces of retrieved context from their notes to answer the question.
If you don't know the answer from the provided context, or if the context is empty, just say that you don't have information on this topic in your notes.
Keep the answer concise and directly relevant to the notes.

When formulating your response, first analyze the question and the context inside <think></think> tags.
These thinking tags will not be shown to the user directly but can be made visible if the user chooses to see your reasoning.

Here's an example:
<think>
Let me analyze the user's question and the available context...
Looking at the context, I can see information about...
The relevant points for this question are...
</think>

Context:
{context}

Question: {input}

Answer:
`;

const DEFAULT_EMBEDDING_MODEL = 'nomic-embed-text';

export class RagService {
  private vectorStore: MemoryVectorStore | null = null;
  private embeddings: OllamaEmbeddings | null = null;
  private textSplitter: RecursiveCharacterTextSplitter;
  private isInitialized = false;
  private isInitializing = false;

  constructor() {
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    // Listen for note changes to re-index
    if (typeof notesStorage.onChange === 'function') {
      notesStorage.onChange(this.handleNotesChanged.bind(this));
    } else {
      logger.warn(
        '[RAG Service] notesStorage.onChange is not available. Vector store will not auto-update on note changes.',
      );
      // Consider periodic re-indexing as a fallback if onChange is not available.
    }
  }

  private async handleNotesChanged(): Promise<void> {
    logger.info('[RAG Service] Notes changed, re-initializing vector store.');
    // On ne réinitialise que si l'initialisation n'est pas déjà en cours
    if (!this.isInitializing) {
      await this.initializeVectorStore();
    }
  }

  async initializeVectorStore(): Promise<boolean> {
    if (this.isInitializing) {
      logger.info('[RAG Service] Initialization already in progress.');
      // Retourne l'état actuel pour éviter de bloquer les requêtes pendant la réinitialisation
      return this.isInitialized;
    }
    this.isInitializing = true;
    logger.info('[RAG Service] Initializing Vector Store...');

    try {
      const settings = await aiAgentStorage.get();
      const embeddingModelToUse = settings.embeddingModel || DEFAULT_EMBEDDING_MODEL;
      logger.info(`[RAG Service] Using embedding model: ${embeddingModelToUse} from baseUrl: ${settings.baseUrl}`);

      // 1. Créer l'instance d'embeddings
      try {
        this.embeddings = new OllamaEmbeddings({
          model: embeddingModelToUse,
          baseUrl: settings.baseUrl,
        });
      } catch (embeddingError) {
        logger.error('[RAG Service] Error creating OllamaEmbeddings instance:', embeddingError);
        throw new Error(
          `Failed to create embeddings instance for model ${embeddingModelToUse}: ${embeddingError instanceof Error ? embeddingError.message : String(embeddingError)}`,
        );
      }

      // 2. Récupérer et préparer les notes
      const allNotes = await notesStorage.getAllNotes();
      const noteEntries = allNotes.filter(note => note.type === 'note') as NoteEntry[];

      if (noteEntries.length === 0) {
        logger.info('[RAG Service] No notes found to index.');
        this.vectorStore = null; // Assurer que le store est null
        this.isInitialized = true;
        this.isInitializing = false;
        return true;
      }

      // 3. Créer les documents
      const documents: Document[] = [];
      for (const note of noteEntries) {
        if (note.content && typeof note.content === 'string') {
          // Ensure content exists and is a string
          const chunks = await this.textSplitter.splitText(note.content);
          chunks.forEach(chunk => {
            documents.push(
              new Document({
                pageContent: chunk,
                metadata: {
                  id: note.id,
                  title: note.title,
                  sourceUrl: note.sourceUrl,
                  createdAt: note.createdAt,
                  updatedAt: note.updatedAt,
                },
              }),
            );
          });
        } else {
          logger.warn(`[RAG Service] Note with id ${note.id} has no content or content is not a string.`);
        }
      }

      // 4. Créer le Vector Store
      if (documents.length > 0) {
        try {
          this.vectorStore = await MemoryVectorStore.fromDocuments(documents, this.embeddings);
          logger.info(
            `[RAG Service] Vector Store initialized with ${documents.length} document chunks from ${noteEntries.length} notes.`,
          );
        } catch (storeError) {
          logger.error('[RAG Service] Error creating MemoryVectorStore:', storeError);
          throw new Error(
            `Failed to create vector store from documents: ${storeError instanceof Error ? storeError.message : String(storeError)}`,
          );
        }
      } else {
        this.vectorStore = null;
        logger.info('[RAG Service] No document chunks created from notes.');
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      logger.error('[RAG Service] Error during Vector Store initialization pipeline:', error);
      this.isInitialized = false;
      this.vectorStore = null;
      this.embeddings = null;
      // Renvoyer l'erreur pour qu'elle puisse être traitée plus haut
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  private async getRagChain(llm: ChatOllama) {
    // Pas besoin de vérifier isInitialized ici, car initializeVectorStore est appelé avant
    // et lèvera une erreur si elle échoue, qui sera attrapée par l'appelant.
    if (!this.vectorStore) {
      // Cette condition devrait idéalement ne pas être atteinte si l'initialisation
      // est correctement gérée en amont, mais c'est une sécurité.
      logger.error('[RAG Service] Attempted to get RAG chain without a valid vector store.');
      throw new Error('RAG Vector Store is not available.');
    }

    const retriever = this.vectorStore.asRetriever({ k: 3 });

    const prompt = ChatPromptTemplate.fromTemplate(RAG_PROMPT_TEMPLATE);

    const combineDocsChain = await createStuffDocumentsChain({
      llm,
      prompt,
    });

    return createRetrievalChain({ retriever, combineDocsChain });
  }

  async processRagStreamRequest(
    userInput: string,
    chatHistory: ChatHistoryMessage[] = [],
    port: chrome.runtime.Port,
    selectedModel?: string, // Modèle de CHAT optionnel
  ): Promise<void> {
    logger.debug('[RAG Service] Processing RAG stream request:', { userInput });
    const portId = port.name;

    try {
      // Essayer d'initialiser si nécessaire
      if (!this.isInitialized && !this.isInitializing) {
        try {
          await this.initializeVectorStore();
        } catch (initError) {
          logger.error('[RAG Service] Initialization failed during stream request:', initError);
          const errorMessage = initError instanceof Error ? initError.message : 'Vector store initialization failed.';
          port.postMessage({ type: StreamEventType.STREAM_ERROR, error: errorMessage, portId });
          port.postMessage({ type: StreamEventType.STREAM_END, success: false, portId });
          return; // Arrêter le traitement
        }
      }

      // Vérifier si le store est prêt après tentative d'initialisation
      if (!this.vectorStore && this.isInitialized) {
        port.postMessage({
          type: StreamEventType.STREAM_CHUNK,
          chunk: 'No notes available to search. Please add some notes first.',
          portId,
        });
        port.postMessage({ type: StreamEventType.STREAM_END, success: true, sourceDocuments: [], portId });
        return;
      }

      // Si toujours pas prêt (ex: initialisation en cours par un autre appel)
      // Ou si l'initialisation a échoué précédemment et n'a pas été retentée ici
      if (!this.vectorStore) {
        logger.warn('[RAG Service] Vector store still not available for streaming request.');
        port.postMessage({
          type: StreamEventType.STREAM_ERROR,
          error: 'The note database is currently being initialized or is unavailable. Please try again shortly.',
          portId,
        });
        port.postMessage({ type: StreamEventType.STREAM_END, success: false, portId });
        return;
      }

      // Utiliser le modèle de CHAT spécifié ou celui par défaut
      const modelToUse = selectedModel || (await aiAgentStorage.get()).selectedModel;
      logger.info(`[RAG Service] Using CHAT model for RAG: ${modelToUse}`);
      const llm = selectedModel
        ? await agentService.createLLMInstance(selectedModel) // Utilise le modèle de chat ici
        : await agentService.createLLMInstance(); // Utilise le modèle de chat par défaut ici

      // Notifier le début du streaming avec le nom du modèle de CHAT
      port.postMessage({ type: StreamEventType.STREAM_START, model: modelToUse, portId });

      const ragChain = await this.getRagChain(llm); // LLM de chat passé ici
      const langchainHistory = convertChatHistory(chatHistory);

      const stream = await ragChain.stream({
        input: userInput,
        chat_history: langchainHistory,
      });

      let retrievedSourceDocuments: RagSourceDocument[] = [];

      for await (const chunk of stream) {
        if (chunk.answer) {
          // Vérifier et nettoyer la réponse si c'est un string JSON
          let cleanedAnswer = chunk.answer;
          if (
            typeof cleanedAnswer === 'string' &&
            (cleanedAnswer.trim().startsWith('{') || cleanedAnswer.includes('"answer":'))
          ) {
            try {
              // Tenter de parser si c'est un JSON
              const parsed = JSON.parse(cleanedAnswer);
              if (parsed.answer && typeof parsed.answer === 'string') {
                cleanedAnswer = parsed.answer;
              }
            } catch {
              // Ignorer l'erreur, envoyer le chunk tel quel
              logger.debug('[RAG Service] Failed to parse JSON in answer chunk');
            }
          }

          port.postMessage({ type: StreamEventType.STREAM_CHUNK, chunk: cleanedAnswer });
        }
        if (chunk.context && Array.isArray(chunk.context)) {
          retrievedSourceDocuments = chunk.context.map((doc: Document) => ({
            id: doc.metadata.id as string,
            title: doc.metadata.title as string,
            contentSnippet: doc.pageContent.substring(0, 200) + '...',
            sourceUrl: doc.metadata.sourceUrl as string | undefined,
          }));
        }
      }
      port.postMessage({
        type: StreamEventType.STREAM_END,
        success: true,
        sourceDocuments: retrievedSourceDocuments,
        model: modelToUse, // Modèle de CHAT utilisé
        portId,
      });
      logger.debug('[RAG Service] RAG stream ended successfully.');
    } catch (error) {
      logger.error('[RAG Service] Error processing RAG stream request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during RAG processing.';
      try {
        // S'assurer que le port est toujours valide avant d'envoyer
        const currentPort = stateService.getStreamingPort(portId);
        if (currentPort && currentPort.port === port) {
          port.postMessage({ type: StreamEventType.STREAM_ERROR, error: errorMessage, portId });
          port.postMessage({ type: StreamEventType.STREAM_END, success: false, portId });
        } else {
          logger.warn('[RAG Service] Port disconnected before error could be sent.');
        }
      } catch (portError) {
        logger.error('[RAG Service] Error sending error to port:', portError);
      }
    } finally {
      // Ne pas déconnecter le port ici, le client pourrait vouloir annuler
    }
  }

  async invokeRagChain(
    userInput: string,
    chatHistoryMessages: ChatHistoryMessage[] = [],
  ): Promise<{ answer: string; sources: RagSourceDocument[]; error?: string }> {
    try {
      // Essayer d'initialiser si nécessaire
      if (!this.isInitialized && !this.isInitializing) {
        await this.initializeVectorStore(); // Lèvera une erreur si ça échoue
      }

      // Vérifier si le store est prêt après tentative d'initialisation
      if (!this.vectorStore && this.isInitialized) {
        return {
          answer: 'No notes available to search. Please add some notes first.',
          sources: [],
        };
      }
      // Si toujours pas prêt
      if (!this.vectorStore) {
        throw new Error('RAG Vector Store is not available. It might be initializing.');
      }

      // Utilise le modèle de CHAT par défaut ici
      const llm = await agentService.createLLMInstance();
      const ragChain = await this.getRagChain(llm);
      const langchainHistory = convertChatHistory(chatHistoryMessages);

      const result = await ragChain.invoke({
        input: userInput,
        chat_history: langchainHistory,
      });

      const sources: RagSourceDocument[] = (result.context || []).map((doc: Document) => ({
        id: doc.metadata.id as string,
        title: doc.metadata.title as string,
        contentSnippet: doc.pageContent.substring(0, 200) + '...',
        sourceUrl: doc.metadata.sourceUrl as string | undefined,
      }));

      return { answer: result.answer as string, sources };
    } catch (error) {
      logger.error('[RAG Service] Error invoking RAG chain:', error);
      const message = error instanceof Error ? error.message : 'Unknown RAG error.';
      return { answer: `Error processing your request based on notes. Cause: ${message}`, sources: [], error: message };
    }
  }
}

export const ragService = new RagService();
