export type TabType = 'chat' | 'tools' | 'memory';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
  isTemporary?: boolean;
  reasoning?: string | null;
}

export interface StreamingState {
  isLoading: boolean;
  currentPortId: string | null;
}

export interface ReasoningInfo {
  reasoning: string | null;
  cleanContent: string;
}
