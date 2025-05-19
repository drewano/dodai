import { useState, useEffect, useCallback } from 'react';
import { MessageType } from '../../../../chrome-extension/src/background/types';

/**
 * Hook qui gère l'état de la connexion à l'agent IA
 */
export function useAgentStatus() {
  const [isReady, setIsReady] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Vérifie si l'agent est prêt
  const checkAgentStatus = useCallback(async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: MessageType.CHECK_AGENT_STATUS,
      });

      if (response && response.success) {
        setIsReady(response.isReady);
        if (response.isReady) {
          setConnectionError(null);
        } else {
          setConnectionError(
            "L'agent IA n'est pas disponible. Vérifiez qu'Ollama est en cours d'exécution et qu'un modèle est installé.",
          );
        }
      } else {
        setIsReady(false);
        setConnectionError(response?.error || "Impossible de vérifier l'état de l'agent IA.");
      }
    } catch (error) {
      console.error('Error checking agent status:', error);
      setIsReady(false);
      setConnectionError("Impossible de vérifier l'état de l'agent IA.");
    }
  }, []);

  // Vérifier l'état de l'agent au montage et périodiquement
  useEffect(() => {
    checkAgentStatus();

    // Vérifier toutes les 10 secondes
    const interval = setInterval(checkAgentStatus, 10000);
    return () => clearInterval(interval);
  }, [checkAgentStatus]);

  return {
    isReady,
    connectionError,
    checkAgentStatus,
  };
}
