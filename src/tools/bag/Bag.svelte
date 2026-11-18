<script lang="ts">
  import { untrack } from 'svelte';
  import { seatName, t } from '../../core/i18n.svelte';
  import type { ToolContext } from '../../core/registry';
  import Sheet from '../../core/ui/Sheet.svelte';
  import { BAG_SETS, totalOf, trayLabel, trayTotal, type BagSet } from './logic';
  import type { BagInstance } from './tool.svelte';

  let { ctx, instance }: { ctx: ToolContext; instance: BagInstance } = $props();
  const data = $derived(instance.data);
  const players = $derived(ctx.session.players());

  let settingsOpen = $state(false);
  let countsDraft = $state('');
  let valuesDraft = $state('');
  let newType = $state('');
  // The seat strip and the bag's own row are the same choice, so both read the
  // session's active player instead of keeping a second, drifting copy. Both
  // follow the player's id: a rename moves the tray with them.
  const activeId = $derived((players.find((player) => player.active) ?? players[0])?.id ?? '');
  // A one-time read of the tool's current seat, not a tracked dependency.
  let assigned = untrack(() => instance.assignedTo());
  let left = $derived(totalOf(data.remaining));
  const types = $derived(Object.keys(data.remaining).sort());

  function openSettings(): void {
    countsDraft = Object.entries(data.counts)
      .map(([type, count]) => `${type} = ${count}`)
      .join('\n');
    valuesDraft = Object.entries(data.values)
      .map(([type, value]) => `${type} = ${value}`)
      .join('\n');
    settingsOpen = true;
  }

  function choosePlayer(id: string): void {
    const player = players.find((item) => item.id === id);
    if (player) ctx.session.setActivePlayer(player.id);
    assigned = id;
    instance.assignTo(id);
  }

  // Switch seats anywhere and the next draw follows; otherwise a per-player
  // tray quietly keeps filling the first player's pile.
  $effect(() => {
    if (data.trayMode !== 'per-player' || !activeId) return;
    if (activeId === assigned) return;
    assigned = activeId;
    instance.assignTo(activeId);
  });
</script>

