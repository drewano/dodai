/**
 * Gestionnaire des événements pour l'extension d'autocomplétion inline
 */

import { stateManager } from '../state';
import { CONFIG } from '../config';
import { isEditableElement } from '../utils/element-utils';
import { showSuggestion, removeSuggestion, acceptSuggestion } from './suggestion-manager';
import { requestCompletion } from '../services/api-service';
import { extractPageContent } from '../utils/dom-utils';

/**
 * Gestionnaire pour l'événement focusin
 */
export function handleFocusIn(e: FocusEvent): void {
  const target = e.target as Element;

  if (isEditableElement(target)) {
    stateManager.activeElement = target;
    // Pas de suggestion immédiate, on attend que l'utilisateur commence à taper
  }
}

/**
 * Gestionnaire pour l'événement focusout
 */
export function handleFocusOut(): void {
  stateManager.activeElement = null;
  removeSuggestion();

  if (stateManager.debounceTimer) {
    clearTimeout(stateManager.debounceTimer);
    stateManager.debounceTimer = null;
  }
}

/**
 * Gestionnaire pour l'événement input
 */
export function handleInput(e: Event): void {
  const target = e.target as Element;

  if (!isEditableElement(target) || target !== stateManager.activeElement) return;

  // Nettoyer tout timer existant
  if (stateManager.debounceTimer) {
    clearTimeout(stateManager.debounceTimer);
  }

  // Supprimer la suggestion précédente
  removeSuggestion();

  // Attendre un moment avant de demander une suggestion
  stateManager.debounceTimer = setTimeout(() => {
    requestSuggestion();
  }, CONFIG.debounceDelay);
}

/**
 * Gestionnaire pour l'événement keydown
 */
export function handleKeyDown(e: KeyboardEvent): void {
  const target = e.target as Element;

  if (!isEditableElement(target) || target !== stateManager.activeElement) return;

  // Accepter la suggestion si Tab est pressé et qu'une suggestion est affichée
  if (e.key === 'Tab' && stateManager.currentSuggestion && !stateManager.isProcessingTab) {
    if (stateManager.suggestionElement) {
      stateManager.isProcessingTab = true;
      const accepted = acceptSuggestion();

      if (accepted) {
        // Empêcher le comportement par défaut de Tab (changement de focus)
        e.preventDefault();
      }

      stateManager.isProcessingTab = false;
    }
  }

  // Supprimer la suggestion si Escape est pressé
  if (e.key === 'Escape' && stateManager.suggestionElement) {
    removeSuggestion();
    e.preventDefault();
  }
}

/**
 * Envoie une requête d'autocomplétion
 */
async function requestSuggestion(): Promise<void> {
  if (!stateManager.activeElement || stateManager.isWaitingForSuggestion || !stateManager.isEnabled) return;

  const text = stateManager.activeElement.value;
  const cursorPos = stateManager.activeElement.selectionStart || 0;

  // Vérifier que le texte n'est pas vide et que le curseur n'est pas au début
  if (!text || cursorPos === 0) return;

  // Texte avant et après le curseur (pour le contexte)
  const textBeforeCursor = text.substring(0, cursorPos);
  const textAfterCursor = text.substring(cursorPos);

  // Si le contenu de la page n'a pas encore été extrait, le faire maintenant
  if (!stateManager.pageContent) {
    stateManager.pageContent = extractPageContent();
  }

  // Marquer qu'on attend une suggestion
  stateManager.isWaitingForSuggestion = true;

  try {
    // Envoyer la requête au background script
    const response = await requestCompletion({
      currentText: textBeforeCursor,
      surroundingText: {
        preceding: textBeforeCursor,
        succeeding: textAfterCursor,
      },
      pageContent: stateManager.pageContent,
      selectedModel: stateManager.selectedModel,
    });

    // Mettre à jour l'état
    stateManager.isWaitingForSuggestion = false;

    // Afficher la suggestion si succès
    if (response.success && response.completion) {
      showSuggestion(response.completion);
    } else if (response.error) {
      console.warn('Erreur lors de la génération de suggestion:', response.error);
    }
  } catch (error) {
    // Gérer les erreurs
    stateManager.isWaitingForSuggestion = false;
    console.error('Erreur lors de la demande de suggestion:', error);
  }
}

/**
 * Attache ou détache les écouteurs d'événements en fonction de l'état
 */
export function updateEventListeners(): void {
  // Détacher les écouteurs existants si présents
  if (stateManager.isInitialized) {
    document.removeEventListener('focusin', handleFocusIn);
    document.removeEventListener('focusout', handleFocusOut);
    document.removeEventListener('input', handleInput);
    document.removeEventListener('keydown', handleKeyDown, true);

    // Retirer toute suggestion visible
    removeSuggestion();

    stateManager.isInitialized = false;
  }

  // Si la fonctionnalité est activée, ajouter les écouteurs
  if (stateManager.isEnabled) {
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    document.addEventListener('input', handleInput);
    document.addEventListener('keydown', handleKeyDown, true);

    stateManager.isInitialized = true;
  }
}
