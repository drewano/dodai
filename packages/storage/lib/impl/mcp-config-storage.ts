import type { BaseStorage } from '../base/index.js';
import { createStorage, StorageEnum } from '../base/index.js';

/**
 * Configuration d'un serveur MCP utilisant le transport SSE
 */
export interface McpServerConfigEntry {
  /**
   * URL du serveur MCP SSE
   */
  url: string;

  /**
   * En-têtes optionnels à envoyer avec les requêtes SSE
   * Utile pour l'authentification (Bearer token, etc.)
   */
  headers?: Record<string, string>;

  /**
   * Utiliser l'implémentation Node.js EventSource pour un meilleur support des en-têtes
   * (Peu utile dans une extension Chrome, mais gardé pour la cohérence avec l'API)
   */
  useNodeEventSource?: boolean;
}

/**
 * Configuration de tous les serveurs MCP
 * La clé est le nom du serveur, la valeur est sa configuration
 */
export type McpServersConfig = Record<string, McpServerConfigEntry>;

/**
 * Type de stockage pour la configuration MCP avec méthodes utilitaires
 */
type McpConfigStorageType = BaseStorage<McpServersConfig> & {
  /**
   * Ajoute ou met à jour un serveur MCP dans la configuration
   */
  addServer: (name: string, config: McpServerConfigEntry) => Promise<void>;

  /**
   * Supprime un serveur MCP de la configuration
   */
  removeServer: (name: string) => Promise<void>;

  /**
   * Met à jour les en-têtes d'un serveur existant
   */
  updateServerHeaders: (name: string, headers: Record<string, string>) => Promise<void>;
};

// Création du stockage de base
const storage = createStorage<McpServersConfig>(
  'mcp-servers-config',
  {},
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

// Export du stockage étendu avec des méthodes additionnelles
export const mcpConfigStorage: McpConfigStorageType = {
  ...storage,

  addServer: async (name: string, config: McpServerConfigEntry) => {
    await storage.set(configs => ({
      ...configs,
      [name]: config,
    }));
  },

  removeServer: async (name: string) => {
    await storage.set(configs => {
      const newConfigs = { ...configs };
      delete newConfigs[name];
      return newConfigs;
    });
  },

  updateServerHeaders: async (name: string, headers: Record<string, string>) => {
    await storage.set(configs => {
      if (!configs[name]) {
        return configs;
      }

      return {
        ...configs,
        [name]: {
          ...configs[name],
          headers,
        },
      };
    });
  },
};
