import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { schemas } from '../src/core/schemas.generated';
import { listTemplates } from '../src/data/templates';
import { summariseTemplate } from '../src/data/template-summary';
import { templateTexts } from '../src/data/template-text.generated';
import {
  allDiagnostics,
  hasErrors,
  parseTemplate,
  resolveTemplate,
  type Template,
} from '../src/core/template/parse';
import { serializeTemplate } from '../src/core/template/serialize';
import { formatDurationText, parseDuration, splitList } from '../src/core/template/schema';

const root = join(import.meta.dir, '..');

function resolveOf(template: Template) {
  return resolveTemplate(template, (id) => schemas[id]);
}

describe('duration parsing', () => {
  test('parses single units', () => {
    expect(parseDuration('500ms')).toBe(500);
    expect(parseDuration('90s')).toBe(90000);
    expect(parseDuration('3m')).toBe(180000);
    expect(parseDuration('2h')).toBe(7200000);
  });

  test('parses compound and bare numbers', () => {
    expect(parseDuration('1h30m')).toBe(5400000);
    expect(parseDuration('1m30s')).toBe(90000);
    expect(parseDuration('45')).toBe(45000);
    expect(parseDuration('2:30')).toBe(150000);
  });

  test('rejects nonsense', () => {
    expect(parseDuration('3 minutos')).toBeNull();
    expect(parseDuration('soon')).toBeNull();
    expect(parseDuration('')).toBeNull();
  });

  test('formats back to compact text', () => {
    expect(formatDurationText(180000)).toBe('3m');
    expect(formatDurationText(90000)).toBe('1m30s');
    expect(formatDurationText(5400000)).toBe('1h30m');
  });

  test('an explicit empty list is not a one-item list', () => {
    expect(splitList('[]')).toEqual([]);
    expect(splitList('')).toEqual([]);
    expect(splitList('Ada, "Bo, Jr", Cy')).toEqual(['Ada', 'Bo, Jr', 'Cy']);
  });
});

describe('template parsing', () => {
  test('reads game metadata, players and tool blocks', () => {
    const text = [
      '[game]',
      'name: Test Game',
      'players: 2-5',
      'time: 30m',
      'tags: party, fast',
      'source: https://example.com/game?a=b',
      '',
      '[players]',
      '- Ada',
      'Bo',
      '',
      '[tool timer kitchen]',
      'mode: flip',
      'duration: 3m',
    ].join('\n');
    const { template, diagnostics } = parseTemplate(text);
    expect(diagnostics.filter((item) => item.severity === 'error')).toHaveLength(0);
    expect(template.game.name).toBe('Test Game');
    expect(template.game.players).toEqual({ min: 2, max: 5 });
    expect(template.game.tags).toEqual(['party', 'fast']);
    expect(template.game.source).toBe('https://example.com/game?a=b');
    expect(template.players).toEqual(['Ada', 'Bo']);
    expect(template.tools[0].toolId).toBe('timer');
    expect(template.tools[0].instanceId).toBe('kitchen');
  });

  test('accepts = as the separator', () => {
    const { template } = parseTemplate('[game]\nname = Equals');
    expect(template.game.name).toBe('Equals');
  });

  test('full-line comments are ignored, inline hashes are values', () => {
    const { template } = parseTemplate('[game]\n# a comment\nname: Colors\n[tool timer]\nmode: countdown\n# color: #fff\n');
    expect(template.game.name).toBe('Colors');
    expect(template.tools[0].values.color).toBeUndefined();
  });

  test('missing name is an error', () => {
    const { diagnostics } = parseTemplate('[game]\ntime: 5m');
    expect(hasErrors(diagnostics)).toBe(true);
  });

  test('unknown sections warn but do not fail', () => {
    const { diagnostics } = parseTemplate('[game]\nname: X\n[weird]\nfoo: bar\n');
    expect(diagnostics.some((item) => item.severity === 'warning' && item.message.includes('weird'))).toBe(true);
    expect(hasErrors(diagnostics)).toBe(false);
  });

  test('duplicate keys warn and the last value wins', () => {
    const { template, diagnostics } = parseTemplate('[game]\nname: One\nname: Two\n');
    expect(template.game.name).toBe('Two');
    expect(diagnostics.some((item) => item.message.includes('Duplicate key'))).toBe(true);
  });

  test('duplicate instances warn', () => {
    const { diagnostics } = parseTemplate(
      '[game]\nname: X\n[tool timer]\nduration: 1m\n[tool timer]\nduration: 2m\n',
    );
    expect(diagnostics.some((item) => item.message.includes('Duplicate tool instance'))).toBe(true);
  });

  test('multi-line values are preserved', () => {
    const { template } = parseTemplate('[game]\nname: X\n[tool rules]\nquick: |\n  First line\n  Second line\n');
    expect(template.tools[0].values.quick.raw).toBe('First line\nSecond line');
  });

  test('rules keep markdown and colons untouched', () => {
    const { template } = parseTemplate('[game]\nname: X\n[rules]\n**Goal:** win\n\nNote: like this\n');
    expect(template.rules).toContain('**Goal:** win');
    expect(template.rules).toContain('Note: like this');
  });

  test('setup strips leading dashes', () => {
    const { template } = parseTemplate('[game]\nname: X\n[setup]\n- Shuffle\n- Deal\n');
    expect(template.setup).toEqual(['Shuffle', 'Deal']);
  });

  test('scripts parse numbered steps and warn on unknown verbs', () => {
    const { template, diagnostics } = parseTemplate(
      '[game]\nname: X\n[script night]\n1. say: Hello\n2. wait: 3s\n3. dance: now\n',
    );
    expect(template.scripts[0].steps).toHaveLength(3);
    expect(template.scripts[0].steps[1]).toEqual({ verb: 'wait', arg: '3s', line: 5 });
    expect(diagnostics.some((item) => item.message.includes('Unknown script verb'))).toBe(true);
  });

  test('text before the first section warns', () => {
    const { diagnostics } = parseTemplate('stray line\n[game]\nname: X\n');
    expect(diagnostics.some((item) => item.message.includes('before the first section'))).toBe(true);
  });
});

