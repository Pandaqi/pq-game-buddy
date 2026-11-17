/**
 * The localization gate. A key that no dictionary carries must never reach a
 * screen, so this walks the source for `t('…')` calls, resolves them against the
 * English dictionaries, and asserts every shipped language is complete.
 */

import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import english from '../src/core/locales/en';
import { manifest } from '../src/core/manifest.generated';
import { setLanguage, startLanguage, t } from '../src/core/i18n.svelte';

const root = join(import.meta.dir, '..');
const localesDir = join(root, 'src', 'core', 'locales');

async function dictionary(path: string): Promise<Record<string, string>> {
  const module = (await import(pathToFileURL(path).href)) as { default?: Record<string, string> };
  return module.default ?? {};
}

/**
 * The tools whose words M10 has moved into `locales/`. Kept explicit so the list
 * only grows on purpose: a tool that ships a folder without being added here, or
 * an entry without a folder, fails the suite below.
 */
const LOCALES = [
  'bag',
  'bracket',
  'buzzer',
  'coin',
  'counters',
  'custom',
  'decks',
  'demo',
  'dice',
  'draft',
  'lives',
  'pick',
  'reveal',
  'prompts',
  'rules',
  'score',
  'script',
  'splits',
  'timer',
  'turns',
  'words',
];

function hasLocales(id: string): boolean {
  try {
    return statSync(join(root, 'src', 'tools', id, 'locales')).isDirectory();
  } catch {
    return false;
  }
}

/** Every localized tool's English words, namespaced as the runtime registers them. */
async function toolDictionaries(): Promise<Record<string, string>> {
  const merged: Record<string, string> = {};
  for (const meta of manifest) {
    if (!hasLocales(meta.id)) continue;
    const dict = await dictionary(join(root, 'src', 'tools', meta.id, 'locales', 'en.ts'));
    for (const [key, value] of Object.entries(dict)) merged[`${meta.id}.${key}`] = value;
  }
  return merged;
}

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry === 'node_modules' || entry === '.git') continue;
      sourceFiles(path, found);
    } else if (path.endsWith('.svelte') || path.endsWith('.ts')) {
      found.push(path);
    }
  }
  return found;
}

/** Keys written literally at a `t(` call; a dynamic key is built from known parts. */
function usedKeys(): Set<string> {
  const keys = new Set<string>();
  for (const file of sourceFiles(join(root, 'src'))) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(/\bt\(\s*['"]([a-z0-9][a-z0-9.-]*)['"]/g)) {
      keys.add(match[1]);
    }
  }
  return keys;
}

describe('localization', () => {
  test('every key used in the source resolves to English text', async () => {
    const tools = await toolDictionaries();
    const missing: string[] = [];
    for (const key of usedKeys()) {
      if (!(key in english) && !(key in tools)) missing.push(key);
    }
    expect(missing).toEqual([]);
  });

  test('the localized tool folders and the list in this file agree', () => {
    const onDisk = manifest.map((meta) => meta.id).filter(hasLocales).sort();
    expect(onDisk).toEqual([...LOCALES].sort());
  });

  test('every localized tool ships the title, blurb and words the screens ask for', async () => {
    const tools = await toolDictionaries();
    for (const meta of manifest) {
      if (!hasLocales(meta.id)) continue;
      expect(tools[`${meta.id}.title`]).toBeString();
      expect(tools[`${meta.id}.blurb`]).toBeString();
    }
  });

  test('every language file carries exactly the English keys', async () => {
    const files = readdirSync(localesDir).filter(
      (file) => /^[a-z]{2}\.ts$/.test(file) && file !== 'en.ts',
    );
    expect(files.length).toBeGreaterThan(0);
    const englishKeys = Object.keys(english).sort();
    for (const file of files) {
      const dict = await dictionary(join(localesDir, file));
      expect({ file, keys: Object.keys(dict).sort() }).toEqual({ file, keys: englishKeys });
    }
  });

  test('every language translates every localized tool', async () => {
    const tools = await toolDictionaries();
    const files = readdirSync(localesDir).filter(
      (file) => /^tool-text-[a-z]{2}\.generated\.ts$/.test(file),
    );
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const dict = await dictionary(join(localesDir, file));
      const missing = Object.keys(tools).filter((key) => !(key in dict));
      expect({ file, missing }).toEqual({ file, missing: [] });
      expect(Object.keys(dict).length).toBe(Object.keys(tools).length);
    }
  });

  test('every language is a chunk, English included', () => {
    const registry = readFileSync(join(localesDir, 'registry.generated.ts'), 'utf8');
    expect(registry).toContain("en: () => import('./en')");
    // Neither layer may statically import a dictionary: the start-up carries no words.
    for (const file of ['i18n.ts', 'i18n.svelte.ts']) {
      const runtime = readFileSync(join(root, 'src', 'core', file), 'utf8');
      expect({ file, static: runtime.includes("from './locales/en'") }).toEqual({ file, static: false });
    }
  });

  test('switching language changes the words and falls back cleanly', async () => {
    expect(await startLanguage('en')).toBe('en');
    const before = t('home.tools');
    expect(await setLanguage('nl')).toBe(true);
    expect(t('home.tools')).not.toBe(before);
    expect(t('home.tools')).toBe('Gereedschap');
    expect(t('no.such.key')).toBe('no.such.key');
    expect(t('no.such.key', undefined, 'fallback')).toBe('fallback');
    expect(t('home.show-all', { count: 3 })).toBe('Alle 3 tools tonen');
    expect(await setLanguage('en')).toBe(true);
    expect(t('home.tools')).toBe(before);
  });
});
