import { registerToolStrings, t as translate } from '../../core/i18n.svelte';
import type { ToolContext } from '../../core/registry';
import type { PresetValues } from '../../core/template/schema';
import { toolSeats } from '../../core/session';
import {
  drawFromPool,
  drawNumbers,
  itemKey,
  itemLabel,
  seatOrder,
  splitTeams,
  toItem,
  type PickInstance,
  type PickItem,
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
    values: Array.isArray(values.values)
      ? (values.values as unknown[]).map(toItem).filter((item): item is PickItem => item !== null)
      : [],
    drawn: [],
    result: [],
    teamResult: null,
    history: [],
    view: (values.view as PickState['view']) ?? 'list',
    revealed: [],
    seed: String(values.seed ?? ''),
  });

  /** The session's seats, so a generated seat is never stored as its wording. */
  function playerItems(): PickItem[] {
    return toolSeats(ctx.session.players(), 2);
  }

  function remember(items: PickItem[]): void {
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
          ctx.toast(translate('pick.toast-no-options'));
          return;
        }
        const taken = data.drawn.map(itemKey);
        const pool = data.replacement
          ? data.values
          : data.values.filter((value) => !taken.includes(itemKey(value)));
        if (!pool.length) {
          data.drawn = [];
          ctx.toast(translate('pick.toast-exhausted'));
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
        const players = playerItems();
        if (!players.length) {
          ctx.toast(translate('pick.toast-no-players'));
          return;
        }
        if (data.source === 'seats') {
          const order = seatOrder(players, ctx.rng);
          data.teamResult = null;
          remember(order);
        } else {
          data.teamResult = null;
          remember(drawFromPool(players, Math.min(data.count, players.length), ctx.rng));
        }
        break;
      }
      case 'teams': {
        const players = playerItems();
        if (players.length < 2) {
          ctx.toast(translate('pick.toast-teams-two'));
          return;
        }
        if (data.teams > players.length) {
          ctx.toast(translate('pick.toast-teams-many'));
        }
        data.teamResult = splitTeams(players, data.teams, ctx.rng);
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
      if (Array.isArray(raw.values))
        data.values = raw.values.map(toItem).filter((item): item is PickItem => item !== null);
      if (Array.isArray(raw.history)) {
        // Older saves hold plain text entries; pairs keep their seat.
        data.history = raw.history
          .filter((record) => record && Array.isArray(record.items))
          .map((record) => ({
            at: Number(record.at) || 0,
            items: record.items.map(toItem).filter((item): item is PickItem => item !== null),
          }))
          .slice(0, 20);
      }
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
        // Only typed text travels; a generated seat stays blank.
        values: data.values.map((item) => (typeof item === 'string' ? item : item.name)),
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
        return data.teamResult
          .map((team, index) =>
            translate('pick.summary-team', {
              team: translate('pick.team-number', { count: index + 1 }),
              names: team.map(itemLabel).join(', '),
            }),
          )
          .join('\n');
      }
      return data.result.map(itemLabel).join(', ') || translate('pick.summary-none');
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
      ctx.undo.push(translate('pick.undo-add'));
      data.values.push(trimmed);
    },
    removeValue(target) {
      ctx.undo.push(translate('pick.undo-remove'));
      data.values = data.values.filter((item) => itemKey(item) !== itemKey(target));
    },
    usePlayers() {
      const players = playerItems();
      if (!players.length) {
        ctx.toast(translate('pick.toast-no-players'));
        return;
      }
      ctx.undo.push(translate('pick.undo-use-players'));
      data.values = players;
      data.source = 'list';
    },
    clearValues() {
      ctx.undo.push(translate('pick.undo-remove'));
      data.values = [];
      data.drawn = [];
    },
    reset() {
      ctx.undo.push(translate('pick.undo-reset'));
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
