import { useState, useEffect, useCallback, useRef } from 'react';
import { aiAgentStorage } from '@extension/storage';
import { useStorage } from '@extension/shared';
import { MessageType } from '../../../chrome-extension/src/background/types';
import { cn } from '@extension/ui';

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
  const refreshInProgressRef = useRef<boolean>(false);

  const checkOllamaServer = useCallback(async () => {
    // Empêcher les appels simultanés
    if (refreshInProgressRef.current) return;

    refreshInProgressRef.current = true;
    setIsRefreshing(true);
    setError(null);

    try {
      // Vérifier si l'agent est prêt via le background script
      const statusResponse = await chrome.runtime.sendMessage({
        type: MessageType.CHECK_AGENT_STATUS,
      });

      if (statusResponse && statusResponse.success) {
        setIsServerRunning(statusResponse.isServerRunning || false);

        if (statusResponse.isServerRunning) {
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
      refreshInProgressRef.current = false;
    }
  }, [settings.baseUrl]);

  useEffect(() => {
    checkOllamaServer();

    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      if (!refreshInProgressRef.current) {
        checkOllamaServer();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [checkOllamaServer]);

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

  const handleContextSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    aiAgentStorage.updateContextSize(parseInt(e.target.value, 10));
  };

  const handleInlineAssistToggle = () => {
    aiAgentStorage.toggleInlineAssistEnabled();
  };

  const handleInlineAssistModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    // Si "Même que le modèle global" est sélectionné, enregistre null
    aiAgentStorage.updateInlineAssistModel(value === '' ? null : value);
  };

  const handleRefresh = () => {
    if (isRefreshing || refreshInProgressRef.current) return;
    setIsLoading(true);
    checkOllamaServer();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[240px]">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 animate-pulse h-full w-full rounded-full border-4 border-blue-500 opacity-20"></div>
          <div className="absolute inset-0 h-full w-full rounded-full border-t-4 border-blue-500 animate-spin"></div>
        </div>
        <p className="mt-6 text-gray-400 font-medium">Vérification d'Ollama...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center py-5 px-6 border-b border-gray-800/50 backdrop-blur-md">
        <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-300">
          Paramètres de l'Agent IA
        </h2>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={cn(
            'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center',
            'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-800/50 disabled:opacity-50',
            'hover:shadow-[0_0_8px_rgba(59,130,246,0.3)]',
          )}>
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

      <div className="p-6 space-y-6">
        {/* Notifications d'état */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-900/50 bg-red-900/20 text-red-400 overflow-hidden shadow-[0_0_15px_rgba(220,38,38,0.1)] transform transition-all">
            <div className="p-4 flex items-start">
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
          <div className="mb-6 rounded-lg border border-yellow-700/50 bg-yellow-800/20 text-yellow-400 overflow-hidden shadow-[0_0_15px_rgba(253,224,71,0.1)] transform transition-all">
            <div className="p-4 flex items-center">
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

        {isServerRunning && !settings.isEnabled && !error && (
          <div className="mb-6 rounded-lg border border-yellow-700/50 bg-yellow-800/20 text-yellow-400 overflow-hidden shadow-[0_0_15px_rgba(253,224,71,0.1)] transform transition-all">
            <div className="p-4 flex items-center">
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
              <p className="text-sm">L'Agent IA est désactivé mais le serveur Ollama est disponible.</p>
            </div>
          </div>
        )}

        {isServerRunning && settings.isEnabled && !error && (
          <div className="mb-6 rounded-lg border border-green-800/50 bg-green-900/20 text-green-400 overflow-hidden shadow-[0_0_15px_rgba(34,197,94,0.1)] transform transition-all">
            <div className="p-4 flex items-center">
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

        {/* Options de configuration */}
        <div className="space-y-8">
          {/* Option d'activation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6 border-b border-gray-800/50">
            <div>
              <h3 className="text-lg font-medium text-gray-200">Activer l'Agent IA</h3>
              <p className="text-sm text-gray-400 mt-1">Activez ou désactivez l'agent d'intelligence artificielle.</p>
            </div>
            <div className="flex items-center justify-end">
              <label htmlFor="enable-agent" className="flex items-center cursor-pointer group">
                <div className="relative inline-flex h-7 w-14 items-center">
                  <input
                    type="checkbox"
                    id="enable-agent"
                    checked={settings.isEnabled}
                    onChange={handleEnableToggle}
                    disabled={!isServerRunning}
                    className="peer sr-only"
                  />
                  <div className="h-6 w-12 rounded-full bg-gray-700 peer-focus:ring-2 peer-focus:ring-blue-600 peer-focus:ring-offset-2 peer-focus:ring-offset-gray-900 peer-checked:bg-blue-800 group-hover:bg-opacity-80 transition-all"></div>
                  <div className="absolute left-1 h-4 w-4 rounded-full bg-gray-400 transition-all duration-300 peer-checked:left-7 peer-checked:bg-blue-400 peer-checked:h-4 peer-checked:w-4 group-hover:shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                </div>
                <span className="ml-3 text-sm font-medium text-gray-300 select-none group-hover:text-blue-300 transition-colors">
                  {settings.isEnabled ? 'Activé' : 'Désactivé'}
                </span>
              </label>
            </div>
          </div>

          {/* Sélection du modèle */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6 border-b border-gray-800/50">
            <div>
              <h3 className="text-lg font-medium text-gray-200">Modèle</h3>
              <p className="text-sm text-gray-400 mt-1">Sélectionnez le modèle IA à utiliser pour l'agent.</p>
            </div>
            <div>
              <select
                id="model-select"
                value={settings.selectedModel}
                onChange={handleModelChange}
                className="w-full py-2.5 px-3 rounded-md border border-gray-700 bg-gray-800 text-gray-300 text-sm
                          focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent
                          disabled:opacity-60 disabled:cursor-not-allowed hover:border-blue-700 transition-colors"
                disabled={!isServerRunning || !settings.isEnabled}>
                {availableModels.length === 0 && <option value="">Aucun modèle disponible</option>}
                {availableModels.map(model => (
                  <option key={model.id} value={model.name}>
                    {model.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-2">
                {availableModels.length === 0 && isServerRunning
                  ? 'Installez des modèles avec la commande "ollama pull [nom_du_modèle]"'
                  : "Sélectionnez le modèle à utiliser pour l'agent IA"}
              </p>
            </div>
          </div>

          {/* Température */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6 border-b border-gray-800/50">
            <div>
              <h3 className="text-lg font-medium text-gray-200">Température</h3>
              <p className="text-sm text-gray-400 mt-1">Ajustez la créativité des réponses générées par l'IA.</p>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-gray-500">Précis</span>
                <span className="text-sm font-medium text-blue-400 bg-blue-900/30 px-2 py-1 rounded-full">
                  {settings.temperature.toFixed(1)}
                </span>
                <span className="text-xs text-gray-500">Créatif</span>
              </div>
              <div className="relative px-1 pt-1 pb-4">
                <div className="absolute h-1 w-full rounded-full bg-gray-700"></div>
                <div
                  className="absolute h-1 rounded-full bg-gradient-to-r from-blue-800 to-blue-500"
                  style={{ width: `${settings.temperature * 100}%` }}></div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.temperature}
                  onChange={handleTemperatureChange}
                  className="absolute w-full h-1 rounded-lg appearance-none cursor-pointer bg-transparent
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-blue-500 
                            [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full
                            [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(59,130,246,0.5)]
                            [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-blue-800"
                  disabled={!isServerRunning || !settings.isEnabled}
                />
              </div>
            </div>
          </div>

          {/* URL du serveur */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6 border-b border-gray-800/50">
            <div>
              <h3 className="text-lg font-medium text-gray-200">URL du serveur Ollama</h3>
              <p className="text-sm text-gray-400 mt-1">Adresse du serveur Ollama à utiliser pour l'IA.</p>
            </div>
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9h18"
                    />
                  </svg>
                </div>
                <input
                  id="server-url"
                  type="text"
                  value={settings.baseUrl}
                  onChange={handleBaseUrlChange}
                  className="w-full py-2.5 pl-10 pr-3 rounded-md border border-gray-700 bg-gray-800 text-gray-300 text-sm
                            focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent
                            disabled:opacity-60 disabled:cursor-not-allowed hover:border-blue-700 transition-colors"
                  disabled={!settings.isEnabled}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">URL du serveur Ollama (par défaut: http://localhost:11434)</p>
            </div>
          </div>

          {/* Taille du contexte */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6 border-b border-gray-800/50">
            <div>
              <h3 className="text-lg font-medium text-gray-200">Taille du Contexte (num_ctx)</h3>
              <p className="text-sm text-gray-400 mt-1">Nombre maximum de tokens que le modèle peut traiter.</p>
            </div>
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <input
                  id="context-size"
                  type="number"
                  min="1024"
                  step="1024"
                  value={settings.contextSize}
                  onChange={handleContextSizeChange}
                  className="w-full py-2.5 pl-10 pr-3 rounded-md border border-gray-700 bg-gray-800 text-gray-300 text-sm
                            focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent
                            disabled:opacity-60 disabled:cursor-not-allowed hover:border-blue-700 transition-colors"
                  disabled={!isServerRunning || !settings.isEnabled}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Une valeur plus élevée permet de traiter des conversations plus longues, mais utilise plus de mémoire.
              </p>
            </div>
          </div>

          {/* Section Modèle d'Embedding RAG */}
          <div className="pt-4">
            <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-300 mb-4">
              Configuration RAG (Notes)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6 border-b border-gray-800/50">
              <div>
                <h3 className="text-lg font-medium text-gray-200">Modèle d'Embedding</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Modèle utilisé pour vectoriser les notes pour la recherche RAG.
                </p>
              </div>
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <select
                    id="embedding-model-select"
                    value={settings.embeddingModel || ''}
                    onChange={e => aiAgentStorage.updateEmbeddingModel(e.target.value || null)}
                    className="w-full py-2.5 pl-10 pr-3 rounded-md border border-gray-700 bg-gray-800 text-gray-300 text-sm
                              focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent
                              disabled:opacity-60 disabled:cursor-not-allowed hover:border-purple-700 transition-colors"
                    disabled={!isServerRunning || !settings.isEnabled}>
                    <option value="">nomic-embed-text (Défaut)</option>
                    {availableModels.map(model => (
                      <option key={model.id} value={model.name}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Sélectionnez un modèle optimisé pour les embeddings (ex: nomic-embed-text, mxbai-embed-large). Laissez
                  vide pour utiliser la valeur par défaut.
                </p>
              </div>
            </div>
          </div>

          {/* Section Autocomplétion Inline */}
          <div className="pt-4">
            <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-300 mb-4">
              Autocomplétion Inline
            </h3>

            {/* Option d'activation autocomplétion */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6 border-b border-gray-800/50">
              <div>
                <h3 className="text-lg font-medium text-gray-200">Activer l'autocomplétion inline</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Permet la suggestion automatique de code pendant que vous tapez.
                </p>
              </div>
              <div className="flex items-center justify-end">
                <label htmlFor="enable-inline-assist" className="flex items-center cursor-pointer group">
                  <div className="relative inline-flex h-7 w-14 items-center">
                    <input
                      type="checkbox"
                      id="enable-inline-assist"
                      checked={settings.inlineAssistEnabled}
                      onChange={handleInlineAssistToggle}
                      disabled={!isServerRunning || !settings.isEnabled}
                      className="peer sr-only"
                    />
                    <div className="h-6 w-12 rounded-full bg-gray-700 peer-focus:ring-2 peer-focus:ring-blue-600 peer-focus:ring-offset-2 peer-focus:ring-offset-gray-900 peer-checked:bg-blue-800 group-hover:bg-opacity-80 transition-all"></div>
                    <div className="absolute left-1 h-4 w-4 rounded-full bg-gray-400 transition-all duration-300 peer-checked:left-7 peer-checked:bg-blue-400 peer-checked:h-4 peer-checked:w-4 group-hover:shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                  </div>
                  <span className="ml-3 text-sm font-medium text-gray-300 select-none group-hover:text-blue-300 transition-colors">
                    {settings.inlineAssistEnabled ? 'Activé' : 'Désactivé'}
                  </span>
                </label>
              </div>
            </div>

            {/* Modèle pour l'autocomplétion */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6 border-b border-gray-800/50">
              <div>
                <h3 className="text-lg font-medium text-gray-200">Modèle pour l'autocomplétion</h3>
                <p className="text-sm text-gray-400 mt-1">Choisissez un modèle spécifique pour l'autocomplétion.</p>
              </div>
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                  </div>
                  <select
                    id="inline-model-select"
                    value={settings.inlineAssistModel || ''}
                    onChange={handleInlineAssistModelChange}
                    className="w-full py-2.5 pl-10 pr-3 rounded-md border border-gray-700 bg-gray-800 text-gray-300 text-sm
                              focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent
                              disabled:opacity-60 disabled:cursor-not-allowed hover:border-blue-700 transition-colors"
                    disabled={!isServerRunning || !settings.isEnabled || !settings.inlineAssistEnabled}>
                    <option value="">Même que le modèle global</option>
                    {availableModels.length === 0 && <option value="">Aucun modèle disponible</option>}
                    {availableModels.map(model => (
                      <option key={model.id} value={model.name}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Sélectionnez le modèle à utiliser spécifiquement pour l'autocomplétion inline, ou utilisez le même que
                  pour l'assistant global.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
