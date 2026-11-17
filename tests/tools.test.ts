import { describe, expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { manifest } from '../src/core/manifest.generated';
import { schemas } from '../src/core/schemas.generated';
import { parseTemplate, resolveTemplate } from '../src/core/template/parse';
import { serializeTemplate } from '../src/core/template/serialize';
import { defaultsFor } from '../src/core/template/schema';
import { loadTool } from '../src/core/tools.generated';

const root = join(import.meta.dir, '..');

describe('every shipped tool', () => {
  test('the manifest carries metadata for every tool', () => {
    expect(manifest.length).toBeGreaterThanOrEqual(11);
    for (const meta of manifest) {
      expect(meta.id).toBeTruthy();
      expect(meta.title).toBeTruthy();
      expect(meta.blurb).toBeTruthy();
      expect(meta.icon).toContain('<svg');
      expect(meta.tags.length).toBeGreaterThan(0);
      expect(schemas[meta.id]).toBeTruthy();
    }
  });

  for (const meta of manifest) {
    test(`${meta.id} loads on demand and matches its schema`, async () => {
      const module = await loadTool(meta.id);
      expect(module.id).toBe(meta.id);
      expect(schemas[module.id]).toBe(module.preset);
      expect(Object.keys(module.preset).length).toBeGreaterThan(0);
      expect(module.component).toBeTruthy();
      expect(typeof module.create).toBe('function');
    });

    test(`${meta.id} round-trips its default preset`, async () => {
      const module = await loadTool(meta.id);
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

    test(`${meta.id} ships an example template`, () => {
      expect(existsSync(join(root, 'src', 'tools', meta.id, 'example.gamebuddy'))).toBe(true);
    });
  }

  test('every schema key is lowercase and typed', () => {
    for (const module of Object.values(schemas)) {
      for (const [key, spec] of Object.entries(module)) {
        expect(key).toBe(key.toLowerCase());
        expect(spec.type).toBeTruthy();
      }
    }
  });
});
