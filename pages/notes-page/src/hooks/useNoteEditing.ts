import { useState, useEffect, useCallback, useRef } from 'react';
import type { NoteEntry } from '@extension/storage';
import type { BlockNoteEditor, PartialBlock } from '@blocknote/core';

export type SaveStatus = 'idle' | 'modified' | 'saving' | 'saved' | 'error';

export interface UseNoteEditingReturn {
  editedTitle: string;
  editedTags: string[];
  tagInput: string;
  saveStatus: SaveStatus;
  lastError: string | null;
  editedSourceUrl: string | undefined;
  setEditedTitle: (title: string) => void;
  setEditedTags: (tagsOrCallback: string[] | ((prevTags: string[]) => string[])) => void;
  setTagInput: (input: string) => void;
  setEditedSourceUrl: (url: string | undefined) => void;
  handleSaveChanges: () => Promise<void>;
  handleCancelEdit: () => void;
  handleAddTag: () => void;
  handleRemoveTag: (tagToRemove: string) => void;
  syncInitialContent: (contentJSON: string) => void;
  isDirty: boolean;
}

// Utility to compare arrays (ensure it handles undefined correctly if needed)
const arraysEqual = (a: string[] | undefined, b: string[] | undefined): boolean => {
  if (a === b) return true; // Handles both undefined or same instance
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, idx) => val === sortedB[idx]);
};

