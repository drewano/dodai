import { useState, useEffect } from 'react';
import { useDodai } from '../contexts/DodaiContext';
import type { ArtifactMarkdownV3, ArtifactCodeV3, ArtifactContentV3 } from '../types';
import { notesStorage } from '@extension/storage';

// BlockNote Imports
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

const ArtifactPanel = () => {
  const [saveSuccess, setSaveSuccess] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { currentArtifact, isLoading } = useDodai();

  // BlockNote Editor
  const editor = useCreateBlockNote();

  // Obtenir le contenu actuel basé sur currentIndex
  const currentContent: ArtifactContentV3 | undefined = currentArtifact?.contents[currentArtifact.currentIndex];

  const isMarkdown = currentContent?.type === 'text';
  const isCode = currentContent?.type === 'code';

  // Charger le contenu dans BlockNote
  useEffect(() => {
    // Vérifier si on est en mode chargement, si l'éditeur est défini et si le contenu est du markdown
    if (editor && !isLoading && currentArtifact && currentContent && isMarkdown) {
      const markdown = (currentContent as ArtifactMarkdownV3).fullMarkdown;
      // Convertir le markdown en blocks et mettre à jour l'éditeur
      editor.tryParseMarkdownToBlocks(markdown).then(blocks => {
        editor.replaceBlocks(editor.document, blocks);
      });
    }
    // Dépendances : l'éditeur, l'état de chargement, l'artefact et son contenu actuel
  }, [editor, isLoading, currentArtifact, currentContent, isMarkdown]);

  // Masquer la notification de succès/échec après 3 secondes
  useEffect(() => {
    if (saveSuccess !== null || saveError !== null) {
      const timer = setTimeout(() => {
        setSaveSuccess(null);
        setSaveError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess, saveError]);

  // Sauvegarder l'artefact actuel dans les notes
  const saveToNotes = async () => {
    if (!currentArtifact || !currentContent) return; // Vérifier si l'artefact existe

    try {
      setIsSaving(true);
      setSaveError(null);

      // Récupérer le contenu de l'artefact
      const content = isMarkdown
        ? (currentContent as ArtifactMarkdownV3).fullMarkdown
        : (currentContent as ArtifactCodeV3).code;
      const titleFromContent = currentContent.title; // Utiliser le titre du contenu actuel

      // Vérifier que le contenu n'est pas vide
      if (!content.trim()) {
        setSaveError('Impossible de sauvegarder un artefact vide');
        setIsSaving(false);
        return;
      }

      // Générer un titre à partir des premiers mots
      let title = titleFromContent || 'Artefact Dodai Canvas';

      // Si le titre est générique, essayer de générer un meilleur titre à partir du contenu
      if (title === 'Artefact généré' || title === 'Bienvenue sur Dodai Canvas' || title === 'Nouvel artefact') {
        // Extraire les premiers mots (50 caractères max) pour le titre
        const firstLine = content.split('\n')[0];
        const rawTitle = firstLine.replace(/^#+ /, ''); // Enlever les # du Markdown
        title = rawTitle.length > 50 ? `${rawTitle.substring(0, 47)}...` : rawTitle;
      }

      // Préparer le contenu selon le type d'artefact
      let noteContent = '';
      if (isMarkdown) {
        noteContent = content;
      } else if (isCode) {
        // Pour le code, l'encapsuler dans un bloc de code
        const language = (currentContent as ArtifactCodeV3).language || '';
        noteContent = `# ${title}\n\n\`\`\`${language}\n${content}\n\`\`\``;
      }

      // Générer un ID temporaire
      const tempId = Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

      // Sauvegarder dans notesStorage
      await notesStorage.addNote({
        id: tempId,
        title: title,
        content: noteContent,
        tags: ['dodai-canvas'],
        parentId: null,
      });

      // Afficher une notification de succès
      setSaveSuccess(true);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de l'artefact:", error);
      setSaveError(error instanceof Error ? error.message : "Une erreur s'est produite");
      setSaveSuccess(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* En-tête */}
      <div className="p-2 border-b border-slate-300 dark:border-slate-700 flex justify-between items-center bg-slate-200 dark:bg-slate-800 shadow-sm">
        <div className="flex items-center">
          <div className="text-lg font-medium mr-2">{currentContent?.title}</div>
          <div className="text-xs px-2 py-0.5 rounded bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
            {currentContent?.type === 'text'
              ? 'Markdown'
              : currentContent?.type === 'code'
                ? `Code ${(currentContent as ArtifactCodeV3).language}`
                : 'Document'}
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            className="px-3 py-1 rounded-md text-sm font-medium transition-colors 
            bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-800/50
            focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-500/50
            disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={saveToNotes}
            disabled={isSaving || isLoading || !currentArtifact}>
            {isSaving ? (
              <div className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-purple-700 dark:text-purple-300"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sauvegarde...
              </div>
            ) : (
              'Sauvegarder dans Mes Notes'
            )}
          </button>
        </div>
      </div>

      {/* Notification de succès/échec */}
      {saveSuccess !== null && (
        <div
          className={`p-2 text-center text-sm font-medium ${
            saveSuccess
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
          }`}>
          {saveSuccess
            ? 'Artefact sauvegardé avec succès dans vos notes !'
            : saveError || "Erreur lors de la sauvegarde de l'artefact."}
        </div>
      )}

      {/* État de chargement */}
      {isLoading && (
        <div className="p-2 text-center text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 animate-pulse">
          <div className="flex items-center justify-center">
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-700 dark:text-blue-300"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Mise à jour de l'artefact en cours...
          </div>
        </div>
      )}

      {/* Contenu */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <svg
              className="animate-spin h-8 w-8 text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : isMarkdown ? (
          <div className="h-full p-0">
            <BlockNoteView editor={editor} editable={true} theme="light" />
          </div>
        ) : isCode ? (
          <div className="p-4 h-full">
            <pre className="bg-slate-800 text-slate-200 p-4 rounded-lg overflow-auto h-full">
              <code>{(currentContent as ArtifactCodeV3).code}</code>
            </pre>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
            <div className="text-center">
              <svg
                className="w-12 h-12 mb-3 mx-auto text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              {currentArtifact
                ? "Type d'artefact non pris en charge pour l'instant."
                : 'Aucun artefact sélectionné. Générez-en un avec le chat !'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtifactPanel;
