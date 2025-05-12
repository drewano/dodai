import React, { useEffect, useRef, useState } from 'react';
import FolderBreadcrumb from '../common/FolderBreadcrumb';
import type { NoteEntry } from '@extension/storage';
import type { SaveStatus } from '../../hooks/useNoteEditing';
import * as Popover from '@radix-ui/react-popover';
import { Globe, Link2, Edit3, Check, X, Copy, ExternalLink } from 'lucide-react';

interface HeaderProps {
  showLeftSidebar: boolean;
  showRightSidebar: boolean;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  selectedNote: NoteEntry | null;
  selectedItemType: 'note' | 'chat';
  folderPath: NoteEntry[];
  navigateToFolder: (folderId: string | null) => void;
  currentFolderId: string | null;

  editedTitle: string;
  setEditedTitle: (title: string) => void;
  editedTags: string[];
  setEditedTags: (tagsOrCallback: string[] | ((prevTags: string[]) => string[])) => void;
  tagInput: string;
  setTagInput: (input: string) => void;
  saveStatus: SaveStatus;
  lastError: string | null;
  isDirty: boolean;
  handleAddTag: () => void;
  handleRemoveTag: (tagToRemove: string) => void;
  handleSaveChanges: () => Promise<void>;
  handleCancelEdit: () => void;
  editedSourceUrl: string | undefined;
  setEditedSourceUrl: (url: string | undefined) => void;
}

