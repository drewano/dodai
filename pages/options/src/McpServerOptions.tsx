import { useState, useEffect } from 'react';
import { useStorage } from '@extension/shared';
import { mcpConfigStorage, type McpServerConfigEntry } from '@extension/storage';
import type { McpConnectionsState } from '../../../chrome-extension/src/background/types';
import { cn } from '@extension/ui';

interface ServerFormData {
  name: string;
  url: string;
  headers: { key: string; value: string }[];
  useNodeEventSource: boolean;
}

/**
 * Composant pour gérer les configurations des serveurs MCP
 */
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

  // Récupérer l'état des connexions MCP
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

    // Récupérer l'état initial
    fetchConnectionStatus();

    // Configurer un intervalle pour mettre à jour l'état régulièrement
    const intervalId = setInterval(fetchConnectionStatus, 10000); // toutes les 10 secondes

    return () => clearInterval(intervalId);
  }, []);

  // Réinitialiser le formulaire
  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      headers: [],
      useNodeEventSource: false,
    });
    setFormError(null);
  };

  // Ouvrir le formulaire pour ajouter un serveur
  const handleAddServer = () => {
    resetForm();
    setEditingServer(null);
    setShowAddForm(true);
  };

  // Ouvrir le formulaire pour modifier un serveur
  const handleEditServer = (serverName: string) => {
    const server = mcpServers[serverName];
    if (!server) return;

    // Convertir les headers en tableau pour l'interface utilisateur
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

  // Supprimer un serveur
  const handleDeleteServer = async (serverName: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le serveur "${serverName}" ?`)) {
      await mcpConfigStorage.removeServer(serverName);
    }
  };

  // Gérer les changements dans le formulaire
  const handleFormChange = (field: keyof ServerFormData, value: unknown) => {
    setFormData({ ...formData, [field]: value });
  };

  // Ajouter/modifier une entrée de header
  const handleAddHeader = () => {
    setFormData({
      ...formData,
      headers: [...formData.headers, { key: '', value: '' }],
    });
  };

  // Supprimer une entrée de header
  const handleRemoveHeader = (index: number) => {
    const newHeaders = [...formData.headers];
    newHeaders.splice(index, 1);
    setFormData({ ...formData, headers: newHeaders });
  };

  // Mettre à jour une entrée de header
  const handleHeaderChange = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = [...formData.headers];
    newHeaders[index][field] = value;
    setFormData({ ...formData, headers: newHeaders });
  };

  // Soumettre le formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!formData.name.trim()) {
      setFormError('Le nom du serveur ne peut pas être vide');
      return;
    }

    if (!formData.url.trim()) {
      setFormError("L'URL du serveur ne peut pas être vide");
      return;
    }

    try {
      // Vérification de l'URL
      new URL(formData.url);
    } catch {
      setFormError('URL invalide. Veuillez entrer une URL complète (ex: http://localhost:8000/sse)');
      return;
    }

    // Si on édite un serveur et que le nom a changé, il faut vérifier si le nouveau nom existe déjà
    if (editingServer && formData.name !== editingServer && mcpServers[formData.name]) {
      setFormError(`Un serveur avec le nom "${formData.name}" existe déjà. Veuillez choisir un autre nom.`);
      return;
    }

    // Si on ajoute un nouveau serveur, vérifier que le nom n'existe pas déjà
    if (!editingServer && mcpServers[formData.name]) {
      setFormError(`Un serveur avec le nom "${formData.name}" existe déjà. Veuillez choisir un autre nom.`);
      return;
    }

    // Convertir les headers en objet
    const headers: Record<string, string> = {};
    formData.headers.forEach(header => {
      if (header.key.trim() && header.value.trim()) {
        headers[header.key.trim()] = header.value.trim();
      }
    });

    // Préparer la configuration du serveur
    const serverConfig: McpServerConfigEntry = {
      url: formData.url.trim(),
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      useNodeEventSource: formData.useNodeEventSource,
    };

    try {
      if (editingServer) {
        // Si le nom du serveur a changé, supprimer l'ancien et ajouter le nouveau
        if (formData.name !== editingServer) {
          await mcpConfigStorage.removeServer(editingServer);
          await mcpConfigStorage.addServer(formData.name, serverConfig);
        } else {
          // Sinon, juste mettre à jour la config
          await mcpConfigStorage.addServer(editingServer, serverConfig);
        }
      } else {
        // Ajouter un nouveau serveur
        await mcpConfigStorage.addServer(formData.name, serverConfig);
      }

      // Fermer le formulaire et réinitialiser
      setShowAddForm(false);
      setEditingServer(null);
      resetForm();
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de la configuration du serveur:", error);
      setFormError("Une erreur est survenue lors de l'enregistrement. Veuillez réessayer.");
    }
  };

  // Annuler le formulaire
  const handleCancel = () => {
    setShowAddForm(false);
    setEditingServer(null);
    resetForm();
  };

  return (
    <div>
      <div className="flex justify-between items-center py-5 px-6 border-b border-gray-800/50 backdrop-blur-md">
        <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-300">
          Serveurs MCP (Model Context Protocol)
        </h2>
        <button
          onClick={handleAddServer}
          className={cn(
            'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center',
            'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-800/50',
            'hover:shadow-[0_0_8px_rgba(59,130,246,0.3)]',
          )}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          Ajouter un serveur
        </button>
      </div>

      <div className="p-6">
        {/* Liste des serveurs configurés */}
        {Object.keys(mcpServers).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 rounded-lg border border-gray-800/50 bg-gray-800/20 backdrop-blur-sm transition-all">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-gray-600 mb-4 opacity-80"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M5 12h14M12 5v14M9 3h6m-3-3v6m5 5h3a2 2 0 012 2v6a2 2 0 01-2 2h-3m-6 0H6a2 2 0 01-2-2v-6a2 2 0 012-2h3"
              />
            </svg>
            <p className="text-gray-300 font-medium mb-3 text-lg">Aucun serveur MCP configuré</p>
            <p className="text-sm text-gray-400 text-center max-w-md mb-6">
              Les serveurs MCP permettent d'étendre les capacités de l'agent avec des outils externes.
            </p>
            <button
              onClick={handleAddServer}
              className={cn(
                'px-4 py-2 rounded-md font-medium transition-all duration-200 flex items-center',
                'bg-blue-600 hover:bg-blue-700 text-white shadow-md',
                'hover:shadow-[0_0_12px_rgba(59,130,246,0.5)]',
              )}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              Configurer votre premier serveur
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-800/50 bg-gray-800/20 backdrop-blur-sm shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-800/70">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-700">
                      Nom
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-700">
                      URL
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-700">
                      En-têtes
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-700">
                      Statut
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(mcpServers).map(([name, config], index) => (
                    <tr
                      key={name}
                      className={cn(
                        'hover:bg-gray-800/40 transition-colors',
                        index !== Object.entries(mcpServers).length - 1 ? 'border-b border-gray-800/50' : '',
                      )}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-300">{name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400 truncate max-w-[200px]">
                        {config.url}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                        {config.headers && Object.keys(config.headers).length > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/40 text-blue-400 border border-blue-900/50">
                            {Object.keys(config.headers).length} en-tête(s)
                          </span>
                        ) : (
                          <span className="text-gray-500">Aucun</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                        {connectionStatus[name] ? (
                          connectionStatus[name].status === 'connected' ? (
                            <div className="flex items-center">
                              <div className="relative flex">
                                <div className="h-2.5 w-2.5 bg-green-500 rounded-full"></div>
                                <div
                                  className="absolute inset-0 h-2.5 w-2.5 bg-green-500 rounded-full animate-ping opacity-75"
                                  style={{ animationDuration: '2s' }}></div>
                              </div>
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
                            <div className="h-2.5 w-2.5 bg-gray-600 rounded-full"></div>
                            <span className="ml-2 text-gray-500">Inconnu</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleEditServer(name)}
                            className="text-blue-400 hover:text-blue-300 transition-colors p-1 rounded-full hover:bg-blue-900/20">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              viewBox="0 0 20 20"
                              fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteServer(name)}
                            className="text-red-400 hover:text-red-300 transition-colors p-1 rounded-full hover:bg-red-900/20">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              viewBox="0 0 20 20"
                              fill="currentColor">
                              <path
                                fillRule="evenodd"
                                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
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

        {/* Explication sur les serveurs MCP */}
        <div className="mt-6 p-4 rounded-lg border border-blue-900/50 bg-blue-900/20 text-sm text-blue-300 backdrop-blur-sm">
          <h3 className="font-medium mb-2 flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Qu'est-ce qu'un serveur MCP ?
          </h3>
          <p className="text-xs leading-relaxed">
            Les serveurs MCP (Model Context Protocol) sont utilisés pour étendre les capacités de l'agent IA avec des
            outils externes, tels que l'accès au système de fichiers, à des APIs, des bases de données, etc.
          </p>
          <p className="mt-2 text-xs leading-relaxed">
            Pour qu'un serveur MCP soit utilisable par cette extension, il doit être accessible via un point de
            terminaison SSE (Server-Sent Events) et mettre en œuvre le protocole MCP.
          </p>
        </div>
      </div>

      {/* Formulaire modal d'ajout/modification */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800/50 rounded-xl shadow-2xl max-h-[90vh] w-full max-w-2xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-800/70 bg-gray-800/30">
              <h3 className="text-lg font-medium text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-300">
                {editingServer ? `Modifier le serveur "${editingServer}"` : 'Ajouter un serveur MCP'}
              </h3>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-300 transition-colors p-1 rounded-full hover:bg-gray-800/50">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[calc(90vh-64px)]">
              {formError && (
                <div className="mb-4 rounded-lg border border-red-900/50 bg-red-900/20 text-red-400 overflow-hidden shadow-[0_0_15px_rgba(220,38,38,0.1)]">
                  <div className="p-3 flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-3 flex-shrink-0 text-red-500"
                      viewBox="0 0 20 20"
                      fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-sm">{formError}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1">
                  <label htmlFor="serverName" className="block text-sm font-medium text-gray-300">
                    Nom du serveur
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5v14" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      id="serverName"
                      className="w-full py-2.5 pl-10 pr-3 rounded-md border border-gray-700 bg-gray-800 text-gray-300 text-sm
                                focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent
                                disabled:opacity-60 disabled:cursor-not-allowed hover:border-blue-700 transition-colors"
                      placeholder="my_filesystem, remote_api, etc."
                      value={formData.name}
                      onChange={e => handleFormChange('name', e.target.value)}
                      disabled={!!editingServer}
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Un identifiant unique pour ce serveur, utilisé dans l'extension.
                  </p>
                </div>

                <div className="space-y-1">
                  <label htmlFor="serverUrl" className="block text-sm font-medium text-gray-300">
                    URL du serveur
                  </label>
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
                      type="url"
                      id="serverUrl"
                      className="w-full py-2.5 pl-10 pr-3 rounded-md border border-gray-700 bg-gray-800 text-gray-300 text-sm
                                focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent
                                hover:border-blue-700 transition-colors"
                      placeholder="http://localhost:8000/sse"
                      value={formData.url}
                      onChange={e => handleFormChange('url', e.target.value)}
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500">L'URL complète du point de terminaison SSE du serveur MCP.</p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label htmlFor="headersSection" className="block text-sm font-medium text-gray-300">
                      En-têtes HTTP (optionnels)
                    </label>
                    <button
                      type="button"
                      id="headersSection"
                      onClick={handleAddHeader}
                      className={cn(
                        'px-2 py-1 text-xs rounded-md flex items-center transition-all duration-200',
                        'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-800/50',
                        'hover:shadow-[0_0_8px_rgba(59,130,246,0.3)]',
                      )}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3 mr-1"
                        viewBox="0 0 20 20"
                        fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Ajouter
                    </button>
                  </div>

                  {formData.headers.length === 0 ? (
                    <p className="text-xs text-gray-500 py-3 px-4 rounded-md border border-gray-800/50 bg-gray-800/50 flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-2 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Aucun en-tête défini. Les en-têtes sont utiles pour l'authentification (ex: Authorization: Bearer
                      token).
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {formData.headers.map((header, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <input
                            type="text"
                            placeholder="Nom de l'en-tête"
                            className="flex-1 py-2.5 px-3 rounded-md border border-gray-700 bg-gray-800 text-gray-300 text-sm
                                      focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent hover:border-blue-700 transition-colors"
                            value={header.key}
                            onChange={e => handleHeaderChange(index, 'key', e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="Valeur"
                            className="flex-1 py-2.5 px-3 rounded-md border border-gray-700 bg-gray-800 text-gray-300 text-sm
                                      focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent hover:border-blue-700 transition-colors"
                            value={header.value}
                            onChange={e => handleHeaderChange(index, 'value', e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveHeader(index)}
                            className="p-2 rounded-md bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-900/50 transition-all hover:shadow-[0_0_8px_rgba(220,38,38,0.2)]">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              viewBox="0 0 20 20"
                              fill="currentColor">
                              <path
                                fillRule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center py-2">
                  <label htmlFor="useNodeEventSource" className="flex items-center cursor-pointer group">
                    <div className="relative inline-flex h-7 w-14 items-center">
                      <input
                        type="checkbox"
                        id="useNodeEventSource"
                        checked={formData.useNodeEventSource}
                        onChange={e => handleFormChange('useNodeEventSource', e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="h-6 w-12 rounded-full bg-gray-700 peer-focus:ring-2 peer-focus:ring-blue-600 peer-focus:ring-offset-2 peer-focus:ring-offset-gray-900 peer-checked:bg-blue-800 group-hover:bg-opacity-80 transition-all"></div>
                      <div className="absolute left-1 h-4 w-4 rounded-full bg-gray-400 transition-all duration-300 peer-checked:left-7 peer-checked:bg-blue-400 peer-checked:h-4 peer-checked:w-4 group-hover:shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                    </div>
                    <span className="ml-3 text-sm text-gray-300 select-none group-hover:text-blue-300 transition-colors">
                      Utiliser Node.js EventSource
                    </span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 -mt-2">
                  Améliore le support des en-têtes, mais peu utile dans les extensions Chrome.
                </p>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 rounded-md border border-gray-700 text-gray-300 text-sm font-medium bg-gray-800 hover:bg-gray-700 transition-all">
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all shadow-md hover:shadow-[0_0_10px_rgba(59,130,246,0.5)]">
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
