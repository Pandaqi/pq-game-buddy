<script lang="ts">
  import { onMount } from 'svelte';
  import { isEditingTarget } from '../../core/dom';
  import { language, seatName, t } from '../../core/i18n.svelte';
  import type { ToolContext } from '../../core/registry';
  import { buzzName, isLive } from './logic';
  import type { BuzzerInstance } from './tool.svelte';

  let { ctx, instance }: { ctx: ToolContext; instance: BuzzerInstance } = $props();
  const data = $derived(instance.data);

  let now = $state(0);
  $effect(() => ctx.clock.subscribe((value) => (now = value)));

  const live = $derived(isLive(data, now));
  const waiting = $derived(data.armed && !live);
  const winnerName = $derived(buzzName(language(), data, data.winner));

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
      {t('buzzer.false-start', { name: buzzName(language(), data, data.falseStart) })}
    {:else if winnerName}
      <strong>{winnerName}</strong> {t('buzzer.wins', { ms: data.reactionMs ?? 0 })}
    {:else if waiting}
      {t('buzzer.ready')}
    {:else if live}
      {t('buzzer.buzz')}
    {:else}
      {t('buzzer.round', { count: data.round + 1 })}
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
        <span class="name">{seatName(player.seat, player.name)}</span>
        {#if data.keyPlay}<span class="key">{player.key.toUpperCase()}</span>{/if}
      </button>
    {/each}
  </div>

  <div class="row">
    <button type="button" class="primary" onclick={() => instance.arm()} disabled={data.armed}>
      {data.armed ? t('buzzer.armed') : t('buzzer.arm')}
    </button>
    <button type="button" onclick={() => instance.reset()} disabled={!data.armed}>{t('buzzer.disarm')}</button>
  </div>

  {#if data.rounds.length}
    <section class="panel">
      <header>
        <h2>{t('buzzer.reactions')}</h2>
        <button type="button" onclick={() => instance.clearHistory()}>{t('buzzer.clear')}</button>
      </header>
      <ol>
        {#each data.rounds as round, index (index)}
          <li>
            <span>{buzzName(language(), data, round.winner) || '—'}</span>
            <span class="ms">{round.falseStart ? t('buzzer.false-start-short') : t('buzzer.ms', { ms: round.ms })}</span>
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
  }
  .status.live {
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
    box-shadow: inset 0 0 0 3px var(--player), var(--shadow-card);
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
  /* The winner is named in the status line and tinted here: never colour alone,
     and never white text on a mid-tone seat colour. */
  .pad.winner {
    background: var(--accent-soft);
    border-width: 5px;
    box-shadow: var(--shadow);
    opacity: 1;
  }
  .name {
    text-align: center;
  }
  .key {
    font-size: var(--text-xs);
    font-family: var(--font-mono);
    color: var(--text-dim);
    border-radius: var(--radius-sm);
    padding: 2px 6px;
  }
  .pad.winner .key {
    color: var(--text);
  }



  .row button:disabled {
    opacity: 0.6;
    cursor: default;
  }


  h2 {
    margin: 0;
    font-size: var(--text-base);
  }
  .panel header button {
    min-height: 40px;
    padding: 0 var(--space-3);
    border-radius: var(--radius);
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
