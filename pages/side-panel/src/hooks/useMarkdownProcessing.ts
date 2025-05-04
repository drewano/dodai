import { ReasoningInfo } from '../types';

/**
 * Hook qui fournit des utilitaires pour traiter le contenu Markdown et extraire le raisonnement
 */
export function useMarkdownProcessing() {
  /**
   * Extrait le raisonnement entre balises <think>...</think>
   * @param content Contenu à analyser
   * @returns Un objet contenant le raisonnement extrait et le contenu nettoyé
   */
  const extractReasoning = (content: string): ReasoningInfo => {
    const thinkPattern = /<think>([\s\S]*?)<\/think>/g;
    const matches = Array.from(content.matchAll(thinkPattern));

    if (matches.length > 0) {
      // Extraire tous les blocs de raisonnement
      const reasoningBlocks = matches.map(match => match[1].trim());
      const reasoning = reasoningBlocks.join('\n\n');

      // Supprimer tous les blocs <think> du contenu visible
      const cleanContent = content.replace(thinkPattern, '').trim();

      return {
        reasoning: reasoning,
        cleanContent: cleanContent,
      };
    }

    // Aucun raisonnement détecté
    return {
      reasoning: null,
      cleanContent: content,
    };
  };

  return {
    extractReasoning,
  };
}
