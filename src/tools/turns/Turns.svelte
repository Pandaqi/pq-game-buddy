<script lang="ts">
  import { language, seatName, t } from '../../core/i18n.svelte';
  import type { ToolContext } from '../../core/registry';
  import PassThePhone from '../../core/ui/PassThePhone.svelte';
  import Sheet from '../../core/ui/Sheet.svelte';
  import { formatClock } from '../../core/template/schema';
  import { currentName, currentPhase, initiativeRanking, type TurnsInstance } from './logic';

  let { ctx, instance }: { ctx: ToolContext; instance: TurnsInstance } = $props();
  const data = $derived(instance.data);

  let settingsOpen = $state(false);
  let passing = $state(false);
  let orderDraft = $state('');
  let phasesDraft = $state('');
  let secondsDraft = $state(0);

  const who = $derived(currentName(data, language()));
  const phase = $derived(currentPhase(data));
  /** A seat in the active language; a generated seat never freezes. */
  const label = (seat: { name: string; seat?: number } | undefined): string =>
    seat ? seatName(seat.seat, seat.name) : '';

  function nextTurn(): void {
    instance.next();
    if (data.pass) passing = true;
  }

  function jump(index: number): void {
    if (index === data.index) return;
    instance.goTo(index);
    if (data.pass) passing = true;
  }

  function startAfterPass(): void {
    passing = false;
    if (data.autoStart && data.timer.duration > 0) instance.startTimer();
  }

  function openSettings(): void {
    orderDraft = data.order.map((seat) => seatName(seat.seat, seat.name)).join(', ');
    phasesDraft = data.phases.join(', ');
    secondsDraft = Math.round(data.timer.duration / 1000);
    settingsOpen = true;
  }

  function saveSettings(): void {
    ctx.undo.batch(t('turns.undo-settings'), () => {
      instance.setOrder(orderDraft.split(','));
      instance.setPhases(phasesDraft.split(','));
      instance.setDuration(Math.max(0, secondsDraft) * 1000);
    });
    settingsOpen = false;
  }
</script>

