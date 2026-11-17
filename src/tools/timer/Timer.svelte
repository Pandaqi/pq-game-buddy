<script lang="ts">
  import type { ToolContext } from '../../core/registry';
  import { formatDurationText, parseDuration } from '../../core/template/schema';
  import { clock } from '../../core/ticker';
  import Sheet from '../../core/ui/Sheet.svelte';
  import {
    displayMs,
    progressOf,
    type TimerInstance,
    type TimerMode,
    type TimerState,
  } from './logic';

  let { ctx, instance }: { ctx: ToolContext; instance: TimerInstance } = $props();
  const data = $derived(instance.data);

  let nowMono = $state(clock.now());
  let nowWall = $state(clock.wall());
  let settingsOpen = $state(false);
  let menuIndex = $state<number | null>(null);
  let durationText = $state('');
  let pressTimer: ReturnType<typeof setTimeout> | null = null;
  let longPressed = false;
  let moved = false;
  let scrub: { index: number; startX: number; startDuration: number } | null = null;

  const MODE_LABELS: Record<TimerMode, string> = {
    countdown: 'Countdown',
    up: 'Stopwatch',
    flip: 'Flip timer',
    chess: 'Chess clock',
    interval: 'Interval',
    sequence: 'Sequence',
  };

  const QUICK = [30000, 60000, 120000, 180000, 300000, 600000];

  $effect(() => {
    return ctx.clock.subscribe((mono) => {
      nowMono = mono;
      nowWall = ctx.clock.wall();
      instance.tick(mono, nowWall);
    });
  });

  const anyRunning = $derived(data.timers.some((clock) => clock.running));
  const activeClock = $derived(data.timers[data.active] ?? data.timers[0]);
  const tenths = $derived(data.mode === 'up' || data.mode === 'chess');

  function openSettings(): void {
    durationText = formatDurationText(activeClock?.duration ?? 300000);
    settingsOpen = true;
  }

  function applyDurationText(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    const ms = parseDuration(input.value);
    if (ms === null) {
      ctx.toast('That is not a duration. Try 3m or 180s.', 'error');
      input.value = formatDurationText(activeClock?.duration ?? 300000);
      return;
    }
    instance.setDuration(Math.max(0, data.active), ms);
    durationText = formatDurationText(ms);
  }

  function pressStart(index: number): void {
    longPressed = false;
    moved = false;
    if (pressTimer) clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      longPressed = true;
      menuIndex = index;
    }, 550);
  }

  function pressEnd(): void {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  }

  function tap(index: number): void {
    if (longPressed || moved) {
      longPressed = false;
      moved = false;
      return;
    }
    instance.toggle(index);
  }

  function scrubStart(event: PointerEvent, index: number): void {
    if (data.mode === 'chess' || data.mode === 'sequence') return;
    scrub = { index, startX: event.clientX, startDuration: data.timers[index]?.duration ?? 60000 };
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  function scrubMove(event: PointerEvent): void {
    if (!scrub) return;
    const delta = event.clientX - scrub.startX;
    if (Math.abs(delta) > 6) moved = true;
    if (!moved) return;
    const next = Math.round((scrub.startDuration + delta * 400) / 1000) * 1000;
    instance.setDuration(scrub.index, Math.max(1000, next));
    scrub.startDuration = next - delta * 400 > 0 ? Math.max(1000, next) : scrub.startDuration;
  }

  function scrubEnd(): void {
    scrub = null;
  }

  function warnClass(index: number): string {
    const clock = data.timers[index];
    if (!clock) return '';
    const remaining = displayMs(clock, nowMono, nowWall, data.mode);
    if (clock.alarmed) return 'done';
    if (data.mode !== 'up' && data.warnAt > 0 && remaining <= data.warnAt && clock.running) return 'warn';
    return '';
  }
</script>

<div class="timer">
  <div class="topbar">
    <span class="mode-label">{MODE_LABELS[data.mode]}</span>
    <div class="top-actions">
      {#if data.mode === 'chess'}
        <span class="hint">Tap a clock to pass the turn</span>
      {/if}
      <button type="button" class="ghost" onclick={openSettings} aria-label="Timer settings">Settings</button>
    </div>
  </div>

  <div class="cards {data.layout}" class:mode-flip={data.mode === 'flip'}>
    {#each data.timers as clock, index (clock.id)}
      <div
        class="card {warnClass(index)}"
        class:active={data.mode === 'chess' && data.active === index}
        style="--clock: {clock.color}"
      >
        <button
          type="button"
          class="digits"
          aria-label="{clock.name}: {instance.clockLabel(index, nowMono, nowWall)}. {clock.running
            ? 'Tap to pause'
            : 'Tap to start'}"
          onpointerdown={(event) => {
            pressStart(index);
            scrubStart(event, index);
          }}
          onpointermove={scrubMove}
          onpointerup={() => {
            pressEnd();
            scrubEnd();
          }}
          onpointercancel={() => {
            pressEnd();
            scrubEnd();
          }}
          onpointerleave={scrubEnd}
          onclick={() => tap(index)}
        >
          <span class="name">{clock.name}</span>
          <span class="time">{instance.clockLabel(index, nowMono, nowWall)}</span>
          <span class="bar" aria-hidden="true">
            <i style="width: {Math.round(progressOf(clock, nowMono, nowWall) * 100)}%"></i>
          </span>
          {#if clock.alarmed}
            <span class="flag">{data.mode === 'chess' ? 'Flag' : 'Time up'}</span>
          {:else if clock.laps.length}
            <span class="flag quiet">{clock.laps.length} intervals</span>
          {/if}
        </button>

        <div class="row">
          <button type="button" onclick={() => instance.shift(index, -30000)} aria-label="Minus 30 seconds">−30s</button>
          <button type="button" onclick={() => instance.shift(index, 30000)} aria-label="Plus 30 seconds">+30s</button>
          <button type="button" onclick={() => instance.reset(index)} aria-label="Reset {clock.name}">Reset</button>
          <button type="button" onclick={() => (menuIndex = index)} aria-label="More for {clock.name}">⋯</button>
        </div>
      </div>
    {/each}
  </div>

  {#if data.mode === 'sequence'}
    <div class="phases">
      {#each data.timers as phase, index (phase.id)}
        <button
          type="button"
          class="phase"
          class:current={data.active === index}
          onclick={() => instance.goToPhase(index, true)}
        >
          <span>{index + 1}. {phase.name}</span>
          <small>{formatDurationText(phase.duration)}</small>
        </button>
      {/each}
    </div>
  {/if}

  <div class="controls">
    <button type="button" class="primary" onclick={() => (anyRunning ? instance.pauseAll() : instance.startAll())}>
      {anyRunning ? 'Pause' : 'Start'}
    </button>
    <button type="button" onclick={() => instance.resetAll()}>Reset</button>
    {#if data.mode !== 'chess' && data.mode !== 'sequence'}
      <button type="button" onclick={() => instance.addTimer()}>Add timer</button>
    {/if}
  </div>

  {#if data.mode === 'countdown' || data.mode === 'up' || data.mode === 'flip'}
    <div class="quick">
      {#each QUICK as ms (ms)}
        <button type="button" onclick={() => instance.setDuration(data.active, ms)}>{formatDurationText(ms)}</button>
      {/each}
    </div>
  {/if}

  {#if !data.timers.length}
    <p class="hint">Add a timer to get going.</p>
  {/if}
</div>

{#if settingsOpen}
  <Sheet title="Timer settings" onclose={() => (settingsOpen = false)}>
    <label class="field">
      <span>Mode</span>
      <select
        value={data.mode}
        onchange={(event) => instance.applySettings({ mode: (event.currentTarget as HTMLSelectElement).value as TimerMode })}
      >
        {#each Object.entries(MODE_LABELS) as [value, label] (value)}
          <option {value}>{label}</option>
        {/each}
      </select>
    </label>

    <label class="field">
      <span>Duration</span>
      <input type="text" inputmode="text" value={durationText} onchange={applyDurationText} />
    </label>

    <label class="field">
      <span>Warn at</span>
      <input
        type="text"
        value={formatDurationText(data.warnAt)}
        onchange={(event) => {
          const ms = parseDuration((event.currentTarget as HTMLInputElement).value);
          if (ms === null) ctx.toast('That reads as no time at all. Try 30s or 2m.', 'error');
          else instance.applySettings({ warnAt: ms });
        }}
      />
    </label>

    <label class="field">
      <span>Sound</span>
      <select
        value={data.sound}
        onchange={(event) => instance.applySettings({ sound: (event.currentTarget as HTMLSelectElement).value as TimerState['sound'] })}
      >
        <option value="bell">Bell</option>
        <option value="buzzer">Buzzer</option>
        <option value="gong">Gong</option>
        <option value="none">Silent</option>
      </select>
    </label>

    <label class="field">
      <span>Vibration</span>
      <select
        value={data.haptic}
        onchange={(event) => instance.applySettings({ haptic: (event.currentTarget as HTMLSelectElement).value as TimerState['haptic'] })}
      >
        <option value="short">Short</option>
        <option value="long">Long</option>
        <option value="none">Off</option>
      </select>
    </label>

    <label class="field">
      <span>Layout</span>
      <select
        value={data.layout}
        onchange={(event) => instance.applySettings({ layout: (event.currentTarget as HTMLSelectElement).value as TimerState['layout'] })}
      >
        <option value="single">Single</option>
        <option value="grid">Grid</option>
        <option value="list">List</option>
      </select>
    </label>

    {#if data.mode === 'chess'}
      <label class="field">
        <span>Increment</span>
        <input
          type="text"
          value={formatDurationText(data.increment)}
          onchange={(event) => {
            const ms = parseDuration((event.currentTarget as HTMLInputElement).value);
            if (ms !== null) instance.applySettings({ increment: ms });
          }}
        />
      </label>
      <label class="field">
        <span>Delay</span>
        <input
          type="text"
          value={formatDurationText(data.delay)}
          onchange={(event) => {
            const ms = parseDuration((event.currentTarget as HTMLInputElement).value);
            if (ms !== null) instance.applySettings({ delay: ms });
          }}
        />
      </label>
    {/if}

    {#if data.mode === 'interval'}
      <label class="field">
        <span>Every</span>
        <input
          type="text"
          value={formatDurationText(data.interval)}
          onchange={(event) => {
            const ms = parseDuration((event.currentTarget as HTMLInputElement).value);
            if (ms !== null) instance.applySettings({ interval: ms });
          }}
        />
      </label>
    {/if}

    <button type="button" class="wide" onclick={() => instance.usePlayers()}>Use player names</button>
    <button type="button" class="wide" onclick={() => instance.addTimer()}>Add timer</button>
  </Sheet>
{/if}

{#if menuIndex !== null && data.timers[menuIndex]}
  <Sheet title={data.timers[menuIndex].name} onclose={() => (menuIndex = null)}>
    <label class="field">
      <span>Name</span>
      <input
        type="text"
        value={data.timers[menuIndex].name}
        onchange={(event) => {
          if (menuIndex === null) return;
          instance.renameTimer(menuIndex, (event.currentTarget as HTMLInputElement).value);
        }}
      />
    </label>
    <label class="field">
      <span>Duration</span>
      <input
        type="text"
        value={formatDurationText(data.timers[menuIndex].duration)}
        onchange={(event) => {
          if (menuIndex === null) return;
          const ms = parseDuration((event.currentTarget as HTMLInputElement).value);
          if (ms === null) ctx.toast('That reads as no time at all. Try 30s or 2m.', 'error');
          else instance.setDuration(menuIndex, ms);
        }}
      />
    </label>
    <button
      type="button"
      class="wide danger"
      onclick={() => {
        if (menuIndex === null) return;
        instance.removeTimer(menuIndex);
        menuIndex = null;
      }}
    >
      Remove this timer
    </button>
  </Sheet>
{/if}

<style>
  .timer {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-3) var(--space-6);
  }
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }
  .mode-label {
    font-weight: 700;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: var(--text-xs);
  }
  .top-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }


  .cards {
    display: grid;
    gap: var(--space-3);
  }
  .cards.grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .cards.list {
    grid-template-columns: minmax(0, 1fr);
  }
  @media (min-width: 40rem) {
    .cards.grid {
      grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    }
  }
  .card {
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .digits {
    box-shadow: var(--shadow-card);
  }
  .card.active .digits {
    box-shadow: var(--shadow-card), inset 0 0 0 3px var(--clock);
  }
  .card.warn .digits {
    background: var(--warning-soft);
  }
  .card.warn .time {
    color: var(--warning);
  }
  .card.done .digits {
    background: var(--danger-soft);
    box-shadow: var(--shadow-card), inset 0 0 0 3px var(--danger);
  }
  .card.done .time {
    color: var(--danger);
  }
  .digits {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    align-items: stretch;
    background: var(--surface);
    border: 0;
    border-radius: var(--radius-card);
    padding: var(--space-4);
    color: var(--text);
    cursor: pointer;
    text-align: left;
    touch-action: none;
    user-select: none;
    min-height: 96px;
  }
  .name {
    font-size: var(--text-sm);
    color: var(--text-dim);
    font-weight: 600;
  }
  .time {
    font-size: clamp(3rem, 17vw, 5rem);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    letter-spacing: -0.02em;
  }
  .bar {
    display: block;
    height: 8px;
    border-radius: var(--radius-pill);
    background: var(--line-soft);
    overflow: hidden;
  }
  .bar i {
    display: block;
    height: 100%;
    background: var(--clock);
    transition: width 120ms linear;
  }
  .flag {
    font-size: var(--text-sm);
    font-weight: 700;
    color: var(--danger);
  }
  .flag.quiet {
    color: var(--text-dim);
  }


  .controls {
    display: flex;
    gap: var(--space-2);
    position: sticky;
    bottom: 0;
    padding: var(--space-2) 0;
    background: linear-gradient(to top, var(--bg) 70%, transparent);
  }
  .controls button {
    flex: 1;
    min-height: 56px;
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--text);
    font-size: var(--text-base);
    font-weight: 600;
    cursor: pointer;
  }
  .controls .primary {
    background: var(--accent);
    color: var(--accent-text);
    flex: 2;
    font-size: var(--text-lg);
  }
  .quick {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .quick button {
    min-height: 44px;
    padding: 0 var(--space-3);
    border-radius: var(--radius-pill);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
  }
  .phases {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .phase {
    display: flex;
    justify-content: space-between;
    min-height: 44px;
    align-items: center;
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--text);
    padding: 0 var(--space-3);
    cursor: pointer;
  }
  .phase.current {
    background: var(--accent-soft);
    box-shadow: var(--shadow-soft);
    font-weight: 700;
  }

  .field span {
    font-size: var(--text-sm);
    color: var(--text-dim);
    font-weight: 600;
  }
  .field input,
  .field select {
    border: 0;
    min-height: 48px;
    background: var(--surface-2);
    color: var(--text);
    padding: 0 var(--space-3);
    font: inherit;
  }

</style>
