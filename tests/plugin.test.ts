import './helpers/language';
/**
 * `.gamebuddy-tool`: the parser, the round trip, the storage seam and the
 * `do:` script verb that presses another tool's button.
 */
import { beforeEach, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateFormula } from '../src/core/formula';
import { parseTemplate, resolveTemplate } from '../src/core/template/parse';
import { defaultsFor } from '../src/core/template/schema';
import {
  exportToolFile,
  installToolFile,
  installedToolDefinitions,
  parseToolFile,
  removeToolFile,
  resolveToolBlocks,
  serializeToolFile,
  toolSchema,
} from '../src/core/tool-file';
import { parseSteps, SCRIPT_VERBS } from '../src/tools/script/logic';
import { loadTool } from '../src/core/tools.generated';
import { makePlayers } from '../src/core/session';
import type { PluginInstance } from '../src/tools/plugin/tool.svelte';
import { testContext } from './helpers/test-context';

const root = join(import.meta.dir, '..');
const example = readFileSync(join(root, 'src', 'tools', 'plugin', 'example.gamebuddy-tool'), 'utf8');

beforeEach(() => {
  for (const definition of installedToolDefinitions()) removeToolFile(definition.id);
});

describe('tool file parsing', () => {
  test('the bundled example parses cleanly', () => {
    const result = parseToolFile(example);
    expect(result.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
    expect(result.definition?.id).toBe('check-tray');
    expect(result.definition?.name).toBe('Check tray');
    expect(result.definition?.family).toBe('randomize');
    expect(result.definition?.tags).toEqual(['d20', 'checks']);
    expect(Object.keys(result.definition?.settings ?? {})).toEqual(['sides', 'start-modifier', 'target']);
    expect(result.definition?.blocks.map((block) => block.id)).toEqual([
      'roll',
      'modifier',
      'margin',
      'passes',
      'tally',
      'clock',
      'note',
    ]);
  });

  test('a definition cannot take a built-in id', () => {
    const result = parseToolFile('[tool]\nid: timer\nname: Mine\nfamily: time\n[block note]\nkind: note\ntext: hi\n');
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((item) => item.severity === 'error')).toBe(true);
  });

  test('ids and blocks are shaped and kept unique', () => {
    const shaped = parseToolFile('[tool]\nid: Bad Id\nname: X\nfamily: time\n');
    expect(shaped.ok).toBe(false);

    const duplicate = parseToolFile(
      '[tool]\nid: mine\nname: X\nfamily: time\n[block a]\nkind: note\ntext: one\n[block a]\nkind: note\ntext: two\n',
    );
    expect(duplicate.diagnostics.some((item) => item.severity === 'warning')).toBe(true);
    expect(duplicate.definition?.blocks).toHaveLength(1);
    expect(duplicate.definition?.blocks[0].options.text).toBe('one');
  });

  test('24 blocks is the ceiling', () => {
    const blocks = Array.from({ length: 25 }, (_, index) => `[block b${index}]\nkind: note\ntext: x`).join('\n');
    const result = parseToolFile(`[tool]\nid: mine\nname: X\nfamily: time\n${blocks}\n`);
    expect(result.ok).toBe(false);
    expect(result.definition?.blocks.length).toBe(24);
  });

  test('a placeholder that names no setting warns instead of vanishing', () => {
    const result = parseToolFile(
      '[tool]\nid: mine\nname: X\nfamily: randomize\n[block roll]\nkind: roll\nlabel: {sides}\nnotation: 1d6\n',
    );
    expect(result.ok).toBe(true);
    expect(result.diagnostics.some((item) => item.severity === 'warning')).toBe(true);
  });

  test('a button needs a known verb', () => {
    const result = parseToolFile(
      '[tool]\nid: mine\nname: X\nfamily: flow\n[block go]\nkind: button\nlabel: Go\ndo: explode now\n',
    );
    expect(result.diagnostics.some((item) => item.severity === 'warning')).toBe(true);
  });
});

