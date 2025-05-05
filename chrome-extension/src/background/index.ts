import 'webextension-polyfill';
import { logger } from './logger';
import { messageHandler } from './handlers/message-handler';
import { storageHandler } from './handlers/storage-handler';
import { mcpService } from './services/mcp-service';
import { streamingService } from './services/streaming-service';
import { stateService } from './services/state-service';

// --- Initialisation des écouteurs d'événements ---

/**
 * Configure les écouteurs d'événements pour le service worker
 */
function setupEventListeners(): void {
  // Écoute les messages runtime
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    return messageHandler.handleMessage(message, sender, sendResponse);
  });

  // Écoute les connexions de port (pour le streaming)
  chrome.runtime.onConnect.addListener(port => {
    streamingService.handleStreamingConnection(port);
  });

  // Initialise le gestionnaire de stockage pour réagir aux changements
  storageHandler.initialize();

  // Nettoyage lors de la suspension du service worker
  chrome.runtime.onSuspend?.addListener(() => {
    logger.info('Service worker suspendu. Nettoyage...');
    const mcpClient = stateService.getMcpClient();
    if (mcpClient) {
      mcpClient.close().catch(err => logger.error('Erreur fermeture client MCP:', err));
    }
    stateService.resetState();
  });
}

/**
 * Point d'entrée principal
 */
async function initialize(): Promise<void> {
  logger.info("Background script chargé et prêt à s'initialiser.");

  // Configurer les écouteurs d'événements
  setupEventListeners();

  // Initialiser le client MCP et l'agent
  try {
    const success = await mcpService.initializeOrReinitializeMcpClient();
    logger.info(`Initialisation initiale MCP ${success ? 'réussie' : 'échouée'}.`);
  } catch (error) {
    logger.error("Erreur lors de l'initialisation:", error);
  }
}

// Lancer l'initialisation
initialize().catch(error => {
  logger.error("Erreur fatale lors de l'initialisation du background script:", error);
});
