import type { ToolContext } from '../../core/registry';
import type { PresetValues } from '../../core/template/schema';
import {
  drawFromPool,
  drawNumbers,
  seatOrder,
  splitTeams,
  type PickInstance,
  type PickSource,
  type PickState,
  type PickView,
} from './logic';
import Pick from './Pick.svelte';
import meta from './meta';
import preset from './preset';

function create(ctx: ToolContext, values: PresetValues = {}): PickInstance {
  const data = $state<PickState>({
    source: (values.source as PickSource) ?? 'number',
    min: 1,
    max: 10,
    count: Math.max(1, Number(values.count ?? 1)),
    replacement: values.replacement === undefined ? true : !!values.replacement,
    teams: Math.max(2, Number(values.teams ?? 2)),
    values: Array.isArray(values.values) ? (values.values as string[]) : [],
    drawn: [],
    result: [],
    teamResult: null,
    history: [],
    view: (values.view as PickState['view']) ?? 'list',
    revealed: [],
    seed: String(values.seed ?? ''),
  });

  function playerNames(): string[] {
    return ctx.session.players().map((player) => player.name);
  }

  function remember(items: string[]): void {
    data.result = items;
    data.revealed = items.map(() => false);
    data.history = [{ at: Date.now(), items }, ...data.history].slice(0, 20);
    ctx.audio.play('click');
    ctx.haptics.buzz('short');
  }

  function draw(): void {
    if (data.seed.trim()) ctx.rng.seed(data.seed.trim());
    switch (data.source) {
      case 'number': {
        const numbers = drawNumbers(data.min, data.max, data.count, !data.replacement, ctx.rng);
        remember(numbers.map(String));
        data.teamResult = null;
        break;
      }
      case 'list': {
        if (!data.values.length) {
          ctx.toast('Add a few options first');
          return;
        }
        const pool = data.replacement ? data.values : data.values.filter((value) => !data.drawn.includes(value));
        if (!pool.length) {
          data.drawn = [];
          ctx.toast('List exhausted; starting over');
          draw();
          return;
        }
        const items = drawFromPool(pool, data.count, ctx.rng);
        if (!data.replacement) data.drawn = [...data.drawn, ...items];
        remember(items);
        data.teamResult = null;
        break;
      }
      case 'players':
      case 'seats': {
        const names = playerNames();
        if (!names.length) {
          ctx.toast('Add players to the session first');
          return;
        }
        if (data.source === 'seats') {
          const order = seatOrder(names, ctx.rng);
          data.teamResult = null;
          remember(order);
        } else {
          data.teamResult = null;
          remember(drawFromPool(names, Math.min(data.count, names.length), ctx.rng));
        }
        break;
      }
      case 'teams': {
        const names = playerNames();
        if (names.length < 2) {
          ctx.toast('Teams need at least two players');
          return;
        }
        if (data.teams > names.length) {
          ctx.toast('More teams than players; some teams will be empty');
        }
        data.teamResult = splitTeams(names, data.teams, ctx.rng);
        data.result = [];
        ctx.haptics.buzz('short');
        break;
      }
    }
  }

  const instance: PickInstance = {
    data,
    state: () => JSON.parse(JSON.stringify(data)) as PickState,
    load(state) {
      if (!state || typeof state !== 'object') return;
      const raw = state as Partial<PickState>;
      if (raw.source) data.source = raw.source;
      if (typeof raw.min === 'number') data.min = raw.min;
      if (typeof raw.max === 'number') data.max = raw.max;
      if (typeof raw.count === 'number') data.count = Math.max(1, raw.count);
      if (typeof raw.replacement === 'boolean') data.replacement = raw.replacement;
      if (typeof raw.teams === 'number') data.teams = Math.max(2, raw.teams);
      if (Array.isArray(raw.values)) data.values = raw.values.map(String);
      if (Array.isArray(raw.history)) data.history = raw.history.slice(0, 20);
      if (raw.view === 'cards' || raw.view === 'list' || raw.view === 'wheel' || raw.view === 'slot') {
        data.view = raw.view;
      }
      if (typeof raw.seed === 'string') data.seed = raw.seed;
      data.drawn = [];
      data.result = [];
      data.revealed = [];
      data.teamResult = null;
    },
    presetFromState() {
      return {
        source: data.source,
        values: data.values,
        count: data.count,
        replacement: data.replacement,
        teams: data.teams,
        view: data.view,
        seed: data.seed,
      };
    },
    commands: { draw: () => draw() },
    summary() {
      if (data.source === 'teams' && data.teamResult) {
        return data.teamResult.map((team, index) => `Team ${index + 1}: ${team.join(', ')}`).join('\n');
      }
      return data.result.join(', ') || 'Nothing picked yet.';
    },
    draw,
    setSource(source) {
      data.source = source;
      data.result = [];
      data.revealed = [];
      data.teamResult = null;
    },
    addValue(value) {
      const trimmed = value.trim();
      if (!trimmed) return;
      ctx.undo.push('add option');
      data.values.push(trimmed);
    },
    removeValue(value) {
      ctx.undo.push('remove option');
      data.values = data.values.filter((item) => item !== value);
    },
    usePlayers() {
      const names = playerNames();
      if (!names.length) {
        ctx.toast('Add players to the session first');
        return;
      }
      ctx.undo.push('use players');
      data.values = names;
      data.source = 'list';
    },
    clearValues() {
      ctx.undo.push('clear options');
      data.values = [];
      data.drawn = [];
    },
    reset() {
      ctx.undo.push('reset pick');
      data.result = [];
      data.teamResult = null;
      data.drawn = [];
      data.history = [];
    },
    setCount(count) {
      data.count = Math.max(1, Math.min(50, Math.round(count)));
    },
    setRange(min, max) {
      data.min = Number.isFinite(min) ? min : data.min;
      data.max = Number.isFinite(max) ? max : data.max;
    },
    setView(view: PickView) {
      data.view = view;
    },
    revealAt(index) {
      if (index < 0 || index >= data.result.length) return;
      data.revealed[index] = true;
    },
    revealAll() {
      data.revealed = data.result.map(() => true);
    },
    setTeams(count) {
      data.teams = Math.max(2, Math.min(12, Math.round(count)));
    },
    setReplacement(value) {
      data.replacement = value;
      data.drawn = [];
    },
    setSeed(value) {
      data.seed = value;
    },
  };

  return instance;
}

export default { ...meta, preset, component: Pick, create };
