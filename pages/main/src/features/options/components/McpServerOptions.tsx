import { useState, useEffect } from 'react';
import { useStorage } from '@extension/shared';
import { mcpConfigStorage, type McpServerConfigEntry } from '@extension/storage';
import type { McpConnectionsState } from '../../../../../chrome-extension/src/background/types';

interface ServerFormData {
  name: string;
  url: string;
  headers: { key: string; value: string }[];
  useNodeEventSource: boolean;
}

export const McpServerOptions = () => {
  const mcpServers = useStorage(mcpConfigStorage);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingServer, setEditingServer] = useState<string | null>(null);
  const [formData, setFormData] = useState<ServerFormData>({
    name: '',
    url: '',
    headers: [],
    useNodeEventSource: false,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<McpConnectionsState>({});

  useEffect(() => {
    const fetchConnectionStatus = async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'GET_MCP_CONNECTION_STATUS',
        });
        if (response.success) {
          setConnectionStatus(response.connectionState);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération de l'état des connexions MCP:", error);
      }
    };

    fetchConnectionStatus();
    const intervalId = setInterval(fetchConnectionStatus, 10000);
    return () => clearInterval(intervalId);
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      headers: [],
      useNodeEventSource: false,
    });
    setFormError(null);
  };

  const handleAddServer = () => {
    resetForm();
    setEditingServer(null);
    setShowAddForm(true);
  };

  const handleEditServer = (serverName: string) => {
    const server = mcpServers[serverName];
    if (!server) return;

    const headersArray = server.headers ? Object.entries(server.headers).map(([key, value]) => ({ key, value })) : [];
    setFormData({
      name: serverName,
      url: server.url,
      headers: headersArray,
      useNodeEventSource: server.useNodeEventSource || false,
    });
    setEditingServer(serverName);
    setShowAddForm(true);
  };

  const handleDeleteServer = async (serverName: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le serveur "${serverName}" ?`)) {
      await mcpConfigStorage.removeServer(serverName);
    }
  };

  const handleFormChange = (field: keyof ServerFormData, value: unknown) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleAddHeader = () => {
    setFormData({
      ...formData,
      headers: [...formData.headers, { key: '', value: '' }],
    });
  };

  const handleRemoveHeader = (index: number) => {
    const newHeaders = [...formData.headers];
    newHeaders.splice(index, 1);
    setFormData({ ...formData, headers: newHeaders });
  };

  const handleHeaderChange = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = [...formData.headers];
    newHeaders[index][field] = value;
    setFormData({ ...formData, headers: newHeaders });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Le nom du serveur ne peut pas être vide');
      return;
    }

    if (!formData.url.trim()) {
      setFormError("L'URL du serveur ne peut pas être vide");
      return;
    }

    try {
      new URL(formData.url);
    } catch {
      setFormError('URL invalide. Veuillez entrer une URL complète (ex: http://localhost:8000/sse)');
      return;
    }

    if (editingServer && formData.name !== editingServer && mcpServers[formData.name]) {
      setFormError(`Un serveur avec le nom "${formData.name}" existe déjà. Veuillez choisir un autre nom.`);
      return;
    }

    if (!editingServer && mcpServers[formData.name]) {
      setFormError(`Un serveur avec le nom "${formData.name}" existe déjà. Veuillez choisir un autre nom.`);
      return;
    }

    const headers: Record<string, string> = {};
    formData.headers.forEach(header => {
      if (header.key.trim() && header.value.trim()) {
        headers[header.key.trim()] = header.value.trim();
      }
    });

    const serverConfig: McpServerConfigEntry = {
      url: formData.url.trim(),
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      useNodeEventSource: formData.useNodeEventSource,
    };

    try {
      if (editingServer) {
        if (formData.name !== editingServer) {
          await mcpConfigStorage.removeServer(editingServer);
          await mcpConfigStorage.addServer(formData.name, serverConfig);
        } else {
          await mcpConfigStorage.addServer(editingServer, serverConfig);
        }
      } else {
        await mcpConfigStorage.addServer(formData.name, serverConfig);
      }

      setShowAddForm(false);
      setEditingServer(null);
      resetForm();
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de la configuration du serveur:", error);
      setFormError("Une erreur est survenue lors de l'enregistrement. Veuillez réessayer.");
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingServer(null);
    resetForm();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <p className="text-text-secondary">
          Gérez les serveurs MCP (Model Context Protocol) connectés pour étendre les capacités de l'agent IA.
        </p>
        <button
          onClick={handleAddServer}
          className="px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center border
                     bg-background-accent/20 hover:bg-background-accent/30 text-text-accent border-border-accent hover:shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Ajouter un serveur
        </button>
      </div>

      {/* Servers List */}
      {Object.keys(mcpServers).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 rounded-lg border border-border-primary bg-background-tertiary/50">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-text-muted mb-4 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M12 5v14M9 3h6m-3-3v6m5 5h3a2 2 0 012 2v6a2 2 0 01-2 2h-3m-6 0H6a2 2 0 01-2-2v-6a2 2 0 012-2h3" />
          </svg>
          <p className="text-text-primary font-medium mb-3 text-lg">Aucun serveur MCP configuré</p>
          <p className="text-sm text-text-secondary text-center max-w-md mb-6">
            Les serveurs MCP permettent d'étendre les capacités de l'agent avec des outils externes.
          </p>
          <button
            onClick={handleAddServer}
            className="px-4 py-2 rounded-md font-medium transition-all duration-200 flex items-center
                       bg-background-accent hover:bg-background-accent/80 text-text-inverted shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Configurer votre premier serveur
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-border-primary bg-background-tertiary/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-background-tertiary">
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider border-b border-border-primary">Nom</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider border-b border-border-primary">URL</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider border-b border-border-primary">En-têtes</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider border-b border-border-primary">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider border-b border-border-primary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(mcpServers).map(([name, config], index) => (
                  <tr key={name} className={`hover:bg-background-tertiary/50 transition-colors ${index !== Object.entries(mcpServers).length - 1 ? 'border-b border-border-primary/50' : ''}`}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-text-primary">{name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary truncate max-w-[200px]">{config.url}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                      {config.headers && Object.keys(config.headers).length > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-background-accent/20 text-text-accent border border-background-accent/50">
                          {Object.keys(config.headers).length} en-tête(s)
                        </span>
                      ) : (
                        <span className="text-text-muted">Aucun</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-text-secondary">
                      {connectionStatus[name] ? (
                        connectionStatus[name].status === 'connected' ? (
                          <div className="flex items-center">
                            <div className="h-2.5 w-2.5 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="ml-2 text-green-400">Connecté</span>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center">
                              <div className="h-2.5 w-2.5 bg-red-500 rounded-full"></div>
                              <span className="ml-2 text-red-400">Déconnecté</span>
                            </div>
                            {connectionStatus[name].error && (
                              <div className="mt-1 text-xs text-red-400 max-w-xs break-words opacity-80">
                                {connectionStatus[name].error}
                              </div>
                            )}
                          </div>
                        )
                      ) : (
                        <div className="flex items-center">
                          <div className="h-2.5 w-2.5 bg-background-quaternary rounded-full"></div>
                          <span className="ml-2 text-text-muted">Inconnu</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleEditServer(name)}
                          className="text-text-accent hover:text-text-primary transition-colors p-1 rounded-full hover:bg-background-accent/20">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteServer(name)}
                          className="text-red-400 hover:text-red-300 transition-colors p-1 rounded-full hover:bg-red-900/20">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-lg border border-border-accent/50 bg-background-accent/10 p-4 text-sm text-text-accent">
        <h3 className="font-medium mb-2 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          À propos des serveurs MCP
        </h3>
        <p className="text-xs leading-relaxed opacity-90">
          Les serveurs MCP étendent les capacités de l'agent IA avec des outils externes tels que l'accès au système de fichiers, 
          à des APIs ou des bases de données. Ils doivent être accessibles via un point de terminaison SSE et implémenter le protocole MCP.
        </p>
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-background-secondary border border-border-primary rounded-xl shadow-2xl max-h-[90vh] w-full max-w-2xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-border-primary bg-background-tertiary/30">
              <h3 className="text-lg font-medium text-text-primary">
                {editingServer ? `Modifier le serveur "${editingServer}"` : 'Ajouter un serveur MCP'}
              </h3>
              <button
                onClick={handleCancel}
                className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-full hover:bg-background-quaternary/50">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[calc(90vh-64px)]">
              {formError && (
                <div className="mb-4 rounded-lg border border-red-900/50 bg-red-900/20 text-red-400 p-3">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 flex-shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm">{formError}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1">
                  <label htmlFor="serverName" className="block text-sm font-medium text-text-primary">Nom du serveur</label>
                  <input
                    type="text"
                    id="serverName"
                    className="w-full py-2.5 px-3 rounded-md border border-border-primary bg-background-tertiary text-text-primary text-sm
                              focus:outline-none focus:ring-2 focus:ring-border-accent focus:border-transparent
                              disabled:opacity-60 disabled:cursor-not-allowed hover:border-border-accent transition-colors"
                    placeholder="my_filesystem, remote_api, etc."
                    value={formData.name}
                    onChange={e => handleFormChange('name', e.target.value)}
                    disabled={!!editingServer}
                    required
                  />
                  <p className="text-xs text-text-muted">Un identifiant unique pour ce serveur.</p>
                </div>

                <div className="space-y-1">
                  <label htmlFor="serverUrl" className="block text-sm font-medium text-text-primary">URL du serveur</label>
                  <input
                    type="url"
                    id="serverUrl"
                    className="w-full py-2.5 px-3 rounded-md border border-border-primary bg-background-tertiary text-text-primary text-sm
                              focus:outline-none focus:ring-2 focus:ring-border-accent focus:border-transparent
                              hover:border-border-accent transition-colors"
                    placeholder="http://localhost:8000/sse"
                    value={formData.url}
                    onChange={e => handleFormChange('url', e.target.value)}
                    required
                  />
                  <p className="text-xs text-text-muted">L'URL complète du point de terminaison SSE du serveur MCP.</p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium text-text-primary">En-têtes HTTP (optionnels)</label>
                    <button
                      type="button"
                      onClick={handleAddHeader}
                      className="px-2 py-1 text-xs rounded-md flex items-center transition-all duration-200
                                 bg-background-accent/20 hover:bg-background-accent/30 text-text-accent border border-background-accent/50">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Ajouter
                    </button>
                  </div>

                  {formData.headers.length === 0 ? (
                    <p className="text-xs text-text-muted py-3 px-4 rounded-md border border-border-primary/50 bg-background-tertiary/50">
                      Aucun en-tête défini. Utiles pour l'authentification (ex: Authorization: Bearer token).
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {formData.headers.map((header, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <input
                            type="text"
                            placeholder="Nom de l'en-tête"
                            className="flex-1 py-2.5 px-3 rounded-md border border-border-primary bg-background-tertiary text-text-primary text-sm
                                      focus:outline-none focus:ring-2 focus:ring-border-accent focus:border-transparent hover:border-border-accent transition-colors"
                            value={header.key}
                            onChange={e => handleHeaderChange(index, 'key', e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="Valeur"
                            className="flex-1 py-2.5 px-3 rounded-md border border-border-primary bg-background-tertiary text-text-primary text-sm
                                      focus:outline-none focus:ring-2 focus:ring-border-accent focus:border-transparent hover:border-border-accent transition-colors"
                            value={header.value}
                            onChange={e => handleHeaderChange(index, 'value', e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveHeader(index)}
                            className="p-2 rounded-md bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-900/50 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center py-2">
                  <label className="flex items-center cursor-pointer group">
                    <div className="relative inline-flex h-6 w-11 items-center">
                      <input
                        type="checkbox"
                        checked={formData.useNodeEventSource}
                        onChange={e => handleFormChange('useNodeEventSource', e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="h-5 w-10 rounded-full bg-background-quaternary peer-focus:ring-2 peer-focus:ring-border-accent peer-focus:ring-offset-2 peer-focus:ring-offset-background-primary peer-checked:bg-background-accent group-hover:bg-opacity-80 transition-all"></div>
                      <div className="absolute left-0.5 h-4 w-4 rounded-full bg-text-muted transition-all duration-300 peer-checked:left-5 peer-checked:bg-text-inverted"></div>
                    </div>
                    <span className="ml-3 text-sm text-text-primary group-hover:text-text-accent transition-colors">
                      Utiliser Node.js EventSource
                    </span>
                  </label>
                </div>
                <p className="text-xs text-text-muted -mt-2">
                  Améliore le support des en-têtes, mais peu utile dans les extensions Chrome.
                </p>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 rounded-md border border-border-primary text-text-primary text-sm font-medium bg-background-tertiary hover:bg-background-quaternary transition-all">
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-md bg-background-accent hover:bg-background-accent/80 text-text-inverted text-sm font-medium transition-all shadow-md">
                    {editingServer ? 'Mettre à jour' : 'Ajouter'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 