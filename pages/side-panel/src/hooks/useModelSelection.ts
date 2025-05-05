import { useState, useRef, useEffect, useCallback } from 'react';
import { aiAgentStorage } from '@extension/storage';
import { MessageType } from '../../../../chrome-extension/src/background/types';

// Define the model interface
interface OllamaModel {
  name: string;
}

/**
 * Hook qui gère la sélection des modèles
 */
export function useModelSelection() {
  // Liste de modèles disponibles par défaut
  const [availableModels, setAvailableModels] = useState<string[]>([
    'llama3',
    'llama3:8b',
    'llama3:70b',
    'mistral',
    'mixtral',
    'phi3',
    'gemma',
    'codellama',
  ]);

  const [loadingModels, setLoadingModels] = useState<boolean>(false);
  const [showModelDropdown, setShowModelDropdown] = useState<boolean>(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Fonction pour récupérer les modèles disponibles depuis Ollama
  const fetchAvailableModels = useCallback(async (baseUrl?: string) => {
    if (!baseUrl) return;

    setLoadingModels(true);
    try {
      // Utiliser le message runtime pour obtenir les modèles
      const response = await chrome.runtime.sendMessage({
        type: MessageType.GET_AVAILABLE_MODELS,
        baseUrl,
      });

      if (response && response.success && Array.isArray(response.models)) {
        // Extraire juste les noms des modèles
        const modelNames = response.models.map((model: OllamaModel) => model.name);
        if (modelNames.length > 0) {
          setAvailableModels(modelNames);
        }
      } else {
        // Fallback si la structure n'est pas comme attendu
        console.warn('Format de réponse inattendu:', response);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des modèles:', error);
      // On garde la liste par défaut en cas d'erreur
    } finally {
      setLoadingModels(false);
    }
  }, []);

  // Fonction pour changer le modèle
  const handleModelChange = useCallback(async (model: string) => {
    try {
      await aiAgentStorage.updateModel(model);
      setShowModelDropdown(false);

      // Notifier le background script que les paramètres ont changé
      try {
        await chrome.runtime.sendMessage({
          type: MessageType.MCP_CONFIG_CHANGED,
        });
      } catch (notifyError) {
        console.error('Erreur lors de la notification du changement de modèle:', notifyError);
      }

      return {
        success: true,
        message: `Modèle changé pour ${model}. Les nouveaux messages utiliseront ce modèle.`,
      };
    } catch (error) {
      console.error('Erreur lors du changement de modèle:', error);
      return {
        success: false,
        message: 'Erreur lors du changement de modèle. Veuillez réessayer.',
      };
    }
  }, []);

  // Ouvrir/fermer le dropdown
  const toggleModelDropdown = useCallback(
    (baseUrl?: string) => {
      if (!showModelDropdown && baseUrl) {
        fetchAvailableModels(baseUrl);
      }
      setShowModelDropdown(prev => !prev);
    },
    [fetchAvailableModels, showModelDropdown],
  );

  // Fermer le dropdown quand on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return {
    availableModels,
    loadingModels,
    showModelDropdown,
    modelDropdownRef,
    fetchAvailableModels,
    handleModelChange,
    toggleModelDropdown,
  };
}
