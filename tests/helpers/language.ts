/**
 * The app loads a language chunk, English included, before its first paint, so a
 * test that asserts on words loads one the same way. Imported for its side
 * effect; the top-level await holds the importing test file until it is ready.
 */

import { startLanguage } from '../../src/core/i18n.svelte';

await startLanguage('en');
