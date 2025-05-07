import type { BaseStorage } from '../base/index.js';
import { createStorage, StorageEnum } from '../base/index.js';

// Interface définissant la structure d'une note
export interface NoteEntry {
  id: string; // identifiant unique
  title: string; // titre généré à partir du contenu ou prompt
  content: string; // contenu de la note, potentiellement Markdown
  sourceUrl?: string; // URL de la page si la note provient d'une page
  tags?: string[]; // tags pour organiser les notes, optionnels
  createdAt: number; // timestamp de création
  updatedAt: number; // timestamp de dernière modification
}

// Type étendu pour le stockage avec des méthodes spécifiques
export type NotesStorageType = BaseStorage<NoteEntry[]> & {
  addNote: (noteData: Omit<NoteEntry, 'createdAt' | 'updatedAt'>) => Promise<string>;
  getNote: (id: string) => Promise<NoteEntry | undefined>;
  updateNote: (id: string, updates: Partial<Omit<NoteEntry, 'id'>>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  getAllNotes: () => Promise<NoteEntry[]>;
  addTagToNote: (id: string, tag: string) => Promise<void>;
  removeTagFromNote: (id: string, tag: string) => Promise<void>;
  getAllTags: () => Promise<string[]>;
};

// Création du stockage de base
const storage = createStorage<NoteEntry[]>('extension-notes', [], {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

// Génération d'un ID unique
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

// Exportation du stockage étendu avec les méthodes additionnelles
export const notesStorage: NotesStorageType = {
  ...storage,

  // Ajouter une nouvelle note
  addNote: async (noteData: Omit<NoteEntry, 'createdAt' | 'updatedAt'>) => {
    const id = noteData.id || generateId();
    const now = Date.now();

    const newNote: NoteEntry = {
      ...noteData,
      id,
      createdAt: now,
      updatedAt: now,
    };

    await storage.set((notes: NoteEntry[]) => [...notes, newNote]);

    return id;
  },

  // Récupérer une note spécifique
  getNote: async (id: string) => {
    const notes = await storage.get();
    return notes.find((note: NoteEntry) => note.id === id);
  },

  // Mettre à jour une note existante
  updateNote: async (id: string, updates: Partial<Omit<NoteEntry, 'id'>>) => {
    await storage.set((notes: NoteEntry[]) =>
      notes.map((note: NoteEntry) => (note.id === id ? { ...note, ...updates, updatedAt: Date.now() } : note)),
    );
  },

  // Supprimer une note
  deleteNote: async (id: string) => {
    await storage.set((notes: NoteEntry[]) => notes.filter((note: NoteEntry) => note.id !== id));
  },

  // Récupérer toutes les notes
  getAllNotes: async () => {
    return await storage.get();
  },

  // Ajouter un tag à une note existante
  addTagToNote: async (id: string, tag: string) => {
    await storage.set((notes: NoteEntry[]) =>
      notes.map((note: NoteEntry) => {
        if (note.id === id) {
          const currentTags = note.tags || [];
          // Éviter les doublons
          if (!currentTags.includes(tag)) {
            return { ...note, tags: [...currentTags, tag], updatedAt: Date.now() };
          }
        }
        return note;
      }),
    );
  },

  // Supprimer un tag d'une note
  removeTagFromNote: async (id: string, tag: string) => {
    await storage.set((notes: NoteEntry[]) =>
      notes.map((note: NoteEntry) => {
        if (note.id === id && note.tags) {
          return {
            ...note,
            tags: note.tags.filter(t => t !== tag),
            updatedAt: Date.now(),
          };
        }
        return note;
      }),
    );
  },

  // Récupérer tous les tags uniques existants
  getAllTags: async () => {
    const notes = await storage.get();
    const allTags = notes.flatMap(note => note.tags || []);
    return [...new Set(allTags)]; // Retourne les tags uniques
  },
};