describe('tool file round trip', () => {
  test('the example serializes back to the same definition', () => {
    const first = parseToolFile(example).definition;
    expect(first).toBeTruthy();
    if (!first) return;
    const written = serializeToolFile(first);
    const again = parseToolFile(written);
    expect(again.ok).toBe(true);
    expect(again.definition?.id).toBe(first.id);
    expect(again.definition?.name).toBe(first.name);
    expect(again.definition?.blurb).toBe(first.blurb);
    expect(again.definition?.family).toBe(first.family);
    expect(again.definition?.seats).toBe(first.seats);
    expect(again.definition?.settings).toEqual(first.settings);
    expect(again.definition?.blocks.map((block) => [block.id, block.kind, block.options])).toEqual(
      first.blocks.map((block) => [block.id, block.kind, block.options]),
    );
  });
});

describe('installed definitions', () => {
  test('a template resolves one, and removing it brings the unavailable card back', () => {
    expect(installToolFile(example).ok).toBe(true);
    const text = '[game]\nname: Skill Check Night\n[tool check-tray]\ntarget: 15\n';

    const resolved = resolveTemplate(parseTemplate(text).template, toolSchema);
    expect(resolved.unavailable).toEqual([]);
    expect(resolved.tools[0].toolId).toBe('check-tray');
    expect(resolved.tools[0].values.target).toBe(15);
    expect(resolved.tools[0].values.sides).toBe(20);
    expect(resolved.tools[0].values['start-modifier']).toBe(0);

    removeToolFile('check-tray');
    expect(toolSchema('check-tray')).toBeUndefined();
    const missing = resolveTemplate(parseTemplate(text).template, toolSchema);
    expect(missing.unavailable).toHaveLength(1);
    expect(missing.tools).toEqual([]);
  });

  test('a broken file is never installed', () => {
    const result = installToolFile('[tool]\nid: mine\n');
    expect(result.ok).toBe(false);
    expect(installedToolDefinitions()).toEqual([]);
  });

  test('blocks read their settings and their own values', () => {
    const definition = parseToolFile(example).definition;
    expect(definition).toBeTruthy();
    if (!definition) return;
    const blocks = resolveToolBlocks(definition, defaultsFor(definition.settings));
    // A template that changes nothing still gets the file's own defaults.
    const bare = resolveToolBlocks(definition, {});
    expect(bare.find((block) => block.id === 'roll')?.notation).toBe('1d20');
    expect(bare.find((block) => block.id === 'margin')?.formula).toBe('roll + modifier - 12');
    expect(blocks.find((block) => block.id === 'roll')?.notation).toBe('1d20');
    expect(blocks.find((block) => block.id === 'margin')?.formula).toBe('roll + modifier - 12');
    expect(blocks.find((block) => block.id === 'modifier')?.start).toBe(0);
    expect(blocks.find((block) => block.id === 'tally')?.action).toBe('counter passes +1');
    expect(blocks.find((block) => block.id === 'note')?.text).toContain('A margin of 0 or more is a pass.');
  });
});

describe('the shared runtime', () => {
  test('reads a definition, draws its blocks and exposes buttons as commands', async () => {
    expect(installToolFile(example).ok).toBe(true);
    const module = await loadTool('plugin');
    const ctx = testContext();
    ctx.toolId = 'check-tray';
    const schema = toolSchema('check-tray');
    expect(schema).toBeTruthy();
    if (!schema) return;
    const instance = module.create(ctx, defaultsFor(schema)) as unknown as PluginInstance;

    expect(instance.data.counters.passes).toBe(0);
    expect(instance.data.name).toBe('Check tray');
    expect(instance.presetFromState().target).toBe(12);
    expect(instance.summary()).toContain('Passes: 0');

    instance.commands?.tally?.();
    expect(instance.data.counters.passes).toBe(1);
    expect(instance.summary()).toContain('Passes: 1');

    // The readout sees the roll it names, with the file's default target filled in.
    instance.doRoll('roll');
    expect(instance.readout('margin')).toBe(Number(instance.data.rolls.roll) - 12);

    const copy = JSON.parse(JSON.stringify(instance.state()));
    instance.load(copy);
    expect(JSON.parse(JSON.stringify(instance.state()))).toEqual(copy);
  });
});

