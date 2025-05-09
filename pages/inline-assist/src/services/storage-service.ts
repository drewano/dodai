/**
 * Service de stockage pour l'extension d'autocomplétion inline
 */

import { aiAgentStorage } from '../../../../packages/storage/lib/impl/ai-agent-storage';
import { stateManager } from '../state';

/**
 * Charge la configuration initiale depuis le stockage
 */
export async function loadInitialSettings(): Promise<void> {
  try {
    const settings = await aiAgentStorage.get();

    // Mettre à jour l'état global
    stateManager.isEnabled = settings.inlineAssistEnabled && settings.isEnabled;
    stateManager.selectedModel = settings.inlineAssistModel;

    console.log(`Inline-Assist content script loaded (${stateManager.isEnabled ? 'enabled' : 'disabled'})`);
  } catch (error) {
    console.error('Erreur lors du chargement de la configuration:', error);
    // Par défaut, activer la fonctionnalité en cas d'erreur
    stateManager.isEnabled = true;
  }
}

/**
 * Configure un écouteur pour les changements dans le stockage
 * @returns Une fonction qui indique si la configuration a changé
 */
export function setupStorageListener(): () => boolean {
  let configChanged = false;

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;

    configChanged = false;

    // Vérifier les changements de configuration liés à l'autocomplétion
    if (changes['ai-agent-settings']) {
      const newValue = changes['ai-agent-settings'].newValue;

      // Vérifier si l'activation/désactivation a changé
      if (newValue && newValue.inlineAssistEnabled !== stateManager.isEnabled) {
        stateManager.isEnabled = newValue.inlineAssistEnabled;
        configChanged = true;
      }

      // Vérifier si le modèle a changé
      if (newValue && newValue.inlineAssistModel !== stateManager.selectedModel) {
        stateManager.selectedModel = newValue.inlineAssistModel;
      }
    }
  });

  // Retourne une fonction qui indique si la configuration a changé
  return () => configChanged;
}
