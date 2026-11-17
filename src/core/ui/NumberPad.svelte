<script lang="ts">
  let {
    value = 0,
    label = 'Value',
    onsubmit,
    oncancel,
  }: {
    value?: number;
    label?: string;
    onsubmit: (value: number) => void;
    oncancel: () => void;
  } = $props();

  let draft = $state('');

  // Seed the field from the caller without capturing a stale prop value.
  $effect(() => {
    draft = String(value);
  });

  const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '±', '0', '⌫'];

  function press(key: string): void {
    if (key === '⌫') {
      draft = draft.slice(0, -1);
      return;
    }
    if (key === '±') {
      draft = draft.startsWith('-') ? draft.slice(1) : `-${draft || '0'}`;
      return;
    }
    if (draft === '0') draft = key;
    else draft += key;
  }

  function submit(): void {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      onsubmit(0);
      return;
    }
    onsubmit(parsed);
  }
</script>

<div class="pad">
  <output aria-live="polite" aria-label={label}>{draft || '0'}</output>
  <div class="keys">
    {#each KEYS as key (key)}
      <button type="button" onclick={() => press(key)} aria-label={key === '⌫' ? 'Backspace' : key}>
        {key}
      </button>
    {/each}
  </div>
  <div class="actions">
    <button type="button" class="cancel" onclick={oncancel}>Cancel</button>
    <button type="button" class="ok" onclick={submit}>Set</button>
  </div>
</div>

<style>
  .pad {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  output {
    display: block;
    text-align: right;
    font-size: clamp(2rem, 12vw, 3rem);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    padding: var(--space-2);
    border-radius: var(--radius);
    background: var(--surface-2);
    min-height: 4rem;
  }
  .keys {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-2);
  }
  .keys button {
    min-height: 56px;
    font-size: var(--text-xl);
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
  }
  .keys button:active {
    background: var(--surface-2);
  }
  .actions {
    display: flex;
    gap: var(--space-2);
  }
  .actions button {
    flex: 1;
    min-height: 56px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    font-size: var(--text-lg);
    cursor: pointer;
  }
  .cancel {
    background: var(--surface);
    color: var(--text);
  }
  .ok {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-text);
    font-weight: 700;
  }
</style>
