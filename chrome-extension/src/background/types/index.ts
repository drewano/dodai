import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import type { StructuredToolInterface } from '@langchain/core/tools';
import type { AgentExecutor } from 'langchain/agents';
import type { ChatOllama } from '@langchain/ollama';
import type { MultiServerMCPClient, Connection } from '@langchain/mcp-adapters';

/**
 * Message du chat formaté pour l'UI
 */
export type ChatHistoryMessage = {
  role: string;
  content: string;
};

/**
 * État d'une connexion MCP
 */
export type McpConnectionState = {
  status: 'connected' | 'error' | 'unknown';
  error?: string;
};

/**
 * État de toutes les connexions MCP
 */
export type McpConnectionsState = Record<string, McpConnectionState>;

/**
 * Port de streaming avec horodatage
 */
export type StreamingPort = {
  port: chrome.runtime.Port;
  startTime: number;
};

/**
 * Options pour le client MCP
 */
export interface McpClientOptions {
  prefixToolNameWithServerName: boolean;
  additionalToolNamePrefix: string;
}

/**
 * État global du service worker
 */
export interface GlobalState {
  mcpClient: MultiServerMCPClient | null;
  loadedMcpTools: StructuredToolInterface[];
  agentExecutorInstance: AgentExecutor | null;
  mcpConnectionState: McpConnectionsState;
  activeStreamingPorts: Map<string, StreamingPort>;
}

/**
 * Résultat d'initialisation du client MCP
 */
export interface McpClientInitResult {
  client: MultiServerMCPClient | null;
  config: Record<string, Connection>;
  initialStates: McpConnectionsState;
  prefixToolNameWithServerName: boolean;
  additionalToolNamePrefix: string;
}

/**
 * Types de messages runtime utilisés dans l'extension
 */
export enum MessageType {
  // Requêtes IA existantes
  AI_CHAT_REQUEST = 'AI_CHAT_REQUEST',
  CHAT_WITH_TOOLS = 'CHAT_WITH_TOOLS',

  // Nouveaux types de messages pour la gestion de l'agent IA
  CHECK_AGENT_STATUS = 'CHECK_AGENT_STATUS',
  GET_AVAILABLE_MODELS = 'GET_AVAILABLE_MODELS',

  // Types de messages pour MCP
  GET_MCP_TOOLS = 'GET_MCP_TOOLS',
  GET_MCP_CONNECTION_STATUS = 'GET_MCP_CONNECTION_STATUS',
  MCP_CONFIG_CHANGED = 'MCP_CONFIG_CHANGED',
  MCP_STATE_UPDATED = 'MCP_STATE_UPDATED',

  // Nouveau type de message pour la fonctionnalité de résumé de page
  SUMMARIZE_PAGE_REQUEST = 'SUMMARIZE_PAGE_REQUEST',

  // Nouveau type de message pour lister les points clés
  LIST_KEY_POINTS_REQUEST = 'LIST_KEY_POINTS_REQUEST',

  // Nouveau type de message pour prompt personnalisé
  CUSTOM_PAGE_PROMPT_REQUEST = 'CUSTOM_PAGE_PROMPT_REQUEST',

  // Message type for RAG chat
  RAG_CHAT_REQUEST = 'RAG_CHAT_REQUEST',

  // Nouveau type de message pour sauvegarder un message comme note
  SAVE_MESSAGE_AS_NOTE = 'SAVE_MESSAGE_AS_NOTE',

  // Nouveaux types de messages pour l'autocomplétion inline
  GET_INLINE_COMPLETION_REQUEST = 'GET_INLINE_COMPLETION_REQUEST',
  GET_INLINE_COMPLETION_RESPONSE = 'GET_INLINE_COMPLETION_RESPONSE',

  // Nouveau type de message pour la génération d'artefacts dans Dodai Canvas
  GENERATE_DODAI_CANVAS_ARTIFACT_REQUEST = 'GENERATE_DODAI_CANVAS_ARTIFACT_REQUEST',

  // Nouveau type pour modifier un artefact existant
  MODIFY_DODAI_CANVAS_ARTIFACT_REQUEST = 'MODIFY_DODAI_CANVAS_ARTIFACT_REQUEST',

  // Nouveau type pour la génération d'artefacts en streaming dans Dodai Canvas
  GENERATE_DODAI_CANVAS_ARTIFACT_STREAM_REQUEST = 'GENERATE_DODAI_CANVAS_ARTIFACT_STREAM_REQUEST',
}

