import type { ToolContext } from '../../core/registry';
import type { PresetValues } from '../../core/template/schema';
import Dice from './Dice.svelte';
import {
  describeResult,
  normaliseMacros,
  parseDice,
  rollDice,
  successesAt,
  type DiceInstance,
  type DiceResult,
  type DiceState,
} from './logic';
import meta from './meta';
import preset from './preset';

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
      data.error = data.mode === 'pool' ? 'Set a pool, like 4d6+2d8, in settings.' : 'Type a roll like 2d6+1';
      return;
    }
    const text = data.mode === 'pool' ? source : applyAdvantage(source);
    const parsed = parseDice(text);
    if (!parsed.ok) {
      data.error = parsed.message;
      data.result = null;
      return;
    }
    if (data.seed.trim()) ctx.rng.seed(data.seed.trim());
    const result = rollDice(parsed.expression, ctx.rng);
    if (data.successAt > 0) result.successes = successesAt(result, data.successAt);
    if (data.mode === 'single' && !notation) data.notation = source;
    storeResult(text, result);
  }

  const instance: DiceInstance = {
    data,
    state: () => JSON.parse(JSON.stringify(data)) as DiceState,
    load(state) {
      if (!state || typeof state !== 'object') return;
      const raw = state as Partial<DiceState>;
      if (typeof raw.notation === 'string' && raw.notation) data.notation = raw.notation;
      if (typeof raw.pool === 'string') data.pool = raw.pool;
      if (raw.mode === 'pool' || raw.mode === 'single') data.mode = raw.mode;
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
      return {
        roll: data.notation,
        pool: data.pool,
        advantage: data.advantage,
        'success-at': data.successAt,
        seed: data.seed,
        macros: data.macros,
      };
    },
    commands: {
      roll: (arg) => roll(arg || undefined),
    },
    summary() {
      if (!data.history.length) return 'No rolls yet.';
      return data.history
        .map(
          (item) =>
            `${item.notation} = ${item.total}${item.successes ? ` (${item.successes} successes)` : ''}`,
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
    setMode(mode) {
      if (mode === 'pool' && !data.pool.trim()) {
        data.pool = data.notation;
      }
      data.mode = mode;
    },
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
      ctx.undo.push('clear history');
      data.history = [];
      data.result = null;
    },
  };

  return instance;
}

export default { ...meta, preset, component: Dice, create };
