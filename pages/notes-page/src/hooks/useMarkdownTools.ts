import { useCallback } from 'react';

export function useMarkdownTools(
  textareaRef: React.RefObject<HTMLTextAreaElement>,
  setEditedContent: (content: string) => void,
) {
  // Insert markdown syntax around selected text or at cursor position
  const insertMarkdown = useCallback(
    (markdownBefore: string, markdownAfter = '') => {
      if (!textareaRef.current) return;

      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);

      // Build the new content
      const newContent =
        textarea.value.substring(0, start) +
        markdownBefore +
        selectedText +
        markdownAfter +
        textarea.value.substring(end);

      // Update state
      setEditedContent(newContent);

      // Set focus and selection after render
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + markdownBefore.length, start + markdownBefore.length + selectedText.length);
      }, 0);
    },
    [textareaRef, setEditedContent],
  );

  // Handle link insertion
  const handleInsertLink = useCallback(() => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);

    const url = prompt("Entrez l'URL du lien:", 'https://');
    if (!url) return;

    const linkText = selectedText.length > 0 ? selectedText : 'texte du lien';
    const markdown = `[${linkText}](${url})`;

    // Insert link markdown
    const newContent = textarea.value.substring(0, start) + markdown + textarea.value.substring(end);

    setEditedContent(newContent);

    // Set focus after render
    setTimeout(() => {
      textarea.focus();
      if (selectedText.length > 0) {
        // Place cursor at the end of the link
        textarea.setSelectionRange(start + markdown.length, start + markdown.length);
      } else {
        // Select the link text to make it easy to replace
        textarea.setSelectionRange(start + 1, start + 1 + linkText.length);
      }
    }, 0);
  }, [textareaRef, setEditedContent]);

  // Handle image insertion
  const handleInsertImage = useCallback(() => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;

    const url = prompt("Entrez l'URL de l'image:", 'https://');
    if (!url) return;

    const altText = prompt("Entrez le texte alternatif (description) de l'image:", "Description de l'image");
    const markdown = `![${altText || 'Image'}](${url})`;

    // Insert image markdown
    const newContent = textarea.value.substring(0, start) + markdown + textarea.value.substring(start);

    setEditedContent(newContent);

    // Set focus after render
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + markdown.length, start + markdown.length);
    }, 0);
  }, [textareaRef, setEditedContent]);

  return {
    insertMarkdown,
    handleInsertLink,
    handleInsertImage,
  };
}
