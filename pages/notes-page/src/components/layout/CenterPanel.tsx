import React from 'react';
import { useStorage } from '@extension/shared';
import type { BlockNoteEditor } from '@blocknote/core';

import type { NoteEntry } from '@extension/storage';
import { chatHistoryStorage } from '@extension/storage';
import { ChatMessage } from '../common/ChatMessage';
import NoteEditor from '../note/NoteEditor';
import type { SaveStatus } from '../../hooks/useNoteEditing';
import * as Popover from '@radix-ui/react-popover';
import { Globe, Link2, Edit3, Check, X, Copy, ExternalLink, Tag, PanelRightOpen, PanelRightClose } from 'lucide-react';

interface CenterPanelProps {
  editor: BlockNoteEditor;
  selectedItemType: 'note' | 'chat';
  selectedNote: NoteEntry | null;
  selectedChatId: string | null;
  onSyncInitialContent: (contentJSON: string) => void;
  onNoteTextModified?: () => void;

  editedTitle: string;
  setEditedTitle: (title: string) => void;
  editedTags: string[];
  tagInput: string;
  setTagInput: (input: string) => void;
  handleAddTag: () => void;
  handleRemoveTag: (tagToRemove: string) => void;

  editedSourceUrl?: string;
  setEditedSourceUrl: (url: string | undefined) => void;

  saveStatus: SaveStatus;
  lastError: string | null;

  showRightSidebar: boolean;
  toggleRightSidebar: () => void;
}

