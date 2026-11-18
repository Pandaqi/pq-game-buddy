import { language, registerToolStrings, seatName, t as translate } from '../../core/i18n.svelte';
import type { ToolContext } from '../../core/registry';
import { PLAYER_COLORS, toolSeats } from '../../core/session';
import type { PresetValues } from '../../core/template/schema';
import { clampLives, isGameOver, isOut, resultsFor, type LivesInstance, type LivesState } from './logic';
import Lives from './Lives.svelte';
import meta from './meta';
import preset from './preset';
import en from './locales/en';

// A tool's words travel with its chunk; the shell only knows its title.
registerToolStrings('lives', en);

function create(ctx: ToolContext, values: PresetValues = {}): LivesInstance {
  const start = Math.max(0, Number(values.lives ?? 3));
  const max = Math.max(1, Number(values.max ?? 10));
  const step = Math.max(1, Number(values.step ?? 1));
  const mode = (values.mode as LivesState['mode']) ?? 'shared';
  const elimination = values.elimination !== false;

  const sessionPlayers = ctx.session.players();
  // Tracks keep the session's pair, so a seat the app named is said in the
  // active language instead of the words it happened to start with.
  const players = toolSeats(sessionPlayers, 2).map((slot, index) => ({
    id: sessionPlayers[index]?.id ?? `p${index + 1}`,
    name: slot.name,
    ...(slot.seat ? { seat: slot.seat } : {}),
    lives: Math.min(start, max),
    max,
    color: sessionPlayers[index]?.color || PLAYER_COLORS[index % PLAYER_COLORS.length],
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
      ctx.undo.push(translate('lives.undo-lives'), 'lives-shared');
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
    ctx.undo.push(translate('lives.undo-lives'), `lives-${id}`);
    track.lives = next;
    ctx.haptics.buzz('short');
    if (elimination && before > 0 && isOut(data, track)) {
      ctx.audio.play('buzzer');
      ctx.toast(translate('lives.toast-out', { name: seatName(track.seat, track.name) }));
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
          .map((player, index) => {
            const seat = Number(player.seat);
            return {
              id: player.id,
              name: typeof player.name === 'string' ? player.name : '',
              ...(Number.isInteger(seat) && seat > 0 ? { seat } : {}),
              lives: Math.max(0, Number(player.lives) || 0),
              max: Math.max(1, Number(player.max) || data.max),
              color: typeof player.color === 'string' ? player.color : PLAYER_COLORS[index % PLAYER_COLORS.length],
            };
          });
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
      if (data.mode === 'shared') {
        lines.push(translate('lives.summary-shared', { lives: data.lives, max: data.max }));
      } else {
        for (const player of data.players) {
          lines.push(
            translate(isOut(data, player) ? 'lives.summary-out' : 'lives.summary-track', {
              name: seatName(player.seat, player.name),
              lives: player.lives,
              max: player.max,
            }),
          );
        }
      }
      for (const extra of data.extras) {
        lines.push(translate('lives.summary-track-value', { name: extra.name, value: extra.value }));
      }
      const active = data.conditions.filter((condition) => condition.active).map((condition) => condition.name);
      if (active.length) lines.push(translate('lives.summary-conditions', { names: active.join(', ') }));
      if (isGameOver(data)) lines.push(translate('lives.summary-over'));
      return lines.join('\n');
    },
    results: () => resultsFor(data, language()),
    adjust,
    setLives(id, value) {
      if (data.mode === 'shared' || id === 'shared') {
        const next = clampLives(value, data.max);
        if (next === data.lives) return;
        ctx.undo.push(translate('lives.undo-set'));
        data.lives = next;
        return;
      }
      const track = data.players.find((player) => player.id === id);
      if (!track) return;
      const next = clampLives(value, track.max);
      if (next === track.lives) return;
      ctx.undo.push(translate('lives.undo-set'));
      track.lives = next;
    },
    setMode(mode) {
      if (data.mode === mode) return;
      ctx.undo.push(translate('lives.undo-mode'));
      data.mode = mode;
    },
    addPlayer(name) {
      const trimmed = name.trim();
      if (!trimmed) return;
      ctx.undo.push(translate('lives.undo-add'));
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
      ctx.undo.push(translate('lives.undo-remove'));
      data.players = data.players.filter((player) => player.id !== id);
    },
    syncPlayers() {
      const source = ctx.session.players();
      if (!source.length) return;
      const slots = toolSeats(source, 2);
      if (
        source.length === data.players.length &&
        source.every((player, index) => {
          const track = data.players[index];
          return player.id === track?.id && track.seat === slots[index].seat && track.name === slots[index].name;
        })
      ) {
        return;
      }
      ctx.undo.push(translate('lives.undo-sync'));
      data.players = source.map((player, index) => {
        const existing = data.players.find((track) => track.id === player.id);
        const slot = slots[index];
        return {
          id: player.id,
          name: slot.name,
          ...(slot.seat ? { seat: slot.seat } : {}),
          lives: existing ? existing.lives : Math.min(start, max),
          max: existing ? existing.max : max,
          color: (player as { color?: string }).color || PLAYER_COLORS[index % PLAYER_COLORS.length],
        };
      });
    },
    adjustExtra(name, delta) {
      const extra = data.extras.find((item) => item.name === name);
      if (!extra) return;
      ctx.undo.push(translate('lives.undo-track'), `extra-${name}`);
      extra.value = Math.max(0, extra.value + delta);
    },
    toggleCondition(name) {
      const condition = data.conditions.find((item) => item.name === name);
      if (!condition) return;
      ctx.undo.push(translate('lives.undo-condition'));
      condition.active = !condition.active;
      ctx.haptics.buzz('short');
    },
    resetAll() {
      ctx.undo.push(translate('lives.undo-reset'));
      data.lives = Math.min(start, data.max);
      for (const player of data.players) player.lives = Math.min(start, player.max);
      for (const extra of data.extras) extra.value = 0;
      for (const condition of data.conditions) condition.active = false;
      data.revealed = !data.hidden;
    },
    setHidden(value) {
      ctx.undo.push(translate('lives.undo-hidden'));
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