/**
 * Types d'événements pour le streaming
 */
export enum StreamEventType {
  STREAM_START = 'STREAM_START',
  STREAM_CHUNK = 'STREAM_CHUNK',
  STREAM_END = 'STREAM_END',
  STREAM_ERROR = 'STREAM_ERROR',
  CANCEL_STREAMING = 'CANCEL_STREAMING',
}

/**
 * Interfaces pour les messages et les réponses
 */

// Interface de base pour les messages
export interface BaseRuntimeMessage {
  type: MessageType;
}

// Message pour la requête de résumé de page
export interface SummarizePageMessage extends BaseRuntimeMessage {
  type: MessageType.SUMMARIZE_PAGE_REQUEST;
}

// Réponse pour le résumé de page
export interface SummarizePageResponse {
  success: boolean;
  summary?: string;
  error?: string;
}

// Message pour la requête de liste des points clés
export interface ListKeyPointsMessage extends BaseRuntimeMessage {
  type: MessageType.LIST_KEY_POINTS_REQUEST;
}

// Réponse pour la liste des points clés
export interface ListKeyPointsResponse {
  success: boolean;
  keyPoints?: string;
  error?: string;
}

// Message pour la requête de prompt personnalisé
export interface CustomPagePromptMessage extends BaseRuntimeMessage {
  type: MessageType.CUSTOM_PAGE_PROMPT_REQUEST;
  userPrompt: string;
}

// Réponse pour le prompt personnalisé
export interface CustomPagePromptResponse {
  success: boolean;
  result?: string;
  error?: string;
}

// Message pour vérifier le statut de l'agent
export interface CheckAgentStatusMessage extends BaseRuntimeMessage {
  type: MessageType.CHECK_AGENT_STATUS;
}

// Réponse pour le statut de l'agent
export interface AgentStatusResponse {
  success: boolean;
  isReady: boolean;
  isServerRunning?: boolean;
  error?: string;
}

// Message pour obtenir les modèles disponibles
export interface GetAvailableModelsMessage extends BaseRuntimeMessage {
  type: MessageType.GET_AVAILABLE_MODELS;
  baseUrl?: string;
}

// Réponse pour les modèles disponibles
export interface AvailableModelsResponse {
  success: boolean;
  models: { name: string; id: string; modified_at?: string; size?: number }[];
  error?: string;
}

// Message pour une requête de chat simple
export interface AIChatRequestMessage extends BaseRuntimeMessage {
  type: MessageType.AI_CHAT_REQUEST;
  payload: {
    message: string;
    chatHistory?: ChatHistoryMessage[];
    streamHandler?: boolean;
    portId?: string;
    pageContent?: string;
  };
}

// Message pour une requête de chat avec outils
export interface ChatWithToolsMessage extends BaseRuntimeMessage {
  type: MessageType.CHAT_WITH_TOOLS;
  query: string;
  history: ChatHistoryMessage[];
}

// Réponse pour les requêtes de chat
export interface ChatResponse {
  success: boolean;
  data?: string;
  streaming?: boolean;
  toolUsed?: boolean;
  error?: string;
}

// Message pour obtenir les outils MCP
export interface GetMcpToolsMessage extends BaseRuntimeMessage {
  type: MessageType.GET_MCP_TOOLS;
}

// Réponse pour les outils MCP
export interface McpToolsResponse {
  success: boolean;
  tools: {
    name: string;
    description: string;
    serverName?: string;
  }[];
  error?: string;
}

// Message pour obtenir le statut des connexions MCP
export interface GetMcpConnectionStatusMessage extends BaseRuntimeMessage {
  type: MessageType.GET_MCP_CONNECTION_STATUS;
}

// Réponse pour le statut des connexions MCP
export interface McpConnectionStatusResponse {
  success: boolean;
  connectionState: McpConnectionsState;
  error?: string;
}

// Message pour notifier un changement de configuration MCP
export interface McpConfigChangedMessage extends BaseRuntimeMessage {
  type: MessageType.MCP_CONFIG_CHANGED;
}

// Message pour sauvegarder un message comme note
export interface SaveMessageAsNoteMessage extends BaseRuntimeMessage {
  type: MessageType.SAVE_MESSAGE_AS_NOTE;
  content: string;
  sourceUrl?: string;
}

