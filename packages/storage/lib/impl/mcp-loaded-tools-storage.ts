import type { BaseStorage } from '../base/index.js';
import { createStorage, StorageEnum } from '../base/index.js';

export interface McpToolInfo {
  name: string; // Nom complet préfixé tel qu'utilisé par Langchain
  description: string;
  serverName: string; // Nom du serveur d'origine
}

const defaultLoadedTools: McpToolInfo[] = [];

type McpLoadedToolsStorageType = BaseStorage<McpToolInfo[]>;

const storage = createStorage<McpToolInfo[]>('mcp-loaded-tools', defaultLoadedTools, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

export const mcpLoadedToolsStorage: McpLoadedToolsStorageType = {
  ...storage,
};
