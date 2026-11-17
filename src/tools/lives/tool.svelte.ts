import type { ToolContext } from '../../core/registry';
import { PLAYER_COLORS } from '../../core/session';
import type { PresetValues } from '../../core/template/schema';
import { clampLives, isGameOver, isOut, resultsFor, type LivesInstance, type LivesState } from './logic';
import Lives from './Lives.svelte';
import meta from './meta';
import preset from './preset';

function create(ctx: ToolContext, values: PresetValues = {}): LivesInstance {
  const start = Math.max(0, Number(values.lives ?? 3));
  const max = Math.max(1, Number(values.max ?? 10));
  const step = Math.max(1, Number(values.step ?? 1));
  const mode = (values.mode as LivesState['mode']) ?? 'shared';
  const elimination = values.elimination !== false;

  const sessionPlayers = ctx.session.players();
  const players = (sessionPlayers.length
    ? sessionPlayers
    : [
        { id: 'p1', name: 'Player 1' },
        { id: 'p2', name: 'Player 2' },
      ]
  ).map((player, index) => ({
    id: player.id,
    name: player.name,
    lives: Math.min(start, max),
    max,
    color: (player as { color?: string }).color || PLAYER_COLORS[index % PLAYER_COLORS.length],
  }));

  const extras = Object.entries((values.extras as Record<string, unknown>) ?? {}).map(([name, value]) => ({
    name,
    value: Number(value) || 0,
    step: 1,
  }));

  const conditions = (Array.isArray(values.conditions) ? (values.conditions as string[]) : []).map((name) => ({
    name,
    active: false,
  }));

  const hidden = !!values.hidden;

  const data = $state<LivesState>({
    mode,
    lives: Math.min(start, max),
    max,
    step,
    elimination,
    players,
    extras,
    conditions,
    hidden,
    revealed: !hidden,
  });

  function adjust(id: string, delta: number): void {
    if (!Number.isFinite(delta) || delta === 0) return;
    if (data.mode === 'shared' || id === 'shared') {
      const next = clampLives(data.lives + delta, data.max);
      if (next === data.lives) return;
      ctx.undo.push('change lives', 'lives-shared');
      data.lives = next;
      ctx.haptics.buzz('short');
      if (isGameOver(data)) ctx.audio.play('buzzer');
      return;
    }
    const track = data.players.find((player) => player.id === id);
    if (!track) return;
    const before = track.lives;
    const next = clampLives(before + delta, track.max);
    if (next === before) return;
    ctx.undo.push('change lives', `lives-${id}`);
    track.lives = next;
    ctx.haptics.buzz('short');
    if (elimination && before > 0 && isOut(data, track)) {
      ctx.audio.play('buzzer');
      ctx.toast(`${track.name} is out`);
    } else if (elimination && track.lives > 0) {
      ctx.audio.play('click');
    }
    if (isGameOver(data)) ctx.audio.play('success');
  }

  const instance: LivesInstance = {
    data,
    state: () => JSON.parse(JSON.stringify(data)) as LivesState,
    load(state) {
      if (!state || typeof state !== 'object') return;
      const raw = state as Partial<LivesState>;
      if (raw.mode === 'shared' || raw.mode === 'players') data.mode = raw.mode;
      if (typeof raw.lives === 'number') data.lives = Math.max(0, raw.lives);
      if (typeof raw.max === 'number') data.max = Math.max(1, raw.max);
      if (typeof raw.step === 'number') data.step = Math.max(1, raw.step);
      if (typeof raw.elimination === 'boolean') data.elimination = raw.elimination;
      if (Array.isArray(raw.players) && raw.players.length) {
        data.players = raw.players
          .filter((player) => player && typeof player.id === 'string')
          .map((player, index) => ({
            id: player.id,
            name: typeof player.name === 'string' ? player.name : `Player ${index + 1}`,
            lives: Math.max(0, Number(player.lives) || 0),
            max: Math.max(1, Number(player.max) || data.max),
            color: typeof player.color === 'string' ? player.color : PLAYER_COLORS[index % PLAYER_COLORS.length],
          }));
      }
      if (Array.isArray(raw.extras)) {
        data.extras = raw.extras
          .filter((extra) => extra && typeof extra.name === 'string')
          .map((extra) => ({
            name: extra.name,
            value: Number(extra.value) || 0,
            step: Math.max(1, Number(extra.step) || 1),
          }));
      }
      if (Array.isArray(raw.conditions)) {
        data.conditions = raw.conditions
          .filter((condition) => condition && typeof condition.name === 'string')
          .map((condition) => ({ name: condition.name, active: !!condition.active }));
      }
      if (typeof raw.hidden === 'boolean') data.hidden = raw.hidden;
      data.revealed = raw.revealed === true ? true : !data.hidden;
    },
    presetFromState() {
      const extrasOut: Record<string, number> = {};
      for (const extra of data.extras) extrasOut[extra.name] = extra.value;
      return {
        lives: data.lives,
        max: data.max,
        step: data.step,
        mode: data.mode,
        elimination: data.elimination,
        extras: extrasOut,
        conditions: data.conditions.map((condition) => condition.name),
        hidden: data.hidden,
      };
    },
    commands: {
      lose: (arg) => instance.adjust(arg || 'shared', -data.step),
      gain: (arg) => instance.adjust(arg || 'shared', data.step),
      reveal: () => instance.reveal(),
    },
    summary() {
      const lines: string[] = [];
      if (data.mode === 'shared') lines.push(`Lives: ${data.lives}/${data.max}`);
      else {
        for (const player of data.players) {
          lines.push(`${player.name}: ${player.lives}/${player.max}${isOut(data, player) ? ' (out)' : ''}`);
        }
      }
      for (const extra of data.extras) lines.push(`${extra.name}: ${extra.value}`);
      const active = data.conditions.filter((condition) => condition.active).map((condition) => condition.name);
      if (active.length) lines.push(`Conditions: ${active.join(', ')}`);
      if (isGameOver(data)) lines.push('Game over');
      return lines.join('\n');
    },
    results: () => resultsFor(data),
    adjust,
    setLives(id, value) {
      if (data.mode === 'shared' || id === 'shared') {
        const next = clampLives(value, data.max);
        if (next === data.lives) return;
        ctx.undo.push('set lives');
        data.lives = next;
        return;
      }
      const track = data.players.find((player) => player.id === id);
      if (!track) return;
      const next = clampLives(value, track.max);
      if (next === track.lives) return;
      ctx.undo.push('set lives');
      track.lives = next;
    },
    setMode(mode) {
      if (data.mode === mode) return;
      ctx.undo.push('lives mode');
      data.mode = mode;
    },
    addPlayer(name) {
      const trimmed = name.trim();
      if (!trimmed) return;
      ctx.undo.push('add player');
      data.players.push({
        id: `x${Date.now().toString(36)}`,
        name: trimmed,
        lives: Math.min(Math.max(1, data.lives || 3), data.max),
        max: data.max,
        color: PLAYER_COLORS[data.players.length % PLAYER_COLORS.length],
      });
    },
    removePlayer(id) {
      if (data.players.length <= 1) return;
      ctx.undo.push('remove player');
      data.players = data.players.filter((player) => player.id !== id);
    },
    syncPlayers() {
      const source = ctx.session.players();
      if (!source.length) return;
      if (
        source.length === data.players.length &&
        source.every(
          (player, index) =>
            player.id === data.players[index]?.id && player.name === data.players[index]?.name,
        )
      ) {
        return;
      }
      ctx.undo.push('use session players');
      data.players = source.map((player, index) => {
        const existing = data.players.find((track) => track.id === player.id);
        return {
          id: player.id,
          name: player.name,
          lives: existing ? existing.lives : Math.min(start, max),
          max: existing ? existing.max : max,
          color: (player as { color?: string }).color || PLAYER_COLORS[index % PLAYER_COLORS.length],
        };
      });
    },
    adjustExtra(name, delta) {
      const extra = data.extras.find((item) => item.name === name);
      if (!extra) return;
      ctx.undo.push('change track', `extra-${name}`);
      extra.value = Math.max(0, extra.value + delta);
    },
    toggleCondition(name) {
      const condition = data.conditions.find((item) => item.name === name);
      if (!condition) return;
      ctx.undo.push('toggle condition');
      condition.active = !condition.active;
      ctx.haptics.buzz('short');
    },
    resetAll() {
      ctx.undo.push('reset lives');
      data.lives = Math.min(start, data.max);
      for (const player of data.players) player.lives = Math.min(start, player.max);
      for (const extra of data.extras) extra.value = 0;
      for (const condition of data.conditions) condition.active = false;
      data.revealed = !data.hidden;
    },
    setHidden(value) {
      ctx.undo.push('hidden lives');
      data.hidden = value;
      data.revealed = !value;
    },
    reveal() {
      data.revealed = true;
      ctx.audio.play('success');
    },
  };

  return instance;
}

export default { ...meta, preset, component: Lives, create };
