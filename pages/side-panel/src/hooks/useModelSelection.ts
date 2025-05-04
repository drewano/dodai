import { useState, useRef, useEffect, useCallback } from 'react';
import { aiAgentStorage } from '@extension/storage';
import { aiAgent } from '@extension/shared/lib/services/ai-agent';

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
      // L'API correcte d'Ollama pour obtenir les modèles
      const response = await fetch(`${baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      // La structure de la réponse d'Ollama : { models: [{ name: "llama3", ... }, ...] }
      if (data && Array.isArray(data.models)) {
        // Extraire juste les noms des modèles
        const modelNames = data.models.map((model: any) => model.name);
        if (modelNames.length > 0) {
          setAvailableModels(modelNames);
        }
      } else {
        // Fallback si la structure n'est pas comme attendu
        console.warn('Format de réponse Ollama inattendu:', data);
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

      // Forcer le rechargement immédiat des paramètres
      await aiAgent.loadSettings();

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