const Header: React.FC<HeaderProps> = ({
  showLeftSidebar,
  showRightSidebar,
  toggleLeftSidebar,
  toggleRightSidebar,
  selectedNote,
  selectedItemType,
  folderPath,
  navigateToFolder,
  currentFolderId,
  editedTitle,
  setEditedTitle,
  editedTags,
  tagInput,
  setTagInput,
  saveStatus,
  lastError,
  handleAddTag,
  handleRemoveTag,
  editedSourceUrl,
  setEditedSourceUrl,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const [isSourceUrlPopoverOpen, setIsSourceUrlPopoverOpen] = useState(false);
  const [isEditingSourceUrl, setIsEditingSourceUrl] = useState(false);
  const [localSourceUrlEdit, setLocalSourceUrlEdit] = useState('');
  const sourceUrlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (isAddingTag && tagInputRef.current) {
      tagInputRef.current.focus();
    }
  }, [isAddingTag]);

  useEffect(() => {
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

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedTitle(e.target.value);
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
  };

  const handleTitleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
      e.currentTarget.blur();
    }
  };

  const openTagInput = () => {
    setIsAddingTag(true);
  };

  const handleNewTagInputBlur = () => {
    if (tagInput.trim()) {
      handleAddTag();
    }
    setIsAddingTag(false);
  };

  const handleNewTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (tagInput.trim()) {
        handleAddTag();
      }
      setIsAddingTag(false);
    } else if (e.key === 'Escape') {
      setTagInput('');
      setIsAddingTag(false);
    }
  };

  const handleSourceUrlIconClick = () => {
    if (selectedNote?.sourceUrl) {
      window.open(selectedNote.sourceUrl, '_blank', 'noopener,noreferrer');
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
    if (editedSourceUrl) {
      try {
        await navigator.clipboard.writeText(editedSourceUrl);
        console.log('Source URL copied to clipboard');
      } catch (err) {
        console.error('Failed to copy source URL: ', err);
      }
    }
  };

  const handleOpenSourceUrl = () => {
    if (editedSourceUrl) {
      window.open(editedSourceUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const SaveStatusIndicator: React.FC = () => {
    if (selectedItemType !== 'note' || !selectedNote || saveStatus === 'idle') {
      return null;
    }
    let statusText = '';
    let textColor = 'text-gray-400';
    let icon = null;

    switch (saveStatus) {
      case 'modified':
        statusText = 'Modifications...';
        textColor = 'text-yellow-400';
        icon = (
          <svg className="w-3 h-3 mr-1 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
            <path
              fillRule="evenodd"
              d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
              clipRule="evenodd"
            />
          </svg>
        );
        break;
      case 'saving':
        statusText = 'Sauvegarde...';
        textColor = 'text-blue-400';
        icon = (
          <svg
            className="animate-spin h-3 w-3 mr-1.5 text-blue-400"
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
        icon = (
          <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        );
        break;
      case 'error':
        statusText = `Erreur ${lastError ? ': ' + lastError : ''}`;
        textColor = 'text-red-400';
        icon = (
          <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
        break;
    }

    return (
      <div className={`flex items-center text-xs ${textColor} px-1.5 py-0.5 rounded-md bg-slate-700/50 flex-shrink-0`}>
        {icon}
        {statusText}
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-800/85 backdrop-blur-lg border-b border-slate-700/50 shadow-sm py-1.5 px-4 flex items-center gap-3">
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-500 text-transparent bg-clip-text tracking-tight">
          DoDai Notes
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleLeftSidebar}
            className={`p-1.5 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
              showLeftSidebar
                ? 'bg-slate-700/80 text-slate-200 hover:bg-slate-600'
                : 'bg-slate-700/40 text-slate-400 hover:bg-slate-700/60 hover:text-slate-300'
            }`}
            title={showLeftSidebar ? 'Masquer la barre latérale gauche' : 'Afficher la barre latérale gauche'}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              {showLeftSidebar ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <>
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M9 3v18" />
                </>
              )}
            </svg>
          </button>
          <button
            onClick={toggleRightSidebar}
            className={`p-1.5 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
              showRightSidebar
                ? 'bg-slate-700/80 text-slate-200 hover:bg-slate-600'
                : 'bg-slate-700/40 text-slate-400 hover:bg-slate-700/60 hover:text-slate-300'
            }`}
            title={showRightSidebar ? 'Masquer la barre latérale droite' : 'Afficher la barre latérale droite'}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              {showRightSidebar ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <>
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M15 3v18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      <div className="h-6 w-px bg-slate-700/50 mx-1 flex-shrink-0"></div>

      <div className="flex-1 flex items-center gap-2 min-w-0 overflow-hidden">
        {currentFolderId && selectedItemType === 'note' && (
          <div className="text-sm flex-shrink-0">
            <FolderBreadcrumb path={folderPath} onNavigate={navigateToFolder} />
            <span className="text-slate-500">/</span>
          </div>
        )}

        {selectedItemType === 'note' && selectedNote ? (
          <React.Fragment>
            {editedSourceUrl && (
              <Popover.Root open={isSourceUrlPopoverOpen} onOpenChange={setIsSourceUrlPopoverOpen}>
                <Popover.Trigger asChild>
                  <button
                    className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 focus:outline-none focus:ring-1 focus:ring-blue-500/40 flex-shrink-0"
                    title="View/Edit Source URL"
                  >
                    <Link2 size={16} />
                  </button>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content
                    side="bottom"
                    align="start"
                    sideOffset={5}
                    className="bg-slate-700 border border-slate-600 rounded-md shadow-xl p-3 w-80 z-50 text-slate-100 text-sm"
                    onCloseAutoFocus={(e) => e.preventDefault()}
                  >
                    {isEditingSourceUrl ? (
                      <div className="space-y-2">
                        <label htmlFor="sourceUrlInput" className="block text-xs font-medium text-slate-300">Edit Source URL</label>
                        <input
                          ref={sourceUrlInputRef}
                          id="sourceUrlInput"
                          type="url"
                          value={localSourceUrlEdit}
                          onChange={(e) => setLocalSourceUrlEdit(e.target.value)}
                          placeholder="https://example.com"
                          className="w-full bg-slate-800 border border-slate-600 rounded-md px-2 py-1.5 text-sm text-slate-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={handleCancelSourceUrlEdit}
                            className="px-3 py-1 text-xs rounded-md bg-slate-600 hover:bg-slate-500 text-slate-200 transition-colors"
                          >
                            <X size={14} className="inline mr-1"/> Cancel
                          </button>
                          <button
                            onClick={handleSaveSourceUrl}
                            className="px-3 py-1 text-xs rounded-md bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                          >
                            <Check size={14} className="inline mr-1"/> Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <p className="font-medium text-slate-200">Source URL</p>
                          <button
                            onClick={handleEditSourceUrl}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-600/50 transition-colors"
                            title="Edit Source URL"
                          >
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
                              title={editedSourceUrl}
                            >
                              {editedSourceUrl}
                            </a>
                          </div>
                        ) : (
                          <p className="text-slate-400 italic">No URL provided.</p>
                        )}
                        <div className="flex gap-2 pt-2 border-t border-slate-600/70 mt-2">
                           <button
                            onClick={handleOpenSourceUrl}
                            disabled={!editedSourceUrl}
                            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md bg-slate-600/80 hover:bg-slate-600 text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <ExternalLink size={14}/> Open Link
                          </button>
                          <button
                            onClick={handleCopySourceUrl}
                            disabled={!editedSourceUrl}
                            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md bg-slate-600/80 hover:bg-slate-600 text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <Copy size={14}/> Copy URL
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
                type="text"
                value={editedTitle}
                onChange={handleTitleChange}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleInputKeyDown}
                placeholder="Sans titre"
                className="font-medium text-base text-slate-100 bg-transparent px-2 py-1 focus:outline-none min-w-[100px] flex-grow"
                ref={titleInputRef}
              />
            ) : (
              <div
                className="font-medium text-base text-slate-100 truncate cursor-text px-2 py-1 min-w-[100px] flex-grow"
                onClick={handleTitleClick}
                onKeyDown={handleTitleDivKeyDown}
                role="button"
                tabIndex={0}
                title={editedTitle || 'Sans titre'}>
                {editedTitle || 'Sans titre'}
              </div>
            )}

            <div className="flex items-center gap-1.5 flex-wrap flex-shrink-0 ml-2">
              {editedTags.map(tag => (
                <div
                  key={tag}
                  className="flex items-center bg-violet-600/80 hover:bg-violet-500/80 text-white px-2.5 py-1 rounded-lg text-sm cursor-default">
                  <span>{tag}</span>
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-2 text-violet-200 hover:text-white focus:outline-none"
                    aria-label={`Supprimer le tag ${tag}`}>
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
            </div>

            <div className="flex-shrink-0">
              {isAddingTag ? (
                <input
                  ref={tagInputRef}
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleNewTagKeyDown}
                  onBlur={handleNewTagInputBlur}
                  placeholder="#nouveau-tag"
                  className="text-sm bg-slate-700/60 text-slate-100 placeholder-slate-400 px-2.5 py-1 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500 w-36"
                />
              ) : (
                <button
                  onClick={openTagInput}
                  className="p-1.5 rounded-md text-violet-400 hover:text-violet-300 hover:bg-violet-600/30 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  title="Ajouter un tag">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                </button>
              )}
            </div>

            <SaveStatusIndicator />
          </React.Fragment>
        ) : selectedItemType === 'chat' ? (
          <div className="font-medium text-lg text-slate-100 truncate">Conversation</div>
        ) : (
          <div className="font-medium text-lg text-slate-400 truncate">Sélectionnez une note</div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">{/* Emplacement pour des actions futures */}</div>
    </header>
  );
};

export default Header;
