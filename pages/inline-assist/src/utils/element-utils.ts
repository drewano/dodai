/**
 * Utilitaires pour la manipulation des éléments éditables
 */

import type { EditableElement } from '../types';

/**
 * Vérifie si un élément est éditable
 */
export function isEditableElement(element: Element | null): element is EditableElement {
  if (!element) return false;

  // Input texte ou textarea
  if (
    (element instanceof HTMLInputElement && (element.type === 'text' || element.type === 'search')) ||
    element instanceof HTMLTextAreaElement
  ) {
    return true;
  }

  // Élément avec contenteditable
  if (element.getAttribute('contenteditable') === 'true') {
    return true;
  }

  return false;
}

/**
 * Récupère la valeur d'un élément éditable
 */
export function getElementValue(element: EditableElement): string {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.value;
  }

  // contenteditable
  return element.textContent || '';
}

/**
 * Définit la valeur d'un élément éditable
 */
export function setElementValue(element: EditableElement, value: string): void {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    element.value = value;
    // Déclencher un événement input pour que les écouteurs d'événements soient notifiés
    element.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }

  // contenteditable
  element.textContent = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Obtient la position du curseur dans un élément éditable
 */
export function getCursorPosition(element: EditableElement): number {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.selectionStart || 0;
  }

  // contenteditable - plus complexe
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    return range.startOffset;
  }

  return 0;
}

/**
 * Définit la position du curseur dans un élément éditable
 */
export function setCursorPosition(element: EditableElement, position: number): void {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    element.selectionStart = position;
    element.selectionEnd = position;
    return;
  }

  // contenteditable - plus complexe
  const selection = window.getSelection();
  if (selection && element.firstChild) {
    const range = document.createRange();
    const textNode = element.firstChild;
    const maxPosition = Math.min(position, textNode.textContent?.length || 0);

    range.setStart(textNode, maxPosition);
    range.setEnd(textNode, maxPosition);

    selection.removeAllRanges();
    selection.addRange(range);
  }
}

/**
 * Mesure la largeur d'un texte dans un élément
 */
export function measureTextWidth(text: string, element: HTMLElement): number {
  // Créer un élément temporaire pour mesurer la largeur du texte
  const tempSpan = document.createElement('span');
  tempSpan.textContent = text;
  tempSpan.style.font = window.getComputedStyle(element).font;
  tempSpan.style.whiteSpace = 'pre'; // Pour préserver les espaces
  tempSpan.style.visibility = 'hidden';
  tempSpan.style.position = 'absolute';

  document.body.appendChild(tempSpan);
  const width = tempSpan.getBoundingClientRect().width;
  document.body.removeChild(tempSpan);

  return width;
}
