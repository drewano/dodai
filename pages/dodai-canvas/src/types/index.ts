export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
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
