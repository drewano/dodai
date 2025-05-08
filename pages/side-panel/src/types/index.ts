export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
  isTemporary?: boolean;
  reasoning?: string | null;
  sourceDocuments?: RagSourceDocument[];
  model?: string;
}

export interface RagSourceDocument {
  id: string;
  title: string;
  contentSnippet: string;
  sourceUrl?: string;
}

export interface StreamingState {
  isLoading: boolean;
  currentPortId: string | null;
}

export interface ReasoningInfo {
  reasoning: string | null;
  cleanContent: string;
}
