import type { ToolContext } from '../../core/registry';
import type { PresetValues } from '../../core/template/schema';
import { denominationsFrom, resultsFor, transfer, type CountersInstance, type CountersState } from './logic';
import Counters from './Counters.svelte';
import meta from './meta';
import preset from './preset';

function create(ctx: ToolContext, values: PresetValues = {}): CountersInstance {
  const step = Math.max(1, Number(values.step ?? 1));
  const pairs = (values.counters as Record<string, unknown>) ?? {};
  const denominations = denominationsFrom(
    (Array.isArray(values.denominations) ? (values.denominations as string[]) : []).map((value) => Number(value)),
  );
  const hidden = !!values.hidden;

  const counters = Object.entries(pairs).map(([name, value], index) => ({
    id: `c${index + 1}`,
    name,
    value: Math.max(0, Number(value) || 0),
    step,
  }));

  const data = $state<CountersState>({
    counters,
    bank: Math.max(0, Number(values.bank ?? 0)),
    denominations: denominations.length ? denominations : [1, 5, 10, 25, 100],
    step,
    hidden,
    revealed: !hidden,
    history: [],
  });

  function log(text: string): void {
    data.history = [{ at: Date.now(), text }, ...data.history].slice(0, 30);
  }

  const instance: CountersInstance = {
    data,
    state: () => JSON.parse(JSON.stringify(data)) as CountersState,
    load(state) {
      if (!state || typeof state !== 'object') return;
      const raw = state as Partial<CountersState>;
      if (Array.isArray(raw.counters)) {
        data.counters = raw.counters
          .filter((counter) => counter && typeof counter.id === 'string')
          .map((counter, index) => ({
            id: counter.id,
            name: typeof counter.name === 'string' ? counter.name : `Counter ${index + 1}`,
            value: Math.max(0, Number(counter.value) || 0),
            step: Math.max(1, Number(counter.step) || data.step),
          }));
      }
      if (typeof raw.bank === 'number') data.bank = Math.max(0, raw.bank);
      if (Array.isArray(raw.denominations)) {
        const list = raw.denominations.map((value) => Number(value)).filter((value) => value > 0);
        if (list.length) data.denominations = list;
      }
      if (typeof raw.step === 'number') data.step = Math.max(1, raw.step);
      if (typeof raw.hidden === 'boolean') data.hidden = raw.hidden;
      data.revealed = raw.revealed === true ? true : !data.hidden;
      if (Array.isArray(raw.history)) data.history = raw.history.slice(0, 30);
    },
    presetFromState() {
      const out: Record<string, number> = {};
      for (const counter of data.counters) out[counter.name] = counter.value;
      return {
        counters: out,
        bank: data.bank,
        denominations: data.denominations.map(String),
        step: data.step,
        hidden: data.hidden,
      };
    },
    commands: {
      bank: (arg) => instance.adjustBank(Number(arg ?? 0) || 0),
      reveal: () => instance.reveal(),
    },
    summary() {
      const lines = [`Bank: ${data.bank}`];
      for (const counter of data.counters) lines.push(`${counter.name}: ${counter.value}`);
      return lines.join('\n');
    },
    results: () => resultsFor(data),
    adjust(id, delta) {
      const counter = data.counters.find((item) => item.id === id);
      if (!counter) return;
      const moved = transfer(counter, data.bank, delta);
      if (moved === 0) {
        ctx.toast(delta > 0 ? 'The bank is empty' : `${counter.name} is already empty`, 'error');
        return;
      }
      ctx.undo.push('counter change', `counter-${id}`);
      counter.value = Math.max(0, counter.value + moved);
      data.bank = Math.max(0, data.bank - moved);
      log(`${moved > 0 ? 'Moved' : 'Returned'} ${Math.abs(moved)} ${moved > 0 ? 'to' : 'from'} ${counter.name}`);
      ctx.haptics.buzz('short');
    },
    adjustBank(delta) {
      if (!Number.isFinite(delta) || delta === 0) return;
      const next = Math.max(0, data.bank + delta);
      if (next === data.bank) return;
      ctx.undo.push('bank change', 'bank');
      const moved = next - data.bank;
      data.bank = next;
      log(`Bank ${moved > 0 ? '+' : ''}${moved}`);
      ctx.haptics.buzz('short');
    },
    tapDenomination(value) {
      if (!Number.isFinite(value) || value <= 0) return;
      ctx.undo.push('add denomination', 'bank');
      data.bank += value;
      log(`Bank +${value}`);
      ctx.audio.play('click');
    },
    addCounter(name, start) {
      const trimmed = name.trim();
      if (!trimmed) return;
      ctx.undo.push('add counter');
      data.counters.push({
        id: `x${Date.now().toString(36)}`,
        name: trimmed,
        value: Math.max(0, Number.isFinite(start) ? start : 0),
        step: data.step,
      });
    },
    renameCounter(id, name) {
      const counter = data.counters.find((item) => item.id === id);
      if (!counter) return;
      ctx.undo.push('rename counter');
      counter.name = name.trim() || counter.name;
    },
    removeCounter(id) {
      const counter = data.counters.find((item) => item.id === id);
      if (!counter) return;
      ctx.undo.push('remove counter');
      data.bank += counter.value;
      data.counters = data.counters.filter((item) => item.id !== id);
    },
    setStep(value) {
      const next = Math.max(1, Math.round(Number.isFinite(value) ? value : 1));
      if (next === data.step) return;
      ctx.undo.push('counter step');
      data.step = next;
      for (const counter of data.counters) counter.step = next;
    },
    setHidden(value) {
      ctx.undo.push('hidden counters');
      data.hidden = value;
      data.revealed = !value;
    },
    reveal() {
      data.revealed = true;
      ctx.audio.play('success');
    },
    reset() {
      const untouched =
        data.bank === 0 && data.history.length === 0 && data.counters.every((counter) => counter.value === 0);
      if (untouched) return;
      ctx.undo.push('reset counters');
      for (const counter of data.counters) counter.value = 0;
      data.bank = 0;
      data.history = [];
      data.revealed = !data.hidden;
    },
  };

  return instance;
}

export default { ...meta, preset, component: Counters, create };
