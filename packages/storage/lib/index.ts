export type { BaseStorage } from './base/index.js';
// Exporter toutes les implémentations sauf les éléments du module notes-storage
export * from './impl/exampleThemeStorage.js';
export * from './impl/ai-agent-storage.js';
export * from './impl/mcp-config-storage.js';
export * from './impl/chat-history-storage.js';
export * from './impl/mcp-loaded-tools-storage.js';
// Exporter spécifiquement les types et valeurs de notes-storage
export type { NoteEntry, NotesStorageType } from './impl/notes-storage.js';
export { notesStorage } from './impl/notes-storage.js';
