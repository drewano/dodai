import { useState, useEffect, useCallback } from 'react';
import { aiAgentStorage } from '@extension/storage';
import { useStorage } from '@extension/shared';
import { MessageType } from '../../../chrome-extension/src/background/types';

interface OllamaModelInfo {
  id: string;
  name: string;
  model: string;
  modified_at: string;
}

/**
 * AIAgentOptions component for configuring the Ollama model settings
 */
export const AIAgentOptions = () => {
  const settings = useStorage(aiAgentStorage);
  const [availableModels, setAvailableModels] = useState<OllamaModelInfo[]>([]);
  const [isServerRunning, setIsServerRunning] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const checkOllamaServer = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      // Vérifier si l'agent est prêt via le background script
      const statusResponse = await chrome.runtime.sendMessage({
        type: MessageType.CHECK_AGENT_STATUS,
      });

      if (statusResponse && statusResponse.success) {
        setIsServerRunning(statusResponse.isReady);

        if (statusResponse.isReady) {
          // Récupérer les modèles disponibles via le background script
          const modelsResponse = await chrome.runtime.sendMessage({
            type: MessageType.GET_AVAILABLE_MODELS,
            baseUrl: settings.baseUrl,
          });

          if (modelsResponse && modelsResponse.success) {
            setAvailableModels(modelsResponse.models || []);

            if (modelsResponse.models.length === 0) {
              setError('Aucun modèle n\'est installé. Installez un modèle avec la commande "ollama pull llama3".');
            }
          } else {
            setError('Erreur lors de la récupération des modèles: ' + (modelsResponse?.error || 'Erreur inconnue'));
          }
        } else {
          setError("Ollama n'est pas en cours d'exécution. Veuillez démarrer le serveur Ollama.");
        }
      } else {
        setIsServerRunning(false);
        setError("Impossible de vérifier l'état d'Ollama. " + (statusResponse?.error || 'Erreur inconnue'));
      }
    } catch (err) {
      console.error('Error checking Ollama server:', err);
      setIsServerRunning(false);
      setError("Impossible de se connecter à Ollama. Vérifiez qu'il est bien installé et lancé.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [settings.baseUrl]);

  useEffect(() => {
    checkOllamaServer();

    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      if (!isRefreshing) {
        checkOllamaServer();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [checkOllamaServer, isRefreshing]);

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    aiAgentStorage.updateModel(e.target.value);
  };

  const handleTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    aiAgentStorage.updateTemperature(parseFloat(e.target.value));
  };

  const handleBaseUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    aiAgentStorage.updateBaseUrl(e.target.value);
  };

  const handleEnableToggle = () => {
    aiAgentStorage.toggleEnabled();
  };

  const handleRefresh = () => {
    setIsLoading(true);
    checkOllamaServer();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[240px] bg-gray-800/30">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: '0s' }} />
          <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: '0.2s' }} />
          <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: '0.4s' }} />
        </div>
        <p className="mt-4 text-gray-400 text-sm">Vérification d'Ollama...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center p-5 border-b border-gray-800">
        <h2 className="text-lg font-medium text-blue-400">Paramètres de l'Agent IA</h2>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center
                    bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-800/50 disabled:opacity-50">
          {isRefreshing ? (
            <svg
              className="animate-spin h-3.5 w-3.5 mr-1.5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg
              className="h-3.5 w-3.5 mr-1.5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          )}
          Rafraîchir
        </button>
      </div>

      <div className="p-5 space-y-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-900/50 bg-red-900/20 text-red-400 overflow-hidden">
            <div className="p-3 flex items-start">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0 text-red-500"
                viewBox="0 0 20 20"
                fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="font-medium text-sm">{error}</p>
                <div className="mt-2 text-xs space-y-1">
                  <p className="font-medium text-red-300">Suggestions:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Vérifiez qu'Ollama est installé (
                      <a
                        href="https://ollama.ai/download"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline">
                        télécharger Ollama
                      </a>
                      )
                    </li>
                    <li>
                      Lancez Ollama depuis le terminal avec la commande{' '}
                      <code className="px-1.5 py-0.5 rounded bg-red-900/30 text-red-300 font-mono text-xs">
                        ollama serve
                      </code>
                    </li>
                    <li>
                      Si aucun modèle n'est installé, exécutez{' '}
                      <code className="px-1.5 py-0.5 rounded bg-red-900/30 text-red-300 font-mono text-xs">
                        ollama pull llama3
                      </code>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {!isServerRunning && !error && (
          <div className="mb-4 rounded-lg border border-yellow-700/50 bg-yellow-800/20 text-yellow-400 overflow-hidden">
            <div className="p-3 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-3 flex-shrink-0 text-yellow-500"
                viewBox="0 0 20 20"
                fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm">Ollama n'est pas en cours d'exécution. Veuillez démarrer le serveur Ollama.</p>
            </div>
          </div>
        )}

        {isServerRunning && (
          <div className="mb-4 rounded-lg border border-green-800/50 bg-green-900/20 text-green-400 overflow-hidden">
            <div className="p-3 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-3 flex-shrink-0 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm">Ollama est en cours d'exécution et prêt à être utilisé.</p>
            </div>
          </div>
        )}

        <div className="grid gap-6">
          <div className="flex items-center">
            <div className="relative inline-flex h-5 w-10 items-center">
              <input
                type="checkbox"
                id="enable-agent"
                checked={settings.isEnabled}
                onChange={handleEnableToggle}
                disabled={!isServerRunning}
                className="peer sr-only"
              />
              <div className="h-4 w-9 rounded-full bg-gray-700 peer-focus:ring-2 peer-focus:ring-blue-600 peer-focus:ring-offset-1 peer-focus:ring-offset-gray-900 peer-checked:bg-blue-900"></div>
              <div className="absolute left-0.5 h-3.5 w-3.5 rounded-full bg-gray-400 transition-all peer-checked:left-5 peer-checked:bg-blue-400"></div>
            </div>
            <label htmlFor="enable-agent" className="ml-3 text-sm font-medium text-gray-300 select-none">
              Activer l'Agent IA
            </label>
          </div>

          <div className="space-y-2">
            <label htmlFor="model-select" className="block text-sm font-medium text-gray-300">
              Modèle
            </label>
            <select
              id="model-select"
              value={settings.selectedModel}
              onChange={handleModelChange}
              className="w-full py-2 px-3 rounded-md border border-gray-700 bg-gray-800 text-gray-300 text-sm
                        focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent
                        disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={!isServerRunning || !settings.isEnabled}>
              {availableModels.length === 0 && <option value="">Aucun modèle disponible</option>}
              {availableModels.map(model => (
                <option key={model.id} value={model.name}>
                  {model.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">
              {availableModels.length === 0 && isServerRunning
                ? 'Installez des modèles avec la commande "ollama pull [nom_du_modèle]"'
                : "Sélectionnez le modèle à utiliser pour l'agent IA"}
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Température (<span className="text-blue-400">{settings.temperature.toFixed(1)}</span>)
            </label>
            <div className="px-1">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.temperature}
                onChange={handleTemperatureChange}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-gray-700 disabled:opacity-50
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-blue-500 
                          [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full"
                disabled={!isServerRunning || !settings.isEnabled}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1.5 px-0.5">
                <span>Précis</span>
                <span>Créatif</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="server-url" className="block text-sm font-medium text-gray-300">
              URL du serveur Ollama
            </label>
            <input
              id="server-url"
              type="text"
              value={settings.baseUrl}
              onChange={handleBaseUrlChange}
              className="w-full py-2 px-3 rounded-md border border-gray-700 bg-gray-800 text-gray-300 text-sm
                        focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent
                        disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={!settings.isEnabled}
            />
            <p className="text-xs text-gray-500">URL du serveur Ollama (par défaut: http://localhost:11434)</p>
          </div>
        </div>
      </div>
    </div>
  );
};
