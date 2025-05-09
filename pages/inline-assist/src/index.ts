/**
 * Inline-Assist Content Script
 *
 * Détecte les champs de saisie de texte, affiche des suggestions et permet de les accepter.
 */

import { aiAgentStorage } from '../../../packages/storage/lib/impl/ai-agent-storage';

// Types d'éléments compatibles avec le script
type EditableElement = HTMLInputElement | HTMLTextAreaElement | Element;

// Configuration
const CONFIG = {
  debounceDelay: 300, // Délai avant d'afficher une suggestion (ms)
  suggestionClass: 'dodai-inline-suggestion',
  suggestionContainerClass: 'dodai-suggestion-container',
  maxPageContentLength: 10000, // Longueur maximale du contenu de la page à envoyer
};

// État global
const state = {
  activeElement: null as EditableElement | null,
  suggestionElement: null as HTMLElement | null,
  debounceTimer: null as NodeJS.Timeout | null,
  currentSuggestion: '',
  isProcessingTab: false,
  pageContent: '', // Contenu textuel de la page
  isWaitingForSuggestion: false, // Indique si on attend une suggestion du background script
  isEnabled: true, // Par défaut, sera mis à jour depuis le storage
  selectedModel: null as string | null, // Modèle sélectionné spécifiquement pour l'autocomplétion
  isInitialized: false, // Indique si les écouteurs d'événements sont attachés
};

/**
 * Vérifie si un élément est éditable
 */
function isEditableElement(element: Element | null): element is EditableElement {
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
function getElementValue(element: EditableElement): string {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.value;
  }

  // contenteditable
  return element.textContent || '';
}

/**
 * Définit la valeur d'un élément éditable
 */
