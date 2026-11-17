/**
 * Display mode channel: the controlling tab posts the active tool's state, the
 * display tab loads it. BroadcastChannel where available, a storage event and a
 * cheap poll as the fallback, so a projector never needs a network.
 */

import { readJson, storage, writeJson } from './storage';

export interface DisplayMessage {
  instanceId: string;
  toolId: string;
  state: unknown;
  at: number;
}

const CHANNEL = 'pqgb:display';
const KEY = 'pqgb:v1:display';

export interface DisplayChannel {
  post(message: Omit<DisplayMessage, 'at'>): void;
  close(): void;
}

export function createDisplayChannel(onMessage?: (message: DisplayMessage) => void): DisplayChannel {
  let channel: BroadcastChannel | null = null;
  if (typeof BroadcastChannel === 'function') {
    try {
      channel = new BroadcastChannel(CHANNEL);
    } catch {
      channel = null;
    }
  }
  let poll: ReturnType<typeof setInterval> | null = null;
  let last = 0;

  if (channel && onMessage) {
    channel.onmessage = (event: MessageEvent<DisplayMessage>) => {
      const data = event.data;
      if (!data || typeof data.instanceId !== 'string') return;
      onMessage(data);
    };
  } else if (onMessage) {
    const read = (): void => {
      const message = readJson<DisplayMessage | null>(KEY, null);
      if (!message || message.at === last) return;
      last = message.at;
      onMessage(message);
    };
    const onStorage = (event: StorageEvent): void => {
      if (event.key === KEY) read();
    };
    if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
    poll = setInterval(read, 1000);
    const handle = poll as unknown as { unref?: () => void };
    if (handle && typeof handle.unref === 'function') handle.unref();
    read();
  }

  return {
    post(message) {
      const full: DisplayMessage = { ...message, at: Date.now() };
      if (channel) {
        channel.postMessage(full);
        return;
      }
      writeJson(KEY, full);
    },
    close() {
      if (channel) channel.close();
      if (poll) clearInterval(poll);
      poll = null;
    },
  };
}

export function displayUrl(instanceId: string): string {
  return `#/display/${encodeURIComponent(instanceId)}`;
}

export function storageKindForDisplay(): string {
  return storage.kind;
}
