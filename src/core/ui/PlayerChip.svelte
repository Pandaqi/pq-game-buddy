<script lang="ts">
  let {
    name,
    initial,
    color,
    active = false,
    size = 'normal',
    onclick,
  }: {
    name: string;
    initial: string;
    color: string;
    active?: boolean;
    size?: 'normal' | 'big';
    onclick?: () => void;
  } = $props();
</script>

{#snippet content()}
  <span class="dot" aria-hidden="true">{initial}</span>
  <span class="name">{name}</span>
{/snippet}

<!-- The seat colour is a ring around the initials, so the chip still reads when
     the colour does not: no white text sitting on a mid-tone fill. -->
{#if onclick}
  <button
    type="button"
    class="chip"
    class:active
    class:big={size === 'big'}
    onclick={onclick}
    aria-pressed={active}
    style="--player: {color}"
  >
    {@render content()}
  </button>
{:else}
  <div class="chip" class:active class:big={size === 'big'} style="--player: {color}">
    {@render content()}
  </div>
{/if}

<style>
  /* Quiet when idle, a solid seat colour when active. No outline, so the strip
     reads as names on paper until someone's turn lights up. */
  .chip {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    border-radius: var(--radius-pill);
    background: transparent;
    color: var(--text-dim);
    box-shadow: none;
    padding: var(--space-1) var(--space-3) var(--space-1) var(--space-1);
    min-height: 48px;
    font: inherit;
    cursor: default;
  }
  .chip.big {
    font-size: var(--text-lg);
    min-height: 60px;
  }
  .chip.active {
    background: var(--player);
    color: var(--on-seat);
    font-weight: 700;
    box-shadow: var(--shadow-soft);
  }
  button.chip {
    cursor: pointer;
  }
  button.chip:hover {
    background: var(--surface-2);
    color: var(--text);
    transform: none;
    box-shadow: none;
  }
  button.chip.active:hover {
    background: var(--player);
    color: var(--on-seat);
  }
  .dot {
    display: inline-grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: var(--radius-round);
    background: var(--player);
    color: var(--on-seat);
    font-family: var(--font-display);
    font-weight: 800;
    font-size: var(--text-sm);
    letter-spacing: 0.02em;
  }
  .big .dot {
    width: 44px;
    height: 44px;
    font-size: var(--text-base);
  }
  .active .dot {
    background: var(--surface);
    color: var(--text);
    box-shadow: none;
  }
  .name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 8rem;
  }
</style>