<div class="turns">
  <div class="top">
    <span class="round">{t('turns.round', { count: data.round })}</span>
    <div class="phase-chips" role="group" aria-label={t('turns.phase')}>
      {#each data.phases as item, index (index)}
        <button type="button" class:active={index === data.phase} aria-pressed={index === data.phase} onclick={() => instance.setPhase(index)}>
          {item}
        </button>
      {/each}
    </div>
  </div>

  <div class="stage">
    <p class="lead">{data.mode === 'initiative' ? t('turns.acting') : t('turns.turn-of')}</p>
    <h2 aria-live="polite">{who}</h2>
    <p class="phase">{phase}</p>

    {#if data.timer.duration > 0}
      <p class="clock" class:low={data.timer.remaining <= 10000}>{formatClock(data.timer.remaining)}</p>
      <div class="clock-actions">
        {#if data.timer.running}
          <button type="button" onclick={() => instance.pauseTimer()}>{t('turns.pause-clock')}</button>
        {:else}
          <button type="button" class="primary" onclick={() => instance.startTimer()}>{t('turns.start-clock')}</button>
        {/if}
        <button type="button" onclick={() => instance.resetTimer()}>{t('turns.reset-clock')}</button>
      </div>
    {/if}
  </div>

  {#if data.mode === 'initiative'}
    <div class="initiative">
      <div class="init-head">
        <span>{t('turns.initiative-round')}</span>
        <button type="button" onclick={() => instance.newInitiativeRound()}>{t('turns.new-round')}</button>
      </div>
      {#each initiativeRanking(data) as seat (seat)}
        <div class="init-row" class:active={seat === data.index}>
          <button type="button" class="who" onclick={() => jump(seat)} aria-current={seat === data.index ? 'true' : undefined}>
            {label(data.order[seat])}
          </button>
          <div class="stepper" role="group" aria-label={t('turns.initiative-for', { name: label(data.order[seat]) })}>
            <button
              type="button"
              aria-label={t('turns.lower-initiative', { name: label(data.order[seat]) })}
              onclick={() => instance.setInitiative(seat, (data.initiative[seat] ?? 0) - 1)}
            >−</button>
            <span class="value">{data.initiative[seat] ?? 0}</span>
            <button
              type="button"
              aria-label={t('turns.raise-initiative', { name: label(data.order[seat]) })}
              onclick={() => instance.setInitiative(seat, (data.initiative[seat] ?? 0) + 1)}
            >+</button>
          </div>
        </div>
      {/each}
      <p class="hint">{t('turns.initiative-hint')}</p>
    </div>
  {:else if data.order.length > 1}
    <div class="order" role="group" aria-label={t('turns.order')}>
      {#each data.order as item, index (index)}
        <button
          type="button"
          class:active={index === data.index}
          aria-current={index === data.index ? 'true' : undefined}
          onclick={() => jump(index)}
        >
          {label(item)}
        </button>
      {/each}
    </div>
  {/if}

  <div class="turn-actions">
    <button type="button" class="previous" onclick={() => instance.previous()} aria-label={t('turns.previous-turn')}>←</button>
    <button type="button" class="next" onclick={nextTurn}>{t('turns.next-turn')}</button>
  </div>

  <div class="row">
    <button type="button" onclick={openSettings}>{t('turns.settings')}</button>
    <button type="button" onclick={() => instance.syncPlayers()}>{t('turns.use-players')}</button>
  </div>

  <details class="log">
    <summary>{t('turns.log', { count: data.log.length })}</summary>
    {#if data.log.length}
      <ol>
        {#each data.log as entry, index (index)}
          <li>{entry.text}</li>
        {/each}
      </ol>
      <button type="button" class="ghost" onclick={() => instance.clearLog()}>{t('turns.clear-log')}</button>
    {:else}
      <p class="hint">{t('turns.log-empty')}</p>
    {/if}
  </details>

  <button type="button" class="ghost" onclick={() => instance.resetTurn()}>{t('turns.start-over')}</button>
</div>

{#if passing}
  <PassThePhone
    name={who}
    hint={t('turns.pass-hint', { round: data.round, phase })}
    action={t('turns.start-turn')}
    onshow={startAfterPass}
  />
{/if}

{#if settingsOpen}
  <Sheet title={t('turns.settings-title')} onclose={() => (settingsOpen = false)}>
    <label class="field">
      <span>{t('turns.order-label')}</span>
      <input type="text" bind:value={orderDraft} placeholder={t('turns.order-placeholder')} />
    </label>
    <label class="field">
      <span>{t('turns.phases')}</span>
      <input type="text" bind:value={phasesDraft} placeholder={t('turns.phases-placeholder')} />
    </label>
    <label class="field">
      <span>{t('turns.timer-label')}</span>
      <input type="number" min="0" max="86400" bind:value={secondsDraft} />
    </label>
    <div class="time-presets" role="group" aria-label={t('turns.presets')}>
      {#each [0, 30, 60, 120, 300] as seconds (seconds)}
        <button type="button" class:active={secondsDraft === seconds} onclick={() => (secondsDraft = seconds)}>
          {seconds === 0 ? t('turns.off') : seconds < 60 ? `${seconds}s` : `${seconds / 60}m`}
        </button>
      {/each}
    </div>
    <div class="segment" role="group" aria-label={t('turns.style')}>
      <button type="button" class:active={data.mode === 'order'} onclick={() => instance.setMode('order')}>{t('turns.mode-order')}</button>
      <button type="button" class:active={data.mode === 'initiative'} onclick={() => instance.setMode('initiative')}>{t('turns.mode-initiative')}</button>
    </div>
    <label class="check">
      <input
        type="checkbox"
        checked={data.pass}
        onchange={(event) => instance.setPass((event.currentTarget as HTMLInputElement).checked)}
      />
      <span>{t('turns.cover')}</span>
    </label>
    <label class="check">
      <input
        type="checkbox"
        checked={data.autoStart}
        onchange={(event) => instance.setAutoStart((event.currentTarget as HTMLInputElement).checked)}
      />
      <span>{t('turns.auto-start')}</span>
    </label>
    <button type="button" class="wide" onclick={saveSettings}>{t('turns.save')}</button>
    <p class="hint">{t('turns.hint')}</p>
  </Sheet>
{/if}

<style>
  .turns {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3);
  }
  .top {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-2);
    color: var(--text-dim);
    font-size: var(--text-sm);
    font-weight: 600;
  }
  .phase-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }
  .phase-chips button {
    min-height: 40px;
    padding: 0 var(--space-3);
    border-radius: var(--radius-pill);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
  }
  .phase-chips button.active {
    background: var(--accent-soft);
    font-weight: 700;
  }

  .lead {
    margin: 0;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: var(--text-xs);
    font-weight: 700;
  }
  h2 {
    margin: var(--space-1) 0;
    font-size: clamp(2rem, 12vw, 3.4rem);
    letter-spacing: -0.02em;
  }
  .phase {
    margin: 0;
    color: var(--text-dim);
    font-weight: 600;
  }
  .clock {
    margin: var(--space-3) 0 0;
    font-size: clamp(2.2rem, 14vw, 3.6rem);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }
  .clock.low {
    color: var(--danger);
  }
  .clock-actions {
    display: flex;
    justify-content: center;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }
  .clock-actions button {
    flex: 1;
    max-width: 12rem;
    min-height: 48px;
    border-radius: var(--radius);
    background: var(--surface-2);
    color: var(--text);
    font-weight: 700;
    cursor: pointer;
  }
  .clock-actions button.primary {
    background: var(--accent);
    color: var(--accent-text);
  }
  .order {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }
  .order button {
    flex: 0 0 auto;
    min-height: 44px;
    padding: 0 var(--space-3);
    border-radius: var(--radius-pill);
    background: var(--surface);
    color: var(--text);
    white-space: nowrap;
    cursor: pointer;
  }
  .order button.active {
    background: var(--accent);
    color: var(--accent-text);
    font-weight: 700;
  }
  .initiative {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .init-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    color: var(--text-dim);
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 700;
  }
  .init-head button {
    min-height: 44px;
    padding: 0 var(--space-4);
    border-radius: var(--radius-pill);
    background: var(--surface-2);
    color: var(--text);
    text-transform: none;
    letter-spacing: normal;
    font-size: var(--text-sm);
    cursor: pointer;
  }
  .init-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-1) var(--space-1) var(--space-4);
    border-radius: var(--radius-pill);
    background: var(--surface);
  }
  .init-row.active {
    background: var(--accent-soft);
  }
  .init-row .who {
    flex: 1;
    min-height: 46px;
    background: transparent;
    color: var(--text);
    font-weight: 700;
    text-align: left;
    box-shadow: none;
    cursor: pointer;
  }
  .init-row.active .who {
    color: var(--accent-deep);
  }
  .stepper {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }
  .stepper button {
    min-width: 44px;
    min-height: 44px;
    border-radius: var(--radius-pill);
    background: var(--surface-2);
    color: var(--text);
    font-size: var(--text-lg);
    cursor: pointer;
  }
  .stepper .value {
    min-width: 2.2rem;
    text-align: center;
    font-family: var(--font-num);
    font-size: var(--text-lg);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .segment {
    display: flex;
    gap: var(--space-1);
    padding: var(--space-1);
    border-radius: var(--radius-pill);
    background: var(--surface-2);
  }
  .segment button {
    flex: 1;
    min-height: 46px;
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
  }
  .segment button.active {
    background: var(--surface);
    color: var(--text);
    font-weight: 700;
    box-shadow: var(--shadow-soft);
  }
  .turn-actions {
    display: flex;
    gap: var(--space-2);
  }
  .turn-actions .next {
    flex: 1;
    min-height: 64px;
    border-radius: var(--radius-lg);
    border: 0;
    background: var(--accent);
    color: var(--accent-text);
    font-size: var(--text-xl);
    font-weight: 800;
    cursor: pointer;
  }
  .turn-actions .previous {
    min-width: 64px;
    min-height: 64px;
    border-radius: var(--radius-lg);
    background: var(--surface);
    color: var(--text);
    font-size: var(--text-xl);
    cursor: pointer;
  }


  .log summary {
    min-height: 44px;
    display: flex;
    align-items: center;
    cursor: pointer;
    color: var(--text-dim);
  }
  .log ol {
    margin: var(--space-1) 0 0;
    padding-left: var(--space-4);
    color: var(--text-dim);
    font-size: var(--text-sm);
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }






  .time-presets {
    display: flex;
    gap: var(--space-1);
  }
  .time-presets button {
    flex: 1;
    min-height: 44px;
    border-radius: var(--radius);
    background: var(--surface-2);
    color: var(--text);
    cursor: pointer;
  }
  .time-presets button.active {
    background: var(--accent-soft);
    font-weight: 700;
  }

</style>
