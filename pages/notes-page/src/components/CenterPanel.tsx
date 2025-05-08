import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { exportNoteToMarkdown, useStorage } from '@extension/shared';

import type { NoteEntry } from '@extension/storage';
import { chatHistoryStorage } from '@extension/storage';
import MarkdownToolbar from './MarkdownToolbar';

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
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onEditMode: () => void;
  onSaveChanges: () => Promise<void>;
  onCancelEdit: () => void;
  onDeleteNote: () => Promise<void>;
  onContentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onTagInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTagInputKeyDown: (e: React.KeyboardEvent) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  onTogglePreview: () => void;
  insertMarkdown: (before: string, after?: string) => void;
  handleInsertLink: () => void;
  handleInsertImage: () => void;
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
  onSaveChanges,
  onDeleteNote,
  onContentChange,
  onTagInputChange,
  onTagInputKeyDown,
  onAddTag,
  onRemoveTag,
  onTogglePreview,
  insertMarkdown,
  handleInsertLink,
  handleInsertImage,
}) => {
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save timer for notes
  useEffect(() => {
    if (isEditing && (selectedNote?.title !== editedTitle || selectedNote?.content !== editedContent)) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      setSaveStatus('saving');
      autoSaveTimerRef.current = setTimeout(async () => {
        try {
          await onSaveChanges();
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus(null), 2000);
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

    return (
      <div className="flex flex-col h-full">
        <div className="p-4 pb-2">
          <div className="mb-3 flex justify-between items-center">
            {/* Le titre est maintenant complètement géré dans le Header */}
            <div />

            <div className="flex space-x-2">
              <div className="text-sm text-gray-400 flex items-center mr-2">
                {saveStatus === 'saving' && (
                  <span className="inline-flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-400"
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
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="inline-flex items-center text-green-500">
                    <svg className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Sauvegardé
                  </span>
                )}
                {saveStatus === 'error' && (
                  <span className="inline-flex items-center text-red-500">
                    <svg className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Erreur
                  </span>
                )}
              </div>

              <button
                onClick={onTogglePreview}
                className={`px-3 py-1 ${showPreview ? 'bg-gray-600' : 'bg-purple-600 hover:bg-purple-700'} rounded text-white text-sm transition flex items-center gap-1`}>
                {showPreview ? 'Éditer' : 'Aperçu'}
              </button>

              <button
                onClick={handleExportNote}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors">
                Exporter
              </button>

              <button
                onClick={onDeleteNote}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors">
                Supprimer
              </button>
            </div>
          </div>

          {/* Date info */}
          <div className="flex justify-between items-center text-sm text-gray-400 mb-3">
            <span>Modifié {formatDate(selectedNote.updatedAt)}</span>
            <span>Créé {formatDate(selectedNote.createdAt)}</span>
          </div>

          {/* Tags */}
          <div className="mb-3">
            <div className="flex flex-wrap gap-2 mb-2">
              {editedTags.map(tag => (
                <div key={tag} className="flex items-center bg-gray-700 text-blue-300 px-2 py-1 rounded-full text-sm">
                  #{tag}
                  <button onClick={() => onRemoveTag(tag)} className="ml-1 text-gray-400 hover:text-red-400">
                    ×
                  </button>
                </div>
              ))}
              <div className="flex items-center bg-gray-700 text-gray-300 px-2 py-1 rounded-full text-sm">
                <input
                  type="text"
                  value={tagInput}
                  onChange={onTagInputChange}
                  onKeyDown={onTagInputKeyDown}
                  placeholder="Ajouter un tag"
                  className="bg-transparent border-none outline-none w-24 text-sm"
                />
                {tagInput && (
                  <button onClick={onAddTag} className="ml-1 text-gray-400 hover:text-blue-400">
                    +
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Source URL if present */}
          {selectedNote.sourceUrl && (
            <div className="py-2 px-3 bg-gray-700 rounded text-sm mb-3">
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
        </div>

        {/* Content area - occupies all remaining height */}
        <div className="flex-1 flex flex-col px-4 pb-4">
          {showPreview ? (
            <div className="flex-1 prose prose-invert prose-sm sm:prose-base lg:prose-lg max-w-none bg-gray-800 rounded-md p-6 overflow-y-auto">
              <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]} remarkPlugins={[remarkGfm]}>
                {editedContent}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <MarkdownToolbar
                onInsertMarkdown={insertMarkdown}
                onInsertLink={handleInsertLink}
                onInsertImage={handleInsertImage}
              />
              <textarea
                ref={textareaRef}
                value={editedContent}
                onChange={onContentChange}
                className="flex-1 w-full p-4 bg-gray-800 border border-gray-700 rounded-b-md text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm leading-relaxed"
                placeholder="Commencez à écrire ici..."
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderChatView() {
    if (!selectedChat) {
      return (
        <div className="h-full flex items-center justify-center">
          <p className="text-gray-400">Sélectionnez une conversation pour l'afficher</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">{selectedChat.name}</h2>
          <p className="text-sm text-gray-400">
            {new Date(selectedChat.createdAt).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {selectedChat.messages.map((message, index) => {
            const isUser = message.role === 'user';
            const isSystem = message.role === 'system';

            return (
              <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] p-3 rounded-lg shadow-md text-sm ${
                    isUser
                      ? 'bg-blue-600 text-white'
                      : isSystem
                        ? 'bg-yellow-700 text-yellow-100'
                        : 'bg-gray-700 text-gray-200'
                  }`}>
                  <div className="text-xs mb-1 text-gray-300">{isUser ? 'Vous' : 'Assistant'}</div>
                  <div className="whitespace-pre-wrap prose prose-sm prose-invert max-w-none break-words">
                    <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]} remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                  {message.timestamp && (
                    <div className="mt-1 text-right">
                      <span className="text-xs text-gray-400">
                        {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
