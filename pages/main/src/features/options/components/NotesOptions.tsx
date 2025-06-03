import { useState } from 'react';
import {
  useStorage,
  exportNotesToJson,
  exportNotesToMarkdownZip,
  importNotesFromJson,
  importNotesFromMarkdownZip,
} from '@extension/shared';
import { notesStorage } from '@extension/storage';
import { FileJson, Archive, Download, Upload } from 'lucide-react';

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

    event.target.value = '';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-text-secondary">
          Gérez vos notes, configurez les paramètres de sauvegarde et d'exportation.
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-lg border border-border-primary bg-background-tertiary/30 p-4 transition-all hover:bg-background-tertiary/50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium text-text-primary">Notes</h3>
            <span className="text-2xl font-bold text-text-accent">{notes?.length || 0}</span>
          </div>
          <p className="text-sm text-text-secondary">Nombre total de notes enregistrées.</p>
        </div>

        <div className="rounded-lg border border-border-primary bg-background-tertiary/30 p-4 transition-all hover:bg-background-tertiary/50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium text-text-primary">Taille</h3>
            <span className="text-2xl font-bold text-text-accent">
              {notes ? Math.round(new Blob([JSON.stringify(notes)]).size / 1024) : 0} Ko
            </span>
          </div>
          <p className="text-sm text-text-secondary">Espace de stockage approximatif utilisé.</p>
        </div>

        <div className="rounded-lg border border-border-primary bg-background-tertiary/30 p-4 transition-all hover:bg-background-tertiary/50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium text-text-primary">Dernière modification</h3>
            <span className="text-text-accent font-medium text-sm bg-background-accent/20 px-2 py-1 rounded-full">
              {notes && notes.length > 0
                ? new Date(Math.max(...notes.map(note => new Date(note.updatedAt).getTime()))).toLocaleDateString()
                : 'Aucune'}
            </span>
          </div>
          <p className="text-sm text-text-secondary">Date de la dernière modification.</p>
        </div>
      </div>

      {/* Import/Export Section */}
      <div className="rounded-lg border border-border-primary bg-background-tertiary/20 overflow-hidden">
        <div className="border-b border-border-primary px-6 py-4 bg-background-tertiary/30">
          <h3 className="text-lg font-medium text-text-primary">Sauvegarde et Synchronisation</h3>
          <p className="text-sm text-text-secondary mt-1">Exportez et importez vos notes pour les sauvegarder ou les transférer.</p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Export Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Download className="w-5 h-5 text-text-accent" />
                <h4 className="text-sm font-medium text-text-primary uppercase tracking-wider">Exporter</h4>
              </div>
              <p className="text-sm text-text-secondary">
                Sauvegardez vos notes dans différents formats pour les archiver ou les transférer.
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleExportJson}
                  className={`w-full flex items-center justify-center px-4 py-3 rounded-lg border transition-all
                    ${(!notes || notes.length === 0) 
                      ? 'opacity-50 cursor-not-allowed bg-background-quaternary/20 border-border-primary text-text-muted' 
                      : 'bg-background-accent/20 hover:bg-background-accent/30 border-border-accent text-text-accent hover:shadow-sm'
                    }`}
                  disabled={!notes || notes.length === 0}>
                  <FileJson className="w-4 h-4 mr-2" />
                  Exporter en JSON
                </button>

                <button
                  onClick={handleExportMarkdown}
                  className={`w-full flex items-center justify-center px-4 py-3 rounded-lg border transition-all
                    ${(!notes || notes.length === 0) 
                      ? 'opacity-50 cursor-not-allowed bg-background-quaternary/20 border-border-primary text-text-muted' 
                      : 'bg-green-600/20 hover:bg-green-600/30 border-green-800/50 text-green-400 hover:shadow-sm'
                    }`}
                  disabled={!notes || notes.length === 0}>
                  <Archive className="w-4 h-4 mr-2" />
                  Exporter en Markdown (ZIP)
                </button>
              </div>
            </div>

            {/* Import Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Upload className="w-5 h-5 text-text-accent" />
                <h4 className="text-sm font-medium text-text-primary uppercase tracking-wider">Importer</h4>
              </div>
              <p className="text-sm text-text-secondary">
                Restaurez des notes depuis un fichier de sauvegarde JSON ou une archive Markdown.
              </p>

              <div className="space-y-3">
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
                    className="w-full flex items-center justify-center px-4 py-3 rounded-lg border
                               bg-background-accent/20 hover:bg-background-accent/30 border-border-accent
                               text-text-accent transition-all cursor-pointer hover:shadow-sm">
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
                    className="w-full flex items-center justify-center px-4 py-3 rounded-lg border
                               bg-green-600/20 hover:bg-green-600/30 border-green-800/50
                               text-green-400 transition-all cursor-pointer hover:shadow-sm">
                    <Archive className="w-4 h-4 mr-2" />
                    Importer depuis Markdown (ZIP)
                  </label>
                </div>
              </div>

              {importStatus && (
                <div
                  className={`mt-4 px-4 py-3 rounded-lg text-sm border ${
                    importStatus.includes('Erreur')
                      ? 'bg-red-900/20 border-red-900/50 text-red-400'
                      : importStatus.includes('réussie')
                        ? 'bg-green-900/20 border-green-900/50 text-green-400'
                        : 'bg-background-accent/20 border-border-accent text-text-accent'
                  }`}>
                  <div className="flex items-center">
                    {importStatus.includes('Erreur') ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    ) : importStatus.includes('réussie') ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="animate-spin h-4 w-4 mr-2 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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

      {/* Settings Section */}
      <div className="space-y-6">
        <div className="border-b border-border-primary pb-6">
          <h3 className="text-lg font-medium text-text-primary mb-4">Paramètres des Notes</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-text-primary">Sauvegarde automatique</h4>
                <p className="text-xs text-text-secondary">Sauvegarde automatiquement les modifications</p>
              </div>
              <label className="flex items-center cursor-pointer group">
                <div className="relative inline-flex h-6 w-11 items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    defaultChecked={true}
                  />
                  <div className="h-5 w-10 rounded-full bg-background-quaternary peer-focus:ring-2 peer-focus:ring-border-accent peer-focus:ring-offset-2 peer-focus:ring-offset-background-primary peer-checked:bg-background-accent group-hover:bg-opacity-80 transition-all"></div>
                  <div className="absolute left-0.5 h-4 w-4 rounded-full bg-text-muted transition-all duration-300 peer-checked:left-5 peer-checked:bg-text-inverted"></div>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-text-primary">Confirmation de suppression</h4>
                <p className="text-xs text-text-secondary">Demande confirmation avant de supprimer une note</p>
              </div>
              <label className="flex items-center cursor-pointer group">
                <div className="relative inline-flex h-6 w-11 items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    defaultChecked={true}
                  />
                  <div className="h-5 w-10 rounded-full bg-background-quaternary peer-focus:ring-2 peer-focus:ring-border-accent peer-focus:ring-offset-2 peer-focus:ring-offset-background-primary peer-checked:bg-background-accent group-hover:bg-opacity-80 transition-all"></div>
                  <div className="absolute left-0.5 h-4 w-4 rounded-full bg-text-muted transition-all duration-300 peer-checked:left-5 peer-checked:bg-text-inverted"></div>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="rounded-lg border border-border-accent/50 bg-background-accent/10 p-4 text-sm text-text-accent">
        <h4 className="flex items-center font-medium mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          À propos des notes
        </h4>
        <div className="space-y-2 text-xs opacity-90">
          <p>
            Les notes sont stockées localement dans votre navigateur. Exportez-les régulièrement pour éviter toute
            perte de données en cas de réinitialisation du navigateur.
          </p>
          <p>
            L'exportation JSON conserve toutes les métadonnées et est idéale pour sauvegarder l'intégralité de vos notes.
            L'exportation Markdown est plus adaptée pour l'interopérabilité avec d'autres applications.
          </p>
        </div>
      </div>
    </div>
  );
}; 