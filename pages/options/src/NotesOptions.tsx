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
      alert("Erreur lors de l'export des notes en JSON.");
    }
  };

  const handleExportMarkdownZip = async () => {
    if (!notes || notes.length === 0) {
      alert('Aucune note à exporter.');
      return;
    }

    try {
      await exportNotesToMarkdownZip(notes);
    } catch (error) {
      console.error("Erreur lors de l'export ZIP:", error);
      alert("Erreur lors de l'export des notes en ZIP.");
    }
  };

  const handleImportJson = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setImportStatus(null);
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await importNotesFromJson(file, notes || []);

      // Ajouter les notes importées au stockage
      for (const note of result.notes) {
        await notesStorage.addNote(note);
      }

      setImportStatus(`${result.count} note(s) importée(s) avec succès.`);
    } catch (error) {
      console.error("Erreur lors de l'import JSON:", error);
      setImportStatus("Erreur lors de l'import des notes depuis JSON.");
    }

    // Réinitialiser le champ de fichier
    event.target.value = '';
  };

  const handleImportMarkdownZip = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setImportStatus(null);
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await importNotesFromMarkdownZip(file, notes || []);

      // Ajouter les notes importées au stockage
      for (const note of result.notes) {
        await notesStorage.addNote(note);
      }

      setImportStatus(`${result.count} note(s) importée(s) avec succès.`);
    } catch (error) {
      console.error("Erreur lors de l'import ZIP:", error);
      setImportStatus("Erreur lors de l'import des notes depuis ZIP.");
    }

    // Réinitialiser le champ de fichier
    event.target.value = '';
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-blue-400 mb-4">Gestion des Notes</h2>
      <p className="text-gray-400 mb-6">Importez et exportez vos notes pour la sauvegarde et la portabilité.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section Export */}
        <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/30">
          <h3 className="text-lg font-medium text-blue-300 mb-3">Exporter vos notes</h3>
          <p className="text-gray-400 text-sm mb-4">Téléchargez vos notes dans différents formats.</p>

          <div className="flex flex-col space-y-3">
            <button
              onClick={handleExportJson}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
              <FileJson className="mr-2 h-5 w-5" />
              Exporter en JSON
            </button>

            <button
              onClick={handleExportMarkdownZip}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
              <Archive className="mr-2 h-5 w-5" />
              Exporter en ZIP (Markdown)
            </button>
          </div>
        </div>

        {/* Section Import */}
        <div className="border border-gray-700 rounded-lg p-4 bg-gray-800/30">
          <h3 className="text-lg font-medium text-blue-300 mb-3">Importer des notes</h3>
          <p className="text-gray-400 text-sm mb-4">Ajoutez des notes depuis un fichier externe.</p>

          <div className="flex flex-col space-y-3">
            <label className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors cursor-pointer">
              <FileJson className="mr-2 h-5 w-5" />
              Importer depuis JSON
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>

            <label className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors cursor-pointer">
              <Archive className="mr-2 h-5 w-5" />
              Importer depuis ZIP (Markdown)
              <input type="file" accept=".zip" onChange={handleImportMarkdownZip} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Statut d'import */}
      {importStatus && (
        <div className="mt-4 p-3 bg-green-900/30 border border-green-600 rounded text-green-300">{importStatus}</div>
      )}

      {/* Informations */}
      <div className="mt-6 p-4 border border-gray-700 rounded-lg bg-gray-800/20">
        <h3 className="text-lg font-medium text-blue-300 mb-2">À propos de l'import/export</h3>
        <ul className="text-gray-400 text-sm list-disc pl-5 space-y-1">
          <li>L'export JSON préserve toutes les métadonnées des notes.</li>
          <li>L'export ZIP crée un fichier Markdown pour chaque note avec des métadonnées en YAML.</li>
          <li>Lors de l'import, les titres en conflit sont gérés automatiquement.</li>
          <li>Pour exporter une note individuelle, utilisez l'option dans la page Notes.</li>
        </ul>
      </div>
    </div>
  );
};
