<script lang="ts">
  import { onMount } from 'svelte';
  import type { ToolContext } from '../../core/registry';
  import { isEditingTarget } from '../../core/dom';
  import { isLive } from './logic';
  import type { BuzzerInstance } from './tool.svelte';

  let { ctx, instance }: { ctx: ToolContext; instance: BuzzerInstance } = $props();
  const data = $derived(instance.data);

  let now = $state(0);
  $effect(() => ctx.clock.subscribe((value) => (now = value)));

  const live = $derived(isLive(data, now));
  const waiting = $derived(data.armed && !live);
  const winnerName = $derived(data.winner ? data.players.find((player) => player.id === data.winner)?.name ?? '' : '');

  onMount(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (!data.keyPlay || isEditingTarget(event.target)) return;
      const player = data.players.find((item) => item.key === event.key.toLowerCase());
      if (!player) return;
      event.preventDefault();
      instance.buzz(player.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
</script>

<div class="buzzer">
  <div class="status" class:live class:waiting role="status" aria-live="polite">
    {#if data.falseStart}
      False start: <strong>{data.falseStart}</strong>
    {:else if winnerName}
      <strong>{winnerName}</strong> wins · {data.reactionMs} ms
    {:else if waiting}
      Get ready…
    {:else if live}
      Buzz!
    {:else}
      Round {data.round + 1} · press Arm
    {/if}
  </div>

  <div class="pads" style="--count: {Math.ceil(data.players.length / 2)}">
    {#each data.players as player (player.id)}
      <button
        type="button"
        class="pad"
        class:winner={data.winner === player.id}
        disabled={!data.armed}
        style="--player: {player.color}"
        onclick={() => instance.buzz(player.id)}
      >
        <span class="name">{player.name}</span>
        {#if data.keyPlay}<span class="key">{player.key.toUpperCase()}</span>{/if}
      </button>
    {/each}
  </div>

  <div class="row">
    <button type="button" class="primary" onclick={() => instance.arm()} disabled={data.armed}>
      {data.armed ? 'Armed' : 'Arm buzzers'}
    </button>
    <button type="button" onclick={() => instance.reset()} disabled={!data.armed}>Disarm</button>
  </div>

  {#if data.rounds.length}
    <section class="panel">
      <header>
        <h2>Reactions</h2>
        <button type="button" onclick={() => instance.clearHistory()}>Clear</button>
      </header>
      <ol>
        {#each data.rounds as round, index (index)}
          <li>
            <span>{data.players.find((player) => player.id === round.winner)?.name ?? '—'}</span>
            <span class="ms">{round.falseStart ? 'false start' : `${round.ms} ms`}</span>
          </li>
        {/each}
      </ol>
    </section>
  {/if}
</div>

<style>
  .buzzer {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3);
  }
  .status {
    margin: 0;
    padding: var(--space-4);
    text-align: center;
    font-size: var(--text-lg);
    border-radius: var(--radius-lg);
    background: var(--surface-2);
    border: 2px solid var(--line);
  }
  .status.waiting {
    border-color: var(--warning);
  }
  .status.live {
    border-color: var(--accent);
    background: var(--accent-soft);
    font-size: var(--text-2xl);
    font-weight: 800;
  }
  .pads {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-2);
  }
  @media (min-width: 34rem) {
    .pads {
      grid-template-columns: repeat(var(--count, 2), minmax(0, 1fr));
    }
  }
  .pad {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    min-height: 8rem;
    padding: var(--space-3);
    border-radius: var(--radius-lg);
    border: 3px solid var(--player);
    background: var(--surface);
    color: var(--text);
    font-size: var(--text-lg);
    font-weight: 800;
    cursor: pointer;
  }
  .pad:disabled {
    opacity: 0.55;
    cursor: default;
  }
  .pad.winner {
    background: var(--player);
    color: #fff;
    opacity: 1;
  }
  .name {
    text-align: center;
  }
  .key {
    font-size: var(--text-xs);
    font-family: var(--font-mono);
    color: var(--text-dim);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    padding: 2px 6px;
  }
  .pad.winner .key {
    color: #fff;
    border-color: rgba(255, 255, 255, 0.6);
  }
  .row {
    display: flex;
    gap: var(--space-2);
  }
  .row button {
    flex: 1;
    min-height: 60px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface-2);
    color: var(--text);
    font-size: var(--text-lg);
    font-weight: 700;
    cursor: pointer;
  }
  .row .primary {
    border-color: var(--accent);
    background: var(--accent);
    color: var(--accent-text);
  }
  .row button:disabled {
    opacity: 0.6;
    cursor: default;
  }
  .panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
  }
  .panel header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  h2 {
    margin: 0;
    font-size: var(--text-base);
  }
  .panel header button {
    min-height: 40px;
    padding: 0 var(--space-3);
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
  }
  ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  li {
    display: flex;
    justify-content: space-between;
    padding: var(--space-1) var(--space-2);
    border-bottom: 1px solid var(--line);
    font-variant-numeric: tabular-nums;
  }
  .ms {
    font-weight: 700;
  }
</style>
