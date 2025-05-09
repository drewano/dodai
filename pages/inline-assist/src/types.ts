/**
 * Types pour l'extension d'autocomplétion inline
 */

// Types d'éléments compatibles avec le script
export type EditableElement = HTMLInputElement | HTMLTextAreaElement | Element;

// Configuration de l'extension
export interface InlineAssistConfig {
  debounceDelay: number;
  suggestionClass: string;
  suggestionContainerClass: string;
  maxPageContentLength: number;
}

// État global de l'extension
export interface InlineAssistState {
  activeElement: EditableElement | null;
  suggestionElement: HTMLElement | null;
  debounceTimer: NodeJS.Timeout | null;
  currentSuggestion: string;
  isProcessingSuggestion: boolean;
  pageContent: string;
  isWaitingForSuggestion: boolean;
  isEnabled: boolean;
  selectedModel: string | null;
  isInitialized: boolean;
}

// Interface pour une requête d'autocomplétion
export interface CompletionRequest {
  currentText: string;
  surroundingText: {
    preceding: string;
    succeeding: string;
  };
  pageContent: string;
  selectedModel?: string | null;
}

// Interface pour la réponse d'autocomplétion
export interface CompletionResponse {
  success: boolean;
  completion?: string;
  error?: string;
  model?: string;
}