export function useNoteEditing(
  selectedNote: NoteEntry | null,
  updateNote: (id: string, updates: Partial<Omit<NoteEntry, 'id' | 'type'>>) => Promise<void>,
  editor: BlockNoteEditor | null, // Added editor instance
): UseNoteEditingReturn {
  const [editedTitle, setEditedTitleInternal] = useState<string>('');
  const [editedTags, setEditedTagsInternal] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastError, setLastError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [editedSourceUrl, setEditedSourceUrlInternal] = useState<string | undefined>(undefined);

  const initialNoteStateRef = useRef<{
    title: string;
    tags: string[];
    content: string;
    sourceUrl: string | undefined;
  } | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef<boolean>(false);
  const editorContentChangedSinceLastSaveRef = useRef<boolean>(false);

  const _updateIsDirty = useCallback(() => {
    if (!selectedNote || !initialNoteStateRef.current) {
      setIsDirty(false);
      return;
    }
    const titleChanged = editedTitle !== initialNoteStateRef.current.title;
    const tagsChanged = !arraysEqual(editedTags, initialNoteStateRef.current.tags);
    const sourceUrlChanged = editedSourceUrl !== initialNoteStateRef.current.sourceUrl;
    const dirty = titleChanged || tagsChanged || sourceUrlChanged || editorContentChangedSinceLastSaveRef.current;
    setIsDirty(dirty);
  }, [editedTitle, editedTags, selectedNote, editedSourceUrl]);

  // Effet pour gérer les transitions de saveStatus en fonction de isDirty
  useEffect(() => {
    if (isDirty) {
      if (saveStatus !== 'saving' && saveStatus !== 'error' && saveStatus !== 'modified') {
        setSaveStatus('modified');
      }
    } else {
      // Si on n'est plus dirty (après sauvegarde, cancel, ou si les changements reviennent à l'initial)
      // et qu'on était 'modified' ou 'saved', on repasse à 'idle'.
      // 'error' reste 'error' jusqu'à une nouvelle tentative ou un cancel.
      if (saveStatus === 'modified' || saveStatus === 'saved') {
        setSaveStatus('idle');
      }
    }
  }, [isDirty, saveStatus]);

  // Initialize/reset state when selectedNote changes
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    isSavingRef.current = false;

    if (selectedNote) {
      setEditedTitleInternal(selectedNote.title);
      setEditedTagsInternal(selectedNote.tags || []);
      setEditedSourceUrlInternal(selectedNote.sourceUrl);
      // Content will be set by syncInitialContent after editor loads it.
      // For now, use selectedNote.content as a temporary baseline.
      initialNoteStateRef.current = {
        title: selectedNote.title,
        tags: selectedNote.tags || [],
        content: selectedNote.content || '', // This will be updated by syncInitialContent
        sourceUrl: selectedNote.sourceUrl,
      };
      setSaveStatus('idle');
      setLastError(null);
      editorContentChangedSinceLastSaveRef.current = false;
      setIsDirty(false);
    } else {
      setEditedTitleInternal('');
      setEditedTagsInternal([]);
      initialNoteStateRef.current = null;
      setSaveStatus('idle');
      setLastError(null);
      editorContentChangedSinceLastSaveRef.current = false;
      setIsDirty(false);
      setEditedSourceUrlInternal(undefined);
    }
  }, [selectedNote]);

  // Sync initial content from editor after it loads
  const syncInitialContent = useCallback(
    (contentJSON: string) => {
      if (selectedNote && initialNoteStateRef.current) {
        // S'assurer de prendre les titre/tags/sourceUrl de la note sélectionnée au moment de la synchro du contenu
        initialNoteStateRef.current.title = selectedNote.title;
        initialNoteStateRef.current.tags = selectedNote.tags || [];
        initialNoteStateRef.current.content = contentJSON;
        initialNoteStateRef.current.sourceUrl = selectedNote.sourceUrl;
        editorContentChangedSinceLastSaveRef.current = false;
        _updateIsDirty(); // Met à jour isDirty; le useEffect ci-dessus s'occupera de saveStatus.
      } else if (!selectedNote) {
        // Gérer le cas où aucune note n'est sélectionnée ou lors de l'initialisation
        const currentEditorDoc = editor?.document;
        const emptyContent = currentEditorDoc ? JSON.stringify(currentEditorDoc) : '[]';
        if (initialNoteStateRef.current) {
          // Si on vient de désélectionner une note
          initialNoteStateRef.current.content = emptyContent;
        } else {
          // Première initialisation, aucune note, mais l'éditeur existe (ou pas)
          initialNoteStateRef.current = { title: '', tags: [], content: emptyContent, sourceUrl: undefined };
        }
        editorContentChangedSinceLastSaveRef.current = false;
        _updateIsDirty();
      }
    },
    [selectedNote, _updateIsDirty, editor], // saveStatus enlevé des deps de _updateIsDirty, donc on peut l'enlever ici aussi.
    // editor est ajouté pour le cas !selectedNote
  );

  const setEditedTitle = useCallback(
    (title: string) => {
      setEditedTitleInternal(title);
      _updateIsDirty();
    },
    [_updateIsDirty],
  );

  const setEditedTags = useCallback((tagsOrCallback: string[] | ((prevTags: string[]) => string[])) => {
    setEditedTagsInternal(prevTags => {
      const newTags = typeof tagsOrCallback === 'function' ? tagsOrCallback(prevTags) : tagsOrCallback;
      // We'll call _updateIsDirty after state is set, via useEffect on editedTags
      return newTags;
    });
  }, []);

  useEffect(() => {
    _updateIsDirty();
  }, [editedTitle, editedTags, editedSourceUrl, _updateIsDirty]);

  // Debounced save logic
  const performSave = useCallback(async () => {
    if (isSavingRef.current || !selectedNote || !editor || !initialNoteStateRef.current) {
      return;
    }

    // Vérifier les changements réels avant de sauvegarder
    const titleChanged = editedTitle !== initialNoteStateRef.current.title;
    const tagsChanged = !arraysEqual(editedTags, initialNoteStateRef.current.tags);
    const sourceUrlChanged = editedSourceUrl !== initialNoteStateRef.current.sourceUrl;
    // JSON.stringify seulement ici, juste avant la sauvegarde potentielle.
    const currentContentJSON = JSON.stringify(editor.document);
    const contentChanged = currentContentJSON !== initialNoteStateRef.current.content;

    if (!titleChanged && !tagsChanged && !contentChanged && !sourceUrlChanged) {
      editorContentChangedSinceLastSaveRef.current = false; // Assurer que c'est false
      // Si isDirty était vrai uniquement à cause de changements non réels, _updateIsDirty le corrigera.
      // Appelons _updateIsDirty pour s'assurer que isDirty et saveStatus sont corrects.
      _updateIsDirty();
      return;
    }

    isSavingRef.current = true;
    setSaveStatus('saving');
    setLastError(null);

    const newTitle = editedTitle;
    const newTags = [...editedTags];
    const newSourceUrl = editedSourceUrl;

    try {
      await updateNote(selectedNote.id, {
        title: newTitle,
        content: currentContentJSON,
        tags: newTags,
        sourceUrl: newSourceUrl,
      });

      initialNoteStateRef.current = {
        title: newTitle,
        tags: newTags,
        content: currentContentJSON,
        sourceUrl: newSourceUrl,
      };
      setSaveStatus('saved');
      editorContentChangedSinceLastSaveRef.current = false;
      _updateIsDirty(); // Cela devrait mettre isDirty à false, puis le useEffect mettra saveStatus à 'idle'
      // après le délai de 'saved'.

      // setTimeout(() => { ... laisser le useEffect [isDirty, saveStatus] gérer le passage à 'idle'
      // après que 'saved' ait été affiché et que isDirty soit false.
      // Il faut juste un moyen de garder 'saved' un peu.
      // Modifions le useEffect pour saveStatus:
      // } , 2000);
    } catch (error) {
      console.error('Auto-save failed:', error);
      setLastError(error instanceof Error ? error.message : String(error));
      setSaveStatus('error'); // Reste en erreur jusqu'à action
      // Ne pas appeler _updateIsDirty ici pour que isDirty reste true et reflète l'état non sauvegardé.
    } finally {
      isSavingRef.current = false;
    }
  }, [selectedNote, editor, editedTitle, editedTags, editedSourceUrl, updateNote, _updateIsDirty]); // saveStatus enlevé

  // useEffect for handling title, tags, editor content, and source URL changes for auto-save
  useEffect(() => {
    if (!selectedNote || !editor) {
      // Plus besoin de initialNoteStateRef.current ici car _updateIsDirty le gère
      return;
    }

    const scheduleSave = () => {
      // isDirty est maintenant la source de vérité pour savoir s'il FAUT sauvegarder
      if (!isDirty || saveStatus === 'saving') return;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        performSave();
      }, 2500);
    };

    const handleEditorChange = () => {
      editorContentChangedSinceLastSaveRef.current = true;
      _updateIsDirty(); // Met à jour isDirty. Le useEffect [isDirty, saveStatus] s'occupera de saveStatus.
      scheduleSave(); // scheduleSave se base maintenant sur isDirty.
    };

    let unsubscribeEditorOnChange: (() => void) | undefined;
    if (editor) {
      // Assuming editor.onChange returns an unsubscribe function, as is common.
      // If BlockNote API is different (e.g., editor.events.change.on/off), this needs adjustment.
      // Based on documentation, editor.onChange is the way. Let's hope it returns an unsubscriber.
      // If not, this will be an issue for cleanup.
      // A quick search in BlockNote issues indicates `editor.onChange` *does* return an unsubscribe function.
      unsubscribeEditorOnChange = editor.onChange(handleEditorChange);
    }

    // La logique de sauvegarde pour titre/tags est maintenant gérée par _updateIsDirty appelé
    // dans les setters de editedTitle/editedTags, et le scheduleSave ci-dessous.
    if (isDirty) {
      // Si isDirty est vrai (potentiellement à cause de titre/tags), on schedule une sauvegarde.
      // On vérifie si le changement vient bien du titre/tags pour éviter de rescheduler si seul le contenu a changé
      // (ce qui est déjà géré par handleEditorChange).
      if (initialNoteStateRef.current) {
        const titleOrTagsOrUrlHaveChangedRecently =
          editedTitle !== initialNoteStateRef.current.title ||
          !arraysEqual(editedTags, initialNoteStateRef.current.tags) ||
          editedSourceUrl !== initialNoteStateRef.current.sourceUrl;
        if (titleOrTagsOrUrlHaveChangedRecently && !editorContentChangedSinceLastSaveRef.current) {
          // Si le titre/tag/url a changé mais PAS le contenu de l'éditeur depuis la dernière synchro/sauvegarde
          scheduleSave();
        } else if (titleOrTagsOrUrlHaveChangedRecently && editorContentChangedSinceLastSaveRef.current) {
          // Si tout a changé, handleEditorChange a déjà schedulé, pas besoin de le refaire.
          // scheduleSave() a déjà une garde contre les appels multiples.
        } else if (titleOrTagsOrUrlHaveChangedRecently) {
          scheduleSave(); // Au cas où editorContentChangedSinceLastSaveRef est faussement false
        }
      } else {
        // Si initialNoteStateRef.current n'existe pas mais qu'on est isDirty (peu probable mais pour être sûr)
        scheduleSave();
      }
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (unsubscribeEditorOnChange) {
        unsubscribeEditorOnChange();
      }
    };
  }, [
    editor,
    selectedNote,
    editedTitle,
    editedTags,
    editedSourceUrl,
    performSave,
    _updateIsDirty,
    saveStatus,
    isDirty,
  ]);
  // saveStatus et isDirty sont toujours là car ils peuvent influencer si on schedule ou si performSave s'exécute.

  // Force save (e.g., when changing note or closing)
  const handleSaveChanges = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    _updateIsDirty();
    await performSave();
  }, [performSave, _updateIsDirty]);

  // Cancel editing
  const handleCancelEdit = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (selectedNote && initialNoteStateRef.current && editor) {
      setEditedTitleInternal(initialNoteStateRef.current.title);
      setEditedTagsInternal(initialNoteStateRef.current.tags);
      setEditedSourceUrlInternal(initialNoteStateRef.current.sourceUrl);

      // Reset editor content
      try {
        const initialBlocks = JSON.parse(initialNoteStateRef.current.content || '[]') as PartialBlock[];
        editor.replaceBlocks(
          editor.document,
          initialBlocks.length > 0 ? initialBlocks : [{ type: 'paragraph', content: '' }],
        );
      } catch (e) {
        console.warn('Failed to parse initial content for cancel, clearing editor:', e);
        editor.replaceBlocks(editor.document, [{ type: 'paragraph', content: '' }]);
      }

      setSaveStatus('idle');
      setLastError(null);
      editorContentChangedSinceLastSaveRef.current = false;
      setIsDirty(false);
    }
  }, [selectedNote, editor]);

  // Tag management
  const handleAddTag = useCallback(() => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag) {
      setEditedTagsInternal(prevTags => {
        if (!prevTags.includes(trimmedTag)) {
          const newTags = [...prevTags, trimmedTag];
          // _updateIsDirty will be called by useEffect on editedTags
          return newTags;
        }
        return prevTags;
      });
      setTagInput('');
    }
  }, [tagInput]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setEditedTagsInternal(prevTags => {
      const newTags = prevTags.filter(tag => tag !== tagToRemove);
      // _updateIsDirty will be called by useEffect on editedTags
      return newTags;
    });
  }, []);

  // Add setter for source URL
  const setEditedSourceUrl = useCallback(
    (url: string | undefined) => {
      setEditedSourceUrlInternal(url);
      // _updateIsDirty will be called by useEffect on editedSourceUrl
    },
    [], // No direct dependency on _updateIsDirty here, it happens in useEffect
  );

  return {
    editedTitle,
    editedTags,
    tagInput,
    saveStatus,
    lastError,
    editedSourceUrl,
    setEditedTitle,
    setEditedTags,
    setTagInput,
    setEditedSourceUrl,
    handleSaveChanges,
    handleCancelEdit,
    handleAddTag,
    handleRemoveTag,
    syncInitialContent,
    isDirty,
  };
}