describe('per-player sheets', () => {
  test('follow the table, keep values by player id, and answer syncPlayers', async () => {
    const text = [
      '[tool]',
      'id: tray',
      'name: Tray',
      'family: track',
      '[block score]',
      'kind: counter',
      'label: Score',
      'start: 1',
      'per-player: yes',
    ].join('\n');
    expect(installToolFile(text).ok).toBe(true);
    const module = await loadTool('plugin');
    const ctx = testContext();
    ctx.toolId = 'tray';
    let table = makePlayers(['Ada', 'Bo']);
    ctx.session.players = () => table;
    const schema = toolSchema('tray');
    expect(schema).toBeTruthy();
    if (!schema) return;
    const instance = module.create(ctx, defaultsFor(schema)) as unknown as PluginInstance;

    expect(instance.sheets().map((sheet) => [sheet.id, sheet.name, sheet.values.score])).toEqual([
      ['p1', 'Ada', 1],
      ['p2', 'Bo', 1],
    ]);

    instance.adjustSheet('score', 'p1', 2);
    expect(instance.sheets()[0].values.score).toBe(3);

    // A rename keeps the player's id, so the value stays.
    table = makePlayers(['Ada Lovelace', 'Bo']);
    expect(instance.sheets()[0].name).toBe('Ada Lovelace');
    expect(instance.sheets()[0].values.score).toBe(3);

    // A new seat appears with the block's start value, on its own.
    table = makePlayers(['Ada Lovelace', 'Bo', 'Cy']);
    expect(instance.sheets()).toHaveLength(3);
    expect(instance.sheets()[2].values.score).toBe(1);

    // A seat that leaves drops its row.
    table = makePlayers(['Bo', 'Cy']);
    expect(instance.sheets()).toHaveLength(2);

    instance.syncPlayers();
    expect(Object.keys(instance.state().sheets)).toEqual(['p1', 'p2']);
    expect(instance.summary()).toContain('Score');
  });
});

describe('do: script steps', () => {
  test('the verb parses and keeps the <instance> <command> argument', () => {
    expect(SCRIPT_VERBS).toContain('do');
    const parsed = parseTemplate('[game]\nname: Flow\n[script night]\n1. do: clock next\n2. do: deck deal\n');
    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.template.scripts[0].steps[0]).toMatchObject({ verb: 'do', arg: 'clock next' });
    expect(parseSteps(['do: clock next'])[0]).toMatchObject({ verb: 'do', arg: 'clock next' });
  });
});

