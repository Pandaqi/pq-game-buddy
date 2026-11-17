/** Draft order, picks, the per-pick clock and a simple auction. No Svelte here. */

export interface Pick {
  round: number;
  picker: string;
  item: string;
  at: number;
}

export interface Sale {
  item: string;
  price: number;
  buyer: string;
}

export interface DraftState {
  order: string[];
  snake: boolean;
  pool: string[];
  picks: Pick[];
  seconds: number;
  deadline: number | null;
  auction: boolean;
  budget: number;
  budgets: Record<string, number>;
  nomination: string;
  bid: number;
  bidder: string;
  sales: Sale[];
  log: string[];
}

export function turnAt(order: string[], snake: boolean, index: number): { picker: string; round: number; overall: number } {
  if (!order.length) return { picker: '', round: 1, overall: 1 };
  const size = order.length;
  const round = Math.floor(index / size) + 1;
  const position = index % size;
  const picker = snake && round % 2 === 0 ? order[size - 1 - position] : order[position];
  return { picker, round, overall: index + 1 };
}

/** The order for the first `count` picks, used by the "who is next" list. */
export function orderPreview(order: string[], snake: boolean, count: number): { pick: number; picker: string; round: number }[] {
  return Array.from({ length: count }, (_, index) => {
    const turn = turnAt(order, snake, index);
    return { pick: turn.overall, picker: turn.picker, round: turn.round };
  });
}

export function maxBid(budget: number, openSlots: number, minimum = 1): number {
  if (openSlots <= 0) return budget;
  return Math.max(0, budget - (openSlots - 1) * minimum);
}

export function summaryOf(state: DraftState): string {
  const lines: string[] = [];
  const turn = turnAt(state.order, state.snake, state.picks.length);
  if (turn.picker) lines.push(`Next pick: ${turn.picker} (round ${turn.round})`);
  if (state.picks.length) {
    lines.push('Picks:');
    for (const pick of state.picks) lines.push(`- ${pick.picker}: ${pick.item}`);
  }
  if (state.sales.length) {
    lines.push('Sold:');
    for (const sale of state.sales) lines.push(`- ${sale.item} to ${sale.buyer} for ${sale.price}`);
  }
  return lines.length ? lines.join('\n') : 'Nothing drafted yet.';
}
