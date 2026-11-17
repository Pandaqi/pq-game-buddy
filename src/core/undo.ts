/** Snapshot undo: capped by entry count and bytes, coalesced for rapid taps. */

export interface UndoApi {
  /** Capture the current state before a change. */
  push(label?: string, coalesceKey?: string): void;
  /** Run several actions as one undo step, without intermediate snapshots. */
  batch(label: string, run: () => void): void;
  undo(): boolean;
  canUndo(): boolean;
  label(): string | null;
  size(): number;
  clear(): void;
}

interface Entry {
  snapshot: string;
  label: string;
  key: string | null;
  at: number;
}

const DEFAULT_LIMIT = 50;
const DEFAULT_BYTES = 256 * 1024;
const COALESCE_MS = 600;

export function createUndo(options: {
  read: () => unknown;
  write: (value: unknown) => void;
  onChange?: () => void;
  limit?: number;
  byteLimit?: number;
  now?: () => number;
}): UndoApi {
  const stack: Entry[] = [];
  const limit = options.limit ?? DEFAULT_LIMIT;
  const byteLimit = options.byteLimit ?? DEFAULT_BYTES;
  const now = options.now ?? (() => Date.now());
  let batchEntry: { snapshot: string; label: string } | null = null;
  let batchDepth = 0;

  const capture = (): string => {
    try {
      return JSON.stringify(options.read());
    } catch {
      return 'null';
    }
  };

  const trim = (): void => {
    while (stack.length > limit) stack.shift();
    let total = 0;
    for (const entry of stack) total += entry.snapshot.length;
    while (total > byteLimit && stack.length > 1) {
      const removed = stack.shift();
      total -= removed ? removed.snapshot.length : 0;
    }
  };

  return {
    push(label = 'change', coalesceKey) {
      if (batchDepth > 0) {
        if (!batchEntry) batchEntry = { snapshot: capture(), label };
        return;
      }
      const at = now();
      const last = stack[stack.length - 1];
      if (last && coalesceKey && last.key === coalesceKey && at - last.at < COALESCE_MS) {
        last.at = at;
        options.onChange?.();
        return;
      }
      stack.push({ snapshot: capture(), label, key: coalesceKey ?? null, at });
      trim();
      options.onChange?.();
    },
    batch(label, run) {
      if (batchDepth > 0) {
        run();
        return;
      }
      batchDepth = 1;
      batchEntry = null;
      try {
        run();
      } finally {
        batchDepth = 0;
      }
      const entry = batchEntry as { snapshot: string; label: string } | null;
      batchEntry = null;
      if (!entry) return;
      stack.push({ snapshot: entry.snapshot, label, key: null, at: now() });
      trim();
      options.onChange?.();
    },
    undo() {
      const entry = stack.pop();
      if (!entry) return false;
      try {
        options.write(JSON.parse(entry.snapshot));
      } catch {
        return false;
      }
      options.onChange?.();
      return true;
    },
    canUndo: () => stack.length > 0,
    label: () => (stack.length ? stack[stack.length - 1].label : null),
    size: () => stack.length,
    clear: () => {
      stack.length = 0;
      options.onChange?.();
    },
  };
}
