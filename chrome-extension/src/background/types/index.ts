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
  AI_CHAT_REQUEST = 'AI_CHAT_REQUEST',
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
 * Convertit l'historique du chat du format client vers le format LangChain
 */
export function convertChatHistory(chatHistory: ChatHistoryMessage[] = []): BaseMessage[] {
  return chatHistory.map(msg => (msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)));
}

// Exporte les types depuis LangChain pour éviter les imports multiples
export type { BaseMessage, StructuredToolInterface, Connection, AgentExecutor, ChatOllama };