describe('scripts', () => {
  const scripted = [
    '[tool]',
    'id: scripted',
    'name: Scripted',
    'family: flow',
    '[block score]',
    'kind: counter',
    'label: Score',
    'start: 0',
    '[block tally]',
    'kind: button',
    'label: Tally',
    'run: bump',
    '[script bump]',
    'body: |',
    '  gb.add("score", 2)',
    '  gb.log("bumped")',
    '[script setup]',
    'when: start',
    'body: |',
    '  gb.set("score", 5)',
    '[script tidy]',
    'when: reset',
    'body: |',
    '  gb.set("score", 1)',
  ].join('\n');

  test('inline scripts parse, wire a button and serialize back', () => {
    const result = parseToolFile(scripted);
    expect(result.diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
    expect(result.definition?.scripts.map((script) => [script.id, script.when])).toEqual([
      ['bump', 'none'],
      ['setup', 'start'],
      ['tidy', 'reset'],
    ]);
    expect(result.definition?.blocks.find((block) => block.id === 'tally')?.options.run).toBe('bump');

    const again = parseToolFile(serializeToolFile(result.definition!));
    expect(again.definition?.scripts.map((script) => [script.id, script.when, script.body])).toEqual(
      result.definition?.scripts.map((script) => [script.id, script.when, script.body]),
    );
  });

  test('a script can come from a selected .js file, and be exported inline', () => {
    const text = [
      '[tool]',
      'id: filed',
      'name: Filed',
      'family: flow',
      '[block score]',
      'kind: counter',
      'label: Score',
      '[script helper]',
      'file: helper.js',
    ].join('\n');
    const result = installToolFile(text, { 'helper.js': 'gb.set("score", 4)' });
    expect(result.ok).toBe(true);
    expect(result.definition?.scripts[0].body).toBe('gb.set("score", 4)');
    // Storage keeps the pair, so a reload still resolves the file...
    expect(installedToolDefinitions()[0].scripts[0].body).toBe('gb.set("score", 4)');
    // ...and the exported file carries the code inline, so one file is enough.
    expect(exportToolFile('filed')).toContain('gb.set("score", 4)');
    expect(exportToolFile('filed')).not.toContain('file: helper.js');
  });

  test('a missing file, a syntax error and an empty script are errors', () => {
    const base = '[tool]\nid: mine\nname: X\nfamily: flow\n';
    const missing = parseToolFile(`${base}[script one]\nfile: gone.js\n`);
    expect(missing.ok).toBe(false);
    expect(missing.diagnostics.some((item) => item.severity === 'error')).toBe(true);

    const broken = parseToolFile(`${base}[script one]\nbody: |\n  gb.add(\n`);
    expect(broken.ok).toBe(false);

    const empty = parseToolFile(`${base}[script one]\nwhen: start\n`);
    expect(empty.ok).toBe(false);
  });

  test('a button needs an action or a script, and a run: names a real one', () => {
    const base = '[tool]\nid: mine\nname: X\nfamily: flow\n';
    const none = parseToolFile(`${base}[block go]\nkind: button\nlabel: Go\n`);
    expect(none.ok).toBe(false);

    const unknown = parseToolFile(`${base}[block go]\nkind: button\nlabel: Go\nrun: missing\n`);
    expect(unknown.diagnostics.some((item) => item.severity === 'warning')).toBe(true);
  });

  test('runs at its entry points in the shared runtime', async () => {
    expect(installToolFile(scripted).ok).toBe(true);
    const module = await loadTool('plugin');
    const ctx = testContext();
    ctx.toolId = 'scripted';
    const schema = toolSchema('scripted');
    if (!schema) throw new Error('no schema');
    const instance = module.create(ctx, defaultsFor(schema)) as unknown as PluginInstance;

    expect(instance.data.counters.score).toBe(0);
    instance.start?.();
    expect(instance.data.counters.score).toBe(5);

    instance.commands?.tally?.();
    expect(instance.data.counters.score).toBe(7);
    expect(instance.data.log[0]).toBe('bumped');

    instance.commands?.reset?.();
    expect(instance.data.counters.score).toBe(1);
  });

  test('a script that throws is reported instead of breaking the screen', async () => {
    const text = [
      '[tool]',
      'id: boom',
      'name: Boom',
      'family: flow',
      '[block go]',
      'kind: button',
      'label: Go',
      'run: explode',
      '[script explode]',
      'body: |',
      '  throw new Error("no dice")',
    ].join('\n');
    expect(installToolFile(text).ok).toBe(true);
    const module = await loadTool('plugin');
    const seen: string[] = [];
    const ctx = testContext();
    ctx.toast = (message) => seen.push(message);
    ctx.toolId = 'boom';
    const schema = toolSchema('boom');
    if (!schema) throw new Error('no schema');
    const instance = module.create(ctx, defaultsFor(schema)) as unknown as PluginInstance;

    instance.commands?.go?.();
    expect(seen[0]).toContain('no dice');
    expect(instance.state().log[0]).toContain('no dice');
  });
});

describe('the shared formula', () => {
  test('supports the documented function list', () => {
    expect(evaluateFormula('min(3, 5) + max(1, 2)', {})).toBe(5);
    expect(evaluateFormula('sum(1, 2, 3)', {})).toBe(6);
    expect(evaluateFormula('if(a, 10, 0)', { a: 1 })).toBe(10);
    expect(evaluateFormula('round(2.6) + floor(2.9) + ceil(2.1)', {})).toBe(8);
    expect(evaluateFormula('missing + 1', {})).toBeNull();
    expect(evaluateFormula('window.alert(1)', {})).toBeNull();
  });
});
