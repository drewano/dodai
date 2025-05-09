/**
 * Configuration de l'extension d'autocomplétion inline
 */

import type { InlineAssistConfig } from './types';

// Configuration par défaut
export const CONFIG: InlineAssistConfig = {
  debounceDelay: 300, // Délai avant d'afficher une suggestion (ms)
  suggestionClass: 'dodai-inline-suggestion',
  suggestionContainerClass: 'dodai-suggestion-container',
  maxPageContentLength: 10000, // Longueur maximale du contenu de la page à envoyer
};
