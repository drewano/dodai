import type React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { exportNoteToMarkdown, useStorage } from '@extension/shared';

import type { NoteEntry } from '@extension/storage';
import { chatHistoryStorage } from '@extension/storage';
import { ChatMessage } from './ChatMessage';
import NoteEditor from './NoteEditor';

interface CenterPanelProps {
  selectedItemType: 'note' | 'chat';
  selectedNote: NoteEntry | null;
  selectedChatId: string | null;
  editedTitle: string;
  editedContent: string;
  editedTags: string[];
  tagInput: string;
  isEditing: boolean;
  showPreview: boolean;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  onEditMode: () => void;
  onSaveChanges: (newContentJSON: string) => Promise<void>;
  onCancelEdit: () => void;
  onDeleteNote: () => Promise<void>;
  onTagInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTagInputKeyDown: (e: React.KeyboardEvent) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  onTogglePreview: () => void;
  setEditedContentForPreview: (markdown: string) => void;
  onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const CenterPanel: React.FC<CenterPanelProps> = ({
  selectedItemType,
  selectedNote,
  selectedChatId,
  editedTitle,
  editedContent,
  editedTags,
  tagInput,
  isEditing,
  showPreview,
  textareaRef,
  onEditMode,
  onSaveChanges,
  onCancelEdit,
  onDeleteNote,
  onTagInputChange,
  onTagInputKeyDown,
  onAddTag,
  onRemoveTag,
  onTogglePreview,
  setEditedContentForPreview,
  onTitleChange,
}) => {
  // Auto-save timer for notes (entièrement commenté)
  /*
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isEditing && (selectedNote?.title !== editedTitle || selectedNote?.content !== editedContent)) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      setSaveStatus('saving');
      autoSaveTimerRef.current = setTimeout(async () => {
        try {
          console.warn("Auto-save désactivé car il nécessite une refonte pour BlockNote.");
          setSaveStatus(null);
        } catch {
          setSaveStatus('error');
        }
      }, 2000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [editedTitle, editedContent, isEditing, selectedNote, onSaveChanges]);
  */

  // Handle note export
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

  // Format the date for display
  const formatDate = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: fr });
  };

  // Pour le rendu des conversations de chat
  const selectedChat = useChatConversation(selectedChatId);

  if (selectedItemType === 'note') {
    return renderNoteView();
  } else if (selectedItemType === 'chat') {
    return renderChatView();
  } else {
    return renderEmptyState();
  }

  function renderNoteView() {
    if (!selectedNote) {
      return renderEmptyState();
    }

    if (isEditing) {
      return (
        <NoteEditor
          editedTitle={editedTitle}
          editedContent={editedContent}
          editedTags={editedTags}
          tagInput={tagInput}
          showPreview={showPreview}
          selectedNote={selectedNote}
          isEditing={isEditing}
          onTitleChange={onTitleChange}
          onTagInputChange={onTagInputChange}
          onTagInputKeyDown={onTagInputKeyDown}
          onAddTag={onAddTag}
          onRemoveTag={onRemoveTag}
          onTogglePreview={onTogglePreview}
          onSave={onSaveChanges}
          onCancel={onCancelEdit}
          onExport={handleExportNote}
          setEditedContentForPreview={setEditedContentForPreview}
        />
      );
    } else {
      return (
        <div className="flex flex-col h-full">
          {/* Header actions */}
          <div className="p-4 pb-2 border-b border-gray-700 mb-3">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center">
                {/* Affichage du statut de sauvegarde commenté */}
                {/* {saveStatus === 'saving' && ( ... )} */}
                {/* {saveStatus === 'saved' && ( ... )} */}
                {/* {saveStatus === 'error' && ( ... )} */}
              </div>

              <div className="flex gap-2">
                {/* Les boutons Aperçu, Sauvegarder, Annuler sont gérés par NoteEditor quand isEditing est true */}
                {/* Donc, ici, quand isEditing est false, on montre seulement Modifier, Exporter, Supprimer */}
                <button
                  onClick={onEditMode}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded text-white text-sm transition-colors flex items-center gap-1">
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
                  onClick={handleExportNote}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 rounded text-white text-sm transition-colors flex items-center gap-1">
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
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  <span>Exporter</span>
                </button>

                <button
                  onClick={onDeleteNote}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-white text-sm transition-colors flex items-center gap-1">
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
              </div>
            </div>

            {/* Date info */}
            <div className="flex justify-between items-center text-sm text-gray-400 mb-3">
              <span>Modifié {formatDate(selectedNote.updatedAt)}</span>
              <span>Créé {formatDate(selectedNote.createdAt)}</span>
            </div>

            {/* Source URL if present */}
            {selectedNote.sourceUrl && (
              <div className="py-2 px-3 bg-gray-800 rounded text-sm mb-3">
                <span className="text-gray-400">Source: </span>
                <a
                  href={selectedNote.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:underline">
                  {selectedNote.sourceUrl}
                </a>
              </div>
            )}
          </div>

          {/* Note content */}
          <div className="flex-1 flex flex-col px-4 pb-4 overflow-hidden">
            {isEditing ? (
              <div className="flex-1 flex flex-col">
                {/* Title field */}
                <div className="mb-4">
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={() => {
                      /* Handled elsewhere */
                    }}
                    disabled
                    className="w-full px-3 py-3 bg-gray-800 border-0 border-b border-gray-700 text-white text-xl font-medium focus:outline-none focus:border-indigo-500 transition-colors mb-3"
                  />
                </div>

                {/* Tags display */}
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editedTags.map(tag => (
                      <div
                        key={tag}
                        className="flex items-center bg-indigo-900/40 text-indigo-300 px-3 py-1.5 rounded-full text-sm transition-colors hover:bg-indigo-800/50">
                        <span className="mr-1">#</span>
                        {tag}
                        <button
                          onClick={() => onRemoveTag(tag)}
                          className="ml-1.5 text-indigo-300/70 hover:text-indigo-100 transition-colors"
                          aria-label="Supprimer ce tag">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5"
                            viewBox="0 0 20 20"
                            fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center bg-gray-800 text-gray-300 px-3 py-1.5 rounded-full text-sm">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={onTagInputChange}
                        onKeyDown={onTagInputKeyDown}
                        placeholder="Ajouter un tag"
                        className="bg-transparent border-none outline-none w-24 text-sm"
                      />
                      {tagInput && (
                        <button onClick={onAddTag} className="ml-1 text-indigo-400 hover:text-indigo-300">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {showPreview ? (
                  <div className="flex-1 prose prose-invert prose-sm sm:prose-base lg:prose-lg max-w-none bg-gray-800 rounded-md p-6 overflow-y-auto">
                    <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]} remarkPlugins={[remarkGfm]}>
                      {editedContent}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col">
                    <textarea
                      ref={textareaRef}
                      value={editedContent}
                      onChange={() => {
                        /* Handled elsewhere */
                      }}
                      className="flex-1 w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-b-md text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-mono text-sm leading-relaxed"
                      placeholder="Commencez à écrire ici..."
                    />
                  </div>
                )}
              </div>
            ) : (
              // View mode (not editing)
              <div className="flex-1 flex flex-col overflow-auto">
                {/* Title */}
                <h1 className="text-2xl font-bold text-white mb-4">{selectedNote.title || 'Sans titre'}</h1>

                {/* Tags */}
                {selectedNote?.tags && selectedNote.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {selectedNote.tags.map(tag => (
                      <span key={tag} className="bg-indigo-900/40 text-indigo-300 px-3 py-1 rounded-full text-sm">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Content */}
                <div className="prose prose-invert prose-sm sm:prose-base lg:prose-lg max-w-none">
                  <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]} remarkPlugins={[remarkGfm]}>
                    {selectedNote.content}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
  }

  function renderChatView() {
    if (!selectedChat) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-gray-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 mb-4 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          <p>Sélectionnez une conversation pour l'afficher</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* En-tête de conversation */}
        <div className="p-4 border-b border-gray-700 bg-gray-800 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center">
              <svg
                className="w-5 h-5 mr-2 text-indigo-400"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
              </svg>
              {selectedChat.name || 'Conversation sans titre'}
            </h2>
            <div className="flex items-center mt-1 text-sm text-gray-400">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path
                  fillRule="evenodd"
                  d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                  clipRule="evenodd"
                />
              </svg>
              {new Date(selectedChat.createdAt).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>

          {selectedChat.messages.length > 0 && (
            <div className="flex items-center text-sm">
              <span className="text-gray-400 flex items-center bg-gray-700 px-2 py-1 rounded-md">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
                {selectedChat.messages.length} message{selectedChat.messages.length > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Contenu de la conversation */}
        <div className="flex-1 p-4 overflow-y-auto space-y-1">
          {selectedChat.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 py-10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 mb-3 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="text-center">Cette conversation ne contient aucun message.</p>
            </div>
          ) : (
            selectedChat.messages.map((message, index) => (
              <div key={index}>
                <ChatMessage message={message} showReasoning={false} toggleShowReasoning={() => {}} />
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  function renderEmptyState() {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400">
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
      </div>
    );
  }
};

// Hook personnalisé pour récupérer une conversation spécifique
function useChatConversation(chatId: string | null) {
  const chatHistory = useStorage(chatHistoryStorage);

  if (!chatId || !chatHistory) {
    return null;
  }

  return chatHistory.find(chat => chat.id === chatId) || null;
}

export default CenterPanel;
