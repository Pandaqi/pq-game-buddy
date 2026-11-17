import type { ToolContext, ToolInstance, ToolResult } from '../../core/registry';
import type { PresetValues } from '../../core/template/schema';
import { BUZZER_KEYS, delayFor, summaryOf, type BuzzerState } from './logic';
import Buzzer from './Buzzer.svelte';
import meta from './meta';
import preset from './preset';

export interface BuzzerActions {
  arm(): void;
  buzz(playerId: string): void;
  reset(): void;
  clearHistory(): void;
}

export type BuzzerInstance = ToolInstance<BuzzerState> & BuzzerActions;

function create(ctx: ToolContext, values: PresetValues = {}): BuzzerInstance {
  const seats = Math.max(1, Math.min(8, Number(values.players ?? 4)));
  const sessionPlayers = ctx.session.players();
  const names = sessionPlayers.length
    ? sessionPlayers.map((player) => player.name).slice(0, seats)
    : Array.from({ length: seats }, (_, index) => `Player ${index + 1}`);
  const colors = sessionPlayers.length
    ? sessionPlayers.map((player) => player.color).slice(0, seats)
    : Array.from({ length: seats }, () => '#c0392b');
  const delay = Math.max(0, Number(values.delay ?? 3000));

  const data = $state<BuzzerState>({
    players: names.map((name, index) => ({
      id: `b${index + 1}`,
      name,
      color: colors[index] ?? '#c0392b',
      key: BUZZER_KEYS[index] ?? String(index + 1),
    })),
    liveAt: null,
    armed: false,
    winner: null,
    reactionMs: null,
    falseStart: null,
    rounds: [],
    delayMin: Math.round(delay / 3),
    delayMax: delay,
    allowFalseStart: values['false-start'] === undefined ? true : !!values['false-start'],
    keyPlay: values.keys === undefined ? true : !!values.keys,
    round: 0,
  });

  function nameOf(id: string | null): string {
    return data.players.find((player) => player.id === id)?.name ?? '';
  }

  const instance: BuzzerInstance = {
    data,
    state: () => JSON.parse(JSON.stringify(data)) as BuzzerState,
    load(state) {
      if (!state || typeof state !== 'object') return;
      const raw = state as Partial<BuzzerState>;
      if (Array.isArray(raw.players)) {
        data.players = raw.players
          .filter((player) => player && typeof player.name === 'string')
          .slice(0, 8)
          .map((player, index) => ({
            id: String(player.id ?? `b${index + 1}`),
            name: player.name,
            color: typeof player.color === 'string' ? player.color : '#c0392b',
            key: typeof player.key === 'string' ? player.key : BUZZER_KEYS[index] ?? String(index + 1),
          }));
      }
      if (typeof raw.delayMin === 'number') data.delayMin = Math.max(0, raw.delayMin);
      if (typeof raw.delayMax === 'number') data.delayMax = Math.max(data.delayMin, raw.delayMax);
      if (typeof raw.allowFalseStart === 'boolean') data.allowFalseStart = raw.allowFalseStart;
      if (typeof raw.keyPlay === 'boolean') data.keyPlay = raw.keyPlay;
      if (typeof raw.round === 'number') data.round = Math.max(0, raw.round);
      if (Array.isArray(raw.rounds)) {
        data.rounds = raw.rounds
          .filter((round) => round && typeof round.winner === 'string')
          .slice(0, 50)
          .map((round) => ({
            winner: round.winner,
            ms: Number(round.ms) || 0,
            falseStart: typeof round.falseStart === 'string' ? round.falseStart : null,
          }));
      }
      data.liveAt = null;
      data.armed = false;
      data.winner = null;
      data.reactionMs = null;
      data.falseStart = null;
    },
    presetFromState() {
      return {
        players: data.players.length,
        delay: data.delayMax,
        'false-start': data.allowFalseStart,
        rounds: Math.max(1, data.round || 1),
        keys: data.keyPlay,
      };
    },
    commands: {
      arm: () => instance.arm(),
      reset: () => instance.reset(),
    },
    summary: () => summaryOf(data),
    results() {
      const wins = new Map<string, number>();
      for (const round of data.rounds) wins.set(round.winner, (wins.get(round.winner) ?? 0) + 1);
      if (!wins.size) return [];
      return [...wins.entries()]
        .map(([id, count]): ToolResult => ({ name: nameOf(id) || id, score: count }))
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    },
    arm() {
      if (data.armed) return;
      data.round += 1;
      data.armed = true;
      data.winner = null;
      data.reactionMs = null;
      data.falseStart = null;
      const delayMs = delayFor(ctx.rng, data.delayMin, data.delayMax);
      data.liveAt = ctx.clock.now() + delayMs;
      ctx.haptics.buzz('short');
      ctx.audio.play('tick');
    },
    buzz(playerId) {
      if (!data.armed) return;
      const player = data.players.find((item) => item.id === playerId);
      if (!player) return;
      const now = ctx.clock.now();
      if (data.liveAt !== null && now < data.liveAt) {
        if (data.allowFalseStart && !data.falseStart) {
          data.falseStart = player.name;
          data.armed = false;
          data.liveAt = null;
          data.rounds = [{ winner: player.id, ms: 0, falseStart: player.name }, ...data.rounds].slice(0, 50);
          ctx.audio.play('buzzer');
          ctx.toast(`${player.name} jumped the start`, 'error');
        }
        return;
      }
      if (data.winner) return;
      const liveAt = data.liveAt ?? now;
      data.winner = player.id;
      data.reactionMs = Math.max(0, Math.round(now - liveAt));
      data.armed = false;
      data.rounds = [{ winner: player.id, ms: data.reactionMs, falseStart: null }, ...data.rounds].slice(0, 50);
      ctx.audio.play('success');
      ctx.haptics.buzz('long');
    },
    reset() {
      data.armed = false;
      data.liveAt = null;
      data.winner = null;
      data.reactionMs = null;
      data.falseStart = null;
    },
    clearHistory() {
      if (!data.rounds.length) return;
      ctx.undo.push('clear reactions');
      data.rounds = [];
      data.round = 0;
    },
  };

  return instance;
}

export default { ...meta, preset, component: Buzzer, create };
