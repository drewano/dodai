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
    // Approche améliorée pour les textarea
    const styles = window.getComputedStyle(activeElement);
    const textBeforeCursor = activeElement.value.substring(0, cursorPosition);

    // Créer un élément miroir pour calculer précisément la position
    const mirror = document.createElement('div');
    mirror.style.position = 'absolute';
    mirror.style.top = '0';
    mirror.style.left = '0';
    mirror.style.visibility = 'hidden';
    mirror.style.overflow = 'hidden';
    mirror.style.width = `${activeElement.clientWidth}px`;
    mirror.style.height = 'auto';

    // Copier tous les styles qui affectent le texte
    mirror.style.fontFamily = styles.fontFamily;
    mirror.style.fontSize = styles.fontSize;
    mirror.style.fontWeight = styles.fontWeight;
    mirror.style.letterSpacing = styles.letterSpacing;
    mirror.style.lineHeight = styles.lineHeight;
    mirror.style.textTransform = styles.textTransform;
    mirror.style.whiteSpace = styles.whiteSpace;
    mirror.style.wordSpacing = styles.wordSpacing;
    mirror.style.padding = styles.padding;
    mirror.style.border = styles.border;
    mirror.style.boxSizing = styles.boxSizing;

    // Préparer le contenu du miroir
    const textUpToCursor = document.createTextNode(textBeforeCursor);
    const cursorSpan = document.createElement('span');
    cursorSpan.id = 'mirror-cursor-marker';
    mirror.appendChild(textUpToCursor);
    mirror.appendChild(cursorSpan);

    document.body.appendChild(mirror);

    // Obtenir la position précise du marqueur de curseur
    const markerRect = cursorSpan.getBoundingClientRect();

    // Calcul de la position absolue en tenant compte du défilement de l'élément
    const cursorX = markerRect.left - mirror.getBoundingClientRect().left;
    const cursorY = markerRect.top - mirror.getBoundingClientRect().top;

    // Nettoyer
    document.body.removeChild(mirror);

    element.style.left = `${activeRect.left + cursorX - activeElement.scrollLeft + window.scrollX}px`;
    element.style.top = `${activeRect.top + cursorY - activeElement.scrollTop + window.scrollY}px`;
  } else {
    // contenteditable - utiliser l'API de sélection pour plus de précision
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

  // Calculer la nouvelle position du curseur avant de modifier la valeur
  const newCursorPosition = cursorPos + stateManager.currentSuggestion.length;

  // Pour les éléments contenteditable, approche spéciale
  if (
    !(stateManager.activeElement instanceof HTMLInputElement) &&
    !(stateManager.activeElement instanceof HTMLTextAreaElement)
  ) {
    // Si c'est un contenteditable, on utilise un Range pour une meilleure précision
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      // On sauvegarde l'ancienne plage pour pouvoir la restaurer si nécessaire
      const oldRange = selection.getRangeAt(0).cloneRange();

      // Mettre à jour le contenu
      setElementValue(stateManager.activeElement, newValue);

      // Maintenant, on force le focus et la position du curseur
      if (stateManager.activeElement instanceof HTMLElement) {
        stateManager.activeElement.focus();
      }

      // On crée une nouvelle plage à la position souhaitée
      try {
        // Positionner le curseur après la suggestion insérée
        setCursorPosition(stateManager.activeElement, newCursorPosition);
      } catch {
        // Si ça échoue, on essaie de restaurer la plage originale avec un décalage
        try {
          console.warn('Positionnement du curseur échoué, tentative de fallback');
          const range = document.createRange();
          range.setStart(oldRange.startContainer, oldRange.startOffset + stateManager.currentSuggestion.length);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        } catch (innerError) {
          console.error('Échec du positionnement du curseur:', innerError);
        }
      }
    } else {
      // Fallback si pas de sélection
      setElementValue(stateManager.activeElement, newValue);
      setCursorPosition(stateManager.activeElement, newCursorPosition);
    }
  } else {
    // Pour input et textarea standards
    setElementValue(stateManager.activeElement, newValue);

    // Forcer un timeout pour permettre au navigateur de mettre à jour la valeur d'abord
    setTimeout(() => {
      // Vérifier que l'élément existe toujours
      if (stateManager.activeElement) {
        setCursorPosition(stateManager.activeElement, newCursorPosition);
        // Double-vérification pour les textarea qui peuvent être problématiques
        if (stateManager.activeElement instanceof HTMLTextAreaElement) {
          stateManager.activeElement.setSelectionRange(newCursorPosition, newCursorPosition);
        }
      }
    }, 0);
  }

  removeSuggestion();
  return true;
}
