import { useState, useEffect } from 'react';
import { useStorage } from '@extension/shared';
import { mcpConfigStorage, type McpServerConfigEntry, type McpServersConfig } from '@extension/storage';
import type { McpConnectionsState } from '@extension/shared/lib/services/ai-agent';

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
  const handleFormChange = (field: keyof ServerFormData, value: any) => {
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
    } catch (error) {
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
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Serveurs MCP (Model Context Protocol)</h2>
        <button
          onClick={handleAddServer}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors">
          Ajouter un serveur
        </button>
      </div>

      {/* Liste des serveurs configurés */}
      {Object.keys(mcpServers).length === 0 ? (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
          <p>Aucun serveur MCP configuré.</p>
          <p className="text-sm mt-2">
            Les serveurs MCP permettent d'étendre les capacités de l'agent avec des outils externes.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                  Nom
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                  URL
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                  En-têtes
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                  Statut
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {Object.entries(mcpServers).map(([name, config]) => (
                <tr key={name} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{config.url}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {config.headers && Object.keys(config.headers).length > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {Object.keys(config.headers).length} en-tête(s)
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">Aucun</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {connectionStatus[name] ? (
                      connectionStatus[name].connected ? (
                        <div className="flex items-center">
                          <span className="h-3 w-3 bg-green-500 rounded-full mr-2"></span>
                          <span className="text-green-600 dark:text-green-400">Connecté</span>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center">
                            <span className="h-3 w-3 bg-red-500 rounded-full mr-2"></span>
                            <span className="text-red-600 dark:text-red-400">Déconnecté</span>
                          </div>
                          {connectionStatus[name].errorMessage && (
                            <div className="mt-1 text-xs text-red-500 dark:text-red-400 max-w-xs break-words">
                              {connectionStatus[name].errorMessage}
                            </div>
                          )}
                        </div>
                      )
                    ) : (
                      <div className="flex items-center">
                        <span className="h-3 w-3 bg-gray-300 dark:bg-gray-600 rounded-full mr-2"></span>
                        <span className="text-gray-500 dark:text-gray-400">Inconnu</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEditServer(name)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4">
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDeleteServer(name)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Formulaire d'ajout/modification */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium mb-4 dark:text-white">
              {editingServer ? `Modifier le serveur "${editingServer}"` : 'Ajouter un serveur MCP'}
            </h3>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700 rounded-md">
                <p>{formError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                {/* Champ Nom */}
                <div>
                  <label htmlFor="serverName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nom du serveur
                  </label>
                  <input
                    type="text"
                    id="serverName"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="my_filesystem, remote_api, etc."
                    value={formData.name}
                    onChange={e => handleFormChange('name', e.target.value)}
                    disabled={!!editingServer} // Désactiver si on édite (le nom est la clé)
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Un identifiant unique pour ce serveur, utilisé dans l'extension.
                  </p>
                </div>

                {/* Champ URL */}
                <div>
                  <label htmlFor="serverUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    URL du serveur
                  </label>
                  <input
                    type="url"
                    id="serverUrl"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="http://localhost:8000/sse"
                    value={formData.url}
                    onChange={e => handleFormChange('url', e.target.value)}
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    L'URL complète du point de terminaison SSE du serveur MCP.
                  </p>
                </div>

                {/* En-têtes HTTP */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      En-têtes HTTP (optionnels)
                    </label>
                    <button
                      type="button"
                      onClick={handleAddHeader}
                      className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300">
                      + Ajouter un en-tête
                    </button>
                  </div>

                  {formData.headers.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                      Aucun en-tête défini. Les en-têtes sont utiles pour l'authentification (ex: Authorization: Bearer
                      token).
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {formData.headers.map((header, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Nom de l'en-tête"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            value={header.key}
                            onChange={e => handleHeaderChange(index, 'key', e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="Valeur"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            value={header.value}
                            onChange={e => handleHeaderChange(index, 'value', e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveHeader(index)}
                            className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs rounded dark:bg-red-900/30 dark:hover:bg-red-800/50 dark:text-red-300">
                            Supprimer
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Option Node.js EventSource */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="useNodeEventSource"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    checked={formData.useNodeEventSource}
                    onChange={e => handleFormChange('useNodeEventSource', e.target.checked)}
                  />
                  <label htmlFor="useNodeEventSource" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Utiliser Node.js EventSource (améliore le support des en-têtes, mais peu utile dans les extensions
                    Chrome)
                  </label>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600">
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {editingServer ? 'Mettre à jour' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Explication sur les serveurs MCP */}
      <div className="mt-8 p-4 bg-blue-50 rounded-md text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
        <h3 className="font-bold mb-2">Qu'est-ce qu'un serveur MCP ?</h3>
        <p>
          Les serveurs MCP (Model Context Protocol) sont utilisés pour étendre les capacités de l'agent IA avec des
          outils externes, tels que l'accès au système de fichiers, à des APIs, des bases de données, etc.
        </p>
        <p className="mt-2">
          Pour qu'un serveur MCP soit utilisable par cette extension, il doit être accessible via un point de
          terminaison SSE (Server-Sent Events) et mettre en œuvre le protocole MCP.
        </p>
      </div>
    </div>
  );
};
