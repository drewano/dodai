import type React from 'react';
import { exportNoteToMarkdown, useStorage } from '@extension/shared';

import type { NoteEntry } from '@extension/storage';
import { chatHistoryStorage } from '@extension/storage';
import { ChatMessage } from '../common/ChatMessage';
import NoteEditor from '../note/NoteEditor';

interface CenterPanelProps {
  selectedItemType: 'note' | 'chat';
  selectedNote: NoteEntry | null;
  selectedChatId: string | null;
  editedTitle: string;
  editedTags: string[];
  tagInput: string;
  onSaveChanges: (newContentJSON: string) => Promise<void>;
  onCancelEdit: () => void;
  onDeleteNote: () => Promise<void>;
  onTagInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTagInputKeyDown: (e: React.KeyboardEvent) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const CenterPanel: React.FC<CenterPanelProps> = ({
  selectedItemType,
  selectedNote,
  selectedChatId,
  editedTitle,
  editedTags,
  tagInput,
  onSaveChanges,
  onCancelEdit,
  onDeleteNote,
  onTagInputChange,
  onTagInputKeyDown,
  onAddTag,
  onRemoveTag,
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
      <NoteEditor
        selectedNote={selectedNote}
        editedTitle={editedTitle}
        editedTags={editedTags}
        tagInput={tagInput}
        onTitleChange={onTitleChange}
        onTagInputChange={onTagInputChange}
        onTagInputKeyDown={onTagInputKeyDown}
        onAddTag={onAddTag}
        onRemoveTag={onRemoveTag}
        onSave={onSaveChanges}
        onCancel={onCancelEdit}
        onExport={handleExportNote}
        onDelete={onDeleteNote}
      />
    );
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
