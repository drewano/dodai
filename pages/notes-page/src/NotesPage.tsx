import { withErrorBoundary, withSuspense, useStorage } from '@extension/shared';
import { notesStorage, type NoteEntry } from '@extension/storage';
import { useEffect, useState, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

const NotesPage = () => {
  const notes = useStorage(notesStorage);
  const [selectedNote, setSelectedNote] = useState<NoteEntry | null>(null);
  const [editedTitle, setEditedTitle] = useState<string>('');
  const [editedContent, setEditedContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Trier les notes par date de mise à jour (plus récent en premier)
  const sortedNotes = notes ? [...notes].sort((a, b) => b.updatedAt - a.updatedAt) : [];

  // Mettre à jour le formulaire d'édition quand une note est sélectionnée
  useEffect(() => {
    if (selectedNote) {
      setEditedTitle(selectedNote.title);
      setEditedContent(selectedNote.content);
    } else {
      setEditedTitle('');
      setEditedContent('');
      setIsEditing(false);
    }
  }, [selectedNote]);

  // Gérer la sélection d'une note
  const handleSelectNote = (note: NoteEntry) => {
    setSelectedNote(note);
    setIsEditing(false);
    setShowPreview(false);
  };

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
    if (selectedNote && (editedTitle !== selectedNote.title || editedContent !== selectedNote.content)) {
      await notesStorage.updateNote(selectedNote.id, {
        title: editedTitle,
        content: editedContent,
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
    }
    setIsEditing(false);
  };

  // Créer une nouvelle note
  const handleCreateNewNote = async () => {
    const timestamp = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const newNoteTitle = `Nouvelle Note (${timestamp})`;
    const newNoteContent = '';

    const newNoteId = await notesStorage.addNote({
      title: newNoteTitle,
      content: newNoteContent,
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Liste des notes */}
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

            {sortedNotes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 italic mb-4">Aucune note pour le moment</p>
                <button
                  onClick={handleCreateNewNote}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white transition">
                  Créer ma première note
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedNotes.map(note => (
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
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleEditMode}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm transition flex items-center gap-1">
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
                          <span>Modifier</span>
                        </button>
                        <button
                          onClick={handleDeleteNote}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-sm transition flex items-center gap-1">
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          <span>Supprimer</span>
                        </button>

                        {/* TODO: Emplacement pour un futur bouton d'assistance IA */}
                        {/* 
                        <button
                          onClick={() => {/* Appel futur au service d'IA */
                        /*}}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-white text-sm transition flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span>Améliorer avec IA</span>
                        </button>
                        */}
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
                    {showPreview ? (
                      <div className="flex-1 overflow-auto">
                        <div className="p-4 bg-gray-700 border border-gray-600 rounded-md h-full overflow-y-auto">
                          <h3 className="text-lg font-semibold text-blue-400 mb-2">Aperçu</h3>
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
