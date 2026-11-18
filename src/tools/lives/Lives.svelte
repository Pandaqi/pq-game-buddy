<script lang="ts">
  import { seatVars } from '../../core/colour';
  import { language, seatName, t } from '../../core/i18n.svelte';
  import type { ToolContext } from '../../core/registry';
  import NumberPad from '../../core/ui/NumberPad.svelte';
  import Sheet from '../../core/ui/Sheet.svelte';
  import { gameOverLabel, isGameOver, isOut, type LivesInstance } from './logic';

  let { ctx, instance }: { ctx: ToolContext; instance: LivesInstance } = $props();
  const data = $derived(instance.data);

  let adding = $state(false);
  let newName = $state('');
  // A 501 checkout cannot be entered one point at a time: the total is typed.
  let entryFor = $state<string | null>(null);

  const hiddenNow = $derived(data.hidden && !data.revealed);
  const over = $derived(isGameOver(data));
  const overLabel = $derived(gameOverLabel(data, language()));
  /** A track's name in the active language; a generated seat never freezes. */
  const label = (track: { name: string; seat?: number }): string => seatName(track.seat, track.name);
  const entryName = $derived(
    entryFor && entryFor !== 'shared'
      ? (() => {
          const track = data.players.find((player) => player.id === entryFor);
          return track ? label(track) : '';
        })()
      : '',
  );

  function shown(value: number): string {
    return hiddenNow ? '•••' : String(value);
  }

  function takeOff(value: number): void {
    const id = entryFor;
    entryFor = null;
    if (id) instance.adjust(id, -value);
  }

  function addPlayerNow(): void {
    instance.addPlayer(newName);
    newName = '';
    adding = false;
  }

  function hearts(count: number, max: number): string {
    const full = Math.max(0, Math.min(count, 10));
    const total = Math.max(full, Math.min(max, 10));
    return '♥'.repeat(full) + '♡'.repeat(total - full);
  }
</script>

