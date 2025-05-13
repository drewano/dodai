import { useState, useEffect, useCallback, useRef } from 'react';
import { useDodai } from '../contexts/DodaiContext';
import type { ArtifactMarkdownV3, ArtifactCodeV3, ArtifactContentV3 } from '../types';
import { debounce } from 'lodash';
import MarkdownToolbar from './MarkdownToolbar';
import FloatingTextAction from '../../../../packages/ui/lib/components/FloatingTextAction';
import { MessageType } from '../../../../chrome-extension/src/background/types';
import type {
  ModifySelectedTextResponse,
  SaveArtifactAsNoteResponseMessage,
} from '../../../../chrome-extension/src/background/types';

// BlockNote Imports
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

const ArtifactPanel = () => {
  const [saveSuccess, setSaveSuccess] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // State for FloatingTextAction
  const [isFloatingActionVisible, setIsFloatingActionVisible] = useState(false);
  const [floatingActionPosition, setFloatingActionPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedTextContent, setSelectedTextContent] = useState('');
  const [isModifyingSelectedText, setIsModifyingSelectedText] = useState(false);
  const artifactPanelRef = useRef<HTMLDivElement>(null);

  const {
    currentArtifact,
    isLoading, // General loading from context (e.g., for initial generation, modification)
    updateCurrentArtifactContent,
    modifyCurrentArtifact,
    isStreamingArtifact, // New state from context to know if artifact is streaming
  } = useDodai();

  // BlockNote Editor
  const editor = useCreateBlockNote();

  // Obtenir le contenu actuel basé sur currentIndex
  const currentContent: ArtifactContentV3 | undefined = currentArtifact?.contents[currentArtifact.currentIndex];

  const isMarkdown = currentContent?.type === 'text';
  const isCode = currentContent?.type === 'code';

  // Effect to load/update editor content when currentArtifact changes, including during streaming
  useEffect(() => {
    if (editor && currentArtifact && currentContent && isMarkdown) {
      const markdown = (currentContent as ArtifactMarkdownV3).fullMarkdown;
      // Check if the editor content is already the same as the markdown from context
      // This is a simple check; more sophisticated diffing might be needed for complex scenarios
      // to avoid unnecessary re-renders or cursor jumps if the user is also editing (though editing is disabled during stream).
      const currentEditorMarkdownPromise = editor.blocksToMarkdownLossy(editor.document);
      currentEditorMarkdownPromise.then(currentEditorMarkdown => {
        if (currentEditorMarkdown !== markdown) {
          editor.tryParseMarkdownToBlocks(markdown).then(blocks => {
            // It is important to replace blocks only when content has actually changed
            // to avoid disrupting user cursor or selection if they were somehow able to edit.
            editor.replaceBlocks(editor.document, blocks);
          });
        }
      });
    }
    // This effect should run whenever the markdown content itself changes,
    // or when the editor/artifact instance changes.

    // Setup selection change listener
    const handleSelectionChange = () => {
      if (!editor || isLoading || isStreamingArtifact || !isMarkdown) {
        setIsFloatingActionVisible(false);
        return;
      }

      const selection = editor.getSelection();
      const selectedText = editor.getSelectedText();

      if (selection && selectedText.trim() !== '') {
        setSelectedTextContent(selectedText);
        // Get editor view element for relative positioning
        const editorViewElement = artifactPanelRef.current?.querySelector('.bn-editor'); // Adjust selector if needed
        if (editorViewElement) {
          const domSelection = window.getSelection();
          if (domSelection && domSelection.rangeCount > 0) {
            const range = domSelection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const editorRect = editorViewElement.getBoundingClientRect();

            // Adjust position to be relative to the editor view, not the viewport
            // And position it slightly above the selection
            const topPosition = rect.top - editorRect.top - 40; // 40px offset for the button height + margin
            const leftPosition = rect.left - editorRect.left + rect.width / 2;

            setFloatingActionPosition({ top: Math.max(0, topPosition), left: Math.max(0, leftPosition) });
            setIsFloatingActionVisible(true);
          } else {
            setIsFloatingActionVisible(false);
          }
        } else {
          setIsFloatingActionVisible(false);
        }
      } else {
        setIsFloatingActionVisible(false);
        setSelectedTextContent('');
      }
    };

    if (editor && isMarkdown) {
      // Only for markdown, and when editor is available
      const unsubscribe = editor.onSelectionChange(handleSelectionChange);
      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    } else {
      // Ensure floating action is hidden if not markdown or no editor
      setIsFloatingActionVisible(false);
    }
  }, [editor, currentContent, currentArtifact, isMarkdown, isLoading, isStreamingArtifact]); // Added isLoading and isStreamingArtifact

  // Debounce for the manual update of the content from the editor to the context
  const debouncedUpdate = useCallback(
    debounce((markdown: string) => {
      // Do not update if streaming, or general loading, or not a text artifact
      if (isLoading || isStreamingArtifact || !currentArtifact || currentContent?.type !== 'text') {
        return;
      }
      updateCurrentArtifactContent(markdown);
    }, 1000), // Délai de 1 seconde
    [updateCurrentArtifactContent, isLoading, isStreamingArtifact, currentArtifact, currentContent], // Include all relevant dependencies
  );

  // Gérer les changements dans l'éditeur BlockNote (par l'utilisateur)
  const handleEditorContentChange = async () => {
    // Do not process changes if streaming, general loading, or not markdown.
    if (!editor || isLoading || isStreamingArtifact) return;

    const markdown = await editor.blocksToMarkdownLossy(editor.document);
    debouncedUpdate(markdown);
  };

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
    if (!currentArtifact || !currentContent || isStreamingArtifact) return; // Do not save while streaming

    setIsSaving(true);
    setSaveSuccess(null); // Réinitialiser le succès
    setSaveError(null);

    try {
      const artifactContentForSaving = isMarkdown
        ? (currentContent as ArtifactMarkdownV3).fullMarkdown
        : (currentContent as ArtifactCodeV3).code;
      const titleFromContent = currentContent.title;

      if (!artifactContentForSaving.trim()) {
        setSaveError('Impossible de sauvegarder un artefact vide');
        setIsSaving(false);
        return;
      }

      let finalTitle = titleFromContent || 'Artefact Dodai Canvas';
      if (
        finalTitle === 'Artefact généré' ||
        finalTitle === 'Bienvenue sur Dodai Canvas' ||
        finalTitle === 'Nouvel artefact' ||
        finalTitle.startsWith('En cours:')
      ) {
        const firstLine = artifactContentForSaving.split('\n')[0];
        const rawTitle = firstLine.replace(/^#+ /, '');
        finalTitle = rawTitle.length > 50 ? `${rawTitle.substring(0, 47)}...` : rawTitle || 'Artefact sauvegardé';
      }

      // Le contenu à sauvegarder peut avoir besoin d'être formaté si c'est du code
      let noteContentForBackground = '';
      if (isMarkdown) {
        noteContentForBackground = artifactContentForSaving;
      } else if (isCode) {
        const language = (currentContent as ArtifactCodeV3).language || '';
        // Le script d'arrière-plan s'attend à du Markdown pour générer les tags, donc on formate le code en Markdown.
        noteContentForBackground = `# ${finalTitle}\n\n\`\`\`${language}\n${artifactContentForSaving}\n\`\`\``;
      }

      // Envoyer le message au script d'arrière-plan
      chrome.runtime.sendMessage(
        {
          type: MessageType.SAVE_ARTIFACT_AS_NOTE_REQUEST, // Utiliser le nouveau MessageType
          payload: {
            title: finalTitle,
            content: noteContentForBackground, // Envoyer le contenu formaté (Markdown pur ou code en Markdown)
            sourceUrl: undefined, // Les artefacts n'ont pas d'URL source typiquement
          },
        },
        (response: SaveArtifactAsNoteResponseMessage) => {
          if (chrome.runtime.lastError) {
            console.error("Erreur lors de l'envoi du message de sauvegarde d'artefact:", chrome.runtime.lastError);
            setSaveError(chrome.runtime.lastError.message || "Erreur de communication avec le script d'arrière-plan.");
            setSaveSuccess(false);
            setIsSaving(false);
            return;
          }

          if (response && response.success) {
            setSaveSuccess(true);
            // optionnellement, on pourrait utiliser response.noteId ou response.model si nécessaire
          } else {
            setSaveError(response?.error || "Une erreur s'est produite lors de la sauvegarde de l'artefact.");
            setSaveSuccess(false);
          }
          setIsSaving(false);
        },
      );
    } catch (error) {
      console.error("Erreur inattendue lors de la préparation de la sauvegarde de l'artefact:", error);
      setSaveError(error instanceof Error ? error.message : "Une erreur locale s'est produite");
      setSaveSuccess(false);
      setIsSaving(false);
    }
  };

  const handleMakeConcise = async () => {
    if (!editor || !isMarkdown || !currentArtifact || isLoading || isStreamingArtifact) return;
    const currentMarkdown = await editor.blocksToMarkdownLossy(editor.document);
    if (currentMarkdown.trim()) {
      modifyCurrentArtifact('Rends ce texte plus concis et direct.', currentMarkdown);
    }
  };

  const handleProfessionalTone = async () => {
    if (!editor || !isMarkdown || !currentArtifact || isLoading || isStreamingArtifact) return;
    const currentMarkdown = await editor.blocksToMarkdownLossy(editor.document);
    if (currentMarkdown.trim()) {
      modifyCurrentArtifact('Adapte ce texte pour un ton plus professionnel.', currentMarkdown);
    }
  };

  const handleExplainSimply = async () => {
    if (!editor || !isMarkdown || !currentArtifact || isLoading || isStreamingArtifact) return;
    const currentMarkdown = await editor.blocksToMarkdownLossy(editor.document);
    if (currentMarkdown.trim()) {
      modifyCurrentArtifact(
        'Explique ce texte de manière simple, comme si tu parlais à un enfant de 10 ans.',
        currentMarkdown,
      );
    }
  };

  // Handlers for FloatingTextAction
  const handleFloatingActionSubmit = async (instructions: string) => {
    if (!editor || !selectedTextContent.trim() || isModifyingSelectedText) return;

    setIsModifyingSelectedText(true);
    try {
      chrome.runtime.sendMessage(
        {
          type: MessageType.MODIFY_SELECTED_TEXT_REQUEST,
          payload: {
            selectedText: selectedTextContent,
            userInstructions: instructions,
            documentTitle: currentContent?.title || 'Dodai Canvas Artifact',
          },
        },
        (response: ModifySelectedTextResponse) => {
          setIsModifyingSelectedText(false);
          if (chrome.runtime.lastError) {
            console.error('Error modifying selected text:', chrome.runtime.lastError.message);
            // Optionally show error to user
            setIsFloatingActionVisible(false); // Hide on error
            return;
          }
          if (response && response.success && response.modifiedText) {
            // Replace selected text in BlockNote
            // editor.deleteSelection(); // Not directly available
            // editor.insertBlocks([{type: 'paragraph', content: response.modifiedText}], editor.getTextCursorPosition().block, "after" ) // This is for blocks
            editor.insertInlineContent(response.modifiedText);
            setIsFloatingActionVisible(false); // Hide on success
          } else {
            console.error('Failed to modify selected text:', response?.error);
            // Optionally show error to user
            setIsFloatingActionVisible(false); // Hide on failure
          }
        },
      );
    } catch (error) {
      console.error('Exception sending MODIFY_SELECTED_TEXT_REQUEST:', error);
      setIsModifyingSelectedText(false);
      setIsFloatingActionVisible(false); // Hide on exception
    }
  };

  const handleFloatingActionCancel = () => {
    setIsFloatingActionVisible(false);
    setSelectedTextContent(''); // Clear selected text
  };

  return (
    <div
      ref={artifactPanelRef}
      className="flex flex-col h-full bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 relative">
      {isMarkdown && floatingActionPosition && (
        <FloatingTextAction
          isVisible={isFloatingActionVisible}
          top={floatingActionPosition.top}
          left={floatingActionPosition.left}
          onSubmit={handleFloatingActionSubmit}
          onCancel={handleFloatingActionCancel}
          isLoading={isModifyingSelectedText}
          zIndex={1050} // Ensure it's above other elements
        />
      )}
      <div className="p-2 border-b border-slate-300 dark:border-slate-700 flex justify-between items-center bg-slate-200 dark:bg-slate-800 shadow-sm">
        <div className="flex items-center">
          <div className="text-lg font-medium mr-2">
            {currentContent?.title || (isStreamingArtifact ? 'Génération...' : 'Nouvel Artefact')}
          </div>
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
            disabled={isSaving || isLoading || isStreamingArtifact || !currentArtifact}>
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

      {isMarkdown && !isLoading && !isStreamingArtifact && (
        <MarkdownToolbar
          onConcise={handleMakeConcise}
          onProfessionalTone={handleProfessionalTone}
          onExplainSimply={handleExplainSimply}
        />
      )}

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

      {(isLoading || isStreamingArtifact) && !isSaving && (
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
            {isStreamingArtifact ? "Réception de l'artefact en cours..." : "Mise à jour de l'artefact en cours..."}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {(isLoading || isStreamingArtifact) && isMarkdown ? (
          // Show a simplified view or placeholder when BlockNote is loading/streaming markdown to avoid aggressive re-renders of the full editor.
          // Or, allow BlockNoteView to render but ensure it's truly read-only and doesn't steal focus or cause jumps.
          // For now, we let BlockNoteView handle its rendering, but it is set to editable=false.
          <BlockNoteView
            editor={editor}
            editable={false} // Strictly non-editable during streaming/loading
            theme="light"
            // onChange should not fire if editable is false, but good to be defensive.
            // onChange={handleEditorContentChange} // Potentially remove if editable=false guarantees no change events
          />
        ) : isMarkdown ? (
          <div className="h-full p-0">
            <BlockNoteView
              editor={editor}
              editable={!isLoading && !isStreamingArtifact && isMarkdown} // Editable only when not loading/streaming
              theme="light"
              onChange={handleEditorContentChange}
            />
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
