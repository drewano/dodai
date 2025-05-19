import type { BaseStorage } from '../base/index.js';
import { createStorage, StorageEnum } from '../base/index.js';

export interface DodaiCanvasSettings {
  selectedModel: string | null;
}

const defaultDodaiCanvasSettings: DodaiCanvasSettings = {
  selectedModel: null, // Default to null, meaning no specific model override or "use global"
};

type DodaiCanvasConfigStorageType = BaseStorage<DodaiCanvasSettings> & {
  updateSelectedModel: (model: string | null) => Promise<void>;
};

const storage = createStorage<DodaiCanvasSettings>('dodai-canvas-settings', defaultDodaiCanvasSettings, {
  storageEnum: StorageEnum.Local, // Or StorageEnum.Sync if preferred
  liveUpdate: true,
});

export const dodaiCanvasConfigStorage: DodaiCanvasConfigStorageType = {
  ...storage,
  updateSelectedModel: async (model: string | null) => {
    await storage.set(settings => ({
      ...settings,
      selectedModel: model,
    }));
  },
};
