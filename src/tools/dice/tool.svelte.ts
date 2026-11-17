import type { ToolContext } from '../../core/registry';
import type { PresetValues } from '../../core/template/schema';
import Dice from './Dice.svelte';
import { describeResult, parseDice, rollDice, type DiceInstance, type DiceState } from './logic';
import meta from './meta';
import preset from './preset';

function create(ctx: ToolContext, values: PresetValues = {}): DiceInstance {
  const data = $state<DiceState>({
    notation: String(values.roll ?? '1d6'),
    pool: String(values.pool ?? ''),
    advantage: (values.advantage as DiceState['advantage']) ?? 'none',
    successAt: Number(values['success-at'] ?? 0),
    seed: String(values.seed ?? ''),
    result: null,
    error: '',
    history: [],
    showBreakdown: true,
  });

  function roll(notation?: string): void {
    const source = (notation ?? data.notation).trim();
    if (!source) {
      data.error = 'Type a roll like 2d6+1';
      return;
    }
    let text = source;
    if (data.advantage !== 'none') {
      const parts = text.split(/\s*\+\s*/);
      const last = parts[parts.length - 1];
      if (/^\d*d20$/i.test(last || '')) {
        parts[parts.length - 1] = data.advantage === 'advantage' ? '2d20kh1' : '2d20kl1';
        text = parts.join('+');
      }
    }
    const parsed = parseDice(text);
    if (!parsed.ok) {
      data.error = parsed.message;
      data.result = null;
      return;
    }
    if (data.seed.trim()) ctx.rng.seed(data.seed.trim());
    const result = rollDice(parsed.expression, ctx.rng);
    data.result = result;
    data.error = '';
    data.notation = source;
    ctx.audio.play('click');
    ctx.haptics.buzz('short');
    const record = {
      notation: text,
      total: result.total,
      successes: result.successes,
      detail: describeResult(result),
      at: Date.now(),
    };
    data.history = [record, ...data.history].slice(0, 20);
  }

  const instance: DiceInstance = {
    data,
    state: () => JSON.parse(JSON.stringify(data)) as DiceState,
    load(state) {
      if (!state || typeof state !== 'object') return;
      const raw = state as Partial<DiceState>;
      if (typeof raw.notation === 'string' && raw.notation) data.notation = raw.notation;
      if (typeof raw.pool === 'string') data.pool = raw.pool;
      if (raw.advantage === 'advantage' || raw.advantage === 'disadvantage' || raw.advantage === 'none') {
        data.advantage = raw.advantage;
      }
      if (typeof raw.successAt === 'number') data.successAt = raw.successAt;
      if (typeof raw.seed === 'string') data.seed = raw.seed;
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
      };
    },
    commands: {
      roll: (arg) => roll(arg || undefined),
    },
    summary() {
      if (!data.result) return 'No rolls yet.';
      const lines = data.history.map((item) => `${item.notation} = ${item.total}${item.successes ? ` (${item.successes} successes)` : ''}`);
      return lines.join('\n') || 'No rolls yet.';
    },
    roll,
    setNotation(notation) {
      data.notation = notation;
    },
    setAdvantage(mode) {
      data.advantage = mode;
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
