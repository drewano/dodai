import type React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { DodaiSidebar, type NavItemProps } from '@extension/ui';
import { BookText, LayoutDashboard, PlusCircle, FilePlus2 } from 'lucide-react';

import { useDodai } from '@src/features/canvas/contexts/DodaiContext';
import { useNotes } from '@src/features/notes/hooks/useNotes';
import { useNoteSelection } from '@src/features/notes/hooks/useNoteSelection';

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { resetChatAndArtifact } = useDodai();
  const { notes, addNote, getNote } = useNotes();
  const { handleCreateNewNote } = useNoteSelection(notes, getNote, addNote);

  // Define individual button configurations
  const newCanvasButton: NavItemProps = {
    id: 'new-canvas',
    label: 'Nouveau Canvas',
    icon: <PlusCircle size={20} />,
    onClick: () => {
      resetChatAndArtifact();
      navigate('/canvas'); // Navigate to ensure canvas view is shown
    },
    isActive: false, // Action buttons are not typically "active"
    title: 'Commencer un nouveau Canvas',
  };

  const canvasButton: NavItemProps = {
    id: 'canvas',
    label: 'Canvas',
    icon: <LayoutDashboard size={20} />,
    onClick: () => navigate('/canvas'),
    isActive: location.pathname.startsWith('/canvas'),
    title: 'Accéder au Canvas',
  };

  const newNoteButton: NavItemProps = {
    id: 'new-note',
    label: 'Nouvelle Note',
    icon: <FilePlus2 size={20} />,
    onClick: async () => {
      await handleCreateNewNote(null);
      navigate('/notes'); // Ensure notes view and list are active/updated
    },
    isActive: false,
    title: 'Créer une nouvelle note',
  };

  const notesButton: NavItemProps = {
    id: 'notes',
    label: 'Notes',
    icon: <BookText size={20} />,
    onClick: () => navigate('/notes'),
    isActive: location.pathname.startsWith('/notes'),
    title: 'Accéder aux Notes',
  };

  let navItems: NavItemProps[] = [];
  const isCanvasPath = location.pathname.startsWith('/canvas');
  const isNotesPath = location.pathname.startsWith('/notes');

  // Determine which "New" button to show based on the active path
  // If neither, or on a different path, default to newCanvas or make a specific choice.
  let primaryNewButton = newCanvasButton; // Default
  if (isCanvasPath) {
    primaryNewButton = newCanvasButton;
  } else if (isNotesPath) {
    primaryNewButton = newNoteButton;
  } else {
    // Fallback if on a path other than /canvas or /notes
    // Decide what the default "+" button should be. For instance, new canvas.
    primaryNewButton = newCanvasButton;
  }

  navItems = [primaryNewButton, canvasButton, notesButton];

  return (
    <div className="flex h-screen bg-background-primary text-text-primary">
      <DodaiSidebar navItems={navItems} initialIsExpanded={true} />
      <main className="flex-1 pt-6 pr-6 pb-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
