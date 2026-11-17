import type { ToolContext } from '../../core/registry';
import type { PresetValues } from '../../core/template/schema';
import Coin from './Coin.svelte';
import { flipCoins, tossWinner, type CoinInstance, type CoinSide, type CoinState } from './logic';
import meta from './meta';
import preset from './preset';

function create(ctx: ToolContext, values: PresetValues = {}): CoinInstance {
  const data = $state<CoinState>({
    coins: Math.max(1, Math.min(10, Number(values.coins ?? 1))),
    fairness: Math.max(0, Math.min(100, Number(values.fairness ?? 50))),
    mode: (values.mode as CoinState['mode']) ?? 'single',
    target: Math.max(1, Math.min(20, Number(values.target ?? 3))),
    call: 'none',
    results: [],
    history: [],
    wins: 0,
    losses: 0,
    streak: 0,
    bestStreak: 0,
    series: { heads: 0, tails: 0 },
    seriesWinner: null,
  });

  function flip(): void {
    const results = flipCoins(data.coins, data.fairness, ctx.rng);
    data.results = results;
    const heads = results.filter(Boolean).length;
    const tails = results.length - heads;

    let won: boolean | null = null;
    if (data.call !== 'none' && heads !== tails) {
      won = (heads > tails ? 'heads' : 'tails') === data.call;
      if (won) {
        data.wins += 1;
        data.streak += 1;
        data.bestStreak = Math.max(data.bestStreak, data.streak);
      } else {
        data.losses += 1;
        data.streak = 0;
      }
    }

    if (data.mode === 'best' && !data.seriesWinner) {
      const winner = tossWinner(results);
      if (winner === 'heads') data.series.heads += 1;
      else if (winner === 'tails') data.series.tails += 1;
      if (data.series.heads >= data.target) {
        data.seriesWinner = 'heads';
        ctx.audio.play('success');
        ctx.toast(`Heads takes the series ${data.series.heads}–${data.series.tails}`);
      } else if (data.series.tails >= data.target) {
        data.seriesWinner = 'tails';
        ctx.audio.play('success');
        ctx.toast(`Tails takes the series ${data.series.tails}–${data.series.heads}`);
      }
    }

    data.history = [{ at: Date.now(), heads, tails, call: data.call, won }, ...data.history].slice(0, 20);
    ctx.audio.play('click');
    ctx.haptics.buzz('short');
  }

  const instance: CoinInstance = {
    data,
    state: () => JSON.parse(JSON.stringify(data)) as CoinState,
    load(state) {
      if (!state || typeof state !== 'object') return;
      const raw = state as Partial<CoinState>;
      if (typeof raw.coins === 'number') data.coins = Math.max(1, Math.min(10, raw.coins));
      if (typeof raw.fairness === 'number') data.fairness = Math.max(0, Math.min(100, raw.fairness));
      if (raw.mode === 'best' || raw.mode === 'single') data.mode = raw.mode;
      if (typeof raw.target === 'number') data.target = Math.max(1, Math.min(20, raw.target));
      if (raw.call === 'heads' || raw.call === 'tails' || raw.call === 'none') data.call = raw.call;
      if (typeof raw.wins === 'number') data.wins = raw.wins;
      if (typeof raw.losses === 'number') data.losses = raw.losses;
      if (typeof raw.streak === 'number') data.streak = raw.streak;
      if (typeof raw.bestStreak === 'number') data.bestStreak = raw.bestStreak;
      if (raw.series && typeof raw.series === 'object') {
        data.series = {
          heads: Math.max(0, Number(raw.series.heads) || 0),
          tails: Math.max(0, Number(raw.series.tails) || 0),
        };
      }
      data.seriesWinner = raw.seriesWinner === 'heads' || raw.seriesWinner === 'tails' ? raw.seriesWinner : null;
      if (Array.isArray(raw.history)) data.history = raw.history.slice(0, 20);
      data.results = [];
    },
    presetFromState() {
      return { coins: data.coins, fairness: data.fairness, mode: data.mode, target: data.target };
    },
    commands: { flip: () => flip() },
    summary() {
      if (!data.results.length) return 'No flips yet.';
      const heads = data.results.filter(Boolean).length;
      const series =
        data.mode === 'best'
          ? ` Series (best of ${data.target}): heads ${data.series.heads}, tails ${data.series.tails}${
              data.seriesWinner ? ` — ${data.seriesWinner} won` : ''
            }.`
          : '';
      return `Heads ${heads}, tails ${data.results.length - heads}. Call-it: ${data.wins} won, ${data.losses} lost.${series}`;
    },
    flip,
    setCoins(count) {
      data.coins = Math.max(1, Math.min(10, Math.round(count)));
    },
    setFairness(percent) {
      data.fairness = Math.max(0, Math.min(100, Math.round(percent)));
    },
    setCall(side) {
      data.call = side;
    },
    setMode(mode) {
      data.mode = mode;
      data.series = { heads: 0, tails: 0 };
      data.seriesWinner = null;
    },
    setTarget(value) {
      data.target = Math.max(1, Math.min(20, Math.round(value)));
      data.series = { heads: 0, tails: 0 };
      data.seriesWinner = null;
    },
    reset() {
      ctx.undo.push('reset coin');
      data.results = [];
      data.wins = 0;
      data.losses = 0;
      data.streak = 0;
      data.bestStreak = 0;
      data.history = [];
      data.series = { heads: 0, tails: 0 };
      data.seriesWinner = null;
    },
  };

  return instance;
}

export default { ...meta, preset, component: Coin, create };
