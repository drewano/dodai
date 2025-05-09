/**
 * Gestionnaire pour les suggestions inline
 */

import { stateManager } from '../state';
import { createSuggestionElement } from '../utils/dom-utils';
import {
  getCursorPosition,
  getElementValue,
  setElementValue,
  setCursorPosition,
  measureTextWidth,
} from '../utils/element-utils';
import type { EditableElement } from '../types';

/**
 * Affiche une suggestion à la suite du texte actuel
 */
export function showSuggestion(text: string): void {
  if (!stateManager.activeElement) return;

  // Retire toute suggestion existante
  removeSuggestion();

  // Créer l'élément de suggestion
  const suggestionElement = createSuggestionElement(text);

  // Positionner la suggestion
  positionSuggestionElement(suggestionElement, stateManager.activeElement);

  // Ajouter la suggestion au DOM
  document.body.appendChild(suggestionElement);

  // Mettre à jour l'état
  stateManager.suggestionElement = suggestionElement;
  stateManager.currentSuggestion = text;
}

/**
 * Positionne l'élément de suggestion à côté du curseur
 */
export function positionSuggestionElement(element: HTMLElement, activeElement: EditableElement): void {
  const activeRect = activeElement.getBoundingClientRect();
  const cursorPosition = getCursorPosition(activeElement);

  if (activeElement instanceof HTMLInputElement) {
    // Pour un input, on utilise la mesure précise de la largeur du texte
    const textBeforeCursor = activeElement.value.substring(0, cursorPosition);
    const textWidth = measureTextWidth(textBeforeCursor, activeElement);

    element.style.left = `${activeRect.left + textWidth + window.scrollX}px`;
    element.style.top = `${activeRect.top + window.scrollY}px`;
  } else if (activeElement instanceof HTMLTextAreaElement) {
    // Pour un textarea, on doit considérer les sauts de ligne
    // Copier les styles pour une mesure plus précise
    const styles = window.getComputedStyle(activeElement);
    const textBeforeCursor = activeElement.value.substring(0, cursorPosition);

    // Trouver le nombre de lignes avant le curseur
    const lines = textBeforeCursor.split('\n');
    const lastLine = lines[lines.length - 1];

    // Calculer la position verticale basée sur le nombre de lignes
    const lineHeight = parseFloat(styles.lineHeight) || parseFloat(styles.fontSize) * 1.2;
    const paddingTop = parseFloat(styles.paddingTop);
    const borderTop = parseFloat(styles.borderTopWidth);

    // Position verticale : hauteur de ligne * (nombre de lignes - 1) + padding + border
    const verticalOffset = (lines.length - 1) * lineHeight + paddingTop + borderTop;

    // Mesurer la largeur du texte de la dernière ligne
    const lastLineWidth = measureTextWidth(lastLine, activeElement);
    const paddingLeft = parseFloat(styles.paddingLeft);
    const borderLeft = parseFloat(styles.borderLeftWidth);

    element.style.left = `${activeRect.left + lastLineWidth + paddingLeft + borderLeft + window.scrollX}px`;
    element.style.top = `${activeRect.top + verticalOffset + window.scrollY}px`;
  } else {
    // contenteditable - encore plus complexe, approche simplifiée
    // Une approche plus précise nécessiterait de déterminer la position exacte du caret
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      element.style.left = `${rect.right + window.scrollX}px`;
      element.style.top = `${rect.top + window.scrollY}px`;
    } else {
      // Fallback si on ne peut pas obtenir la position exacte
      element.style.left = `${activeRect.left + 10 + window.scrollX}px`;
      element.style.top = `${activeRect.top + 10 + window.scrollY}px`;
    }
  }
}

/**
 * Supprime la suggestion affichée
 */
export function removeSuggestion(): void {
  if (stateManager.suggestionElement && stateManager.suggestionElement.parentNode) {
    stateManager.suggestionElement.parentNode.removeChild(stateManager.suggestionElement);
    stateManager.suggestionElement = null;
    stateManager.currentSuggestion = '';
  }
}

/**
 * Accepte la suggestion actuelle et l'insère dans le champ
 */
export function acceptSuggestion(): boolean {
  if (!stateManager.activeElement || !stateManager.currentSuggestion) return false;

  const currentValue = getElementValue(stateManager.activeElement);
  const cursorPos = getCursorPosition(stateManager.activeElement);

  // Insérer la suggestion à la position du curseur
  const newValue =
    currentValue.substring(0, cursorPos) + stateManager.currentSuggestion + currentValue.substring(cursorPos);
  setElementValue(stateManager.activeElement, newValue);

  // Repositionner le curseur après la suggestion
  const newCursorPosition = cursorPos + stateManager.currentSuggestion.length;
  setCursorPosition(stateManager.activeElement, newCursorPosition);

  removeSuggestion();
  return true;
}
