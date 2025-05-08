import type React from 'react';
import { useState } from 'react';
import type { NoteEntry, ChatConversation } from '@extension/storage';
import NoteCard from './NoteCard';
import FolderCard from './FolderCard';
import ScratchpadCard from './ScratchpadCard';
import SortOptions from './SortOptions';
import type { SortOption } from '../hooks/useFilterAndSort';
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

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold text-blue-400">DoDai Notes</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Section Mes Notes */}
        <div className="mb-1">
          <button
            onClick={() => onToggleSection('notes')}
            className="w-full p-2 flex items-center justify-between text-left bg-gray-800 hover:bg-gray-700 transition-colors">
            <div className="flex items-center">
              <span className="mr-2">{expandedSection === 'notes' ? '▼' : '▶'}</span>
              <span className="font-medium">Mes Notes</span>
            </div>
            <div className="flex gap-2">
              {/* Bouton pour créer un dossier */}
              <button
                onClick={e => {
                  e.stopPropagation();
                  handleShowNewFolderInput();
                }}
                className="p-1 bg-blue-600 hover:bg-blue-700 rounded-full text-white transition flex items-center justify-center"
                title="Créer un nouveau dossier">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-5L9 4H4zm7 5a1 1 0 10-2 0v1H8a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V9z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {/* Bouton pour créer une note */}
              <button
                onClick={e => {
                  e.stopPropagation();
                  onCreateNote();
                }}
                className="p-1 bg-blue-600 hover:bg-blue-700 rounded-full text-white transition flex items-center justify-center"
                title="Créer une nouvelle note">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </button>
        </div>

        {expandedSection === 'notes' && (
          <div className="p-2">
            {/* Input pour création de dossier */}
            {showNewFolderInput && (
              <div className="mb-2 flex">
                <input
                  type="text"
                  value={folderNameInput}
                  onChange={handleFolderNameInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Nom du dossier"
                  className="flex-1 bg-gray-700 text-white rounded-l-md px-3 py-1"
                />
                <button
                  onClick={handleCreateFolder}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-r-md">
                  OK
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
                <div className="text-center py-4">
                  <p className="text-gray-400 italic mb-2">Aucune note pour le moment</p>
                  <button
                    onClick={() => onCreateNote()}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-md text-white transition">
                    Créer ma première note
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
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
        <div className="mb-1">
          <button
            onClick={() => onToggleSection('chats')}
            className="w-full p-2 flex items-center justify-between text-left bg-gray-800 hover:bg-gray-700 transition-colors">
            <div className="flex items-center">
              <span className="mr-2">{expandedSection === 'chats' ? '▼' : '▶'}</span>
              <span className="font-medium">Mes Chats</span>
            </div>
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
                      className={`w-full text-left p-2 rounded-md cursor-pointer hover:bg-gray-700/50 transition ${
                        selectedChatId === conversation.id ? 'bg-gray-700 border-l-4 border-blue-400' : ''
                      }`}
                      onClick={() => onSelectChat(conversation.id)}>
                      <div className="flex items-center">
                        <svg
                          className="h-4 w-4 mr-2 text-gray-400"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8-1.174 0-2.298-.19-3.344-.535L4 20l1.5-4a8.204 8.204 0 01-.652-3.21C4.848 8.42 8.58 4.8 13.52 4.8c4.94 0 8.48 4.02 8.48 8V12z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span className="truncate">{conversation.name}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
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
              <div className="text-center py-4">
                <p className="text-gray-400 italic">Aucune conversation</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tag indicator at bottom if active */}
      {activeTag && (
        <div className="p-2 bg-gray-700 border-t border-gray-600 flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-xs text-gray-400 mr-2">Filtre actif:</span>
            <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">#{activeTag}</span>
          </div>
          <button onClick={() => onNavigateToFolder(null)} className="text-xs text-gray-400 hover:text-white">
            Revenir à la racine
          </button>
        </div>
      )}
    </div>
  );
};

export default LeftSidebar;
