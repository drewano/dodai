/**
 * Utilitaires pour la manipulation du DOM
 */

import { CONFIG } from '../config';

/**
 * Injecte les styles CSS nécessaires dans la page
 */
export function injectStyles(): void {
  const styleId = 'dodai-inline-assist-styles';

  // Vérifier si les styles sont déjà injectés
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .${CONFIG.suggestionClass} {
      color: #8a8a8a;
      font-style: italic;
      background-color: rgba(180, 180, 180, 0.1);
    }
    .${CONFIG.suggestionContainerClass} {
      position: absolute;
      z-index: 10000;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Crée un élément de suggestion
 */
export function createSuggestionElement(text: string): HTMLElement {
  // Créer le conteneur
  const container = document.createElement('div');
  container.className = CONFIG.suggestionContainerClass;

  // Créer l'élément de suggestion
  const suggestion = document.createElement('span');
  suggestion.className = CONFIG.suggestionClass;
  suggestion.textContent = text;

  // Appliquer les styles
  Object.assign(container.style, {
    position: 'absolute',
    zIndex: '10000',
    pointerEvents: 'none',
  });

  Object.assign(suggestion.style, {
    color: '#8a8a8a',
    fontStyle: 'italic',
    backgroundColor: 'rgba(180, 180, 180, 0.1)',
    padding: '0 2px',
  });

  // Assembler
  container.appendChild(suggestion);

  return container;
}

/**
 * Extrait le contenu textuel principal de la page
 */
export function extractPageContent(): string {
  try {
    // Titre et URL de la page
    const title = document.title || '';
    const url = window.location.href || '';

    // Pour simplifier, on utilise le contenu textuel du body
    // Une approche plus avancée pourrait cibler plus spécifiquement les éléments principaux
    // ou utiliser des heuristiques pour ignorer les éléments de navigation, publicités, etc.
    const bodyText = document.body ? document.body.innerText : '';

    // Limiter la taille du contenu pour éviter des messages trop volumineux
    const trimmedText =
      bodyText.length > CONFIG.maxPageContentLength
        ? bodyText.substring(0, CONFIG.maxPageContentLength) + '... [contenu tronqué]'
        : bodyText;

    // Formatage du contenu
    return `[Titre de la page: ${title}]\n[URL: ${url}]\n\n${trimmedText}`;
  } catch (error) {
    console.error("Erreur lors de l'extraction du contenu de la page:", error);
    return '';
  }
}
