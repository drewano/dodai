import { useState, useEffect, useCallback } from 'react';
import { aiAgent } from '@extension/shared/lib/services/ai-agent';

/**
 * Hook qui gère l'état de la connexion à l'agent IA
 */
export function useAgentStatus() {
  const [isReady, setIsReady] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Vérifie si l'agent est prêt
  const checkAgentStatus = useCallback(async () => {
    try {
      const ready = await aiAgent.isReady();
      setIsReady(ready);
      if (ready) {
        setConnectionError(null);
      } else {
        setConnectionError(
          "L'agent IA n'est pas disponible. Vérifiez qu'Ollama est en cours d'exécution et qu'un modèle est installé.",
        );
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
