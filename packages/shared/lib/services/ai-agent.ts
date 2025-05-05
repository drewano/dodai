// Type pour représenter un outil MCP simplifié
export type McpTool = {
  name: string;
  description: string;
  serverName?: string;
};

/**
 * Cette classe est maintenant une simple façade qui délègue toutes les
 * opérations au service worker (background script) via les messages runtime.
 *
 * L'implémentation réelle se trouve dans chrome-extension/src/background/services/agent-service.ts
 */
export class AIAgent {
  // Cette classe est conservée uniquement pour compatibilité API
  // avec le code existant, mais n'a plus d'implémentation propre
}

// Export d'une instance singleton pour compatibilité avec le code existant
export const aiAgent = new AIAgent();
