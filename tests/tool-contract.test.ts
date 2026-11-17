import './helpers/language';
/**
 * The tool contract, checked for every folder in `src/tools`.
 *
 * A new tool is not done when it renders; it is done when this file passes for
 * it. Copy this test into a fork or run it in CI after adding a tool.
 */
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { manifest } from '../src/core/manifest.generated';
import { schemas } from '../src/core/schemas.generated';
import { defaultsFor } from '../src/core/template/schema';
import { parseTemplate, resolveTemplate } from '../src/core/template/parse';
import { makePlayers } from '../src/core/session';
import { createRng } from '../src/core/rng';
import { clock } from '../src/core/ticker';
import { t } from '../src/core/i18n.svelte';
import { loadTool } from '../src/core/tools.generated';
import type { ToolContext } from '../src/core/registry';

const root = join(import.meta.dir, '..');

function fakeContext(instanceId: string): ToolContext {
  const players = makePlayers(['Ada', 'Bo']);
  return {
    instanceId,
    session: {
      players: () => players,
      instance: () => undefined,
      setActivePlayer: () => {},
      addPlayer: () => {},
      removePlayer: () => {},
      renamePlayer: () => {},
    },
    clock,
    rng: createRng('contract'),
    audio: { unlock: () => {}, play: () => {}, setVolume: () => {}, setMuted: () => {}, isMuted: () => true },
    haptics: { setEnabled: () => {}, supported: () => false, buzz: () => {} },
    undo: {
      push: () => {},
      batch: (_label, run) => run(),
      undo: () => false,
      canUndo: () => false,
      label: () => null,
      size: () => 0,
      clear: () => {},
    },
    toast: () => {},
    t,
  };
}

const FAMILIES = ['randomize', 'time', 'track', 'reveal', 'reference', 'flow'];
const SEATS = ['multi', 'one', 'none'];

describe('tool contract', () => {
  test('metadata is complete and inside the allowed vocabulary', () => {
    for (const meta of manifest) {
      expect(meta.id).toMatch(/^[a-z][a-z0-9]*$/);
      expect(meta.title.trim().length).toBeGreaterThan(0);
      expect(meta.blurb.trim().length).toBeGreaterThan(0);
      expect(FAMILIES).toContain(meta.family);
      expect(SEATS).toContain(meta.seats);
      expect(meta.icon).toContain('<svg');
      expect(meta.tags.length).toBeGreaterThan(0);
      for (const tag of meta.tags) expect(tag).toBe(tag.toLowerCase());
    }
  });

  for (const meta of manifest) {
    test(`${meta.id} honours the runtime contract`, async () => {
      const module = await loadTool(meta.id);
      const values = defaultsFor(module.preset);
      const instance = module.create(fakeContext(module.id), values);

      // Live state, plain snapshot and a JSON-safe round trip.
      expect(instance.data).toBeTruthy();
      const snapshot = instance.state();
      expect(typeof snapshot).toBe('object');
      const copy = JSON.parse(JSON.stringify(snapshot));
      expect(copy).toEqual(snapshot);

      // Settings only use keys the schema declares, and every preset key has a default.
      const fromState = instance.presetFromState();
      for (const key of Object.keys(fromState)) {
        expect(module.preset[key], `${meta.id} preset key "${key}"`).toBeTruthy();
      }
      for (const key of Object.keys(module.preset)) {
        expect(values[key]).not.toBeUndefined();
      }

      // Summary is always plain text, even after junk and a restore.
      expect(typeof instance.summary()).toBe('string');
      expect(() => instance.load(null)).not.toThrow();
      expect(() => instance.load({ nonsense: true })).not.toThrow();
      instance.load(copy);
      expect(typeof instance.summary()).toBe('string');

      // Named actions are callable.
      for (const [name, command] of Object.entries(instance.commands ?? {})) {
        expect(typeof command, `${meta.id} command "${name}"`).toBe('function');
      }

      // Standings, when a tool has them, are best-first and named.
      if (instance.results) {
        const results = instance.results();
        expect(Array.isArray(results)).toBe(true);
        for (const result of results) {
          expect(typeof result.name).toBe('string');
          if (result.score !== undefined) expect(Number.isFinite(result.score)).toBe(true);
        }
      }
    });

    test(`${meta.id} ships an example that parses without errors`, () => {
      const text = readFileSync(join(root, 'src', 'tools', meta.id, 'example.gamebuddy'), 'utf8');
      const parsed = parseTemplate(text);
      expect(parsed.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
      const resolved = resolveTemplate(parsed.template, (id) => schemas[id]);
      expect(resolved.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
    });
  }
});
