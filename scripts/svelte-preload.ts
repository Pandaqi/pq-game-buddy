/**
 * Test preload: compile `.svelte` and `.svelte.ts` for the client with styles
 * injected, then give tests a DOM. The build uses the same compiler settings
 * (`scripts/svelte-compile.ts`), so a test mounts exactly what ships.
 */

import { plugin } from 'bun';
import { svelteCompile } from './svelte-compile';

plugin(svelteCompile());

if (typeof globalThis.document === 'undefined') {
  const { GlobalRegistrator } = await import('@happy-dom/global-registrator');
  GlobalRegistrator.register({ url: 'http://localhost/' });
}