// Réponse pour la sauvegarde d'un message comme note
export interface SaveMessageAsNoteResponse {
  success: boolean;
  noteId?: string;
  error?: string;
}

// Interface pour la requête d'autocomplétion inline
export interface GetInlineCompletionRequestMessage extends BaseRuntimeMessage {
  type: MessageType.GET_INLINE_COMPLETION_REQUEST;
  currentText: string;
  surroundingText: {
    preceding: string;
    succeeding: string;
  };
  pageContent: string;
  selectedModel?: string;
}

// Interface pour la réponse d'autocomplétion inline
export interface GetInlineCompletionResponseMessage extends BaseRuntimeMessage {
  type: MessageType.GET_INLINE_COMPLETION_RESPONSE;
  success: boolean;
  completion?: string;
  error?: string;
  model?: string;
}

/**
 * Convertit l'historique du chat du format client vers le format LangChain
 */
export function convertChatHistory(chatHistory: ChatHistoryMessage[] = []): BaseMessage[] {
  return chatHistory.map(msg => (msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)));
}

// Exporte les types depuis LangChain pour éviter les imports multiples
export type { BaseMessage, StructuredToolInterface, Connection, AgentExecutor, ChatOllama };

// --- RAG Chat Types ---
export interface RagSourceDocument {
  id: string;
  title: string;
  contentSnippet: string; // A small snippet of the source note
  sourceUrl?: string;
}

export interface RagChatRequestMessage extends BaseRuntimeMessage {
  type: MessageType.RAG_CHAT_REQUEST;
  payload: {
    message: string;
    chatHistory?: ChatHistoryMessage[];
    streamHandler?: boolean;
    portId?: string;
    selectedModel?: string;
  };
}

// This will be used by the streaming service, similar to existing chat
// The actual content of the stream might differ (e.g. include source docs at the end)
export interface RagChatStreamResponse {
  type: StreamEventType;
  chunk?: string; // For STREAM_CHUNK
  sourceDocuments?: RagSourceDocument[]; // Optionally sent with STREAM_END or as a separate event
  success?: boolean; // For STREAM_END
  error?: string; // For STREAM_ERROR
  model?: string; // Nom du modèle qui a généré la réponse
}

// For non-streaming or as a final consolidated response
export interface RagChatResponse {
  success: boolean;
  data?: string; // The AI's answer
  sourceDocuments?: RagSourceDocument[];
  streaming?: boolean; // True if streaming was initiated
  error?: string;
  model?: string; // Nom du modèle qui a généré la réponse
}

// Interfaces pour Dodai Canvas
export interface GenerateDodaiCanvasArtifactRequest extends BaseRuntimeMessage {
  type: MessageType.GENERATE_DODAI_CANVAS_ARTIFACT_REQUEST;
  payload: {
    prompt: string;
    history?: ChatHistoryMessage[];
  };
}

export interface GenerateDodaiCanvasArtifactResponse {
  success: boolean;
  artifact?: string;
  error?: string;
  model?: string;
}

// Interface pour la requête de modification d'artefact
export interface ModifyDodaiCanvasArtifactRequest extends BaseRuntimeMessage {
  type: MessageType.MODIFY_DODAI_CANVAS_ARTIFACT_REQUEST;
  payload: {
    prompt: string;
    currentArtifact: string;
    artifactType: 'text' | 'code';
    history?: ChatHistoryMessage[];
  };
}

// Interface pour la réponse de modification d'artefact
export interface ModifyDodaiCanvasArtifactResponse {
  success: boolean;
  artifact?: string;
  error?: string;
  model?: string;
}

// --- Dodai Canvas Streaming Types ---
export interface GenerateDodaiCanvasArtifactStreamRequestMessage extends BaseRuntimeMessage {
  type: MessageType.GENERATE_DODAI_CANVAS_ARTIFACT_STREAM_REQUEST;
  payload: {
    prompt: string;
    history?: ChatHistoryMessage[];
    portId: string; // Important pour identifier le port de streaming
  };
}

export interface GenerateDodaiCanvasArtifactStreamResponse {
  type: StreamEventType; // STREAM_START, STREAM_CHUNK, STREAM_END, STREAM_ERROR
  chunk?: string; // For STREAM_CHUNK
  success?: boolean; // For STREAM_END
  error?: string; // For STREAM_ERROR
  model?: string; // Nom du modèle qui a généré la réponse (envoyé avec STREAM_START et STREAM_END)
}
