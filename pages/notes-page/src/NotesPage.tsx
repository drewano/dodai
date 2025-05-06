import { withErrorBoundary, withSuspense, useStorage } from '@extension/shared';
import { notesStorage, type NoteEntry } from '@extension/storage';
import { useEffect, useState } from 'react';
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

  // Formater la date pour l'affichage
  const formatDate = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: fr });
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
            <h2 className="text-xl font-semibold mb-4 text-blue-400">Mes Notes</h2>

            {sortedNotes.length === 0 ? (
              <p className="text-gray-400 italic">Aucune note pour le moment</p>
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
                <p>Sélectionnez une note pour afficher son contenu</p>
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
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-white text-sm transition">
                          {showPreview ? 'Éditer' : 'Aperçu'}
                        </button>
                        <button
                          onClick={handleSaveChanges}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-white text-sm transition">
                          Sauvegarder
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-white text-sm transition">
                          Annuler
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleEditMode}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm transition">
                          Modifier
                        </button>
                        <button
                          onClick={handleDeleteNote}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-sm transition">
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
                    {showPreview ? (
                      <div className="flex-1 overflow-auto">
                        <div className="p-4 bg-gray-700 border border-gray-600 rounded-md h-full overflow-y-auto">
                          <div className="prose prose-invert prose-sm sm:prose-base lg:prose-lg max-w-none">
                            <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]} remarkPlugins={[remarkGfm]}>
                              {editedContent}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col">
                        <div className="flex justify-between items-center mb-1">
                          <label htmlFor="content" className="block text-sm font-medium text-gray-400">
                            Contenu (supporte la syntaxe Markdown)
                          </label>
                          <div className="flex space-x-1 text-xs text-gray-400">
                            <button
                              onClick={() => setEditedContent(prev => prev + '\n# Titre')}
                              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">
                              H1
                            </button>
                            <button
                              onClick={() => setEditedContent(prev => prev + '\n## Sous-titre')}
                              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">
                              H2
                            </button>
                            <button
                              onClick={() => setEditedContent(prev => prev + '\n**Texte en gras**')}
                              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">
                              B
                            </button>
                            <button
                              onClick={() => setEditedContent(prev => prev + '\n*Texte en italique*')}
                              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">
                              I
                            </button>
                            <button
                              onClick={() => setEditedContent(prev => prev + '\n- Élément de liste')}
                              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">
                              • Liste
                            </button>
                            <button
                              onClick={() => setEditedContent(prev => prev + '\n> Citation')}
                              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">
                              Quote
                            </button>
                            <button
                              onClick={() => setEditedContent(prev => prev + '\n```\nBloc de code\n```')}
                              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded">
                              Code
                            </button>
                          </div>
                        </div>
                        <textarea
                          id="content"
                          value={editedContent}
                          onChange={e => setEditedContent(e.target.value)}
                          className="flex-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm leading-relaxed"
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
                    <div className="prose prose-invert prose-sm sm:prose-base lg:prose-lg max-w-none">
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
