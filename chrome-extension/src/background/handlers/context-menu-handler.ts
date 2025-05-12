import { logger } from '../logger';
import { notesStorage } from '@extension/storage';
import { messageHandler } from './message-handler';

export class ContextMenuHandler {
  // Identifiants des éléments de menu
  private readonly MENU_ADD_SELECTION_NEW_NOTE = 'dodai-add-selection-new-note';
  private readonly MENU_ADD_URL_NEW_NOTE = 'dodai-add-url-new-note';

  /**
   * Initialise les menus contextuels de l'extension
   */
  initialize() {
    logger.info('Initialisation des menus contextuels');
    this.createContextMenus();
    this.setupEventListeners();
  }

  /**
   * Crée la structure des menus contextuels
   */
  private createContextMenus() {
    // Suppression des menus existants pour éviter les doublons
    chrome.contextMenus.removeAll(() => {
      // Menu pour la sélection de texte
      chrome.contextMenus.create({
        id: 'dodai-selection-parent',
        title: 'Ajouter la sélection à Dodai',
        contexts: ['selection'],
      });

      chrome.contextMenus.create({
        id: this.MENU_ADD_SELECTION_NEW_NOTE,
        parentId: 'dodai-selection-parent',
        title: 'Nouvelle note',
        contexts: ['selection'],
      });

      // Menu pour l'URL
      chrome.contextMenus.create({
        id: 'dodai-url-parent',
        title: 'Sauvegarder cette page dans Dodai',
        contexts: ['page', 'link'],
      });

      chrome.contextMenus.create({
        id: this.MENU_ADD_URL_NEW_NOTE,
        parentId: 'dodai-url-parent',
        title: 'Nouvelle note',
        contexts: ['page', 'link'],
      });
    });
  }

  /**
   * Met en place les écouteurs d'événements pour les menus contextuels
   */
  private setupEventListeners() {
    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
      try {
        const pageUrl = info.linkUrl || (tab && tab.url) || '';
        const pageTitle = tab ? tab.title || '' : '';

        switch (info.menuItemId) {
          case this.MENU_ADD_SELECTION_NEW_NOTE:
            await this.addSelectionToNewNote(info.selectionText || '', pageUrl, pageTitle);
            break;
          case this.MENU_ADD_URL_NEW_NOTE:
            await this.addUrlToNewNote(pageUrl, pageTitle);
            break;
        }
      } catch (error) {
        logger.error('Erreur lors du traitement du menu contextuel:', error);
      }
    });
  }

  /**
   * Ajoute un texte sélectionné à une nouvelle note
   */
  private async addSelectionToNewNote(selection: string, sourceUrl: string, pageTitle: string) {
    if (!selection) return;

    try {
      // Créer un titre basé sur la sélection (limité à 50 caractères)
      const title = selection.length > 50 ? `${selection.substring(0, 47)}...` : selection;

      // Créer le contenu avec la source
      const content = `${selection}\n\n---\n\nSource: [${pageTitle || 'Page web'}](${sourceUrl})`;

      // Générer un ID temporaire (sera remplacé par la méthode addNote)
      const tempId = Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

      // Ajouter la note
      const noteId = await notesStorage.addNote({
        id: tempId,
        title: `Sélection de: ${pageTitle || 'Page web'}`,
        content: content,
        sourceUrl: sourceUrl,
        tags: [],
        parentId: null,
      });

      // Générer des tags avec l'IA
      this.generateAndAddTagsForNote(noteId, content, title, sourceUrl);

      // Notifier l'utilisateur
      this.showNotification('Note créée', 'La sélection a été ajoutée à une nouvelle note.');
    } catch (error) {
      logger.error("Erreur lors de l'ajout de la sélection à une nouvelle note:", error);
      this.showNotification('Erreur', "Impossible d'ajouter la sélection à une nouvelle note.");
    }
  }

  /**
   * Ajoute une URL à une nouvelle note
   */
  private async addUrlToNewNote(url: string, pageTitle: string) {
    if (!url) return;

    try {
      // Créer le contenu avec l'URL
      const content = `# ${pageTitle || 'Lien sauvegardé'}\n\n[${pageTitle || url}](${url})`;

      // Générer un ID temporaire (sera remplacé par la méthode addNote)
      const tempId = Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

      // Ajouter la note
      const noteId = await notesStorage.addNote({
        id: tempId,
        title: pageTitle || 'Lien sauvegardé',
        content: content,
        sourceUrl: url,
        tags: [],
        parentId: null,
      });

      // Générer des tags avec l'IA
      this.generateAndAddTagsForNote(noteId, content, pageTitle, url);

      // Notifier l'utilisateur
      this.showNotification('Note créée', "L'URL a été sauvegardée dans une nouvelle note.");
    } catch (error) {
      logger.error("Erreur lors de l'ajout de l'URL à une nouvelle note:", error);
      this.showNotification('Erreur', "Impossible de sauvegarder l'URL dans une nouvelle note.");
    }
  }

  /**
   * Génère des tags avec l'IA et les ajoute à la note
   */
  private async generateAndAddTagsForNote(noteId: string, content: string, title: string, url?: string) {
    try {
      // Utiliser la fonction existante dans messageHandler
      const tags = await messageHandler.generateTagsWithAI(content, title, url);

      if (tags && tags.length > 0) {
        // Ajouter chaque tag à la note
        for (const tag of tags) {
          await notesStorage.addTagToNote(noteId, tag);
        }
        logger.info(`Tags générés pour la note ${noteId}:`, tags);
      }
    } catch (error) {
      logger.error('Erreur lors de la génération des tags pour la note:', error);
    }
  }

  /**
   * Affiche une notification à l'utilisateur
   */
  private showNotification(title: string, message: string) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icon-128.png'),
      title: title,
      message: message,
    });
  }
}

// Export d'une instance singleton
export const contextMenuHandler = new ContextMenuHandler();
