import type React from 'react';
import { useEffect } from 'react';
import TagEditor from '../tag/TagEditor';
import { type PartialBlock, type BlockNoteEditor } from '@blocknote/core';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import type { NoteEntry } from '@extension/storage';

interface NoteEditorProps {
  editor: BlockNoteEditor;
  editedTitle: string;
  editedTags: string[];
  tagInput: string;
  selectedNote: NoteEntry | null;
  onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTagInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTagInputKeyDown: (e: React.KeyboardEvent) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  onSyncInitialContent: (contentJSON: string) => void;
}

const NoteEditor: React.FC<NoteEditorProps> = ({
  editor,
  editedTitle,
  editedTags,
  tagInput,
  selectedNote,
  onTitleChange,
  onTagInputChange,
  onTagInputKeyDown,
  onAddTag,
  onRemoveTag,
  onSyncInitialContent,
}) => {
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

  return (
    <div className="flex-1 flex flex-col h-full">
      {selectedNote && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="mb-5">
            <input
              type="text"
              id="title"
              value={editedTitle}
              onChange={onTitleChange}
              placeholder="Titre de la note..."
              className="w-full px-3 py-3 bg-gray-800 border-0 border-b border-gray-700 text-white text-xl font-medium focus:outline-none focus:border-indigo-500 transition-colors placeholder-gray-500 mb-3"
            />
          </div>

          <TagEditor
            tags={editedTags}
            tagInput={tagInput}
            onAddTag={onAddTag}
            onRemoveTag={onRemoveTag}
            onTagInputChange={onTagInputChange}
            onTagInputKeyDown={onTagInputKeyDown}
          />

          <div className="flex-1 w-full bg-gray-800 border border-gray-700 rounded-b-md text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-mono text-sm leading-relaxed editor-container">
            <BlockNoteView editor={editor} theme="dark" editable={true} />
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteEditor;