<div class="bag">
  <div class="stats">
    <div class="stat"><span class="num">{left}</span><span class="label">{t('bag.in-bag')}</span></div>
    <div class="stat"><span class="num">{data.tokens.length + data.trays.reduce((sum, tray) => sum + tray.tokens.length, 0)}</span><span class="label">{t('bag.drawn')}</span></div>
    <div class="stat"><span class="num">{data.drawCount}</span><span class="label">{t('bag.per-draw')}</span></div>
  </div>

  {#if data.trayMode === 'per-player' && players.length}
    <div class="who" role="group" aria-label={t('bag.who-drawing')}>
      {#each players as player (player.id)}
        <button type="button" class:active={activeId === player.id} onclick={() => choosePlayer(player.id)}>
          {seatName(player.seat, player.name)}
        </button>
      {/each}
    </div>
  {/if}

  <div class="controls">
    <label class="field">
      <span>{t('bag.tokens')}</span>
      <input
        type="number"
        min="1"
        max="50"
        value={data.drawCount}
        onchange={(event) => instance.setDraw(Number((event.currentTarget as HTMLInputElement).value))}
      />
    </label>
    <button type="button" class="primary" onclick={() => instance.draw()}>{t('bag.draw')}</button>
  </div>

  {#if data.trayMode === 'shared'}
    <section class="block">
      <header>
        <h2>{t('bag.shared-tray')}</h2>
        {#if data.tokens.length}
          <span class="dim small">{t('bag.points', { count: trayTotal(data.tokens) })}</span>
        {/if}
      </header>
      {#if data.tokens.length}
        <ul class="tokens">
          {#each data.tokens as token, index (token.id)}
            <li>
              <button type="button" onclick={() => instance.returnAt(index)} aria-label={t('bag.return-token', { type: token.type })}>
                {token.type}{#if token.value}<span class="points">{token.value}</span>{/if}
              </button>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="dim small">{t('bag.empty-tray', { count: data.drawCount })}</p>
      {/if}
    </section>
  {:else}
    <section class="block">
      <h2>{t('bag.trays')}</h2>
      {#if data.trays.length}
        {#each data.trays as tray (tray.player)}
          <div class="tray">
            <header>
              <span class="player">{trayLabel(tray.player, players)}</span>
              <span class="dim small">{t('bag.tray-summary', { count: tray.tokens.length, points: trayTotal(tray.tokens) })}</span>
            </header>
            <ul class="tokens">
              {#each tray.tokens as token (token.id)}
                <li>
                  <span class="tile">{token.type}{#if token.value}<span class="points">{token.value}</span>{/if}</span>
                </li>
              {/each}
            </ul>
            <button type="button" class="ghost" onclick={() => instance.returnPlayer(tray.player)}>{t('bag.return-tiles', { player: trayLabel(tray.player, players) })}</button>
          </div>
        {/each}
      {:else}
        <p class="dim small">{t('bag.pick-player')}</p>
      {/if}
    </section>
  {/if}

  <section class="block">
    <header>
      <h2>{t('bag.left-in-bag')}</h2>
      <span class="dim small">{data.set}</span>
    </header>
    <ul class="counts">
      {#each types as type (type)}
        <li>
          <span class="tile">{type}</span>
          <span class="n">{data.remaining[type] ?? 0}</span>
          <span class="steppers">
            <button type="button" onclick={() => instance.adjustType(type, 1)} aria-label={t('bag.add-one', { type })}>+</button>
            <button type="button" onclick={() => instance.adjustType(type, -1)} aria-label={t('bag.remove-one', { type })} disabled={(data.remaining[type] ?? 0) === 0}>−</button>
          </span>
        </li>
      {/each}
    </ul>
    {#if !types.length}
      <p class="dim small">{t('bag.bag-empty')}</p>
    {/if}
  </section>

  {#if data.history.length}
    <ol class="history">
      {#each data.history as line, index (index)}
        <li>{line}</li>
      {/each}
    </ol>
  {/if}

  <div class="row">
    <button type="button" onclick={openSettings}>{t('bag.settings')}</button>
    <button type="button" onclick={() => instance.returnAll()}>{t('bag.return-all')}</button>
    <button type="button" onclick={() => instance.refill()}>{t('bag.refill')}</button>
  </div>
</div>

{#if settingsOpen}
  <Sheet title={t('bag.settings')} onclose={() => (settingsOpen = false)}>
    <label class="field">
      <span>{t('bag.tile-set')}</span>
      <select value={data.set} onchange={(event) => instance.setSet((event.currentTarget as HTMLSelectElement).value as BagSet)}>
        {#each BAG_SETS as set (set)}
          <option value={set}>{set}</option>
        {/each}
      </select>
    </label>
    <label class="field">
      <span>{t('bag.tray')}</span>
      <select value={data.trayMode} onchange={(event) => instance.setTrayMode((event.currentTarget as HTMLSelectElement).value as 'shared' | 'per-player')}>
        <option value="shared">{t('bag.tray-shared')}</option>
        <option value="per-player">{t('bag.tray-per-player')}</option>
      </select>
    </label>
    {#if data.set === 'custom'}
      <label class="field">
        <span>{t('bag.counts')}</span>
        <textarea rows="6" bind:value={countsDraft} spellcheck="false"></textarea>
      </label>
      <label class="field">
        <span>{t('bag.values')}</span>
        <textarea rows="4" bind:value={valuesDraft} spellcheck="false"></textarea>
      </label>
      <button type="button" class="wide primary" onclick={() => instance.setCustom(countsDraft, valuesDraft)}>{t('bag.save-custom')}</button>
    {/if}
    <label class="field">
      <span>{t('bag.add-type')}</span>
      <div class="add">
        <input type="text" bind:value={newType} placeholder="star" />
        <button type="button" onclick={() => { instance.addType(newType, 1); newType = ''; }}>{t('bag.add')}</button>
      </div>
    </label>
    <button type="button" class="wide" onclick={() => (settingsOpen = false)}>{t('bag.done')}</button>
    <p class="dim small">{t('bag.hint')}</p>
  </Sheet>
{/if}

<style>
  .bag {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3);
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-2);
  }
  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-2);
    border-radius: var(--radius);
    background: var(--surface-2);
  }
  .num {
    font-size: var(--text-xl);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .label {
    font-size: var(--text-xs);
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .who {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }
  .who button {
    min-height: 44px;
    padding: 0 var(--space-3);
    border-radius: var(--radius-pill);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
  }
  .who button.active {
    background: var(--accent-soft);
    font-weight: 700;
  }
  .controls {
    display: flex;
    align-items: flex-end;
    gap: var(--space-2);
  }





  .block header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  h2 {
    margin: 0;
    font-size: var(--text-base);
  }
  .tokens {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }
  .tokens button,
  .tile {
    display: inline-flex;
    align-items: baseline;
    gap: 2px;
    min-width: 48px;
    min-height: 48px;
    justify-content: center;
    padding: 0 var(--space-2);
    border-radius: var(--radius-sm);
    background: var(--surface-2);
    color: var(--text);
    font-weight: 800;
    font-size: var(--text-lg);
    cursor: pointer;
  }
  .tile {
    cursor: default;
  }
  .points {
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--text-dim);
  }
  .tray {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--line);
  }
  .tray:last-of-type {
    border-bottom: 0;
  }
  .tray header {
    display: flex;
    justify-content: space-between;
  }
  .player {
    font-weight: 700;
  }
  .counts {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr));
    gap: var(--space-1);
  }
  .counts li {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1);
    border-radius: var(--radius);
    background: var(--surface-2);
  }
  .n {
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    margin-left: auto;
  }
  .steppers {
    display: flex;
    gap: 2px;
  }
  .steppers button {
    min-width: 32px;
    min-height: 40px;
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
  }
  .steppers button:disabled {
    opacity: 0.5;
  }




  .add {
    display: flex;
    gap: var(--space-2);
  }
  .add button {
    min-height: 48px;
    padding: 0 var(--space-3);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
  }




</style>
