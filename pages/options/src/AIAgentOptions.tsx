import { useState, useEffect } from 'react';
import { aiAgentStorage } from '@extension/storage';
import { useStorage } from '@extension/shared';
import { t } from '@extension/i18n';
import { aiAgent } from '@extension/shared/lib/services/ai-agent';

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

  const checkOllamaServer = async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      // Use the AI agent to check if the server is running
      const isReady = await aiAgent.isReady();
      setIsServerRunning(isReady);

      if (isReady) {
        // Use the AI agent to get available models
        const models = await aiAgent.getAvailableModels();
        setAvailableModels(models);

        if (models.length === 0) {
          setError('Aucun modèle n\'est installé. Installez un modèle avec la commande "ollama pull llama3".');
        }
      } else {
        setError("Ollama n'est pas en cours d'exécution. Veuillez démarrer le serveur Ollama.");
      }
    } catch (err) {
      console.error('Error checking Ollama server:', err);
      setIsServerRunning(false);
      setError("Impossible de se connecter à Ollama. Vérifiez qu'il est bien installé et lancé.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    checkOllamaServer();

    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      if (!isRefreshing) {
        checkOllamaServer();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

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
      <div className="p-6 flex flex-col items-center justify-center min-h-[200px]">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0s' }} />
          <div className="w-4 h-4 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0.2s' }} />
          <div className="w-4 h-4 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0.4s' }} />
        </div>
        <p className="mt-4 text-gray-600 dark:text-gray-300">Vérification d'Ollama...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Paramètres de l'Agent IA</h2>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 rounded-md text-sm font-medium transition-colors flex items-center">
          {isRefreshing ? (
            <svg
              className="animate-spin h-4 w-4 mr-1"
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
              className="h-4 w-4 mr-1"
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

      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700 rounded-md">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </div>
          <div className="mt-2 text-sm">
            <p className="font-medium">Suggestions:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>
                Vérifiez qu'Ollama est installé (
                <a
                  href="https://ollama.ai/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline">
                  télécharger Ollama
                </a>
                )
              </li>
              <li>
                Lancez Ollama depuis le terminal avec la commande{' '}
                <code className="bg-red-100 dark:bg-red-800/50 px-1 rounded">ollama serve</code>
              </li>
              <li>
                Si aucun modèle n'est installé, exécutez{' '}
                <code className="bg-red-100 dark:bg-red-800/50 px-1 rounded">ollama pull llama3</code>
              </li>
            </ul>
          </div>
        </div>
      )}

      {!isServerRunning && !error && (
        <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700 rounded-md">
          <p className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            Ollama n'est pas en cours d'exécution. Veuillez démarrer le serveur Ollama.
          </p>
        </div>
      )}

      {isServerRunning && (
        <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700 rounded-md">
          <p className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Ollama est en cours d'exécution et prêt à être utilisé.
          </p>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="enable-agent"
            checked={settings.isEnabled}
            onChange={handleEnableToggle}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            disabled={!isServerRunning}
          />
          <label htmlFor="enable-agent" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Activer l'Agent IA
          </label>
        </div>

        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Modèle</label>
          <select
            value={settings.selectedModel}
            onChange={handleModelChange}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white transition"
            disabled={!isServerRunning || !settings.isEnabled}>
            {availableModels.length === 0 && <option value="">Aucun modèle disponible</option>}
            {availableModels.map(model => (
              <option key={model.id} value={model.name}>
                {model.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {availableModels.length === 0 && isServerRunning
              ? 'Installez des modèles avec la commande "ollama pull [nom_du_modèle]"'
              : "Sélectionnez le modèle à utiliser pour l'agent IA"}
          </p>
        </div>

        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Température ({settings.temperature.toFixed(1)})
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.temperature}
            onChange={handleTemperatureChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            disabled={!isServerRunning || !settings.isEnabled}
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>Précis</span>
            <span>Créatif</span>
          </div>
        </div>

        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            URL du serveur Ollama
          </label>
          <input
            type="text"
            value={settings.baseUrl}
            onChange={handleBaseUrlChange}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white transition"
            disabled={!settings.isEnabled}
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            URL du serveur Ollama (par défaut: http://localhost:11434)
          </p>
        </div>
      </div>
    </div>
  );
};