function setElementValue(element: EditableElement, value: string): void {
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
function getCursorPosition(element: EditableElement): number {
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
 * Affiche une suggestion à la suite du texte actuel
 */
function showSuggestion(text: string): void {
  if (!state.activeElement) return;

  // Pour cette démo, on utilise un élément DOM flottant pour la suggestion
  removeSuggestion(); // Retire toute suggestion existante

  // Créer l'élément de suggestion
  const container = document.createElement('div');
  container.className = CONFIG.suggestionContainerClass;

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

  // Positionner la suggestion
  positionSuggestionElement(container);

  // Ajouter la suggestion au DOM
  container.appendChild(suggestion);
  document.body.appendChild(container);

  // Mettre à jour l'état
  state.suggestionElement = container;
  state.currentSuggestion = text;
}

/**
 * Positionne l'élément de suggestion à côté du curseur
 */
function positionSuggestionElement(element: HTMLElement): void {
  if (!state.activeElement) return;

  const activeRect = state.activeElement.getBoundingClientRect();
  const cursorPosition = getCursorPosition(state.activeElement);

  // Pour obtenir la position exacte du curseur, ce serait plus complexe
  // Cette méthode est une approximation simplifiée
  if (state.activeElement instanceof HTMLInputElement) {
    // Pour un input, on peut utiliser une approximation basée sur la largeur moyenne des caractères
    const textBeforeCursor = state.activeElement.value.substring(0, cursorPosition);
    const tempSpan = document.createElement('span');
    tempSpan.textContent = textBeforeCursor;
    tempSpan.style.font = window.getComputedStyle(state.activeElement).font;
    tempSpan.style.visibility = 'hidden';
    document.body.appendChild(tempSpan);
    const cursorX = tempSpan.getBoundingClientRect().width;
    document.body.removeChild(tempSpan);

    element.style.left = `${activeRect.left + cursorX + window.scrollX}px`;
    element.style.top = `${activeRect.top + window.scrollY}px`;
  } else if (state.activeElement instanceof HTMLTextAreaElement) {
    // Pour textarea, c'est plus complexe car il gère les lignes multiples
    // Approche simplifiée pour la démonstration
    element.style.left = `${activeRect.left + 10 + window.scrollX}px`;
    element.style.top = `${activeRect.top + 10 + window.scrollY}px`;
  } else {
    // contenteditable - encore plus complexe
    element.style.left = `${activeRect.left + 10 + window.scrollX}px`;
    element.style.top = `${activeRect.top + 10 + window.scrollY}px`;
  }
}

/**
 * Supprime la suggestion affichée
 */
function removeSuggestion(): void {
  if (state.suggestionElement && state.suggestionElement.parentNode) {
    state.suggestionElement.parentNode.removeChild(state.suggestionElement);
    state.suggestionElement = null;
    state.currentSuggestion = '';
  }
}

/**
 * Accepte la suggestion actuelle et l'insère dans le champ
 */
function acceptSuggestion(): boolean {
  if (!state.activeElement || !state.currentSuggestion) return false;

  const currentValue = getElementValue(state.activeElement);
  const cursorPos = getCursorPosition(state.activeElement);

  // Insérer la suggestion à la position du curseur
  const newValue = currentValue.substring(0, cursorPos) + state.currentSuggestion + currentValue.substring(cursorPos);
  setElementValue(state.activeElement, newValue);

  // Repositionner le curseur après la suggestion
  if (state.activeElement instanceof HTMLInputElement || state.activeElement instanceof HTMLTextAreaElement) {
    state.activeElement.selectionStart = cursorPos + state.currentSuggestion.length;
    state.activeElement.selectionEnd = cursorPos + state.currentSuggestion.length;
  }

  removeSuggestion();
  return true;
}

/**
 * Extrait le contenu textuel principal de la page
 */
function extractPageContent(): string {
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

/**
 * Envoie une requête d'autocomplétion au background script
 */
function requestSuggestion(): void {
  if (!state.activeElement || state.isWaitingForSuggestion || !state.isEnabled) return;

  const text = getElementValue(state.activeElement);
  const cursorPos = getCursorPosition(state.activeElement);

  // Vérifier que le texte n'est pas vide et que le curseur n'est pas au début
  if (!text || cursorPos === 0) return;

  // Texte avant et après le curseur (pour le contexte)
  const textBeforeCursor = text.substring(0, cursorPos);
  const textAfterCursor = text.substring(cursorPos);

  // Si le contenu de la page n'a pas encore été extrait, le faire maintenant
  if (!state.pageContent) {
    state.pageContent = extractPageContent();
  }

  // Marquer qu'on attend une suggestion
  state.isWaitingForSuggestion = true;

  // Envoyer la requête au background script
  chrome.runtime.sendMessage(
    {
      type: 'GET_INLINE_COMPLETION_REQUEST',
      currentText: textBeforeCursor,
      surroundingText: {
        preceding: textBeforeCursor,
        succeeding: textAfterCursor,
      },
      pageContent: state.pageContent,
      selectedModel: state.selectedModel,
    },
    response => {
      state.isWaitingForSuggestion = false;

      if (response && response.success && response.completion) {
        showSuggestion(response.completion);
      } else if (response && response.error) {
        console.warn('Erreur lors de la génération de suggestion:', response.error);
      }
    },
  );
}

/**
 * Gestionnaire pour l'événement focusin
 */
function handleFocusIn(e: FocusEvent): void {
  const target = e.target as Element;

  if (isEditableElement(target)) {
    state.activeElement = target;
    // Pas de suggestion immédiate, on attend que l'utilisateur commence à taper
  }
}

/**
 * Gestionnaire pour l'événement focusout
 */
function handleFocusOut(): void {
  state.activeElement = null;
  removeSuggestion();

  if (state.debounceTimer) {
    clearTimeout(state.debounceTimer);
    state.debounceTimer = null;
  }
}

/**
 * Gestionnaire pour l'événement input
 */
function handleInput(e: Event): void {
  const target = e.target as Element;

  if (!isEditableElement(target) || target !== state.activeElement) return;

  // Nettoyer tout timer existant
  if (state.debounceTimer) {
    clearTimeout(state.debounceTimer);
  }

  // Supprimer la suggestion précédente
  removeSuggestion();

  // Attendre un moment avant de demander une suggestion
  state.debounceTimer = setTimeout(() => {
    requestSuggestion();
  }, CONFIG.debounceDelay);
}

/**
 * Gestionnaire pour l'événement keydown
 */
function handleKeyDown(e: KeyboardEvent): void {
  const target = e.target as Element;

  if (!isEditableElement(target) || target !== state.activeElement) return;

  // Accepter la suggestion si Tab est pressé et qu'une suggestion est affichée
  if (e.key === 'Tab' && state.currentSuggestion && !state.isProcessingTab) {
    if (state.suggestionElement) {
      state.isProcessingTab = true;
      const accepted = acceptSuggestion();

      if (accepted) {
        // Empêcher le comportement par défaut de Tab (changement de focus)
        e.preventDefault();
      }

      state.isProcessingTab = false;
    }
  }

  // Supprimer la suggestion si Escape est pressé
  if (e.key === 'Escape' && state.suggestionElement) {
    removeSuggestion();
    e.preventDefault();
  }
}

/**
 * Ajoute les styles CSS nécessaires
 */
function injectStyles(): void {
  const style = document.createElement('style');
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
 * Attache ou détache les écouteurs d'événements en fonction de l'état
 */
function updateEventListeners(): void {
  // Détacher les écouteurs existants si présents
  if (state.isInitialized) {
    document.removeEventListener('focusin', handleFocusIn);
    document.removeEventListener('focusout', handleFocusOut);
    document.removeEventListener('input', handleInput);
    document.removeEventListener('keydown', handleKeyDown, true);

    // Retirer toute suggestion visible
    removeSuggestion();

    state.isInitialized = false;
  }

  // Si la fonctionnalité est activée, ajouter les écouteurs
  if (state.isEnabled) {
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    document.addEventListener('input', handleInput);
    document.addEventListener('keydown', handleKeyDown, true);

    state.isInitialized = true;
  }
}

/**
 * Surveille les changements de configuration dans le storage
 */
function setupStorageListener(): void {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;

    let configChanged = false;

    // Vérifier les changements de configuration liés à l'autocomplétion
    if (changes['ai-agent-settings']) {
      const newValue = changes['ai-agent-settings'].newValue;

      // Vérifier si l'activation/désactivation a changé
      if (newValue && newValue.inlineAssistEnabled !== state.isEnabled) {
        state.isEnabled = newValue.inlineAssistEnabled;
        configChanged = true;
      }

      // Vérifier si le modèle a changé
      if (newValue && newValue.inlineAssistModel !== state.selectedModel) {
        state.selectedModel = newValue.inlineAssistModel;
      }
    }

    // Si la configuration a changé, mettre à jour les écouteurs d'événements
    if (configChanged) {
      updateEventListeners();
    }
  });
}

/**
 * Initialisation: charge les paramètres et configure les écouteurs
 */
async function init(): Promise<void> {
  // Injection des styles
  injectStyles();

  // Extraire le contenu de la page
  state.pageContent = extractPageContent();

  // Charger la configuration depuis le stockage
  try {
    const settings = await aiAgentStorage.get();
    state.isEnabled = settings.inlineAssistEnabled && settings.isEnabled;
    state.selectedModel = settings.inlineAssistModel;

    // Configurer les écouteurs d'événements en fonction de la configuration
    updateEventListeners();

    // Configurer l'écouteur pour les changements de configuration
    setupStorageListener();

    console.log(`Inline-Assist content script loaded (${state.isEnabled ? 'enabled' : 'disabled'})`);
  } catch (error) {
    console.error('Erreur lors du chargement de la configuration:', error);
    // Par défaut, activer la fonctionnalité en cas d'erreur
    state.isEnabled = true;
    updateEventListeners();
  }
}

// Démarrer l'extension
init();
