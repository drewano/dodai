import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { useDodai } from '../contexts/DodaiContext';
import type { ArtifactMarkdown, ArtifactCode } from '../types';
import MarkdownToolbar from './MarkdownToolbar';
import { notesStorage } from '@extension/storage';

const ArtifactPanel = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { artifact, setArtifact, isLoading } = useDodai();

  // État temporaire pour les modifications en cours d'édition
  const [editedContent, setEditedContent] = useState('');
  const [editedTitle, setEditedTitle] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isMarkdown = artifact.type === 'text';
  const isCode = artifact.type === 'code';

  // Mettre à jour l'état local lorsque l'artefact change
  useEffect(() => {
    if (isMarkdown) {
      setEditedContent((artifact as ArtifactMarkdown).fullMarkdown);
      setEditedTitle(artifact.title);
    } else if (isCode) {
      setEditedContent((artifact as ArtifactCode).code);
      setEditedTitle(artifact.title);
    }
  }, [artifact, isMarkdown, isCode]);

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

  // Démarrer l'édition
  const handleStartEditing = () => {
    setIsEditing(true);
  };

  // Sauvegarder les modifications
  const handleSaveChanges = () => {
    if (isMarkdown) {
      setArtifact({
        ...artifact,
        title: editedTitle,
        fullMarkdown: editedContent,
      } as ArtifactMarkdown);
    } else if (isCode) {
      setArtifact({
        ...artifact,
        title: editedTitle,
        code: editedContent,
      } as ArtifactCode);
    }
    setIsEditing(false);
  };

  // Annuler les modifications
  const handleCancelEdit = () => {
    if (isMarkdown) {
      setEditedContent((artifact as ArtifactMarkdown).fullMarkdown);
      setEditedTitle(artifact.title);
    } else if (isCode) {
      setEditedContent((artifact as ArtifactCode).code);
      setEditedTitle(artifact.title);
    }
    setIsEditing(false);
  };

  // Gérer les changements dans la zone de texte
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedContent(e.target.value);
  };

  // Gérer les changements dans le titre
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedTitle(e.target.value);
  };

  // Insérer le markdown à la position du curseur
  const insertMarkdown = (before: string, after?: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const newText = before + selectedText + (after || '');

    const newContent = textarea.value.substring(0, start) + newText + textarea.value.substring(end);

    setEditedContent(newContent);

    // Reposition cursor after insertion
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = after
        ? start + before.length + selectedText.length
        : start + before.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  // Sauvegarder l'artefact actuel dans les notes
  const saveToNotes = async () => {
    try {
      setIsSaving(true);
      setSaveError(null);

      // Récupérer le contenu de l'artefact
      const content = isMarkdown ? (artifact as ArtifactMarkdown).fullMarkdown : (artifact as ArtifactCode).code;

      // Vérifier que le contenu n'est pas vide
      if (!content.trim()) {
        setSaveError('Impossible de sauvegarder un artefact vide');
        setIsSaving(false);
        return;
      }

      // Générer un titre à partir des premiers mots
      let title = artifact.title || 'Artefact Dodai Canvas';

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
        const language = (artifact as ArtifactCode).language || '';
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
          {isEditing ? (
            <input
              type="text"
              className="px-2 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 
              rounded text-slate-900 dark:text-slate-100 mr-2 focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
              value={editedTitle}
              onChange={handleTitleChange}
              placeholder="Titre de l'artefact"
            />
          ) : (
            <div className="text-lg font-medium mr-2">{artifact.title}</div>
          )}
          <div className="text-xs px-2 py-0.5 rounded bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
            {artifact.type === 'text'
              ? 'Markdown'
              : artifact.type === 'code'
                ? `Code ${(artifact as ArtifactCode).language}`
                : 'Document'}
          </div>
        </div>
        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <button
                className="px-3 py-1 rounded-md text-sm font-medium transition-colors 
                bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-800/50
                focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-500/50"
                onClick={handleSaveChanges}>
                Sauvegarder
              </button>
              <button
                className="px-3 py-1 rounded-md text-sm font-medium transition-colors 
                bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-800/50
                focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-500/50"
                onClick={handleCancelEdit}>
                Annuler
              </button>
            </>
          ) : (
            <>
              <button
                className="px-3 py-1 rounded-md text-sm font-medium transition-colors 
                bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-800/50
                focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-500/50
                disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={saveToNotes}
                disabled={isSaving || isLoading}>
                {isSaving ? (
                  <div className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-purple-700 dark:text-purple-300"
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
                    Sauvegarde...
                  </div>
                ) : (
                  'Sauvegarder dans Mes Notes'
                )}
              </button>
              <button
                className="px-3 py-1 rounded-md text-sm font-medium transition-colors 
                bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-800/50
                focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-500/50"
                onClick={handleStartEditing}>
                Éditer
              </button>
            </>
          )}
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
        {isEditing ? (
          <div className="p-4 h-full flex flex-col">
            {isMarkdown && <MarkdownToolbar onInsertMarkdown={insertMarkdown} />}
            <textarea
              ref={textareaRef}
              className="w-full flex-1 p-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 
              rounded-b-lg text-slate-900 dark:text-white font-mono resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={editedContent}
              onChange={handleContentChange}
              spellCheck={false}
            />
          </div>
        ) : (
          <div className="p-4">
            {isMarkdown ? (
              <div
                className="prose prose-slate dark:prose-invert max-w-none 
                prose-headings:font-semibold prose-headings:text-slate-800 dark:prose-headings:text-slate-200
                prose-h1:text-2xl prose-h1:border-b prose-h1:border-slate-200 dark:prose-h1:border-slate-700 prose-h1:pb-2
                prose-h2:text-xl prose-h3:text-lg
                prose-a:text-blue-600 dark:prose-a:text-blue-400
                prose-blockquote:border-l-4 prose-blockquote:border-slate-300 dark:prose-blockquote:border-slate-600
                prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-slate-600 dark:prose-blockquote:text-slate-400
                prose-code:text-blue-600 dark:prose-code:text-blue-400 prose-code:bg-slate-200 dark:prose-code:bg-slate-800 prose-code:px-1 prose-code:rounded
                prose-pre:bg-slate-800 dark:prose-pre:bg-slate-900 prose-pre:text-slate-200 prose-pre:p-4 prose-pre:rounded-lg
                prose-img:rounded-lg
                prose-table:border prose-table:border-slate-300 dark:prose-table:border-slate-700
                prose-th:bg-slate-200 dark:prose-th:bg-slate-800 prose-th:p-2
                prose-td:border prose-td:border-slate-300 dark:prose-td:border-slate-700 prose-td:p-2
                prose-strong:font-semibold prose-strong:text-slate-800 dark:prose-strong:text-slate-200
                prose-ol:list-decimal prose-ul:list-disc">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeSanitize]}>
                  {(artifact as ArtifactMarkdown).fullMarkdown}
                </ReactMarkdown>
              </div>
            ) : isCode ? (
              <pre className="bg-slate-800 text-slate-200 p-4 rounded-lg overflow-x-auto">
                <code>{(artifact as ArtifactCode).code}</code>
              </pre>
            ) : (
              <div className="text-center p-8 text-slate-500 dark:text-slate-400 flex flex-col items-center">
                <svg className="w-12 h-12 mb-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                Type de contenu non pris en charge
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtifactPanel;
