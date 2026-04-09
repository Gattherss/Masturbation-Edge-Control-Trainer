import type { Settings } from '@/types/models';
import { load, save, STORAGE_KEYS } from './storage';

export const DEFAULT_SETTINGS: Settings = {
  mode: 'basic',
  collectArousalOnFinish: true,
  restBeep: false,
  defaultUsedPorn: true,
  reduceMotion: false,
  theme: 'midnight'
};

export function loadSettings(): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...load<Partial<Settings>>(STORAGE_KEYS.settings, DEFAULT_SETTINGS)
  };
}

export function saveSettings(settings: Settings): void {
  save(STORAGE_KEYS.settings, settings);
}
