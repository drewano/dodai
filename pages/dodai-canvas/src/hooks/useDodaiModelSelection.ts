import { useState, useEffect, useCallback } from 'react';
import { MessageType } from '../../../../chrome-extension/src/background/types';
import { dodaiCanvasConfigStorage } from '@extension/storage';
import { useDodai } from '../contexts/DodaiContext';

// Define the model info interface (similar to AIAgentOptions.tsx)
export interface OllamaModelInfo {
  id: string; // Often the same as name or a unique identifier like model + digest
  name: string; // e.g., "llama3:latest"
  model: string; // e.g., "llama3:latest"
  modified_at: string; // ISO date string
  size?: number; // Optional size in bytes
}

export function useDodaiModelSelection() {
  const [availableModels, setAvailableModels] = useState<OllamaModelInfo[]>([]);
  const [selectedDodaiModelState, setSelectedDodaiModelState] = useState<string | null>(null);
  const [loadingModels, setLoadingModels] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { setSelectedDodaiModel: setModelInContext, selectedDodaiModel: modelFromContext } = useDodai();

  // Fetch available models from the background script
  const fetchAvailableModels = useCallback(async () => {
    setLoadingModels(true);
    setError(null);
    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.GET_AVAILABLE_MODELS,
        // baseUrl can be omitted if background defaults or gets it from global aiAgentStorage
      });

      if (response && response.success && Array.isArray(response.models)) {
        setAvailableModels(response.models as OllamaModelInfo[]);
        if (response.models.length === 0) {
          setError("Aucun modèle Ollama n'est disponible ou installé.");
        }
      } else {
        setError(`Erreur lors de la récupération des modèles: ${response?.error || 'Format de réponse inattendu.'}`);
        setAvailableModels([]); // Ensure it's an empty array on error
      }
    } catch (err) {
      console.error('Erreur communication avec le background pour GET_AVAILABLE_MODELS:', err);
      setError(
        `Impossible de récupérer les modèles. Vérifiez la console du service worker. Erreur: ${err instanceof Error ? err.message : String(err)}`,
      );
      setAvailableModels([]);
    } finally {
      setLoadingModels(false);
    }
  }, []);

  // Load selected model from dodaiCanvasConfigStorage and update context
  const loadSelectedModel = useCallback(async () => {
    try {
      const settings = await dodaiCanvasConfigStorage.get();
      setSelectedDodaiModelState(settings.selectedModel);
      if (setModelInContext && typeof setModelInContext === 'function') {
        setModelInContext(settings.selectedModel);
      }
    } catch (err) {
      console.error('Erreur lors du chargement du modèle sélectionné pour Dodai Canvas:', err);
      setError('Impossible de charger la préférence du modèle sélectionné.');
    }
  }, [setModelInContext]);

  // Handle model change, persist to storage, and update context
  const handleModelChange = useCallback(
    async (modelName: string | null) => {
      setSelectedDodaiModelState(modelName);
      try {
        await dodaiCanvasConfigStorage.updateSelectedModel(modelName);
        if (setModelInContext && typeof setModelInContext === 'function') {
          setModelInContext(modelName);
        }
      } catch (err) {
        console.error('Erreur lors de la sauvegarde du modèle sélectionné pour Dodai Canvas:', err);
        // Optionally revert UI change or show error to user
        setError('Erreur lors de la sauvegarde du modèle.');
      }
    },
    [setModelInContext],
  );

  useEffect(() => {
    fetchAvailableModels();
    loadSelectedModel();
  }, [fetchAvailableModels, loadSelectedModel]);

  // Sync local state if context changes (e.g. initial load or external update)
  useEffect(() => {
    if (modelFromContext !== selectedDodaiModelState) {
      setSelectedDodaiModelState(modelFromContext);
    }
  }, [modelFromContext, selectedDodaiModelState]);

  return {
    availableModels,
    selectedDodaiModel: selectedDodaiModelState,
    loadingModels,
    error,
    handleModelChange,
    fetchAvailableModels, // Expose if manual refresh is needed
  };
}
