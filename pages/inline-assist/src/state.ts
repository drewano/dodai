/**
 * Gestion de l'état pour l'extension d'autocomplétion inline
 */

import type { InlineAssistState, EditableElement } from './types';

// État initial
const initialState: InlineAssistState = {
  activeElement: null,
  suggestionElement: null,
  debounceTimer: null,
  currentSuggestion: '',
  isProcessingTab: false,
  pageContent: '',
  isWaitingForSuggestion: false,
  isEnabled: true, // Par défaut, sera mis à jour depuis le storage
  selectedModel: null,
  isInitialized: false,
};

// Création d'un état global encapsulé
class StateManager {
  private state: InlineAssistState;
  private listeners: Map<keyof InlineAssistState, Array<(value: InlineAssistState[keyof InlineAssistState]) => void>>;

  constructor(initialState: InlineAssistState) {
    this.state = { ...initialState };
    this.listeners = new Map();
  }

  // Getters pour les propriétés d'état
  get activeElement(): EditableElement | null {
    return this.state.activeElement;
  }

  get suggestionElement(): HTMLElement | null {
    return this.state.suggestionElement;
  }

  get debounceTimer(): NodeJS.Timeout | null {
    return this.state.debounceTimer;
  }

  get currentSuggestion(): string {
    return this.state.currentSuggestion;
  }

  get isProcessingTab(): boolean {
    return this.state.isProcessingTab;
  }

  get pageContent(): string {
    return this.state.pageContent;
  }

  get isWaitingForSuggestion(): boolean {
    return this.state.isWaitingForSuggestion;
  }

  get isEnabled(): boolean {
    return this.state.isEnabled;
  }

  get selectedModel(): string | null {
    return this.state.selectedModel;
  }

  get isInitialized(): boolean {
    return this.state.isInitialized;
  }

  // Setters avec notification des listeners
  set activeElement(value: EditableElement | null) {
    this.updateState('activeElement', value);
  }

  set suggestionElement(value: HTMLElement | null) {
    this.updateState('suggestionElement', value);
  }

  set debounceTimer(value: NodeJS.Timeout | null) {
    this.updateState('debounceTimer', value);
  }

  set currentSuggestion(value: string) {
    this.updateState('currentSuggestion', value);
  }

  set isProcessingTab(value: boolean) {
    this.updateState('isProcessingTab', value);
  }

  set pageContent(value: string) {
    this.updateState('pageContent', value);
  }

  set isWaitingForSuggestion(value: boolean) {
    this.updateState('isWaitingForSuggestion', value);
  }

  set isEnabled(value: boolean) {
    this.updateState('isEnabled', value);
  }

  set selectedModel(value: string | null) {
    this.updateState('selectedModel', value);
  }

  set isInitialized(value: boolean) {
    this.updateState('isInitialized', value);
  }

  // Méthode pour mettre à jour l'état et notifier les listeners
  private updateState<K extends keyof InlineAssistState>(key: K, value: InlineAssistState[K]): void {
    if (this.state[key] !== value) {
      this.state[key] = value;
      this.notifyListeners(key, value);
    }
  }

  // Abonnement aux changements d'état
  public subscribe<K extends keyof InlineAssistState>(
    key: K,
    callback: (value: InlineAssistState[K]) => void,
  ): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }

    const callbacks = this.listeners.get(key)!;
    callbacks.push(callback as (value: InlineAssistState[keyof InlineAssistState]) => void);

    // Retourner une fonction pour se désabonner
    return () => {
      const index = callbacks.indexOf(callback as (value: InlineAssistState[keyof InlineAssistState]) => void);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  // Notification des listeners
  private notifyListeners<K extends keyof InlineAssistState>(key: K, value: InlineAssistState[K]): void {
    const callbacks = this.listeners.get(key);
    if (callbacks) {
      callbacks.forEach(callback => callback(value as InlineAssistState[keyof InlineAssistState]));
    }
  }

  // Réinitialisation de l'état
  public reset(): void {
    Object.keys(initialState).forEach(key => {
      this.updateState(key as keyof InlineAssistState, initialState[key as keyof InlineAssistState]);
    });
  }
}

// Exporte une instance singleton du gestionnaire d'état
export const stateManager = new StateManager(initialState);
