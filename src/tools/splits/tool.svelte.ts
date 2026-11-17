import { registerToolStrings, t as translate } from '../../core/i18n.svelte';
import type { ToolContext, ToolInstance } from '../../core/registry';
import type { PresetValues } from '../../core/template/schema';
import { parseSplits, summaryOf, totalOf, type Split, type SplitsState } from './logic';
import Splits from './Splits.svelte';
import en from './locales/en';
import meta from './meta';
import preset from './preset';

registerToolStrings('splits', en);

export interface SplitsActions {
  start(): void;
  split(): void;
  stop(): void;
  resume(): void;
  reset(): void;
  resetAll(): void;
  clearPB(): void;
  savePB(): void;
  setGame(name: string): void;
  setCategory(name: string): void;
  setSplits(text: string): void;
  setKeys(value: boolean): void;
  total(now: number): number;
}

export type SplitsInstance = ToolInstance<SplitsState> & SplitsActions;

function create(ctx: ToolContext, values: PresetValues = {}): SplitsInstance {
  const fromTemplate = Array.isArray(values.splits) ? (values.splits as string[]) : [];
  const splits: Split[] = parseSplits(fromTemplate.join('\n'));
  const pb = (Array.isArray(values.pb) ? (values.pb as string[]) : [])
    .map((value) => Math.round(Number(value) * 1000))
    .filter((value) => value > 0);

  const data = $state<SplitsState>({
    game: String(values.game ?? translate('splits.default-game')),
    category: String(values.category ?? ''),
    splits,
    pb,
    run: [],
    running: false,
    lastAt: 0,
    elapsed: 0,
    attempts: 0,
    golds: [],
    keys: values.keys === undefined ? true : !!values.keys,
  });

  function finishIfComplete(): void {
    if (data.run.length < data.splits.length || !data.splits.length) return;
    data.running = false;
    const total = totalOf(data.run);
    const previous = totalOf(data.pb);
    if (!data.pb.length || total < previous) {
      data.pb = data.run.slice();
      ctx.toast(translate('splits.toast-pb'));
      ctx.audio.play('success');
    } else {
      ctx.audio.play('bell');
    }
    data.golds = data.splits.map((_, index) => {
      const current = data.run[index];
      const gold = data.golds[index] ?? 0;
      if (current === undefined) return gold;
      return gold > 0 && gold <= current ? gold : current;
    });
  }

  const instance: SplitsInstance = {
    data,
    state: () => JSON.parse(JSON.stringify(data)) as SplitsState,
    load(state) {
      if (!state || typeof state !== 'object') return;
      const raw = state as Partial<SplitsState>;
      if (typeof raw.game === 'string') data.game = raw.game;
      if (typeof raw.category === 'string') data.category = raw.category;
      if (Array.isArray(raw.splits)) {
        data.splits = raw.splits
          .filter((split) => split && typeof split.name === 'string')
          .map((split) => ({ name: split.name, target: Number(split.target) || 0 }));
      }
      if (Array.isArray(raw.pb)) data.pb = raw.pb.map((value) => Number(value) || 0).filter((value) => value > 0);
      if (Array.isArray(raw.run)) data.run = raw.run.map((value) => Number(value) || 0);
      data.running = false;
      data.lastAt = 0;
      data.elapsed = 0;
      if (typeof raw.attempts === 'number') data.attempts = Math.max(0, raw.attempts);
      if (Array.isArray(raw.golds)) data.golds = raw.golds.map((value) => Number(value) || 0);
      if (typeof raw.keys === 'boolean') data.keys = raw.keys;
    },
    presetFromState() {
      const pbSeconds = data.pb.map((value) => (value / 1000).toFixed(2));
      return {
        game: data.game,
        category: data.category,
        splits: data.splits.map((split) => (split.target > 0 ? `${split.name} | ${(split.target / 1000).toFixed(2)}` : split.name)),
        pb: pbSeconds,
        keys: data.keys,
      };
    },
    commands: {
      start: () => instance.start(),
      split: () => instance.split(),
      reset: () => instance.reset(),
    },
    summary: () => summaryOf(data),
    total(now: number) {
      const base = totalOf(data.run);
      if (!data.running) return base;
      return base + Math.max(0, now - data.lastAt);
    },
    start() {
      if (!data.splits.length) {
        ctx.toast(translate('splits.toast-add-first'), 'error');
        return;
      }
      data.run = [];
      data.running = true;
      data.lastAt = ctx.clock.now();
      data.attempts += 1;
      ctx.audio.play('tick');
      ctx.haptics.buzz('short');
    },
    split() {
      if (!data.running) {
        instance.start();
        return;
      }
      const now = ctx.clock.now();
      const segment = Math.max(0, now - data.lastAt);
      data.run = [...data.run, segment];
      data.lastAt = now;
      ctx.audio.play('click');
      ctx.haptics.buzz('short');
      finishIfComplete();
    },
    stop() {
      if (!data.running) return;
      data.elapsed = instance.total(ctx.clock.now());
      data.running = false;
    },
    resume() {
      if (data.running) return;
      data.lastAt = ctx.clock.now();
      data.running = true;
    },
    reset() {
      data.run = [];
      data.running = false;
      data.elapsed = 0;
      data.lastAt = 0;
    },
    resetAll() {
      ctx.undo.push(translate('splits.undo-reset-all'));
      instance.reset();
      data.attempts = 0;
    },
    clearPB() {
      if (!data.pb.length && !data.golds.length) return;
      ctx.undo.push(translate('splits.undo-clear-pb'));
      data.pb = [];
      data.golds = [];
    },
    savePB() {
      if (!data.run.length) {
        ctx.toast(translate('splits.toast-finish'), 'error');
        return;
      }
      ctx.undo.push(translate('splits.undo-save-pb'));
      data.pb = data.run.slice();
      data.golds = data.run.slice();
    },
    setGame(name) {
      data.game = name.trim() || data.game;
    },
    setCategory(name) {
      data.category = name.trim();
    },
    setSplits(text) {
      const next = parseSplits(text);
      if (!next.length) {
        ctx.toast(translate('splits.toast-one-per-line'), 'error');
        return;
      }
      ctx.undo.batch(translate('splits.undo-splits'), () => {
        data.splits = next;
        data.run = [];
        data.running = false;
        data.golds = [];
      });
    },
    setKeys(value) {
      data.keys = value;
    },
  };

  return instance;
}

export default { ...meta, preset, component: Splits, create };
