/** Device settings, persisted. Theme, table mode, motion, sound, vibration. */

import { audio } from './audio';
import { haptics } from './haptics';
import { KEYS, readJson, storage, writeJson } from './storage';

export interface SettingsState {
  theme: 'system' | 'light' | 'dark';
  table: boolean;
  motion: 'system' | 'reduce' | 'allow';
  volume: number;
  muted: boolean;
  haptics: boolean;
}

const DEFAULTS: SettingsState = {
  theme: 'system',
  table: false,
  motion: 'system',
  volume: 0.7,
  muted: false,
  haptics: true,
};

class SettingsStore {
  values = $state<SettingsState>({ ...DEFAULTS });

  load(): void {
    const stored = readJson<Partial<SettingsState>>(KEYS.settings, {});
    this.values = { ...DEFAULTS, ...stored };
    this.apply();
  }

  set<K extends keyof SettingsState>(key: K, value: SettingsState[K]): void {
    this.values[key] = value;
    this.save();
    this.apply();
  }

  save(): void {
    writeJson(KEYS.settings, this.values);
  }

  apply(): void {
    audio.setVolume(this.values.volume);
    audio.setMuted(this.values.muted);
    haptics.setEnabled(this.values.haptics);
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (this.values.theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = this.values.theme;
    root.dataset.table = this.values.table ? 'on' : 'off';
    root.dataset.motion = this.values.motion;
  }

  reset(): void {
    this.values = { ...DEFAULTS };
    this.save();
    this.apply();
  }

  /** Wipe every key this app owns. */
  clearAllData(): void {
    clearAppData();
    this.load();
  }

  storageKind(): string {
    return storage.kind;
  }
}

export function clearAppData(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith('pqgb:')) keys.push(key);
    }
    for (const key of keys) localStorage.removeItem(key);
  } catch {
    /* nothing else to clear */
  }
}

export const settings = new SettingsStore();
