import { AIMessage, HumanMessage, BaseMessage } from '@langchain/core/messages';
import type { StructuredToolInterface } from '@langchain/core/tools';
import { AgentExecutor } from 'langchain/agents';
import { ChatOllama } from '@langchain/ollama';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import type { Connection } from '@langchain/mcp-adapters';
import { AIAgentSettings, McpServersConfig, McpToolInfo } from '@extension/storage';

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

// Message pour vérifier le statut de l'agent
export interface CheckAgentStatusMessage extends BaseRuntimeMessage {
  type: MessageType.CHECK_AGENT_STATUS;
}

// Réponse pour le statut de l'agent
export interface AgentStatusResponse {
  success: boolean;
  isReady: boolean;
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

/**
 * Convertit l'historique du chat du format client vers le format LangChain
 */
export function convertChatHistory(chatHistory: ChatHistoryMessage[] = []): BaseMessage[] {
  return chatHistory.map(msg => (msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)));
}

// Exporte les types depuis LangChain pour éviter les imports multiples
export type { BaseMessage, StructuredToolInterface, Connection, AgentExecutor, ChatOllama };
