import { withErrorBoundary, withSuspense, useStorage, exportNoteToMarkdown } from '@extension/shared';
import { notesStorage, type NoteEntry } from '@extension/storage';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

// Options de tri disponibles
type SortOption = 'updatedAt_desc' | 'updatedAt_asc' | 'createdAt_desc' | 'createdAt_asc' | 'title_asc' | 'title_desc';

const NotesPage = () => {
  const notes = useStorage(notesStorage);
  const [selectedNote, setSelectedNote] = useState<NoteEntry | null>(null);
  const [editedTitle, setEditedTitle] = useState<string>('');
  const [editedContent, setEditedContent] = useState<string>('');
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('updatedAt_desc');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const SCRATCHPAD_ID = '@Scratchpad';

  // Récupérer tous les tags uniques de toutes les notes
  const allTags = useMemo(() => {
    if (!notes) return [];
    const tagSet = new Set<string>();
    notes.forEach(note => {
      if (note.tags && note.tags.length > 0) {
        note.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [notes]);

  // Filtrer les notes en fonction du tag actif et les trier selon l'option choisie
  const filteredAndSortedNotes = useMemo(() => {
    if (!notes) return [];

    // Filtrer par tag si un tag est actif
    let filteredNotes = notes;
    if (activeTag) {
      filteredNotes = notes.filter(note => note.tags && note.tags.includes(activeTag));
    }

    // Exclure le scratchpad de la liste normale des notes
    const regularNotes = filteredNotes.filter(note => note.id !== SCRATCHPAD_ID);

    // Trier les notes selon l'option sélectionnée
    return [...regularNotes].sort((a, b) => {
      switch (sortOption) {
        case 'updatedAt_desc':
          return b.updatedAt - a.updatedAt;
        case 'updatedAt_asc':
          return a.updatedAt - b.updatedAt;
        case 'createdAt_desc':
          return b.createdAt - a.createdAt;
        case 'createdAt_asc':
          return a.createdAt - b.createdAt;
        case 'title_asc':
          return a.title.localeCompare(b.title);
        case 'title_desc':
          return b.title.localeCompare(a.title);
        default:
          return b.updatedAt - a.updatedAt;
      }
    });
  }, [notes, activeTag, sortOption, SCRATCHPAD_ID]);

  // Récupérer le scratchpad s'il existe
  const scratchpad = useMemo(() => {
    if (!notes) return null;
    return notes.find(note => note.id === SCRATCHPAD_ID);
  }, [notes, SCRATCHPAD_ID]);

  // Gérer la sélection d'une note
  const handleSelectNote = useCallback((note: NoteEntry) => {
    setSelectedNote(note);
    setIsEditing(false);
    setShowPreview(false);
  }, []);

  // Vérifier si le Scratchpad doit être ouvert directement (via l'URL)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const openScratchpad = searchParams.get('scratchpad') === 'true';

    if (openScratchpad && scratchpad && (!selectedNote || selectedNote.id !== SCRATCHPAD_ID)) {
      handleSelectNote(scratchpad);
    }
  }, [scratchpad, selectedNote, SCRATCHPAD_ID, handleSelectNote]);

  // Mettre à jour le formulaire d'édition quand une note est sélectionnée
  useEffect(() => {
    if (selectedNote) {
      setEditedTitle(selectedNote.title);
      setEditedContent(selectedNote.content);
      setEditedTags(selectedNote.tags || []);
    } else {
      setEditedTitle('');
      setEditedContent('');
      setEditedTags([]);
      setIsEditing(false);
    }
  }, [selectedNote]);

  // Supprimer la note sélectionnée
  const handleDeleteNote = async () => {
    if (selectedNote && window.confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
      await notesStorage.deleteNote(selectedNote.id);
      setSelectedNote(null);
    }
  };

  // Activer le mode édition
  const handleEditMode = () => {
    setIsEditing(true);
    setShowPreview(false);
  };

  // Sauvegarder les modifications
  const handleSaveChanges = async () => {
    if (
      selectedNote &&
      (editedTitle !== selectedNote.title ||
        editedContent !== selectedNote.content ||
        !arraysEqual(editedTags, selectedNote.tags || []))
    ) {
      await notesStorage.updateNote(selectedNote.id, {
        title: editedTitle,
        content: editedContent,
        tags: editedTags,
      });
      setIsEditing(false);
    } else {
      setIsEditing(false);
    }
  };

  // Annuler les modifications
  const handleCancelEdit = () => {
    if (selectedNote) {
      setEditedTitle(selectedNote.title);
      setEditedContent(selectedNote.content);
      setEditedTags(selectedNote.tags || []);
    }
    setIsEditing(false);
  };

  // Ajouter un tag depuis l'input
  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !editedTags.includes(trimmedTag)) {
      setEditedTags([...editedTags, trimmedTag]);
      setTagInput('');
    }
  };

  // Supprimer un tag
  const handleRemoveTag = (tagToRemove: string) => {
    setEditedTags(editedTags.filter(tag => tag !== tagToRemove));
  };

  // Gérer l'appui sur entrée dans l'input de tag
  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Filtrer les notes par tag
  const handleTagFilter = (tag: string) => {
    setActiveTag(activeTag === tag ? null : tag);
  };

  // Réinitialiser le filtre de tag
  const clearTagFilter = () => {
    setActiveTag(null);
  };

  // Changer l'option de tri
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOption(e.target.value as SortOption);
  };

  // Utilitaire pour comparer deux tableaux
  const arraysEqual = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, idx) => val === sortedB[idx]);
  };

  // Créer une nouvelle note
  const handleCreateNewNote = async () => {
    const timestamp = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const newNoteTitle = `Nouvelle Note (${timestamp})`;
    const newNoteContent = '';

    const newNoteId = await notesStorage.addNote({
      title: newNoteTitle,
      content: newNoteContent,
      tags: [],
    });

    // Récupérer la nouvelle note pour la sélectionner
    const newNote = await notesStorage.getNote(newNoteId);
    if (newNote) {
      setSelectedNote(newNote);
      setIsEditing(true);
      setShowPreview(false);
      // Focus sur le champ de titre après un court délai
      setTimeout(() => {
        const titleInput = document.getElementById('title');
        if (titleInput) {
          titleInput.focus();
        }
      }, 100);
    }
  };

  // Formater la date pour l'affichage
  const formatDate = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: fr });
  };

  // Insérer la syntaxe Markdown au curseur ou autour du texte sélectionné
  const insertMarkdown = (markdownBefore: string, markdownAfter = '') => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);

    // Construire le nouveau contenu
    const newContent =
      textarea.value.substring(0, start) +
      markdownBefore +
      selectedText +
      markdownAfter +
      textarea.value.substring(end);

    // Mettre à jour le state
    setEditedContent(newContent);

    // Régler le focus et la sélection après le rendu
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + markdownBefore.length, start + markdownBefore.length + selectedText.length);
    }, 0);
  };

  // Gérer l'insertion d'un lien
  const handleInsertLink = () => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);

    const url = prompt("Entrez l'URL du lien:", 'https://');
    if (!url) return;

    const linkText = selectedText.length > 0 ? selectedText : 'texte du lien';
    const markdown = `[${linkText}](${url})`;

    // Insérer le markdown du lien
    const newContent = textarea.value.substring(0, start) + markdown + textarea.value.substring(end);

    setEditedContent(newContent);

    // Régler le focus après le rendu
    setTimeout(() => {
      textarea.focus();
      if (selectedText.length > 0) {
        // Placer le curseur à la fin du lien
        textarea.setSelectionRange(start + markdown.length, start + markdown.length);
      } else {
        // Sélectionner le texte du lien pour faciliter son remplacement
        textarea.setSelectionRange(start + 1, start + 1 + linkText.length);
      }
    }, 0);
  };

  // Gérer l'insertion d'une image
  const handleInsertImage = () => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;

    const url = prompt("Entrez l'URL de l'image:", 'https://');
    if (!url) return;

    const altText = prompt("Entrez le texte alternatif (description) de l'image:", "Description de l'image");
    const markdown = `![${altText || 'Image'}](${url})`;

    // Insérer le markdown de l'image
    const newContent = textarea.value.substring(0, start) + markdown + textarea.value.substring(start);

    setEditedContent(newContent);

    // Régler le focus après le rendu
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + markdown.length, start + markdown.length);
    }, 0);
  };

  // Fonction spéciale pour vider le scratchpad
  const handleClearScratchpad = async () => {
    if (
      scratchpad &&
      window.confirm('Êtes-vous sûr de vouloir vider le contenu du Scratchpad ? Cette action est irréversible.')
    ) {
      await notesStorage.updateNote(SCRATCHPAD_ID, {
        content:
          '# 📥 Scratchpad\n\nUtilisez cette note comme collecteur rapide pour vos idées et captures web.\n\n---\n\n',
      });

      // Si le scratchpad est sélectionné, mettre à jour l'affichage
      if (selectedNote && selectedNote.id === SCRATCHPAD_ID) {
        const updatedScratchpad = await notesStorage.getNote(SCRATCHPAD_ID);
        if (updatedScratchpad) {
          setSelectedNote(updatedScratchpad);
        }
      }
    }
  };

  // Exporter une note individuelle en Markdown
  const handleExportNote = async () => {
    if (selectedNote) {
      try {
        await exportNoteToMarkdown(selectedNote);
      } catch (error) {
        console.error("Erreur lors de l'export de la note:", error);
        alert("Erreur lors de l'export de la note en Markdown.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-opacity-80 backdrop-blur-sm border-b border-gray-800 shadow-md py-3 px-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="text-2xl" role="img" aria-label="Dodo">
            🦤
          </span>
          <span className="text-xl font-bold text-blue-400">DoDai Notes</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Liste de tags pour filtrage */}
        {allTags.length > 0 && (
          <div className="mb-6 overflow-x-auto">
            <div className="flex items-center space-x-2 pb-2">
              <h3 className="text-sm font-medium text-gray-400">Filtrer par tag:</h3>
              {activeTag && (
                <button
                  onClick={clearTagFilter}
                  className="text-xs px-2 py-1 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-md flex items-center"
                  title="Effacer le filtre">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3 mr-1"
                    viewBox="0 0 20 20"
                    fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Effacer
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => handleTagFilter(tag)}
                  className={`text-xs px-2 py-1 rounded-full ${
                    activeTag === tag ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}>
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Liste des notes avec options de tri */}
          <section className="md:col-span-1 bg-gray-800 rounded-lg p-4 h-[calc(100vh-150px)] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-blue-400">Mes Notes</h2>
              <button
                onClick={handleCreateNewNote}
                className="p-1.5 bg-blue-600 hover:bg-blue-700 rounded-full text-white transition flex items-center justify-center"
                title="Créer une nouvelle note">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {/* Options de tri */}
            <div className="flex justify-end mb-3">
              <select
                value={sortOption}
                onChange={handleSortChange}
                className="text-xs px-2 py-1 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none">
                <option value="updatedAt_desc">Modifié récemment</option>
                <option value="updatedAt_asc">Modifié anciennement</option>
                <option value="createdAt_desc">Créé récemment</option>
                <option value="createdAt_asc">Créé anciennement</option>
                <option value="title_asc">Titre (A-Z)</option>
                <option value="title_desc">Titre (Z-A)</option>
              </select>
            </div>

            {/* Scratchpad toujours affiché en premier */}
            {scratchpad && (
              <div
                className={`mb-4 p-3 rounded-md cursor-pointer bg-gradient-to-r from-blue-900 to-gray-800 border border-blue-500 hover:bg-blue-800 transition ${
                  selectedNote?.id === SCRATCHPAD_ID ? 'border-l-4 border-blue-400' : ''
                }`}
                onClick={() => handleSelectNote(scratchpad)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleSelectNote(scratchpad);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-pressed={selectedNote?.id === SCRATCHPAD_ID}>
                <div className="flex justify-between items-center">
                  <h3 className="font-bold flex items-center">
                    <span className="mr-2">📥</span>
                    Scratchpad
                  </h3>
                  {selectedNote?.id === SCRATCHPAD_ID && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleClearScratchpad();
                      }}
                      className="text-xs px-2 py-1 bg-gray-700 hover:bg-red-700 rounded text-gray-300 hover:text-white transition"
                      title="Vider le Scratchpad">
                      Vider
                    </button>
                  )}
                </div>
                <p className="text-gray-300 text-sm mt-1 truncate">Capturez rapidement des contenus web et des idées</p>
                <div className="flex items-center mt-2 text-xs text-blue-300">
                  <span className="mr-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3 w-3 inline"
                      viewBox="0 0 20 20"
                      fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  {formatDate(scratchpad.updatedAt)}
                </div>
              </div>
            )}

            {filteredAndSortedNotes.length === 0 && !scratchpad ? (
              <div className="text-center py-8">
                <p className="text-gray-400 italic mb-4">
                  {activeTag ? `Aucune note avec le tag #${activeTag}` : 'Aucune note pour le moment'}
                </p>
                {activeTag ? (
                  <button
                    onClick={clearTagFilter}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white transition">
                    Effacer le filtre
                  </button>
                ) : (
                  <button
                    onClick={handleCreateNewNote}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white transition">
                    Créer ma première note
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAndSortedNotes.map(note => (
                  <div
                    key={note.id}
                    className={`p-3 rounded-md cursor-pointer hover:bg-gray-700 transition ${
                      selectedNote?.id === note.id ? 'bg-gray-700 border-l-4 border-blue-400' : ''
                    }`}
                    onClick={() => handleSelectNote(note)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleSelectNote(note);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-pressed={selectedNote?.id === note.id}>
                    <h3 className="font-medium truncate">{note.title}</h3>
                    <p className="text-gray-400 text-sm mt-1 truncate">
                      {note.content.substring(0, 60)}
                      {note.content.length > 60 ? '...' : ''}
                    </p>
                    {/* Affichage des tags dans la carte de note */}
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {note.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-xs bg-gray-600 text-blue-300 px-1.5 py-0.5 rounded">
                            #{tag}
                          </span>
                        ))}
                        {note.tags.length > 3 && <span className="text-xs text-gray-400">+{note.tags.length - 3}</span>}
                      </div>
                    )}
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500">{formatDate(note.updatedAt)}</span>
                      {note.sourceUrl && <span className="text-xs text-blue-400">Source web</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Contenu de la note */}
          <section className="md:col-span-2 bg-gray-800 rounded-lg p-4 h-[calc(100vh-150px)] overflow-y-auto">
            {!selectedNote ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-16 w-16 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p>Sélectionnez une note ou créez-en une nouvelle</p>
                <button
                  onClick={handleCreateNewNote}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white transition">
                  Créer une note
                </button>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                {/* Barre d'actions */}
                <div className="flex justify-between items-center mb-4">
                  <div>
                    {!isEditing && <h2 className="text-xl font-semibold text-blue-400">{selectedNote.title}</h2>}
                  </div>
                  <div className="flex space-x-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => setShowPreview(!showPreview)}
                          className={`px-3 py-1 ${showPreview ? 'bg-gray-600' : 'bg-purple-600 hover:bg-purple-700'} rounded text-white text-sm transition flex items-center gap-1`}>
                          {showPreview ? (
                            <>
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
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                              <span>Éditer</span>
                            </>
                          ) : (
                            <>
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
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                              <span>Aperçu</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={handleSaveChanges}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-white text-sm transition flex items-center gap-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Sauvegarder</span>
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-white text-sm transition flex items-center gap-1">
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
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                          <span>Annuler</span>
                        </button>
                        <button
                          onClick={handleExportNote}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors">
                          Exporter en MD
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleEditMode}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors">
                          Modifier
                        </button>
                        <button
                          onClick={handleExportNote}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors">
                          Exporter en MD
                        </button>
                        <button
                          onClick={handleDeleteNote}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors">
                          Supprimer
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Formulaire d'édition ou affichage du contenu */}
                {isEditing ? (
                  <div className="flex-1 flex flex-col space-y-4">
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-400 mb-1">
                        Titre
                      </label>
                      <input
                        type="text"
                        id="title"
                        value={editedTitle}
                        onChange={e => setEditedTitle(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Éditeur de tags */}
                    <div>
                      <label htmlFor="tags" className="block text-sm font-medium text-gray-400 mb-1">
                        Tags
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {editedTags.map(tag => (
                          <div
                            key={tag}
                            className="flex items-center bg-gray-700 text-white px-2 py-1 rounded-full text-sm">
                            #{tag}
                            <button
                              onClick={() => handleRemoveTag(tag)}
                              className="ml-1 text-gray-400 hover:text-white"
                              aria-label="Supprimer ce tag">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3.5 w-3.5"
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
                      <div className="flex">
                        <input
                          type="text"
                          id="tags"
                          value={tagInput}
                          onChange={e => setTagInput(e.target.value)}
                          onKeyDown={handleTagInputKeyDown}
                          placeholder="Ajouter un tag..."
                          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-l-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={handleAddTag}
                          disabled={!tagInput.trim()}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-r-md text-white">
                          Ajouter
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Appuyez sur Entrée pour ajouter rapidement un tag</p>
                    </div>

                    {showPreview ? (
                      <div className="flex-1 overflow-auto">
                        <div className="p-4 bg-gray-700 border border-gray-600 rounded-md h-full overflow-y-auto">
                          <h3 className="text-lg font-semibold text-blue-400 mb-2">Aperçu</h3>
                          {/* Preview des tags */}
                          {editedTags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                              {editedTags.map(tag => (
                                <span key={tag} className="bg-gray-600 text-blue-300 px-2 py-1 rounded-full text-sm">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="prose prose-invert prose-sm sm:prose-base lg:prose-lg max-w-none">
                            <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]} remarkPlugins={[remarkGfm]}>
                              {editedContent}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col">
                        <div className="mb-1">
                          <label htmlFor="content" className="block text-sm font-medium text-gray-400">
                            Contenu (supporte la syntaxe Markdown)
                          </label>
                        </div>

                        {/* Barre d'outils Markdown enrichie */}
                        <div className="flex flex-wrap gap-1 mb-2 p-2 bg-gray-700 rounded-t-md border-t border-l border-r border-gray-600">
                          <div className="flex space-x-1">
                            <button
                              onClick={() => insertMarkdown('# ')}
                              className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                              title="Titre H1">
                              H1
                            </button>
                            <button
                              onClick={() => insertMarkdown('## ')}
                              className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                              title="Titre H2">
                              H2
                            </button>
                            <button
                              onClick={() => insertMarkdown('### ')}
                              className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                              title="Titre H3">
                              H3
                            </button>
                          </div>

                          <div className="h-6 w-px bg-gray-600 mx-1"></div>

                          <div className="flex space-x-1">
                            <button
                              onClick={() => insertMarkdown('**', '**')}
                              className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded font-bold text-sm"
                              title="Gras">
                              B
                            </button>
                            <button
                              onClick={() => insertMarkdown('*', '*')}
                              className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded italic text-sm"
                              title="Italique">
                              I
                            </button>
                            <button
                              onClick={() => insertMarkdown('~~', '~~')}
                              className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm line-through"
                              title="Barré">
                              S
                            </button>
                          </div>

                          <div className="h-6 w-px bg-gray-600 mx-1"></div>

                          <div className="flex space-x-1">
                            <button
                              onClick={() => insertMarkdown('- ')}
                              className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                              title="Liste à puces">
                              • Liste
                            </button>
                            <button
                              onClick={() => insertMarkdown('1. ')}
                              className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                              title="Liste numérotée">
                              1. Liste
                            </button>
                            <button
                              onClick={() => insertMarkdown('- [ ] ')}
                              className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                              title="Liste à cocher">
                              ☐ Tâche
                            </button>
                          </div>

                          <div className="h-6 w-px bg-gray-600 mx-1"></div>

                          <div className="flex space-x-1">
                            <button
                              onClick={() => insertMarkdown('> ')}
                              className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                              title="Citation">
                              " Quote
                            </button>
                            <button
                              onClick={() => insertMarkdown('```\n', '\n```')}
                              className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                              title="Bloc de code">
                              {'<>'} Code
                            </button>
                            <button
                              onClick={() => insertMarkdown('---\n')}
                              className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                              title="Ligne horizontale">
                              —
                            </button>
                          </div>

                          <div className="h-6 w-px bg-gray-600 mx-1"></div>

                          <div className="flex space-x-1">
                            <button
                              onClick={handleInsertLink}
                              className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                              title="Insérer un lien">
                              🔗 Lien
                            </button>
                            <button
                              onClick={handleInsertImage}
                              className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                              title="Insérer une image">
                              🖼️ Image
                            </button>
                          </div>

                          <div className="h-6 w-px bg-gray-600 mx-1"></div>

                          {/* TODO: Futur emplacement pour options d'IA */}
                          {/* 
                          <div className="flex space-x-1">
                            <button
                              onClick={() => {/* Appel au service d'IA pour reformuler */
                          /*}}
                              className="p-1.5 bg-purple-600 hover:bg-purple-700 rounded text-sm"
                              title="IA: Reformuler la sélection">
                              ✨ Reformuler
                            </button>
                            <button
                              onClick={() => {/* Appel au service d'IA pour résumer */
                          /*}}
                              className="p-1.5 bg-purple-600 hover:bg-purple-700 rounded text-sm"
                              title="IA: Résumer la sélection">
                              📝 Résumer
                            </button>
                          </div>
                          */}
                        </div>

                        <textarea
                          id="content"
                          ref={textareaRef}
                          value={editedContent}
                          onChange={e => setEditedContent(e.target.value)}
                          className="flex-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-b-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm leading-relaxed"
                          placeholder="Entrez votre texte ici. Vous pouvez utiliser la syntaxe Markdown pour mettre en forme votre contenu."
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 flex-1">
                    <div className="flex justify-between items-center text-sm text-gray-400">
                      <span>Modifié {formatDate(selectedNote.updatedAt)}</span>
                      <span>Créé {formatDate(selectedNote.createdAt)}</span>
                    </div>

                    {/* Affichage des tags en mode lecture */}
                    {selectedNote.tags && selectedNote.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 py-2">
                        {selectedNote.tags.map(tag => (
                          <span key={tag} className="bg-gray-700 text-blue-300 px-2 py-1 rounded-full text-sm">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {selectedNote.sourceUrl && (
                      <div className="py-2 px-3 bg-gray-700 rounded text-sm">
                        <span className="text-gray-400">Source: </span>
                        <a
                          href={selectedNote.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline">
                          {selectedNote.sourceUrl}
                        </a>
                      </div>
                    )}
                    <div className="prose prose-invert prose-sm sm:prose-base lg:prose-lg max-w-none bg-gray-700 p-4 rounded-md">
                      <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]} remarkPlugins={[remarkGfm]}>
                        {selectedNote.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default withErrorBoundary(
  withSuspense(
    NotesPage,
    <div className="flex h-screen w-screen items-center justify-center bg-gray-900 text-gray-100">Chargement...</div>,
  ),
  <div className="flex h-screen w-screen items-center justify-center bg-gray-900 text-gray-100">
    Une erreur est survenue
  </div>,
);
