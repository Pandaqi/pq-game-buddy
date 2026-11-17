import type { ToolContext } from '../../core/registry';
import { PLAYER_COLORS } from '../../core/session';
import type { PresetValues } from '../../core/template/schema';
import Reveal from './Reveal.svelte';
import {
  allBid,
  allVoted,
  ballotResults,
  bidLeaders,
  bidResults,
  dealRoles,
  firstUnvoted,
  roleOf,
  rolesFrom,
  tally,
  type RevealInstance,
  type RevealMode,
  type RevealPlayer,
  type RevealRole,
  type RevealState,
} from './logic';
import meta from './meta';
import preset from './preset';

function playersFrom(ctx: ToolContext): RevealPlayer[] {
  const players = ctx.session.players();
  const source = players.length
    ? players
    : [
        { id: 'p1', name: 'Player 1', color: PLAYER_COLORS[0] },
        { id: 'p2', name: 'Player 2', color: PLAYER_COLORS[1] },
      ];
  return source.map((player, index) => ({
    id: player.id,
    name: player.name,
    color: player.color || PLAYER_COLORS[index % PLAYER_COLORS.length],
  }));
}

function create(ctx: ToolContext, values: PresetValues = {}): RevealInstance {
  const roles = rolesFrom(
    (values.roles as Record<string, string | number>) ?? {},
    (values.descriptions as Record<string, string | number>) ?? {},
  );
  const players = playersFrom(ctx);
  const options = (Array.isArray(values.options) ? (values.options as string[]) : []).map((item) => String(item)).filter(Boolean);
  const requestedMode = values.mode as RevealMode;
  const mode: RevealMode = ['roles', 'ballot', 'bid'].includes(requestedMode) ? requestedMode : 'roles';
  const min = Math.max(0, Number(values['min-bid'] ?? 0));
  const max = Math.max(min + 1, Number(values['max-bid'] ?? 100));

  const data = $state<RevealState>({
    mode,
    players,
    roles,
    assignment: {},
    dealt: false,
    holder: 0,
    autoHide: Math.max(0, Number(values['auto-hide'] ?? 8)),
    ballot: {
      question: String(values.ballot ?? 'Who should go first?'),
      options: options.length ? options : players.map((player) => player.name),
      votes: {},
      revealed: false,
    },
    bids: { min, max, values: {}, revealed: false },
    allRevealed: false,
  });

  function emptyVotes(): Record<string, string> {
    return {};
  }

  const instance: RevealInstance = {
    data,
    state: () => JSON.parse(JSON.stringify(data)) as RevealState,
    load(state) {
      if (!state || typeof state !== 'object') return;
      const raw = state as Partial<RevealState>;
      if (raw.mode && ['roles', 'ballot', 'bid'].includes(raw.mode)) data.mode = raw.mode;
      if (Array.isArray(raw.players) && raw.players.length) {
        data.players = raw.players
          .filter((player) => player && typeof player.id === 'string')
          .map((player, index) => ({
            id: player.id,
            name: typeof player.name === 'string' ? player.name : `Player ${index + 1}`,
            color: typeof player.color === 'string' ? player.color : PLAYER_COLORS[index % PLAYER_COLORS.length],
          }));
      }
      if (Array.isArray(raw.roles)) {
        data.roles = raw.roles
          .filter((role) => role && typeof role.name === 'string')
          .map((role) => ({
            name: role.name,
            count: Math.max(0, Math.round(Number(role.count) || 0)),
            description: typeof role.description === 'string' ? role.description : '',
          }));
      }
      if (raw.assignment && typeof raw.assignment === 'object') {
        const next: Record<string, string> = {};
        for (const player of data.players) {
          const role = (raw.assignment as Record<string, string>)[player.id];
          if (typeof role === 'string') next[player.id] = role;
        }
        data.assignment = next;
        data.dealt = data.players.length > 0 && data.players.every((player) => !!next[player.id]);
      }
      if (typeof raw.dealt === 'boolean') data.dealt = raw.dealt && Object.keys(data.assignment).length > 0;
      if (typeof raw.holder === 'number') {
        data.holder = Math.max(0, Math.min(data.players.length - 1, Math.round(raw.holder)));
      }
      if (typeof raw.autoHide === 'number') data.autoHide = Math.max(0, raw.autoHide);
      if (raw.ballot && typeof raw.ballot === 'object') {
        const saved = raw.ballot;
        if (typeof saved.question === 'string') data.ballot.question = saved.question;
        if (Array.isArray(saved.options)) {
          const next = saved.options.filter((option) => typeof option === 'string' && option.trim());
          if (next.length) data.ballot.options = next;
        }
        if (saved.votes && typeof saved.votes === 'object') {
          const next: Record<string, string> = {};
          for (const player of data.players) {
            const vote = saved.votes[player.id];
            if (typeof vote === 'string' && data.ballot.options.includes(vote)) next[player.id] = vote;
          }
          data.ballot.votes = next;
        }
        data.ballot.revealed = saved.revealed === true;
      }
      if (raw.bids && typeof raw.bids === 'object') {
        const saved = raw.bids;
        if (typeof saved.min === 'number') data.bids.min = Math.max(0, saved.min);
        if (typeof saved.max === 'number') data.bids.max = Math.max(data.bids.min + 1, saved.max);
        if (saved.values && typeof saved.values === 'object') {
          const next: Record<string, number | null> = {};
          for (const player of data.players) {
            if (!(player.id in saved.values)) continue;
            const value = saved.values[player.id];
            next[player.id] = typeof value === 'number' && Number.isFinite(value) ? value : null;
          }
          data.bids.values = next;
        }
        data.bids.revealed = saved.revealed === true;
      }
      if (typeof raw.allRevealed === 'boolean') data.allRevealed = raw.allRevealed;
    },
    presetFromState() {
      const rolePairs: Record<string, number> = {};
      const descriptions: Record<string, string> = {};
      for (const role of data.roles) {
        rolePairs[role.name] = role.count;
        if (role.description) descriptions[role.name] = role.description;
      }
      return {
        mode: data.mode,
        roles: rolePairs,
        descriptions,
        'auto-hide': data.autoHide,
        ballot: data.ballot.question,
        options: data.ballot.options.slice(),
        'min-bid': data.bids.min,
        'max-bid': data.bids.max,
      };
    },
    commands: {
      deal: () => instance.deal(),
      reveal: () => instance.revealAll(),
      cover: () => instance.coverAll(),
    },
    summary() {
      if (data.mode === 'roles') {
        if (!data.dealt) return `Roles: ${data.roles.map((role) => `${role.name} x${role.count}`).join(', ') || 'none'}`;
        const lines = [`Roles dealt to ${data.players.length} players`];
        if (data.allRevealed) {
          for (const player of data.players) {
            const role = roleOf(data, player.id);
            lines.push(`${player.name}: ${role?.name ?? '?'}`);
          }
        }
        return lines.join('\n');
      }
      if (data.mode === 'ballot') {
        const lines = [data.ballot.question];
        if (data.ballot.revealed) {
          for (const row of tally(data.ballot.votes, data.ballot.options)) lines.push(`${row.option}: ${row.count}`);
        } else {
          lines.push(`${Object.keys(data.ballot.votes).length}/${data.players.length} votes cast`);
        }
        return lines.join('\n');
      }
      const lines = [`Blind bids ${data.bids.min}–${data.bids.max}`];
      if (data.bids.revealed) lines.push(`Highest: ${bidLeaders(data).join(', ') || 'nobody'}`);
      else lines.push(`${Object.values(data.bids.values).filter((value) => typeof value === 'number').length}/${data.players.length} bids in`);
      return lines.join('\n');
    },
    setMode(mode) {
      if (data.mode === mode) return;
      ctx.undo.push('reveal mode');
      data.mode = mode;
    },
    deal() {
      if (!data.roles.length) {
        ctx.toast('Add at least one role first');
        return;
      }
      ctx.undo.push('deal roles');
      data.assignment = dealRoles(data.roles, data.players, ctx.rng);
      data.dealt = true;
      data.holder = 0;
      data.allRevealed = false;
      ctx.audio.play('click');
    },
    clearDeal() {
      if (!data.dealt) return;
      ctx.undo.push('clear deal');
      data.assignment = {};
      data.dealt = false;
      data.allRevealed = false;
      data.holder = 0;
    },
    setRoles(next) {
      const clean: RevealRole[] = [];
      const seen = new Set<string>();
      for (const role of next) {
        const name = role.name.trim();
        if (!name || seen.has(name) || role.count <= 0) continue;
        seen.add(name);
        clean.push({ name, count: Math.round(role.count), description: role.description.trim() });
      }
      if (JSON.stringify(clean) === JSON.stringify(data.roles)) return;
      ctx.undo.push('roles');
      data.roles = clean;
      if (!clean.length) {
        data.dealt = false;
        data.assignment = {};
      }
    },
    setHolder(index) {
      const next = Math.max(0, Math.min(data.players.length - 1, Math.round(index)));
      if (next === data.holder) return;
      data.holder = next;
    },
    nextHolder() {
      data.holder = (data.holder + 1) % Math.max(1, data.players.length);
    },
    setAutoHide(seconds) {
      const next = Math.max(0, Math.round(seconds));
      if (next === data.autoHide) return;
      ctx.undo.push('auto hide');
      data.autoHide = next;
    },
    setBallotQuestion(text) {
      const clean = text.trim();
      if (!clean || clean === data.ballot.question) return;
      ctx.undo.push('ballot question');
      data.ballot.question = clean;
    },
    setBallotOptions(next) {
      const clean = next.map((option) => option.trim()).filter(Boolean);
      if (!clean.length) {
        ctx.toast('A ballot needs at least one option', 'error');
        return;
      }
      ctx.undo.push('ballot options');
      data.ballot.options = clean;
      data.ballot.votes = emptyVotes();
      data.ballot.revealed = false;
    },
    castVote(playerId, option) {
      if (!data.ballot.options.includes(option)) return;
      ctx.undo.push('vote');
      data.ballot.votes[playerId] = option;
      data.ballot.revealed = false;
      ctx.haptics.buzz('short');
      const next = firstUnvoted(data, 'ballot');
      if (next >= 0) data.holder = next;
    },
    revealBallot() {
      if (!Object.keys(data.ballot.votes).length) {
        ctx.toast('No votes to reveal yet');
        return;
      }
      ctx.undo.push('reveal ballot');
      data.ballot.revealed = true;
      ctx.audio.play('success');
    },
    coverBallot() {
      if (!data.ballot.revealed) return;
      ctx.undo.push('cover ballot');
      data.ballot.revealed = false;
    },
    setBid(playerId, value) {
      const clean =
        value === null || !Number.isFinite(value)
          ? null
          : Math.max(data.bids.min, Math.min(data.bids.max, Math.round(value)));
      ctx.undo.push('bid');
      data.bids.values[playerId] = clean;
      data.bids.revealed = false;
      ctx.haptics.buzz('short');
      const next = firstUnvoted(data, 'bid');
      if (next >= 0) data.holder = next;
    },
    setBidRange(min, max) {
      const low = Math.max(0, Math.round(Number.isFinite(min) ? min : 0));
      const high = Math.max(low + 1, Math.round(Number.isFinite(max) ? max : low + 1));
      if (low === data.bids.min && high === data.bids.max) return;
      ctx.undo.push('bid range');
      data.bids.min = low;
      data.bids.max = high;
      for (const player of data.players) {
        const value = data.bids.values[player.id];
        if (typeof value === 'number') {
          data.bids.values[player.id] = Math.max(low, Math.min(high, value));
        }
      }
    },
    revealBids() {
      if (!Object.keys(data.bids.values).length) {
        ctx.toast('No bids to reveal yet');
        return;
      }
      ctx.undo.push('reveal bids');
      data.bids.revealed = true;
      ctx.audio.play('success');
      const leaders = bidLeaders(data);
      if (leaders.length) ctx.toast(`Highest bid: ${leaders.join(', ')}`);
    },
    coverBids() {
      if (!data.bids.revealed) return;
      ctx.undo.push('cover bids');
      data.bids.revealed = false;
    },
    revealAll() {
      if (!data.dealt || data.allRevealed) return;
      ctx.undo.push('reveal all roles');
      data.allRevealed = true;
      ctx.audio.play('success');
    },
    coverAll() {
      if (!data.allRevealed) return;
      ctx.undo.push('cover roles');
      data.allRevealed = false;
    },
    syncPlayers() {
      const next = playersFrom(ctx);
      if (!next.length) return;
      if (
        next.length === data.players.length &&
        next.every(
          (player, index) =>
            player.id === data.players[index]?.id && player.name === data.players[index]?.name,
        )
      ) {
        return;
      }
      ctx.undo.push('use session players');
      data.players = next;
      data.assignment = {};
      data.dealt = false;
      data.ballot.votes = {};
      data.bids.values = {};
      data.holder = 0;
      data.allRevealed = false;
    },
    results: () => (data.mode === 'ballot' ? ballotResults(data) : data.mode === 'bid' ? bidResults(data) : []),
  };

  return instance;
}

export default { ...meta, preset, component: Reveal, create };
export { allBid, allVoted };
