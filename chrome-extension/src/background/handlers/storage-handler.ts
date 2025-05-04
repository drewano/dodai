import logger from '../logger';
import { mcpService } from '../services/mcp-service';

/**
 * Gestionnaire pour les événements de changement de stockage
 */
export class StorageHandler {
  /**
   * Initialise le handler pour surveiller les changements dans chrome.storage
   */
  initialize(): void {
    chrome.storage.onChanged.addListener(this.handleStorageChange.bind(this));
    logger.debug('StorageHandler initialisé.');
  }

  /**
   * Gère les changements dans le stockage Chrome
   */
  private async handleStorageChange(
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ): Promise<void> {
    if (areaName === 'local') {
      // Changements dans les paramètres de l'Agent AI
      if (changes['ai-agent-settings']) {
        await this.handleAiAgentSettingsChange(changes['ai-agent-settings']);
      }

      // Changements dans la configuration MCP
      if (changes['mcp-servers-config']) {
        await this.handleMcpConfigChange(changes['mcp-servers-config']);
      }
    }
  }

  /**
   * Gère les changements dans les paramètres de l'agent AI
   */
  private async handleAiAgentSettingsChange(change: chrome.storage.StorageChange): Promise<void> {
    logger.debug("Changement détecté dans les paramètres de l'Agent AI:", change);

    const oldSettings = change.oldValue || {};
    const newSettings = change.newValue || {};

    // Vérifier si un des paramètres critiques a changé
    const criticalParamsChanged =
      oldSettings.selectedModel !== newSettings.selectedModel ||
      oldSettings.temperature !== newSettings.temperature ||
      oldSettings.baseUrl !== newSettings.baseUrl;

    if (criticalParamsChanged) {
      logger.info("Paramètres critiques changés, réinitialisation de l'Agent AI...");
      await mcpService.initializeOrReinitializeMcpClient();
      logger.info('Réinitialisation Agent AI suite au changement de paramètres terminée');
    }
  }

  /**
   * Gère les changements dans la configuration MCP
   */
  private async handleMcpConfigChange(change: chrome.storage.StorageChange): Promise<void> {
    logger.debug('Changement détecté dans la configuration MCP:', change);

    // On pourrait ajouter une logique spécifique ici si nécessaire,
    // mais pour l'instant on réinitialisera tout de toutes façons dans
    // handleMcpConfigChanged de messageHandler
  }
}

// Export d'une instance singleton
export const storageHandler = new StorageHandler();
