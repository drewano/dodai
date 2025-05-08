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
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState<boolean>(true);
  const [showModelDropdown, setShowModelDropdown] = useState<boolean>(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Fonction pour récupérer les modèles disponibles depuis Ollama
  const fetchAvailableModels = useCallback(async () => {
    try {
      // Récupérer les paramètres depuis le stockage
      const settings = await aiAgentStorage.get();
      const url = settings.baseUrl || 'http://localhost:11434';

      setLoadingModels(true);

      // Utiliser le message runtime pour obtenir les modèles avec une structure simple
      const response = await chrome.runtime.sendMessage({
        type: MessageType.GET_AVAILABLE_MODELS,
        baseUrl: url.toString().trim(),
      });

      if (response && response.success && Array.isArray(response.models)) {
        // Extraire juste les noms des modèles
        const modelNames = response.models.map((model: OllamaModel) => model.name);
        if (modelNames.length > 0) {
          setAvailableModels(modelNames);
          console.log('Modèles récupérés avec succès:', modelNames);
        } else {
          // Fallback vers une liste par défaut si aucun modèle n'est trouvé
          setAvailableModels(['llama3', 'llama3:8b', 'llama3:70b', 'mistral', 'mixtral', 'phi3', 'gemma']);
          console.warn('Aucun modèle trouvé, utilisation de la liste par défaut');
        }
      } else {
        // Fallback si la structure n'est pas comme attendu
        setAvailableModels(['llama3', 'llama3:8b', 'llama3:70b', 'mistral', 'mixtral', 'phi3', 'gemma']);
        console.warn('Format de réponse inattendu:', response);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des modèles:', error);
      // On utilise la liste par défaut en cas d'erreur
      setAvailableModels(['llama3', 'llama3:8b', 'llama3:70b', 'mistral', 'mixtral', 'phi3', 'gemma']);
    } finally {
      setLoadingModels(false);
    }
  }, []);

  // Effet pour charger les modèles au montage du composant
  useEffect(() => {
    fetchAvailableModels().catch(error => {
      console.error('Erreur lors du chargement initial des modèles:', error);
    });
  }, [fetchAvailableModels]);

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
  const toggleModelDropdown = useCallback(() => {
    if (!showModelDropdown) {
      // Rafraîchir la liste des modèles à chaque ouverture du menu déroulant
      fetchAvailableModels();
    }
    setShowModelDropdown(prev => !prev);
  }, [fetchAvailableModels, showModelDropdown]);

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
