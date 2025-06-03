import type { BaseStorage } from '../base/index.js';
import { createStorage, StorageEnum } from '../base/index.js';

// Type pour différencier les entrées
export type EntryType = 'note' | 'folder';

// Interface définissant la structure d'une note
export interface NoteEntry {
  id: string; // identifiant unique
  type: EntryType; // type d'entrée: 'note' ou 'folder'
  title: string; // titre généré à partir du contenu ou prompt
  content: string; // contenu de la note, potentiellement Markdown
  sourceUrl?: string; // URL de la page si la note provient d'une page
  tags?: string[]; // tags pour organiser les notes, optionnels
  parentId: string | null; // ID du dossier parent, null si au niveau racine
  orderIndex?: number; // position d'ordre dans le dossier parent
  createdAt: number; // timestamp de création
  updatedAt: number; // timestamp de dernière modification
}

// Type spécifique pour les dossiers
export interface FolderEntry {
  id: string;
  type: 'folder';
  title: string;
  parentId: string | null;
  orderIndex?: number;
  createdAt: number;
  updatedAt: number;
}

// Type étendu pour le stockage avec des méthodes spécifiques
export type NotesStorageType = BaseStorage<NoteEntry[]> & {
  addNote: (noteData: Omit<NoteEntry, 'createdAt' | 'updatedAt' | 'type'>) => Promise<string>;
  getNote: (id: string) => Promise<NoteEntry | undefined>;
  updateNote: (id: string, updates: Partial<Omit<NoteEntry, 'id' | 'type'>>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  getAllNotes: () => Promise<NoteEntry[]>;
  addTagToNote: (id: string, tag: string) => Promise<void>;
  removeTagFromNote: (id: string, tag: string) => Promise<void>;
  getAllTags: () => Promise<string[]>;
  // Nouvelles fonctions pour la gestion des dossiers
  createFolder: (parentId: string | null, title: string) => Promise<string>;
  moveNoteToFolder: (noteId: string, targetFolderId: string | null) => Promise<void>;
  moveFolder: (folderId: string, targetFolderId: string | null) => Promise<void>;
  getNotesInFolder: (folderId: string | null) => Promise<NoteEntry[]>;
  reorderNote: (noteId: string, newOrderIndex: number) => Promise<void>;
  onChange?: (callback: (newValue: NoteEntry[], oldValue?: NoteEntry[]) => void) => () => void;
};

// Création du stockage de base
const storage = createStorage<NoteEntry[]>('extension-notes', [], {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

// Fonction d'initialisation pour garantir la compatibilité avec les anciennes données
const initializeStorage = async () => {
  const notes = await storage.get();
  let needsUpdate = false;

  const updatedNotes = notes.map(note => {
    let isUpdated = false;
    const updatedNote = { ...note };

    // Ajouter le type pour les anciennes notes
    if (!('type' in note)) {
      updatedNote.type = 'note';
      isUpdated = true;
      needsUpdate = true;
    }

    // Ajouter parentId pour les anciennes notes
    if (!('parentId' in note)) {
      updatedNote.parentId = null;
      isUpdated = true;
      needsUpdate = true;
    }

    return isUpdated ? updatedNote : note;
  });

  // Mise à jour du stockage si des modifications ont été faites
  if (needsUpdate) {
    await storage.set(updatedNotes);
    console.log('[Notes Storage] Migration réussie: ajout des champs type et parentId');
  }
};

// Exécuter l'initialisation au chargement
initializeStorage().catch(error => {
  console.error('[Notes Storage] Erreur lors de la migration:', error);
});

// Génération d'un ID unique
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

// Exportation du stockage étendu avec les méthodes additionnelles
export const notesStorage: NotesStorageType = {
  ...storage,

  // Ajouter une nouvelle note
  addNote: async (noteData: Omit<NoteEntry, 'createdAt' | 'updatedAt' | 'type'>) => {
    const id = noteData.id || generateId();
    const now = Date.now();

    // Déterminer l'orderIndex en fonction des notes existantes dans le même dossier
    const notes = await storage.get();
    const notesInSameFolder = notes.filter(note => note.parentId === noteData.parentId);
    const maxOrderIndex = notesInSameFolder.reduce(
      (max, note) => (note.orderIndex !== undefined && note.orderIndex > max ? note.orderIndex : max),
      0,
    );

    const newNote: NoteEntry = {
      ...noteData,
      id,
      type: 'note',
      parentId: noteData.parentId || null,
      orderIndex: maxOrderIndex + 1,
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
  updateNote: async (id: string, updates: Partial<Omit<NoteEntry, 'id' | 'type'>>) => {
    await storage.set((notes: NoteEntry[]) =>
      notes.map((note: NoteEntry) => (note.id === id ? { ...note, ...updates, updatedAt: Date.now() } : note)),
    );
  },

  // Supprimer une note ou un dossier et son contenu
  deleteNote: async (id: string) => {
    const notes = await storage.get();
    const itemToDelete = notes.find(note => note.id === id);

    if (!itemToDelete) return;

    // Si c'est un dossier, supprimer également tous les éléments qu'il contient
    if (itemToDelete.type === 'folder') {
      // Fonction récursive pour trouver tous les IDs à supprimer
      const getAllChildrenIds = (parentId: string, allNotes: NoteEntry[]): string[] => {
        const directChildren = allNotes.filter(note => note.parentId === parentId);
        const childrenIds = directChildren.map(child => child.id);

        // Récursivement trouver les enfants des dossiers enfants
        const folderChildren = directChildren.filter(child => child.type === 'folder');
        for (const folder of folderChildren) {
          childrenIds.push(...getAllChildrenIds(folder.id, allNotes));
        }

        return childrenIds;
      };

      const idsToDelete = [id, ...getAllChildrenIds(id, notes)];
      await storage.set((notes: NoteEntry[]) => notes.filter((note: NoteEntry) => !idsToDelete.includes(note.id)));
    } else {
      // Si c'est une note simple, juste la supprimer
      await storage.set((notes: NoteEntry[]) => notes.filter((note: NoteEntry) => note.id !== id));
    }
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

  // Créer un nouveau dossier
  createFolder: async (parentId: string | null, title: string) => {
    const id = generateId();
    const now = Date.now();

    // Déterminer l'orderIndex en fonction des dossiers existants dans le même parent
    const notes = await storage.get();
    const foldersInSameParent = notes.filter(note => note.parentId === parentId && note.type === 'folder');
    const maxOrderIndex = foldersInSameParent.reduce(
      (max, folder) => (folder.orderIndex !== undefined && folder.orderIndex > max ? folder.orderIndex : max),
      0,
    );

    const newFolder: NoteEntry = {
      id,
      type: 'folder',
      title,
      content: '',
      parentId,
      orderIndex: maxOrderIndex + 1,
      createdAt: now,
      updatedAt: now,
    };

    await storage.set((notes: NoteEntry[]) => [...notes, newFolder]);
    return id;
  },

  // Déplacer une note vers un dossier
  moveNoteToFolder: async (noteId: string, targetFolderId: string | null) => {
    // Vérifier que la cible est un dossier valide ou null (racine)
    if (targetFolderId !== null) {
      const notes = await storage.get();
      const targetFolder = notes.find(note => note.id === targetFolderId && note.type === 'folder');
      if (!targetFolder) throw new Error('Dossier cible non trouvé');

      // Éviter les boucles circulaires si on déplace un dossier
      const noteToMove = notes.find(note => note.id === noteId);
      if (noteToMove?.type === 'folder') {
        // Vérifier que le dossier cible n'est pas un descendant du dossier à déplacer
        let currentFolder = targetFolder;
        while (currentFolder.parentId) {
          if (currentFolder.parentId === noteId) {
            throw new Error('Impossible de déplacer un dossier dans son propre sous-dossier');
          }
          currentFolder = notes.find(note => note.id === currentFolder.parentId) as NoteEntry;
          if (!currentFolder) break;
        }
      }
    }

    // Calculer le nouvel orderIndex
    const notes = await storage.get();
    const notesInTargetFolder = notes.filter(note => note.parentId === targetFolderId);
    const maxOrderIndex = notesInTargetFolder.reduce(
      (max, note) => (note.orderIndex !== undefined && note.orderIndex > max ? note.orderIndex : max),
      0,
    );

    await storage.set((notes: NoteEntry[]) =>
      notes.map((note: NoteEntry) =>
        note.id === noteId
          ? { ...note, parentId: targetFolderId, orderIndex: maxOrderIndex + 1, updatedAt: Date.now() }
          : note,
      ),
    );
  },

  // Déplacer un dossier
  moveFolder: async (folderId: string, targetFolderId: string | null) => {
    // Réutilise la même logique que moveNoteToFolder
    await notesStorage.moveNoteToFolder(folderId, targetFolderId);
  },

  // Récupérer les notes dans un dossier
  getNotesInFolder: async (folderId: string | null) => {
    const notes = await storage.get();
    return notes.filter(note => note.parentId === folderId);
  },

  // Réordonner une note dans son dossier
  reorderNote: async (noteId: string, newOrderIndex: number) => {
    await storage.set((notes: NoteEntry[]) =>
      notes.map((note: NoteEntry) =>
        note.id === noteId ? { ...note, orderIndex: newOrderIndex, updatedAt: Date.now() } : note,
      ),
    );
  },

  // Implémenter onChange pour l'écoute des changements
  onChange: (callback: (newValue: NoteEntry[], oldValue?: NoteEntry[]) => void) => {
    let previousValue: NoteEntry[] | null = null;
    
    // Utiliser subscribe pour écouter les changements
    const unsubscribe = storage.subscribe(() => {
      const currentValue = storage.getSnapshot();
      if (currentValue !== null) {
        // Appeler le callback avec les nouvelles et anciennes valeurs
        callback(currentValue, previousValue || undefined);
        previousValue = currentValue;
      }
    });
    
    // Initialiser previousValue avec la valeur actuelle
    const currentSnapshot = storage.getSnapshot();
    if (currentSnapshot !== null) {
      previousValue = currentSnapshot;
    }
    
    return unsubscribe;
  },
};
