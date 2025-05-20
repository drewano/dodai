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

  const navItems: NavItemProps[] = [
    {
      id: 'canvas',
      label: 'Canvas',
      icon: <LayoutDashboard size={20} />,
      onClick: () => navigate('/canvas'),
      isActive: location.pathname.startsWith('/canvas'),
      title: 'Accéder au Canvas',
    },
    {
      id: 'notes',
      label: 'Notes',
      icon: <BookText size={20} />,
      onClick: () => navigate('/notes'),
      isActive: location.pathname.startsWith('/notes'),
      title: 'Accéder aux Notes',
    },
  ];

  if (location.pathname.startsWith('/canvas')) {
    navItems.push({
      id: 'new-canvas',
      label: 'Nouveau Canvas',
      icon: <PlusCircle size={20} />,
      onClick: () => {
        resetChatAndArtifact();
        navigate('/canvas');
      },
      isActive: false,
      title: 'Commencer un nouveau Canvas',
    });
  }

  if (location.pathname.startsWith('/notes')) {
    navItems.push({
      id: 'new-note',
      label: 'Nouvelle Note',
      icon: <FilePlus2 size={20} />,
      onClick: async () => {
        await handleCreateNewNote(null);
        navigate('/notes');
      },
      isActive: false,
      title: 'Créer une nouvelle note',
    });
  }

  return (
    <div className="flex h-screen bg-background-primary text-text-primary">
      <DodaiSidebar navItems={navItems} initialIsExpanded={true} />
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