describe('schema resolution', () => {
  const base = '[game]\nname: X\n[tool timer kitchen]\n';

  test('fills defaults and coerces types', () => {
    const { template } = parseTemplate(`${base}duration: 3m\nper-player: yes\nplayers: 4\n`);
    const [tool] = resolveOf(template).tools;
    expect(tool.values.duration).toBe(180000);
    expect(tool.values['per-player']).toBe(true);
    expect(tool.values.players).toBe(4);
    expect(tool.values.mode).toBe('countdown');
    expect(tool.values.sound).toBe('bell');
  });

  test('pairs and lists are structured', () => {
    const { template } = parseTemplate(`${base}phases: Setup=5m, Play=25m\n`);
    const [tool] = resolveOf(template).tools;
    expect(tool.values.phases).toEqual({ Setup: '5m', Play: '25m' });
  });

  test('unknown keys warn with a suggestion', () => {
    const { template } = parseTemplate(`${base}warn: 20s\n`);
    const resolved = resolveOf(template);
    expect(
      resolved.diagnostics.some(
        (item) => item.severity === 'warning' && item.message.includes('did you mean "warn-at"'),
      ),
    ).toBe(true);
  });

  test('invalid values error with a line number', () => {
    const { template } = parseTemplate(`${base}duration: 3 minutos\n`);
    const resolved = resolveOf(template);
    const error = resolved.diagnostics.find((item) => item.severity === 'error');
    expect(error?.line).toBe(4);
    expect(error?.message).toContain('not a duration');
  });

  test('unknown tools are reported as unavailable, not fatal', () => {
    const { template } = parseTemplate('[game]\nname: X\n[tool hologram]\nmode: x\n');
    const resolved = resolveOf(template);
    expect(resolved.unavailable[0].toolId).toBe('hologram');
    expect(hasErrors(resolved.diagnostics)).toBe(false);
  });
});

describe('round trip', () => {
  function roundTrip(text: string): void {
    const first = parseTemplate(text);
    const resolved = resolveOf(first.template);
    const spec = {
      game: {
        name: first.template.game.name,
        players: first.template.game.players
          ? `${first.template.game.players.min}-${first.template.game.players.max}`
          : undefined,
        time: first.template.game.time,
        tags: first.template.game.tags,
        source: first.template.game.source,
        author: first.template.game.author,
        license: first.template.game.license,
        format: 1,
      },
      players: first.template.players,
      tools: resolved.tools.map((tool) => ({
        toolId: tool.toolId,
        instanceId: tool.instanceId,
        values: tool.values,
      })),
      setup: first.template.setup,
      rules: first.template.rules,
    };
    const written = serializeTemplate(spec, (id) => schemas[id]);
    const second = parseTemplate(written);
    expect(hasErrors(second.diagnostics)).toBe(false);
    expect(second.template.game.name).toBe(first.template.game.name);
    expect(second.template.players).toEqual(first.template.players);
    expect(second.template.tools.length).toBe(first.template.tools.length);
    const again = resolveOf(second.template);
    expect(again.tools.map((tool) => tool.instanceId)).toEqual(resolved.tools.map((tool) => tool.instanceId));
    expect(again.tools.map((tool) => tool.values)).toEqual(resolved.tools.map((tool) => tool.values));
  }

  for (const item of templateTexts) {
    test(`bundled template ${item.id}`, () => roundTrip(item.text));
  }

  const toolsDir = join(root, 'src', 'tools');
  for (const dir of readdirSync(toolsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    const file = join(toolsDir, dir.name, 'example.gamebuddy');
    let text = '';
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    test(`tool example ${dir.name}`, () => roundTrip(text));
  }

  test('the generated summaries match the generated texts', () => {
    const summaries = new Map(listTemplates().map((summary) => [summary.id, summary]));
    expect(summaries.size).toBe(templateTexts.length);
    for (const item of templateTexts) {
      expect(summaries.get(item.id)).toEqual(summariseTemplate(item.id, item.text));
    }
  });

  test('every bundled template parses cleanly', () => {
    for (const item of templateTexts) {
      const { diagnostics } = parseTemplate(item.text);
      expect(diagnostics.filter((entry) => entry.severity === 'error')).toHaveLength(0);
    }
  });

  test('all diagnostics preserve line ordering', () => {
    const { template, diagnostics } = parseTemplate('[game]\ntime: 5m\n[weird]\n');
    const merged = allDiagnostics(diagnostics, resolveOf(template).diagnostics);
    const lines = merged.map((item) => item.line);
    expect(lines).toEqual([...lines].sort((a, b) => a - b));
  });
});
