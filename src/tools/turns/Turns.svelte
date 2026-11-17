<script lang="ts">
  import type { ToolContext } from '../../core/registry';
  import PassThePhone from '../../core/ui/PassThePhone.svelte';
  import Sheet from '../../core/ui/Sheet.svelte';
  import { formatClock } from '../../core/template/schema';
  import { currentName, currentPhase, type TurnsInstance } from './logic';

  let { ctx, instance }: { ctx: ToolContext; instance: TurnsInstance } = $props();
  const data = $derived(instance.data);

  let settingsOpen = $state(false);
  let passing = $state(false);
  let orderDraft = $state('');
  let phasesDraft = $state('');
  let secondsDraft = $state(0);

  const who = $derived(currentName(data));
  const phase = $derived(currentPhase(data));

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
    orderDraft = data.order.join(', ');
    phasesDraft = data.phases.join(', ');
    secondsDraft = Math.round(data.timer.duration / 1000);
    settingsOpen = true;
  }

  function saveSettings(): void {
    ctx.undo.batch('turn settings', () => {
      instance.setOrder(orderDraft.split(','));
      instance.setPhases(phasesDraft.split(','));
      instance.setDuration(Math.max(0, secondsDraft) * 1000);
    });
    settingsOpen = false;
  }
</script>

<div class="turns">
  <div class="top">
    <span class="round">Round {data.round}</span>
    <div class="phase-chips" role="group" aria-label="Phase">
      {#each data.phases as item, index (index)}
        <button type="button" class:active={index === data.phase} aria-pressed={index === data.phase} onclick={() => instance.setPhase(index)}>
          {item}
        </button>
      {/each}
    </div>
  </div>

  <div class="stage">
    <p class="lead">It is the turn of</p>
    <h2 aria-live="polite">{who}</h2>
    <p class="phase">{phase}</p>

    {#if data.timer.duration > 0}
      <p class="clock" class:low={data.timer.remaining <= 10000}>{formatClock(data.timer.remaining)}</p>
      <div class="clock-actions">
        {#if data.timer.running}
          <button type="button" onclick={() => instance.pauseTimer()}>Pause clock</button>
        {:else}
          <button type="button" class="primary" onclick={() => instance.startTimer()}>Start clock</button>
        {/if}
        <button type="button" onclick={() => instance.resetTimer()}>Reset clock</button>
      </div>
    {/if}
  </div>

  {#if data.order.length > 1}
    <div class="order" role="group" aria-label="Turn order">
      {#each data.order as item, index (item + index)}
        <button
          type="button"
          class:active={index === data.index}
          aria-current={index === data.index ? 'true' : undefined}
          onclick={() => jump(index)}
        >
          {item}
        </button>
      {/each}
    </div>
  {/if}

  <div class="turn-actions">
    <button type="button" class="previous" onclick={() => instance.previous()} aria-label="Previous turn">←</button>
    <button type="button" class="next" onclick={nextTurn}>Next turn</button>
  </div>

  <div class="row">
    <button type="button" onclick={openSettings}>Settings</button>
    <button type="button" onclick={() => instance.syncPlayers()}>Use session players</button>
  </div>

  <details class="log">
    <summary>Turn log ({data.log.length})</summary>
    {#if data.log.length}
      <ol>
        {#each data.log as entry, index (index)}
          <li>{entry.text}</li>
        {/each}
      </ol>
      <button type="button" class="ghost" onclick={() => instance.clearLog()}>Clear log</button>
    {:else}
      <p class="hint">No turns taken yet. Press next turn and the log starts here.</p>
    {/if}
  </details>

  <button type="button" class="ghost" onclick={() => instance.resetTurn()}>Start over</button>
</div>

{#if passing}
  <PassThePhone
    name={who}
    hint={`Round ${data.round} · ${phase}`}
    action="Start turn"
    onshow={startAfterPass}
  />
{/if}

{#if settingsOpen}
  <Sheet title="Turn settings" onclose={() => (settingsOpen = false)}>
    <label class="field">
      <span>Turn order (comma separated)</span>
      <input type="text" bind:value={orderDraft} placeholder="Ada, Bo, Cy" />
    </label>
    <label class="field">
      <span>Phases</span>
      <input type="text" bind:value={phasesDraft} placeholder="Turn, Buy, Fight" />
    </label>
    <label class="field">
      <span>Turn timer in seconds (0 = none)</span>
      <input type="number" min="0" max="86400" bind:value={secondsDraft} />
    </label>
    <div class="time-presets" role="group" aria-label="Timer presets">
      {#each [0, 30, 60, 120, 300] as seconds (seconds)}
        <button type="button" class:active={secondsDraft === seconds} onclick={() => (secondsDraft = seconds)}>
          {seconds === 0 ? 'Off' : seconds < 60 ? `${seconds}s` : `${seconds / 60}m`}
        </button>
      {/each}
    </div>
    <label class="check">
      <input
        type="checkbox"
        checked={data.pass}
        onchange={(event) => instance.setPass((event.currentTarget as HTMLInputElement).checked)}
      />
      <span>Cover the screen when the turn changes</span>
    </label>
    <label class="check">
      <input
        type="checkbox"
        checked={data.autoStart}
        onchange={(event) => instance.setAutoStart((event.currentTarget as HTMLInputElement).checked)}
      />
      <span>Start the clock automatically</span>
    </label>
    <button type="button" class="wide" onclick={saveSettings}>Save settings</button>
    <p class="hint">The screen is kept awake while the turn clock runs.</p>
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
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
  }
  .phase-chips button.active {
    border-color: var(--accent);
    background: var(--accent-soft);
    font-weight: 700;
  }
  .stage {
    text-align: center;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
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
    border: 1px solid var(--line);
    background: var(--surface-2);
    color: var(--text);
    font-weight: 700;
    cursor: pointer;
  }
  .clock-actions button.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-text);
  }
  .order {
    display: flex;
    gap: var(--space-1);
    overflow-x: auto;
    padding-bottom: var(--space-1);
  }
  .order button {
    flex: 0 0 auto;
    min-height: 44px;
    padding: 0 var(--space-3);
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    white-space: nowrap;
    cursor: pointer;
  }
  .order button.active {
    border-color: var(--accent);
    background: var(--accent);
    color: var(--accent-text);
    font-weight: 700;
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
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    font-size: var(--text-xl);
    cursor: pointer;
  }
  .row {
    display: flex;
    gap: var(--space-2);
  }
  .row button {
    flex: 1;
    min-height: 48px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
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
  .ghost {
    min-height: 44px;
    border-radius: var(--radius);
    border: 0;
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
  }
  .hint {
    margin: 0;
    color: var(--text-dim);
    font-size: var(--text-sm);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    color: var(--text-dim);
  }
  .field input {
    min-height: 48px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface-2);
    color: var(--text);
    padding: 0 var(--space-3);
    font: inherit;
  }
  .check {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-height: 48px;
  }
  .check input {
    width: 24px;
    height: 24px;
  }
  .time-presets {
    display: flex;
    gap: var(--space-1);
  }
  .time-presets button {
    flex: 1;
    min-height: 44px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface-2);
    color: var(--text);
    cursor: pointer;
  }
  .time-presets button.active {
    border-color: var(--accent);
    background: var(--accent-soft);
    font-weight: 700;
  }
  .wide {
    min-height: 48px;
    border-radius: var(--radius);
    border: 0;
    background: var(--accent);
    color: var(--accent-text);
    font-weight: 700;
    cursor: pointer;
  }
</style>
