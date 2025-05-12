import type { BaseStorage } from '../base/index.js';
import { createStorage, StorageEnum } from '../base/index.js';

export interface AIAgentSettings {
  selectedModel: string;
  temperature: number;
  baseUrl: string;
  isEnabled: boolean;
  contextSize: number;
  inlineAssistEnabled: boolean;
  inlineAssistModel: string | null;
  embeddingModel: string | null;
}

const defaultAgentSettings: AIAgentSettings = {
  selectedModel: 'llama3',
  temperature: 0.7,
  baseUrl: 'http://localhost:11434',
  isEnabled: true,
  contextSize: 4096,
  inlineAssistEnabled: true,
  inlineAssistModel: null,
  embeddingModel: 'nomic-embed-text',
};

type AIAgentStorageType = BaseStorage<AIAgentSettings> & {
  updateModel: (model: string) => Promise<void>;
  updateTemperature: (temperature: number) => Promise<void>;
  updateBaseUrl: (baseUrl: string) => Promise<void>;
  toggleEnabled: () => Promise<void>;
  updateContextSize: (contextSize: number) => Promise<void>;
  toggleInlineAssistEnabled: () => Promise<void>;
  updateInlineAssistModel: (model: string | null) => Promise<void>;
  updateEmbeddingModel: (model: string | null) => Promise<void>;
};

const storage = createStorage<AIAgentSettings>('ai-agent-settings', defaultAgentSettings, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

// Export the extended storage with additional methods
export const aiAgentStorage: AIAgentStorageType = {
  ...storage,
  updateModel: async (model: string) => {
    await storage.set(settings => ({
      ...settings,
      selectedModel: model,
    }));
  },
  updateTemperature: async (temperature: number) => {
    await storage.set(settings => ({
      ...settings,
      temperature,
    }));
  },
  updateBaseUrl: async (baseUrl: string) => {
    await storage.set(settings => ({
      ...settings,
      baseUrl,
    }));
  },
  toggleEnabled: async () => {
    await storage.set(settings => ({
      ...settings,
      isEnabled: !settings.isEnabled,
    }));
  },
  updateContextSize: async (contextSize: number) => {
    await storage.set(settings => ({
      ...settings,
      contextSize,
    }));
  },
  toggleInlineAssistEnabled: async () => {
    await storage.set(settings => ({
      ...settings,
      inlineAssistEnabled: !settings.inlineAssistEnabled,
    }));
  },
  updateInlineAssistModel: async (model: string | null) => {
    await storage.set(settings => ({
      ...settings,
      inlineAssistModel: model,
    }));
  },
  updateEmbeddingModel: async (model: string | null) => {
    await storage.set(settings => ({
      ...settings,
      embeddingModel: model,
    }));
  },
};
