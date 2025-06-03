import { useState, useEffect, useCallback, useRef } from 'react';
import { aiAgentStorage } from '@extension/storage';
import { useStorage } from '@extension/shared';
import { MessageType } from '../../../../../../chrome-extension/src/background/types';

interface OllamaModelInfo {
  id: string;
  name: string;
  model: string;
  modified_at: string;
}

export const AIAgentOptions = () => {
  const settings = useStorage(aiAgentStorage);
  const [availableModels, setAvailableModels] = useState<OllamaModelInfo[]>([]);
  const [isServerRunning, setIsServerRunning] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const refreshInProgressRef = useRef<boolean>(false);

  const checkOllamaServer = useCallback(async () => {
    if (refreshInProgressRef.current) return;

    refreshInProgressRef.current = true;
    setIsRefreshing(true);
    setError(null);

    try {
      const statusResponse = await chrome.runtime.sendMessage({
        type: MessageType.CHECK_AGENT_STATUS,
      });

      if (statusResponse && statusResponse.success) {
        setIsServerRunning(statusResponse.isServerRunning || false);

        if (statusResponse.isServerRunning) {
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
          <div className="absolute inset-0 animate-pulse h-full w-full rounded-full border-4 border-border-accent opacity-20"></div>
          <div className="absolute inset-0 h-full w-full rounded-full border-t-4 border-border-accent animate-spin"></div>
        </div>
        <p className="mt-6 text-text-muted font-medium">Vérification d'Ollama...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Action Header */}
      <div className="flex justify-between items-center">
        <p className="text-text-secondary">Configurez les paramètres de l'agent IA et des modèles utilisés.</p>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center border
            ${
              isRefreshing
                ? 'bg-background-quaternary/20 text-text-muted border-border-primary cursor-not-allowed'
                : 'bg-background-accent/20 hover:bg-background-accent/30 text-text-accent border-border-accent hover:shadow-sm'
            }`}>
          {isRefreshing ? (
            <svg
              className="animate-spin h-4 w-4 mr-2"
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
              className="h-4 w-4 mr-2"
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

      {/* Status Notifications */}
      {error && (
        <div className="rounded-lg border border-red-900/50 bg-red-900/20 text-red-400 p-4">
          <div className="flex items-start">
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
                      className="text-text-accent hover:underline">
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
        <div className="rounded-lg border border-yellow-700/50 bg-yellow-800/20 text-yellow-400 p-4">
          <div className="flex items-center">
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

      {isServerRunning && settings.isEnabled && !error && (
        <div className="rounded-lg border border-green-800/50 bg-green-900/20 text-green-400 p-4">
          <div className="flex items-center">
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

      {/* Configuration Options */}
      <div className="space-y-6">
        {/* Enable Agent */}
        <div className="border-b border-border-primary pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-text-primary">Activer l'Agent IA</h3>
              <p className="text-sm text-text-secondary mt-1">
                Activez ou désactivez l'agent d'intelligence artificielle.
              </p>
            </div>
            <label className="flex items-center cursor-pointer group">
              <div className="relative inline-flex h-6 w-11 items-center">
                <input
                  type="checkbox"
                  checked={settings.isEnabled}
                  onChange={handleEnableToggle}
                  disabled={!isServerRunning}
                  className="peer sr-only"
                />
                <div className="h-5 w-10 rounded-full bg-background-quaternary peer-focus:ring-2 peer-focus:ring-border-accent peer-focus:ring-offset-2 peer-focus:ring-offset-background-primary peer-checked:bg-background-accent group-hover:bg-opacity-80 transition-all"></div>
                <div className="absolute left-0.5 h-4 w-4 rounded-full bg-text-muted transition-all duration-300 peer-checked:left-5 peer-checked:bg-text-inverted"></div>
              </div>
              <span className="ml-3 text-sm font-medium text-text-secondary group-hover:text-text-primary transition-colors">
                {settings.isEnabled ? 'Activé' : 'Désactivé'}
              </span>
            </label>
          </div>
        </div>

        {/* Model Selection */}
        <div className="border-b border-border-primary pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-text-primary">Modèle</h3>
              <p className="text-sm text-text-secondary mt-1">Sélectionnez le modèle IA à utiliser pour l'agent.</p>
            </div>
            <div>
              <select
                value={settings.selectedModel}
                onChange={handleModelChange}
                className="w-full py-2.5 px-3 rounded-md border border-border-primary bg-background-tertiary text-text-primary text-sm
                          focus:outline-none focus:ring-2 focus:ring-border-accent focus:border-transparent
                          disabled:opacity-60 disabled:cursor-not-allowed hover:border-border-accent transition-colors"
                disabled={!isServerRunning || !settings.isEnabled}>
                {availableModels.length === 0 && <option value="">Aucun modèle disponible</option>}
                {availableModels.map(model => (
                  <option key={model.id} value={model.name}>
                    {model.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-text-muted mt-2">
                {availableModels.length === 0 && isServerRunning
                  ? 'Installez des modèles avec la commande "ollama pull [nom_du_modèle]"'
                  : "Sélectionnez le modèle à utiliser pour l'agent IA"}
              </p>
            </div>
          </div>
        </div>

        {/* Temperature */}
        <div className="border-b border-border-primary pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-text-primary">Température</h3>
              <p className="text-sm text-text-secondary mt-1">Ajustez la créativité des réponses générées par l'IA.</p>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-text-muted">Précis</span>
                <span className="text-sm font-medium text-text-accent bg-background-accent/20 px-2 py-1 rounded-full">
                  {settings.temperature.toFixed(1)}
                </span>
                <span className="text-xs text-text-muted">Créatif</span>
              </div>
              <div className="relative px-1 pt-1 pb-4">
                <div className="absolute h-1 w-full rounded-full bg-background-quaternary"></div>
                <div
                  className="absolute h-1 rounded-full bg-gradient-to-r from-background-accent/80 to-background-accent"
                  style={{ width: `${settings.temperature * 100}%` }}></div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.temperature}
                  onChange={handleTemperatureChange}
                  className="absolute w-full h-1 rounded-lg appearance-none cursor-pointer bg-transparent
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-background-accent 
                            [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full
                            [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background-primary"
                  disabled={!isServerRunning || !settings.isEnabled}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Server URL */}
        <div className="border-b border-border-primary pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-text-primary">URL du serveur Ollama</h3>
              <p className="text-sm text-text-secondary mt-1">Adresse du serveur Ollama à utiliser pour l'IA.</p>
            </div>
            <div>
              <input
                type="text"
                value={settings.baseUrl}
                onChange={handleBaseUrlChange}
                className="w-full py-2.5 px-3 rounded-md border border-border-primary bg-background-tertiary text-text-primary text-sm
                          focus:outline-none focus:ring-2 focus:ring-border-accent focus:border-transparent
                          disabled:opacity-60 disabled:cursor-not-allowed hover:border-border-accent transition-colors"
                disabled={!settings.isEnabled}
              />
              <p className="text-xs text-text-muted mt-2">URL du serveur Ollama (par défaut: http://localhost:11434)</p>
            </div>
          </div>
        </div>

        {/* Context Size */}
        <div className="border-b border-border-primary pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-text-primary">Taille du Contexte</h3>
              <p className="text-sm text-text-secondary mt-1">Nombre maximum de tokens que le modèle peut traiter.</p>
            </div>
            <div>
              <input
                type="number"
                min="1024"
                step="1024"
                value={settings.contextSize}
                onChange={handleContextSizeChange}
                className="w-full py-2.5 px-3 rounded-md border border-border-primary bg-background-tertiary text-text-primary text-sm
                          focus:outline-none focus:ring-2 focus:ring-border-accent focus:border-transparent
                          disabled:opacity-60 disabled:cursor-not-allowed hover:border-border-accent transition-colors"
                disabled={!isServerRunning || !settings.isEnabled}
              />
              <p className="text-xs text-text-muted mt-2">
                Une valeur plus élevée permet de traiter des conversations plus longues, mais utilise plus de mémoire.
              </p>
            </div>
          </div>
        </div>

        {/* Embedding Model for RAG */}
        <div className="border-b border-border-primary pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-text-primary">Modèle d'Embedding RAG</h3>
              <p className="text-sm text-text-secondary mt-1">
                Modèle utilisé pour vectoriser les notes pour la recherche RAG.
              </p>
            </div>
            <div>
              <select
                value={settings.embeddingModel || ''}
                onChange={e => aiAgentStorage.updateEmbeddingModel(e.target.value || null)}
                className="w-full py-2.5 px-3 rounded-md border border-border-primary bg-background-tertiary text-text-primary text-sm
                          focus:outline-none focus:ring-2 focus:ring-border-accent focus:border-transparent
                          disabled:opacity-60 disabled:cursor-not-allowed hover:border-border-accent transition-colors"
                disabled={!isServerRunning || !settings.isEnabled}>
                <option value="">nomic-embed-text (Défaut)</option>
                {availableModels.map(model => (
                  <option key={model.id} value={model.name}>
                    {model.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-text-muted mt-2">
                Sélectionnez un modèle optimisé pour les embeddings. Laissez vide pour utiliser la valeur par défaut.
              </p>
            </div>
          </div>
        </div>

        {/* Inline Assist */}
        <div>
          <div className="mb-6">
            <h3 className="text-lg font-medium text-text-primary mb-4">Autocomplétion Inline</h3>

            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="text-sm font-medium text-text-primary">Activer l'autocomplétion inline</h4>
                <p className="text-sm text-text-secondary mt-1">
                  Permet la suggestion automatique de code pendant que vous tapez.
                </p>
              </div>
              <label className="flex items-center cursor-pointer group">
                <div className="relative inline-flex h-6 w-11 items-center">
                  <input
                    type="checkbox"
                    checked={settings.inlineAssistEnabled}
                    onChange={handleInlineAssistToggle}
                    disabled={!isServerRunning || !settings.isEnabled}
                    className="peer sr-only"
                  />
                  <div className="h-5 w-10 rounded-full bg-background-quaternary peer-focus:ring-2 peer-focus:ring-border-accent peer-focus:ring-offset-2 peer-focus:ring-offset-background-primary peer-checked:bg-background-accent group-hover:bg-opacity-80 transition-all"></div>
                  <div className="absolute left-0.5 h-4 w-4 rounded-full bg-text-muted transition-all duration-300 peer-checked:left-5 peer-checked:bg-text-inverted"></div>
                </div>
                <span className="ml-3 text-sm font-medium text-text-secondary group-hover:text-text-primary transition-colors">
                  {settings.inlineAssistEnabled ? 'Activé' : 'Désactivé'}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-text-primary">Modèle pour l'autocomplétion</h4>
                <p className="text-sm text-text-secondary mt-1">
                  Choisissez un modèle spécifique pour l'autocomplétion.
                </p>
              </div>
              <div>
                <select
                  value={settings.inlineAssistModel || ''}
                  onChange={handleInlineAssistModelChange}
                  className="w-full py-2.5 px-3 rounded-md border border-border-primary bg-background-tertiary text-text-primary text-sm
                            focus:outline-none focus:ring-2 focus:ring-border-accent focus:border-transparent
                            disabled:opacity-60 disabled:cursor-not-allowed hover:border-border-accent transition-colors"
                  disabled={!isServerRunning || !settings.isEnabled || !settings.inlineAssistEnabled}>
                  <option value="">Même que le modèle global</option>
                  {availableModels.map(model => (
                    <option key={model.id} value={model.name}>
                      {model.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-text-muted mt-2">
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
