import type React from 'react';
import { useEffect, useState, useRef } from 'react';
import { type PartialBlock, type BlockNoteEditor } from '@blocknote/core';
import { BlockNoteView } from '@blocknote/mantine';
import type { Theme } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import type { NoteEntry } from '@extension/storage';
import FloatingTextAction from '../../../../../packages/ui/lib/components/FloatingTextAction';
import { MessageType } from '../../../../../chrome-extension/src/background/types';
import type { ModifySelectedTextResponse } from '../../../../../chrome-extension/src/background/types';

// Define the custom dark theme for BlockNote
const dodaiDarkTheme: Theme = {
  colors: {
    editor: {
      text: '#e2e8f0', // slate-200
      background: '#1e293b', // slate-850
    },
    menu: {
      text: '#e2e8f0', // slate-200
      background: '#0f172a', // slate-900
    },
    tooltip: {
      text: '#e2e8f0', // slate-200
      background: '#0f172a', // slate-900
    },
    hovered: {
      text: '#f1f5f9', // slate-100
      background: '#334155', // slate-700
    },
    selected: {
      text: '#f1f5f9', // slate-100
      background: '#2563eb', // blue-600 (accent for selection)
    },
    disabled: {
      text: '#475569', // slate-600
      background: '#1e293b', // slate-850
    },
    shadow: '#0f172a', // slate-900
    border: '#334155', // slate-700
    sideMenu: '#94a3b8', // slate-400 (for the drag handle)
    highlights: {
      gray: { text: '#e2e8f0', background: '#334155' }, // slate-200 on slate-700
      brown: { text: '#e2e8f0', background: '#78350f' }, // slate-200 on amber-800 (example)
      red: { text: '#e2e8f0', background: '#991b1b' }, // slate-200 on red-800 (example)
      orange: { text: '#e2e8f0', background: '#9a3412' }, // slate-200 on orange-800 (example)
      yellow: { text: '#1e293b', background: '#facc15' }, // slate-800 on yellow-400 (example)
      green: { text: '#e2e8f0', background: '#166534' }, // slate-200 on green-800 (example)
      blue: { text: '#e2e8f0', background: '#1e40af' }, // slate-200 on blue-800 (example)
      purple: { text: '#e2e8f0', background: '#581c87' }, // slate-200 on purple-800 (example)
      pink: { text: '#e2e8f0', background: '#9d174d' }, // slate-200 on pink-800 (example)
    },
  },
  borderRadius: 4,
  fontFamily:
    'Source Sans Pro, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
};

interface NoteEditorProps {
  editor: BlockNoteEditor;
  selectedNote: NoteEntry | null;
  onSyncInitialContent: (contentJSON: string) => void;
  onTextModified?: () => void;
}

