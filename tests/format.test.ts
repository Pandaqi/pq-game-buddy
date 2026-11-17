import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseTemplate } from '../src/core/template/parse';
import { decodeTemplateLink, encodeTemplateLink, shareTooLong } from '../src/core/template/share-link';

const fixtures = join(import.meta.dir, 'fixtures');

describe('format v1 golden file', () => {
  const text = readFileSync(join(fixtures, 'format-v1.gamebuddy'), 'utf8');
  const expected = JSON.parse(readFileSync(join(fixtures, 'format-v1.json'), 'utf8')) as Record<string, unknown>;

  test('parses every feature exactly', () => {
    const { template, diagnostics } = parseTemplate(text);
    expect(diagnostics).toEqual([]);
    const actual = {
      game: {
        name: template.game.name,
        players: template.game.players,
        time: template.game.time,
        tags: template.game.tags,
        source: template.game.source,
        author: template.game.author,
        license: template.game.license,
        format: template.game.format,
      },
      players: template.players,
      tools: template.tools.map((tool) => ({
        toolId: tool.toolId,
        instanceId: tool.instanceId,
        values: Object.fromEntries(Object.entries(tool.values).map(([key, value]) => [key, value.raw])),
      })),
      setup: template.setup,
      rules: template.rules,
      notes: template.notes,
      scripts: template.scripts.map((script) => ({
        instanceId: script.instanceId,
        steps: script.steps.map((step) => ({ verb: step.verb, arg: step.arg })),
      })),
    };
    expect(actual as unknown as Record<string, unknown>).toEqual(expected);
  });

  test('a multi-line value survives a second parse unchanged', () => {
    const first = parseTemplate(text).template.tools[2].values.rules.raw;
    const second = parseTemplate(text).template.tools[2].values.rules.raw;
    expect(first).toBe(second);
    expect(first).toContain('\n');
  });
});

describe('share links', () => {
  test('round-trips unicode template text', () => {
    const text = '[game]\nname: Café — dice & dragons\n[tool dice]\nroll: 2d6\n';
    const payload = encodeTemplateLink(text);
    expect(payload).not.toContain('/');
    expect(payload).not.toContain('+');
    expect(decodeTemplateLink(payload)).toBe(text);
  });

  test('rejects a damaged payload', () => {
    expect(decodeTemplateLink('not*base64')).toBeNull();
    expect(decodeTemplateLink('')).toBeNull();
  });

  test('flags links that are too long to share comfortably', () => {
    expect(shareTooLong('short')).toBe(false);
    expect(shareTooLong('x'.repeat(20000))).toBe(true);
  });
});
