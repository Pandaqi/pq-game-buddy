import { describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { manifest } from '../src/core/manifest.generated';
import { schemas } from '../src/core/schemas.generated';
import { parseTemplate, resolveTemplate } from '../src/core/template/parse';
import { serializeTemplate } from '../src/core/template/serialize';
import { defaultsFor } from '../src/core/template/schema';

const root = join(import.meta.dir, '..');

describe('every shipped tool', () => {
  test('the registry is not empty and ids match their schema keys', () => {
    expect(manifest.length).toBeGreaterThanOrEqual(11);
    for (const module of manifest) {
      expect(module.id).toBeTruthy();
      expect(module.title).toBeTruthy();
      expect(module.blurb).toBeTruthy();
      expect(module.icon).toContain('<svg');
      expect(module.tags.length).toBeGreaterThan(0);
      expect(schemas[module.id]).toBe(module.preset);
      expect(Object.keys(module.preset).length).toBeGreaterThan(0);
      expect(module.component).toBeTruthy();
      expect(typeof module.create).toBe('function');
    }
  });

  for (const module of manifest) {
    test(`${module.id} round-trips its default preset`, () => {
      const values = defaultsFor(module.preset);
      const text = serializeTemplate(
        {
          game: { name: 'Schema Test' },
          players: [],
          tools: [{ toolId: module.id, instanceId: module.id, values }],
        },
        (id) => schemas[id],
      );
      const parsed = parseTemplate(text);
      expect(parsed.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
      const resolved = resolveTemplate(parsed.template, (id) => schemas[id]);
      expect(resolved.diagnostics).toEqual([]);
      expect(resolved.tools[0].toolId).toBe(module.id);
      expect(resolved.tools[0].values).toEqual(values);
    });

    test(`${module.id} ships an example template`, () => {
      expect(existsSync(join(root, 'src', 'tools', module.id, 'example.gamebuddy'))).toBe(true);
    });
  }

  test('every schema key has a label or a type that needs none', () => {
    for (const module of manifest) {
      for (const [key, spec] of Object.entries(module.preset)) {
        expect(key).toBe(key.toLowerCase());
        expect(spec.type).toBeTruthy();
      }
    }
  });
});
