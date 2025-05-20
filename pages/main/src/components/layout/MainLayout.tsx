import type React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { DodaiSidebar, type NavItemProps } from '@extension/ui';
import { BookText, LayoutDashboard, PlusCircle, FilePlus2 } from 'lucide-react';

import { useDodai } from '@src/features/canvas/contexts/DodaiContext';
import { useNotes } from '@src/features/notes/hooks/useNotes';
import { useNoteSelection } from '@src/features/notes/hooks/useNoteSelection';
import { useDodaiCanvasHistory } from '@src/features/canvas/hooks/useDodaiCanvasHistory';

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    resetChatAndArtifact,
    messages: dodaiContextMessages,
    selectedDodaiModel: dodaiContextSelectedModel,
    setMessages: dodaiContextSetMessages,
  } = useDodai();
  const { notes, addNote, getNote } = useNotes();
  const { handleCreateNewNote } = useNoteSelection(notes, getNote, addNote);
  const { saveCurrentChatSession, createNewConversation } = useDodaiCanvasHistory();

  // Define individual button configurations
  const newCanvasButton: NavItemProps = {
    id: 'new-canvas',
    label: 'Nouveau Canvas',
    icon: <PlusCircle size={20} />,
    onClick: async () => {
      console.log('[MainLayout] New Canvas button clicked.');
      await resetChatAndArtifact(async () => {
        if (dodaiContextMessages.length > 0) {
          console.log('[MainLayout] Saving current session before reset...');
          await saveCurrentChatSession(dodaiContextMessages, dodaiContextSelectedModel || undefined);
          console.log('[MainLayout] Current session saved.');
        } else {
          console.log('[MainLayout] No active session to save before reset.');
        }
      });

      console.log('[MainLayout] Creating new conversation in history...');
      const newChatData = await createNewConversation(
        "Nouvelle conversation. Comment puis-je vous aider aujourd'hui ?",
        dodaiContextSelectedModel || undefined,
      );

      if (newChatData.success && newChatData.initialMessages) {
        console.log('[MainLayout] New conversation created in history, setting initial messages in context.');
        dodaiContextSetMessages(newChatData.initialMessages);
      } else {
        console.error('[MainLayout] Failed to create new conversation in history:', newChatData.error);
        dodaiContextSetMessages([
          {
            id: 'fallback-new-chat',
            role: 'assistant',
            content: 'Impossible de créer une nouvelle session, veuillez réessayer.',
            timestamp: Date.now(),
          },
        ]);
      }

      navigate('/canvas');
    },
    isActive: false,
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
      navigate('/notes');
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

  let primaryNewButton = newCanvasButton;
  if (isCanvasPath) {
    primaryNewButton = newCanvasButton;
  } else if (isNotesPath) {
    primaryNewButton = newNoteButton;
  } else {
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
