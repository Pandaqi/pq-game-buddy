/**
 * Bun resolves the server build of `svelte` by default under `bun test`, and
 * `mount()` only exists on the client. Load the client entry by path instead.
 */

import { join } from 'node:path';

export interface SvelteClient {
  mount: (component: unknown, options: { target: HTMLElement; props: Record<string, unknown> }) => unknown;
  unmount: (component: unknown) => void;
  tick: () => Promise<void>;
  flushSync: (fn: () => void) => void;
}

let cached: SvelteClient | null = null;

export async function svelteClient(): Promise<SvelteClient> {
  if (cached) return cached;
  const entry = join(import.meta.dir, '..', '..', 'node_modules', 'svelte', 'src', 'index-client.js');
  cached = (await import(entry)) as SvelteClient;
  return cached;
}
