/** Device settings, persisted. Theme, table mode, motion, sound, vibration. */

import { audio } from './audio';
import { haptics } from './haptics';
import { KEYS, readJson, storage, writeJson } from './storage';
import { applyThemeText } from './theme';

export interface SettingsState {
  theme: 'system' | 'light' | 'dark';
  table: boolean;
  /** Bigger than table mode: a large screen or low vision. */
  huge: boolean;
  /** Bigger targets and a thicker focus ring for one-switch and head-pointer use. */
  switchAccess: boolean;
  motion: 'system' | 'reduce' | 'allow';
  volume: number;
  muted: boolean;
  haptics: boolean;
  /** Raw text of the active `.gamebuddy-theme`, empty when none is used. */
  themeText: string;
}

const DEFAULTS: SettingsState = {
  theme: 'system',
  table: false,
  huge: false,
  switchAccess: false,
  motion: 'system',
  volume: 0.7,
  muted: false,
  haptics: true,
  themeText: '',
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
    root.dataset.huge = this.values.huge ? 'on' : 'off';
    root.dataset.switch = this.values.switchAccess ? 'on' : 'off';
    root.dataset.motion = this.values.motion;
    applyThemeText(this.values.themeText);
  }

  /** Replace the active theme file. Empty text removes it. */
  setTheme(text: string): void {
    this.values.themeText = text;
    this.save();
    this.apply();
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
