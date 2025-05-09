/**
 * Inline-Assist Content Script
 *
 * Détecte les champs de saisie de texte, affiche des suggestions et permet de les accepter.
 */

import { injectStyles, extractPageContent } from './utils/dom-utils';
import { loadInitialSettings, setupStorageListener } from './services/storage-service';
import { updateEventListeners } from './managers/event-manager';
import { stateManager } from './state';

/**
 * Initialisation: charge les paramètres et configure les écouteurs
 */
async function init(): Promise<void> {
  try {
    // Injection des styles CSS
    injectStyles();

    // Extraire le contenu de la page
    stateManager.pageContent = extractPageContent();

    // Charger la configuration depuis le stockage
    await loadInitialSettings();

    // Configurer les écouteurs d'événements en fonction de l'état
    updateEventListeners();

    // Configurer l'écouteur pour les changements de configuration
    setupStorageListener();

    // S'abonner aux changements d'état qui nécessitent de mettre à jour les écouteurs
    stateManager.subscribe('isEnabled', () => {
      updateEventListeners();
    });

    console.log(`Inline-Assist content script loaded (${stateManager.isEnabled ? 'enabled' : 'disabled'})`);
  } catch (error) {
    console.error("Erreur lors de l'initialisation de l'Inline-Assist:", error);

    // Par défaut, activer la fonctionnalité en cas d'erreur
    stateManager.isEnabled = true;
    updateEventListeners();
  }
}

// Démarrer l'extension
init();