const NoteEditor: React.FC<NoteEditorProps> = ({ editor, selectedNote, onSyncInitialContent, onTextModified }) => {
  const [isFloatingActionVisible, setIsFloatingActionVisible] = useState(false);
  const [floatingActionPosition, setFloatingActionPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedTextContent, setSelectedTextContent] = useState('');
  const [isModifyingSelectedText, setIsModifyingSelectedText] = useState(false);
  const noteEditorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) return;

    if (selectedNote) {
      const contentToLoad = selectedNote.content || '';
      let newBlocks: PartialBlock[] = [];
      let successfullyParsedAsBlocks = false;

      if (contentToLoad) {
        try {
          const parsedJson = JSON.parse(contentToLoad);
          if (Array.isArray(parsedJson)) {
            if (
              parsedJson.length === 0 ||
              (parsedJson.length > 0 &&
                typeof parsedJson[0] === 'object' &&
                parsedJson[0] !== null &&
                'type' in parsedJson[0])
            ) {
              newBlocks = parsedJson as PartialBlock[];
              successfullyParsedAsBlocks = true;
            }
          } else if (typeof parsedJson === 'object' && parsedJson !== null && 'type' in parsedJson) {
            newBlocks = [parsedJson as PartialBlock];
            successfullyParsedAsBlocks = true;
          }
        } catch (error) {
          console.warn('Failed to parse content as JSON, will attempt Markdown parsing:', error);
        }
      } else {
        successfullyParsedAsBlocks = true;
      }

      const loadContentIntoEditor = async () => {
        if (successfullyParsedAsBlocks) {
          if (JSON.stringify(editor.document) !== JSON.stringify(newBlocks)) {
            editor.replaceBlocks(editor.document, newBlocks);
          }
        } else {
          try {
            const markdownBlocks = await editor.tryParseMarkdownToBlocks(contentToLoad);
            if (JSON.stringify(editor.document) !== JSON.stringify(markdownBlocks)) {
              editor.replaceBlocks(
                editor.document,
                markdownBlocks.length > 0 ? markdownBlocks : [{ type: 'paragraph', content: '' }],
              );
            }
          } catch (errorParsingMarkdown) {
            console.error('Failed to parse Markdown to blocks in NoteEditor:', errorParsingMarkdown);
            const fallbackText = contentToLoad || 'Erreur lors du chargement du contenu.';
            editor.replaceBlocks(editor.document, [
              { type: 'paragraph', content: [{ type: 'text', text: fallbackText, styles: {} }] },
            ]);
          }
        }
        onSyncInitialContent(JSON.stringify(editor.document));
      };
      loadContentIntoEditor();
    } else {
      const currentContent = editor.document[0]?.content;
      const isEmptyDefault =
        editor.document.length === 1 &&
        editor.document[0]?.type === 'paragraph' &&
        (currentContent === undefined ||
          (Array.isArray(currentContent) && currentContent.length === 0) ||
          (Array.isArray(currentContent) &&
            currentContent.length === 1 &&
            currentContent[0].type === 'text' &&
            (currentContent[0] as { text?: string }).text === ''));

      if (!isEmptyDefault) {
        editor.replaceBlocks(editor.document, [{ type: 'paragraph', content: '' }]);
      }
      onSyncInitialContent(JSON.stringify(editor.document));
    }
  }, [editor, selectedNote, onSyncInitialContent]);

  useEffect(() => {
    if (!editor) {
      setIsFloatingActionVisible(false);
      return;
    }

    const handleSelectionChange = () => {
      if (!editor) {
        setIsFloatingActionVisible(false);
        return;
      }
      const selection = editor.getSelection();
      const currentSelectedText = editor.getSelectedText();

      if (selection && currentSelectedText.trim() !== '') {
        setSelectedTextContent(currentSelectedText);
        const editorViewElement = noteEditorRef.current?.querySelector('.bn-editor');
        if (editorViewElement) {
          const domSelection = window.getSelection();
          if (domSelection && domSelection.rangeCount > 0) {
            const range = domSelection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const editorRect = editorViewElement.getBoundingClientRect();

            const topPosition = rect.top - editorRect.top - 40;
            const leftPosition = rect.left - editorRect.left + rect.width / 2;

            setFloatingActionPosition({ top: Math.max(0, topPosition), left: Math.max(0, leftPosition) });
            setIsFloatingActionVisible(true);
          } else {
            setIsFloatingActionVisible(false);
          }
        } else {
          const fallbackRect = noteEditorRef.current?.getBoundingClientRect();
          const domSelectionForFallback = window.getSelection();
          if (fallbackRect && domSelectionForFallback && domSelectionForFallback.rangeCount > 0) {
            const range = domSelectionForFallback.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const topPosition = rect.top - fallbackRect.top - 40;
            const leftPosition = rect.left - fallbackRect.left + rect.width / 2;
            setFloatingActionPosition({ top: Math.max(0, topPosition), left: Math.max(0, leftPosition) });
            setIsFloatingActionVisible(true);
          } else {
            setIsFloatingActionVisible(false);
          }
        }
      } else {
        setIsFloatingActionVisible(false);
        setSelectedTextContent('');
      }
    };

    const unsubscribe = editor.onSelectionChange(handleSelectionChange);
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [editor]);

  const handleFloatingActionSubmit = async (instructions: string) => {
    if (!editor || !selectedTextContent.trim() || isModifyingSelectedText) return;

    setIsModifyingSelectedText(true);
    try {
      chrome.runtime.sendMessage(
        {
          type: MessageType.MODIFY_SELECTED_TEXT_REQUEST,
          payload: {
            selectedText: selectedTextContent,
            userInstructions: instructions,
            documentTitle: selectedNote?.title || 'Note',
          },
        },
        (response: ModifySelectedTextResponse) => {
          setIsModifyingSelectedText(false);
          if (chrome.runtime.lastError) {
            console.error('Error modifying selected text in NoteEditor:', chrome.runtime.lastError.message);
            setIsFloatingActionVisible(false);
            return;
          }
          if (response && response.success && response.modifiedText) {
            editor.insertInlineContent(response.modifiedText);
            setIsFloatingActionVisible(false);
            onTextModified?.();
          } else {
            console.error('Failed to modify selected text in NoteEditor:', response?.error);
            setIsFloatingActionVisible(false);
          }
        },
      );
    } catch (error) {
      console.error('Exception sending MODIFY_SELECTED_TEXT_REQUEST from NoteEditor:', error);
      setIsModifyingSelectedText(false);
      setIsFloatingActionVisible(false);
    }
  };

  const handleFloatingActionCancel = () => {
    setIsFloatingActionVisible(false);
    setSelectedTextContent('');
  };

  return (
    <div ref={noteEditorRef} className="flex-1 flex flex-col h-full relative">
      {selectedNote && floatingActionPosition && (
        <FloatingTextAction
          isVisible={isFloatingActionVisible}
          top={floatingActionPosition.top}
          left={floatingActionPosition.left}
          onSubmit={handleFloatingActionSubmit}
          onCancel={handleFloatingActionCancel}
          isLoading={isModifyingSelectedText}
          zIndex={1050}
        />
      )}
      {selectedNote && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 w-full bg-slate-850 border border-gray-700 rounded-b-md text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-mono text-sm leading-relaxed editor-container">
            <BlockNoteView editor={editor} theme={dodaiDarkTheme} editable={true} />
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteEditor;
