import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import type { NoteEntry, ChatConversation } from '@extension/storage';
import NoteCard from '../list/NoteCard';
import FolderCard from '../list/FolderCard';
import ScratchpadCard from '../list/ScratchpadCard';
import SortOptions from '../list/SortOptions';
import type { SortOption } from '../../hooks/useFilterAndSort';
import { DndContext, useSensor, useSensors, MouseSensor, TouchSensor } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';

// Types pour les données de drag-and-drop
interface DragDataNote {
  type: 'note';
  note: NoteEntry;
}

interface DragDataFolder {
  type: 'folder';
  folder: NoteEntry;
  folderId?: string;
}

type DragData = DragDataNote | DragDataFolder;

interface LeftSidebarProps {
  notes: NoteEntry[];
  scratchpad: NoteEntry | null;
  chatHistory: ChatConversation[];
  currentFolderId: string | null;
  selectedNoteId: string | null;
  selectedChatId: string | null;
  sortOption: SortOption;
  expandedSection: 'notes' | 'chats' | null;
  activeTag: string | null;
  onToggleSection: (section: 'notes' | 'chats') => void;
  onSelectNote: (note: NoteEntry) => void;
  onSelectChat: (chatId: string) => void;
  onCreateNote: () => Promise<NoteEntry | null>;
  onCreateFolder: (parentId: string | null, title: string) => Promise<string | null>;
  onNavigateToFolder: (folderId: string | null) => void;
  onClearScratchpad: () => Promise<NoteEntry | null>;
  onMoveNoteToFolder: (noteId: string, folderId: string | null) => Promise<void>;
  onMoveFolder: (folderId: string, targetFolderId: string | null) => Promise<void>;
  onCreateFolderFromNotes: (noteAId: string, noteBId: string, folderTitle: string) => Promise<string | null>;
  onSortChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  getChildrenOf: (folderId: string) => NoteEntry[];
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  notes,
  scratchpad,
  chatHistory,
  currentFolderId,
  selectedNoteId,
  selectedChatId,
  sortOption,
  expandedSection,
  activeTag,
  onToggleSection,
  onSelectNote,
  onSelectChat,
  onCreateNote,
  onCreateFolder,
  onNavigateToFolder,
  onClearScratchpad,
  onMoveNoteToFolder,
  onMoveFolder,
  onCreateFolderFromNotes,
  onSortChange,
  getChildrenOf,
}) => {
  const [folderNameInput, setFolderNameInput] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);

  // Gérer la fermeture du menu lors d'un clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showCreateMenu &&
        createMenuRef.current &&
        !createMenuRef.current.contains(event.target as Node) &&
        createButtonRef.current &&
        !createButtonRef.current.contains(event.target as Node)
      ) {
        setShowCreateMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCreateMenu]);

  // Configurar les sensors pour DnD
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10, // Distance en pixels avant que le drag commence
    },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250, // Délai en ms avant que le drag commence (pour éviter les conflits avec les tap/click)
      tolerance: 5, // Tolérance de mouvement pendant le délai
    },
  });
  const sensors = useSensors(mouseSensor, touchSensor);

  // Gérer la fin d'un drag
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!active || !over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Si on dépose sur le même élément, ne rien faire
    if (activeId === overId) return;

    // Si on dépose sur un droppable de dossier
    if (overId.startsWith('droppable-')) {
      const targetFolderId = overId.replace('droppable-', '');
      const activeType = (active.data.current as DragData)?.type;

      if (activeType === 'note') {
        // Déplacer une note dans un dossier
        onMoveNoteToFolder(activeId, targetFolderId);
      } else if (activeType === 'folder') {
        // Déplacer un dossier dans un autre dossier
        onMoveFolder(activeId, targetFolderId);
      }
    }
    // Si on dépose une note sur une autre note (pas dans un dossier)
    else {
      const activeType = (active.data.current as DragData)?.type;
      const overType = (over.data.current as DragData)?.type;

      if (activeType === 'note' && overType === 'note') {
        // Créer un nouveau dossier à partir de ces deux notes
        const folderName = prompt('Nom du nouveau dossier:');
        if (folderName) {
          onCreateFolderFromNotes(activeId, overId, folderName);
        }
      }
    }
  };

  const handleCreateFolder = async () => {
    if (!folderNameInput.trim()) return;

    await onCreateFolder(currentFolderId, folderNameInput);
    setFolderNameInput('');
    setShowNewFolderInput(false);
  };

  const handleShowNewFolderInput = () => {
    setShowNewFolderInput(true);
    setShowCreateMenu(false);
  };

  const handleCreateNote = () => {
    onCreateNote();
    setShowCreateMenu(false);
  };

  const handleFolderNameInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFolderNameInput(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateFolder();
    } else if (e.key === 'Escape') {
      setShowNewFolderInput(false);
      setFolderNameInput('');
    }
  };

  // Input de création de dossier
  const handleNewFolderInputMount = (inputElement: HTMLInputElement | null) => {
    if (inputElement) {
      inputElement.focus();
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-800 text-slate-100">
      {/* En-tête avec bouton de création */}
      <div className="p-3 border-b border-slate-700/70 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-200">Explorer</h2>
        <div className="relative">
          <button
            ref={createButtonRef}
            onClick={() => setShowCreateMenu(!showCreateMenu)}
            className="px-2.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span className="text-sm font-medium">Nouveau</span>
          </button>

          {/* Menu déroulant pour création */}
          {showCreateMenu && (
            <div
              ref={createMenuRef}
              className="absolute right-0 mt-1 w-48 py-1 bg-slate-700 shadow-lg rounded-md z-10 border border-slate-600">
              <button
                onClick={handleCreateNote}
                className="flex items-center w-full px-4 py-2 text-sm text-slate-200 hover:bg-slate-600/70 transition-colors">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Nouvelle note
              </button>
              <button
                onClick={handleShowNewFolderInput}
                className="flex items-center w-full px-4 py-2 text-sm text-slate-200 hover:bg-slate-600/70 transition-colors">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  <line x1="12" y1="11" x2="12" y2="17" />
                  <line x1="9" y1="14" x2="15" y2="14" />
                </svg>
                Nouveau dossier
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Section Mes Notes */}
        <div className="mb-0.5 px-2 pt-2">
          <button
            onClick={() => onToggleSection('notes')}
            className="w-full p-2 flex items-center justify-between text-left rounded-md hover:bg-slate-700/70 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500/30">
            <div className="flex items-center">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2 text-slate-400">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span className="font-medium text-slate-200">Mes Notes</span>
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`text-slate-400 transition-transform duration-200 ${
                expandedSection === 'notes' ? 'rotate-90' : ''
              }`}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {expandedSection === 'notes' && (
          <div className="p-2">
            {/* Input pour création de dossier */}
            {showNewFolderInput && (
              <div className="mb-2 flex overflow-hidden rounded-md shadow-sm">
                <input
                  type="text"
                  value={folderNameInput}
                  onChange={handleFolderNameInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Nom du dossier"
                  ref={handleNewFolderInputMount}
                  className="flex-1 bg-slate-700 text-slate-100 rounded-l-md px-3 py-1.5 border-r border-slate-600 placeholder:text-slate-400 focus:outline-none"
                />
                <button
                  onClick={handleCreateFolder}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-r-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                  Créer
                </button>
              </div>
            )}

            {/* Sort options */}
            <SortOptions value={sortOption} onChange={onSortChange} />

            {/* Notes and folders list */}
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              {/* Scratchpad - toujours affiché au niveau racine */}
              {scratchpad && currentFolderId === null && (
                <ScratchpadCard
                  scratchpad={scratchpad}
                  isSelected={selectedNoteId === scratchpad.id}
                  onSelect={onSelectNote}
                  onClear={async () => {
                    const result = await onClearScratchpad();
                    return result || null;
                  }}
                />
              )}

              {/* Liste des dossiers et notes */}
              {notes.length === 0 && !scratchpad ? (
                <div className="text-center py-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-700/40 text-slate-500 mb-3">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path d="M14 2v6h6" />
                      <path d="M12 18v-6" />
                      <path d="M9 15h6" />
                    </svg>
                  </div>
                  <p className="text-slate-400 text-sm mb-3">Aucune note pour le moment</p>
                  <button
                    onClick={() => onCreateNote()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white transition-colors shadow-sm font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                    Créer ma première note
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {notes.map(item => {
                    if (item.type === 'folder') {
                      // Calculer le nombre de notes dans ce dossier
                      const children = getChildrenOf(item.id);
                      return (
                        <FolderCard
                          key={item.id}
                          folder={item}
                          isSelected={selectedNoteId === item.id}
                          isOpen={currentFolderId === item.id}
                          onSelect={onSelectNote}
                          onOpen={folder => onNavigateToFolder(folder.id)}
                          notesCount={children.length}
                        />
                      );
                    } else {
                      return (
                        <NoteCard
                          key={item.id}
                          note={item}
                          isSelected={selectedNoteId === item.id}
                          onSelect={onSelectNote}
                        />
                      );
                    }
                  })}
                </div>
              )}
            </DndContext>
          </div>
        )}

        {/* Section Mes Chats */}
        <div className="mb-0.5 px-2 pt-1">
          <button
            onClick={() => onToggleSection('chats')}
            className="w-full p-2 flex items-center justify-between text-left rounded-md hover:bg-slate-700/70 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500/30">
            <div className="flex items-center">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2 text-slate-400">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <circle cx="9" cy="10" r="1" />
                <circle cx="12" cy="10" r="1" />
                <circle cx="15" cy="10" r="1" />
              </svg>
              <span className="font-medium text-slate-200">Mes Chats</span>
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`text-slate-400 transition-transform duration-200 ${
                expandedSection === 'chats' ? 'rotate-90' : ''
              }`}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {expandedSection === 'chats' && (
          <div className="p-2">
            {chatHistory && chatHistory.length > 0 ? (
              <div className="space-y-1">
                {[...chatHistory]
                  .sort((a, b) => b.updatedAt - a.updatedAt)
                  .map(conversation => (
                    <button
                      type="button"
                      key={conversation.id}
                      className={`w-full text-left p-2 rounded-md cursor-pointer hover:bg-slate-700/70 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500/30 ${
                        selectedChatId === conversation.id
                          ? 'bg-slate-700 border-l-4 border-blue-500 pl-[calc(0.5rem-4px)]'
                          : ''
                      }`}
                      onClick={() => onSelectChat(conversation.id)}>
                      <div className="flex items-center">
                        <svg
                          className="h-4 w-4 mr-2 text-slate-400"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          <path d="M12 8V8.01" />
                          <path d="M12 12V12.01" />
                          <path d="M12 16V16.01" />
                        </svg>
                        <span className="truncate text-slate-300">{conversation.name}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 ml-6">
                        {new Date(conversation.updatedAt).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </div>
                    </button>
                  ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-700/40 text-slate-500 mb-3">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    <line x1="9" y1="10" x2="15" y2="10" />
                  </svg>
                </div>
                <p className="text-slate-400 text-sm">Aucune conversation</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tag indicator at bottom if active */}
      {activeTag && (
        <div className="p-2 bg-slate-700/80 border-t border-slate-700 flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-xs text-slate-400 mr-2">Filtre actif:</span>
            <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-md"># {activeTag}</span>
          </div>
          <button
            onClick={() => onNavigateToFolder(null)}
            className="text-xs text-slate-400 hover:text-white transition-colors focus:outline-none rounded px-1.5 py-0.5 hover:bg-slate-600/50">
            Revenir à la racine
          </button>
        </div>
      )}
    </div>
  );
};

export default LeftSidebar;
