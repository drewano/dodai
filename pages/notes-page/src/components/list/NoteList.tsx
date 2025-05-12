import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import type { NoteEntry } from '@extension/storage';
import NoteCard from './NoteCard';
import FolderCard from './FolderCard';
import ScratchpadCard from './ScratchpadCard';
import FolderBreadcrumb from '../common/FolderBreadcrumb';
import SortOptions from './SortOptions';
import type { SortOption } from '../../hooks/useFilterAndSort';
import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext, useSensor, useSensors, MouseSensor, TouchSensor } from '@dnd-kit/core';

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

interface NoteListProps {
  notes: NoteEntry[];
  scratchpad: NoteEntry | null;
  currentFolderId: string | null;
  folderPath: NoteEntry[];
  selectedNoteId: string | null;
  sortOption: SortOption;
  onSelectNote: (note: NoteEntry) => void;
  onCreateNote: () => Promise<NoteEntry | null>;
  onCreateFolder: (parentId: string | null, title: string) => Promise<string | null>;
  onNavigateToFolder: (folderId: string | null) => void;
  onClearScratchpad: () => Promise<NoteEntry | null>;
  onMoveNoteToFolder: (noteId: string, folderId: string | null) => Promise<void>;
  onMoveFolder: (folderId: string, targetFolderId: string | null) => Promise<void>;
  onCreateFolderFromNotes: (noteAId: string, noteBId: string, folderTitle: string) => Promise<string | null>;
  onSortChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  getChildrenOf: (folderId: string) => NoteEntry[];
  onContextMenu: (event: React.MouseEvent, item: NoteEntry) => void;
}

const NoteList: React.FC<NoteListProps> = ({
  notes,
  scratchpad,
  currentFolderId,
  folderPath,
  selectedNoteId,
  sortOption,
  onSelectNote,
  onCreateNote,
  onCreateFolder,
  onNavigateToFolder,
  onClearScratchpad,
  onMoveNoteToFolder,
  onMoveFolder,
  onCreateFolderFromNotes,
  onSortChange,
  getChildrenOf,
  onContextMenu,
}) => {
  const [folderNameInput, setFolderNameInput] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const folderNameInputRef = useRef<HTMLInputElement>(null);

  // Focus sur l'input quand il est affiché
  useEffect(() => {
    if (showNewFolderInput && folderNameInputRef.current) {
      folderNameInputRef.current.focus();
    }
  }, [showNewFolderInput]);

  // Configurer les sensors pour DnD
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

  // Gérer l'événement quand on est au dessus d'une cible potentielle
  const handleDragOver = () => {
    // Si besoin, ajouter une logique supplémentaire ici
    // comme modifier l'UI pour indiquer la possibilité de déposer
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

  const handleOpenFolder = (folder: NoteEntry) => {
    onNavigateToFolder(folder.id);
  };

  return (
    <section className="md:col-span-1 bg-gray-800 rounded-lg p-4 h-[calc(100vh-150px)] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-blue-400">Mes Notes</h2>
        <div className="flex gap-2">
          {/* Bouton pour créer un dossier */}
          <button
            onClick={handleShowNewFolderInput}
            className="p-1.5 bg-blue-600 hover:bg-blue-700 rounded-full text-white transition flex items-center justify-center"
            title="Créer un nouveau dossier">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-5L9 4H4zm7 5a1 1 0 10-2 0v1H8a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V9z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {/* Bouton pour créer une note */}
          <button
            onClick={onCreateNote}
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
      </div>

      {/* Input pour création de dossier */}
      {showNewFolderInput && (
        <div className="mb-4 flex">
          <input
            ref={folderNameInputRef}
            type="text"
            value={folderNameInput}
            onChange={handleFolderNameInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Nom du dossier"
            className="flex-1 bg-gray-700 text-white rounded-l-md px-3 py-2"
          />
          <button
            onClick={handleCreateFolder}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-md">
            OK
          </button>
        </div>
      )}

      {/* Breadcrumb navigation */}
      <FolderBreadcrumb path={folderPath} onNavigate={onNavigateToFolder} />

      {/* Sort options */}
      <SortOptions value={sortOption} onChange={onSortChange} />

      {/* Scratchpad - toujours affiché au niveau racine */}
      {scratchpad && currentFolderId === null && (
        <ScratchpadCard
          scratchpad={scratchpad}
          isSelected={selectedNoteId === scratchpad.id}
          onSelect={onSelectNote}
          onClear={() => onClearScratchpad()}
          onContextMenu={e => onContextMenu(e, scratchpad)}
        />
      )}

      {/* Liste des dossiers et notes */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd} onDragOver={handleDragOver}>
        {notes.length === 0 && !scratchpad ? (
          <div className="text-center py-8">
            <p className="text-gray-400 italic mb-4">Aucune note pour le moment</p>
            <button
              onClick={onCreateNote}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white transition">
              Créer ma première note
            </button>
          </div>
        ) : (
          <div className="space-y-2">
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
                    onOpen={handleOpenFolder}
                    notesCount={children.length}
                    onContextMenu={e => onContextMenu(e, item)}
                  />
                );
              } else {
                return (
                  <NoteCard
                    key={item.id}
                    note={item}
                    isSelected={selectedNoteId === item.id}
                    onSelect={onSelectNote}
                    onContextMenu={e => onContextMenu(e, item)}
                  />
                );
              }
            })}
          </div>
        )}
      </DndContext>
    </section>
  );
};

export default NoteList;
