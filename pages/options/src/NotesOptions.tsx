import { useState } from 'react';
import {
  useStorage,
  exportNotesToJson,
  exportNotesToMarkdownZip,
  importNotesFromJson,
  importNotesFromMarkdownZip,
} from '@extension/shared';
import { notesStorage } from '@extension/storage';
import { FileJson, Archive } from 'lucide-react';
import { cn } from '@extension/ui';

export const NotesOptions = () => {
  const notes = useStorage(notesStorage);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleExportJson = async () => {
    if (!notes || notes.length === 0) {
      alert('Aucune note à exporter.');
      return;
    }

    try {
      await exportNotesToJson(notes);
    } catch (error) {
      console.error("Erreur lors de l'export JSON:", error);
      alert("Erreur lors de l'export JSON. Vérifiez la console pour plus de détails.");
    }
  };

  const handleExportMarkdown = async () => {
    if (!notes || notes.length === 0) {
      alert('Aucune note à exporter.');
      return;
    }

    try {
      await exportNotesToMarkdownZip(notes);
    } catch (error) {
      console.error("Erreur lors de l'export Markdown:", error);
      alert("Erreur lors de l'export Markdown. Vérifiez la console pour plus de détails.");
    }
  };

  const handleImportJson = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setImportStatus('Importation en cours...');
    try {
      const imported = await importNotesFromJson(files[0]);
      setImportStatus(
        `Importation réussie: ${imported} note${imported !== 1 ? 's' : ''} importée${imported !== 1 ? 's' : ''}.`,
      );
    } catch (error) {
      console.error("Erreur lors de l'import:", error);
      setImportStatus("Erreur lors de l'importation. Vérifiez que le fichier est au format JSON correct.");
    }

    // Réinitialiser le champ input pour permettre de réimporter le même fichier
    event.target.value = '';
  };

  const handleImportMarkdown = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setImportStatus('Importation en cours...');
    try {
      const imported = await importNotesFromMarkdownZip(files[0]);
      setImportStatus(
        `Importation réussie: ${imported} note${imported !== 1 ? 's' : ''} importée${imported !== 1 ? 's' : ''}.`,
      );
    } catch (error) {
      console.error("Erreur lors de l'import:", error);
      setImportStatus(
        "Erreur lors de l'importation. Vérifiez que le fichier est au format ZIP avec des fichiers Markdown.",
      );
    }

    // Réinitialiser le champ input pour permettre de réimporter le même fichier
    event.target.value = '';
  };

  return (
    <div>
      <div className="flex justify-between items-center py-5 px-6 border-b border-gray-800/50 backdrop-blur-md">
        <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-300">
          Gestion des Notes
        </h2>
      </div>

      <div className="p-6 space-y-8">
        {/* Statistiques des notes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-lg border border-gray-800/50 bg-gray-800/20 p-4 backdrop-blur-sm shadow-lg transition-all hover:shadow-[0_0_15px_rgba(59,130,246,0.1)]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-gray-300">Notes</h3>
              <span className="text-2xl font-bold text-blue-400">{notes?.length || 0}</span>
            </div>
            <p className="text-sm text-gray-400">Nombre total de notes enregistrées dans l'extension.</p>
          </div>

          <div className="rounded-lg border border-gray-800/50 bg-gray-800/20 p-4 backdrop-blur-sm shadow-lg transition-all hover:shadow-[0_0_15px_rgba(59,130,246,0.1)]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-gray-300">Taille</h3>
              <span className="text-2xl font-bold text-blue-400">
                {notes ? Math.round(new Blob([JSON.stringify(notes)]).size / 1024) : 0} Ko
              </span>
            </div>
            <p className="text-sm text-gray-400">Espace de stockage approximatif utilisé par vos notes.</p>
          </div>

          <div className="rounded-lg border border-gray-800/50 bg-gray-800/20 p-4 backdrop-blur-sm shadow-lg transition-all hover:shadow-[0_0_15px_rgba(59,130,246,0.1)]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-gray-300">Dernière mise à jour</h3>
              <span className="text-blue-400 font-medium text-sm bg-blue-900/30 px-2 py-1 rounded-full">
                {notes && notes.length > 0
                  ? new Date(Math.max(...notes.map(note => new Date(note.updatedAt).getTime()))).toLocaleDateString()
                  : 'Aucune'}
              </span>
            </div>
            <p className="text-sm text-gray-400">Date de la dernière modification d'une note.</p>
          </div>
        </div>

        {/* Section Import/Export */}
        <div className="rounded-xl border border-gray-800/50 bg-gray-800/20 overflow-hidden backdrop-blur-sm shadow-lg">
          <div className="border-b border-gray-800/50 px-6 py-4">
            <h3 className="text-lg font-medium text-gray-200">Importation et Exportation</h3>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Exportation */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wider">Exporter</h4>
                <p className="text-sm text-gray-400">
                  Exportez vos notes pour les sauvegarder ou les transférer vers un autre appareil.
                </p>

                <div className="flex flex-col md:flex-row gap-4">
                  <button
                    onClick={handleExportJson}
                    className={cn(
                      'flex items-center justify-center px-4 py-2.5 rounded-lg',
                      'bg-blue-600/20 hover:bg-blue-600/30 border border-blue-800/50',
                      'text-blue-400 text-sm font-medium transition-all',
                      'hover:shadow-[0_0_10px_rgba(59,130,246,0.2)]',
                      (!notes || notes.length === 0) && 'opacity-50 cursor-not-allowed',
                    )}
                    disabled={!notes || notes.length === 0}>
                    <FileJson className="w-4 h-4 mr-2" />
                    Exporter en JSON
                  </button>

                  <button
                    onClick={handleExportMarkdown}
                    className={cn(
                      'flex items-center justify-center px-4 py-2.5 rounded-lg',
                      'bg-green-600/20 hover:bg-green-600/30 border border-green-800/50',
                      'text-green-400 text-sm font-medium transition-all',
                      'hover:shadow-[0_0_10px_rgba(34,197,94,0.2)]',
                      (!notes || notes.length === 0) && 'opacity-50 cursor-not-allowed',
                    )}
                    disabled={!notes || notes.length === 0}>
                    <Archive className="w-4 h-4 mr-2" />
                    Exporter en Markdown (ZIP)
                  </button>
                </div>
              </div>

              {/* Importation */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wider">Importer</h4>
                <p className="text-sm text-gray-400">
                  Importez des notes depuis un fichier JSON ou une archive ZIP de fichiers Markdown.
                </p>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative">
                    <input
                      type="file"
                      id="import-json"
                      accept=".json"
                      onChange={handleImportJson}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                    />
                    <label
                      htmlFor="import-json"
                      className={cn(
                        'flex items-center justify-center px-4 py-2.5 rounded-lg',
                        'bg-blue-600/20 hover:bg-blue-600/30 border border-blue-800/50',
                        'text-blue-400 text-sm font-medium transition-all cursor-pointer',
                        'hover:shadow-[0_0_10px_rgba(59,130,246,0.2)]',
                      )}>
                      <FileJson className="w-4 h-4 mr-2" />
                      Importer depuis JSON
                    </label>
                  </div>

                  <div className="relative">
                    <input
                      type="file"
                      id="import-markdown"
                      accept=".zip"
                      onChange={handleImportMarkdown}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                    />
                    <label
                      htmlFor="import-markdown"
                      className={cn(
                        'flex items-center justify-center px-4 py-2.5 rounded-lg',
                        'bg-green-600/20 hover:bg-green-600/30 border border-green-800/50',
                        'text-green-400 text-sm font-medium transition-all cursor-pointer',
                        'hover:shadow-[0_0_10px_rgba(34,197,94,0.2)]',
                      )}>
                      <Archive className="w-4 h-4 mr-2" />
                      Importer depuis Markdown (ZIP)
                    </label>
                  </div>
                </div>

                {importStatus && (
                  <div
                    className={cn(
                      'mt-4 px-4 py-3 rounded-lg text-sm',
                      importStatus.includes('Erreur')
                        ? 'bg-red-900/20 border border-red-900/50 text-red-400'
                        : importStatus.includes('réussie')
                          ? 'bg-green-900/20 border border-green-900/50 text-green-400'
                          : 'bg-blue-900/20 border border-blue-900/50 text-blue-400',
                    )}>
                    <div className="flex items-center">
                      {importStatus.includes('Erreur') ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-2 text-red-500"
                          viewBox="0 0 20 20"
                          fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : importStatus.includes('réussie') ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-2 text-green-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg
                          className="animate-spin h-4 w-4 mr-2 text-blue-500"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      )}
                      {importStatus}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Informations supplémentaires */}
        <div className="rounded-lg border border-blue-900/50 bg-blue-900/20 p-4 backdrop-blur-sm">
          <h4 className="flex items-center font-medium mb-2 text-blue-300">
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
            À propos des notes
          </h4>
          <div className="space-y-2 text-xs text-blue-300/90">
            <p>
              Les notes sont stockées localement dans votre navigateur. Exportez-les régulièrement pour éviter toute
              perte de données en cas de réinitialisation du navigateur.
            </p>
            <p>
              L'exportation au format JSON conserve toutes les métadonnées et est idéale pour sauvegarder l'intégralité
              de vos notes. L'exportation au format Markdown est plus adaptée pour l'interopérabilité avec d'autres
              applications.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
