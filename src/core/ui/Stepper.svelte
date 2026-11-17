<script lang="ts">
  let {
    label,
    value,
    min = 0,
    max = 99,
    step = 1,
    onchange,
  }: {
    label: string;
    value: number;
    min?: number;
    max?: number;
    step?: number;
    onchange: (value: number) => void;
  } = $props();

  function clamp(next: number): number {
    return Math.min(max, Math.max(min, Math.round(next)));
  }
</script>

<div class="stepper">
  <span class="value" aria-live="polite">{value}</span>
  <div class="buttons">
    <button type="button" onclick={() => onchange(clamp(value - step))} aria-label="Decrease {label}">−</button>
    <button type="button" onclick={() => onchange(clamp(value + step))} aria-label="Increase {label}">+</button>
  </div>
</div>

<style>
  .stepper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    min-height: 56px;
  }
  .value {
    font-size: var(--text-lg);
    font-variant-numeric: tabular-nums;
    font-weight: 700;
  }
  .buttons {
    display: flex;
    gap: var(--space-2);
  }
  button {
    min-width: 56px;
    min-height: 48px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface-2);
    color: var(--text);
    font-size: var(--text-lg);
    font-weight: 700;
    cursor: pointer;
  }
  button:hover {
    border-color: var(--accent);
  }
</style>
