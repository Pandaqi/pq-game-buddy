import type { ToolContext, ToolInstance, ToolResult } from '../../core/registry';
import type { PresetValues } from '../../core/template/schema';
import { registerToolStrings, seatName, t as translate } from '../../core/i18n.svelte';
import { seatKey, seatPair, seatValues, toolSeats } from '../../core/session';
import { maxBid, nameOfKey, summaryOf, turnAt, type DraftState } from './logic';
import Draft from './Draft.svelte';
import en from './locales/en';

// A tool's words travel with its chunk; the shell only knows its title.
registerToolStrings('draft', en);
import meta from './meta';
import preset from './preset';

export interface DraftActions {
  pick(item?: string): void;
  setOrder(text: string): void;
  setSnake(value: boolean): void;
  randomizeOrder(): void;
  setPool(text: string): void;
  addPoolItem(item: string): void;
  removePick(index: number): void;
  setSeconds(ms: number): void;
  startTimer(): void;
  stopTimer(): void;
  nominate(item: string): void;
  raise(amount: number): void;
  setBidder(name: string): void;
  sell(): void;
  cancelNomination(): void;
  reset(): void;
}

export type DraftInstance = ToolInstance<DraftState> & DraftActions;

function create(ctx: ToolContext, values: PresetValues = {}): DraftInstance {
  const templateOrder = Array.isArray(values.order) ? (values.order as string[]).filter(Boolean) : [];
  // The order keeps seat pairs, so a generated seat is said in the active
  // language; a template's blank entry becomes the same seat again.
  const order = templateOrder.length
    ? templateOrder.map((name, index) => seatPair(name, index))
    : toolSeats(ctx.session.players(), 2);
  const budget = Math.max(1, Number(values.budget ?? 100));

  const data = $state<DraftState>({
    order,
    snake: !!values.snake,
    pool: Array.isArray(values.pool) ? (values.pool as string[]).map(String) : [],
    picks: [],
    seconds: Math.max(0, Number(values.seconds ?? 60000)),
    deadline: null,
    auction: !!values.auction,
    budget,
    budgets: Object.fromEntries(order.map((seat) => [seatKey(seat), budget])),
    nomination: '',
    bid: 0,
    bidder: '',
    sales: [],
    log: [],
  });

  function note(text: string): void {
    data.log = [text, ...data.log].slice(0, 12);
  }

  function turn() {
    return turnAt(data.order, data.snake, data.picks.length);
  }

  const instance: DraftInstance = {
    data,
    state: () => JSON.parse(JSON.stringify(data)) as DraftState,
    load(state) {
      if (!state || typeof state !== 'object') return;
      const raw = state as Partial<DraftState>;
      if (Array.isArray(raw.order)) {
        // Older saves hold plain names; a pair keeps its seat.
        const list = seatValues(raw.order)
          .map((value, index) => seatPair(value, index))
          .filter((seat) => seat.seat || seat.name);
        if (list.length) data.order = list;
      }
      if (typeof raw.snake === 'boolean') data.snake = raw.snake;
      if (Array.isArray(raw.pool)) data.pool = raw.pool.map(String);
      if (Array.isArray(raw.picks)) {
        data.picks = raw.picks
          .filter((pick) => pick && typeof pick.item === 'string')
          .map((pick, index) => ({
            round: Number(pick.round) || 1,
            picker: String(pick.picker ?? ''),
            item: pick.item,
            at: Number(pick.at) || index,
          }));
      }
      if (typeof raw.seconds === 'number') data.seconds = Math.max(0, raw.seconds);
      data.deadline = null;
      if (typeof raw.auction === 'boolean') data.auction = raw.auction;
      if (typeof raw.budget === 'number') data.budget = Math.max(1, raw.budget);
      if (raw.budgets && typeof raw.budgets === 'object') {
        data.budgets = Object.fromEntries(
          Object.entries(raw.budgets as Record<string, unknown>).map(([name, value]) => [name, Number(value) || 0]),
        );
      }
      if (typeof raw.nomination === 'string') data.nomination = raw.nomination;
      if (typeof raw.bid === 'number') data.bid = Math.max(0, raw.bid);
      if (typeof raw.bidder === 'string') data.bidder = raw.bidder;
      if (Array.isArray(raw.sales)) {
        data.sales = raw.sales
          .filter((sale) => sale && typeof sale.item === 'string')
          .map((sale) => ({ item: sale.item, price: Number(sale.price) || 0, buyer: String(sale.buyer ?? '') }));
      }
      if (Array.isArray(raw.log)) data.log = raw.log.map(String).slice(0, 12);
    },
    presetFromState() {
      return {
        // Only a typed name travels; a generated seat stays blank.
        order: data.order.map((seat) => seat.name),
        snake: data.snake,
        pool: data.pool,
        seconds: data.seconds,
        auction: data.auction,
        budget: data.budget,
      };
    },
    commands: {
      pick: (arg) => instance.pick(arg || undefined),
      next: () => instance.pick(undefined),
      sell: () => instance.sell(),
      timer: () => instance.startTimer(),
    },
    summary: () => summaryOf(data),
    results() {
      if (!data.auction) {
        const counts = new Map<string, number>();
        for (const pick of data.picks) counts.set(pick.picker, (counts.get(pick.picker) ?? 0) + 1);
        if (!counts.size) return [];
        return [...counts.entries()]
          .map(([key, count]): ToolResult => ({ name: nameOfKey(data, key), score: count }))
          .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      }
      return Object.entries(data.budgets)
        .map(([key, left]): ToolResult => ({ name: nameOfKey(data, key), score: left }))
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    },
    pick(item) {
      const chosen = (item ?? data.pool[0] ?? '').trim();
      if (!chosen) {
        ctx.toast(translate('draft.toast-pool-empty'), 'error');
        return;
      }
      const current = turn();
      if (!current.picker) return;
      if (!data.pool.includes(chosen)) {
        ctx.toast(translate('draft.toast-not-in-pool', { item: chosen }), 'error');
        return;
      }
      ctx.undo.push(translate('draft.undo-pick-item'));
      data.pool = data.pool.filter((entry) => entry !== chosen);
      data.picks = [
        ...data.picks,
        { round: current.round, picker: seatKey(current.picker), item: chosen, at: Date.now() },
      ];
      data.deadline = null;
      ctx.audio.play('click');
      ctx.haptics.buzz('short');
      note(
        translate('draft.note-picked', {
          picker: seatName(current.picker.seat, current.picker.name),
          item: chosen,
        }),
      );
    },
    setOrder(text) {
      // The order editor is text, filled with each seat's label: a line left as it
      // was saves the same seat, so a generated seat stays generated.
      const lines = text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      if (!lines.length) {
        ctx.toast(translate('draft.toast-order-empty'), 'error');
        return;
      }
      ctx.undo.batch(translate('draft.undo-order-batch'), () => {
        const list = lines.map((line, index) => {
          const previous = data.order[index];
          return previous && seatName(previous.seat, previous.name) === line
            ? previous
            : seatPair(line, index);
        });
        data.order = list;
        data.picks = [];
        data.budgets = Object.fromEntries(list.map((seat) => [seatKey(seat), data.budget]));
        data.deadline = null;
      });
    },
    setSnake(value) {
      if (value === data.snake) return;
      ctx.undo.push(translate('draft.undo-snake'));
      data.snake = value;
      data.picks = [];
    },
    randomizeOrder() {
      if (!data.order.length) return;
      ctx.undo.push(translate('draft.undo-random'));
      data.order = ctx.rng.shuffle(data.order);
      data.picks = [];
      note(
        translate('draft.note-order', {
          names: data.order.map((seat) => seatName(seat.seat, seat.name)).join(' → '),
        }),
      );
    },
    setPool(text) {
      const list = text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      ctx.undo.push(translate('draft.undo-pool-batch'));
      data.pool = list;
    },
    addPoolItem(item) {
      const trimmed = item.trim();
      if (!trimmed) return;
      ctx.undo.push(translate('draft.undo-add-pool'));
      data.pool = [...data.pool, trimmed];
    },
    removePick(index) {
      const pick = data.picks[index];
      if (!pick) return;
      ctx.undo.push(translate('draft.undo-undo-pick'));
      data.picks = data.picks.filter((_, at) => at !== index);
      data.pool = [...data.pool, pick.item];
      note(translate('draft.note-returned', { item: pick.item }));
    },
    setSeconds(ms) {
      data.seconds = Math.max(0, Math.round(ms));
      data.deadline = null;
    },
    startTimer() {
      if (data.seconds <= 0) return;
      data.deadline = ctx.clock.wall() + data.seconds;
      ctx.audio.play('click');
      note(translate('draft.note-clock'));
    },
    stopTimer() {
      data.deadline = null;
    },
    nominate(item) {
      const chosen = item.trim();
      if (!chosen) return;
      if (!data.budgets[data.bidder]) data.bid = 0;
      ctx.undo.push(translate('draft.undo-nominate'));
      data.nomination = chosen;
      data.bid = 0;
      data.bidder = '';
      note(translate('draft.note-nominated', { item: chosen }));
    },
    raise(amount) {
      if (!data.nomination) {
        ctx.toast(translate('draft.toast-nominate'), 'error');
        return;
      }
      const step = Math.max(1, Math.round(amount));
      const bidder = data.bidder || (data.order[0] ? seatKey(data.order[0]) : '');
      const wallet = data.budgets[bidder] ?? 0;
      const next = data.bid + step;
      if (next > wallet) {
        ctx.toast(
          translate('draft.toast-cannot-afford', {
            name: bidder ? nameOfKey(data, bidder) : translate('draft.nobody'),
            amount: next,
          }),
          'error',
        );
        return;
      }
      ctx.undo.push(translate('draft.bid'), 'bid');
      data.bid = next;
      data.bidder = bidder;
      ctx.haptics.buzz('short');
    },
    setBidder(name) {
      data.bidder = name;
    },
    sell() {
      if (!data.nomination) return;
      const buyer = data.bidder;
      if (!buyer) {
        ctx.toast(translate('draft.toast-pick-bidder'), 'error');
        return;
      }
      const price = data.bid;
      const wallet = data.budgets[buyer] ?? 0;
      if (price > wallet) {
        ctx.toast(translate('draft.toast-cannot-afford', { name: nameOfKey(data, buyer), amount: price }), 'error');
        return;
      }
      ctx.undo.push(translate('draft.undo-sell'));
      data.budgets = { ...data.budgets, [buyer]: wallet - price };
      data.sales = [...data.sales, { item: data.nomination, price, buyer }];
      data.pool = data.pool.filter((entry) => entry !== data.nomination);
      note(
        translate('draft.note-sold', { item: data.nomination, buyer: nameOfKey(data, buyer), price }),
      );
      data.nomination = '';
      data.bid = 0;
      data.bidder = '';
      ctx.audio.play('success');
    },
    cancelNomination() {
      if (!data.nomination) return;
      data.nomination = '';
      data.bid = 0;
      data.bidder = '';
    },
    reset() {
      ctx.undo.push(translate('draft.undo-reset'));
      data.pool = [...data.pool, ...data.picks.map((pick) => pick.item), ...data.sales.map((sale) => sale.item)];
      data.picks = [];
      data.sales = [];
      data.budgets = Object.fromEntries(data.order.map((seat) => [seatKey(seat), data.budget]));
      data.deadline = null;
      data.nomination = '';
      data.bid = 0;
      data.bidder = '';
      data.log = [];
    },
  };

  void maxBid;
  return instance;
}

export default { ...meta, preset, component: Draft, create };
