export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  model?: string;
  sourceDocuments?: Array<{
    id: string;
    title: string;
    contentSnippet: string;
    sourceUrl?: string;
  }>;
}

export type ArtifactType = 'text' | 'code';

export interface ArtifactMarkdown {
  type: 'text';
  title: string;
  fullMarkdown: string;
}

export interface ArtifactCode {
  type: 'code';
  title: string;
  language: string;
  code: string;
}

export type Artifact = ArtifactMarkdown | ArtifactCode;

// Inspiré d'OpenCanvas ArtifactV3 mais simplifié
export interface ArtifactMarkdownV3 {
  type: 'text';
  title: string;
  fullMarkdown: string;
}

export interface ArtifactCodeV3 {
  type: 'code';
  title: string;
  language: string; // Pourrait être un enum plus tard
  code: string;
}

export type ArtifactContentV3 = ArtifactMarkdownV3 | ArtifactCodeV3;

export interface ArtifactV3 {
  currentIndex: number; // Index de l'artefact actuel dans history (ou pourrait être un ID unique)
  contents: ArtifactContentV3[]; // Actuellement, on ne gère qu'un seul contenu par ArtifactV3 pour simplifier
}
