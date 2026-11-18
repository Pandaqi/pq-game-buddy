/** Draft order, picks, the per-pick clock and a simple auction. No Svelte here. */

import { language, seatNameIn, translate } from '../../core/i18n';
import { seatKey, type SeatPair } from '../../core/session';

export interface Pick {
  round: number;
  /** The seat's stable key, not the words on screen; see `seatKey()`. */
  picker: string;
  item: string;
  at: number;
}

export interface Sale {
  item: string;
  price: number;
  /** The buyer's seat key. */
  buyer: string;
}

export interface DraftState {
  /** Seats in draft order; `seat` marks one the app named, stored blank. */
  order: SeatPair[];
  snake: boolean;
  pool: string[];
  picks: Pick[];
  seconds: number;
  deadline: number | null;
  auction: boolean;
  budget: number;
  /** Remaining budget per seat key. */
  budgets: Record<string, number>;
  nomination: string;
  bid: number;
  /** The bidding seat's key. */
  bidder: string;
  sales: Sale[];
  log: string[];
}

export function turnAt(
  order: SeatPair[],
  snake: boolean,
  index: number,
): { picker: SeatPair | null; round: number; overall: number } {
  if (!order.length) return { picker: null, round: 1, overall: 1 };
  const size = order.length;
  const round = Math.floor(index / size) + 1;
  const position = index % size;
  const picker = snake && round % 2 === 0 ? order[size - 1 - position] : order[position];
  return { picker: picker ?? null, round, overall: index + 1 };
}

/** The order for the first `count` picks, used by the "who is next" list. */
export function orderPreview(
  order: SeatPair[],
  snake: boolean,
  count: number,
): { pick: number; picker: SeatPair | null; round: number }[] {
  return Array.from({ length: count }, (_, index) => {
    const turn = turnAt(order, snake, index);
    return { pick: turn.overall, picker: turn.picker, round: turn.round };
  });
}

export function maxBid(budget: number, openSlots: number, minimum = 1): number {
  if (openSlots <= 0) return budget;
  return Math.max(0, budget - (openSlots - 1) * minimum);
}

/** A seat's name in the active language, for one of the stored keys. */
export function nameOfKey(state: DraftState, key: string): string {
  const seat = state.order.find((item) => seatKey(item) === key);
  return seat ? seatNameIn(language(), seat.seat, seat.name) : key;
}

export function summaryOf(state: DraftState): string {
  const lines: string[] = [];
  const turn = turnAt(state.order, state.snake, state.picks.length);
  if (turn.picker)
    lines.push(
      translate('draft.summary-next', {
        name: nameOfKey(state, seatKey(turn.picker)),
        round: turn.round,
      }),
    );
  if (state.picks.length) {
    lines.push(translate('draft.summary-picks'));
    for (const pick of state.picks)
      lines.push(translate('draft.summary-pick', { name: nameOfKey(state, pick.picker), item: pick.item }));
  }
  if (state.sales.length) {
    lines.push(translate('draft.summary-sold'));
    for (const sale of state.sales)
      lines.push(
        translate('draft.summary-sale', {
          item: sale.item,
          buyer: nameOfKey(state, sale.buyer),
          price: sale.price,
        }),
      );
  }
  return lines.length ? lines.join('\n') : translate('draft.summary-none');
}