<div class="lives">
  <div class="modes" role="group" aria-label={t('lives.who-lives')}>
    <button type="button" class:active={data.mode === 'shared'} onclick={() => instance.setMode('shared')}>{t('lives.shared')}</button>
    <button type="button" class:active={data.mode === 'players'} onclick={() => instance.setMode('players')}>{t('lives.per-player')}</button>
  </div>

  <p class="tap-hint"><span aria-hidden="true">✎</span> {t('lives.tap-hint')}</p>

  {#if over}
    <div class="over" role="status">
      <strong>{overLabel}</strong>
      <span>{t('lives.round-hint')}</span>
    </div>
  {/if}

  {#if data.mode === 'shared'}
    <div class="stage">
      <button
        type="button"
        class="count tap"
        aria-live="polite"
        aria-label={t('lives.enter')}
        disabled={hiddenNow}
        onclick={() => (entryFor = 'shared')}>{shown(data.lives)}</button>
      <p class="of">{t('lives.of', { max: data.max })}</p>
      {#if !hiddenNow && data.max <= 10}
        <p class="heart-row" aria-hidden="true">{hearts(data.lives, data.max)}</p>
      {/if}
      <div class="big-actions">
        <button type="button" onclick={() => instance.adjust('shared', -data.step)} aria-label={t('lives.lose-lives', { count: data.step })}>−</button>
        <button type="button" class="plus" onclick={() => instance.adjust('shared', data.step)} aria-label={t('lives.gain-lives', { count: data.step })}>+</button>
      </div>
    </div>
  {:else}
    <ul class="tracks">
      {#each data.players as player (player.id)}
        <li class:out={isOut(data, player)}>
          <div class="who">
            <span class="dot" style={seatVars(player.color)}>{label(player).slice(0, 2).toUpperCase()}</span>
            <span class="name">{label(player)}</span>
            {#if isOut(data, player)}<span class="tag">{t('lives.out')}</span>{/if}
          </div>
          <button
            type="button"
            class="count small tap"
            aria-label={t('lives.enter-for', { name: label(player) })}
            disabled={hiddenNow}
            onclick={() => (entryFor = player.id)}
          >{shown(player.lives)}<span class="of">/{player.max}</span></button>
          {#if !hiddenNow && player.max <= 10}
            <p class="heart-row" aria-hidden="true">{hearts(player.lives, player.max)}</p>
          {/if}
          <div class="row-actions">
            <button type="button" onclick={() => instance.adjust(player.id, -data.step)} aria-label={t('lives.lose-for', { count: data.step, name: label(player) })}>−</button>
            <button type="button" class="plus" onclick={() => instance.adjust(player.id, data.step)} aria-label={t('lives.gain-for', { count: data.step, name: label(player) })}>+</button>
          </div>
        </li>
      {/each}
    </ul>
    <div class="row">
      <button type="button" onclick={() => (adding = true)}>{t('lives.add-player')}</button>
      {#if data.players.length > 2}
        <button type="button" onclick={() => instance.removePlayer(data.players[data.players.length - 1].id)}>{t('lives.remove-last')}</button>
      {/if}
    </div>
  {/if}

  {#if data.extras.length}
    <section class="extras">
      <h2>{t('lives.extra-tracks')}</h2>
      {#each data.extras as extra (extra.name)}
        <div class="extra">
          <span class="name">{extra.name}</span>
          <div class="row-actions">
            <button type="button" onclick={() => instance.adjustExtra(extra.name, -extra.step)} aria-label={t('lives.lower', { name: extra.name })}>−</button>
            <span class="value">{shown(extra.value)}</span>
            <button type="button" onclick={() => instance.adjustExtra(extra.name, extra.step)} aria-label={t('lives.raise', { name: extra.name })}>+</button>
          </div>
        </div>
      {/each}
    </section>
  {/if}

  {#if data.conditions.length}
    <section class="conditions">
      <h2>{t('lives.conditions')}</h2>
      <div class="chips">
        {#each data.conditions as condition (condition.name)}
          <button
            type="button"
            class:active={condition.active}
            aria-pressed={condition.active}
            onclick={() => instance.toggleCondition(condition.name)}
          >
            {condition.name}
          </button>
        {/each}
      </div>
    </section>
  {/if}

  <div class="row">
    {#if hiddenNow}
      <button type="button" class="reveal" onclick={() => instance.reveal()}>{t('lives.reveal')}</button>
    {:else}
      <button type="button" onclick={() => instance.setHidden(true)}>{t('lives.hide')}</button>
    {/if}
    <button type="button" onclick={() => instance.resetAll()}>{t('lives.reset')}</button>
  </div>
</div>

{#if entryFor}
  <Sheet
    title={entryName ? t('lives.enter-for', { name: entryName }) : t('lives.entry-title')}
    onclose={() => (entryFor = null)}
  >
    <p class="hint">{t('lives.entry-hint')}</p>
    <NumberPad
      value={0}
      label={t('lives.entry-amount')}
      submitLabel={t('lives.entry-take')}
      onsubmit={takeOff}
      oncancel={() => (entryFor = null)}
    />
  </Sheet>
{/if}

{#if adding}
  <Sheet title={t('lives.add-player')} onclose={() => (adding = false)}>
    <label class="field">
      <span>{t('lives.name')}</span>
      <input
        type="text"
        bind:value={newName}
        onkeydown={(event) => {
          if (event.key === 'Enter') addPlayerNow();
        }}
      />
    </label>
    <button type="button" class="wide" onclick={addPlayerNow}>{t('lives.add')}</button>
  </Sheet>
{/if}

<style>
  .lives {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3);
  }



  .over {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-3);
    border-radius: var(--radius);
    background: var(--danger-soft, var(--surface-2));
    color: var(--text);
  }
  .over strong {
    font-size: var(--text-lg);
  }

  .count {
    margin: 0;
    font-size: clamp(3.6rem, 24vw, 6rem);
    font-weight: 800;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  /* The number itself is the way in to typing a whole throw. */
  .count.tap {
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
    padding: var(--space-2) var(--space-3);
    color: inherit;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
  }
  .count.tap:not(:disabled):active {
    background: var(--surface-2);
  }
  .count.tap:disabled {
    border-color: var(--line-soft);
    cursor: default;
  }
  .tap-hint {
    display: flex;
    gap: var(--space-1);
    margin: 0;
    color: var(--text-dim);
    font-size: var(--text-sm);
  }
  .hint {
    margin: 0;
    color: var(--text-dim);
  }
  .count.small {
    font-size: var(--text-3xl, 2rem);
  }
  .of {
    margin: 0;
    color: var(--text-dim);
    font-weight: 600;
  }
  .heart-row {
    margin: var(--space-2) 0 0;
    color: var(--danger);
    letter-spacing: 0.12em;
    font-size: var(--text-lg);
  }
  .big-actions {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-3);
  }
  .big-actions button {
    flex: 1;
    min-height: 72px;
    font-size: var(--text-2xl);
    font-weight: 800;
    border-radius: var(--radius-lg);
    color: var(--text);
    cursor: pointer;
  }
  .big-actions button.plus {
    --cutout-fill: var(--accent);
    color: var(--accent-text);
  }
  .tracks {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .tracks li {
    border-radius: var(--radius-lg);
    background: var(--surface);
    padding: var(--space-2) var(--space-3);
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--space-1) var(--space-2);
    align-items: center;
  }
  .tracks li.out {
    opacity: 0.6;
    border-style: dashed;
  }
  .who {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }
  .dot {
    display: inline-grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: var(--radius-round);
    background: var(--player);
    color: var(--seat-ink, var(--on-seat));
    font-family: var(--font-display);
    font-size: var(--text-xs);
    font-weight: 800;
    flex: none;
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
  }
  .tag {
    font-size: var(--text-xs);
    font-weight: 800;
    text-transform: uppercase;
    color: var(--danger);
    border-radius: var(--radius-pill);
    padding: 0 var(--space-2);
  }
  .tracks .count {
    grid-column: 2;
    grid-row: 1;
    justify-self: end;
  }
  .tracks .heart-row {
    grid-column: 1;
  }
  .row-actions {
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }
  .tracks .row-actions {
    grid-column: 2;
    grid-row: 2;
  }
  .row-actions button {
    min-width: 56px;
    min-height: 48px;
    border-radius: var(--radius);
    color: var(--text);
    font-size: var(--text-lg);
    font-weight: 700;
    cursor: pointer;
  }
  .row-actions button.plus {
    --cutout-fill: var(--accent-soft);
  }
  .extras,
  .conditions {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  h2 {
    margin: 0;
    font-size: var(--text-base);
  }
  .extra {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius);
    background: var(--surface);
  }
  .value {
    min-width: 2.5rem;
    text-align: center;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .chips button {
    min-height: 44px;
    padding: 0 var(--space-3);
    color: var(--text);
    cursor: pointer;
  }
  .chips button.active {
    --cutout-fill: var(--accent-soft);
    font-weight: 700;
  }


  .row button.reveal {
    --cutout-fill: var(--accent-soft);
    font-weight: 700;
  }



</style>
