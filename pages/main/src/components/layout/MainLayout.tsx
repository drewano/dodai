import type React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { DodaiSidebar, type NavItemProps } from '@extension/ui';
import { BookText, LayoutDashboard, PlusCircle, FilePlus2, Settings, ServerCog, Sparkles } from 'lucide-react';

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
    currentArtifact: dodaiContextCurrentArtifact,
  } = useDodai();
  const { notes, addNote, getNote } = useNotes();
  const { handleCreateNewNote } = useNoteSelection(notes, getNote, addNote);
  const { resetActiveSession, saveCurrentChatSessionAsNew } = useDodaiCanvasHistory();

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
          await saveCurrentChatSessionAsNew(
            dodaiContextMessages,
            dodaiContextCurrentArtifact,
            dodaiContextSelectedModel || undefined,
          );
          console.log('[MainLayout] Current session saved.');
          resetActiveSession();
        } else {
          console.log('[MainLayout] No active session to save before reset.');
          resetActiveSession();
        }
      });

      console.log('[MainLayout] New Canvas session started - ready for user input.');

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

  const mcpToolsButton: NavItemProps = {
    id: 'mcp-tools',
    label: 'Outils MCP',
    icon: <ServerCog size={20} />,
    onClick: () => {},
    isActive: false,
    title: 'Gérer les outils MCP',
  };

  const sidebarIAButton: NavItemProps = {
    id: 'sidebar-ia',
    label: 'Sidebar IA',
    icon: <Sparkles size={20} />,
    onClick: () => {
      try {
        if (typeof chrome !== 'undefined' && chrome.sidePanel) {
          // Récupérer l'ID de la fenêtre actuelle et ouvrir le side panel
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].windowId) {
              chrome.sidePanel.open({ windowId: tabs[0].windowId });
              console.log('[MainLayout] Side panel opened for window:', tabs[0].windowId);
            } else {
              console.warn('[MainLayout] Unable to get current window ID');
            }
          });
        } else {
          console.warn('[MainLayout] chrome.sidePanel not available');
        }
      } catch (error) {
        console.error('[MainLayout] Error opening side panel:', error);
      }
    },
    isActive: false,
    title: 'Ouvrir la sidebar IA',
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

  navItems = [primaryNewButton, canvasButton, notesButton, mcpToolsButton, sidebarIAButton];

  // Define footer items (Options button)
  const optionsButton: NavItemProps = {
    id: 'options',
    label: 'Options',
    icon: <Settings size={20} />,
    onClick: () => {
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
          chrome.runtime.openOptionsPage();
        } else {
          console.warn('[MainLayout] chrome.runtime.openOptionsPage not available');
        }
      } catch (error) {
        console.error('[MainLayout] Error opening options page:', error);
      }
    },
    isActive: false,
    title: "Ouvrir les options de l'extension",
  };

  const footerItems: NavItemProps[] = [optionsButton];

  return (
    <div className="flex h-screen bg-background-primary text-text-primary">
      <DodaiSidebar navItems={navItems} footerItems={footerItems} initialIsExpanded={true} />
      <main className="flex-1 pt-6 pr-6 pb-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
