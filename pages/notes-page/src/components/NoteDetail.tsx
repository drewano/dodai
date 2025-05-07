import type React from 'react';
import type { NoteEntry } from '@extension/storage';
import { exportNoteToMarkdown } from '@extension/shared';
import NoteViewer from './NoteViewer';
import NoteEditor from './NoteEditor';

interface NoteDetailProps {
  selectedNote: NoteEntry | null;
  isEditing: boolean;
  editedTitle: string;
  editedContent: string;
  editedTags: string[];
  tagInput: string;
  showPreview: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onEditMode: () => void;
  onSaveChanges: () => Promise<void>;
  onCancelEdit: () => void;
  onDeleteNote: () => Promise<void>;
  onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onContentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onTagInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTagInputKeyDown: (e: React.KeyboardEvent) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
  onTogglePreview: () => void;
  insertMarkdown: (before: string, after?: string) => void;
  handleInsertLink: () => void;
  handleInsertImage: () => void;
}

const NoteDetail: React.FC<NoteDetailProps> = ({
  selectedNote,
  isEditing,
  editedTitle,
  editedContent,
  editedTags,
  tagInput,
  showPreview,
  textareaRef,
  onEditMode,
  onSaveChanges,
  onCancelEdit,
  onDeleteNote,
  onTitleChange,
  onContentChange,
  onTagInputChange,
  onTagInputKeyDown,
  onAddTag,
  onRemoveTag,
  onTogglePreview,
  insertMarkdown,
  handleInsertLink,
  handleInsertImage,
}) => {
  // Handle note export
  const handleExportNote = async () => {
    if (selectedNote) {
      try {
        await exportNoteToMarkdown(selectedNote);
      } catch (error) {
        console.error("Erreur lors de l'export de la note:", error);
        alert("Erreur lors de l'export de la note en Markdown.");
      }
    }
  };

  // Display empty state when no note is selected
  if (!selectedNote) {
    return (
      <section className="md:col-span-2 bg-gray-800 rounded-lg p-4 h-[calc(100vh-150px)] overflow-y-auto">
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-16 w-16 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p>Sélectionnez une note ou créez-en une nouvelle</p>
        </div>
      </section>
    );
  }

  return (
    <section className="md:col-span-2 bg-gray-800 rounded-lg p-4 h-[calc(100vh-150px)] overflow-y-auto">
      <div className="h-full flex flex-col">
        {isEditing ? (
          <NoteEditor
            editedTitle={editedTitle}
            editedContent={editedContent}
            editedTags={editedTags}
            tagInput={tagInput}
            showPreview={showPreview}
            textareaRef={textareaRef}
            onTitleChange={onTitleChange}
            onContentChange={onContentChange}
            onTagInputChange={onTagInputChange}
            onTagInputKeyDown={onTagInputKeyDown}
            onAddTag={onAddTag}
            onRemoveTag={onRemoveTag}
            onTogglePreview={onTogglePreview}
            onSave={onSaveChanges}
            onCancel={onCancelEdit}
            onExport={handleExportNote}
            insertMarkdown={insertMarkdown}
            handleInsertLink={handleInsertLink}
            handleInsertImage={handleInsertImage}
          />
        ) : (
          <NoteViewer note={selectedNote} onEdit={onEditMode} onDelete={onDeleteNote} onExport={handleExportNote} />
        )}
      </div>
    </section>
  );
};

export default NoteDetail;
