import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import yaml from 'js-yaml';
import type { NoteEntry } from '@extension/storage';

/**
 * Interface définissant la structure du frontmatter YAML des notes
 */
interface NoteFrontmatter {
  title: string;
  createdAt: string;
  updatedAt: string;
  sourceUrl?: string;
  tags?: string[];
}

/**
 * Exporte toutes les notes en JSON et télécharge le fichier
 */
export async function exportNotesToJson(notes: NoteEntry[]): Promise<void> {
  try {
    const jsonContent = JSON.stringify(notes, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    saveAs(blob, `dodai-notes-${formatDate(new Date())}.json`);
    return Promise.resolve();
  } catch (error) {
    console.error("Erreur lors de l'export des notes en JSON:", error);
    return Promise.reject(error);
  }
}

/**
 * Exporte une note individuelle en Markdown et télécharge le fichier
 */
export async function exportNoteToMarkdown(note: NoteEntry): Promise<void> {
  try {
    const markdownContent = convertNoteToMarkdown(note);
    const blob = new Blob([markdownContent], { type: 'text/markdown' });

    // Sanitize filename
    const sanitizedTitle = note.title.replace(/[/\\?%*:|"<>]/g, '-').trim();
    saveAs(blob, `${sanitizedTitle}.md`);
    return Promise.resolve();
  } catch (error) {
    console.error("Erreur lors de l'export de la note en Markdown:", error);
    return Promise.reject(error);
  }
}

/**
 * Exporte toutes les notes en ZIP de fichiers Markdown et télécharge le fichier
 */
export async function exportNotesToMarkdownZip(notes: NoteEntry[]): Promise<void> {
  try {
    const zip = new JSZip();

    notes.forEach(note => {
      const markdownContent = convertNoteToMarkdown(note);
      // Sanitize filename
      const sanitizedTitle = note.title.replace(/[/\\?%*:|"<>]/g, '-').trim();
      zip.file(`${sanitizedTitle}.md`, markdownContent);
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `dodai-notes-${formatDate(new Date())}.zip`);
    return Promise.resolve();
  } catch (error) {
    console.error("Erreur lors de l'export des notes en ZIP:", error);
    return Promise.reject(error);
  }
}

/**
 * Convertit une note en contenu Markdown avec frontmatter YAML
 */
function convertNoteToMarkdown(note: NoteEntry): string {
  // Créer le frontmatter YAML
  const frontmatter: NoteFrontmatter = {
    title: note.title,
    createdAt: new Date(note.createdAt).toISOString(),
    updatedAt: new Date(note.updatedAt).toISOString(),
  };

  if (note.sourceUrl) {
    frontmatter.sourceUrl = note.sourceUrl;
  }

  if (note.tags && note.tags.length > 0) {
    frontmatter.tags = note.tags;
  }

  const yamlContent = yaml.dump(frontmatter);

  // Assembler le contenu Markdown avec le frontmatter
  return `---\n${yamlContent}---\n\n${note.content}`;
}

/**
 * Importe des notes depuis un fichier JSON
 */
export async function importNotesFromJson(
  file: File,
  existingNotes: NoteEntry[],
): Promise<{
  notes: NoteEntry[];
  count: number;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = event => {
      try {
        if (!event.target?.result) {
          reject(new Error('Échec de lecture du fichier'));
          return;
        }

        const content = event.target.result as string;
        const importedNotes = JSON.parse(content) as NoteEntry[];

        if (!Array.isArray(importedNotes)) {
          reject(new Error('Format de fichier invalide. Un tableau de notes est attendu.'));
          return;
        }

        // Préparer les notes importées en gérant les doublons
        const preparedNotes = prepareImportedNotes(importedNotes, existingNotes);

        resolve({
          notes: preparedNotes,
          count: preparedNotes.length,
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Erreur lors de la lecture du fichier'));
    };

    reader.readAsText(file);
  });
}

/**
 * Importe des notes depuis un ZIP de fichiers Markdown
 */
export async function importNotesFromMarkdownZip(
  file: File,
  existingNotes: NoteEntry[],
): Promise<{
  notes: NoteEntry[];
  count: number;
}> {
  try {
    const zip = await JSZip.loadAsync(file);
    const importedNotes: NoteEntry[] = [];

    const promises = Object.keys(zip.files)
      .filter(filename => filename.endsWith('.md'))
      .map(async filename => {
        const content = await zip.files[filename].async('string');
        try {
          const note = parseMarkdownToNote(content, filename);
          if (note) {
            importedNotes.push(note);
          }
        } catch (error) {
          console.warn(`Erreur lors de l'analyse du fichier ${filename}:`, error);
        }
      });

    await Promise.all(promises);

    // Préparer les notes importées en gérant les doublons
    const preparedNotes = prepareImportedNotes(importedNotes, existingNotes);

    return {
      notes: preparedNotes,
      count: preparedNotes.length,
    };
  } catch (error) {
    console.error("Erreur lors de l'import des notes depuis ZIP:", error);
    throw error;
  }
}

/**
 * Parse un contenu Markdown en objet Note
 */
function parseMarkdownToNote(content: string, filename: string): NoteEntry | null {
  try {
    // Vérifier s'il y a un frontmatter YAML
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);

    let title = filename.replace(/\.md$/, '');
    let noteContent = content;
    let sourceUrl: string | undefined;
    let tags: string[] | undefined;
    const now = Date.now();

    if (frontmatterMatch) {
      // Extraire et parser le frontmatter
      const [, frontmatterYaml, markdownContent] = frontmatterMatch;
      noteContent = markdownContent;

      try {
        const frontmatter = yaml.load(frontmatterYaml) as NoteFrontmatter;
        if (frontmatter) {
          if (frontmatter.title) {
            title = frontmatter.title;
          }

          if (frontmatter.sourceUrl) {
            sourceUrl = frontmatter.sourceUrl;
          }

          if (frontmatter.tags && Array.isArray(frontmatter.tags)) {
            tags = frontmatter.tags;
          }
        }
      } catch (error) {
        console.warn('Erreur lors du parsing du frontmatter YAML:', error);
      }
    }

    return {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      title,
      content: noteContent.trim(),
      sourceUrl,
      tags,
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    console.error('Erreur lors du parsing du fichier Markdown:', error);
    return null;
  }
}

/**
 * Prépare les notes importées en gérant les doublons
 */
function prepareImportedNotes(importedNotes: NoteEntry[], existingNotes: NoteEntry[]): NoteEntry[] {
  const existingTitles = new Set(existingNotes.map(note => note.title));

  return importedNotes.map(note => {
    // Générer un nouvel ID pour éviter les conflits
    const noteWithNewId = {
      ...note,
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    };

    // Gérer les doublons de titre
    if (existingTitles.has(note.title)) {
      noteWithNewId.title = `${note.title} (copie)`;
      let counter = 1;

      // Si "Titre (copie)" existe déjà, essayer "Titre (copie 2)", etc.
      while (existingTitles.has(noteWithNewId.title)) {
        counter++;
        noteWithNewId.title = `${note.title} (copie ${counter})`;
      }
    }

    existingTitles.add(noteWithNewId.title);
    return noteWithNewId;
  });
}

/**
 * Formate une date au format YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
