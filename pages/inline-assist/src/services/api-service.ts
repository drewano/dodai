/**
 * Service de communication avec le background script
 */

import type { CompletionRequest, CompletionResponse } from '../types';

/**
 * Envoie une requête d'autocomplétion au background script
 * @param request Les données de la requête
 * @returns Une promesse avec la réponse d'autocomplétion
 */
export async function requestCompletion(request: CompletionRequest): Promise<CompletionResponse> {
  try {
    return await new Promise<CompletionResponse>(resolve => {
      chrome.runtime.sendMessage(
        {
          type: 'GET_INLINE_COMPLETION_REQUEST',
          currentText: request.currentText,
          surroundingText: request.surroundingText,
          pageContent: request.pageContent,
          selectedModel: request.selectedModel,
        },
        response => {
          // En cas d'erreur de communication avec le background script
          if (chrome.runtime.lastError) {
            console.error('Erreur de communication avec le background script:', chrome.runtime.lastError);
            resolve({
              success: false,
              error: chrome.runtime.lastError.message || 'Erreur de communication avec le background script',
            });
            return;
          }

          // Si la réponse est valide
          if (response) {
            resolve({
              success: response.success,
              completion: response.completion,
              error: response.error,
              model: response.model,
            });
          } else {
            // Pas de réponse du background script
            resolve({
              success: false,
              error: 'Pas de réponse du background script',
            });
          }
        },
      );
    });
  } catch (error) {
    console.error("Erreur lors de la requête d'autocomplétion:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}