const CenterPanel: React.FC<CenterPanelProps> = ({
  editor,
  selectedItemType,
  selectedNote,
  selectedChatId,
  onSyncInitialContent,
  onNoteTextModified,
  editedTitle,
  setEditedTitle,
  editedTags,
  tagInput,
  setTagInput,
  handleAddTag,
  handleRemoveTag,
  editedSourceUrl,
  setEditedSourceUrl,
  saveStatus,
  lastError,
  showRightSidebar,
  toggleRightSidebar,
}) => {
  const selectedChat = useChatConversation(selectedChatId);
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const titleInputRef = React.useRef<HTMLInputElement>(null);
  const [isAddingTag, setIsAddingTag] = React.useState(false);
  const tagInputRef = React.useRef<HTMLInputElement>(null);
  const [isSourceUrlPopoverOpen, setIsSourceUrlPopoverOpen] = React.useState(false);
  const [isEditingSourceUrl, setIsEditingSourceUrl] = React.useState(false);
  const [localSourceUrlEdit, setLocalSourceUrlEdit] = React.useState('');
  const sourceUrlInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  React.useEffect(() => {
    if (isAddingTag && tagInputRef.current) {
      tagInputRef.current.focus();
    }
  }, [isAddingTag]);

  React.useEffect(() => {
    if (isEditingSourceUrl && sourceUrlInputRef.current) {
      sourceUrlInputRef.current.focus();
      sourceUrlInputRef.current.select();
    }
  }, [isEditingSourceUrl]);

  const handleTitleClick = () => {
    if (selectedItemType === 'note' && selectedNote) {
      setIsEditingTitle(true);
    }
  };
  const handleTitleDivKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleTitleClick();
    }
  };
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => setEditedTitle(e.target.value);
  const handleTitleBlur = () => setIsEditingTitle(false);
  const handleTitleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.currentTarget.blur();
    else if (e.key === 'Escape') {
      setIsEditingTitle(false);
      e.currentTarget.blur();
    }
  };

  const openTagInput = () => setIsAddingTag(true);
  const handleNewTagInputBlur = () => {
    if (tagInput.trim()) handleAddTag();
    setIsAddingTag(false);
  };
  const handleNewTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (tagInput.trim()) handleAddTag();
      setIsAddingTag(false);
    }
  };

  const handleEditSourceUrl = () => {
    setLocalSourceUrlEdit(editedSourceUrl || '');
    setIsEditingSourceUrl(true);
  };
  const handleSaveSourceUrl = () => {
    setEditedSourceUrl(localSourceUrlEdit.trim() || undefined);
    setIsEditingSourceUrl(false);
  };
  const handleCancelSourceUrlEdit = () => {
    setIsEditingSourceUrl(false);
    setLocalSourceUrlEdit(editedSourceUrl || '');
  };
  const handleCopySourceUrl = async () => {
    if (editedSourceUrl) await navigator.clipboard.writeText(editedSourceUrl);
  };
  const handleOpenSourceUrl = () => {
    if (editedSourceUrl) window.open(editedSourceUrl, '_blank', 'noopener,noreferrer');
  };

  const SaveStatusIndicator: React.FC = () => {
    if (selectedItemType !== 'note' || !selectedNote) return null;

    let statusText = '';
    let textColor = 'text-gray-400';
    let icon = null;

    switch (saveStatus) {
      case 'idle':
        return null;
      case 'modified':
        statusText = 'Modifications...';
        textColor = 'text-yellow-400';
        icon = <Edit3 size={14} className="mr-1.5 flex-shrink-0" />;
        break;
      case 'saving':
        statusText = 'Sauvegarde...';
        textColor = 'text-blue-400';
        icon = (
          <svg
            className="animate-spin h-3.5 w-3.5 mr-1.5 text-blue-400 flex-shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
        break;
      case 'saved':
        statusText = 'Enregistré';
        textColor = 'text-green-400';
        icon = <Check size={14} className="mr-1.5 flex-shrink-0" />;
        break;
      case 'error':
        statusText = `Erreur ${lastError ? ': ' + lastError : ''}`;
        textColor = 'text-red-400';
        icon = <X size={14} className="mr-1.5 flex-shrink-0" />;
        break;
    }
    return (
      <div className={`flex items-center text-xs ${textColor} px-2 py-1 rounded-md bg-slate-700/60 flex-shrink-0`}>
        {icon}
        {statusText}
      </div>
    );
  };

  React.useEffect(() => {
    if (!isEditingSourceUrl) {
      setLocalSourceUrlEdit(editedSourceUrl || '');
    }
  }, [editedSourceUrl, isEditingSourceUrl]);

  function renderNoteView() {
    if (!selectedNote) {
      return renderEmptyState();
    }

    return (
      <div className="h-full flex flex-col bg-slate-850">
        <div className="flex items-center gap-2 p-2.5 border-b border-slate-700/70 bg-slate-800 flex-shrink-0 min-h-[52px]">
          <div className="flex-grow min-w-0 flex items-center gap-2">
            {editedSourceUrl && (
              <Popover.Root open={isSourceUrlPopoverOpen} onOpenChange={setIsSourceUrlPopoverOpen}>
                <Popover.Trigger asChild>
                  <button
                    className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 focus:outline-none focus:ring-1 focus:ring-blue-500/40 flex-shrink-0"
                    title="Voir/Modifier l'URL source">
                    <Link2 size={18} />
                  </button>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content
                    side="bottom"
                    align="start"
                    sideOffset={5}
                    className="bg-slate-700 border border-slate-600 rounded-md shadow-xl p-3 w-80 z-50 text-slate-100 text-sm animate-slideUpAndFade"
                    onCloseAutoFocus={e => e.preventDefault()}>
                    {isEditingSourceUrl ? (
                      <div className="space-y-2">
                        <label htmlFor="sourceUrlInputPop" className="block text-xs font-medium text-slate-300">
                          Modifier l'URL source
                        </label>
                        <input
                          ref={sourceUrlInputRef}
                          id="sourceUrlInputPop"
                          type="url"
                          value={localSourceUrlEdit}
                          onChange={e => setLocalSourceUrlEdit(e.target.value)}
                          placeholder="https://example.com"
                          className="w-full bg-slate-800 border border-slate-600 rounded-md px-2 py-1.5 text-sm text-slate-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={handleCancelSourceUrlEdit}
                            className="px-3 py-1 text-xs rounded-md bg-slate-600 hover:bg-slate-500 text-slate-200 transition-colors flex items-center gap-1">
                            <X size={14} /> Annuler
                          </button>
                          <button
                            onClick={handleSaveSourceUrl}
                            className="px-3 py-1 text-xs rounded-md bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-1">
                            <Check size={14} /> Sauvegarder
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <p className="font-medium text-slate-200">URL Source</p>
                          <button
                            onClick={handleEditSourceUrl}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-600/50 transition-colors"
                            title="Modifier l'URL source">
                            <Edit3 size={14} />
                          </button>
                        </div>
                        {editedSourceUrl ? (
                          <div className="flex items-center gap-2 group">
                            <Globe size={14} className="text-slate-400 flex-shrink-0" />
                            <a
                              href={editedSourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate text-blue-400 hover:text-blue-300 hover:underline flex-grow min-w-0"
                              title={editedSourceUrl}>
                              {editedSourceUrl}
                            </a>
                          </div>
                        ) : (
                          <p className="text-slate-400 italic">Aucune URL fournie.</p>
                        )}
                        <div className="flex gap-2 pt-2 border-t border-slate-600/70 mt-2">
                          <button
                            onClick={handleOpenSourceUrl}
                            disabled={!editedSourceUrl}
                            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md bg-slate-600/80 hover:bg-slate-600 text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            <ExternalLink size={14} /> Ouvrir
                          </button>
                          <button
                            onClick={handleCopySourceUrl}
                            disabled={!editedSourceUrl}
                            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md bg-slate-600/80 hover:bg-slate-600 text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            <Copy size={14} /> Copier
                          </button>
                        </div>
                      </div>
                    )}
                    <Popover.Arrow className="fill-current text-slate-700" />
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>
            )}
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={editedTitle}
                onChange={handleTitleChange}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleInputKeyDown}
                placeholder="Sans titre"
                className="font-semibold text-lg text-slate-100 bg-transparent px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-md min-w-[150px] w-full"
              />
            ) : (
              <div
                className="font-semibold text-lg text-slate-100 truncate cursor-text px-1 py-0.5 min-w-[150px] w-full hover:bg-slate-700/50 rounded-md"
                onClick={handleTitleClick}
                onKeyDown={handleTitleDivKeyDown}
                role="button"
                tabIndex={0}
                title={editedTitle || 'Sans titre'}>
                {editedTitle || 'Sans titre'}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {editedTags.map(tag => (
              <div
                key={tag}
                className="flex items-center bg-violet-600/90 hover:bg-violet-500/90 text-white px-2 py-1 rounded-md text-xs cursor-default">
                <span>{tag}</span>
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1.5 p-0.5 rounded-full text-violet-200 hover:text-white hover:bg-violet-700/50 focus:outline-none"
                  aria-label={`Supprimer le tag ${tag}`}>
                  <X size={12} />
                </button>
              </div>
            ))}
            {isAddingTag ? (
              <input
                ref={tagInputRef}
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleNewTagKeyDown}
                onBlur={handleNewTagInputBlur}
                placeholder="#nouveau-tag"
                className="text-xs bg-slate-700 text-slate-100 placeholder-slate-400 px-2 py-1 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500 w-28"
              />
            ) : (
              <button
                onClick={openTagInput}
                className="p-1.5 rounded-md text-violet-400 hover:text-violet-300 hover:bg-violet-600/30 focus:outline-none focus:ring-1 focus:ring-violet-500"
                title="Ajouter un tag">
                <Tag size={16} />
              </button>
            )}
            <SaveStatusIndicator />
            <button
              onClick={toggleRightSidebar}
              className={`p-1.5 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${showRightSidebar ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/60'}`}
              title={showRightSidebar ? 'Masquer le panneau des tags' : 'Afficher le panneau des tags'}>
              {showRightSidebar ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          <NoteEditor
            editor={editor}
            selectedNote={selectedNote}
            onSyncInitialContent={onSyncInitialContent}
            onTextModified={onNoteTextModified}
          />
        </div>
      </div>
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

  if (selectedItemType === 'note') {
    return renderNoteView();
  } else if (selectedItemType === 'chat') {
    return renderChatView();
  } else {
    return renderEmptyState();
  }
};

function useChatConversation(chatId: string | null) {
  const chatHistory = useStorage(chatHistoryStorage);

  if (!chatId || !chatHistory) {
    return null;
  }

  return chatHistory.find(chat => chat.id === chatId) || null;
}

export default CenterPanel;
