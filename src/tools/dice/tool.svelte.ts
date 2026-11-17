import { registerToolStrings, t as translate } from '../../core/i18n.svelte';
import type { ToolContext } from '../../core/registry';
import type { PresetValues } from '../../core/template/schema';
import {
  cleanFaces,
  describeResult,
  namedFaces,
  normaliseFaces,
  normaliseMacros,
  normaliseSets,
  parseDice,
  rollDice,
  rollFaces,
  successesAt,
  type DiceInstance,
  type DiceMode,
  type DiceResult,
  type DiceState,
} from './logic';
import Dice from './Dice.svelte';
import meta from './meta';
import preset from './preset';
import en from './locales/en';

// A tool's words travel with its chunk; the shell only knows its title.
registerToolStrings('dice', en);

function create(ctx: ToolContext, values: PresetValues = {}): DiceInstance {
  const pool = String(values.pool ?? '').trim();

  const data = $state<DiceState>({
    notation: String(values.roll ?? '1d6'),
    pool,
    mode: pool ? 'pool' : 'single',
    advantage: (values.advantage as DiceState['advantage']) ?? 'none',
    successAt: Math.max(0, Number(values['success-at'] ?? 0)),
    seed: String(values.seed ?? ''),
    macros: normaliseMacros(values.macros),
    faces: normaliseFaces(values.faces),
    labCount: Math.max(1, Math.min(12, Math.round(Number(values['lab-count']) || 1))),
    sets: normaliseSets(values.sets),
    lab: null,
    result: null,
    error: '',
    history: [],
    showBreakdown: true,
  });

  function applyAdvantage(text: string): string {
    if (data.advantage === 'none') return text;
    const parts = text.split(/\s*\+\s*/);
    const last = parts[parts.length - 1];
    if (!/^\d*d20$/i.test(last || '')) return text;
    parts[parts.length - 1] = data.advantage === 'advantage' ? '2d20kh1' : '2d20kl1';
    return parts.join('+');
  }

  function storeResult(text: string, result: DiceResult): void {
    data.result = result;
    data.error = '';
    ctx.audio.play('click');
    ctx.haptics.buzz('short');
    data.history = [
      {
        notation: text,
        total: result.total,
        successes: result.successes,
        detail: describeResult(result),
        at: Date.now(),
      },
      ...data.history,
    ].slice(0, 20);
  }

  function roll(notation?: string): void {
    const chosen = data.mode === 'pool' ? data.pool : (notation ?? data.notation);
    const source = String(chosen ?? '').trim();
    if (!source) {
      data.error = data.mode === 'pool' ? translate('dice.error-pool') : translate('dice.error-notation');
      return;
    }
    const text = data.mode === 'pool' ? source : applyAdvantage(source);
    const parsed = parseDice(text);
    if (!parsed.ok) {
      data.error = parsed.message;
      data.result = null;
      return;
    }
    data.lab = null;
    if (data.seed.trim()) ctx.rng.seed(data.seed.trim());
    const result = rollDice(parsed.expression, ctx.rng);
    if (data.successAt > 0) result.successes = successesAt(result, data.successAt);
    if (data.mode === 'single' && !notation) data.notation = source;
    storeResult(text, result);
  }

  function rollLab(): void {
    const faces = namedFaces(data.faces);
    if (faces.length < 2) {
      data.error = translate('dice.error-faces');
      return;
    }
    data.result = null;
    data.lab = rollFaces(faces, data.labCount, ctx.rng);
    data.error = '';
    ctx.audio.play('click');
    ctx.haptics.buzz('short');
  }

  const instance: DiceInstance = {
    data,
    state: () => JSON.parse(JSON.stringify(data)) as DiceState,
    load(state) {
      if (!state || typeof state !== 'object') return;
      const raw = state as Partial<DiceState>;
      if (typeof raw.notation === 'string' && raw.notation) data.notation = raw.notation;
      if (typeof raw.pool === 'string') data.pool = raw.pool;
      if (raw.mode === 'pool' || raw.mode === 'single' || raw.mode === 'lab') data.mode = raw.mode;
      if (raw.faces) data.faces = cleanFaces(raw.faces);
      if (typeof raw.labCount === 'number') {
        data.labCount = Math.max(1, Math.min(12, Math.round(raw.labCount) || 1));
      }
      if (raw.sets) data.sets = normaliseSets(raw.sets);
      data.lab = null;
      if (raw.advantage === 'advantage' || raw.advantage === 'disadvantage' || raw.advantage === 'none') {
        data.advantage = raw.advantage;
      }
      if (typeof raw.successAt === 'number') data.successAt = Math.max(0, raw.successAt);
      if (typeof raw.seed === 'string') data.seed = raw.seed;
      if (raw.macros && typeof raw.macros === 'object') data.macros = normaliseMacros(raw.macros);
      if (typeof raw.showBreakdown === 'boolean') data.showBreakdown = raw.showBreakdown;
      if (Array.isArray(raw.history)) data.history = raw.history.slice(0, 20);
      data.result = null;
    },
    presetFromState() {
      const sets: Record<string, string> = {};
      for (const [name, faces] of Object.entries(data.sets)) sets[name] = faces.join('|');
      return {
        roll: data.notation,
        pool: data.pool,
        advantage: data.advantage,
        'success-at': data.successAt,
        seed: data.seed,
        macros: data.macros,
        faces: namedFaces(data.faces),
        'lab-count': data.labCount,
        sets,
      };
    },
    commands: {
      roll: (arg) => roll(arg || undefined),
      lab: () => rollLab(),
    },
    summary() {
      if (data.mode === 'lab' && data.lab) {
        return [
          translate('dice.summary-lab', {
            count: data.lab.results.length,
            faces: data.lab.results.join(', '),
          }),
          ...data.lab.tally.map((row) =>
            translate('dice.summary-lab-line', { face: row.face, count: row.count }),
          ),
        ].join('\n');
      }
      if (!data.history.length) return translate('dice.summary-none');
      return data.history
        .map((item) =>
          translate(item.successes ? 'dice.summary-roll-successes' : 'dice.summary-roll', {
            notation: item.notation,
            total: item.total,
            count: item.successes ?? 0,
          }),
        )
        .join('\n');
    },
    roll,
    setNotation(notation) {
      data.notation = notation;
    },
    setPool(value) {
      data.pool = value;
    },
    setMode(mode: DiceMode) {
      if (mode === 'pool' && !data.pool.trim()) {
        data.pool = data.notation;
      }
      if (mode !== 'lab') data.lab = null;
      data.mode = mode;
    },
    setFaces(faces) {
      const next = cleanFaces(faces);
      if (next.join('|') === data.faces.join('|')) return;
      ctx.undo.push(translate('dice.undo-faces'), 'dice-faces');
      data.faces = next;
      data.lab = null;
    },
    setLabCount(count) {
      const next = Math.max(1, Math.min(12, Math.round(Number.isFinite(count) ? count : 1)));
      if (next === data.labCount) return;
      ctx.undo.push(translate('dice.undo-count'));
      data.labCount = next;
    },
    saveSet(name) {
      const clean = String(name ?? '').trim().slice(0, 24);
      if (!clean) {
        ctx.toast(translate('dice.toast-set-name'), 'error');
        return;
      }
      const faces = namedFaces(data.faces);
      if (faces.length < 2) {
        ctx.toast(translate('dice.toast-set-faces'), 'error');
        return;
      }
      ctx.undo.push(translate('dice.undo-save-set'));
      data.sets = { ...data.sets, [clean]: faces };
      ctx.toast(translate('dice.toast-saved', { name: clean }));
    },
    loadSet(name) {
      const faces = data.sets[name];
      if (!faces) return;
      ctx.undo.push(translate('dice.undo-load-set'));
      data.faces = faces.slice();
      data.lab = null;
      ctx.toast(translate('dice.toast-loaded', { name }));
    },
    deleteSet(name) {
      if (!data.sets[name]) return;
      ctx.undo.push(translate('dice.undo-delete-set'));
      const next = { ...data.sets };
      delete next[name];
      data.sets = next;
    },
    rollLab,
    setAdvantage(mode) {
      data.advantage = mode;
    },
    setSuccessAt(value) {
      data.successAt = Math.max(0, Math.round(value));
    },
    setSeed(code) {
      data.seed = code;
    },
    clearHistory() {
      ctx.undo.push(translate('dice.undo-clear'));
      data.history = [];
      data.result = null;
    },
  };

  return instance;
}

export default { ...meta, preset, component: Dice, create };
