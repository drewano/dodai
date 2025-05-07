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
// import { stateService } from './state-service'; // Unused currently

const logger = loggerImport;

const RAG_PROMPT_TEMPLATE = `You are an assistant for question-answering tasks based on the user's personal notes.
Use the following pieces of retrieved context from their notes to answer the question.
If you don't know the answer from the provided context, or if the context is empty, just say that you don't have information on this topic in your notes.
Keep the answer concise and directly relevant to the notes.

Context:
{context}

Question: {input}

Answer:
`;

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
    await this.initializeVectorStore();
  }

  async initializeVectorStore(): Promise<boolean> {
    if (this.isInitializing) {
      logger.info('[RAG Service] Initialization already in progress.');
      return false;
    }
    this.isInitializing = true;
    logger.info('[RAG Service] Initializing Vector Store...');

    try {
      const settings = await aiAgentStorage.get();
      this.embeddings = new OllamaEmbeddings({
        model: settings.selectedModel,
        baseUrl: settings.baseUrl,
      });

      const allNotes = await notesStorage.getAllNotes();
      const noteEntries = allNotes.filter(note => note.type === 'note') as NoteEntry[];

      if (noteEntries.length === 0) {
        logger.info('[RAG Service] No notes found to index.');
        this.vectorStore = null;
        this.isInitialized = true;
        this.isInitializing = false;
        return true;
      }

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

      if (documents.length > 0) {
        this.vectorStore = await MemoryVectorStore.fromDocuments(documents, this.embeddings);
        logger.info(
          `[RAG Service] Vector Store initialized with ${documents.length} document chunks from ${noteEntries.length} notes.`,
        );
      } else {
        this.vectorStore = null;
        logger.info('[RAG Service] No document chunks created from notes.');
      }
      this.isInitialized = true;
      return true;
    } catch (error) {
      logger.error('[RAG Service] Error initializing Vector Store:', error);
      this.isInitialized = false;
      this.vectorStore = null;
      return false;
    } finally {
      this.isInitializing = false;
    }
  }

  private async getRagChain(llm: ChatOllama) {
    if (!this.vectorStore || !this.isInitialized) {
      logger.warn('[RAG Service] Vector Store not initialized. Attempting to initialize...');
      const success = await this.initializeVectorStore();
      if (!success || !this.vectorStore) {
        throw new Error('RAG Vector Store could not be initialized.');
      }
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
  ): Promise<void> {
    logger.debug('[RAG Service] Processing RAG stream request:', { userInput });
    try {
      if (!this.isInitialized && !this.isInitializing) {
        await this.initializeVectorStore();
      }
      if (!this.vectorStore && this.isInitialized) {
        port.postMessage({
          type: StreamEventType.STREAM_CHUNK,
          chunk: 'No notes available to search. Please add some notes first.',
        });
        port.postMessage({ type: StreamEventType.STREAM_END, success: true, sourceDocuments: [] });
        return;
      }

      const llm = await agentService.createLLMInstance();
      const ragChain = await this.getRagChain(llm);
      const langchainHistory = convertChatHistory(chatHistory);

      const stream = await ragChain.stream({
        input: userInput,
        chat_history: langchainHistory,
      });

      let retrievedSourceDocuments: RagSourceDocument[] = [];

      for await (const chunk of stream) {
        if (chunk.answer) {
          port.postMessage({ type: StreamEventType.STREAM_CHUNK, chunk: chunk.answer });
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
      port.postMessage({ type: StreamEventType.STREAM_END, success: true, sourceDocuments: retrievedSourceDocuments });
      logger.debug('[RAG Service] RAG stream ended.');
    } catch (error) {
      logger.error('[RAG Service] Error processing RAG stream request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during RAG processing.';
      try {
        port.postMessage({ type: StreamEventType.STREAM_ERROR, error: errorMessage });
        port.postMessage({ type: StreamEventType.STREAM_END, success: false });
      } catch (portError) {
        logger.error('[RAG Service] Error sending error to port:', portError);
      }
    }
  }

  async invokeRagChain(
    userInput: string,
    chatHistoryMessages: ChatHistoryMessage[] = [],
  ): Promise<{ answer: string; sources: RagSourceDocument[]; error?: string }> {
    try {
      if (!this.isInitialized && !this.isInitializing) {
        await this.initializeVectorStore();
      }
      if (!this.vectorStore && this.isInitialized) {
        return {
          answer: 'No notes available to search. Please add some notes first.',
          sources: [],
        };
      }

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
      return { answer: `Error: ${message}`, sources: [], error: message };
    }
  }
}

export const ragService = new RagService();
