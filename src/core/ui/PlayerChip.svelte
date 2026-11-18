<script lang="ts">
  import { seatVars } from '../colour';

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
     the colour does not. The active chip fills with the seat, and core/colour.ts picks
     the ink for that exact colour: cream on every palette seat, deep on anything pale a
     template may name, with the seat nudged one step if neither ink could be read. -->
{#if onclick}
  <button
    type="button"
    class="chip"
    class:active
    class:big={size === 'big'}
    onclick={onclick}
    aria-pressed={active}
    style={seatVars(color)}
  >
    {@render content()}
  </button>
{:else}
  <div class="chip" class:active class:big={size === 'big'} style={seatVars(color)}>
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
  /* Whose turn it is wears their own seat colour: the one place a key is not one of
     the four kinds, because the colour is the identity. */
  .chip.active {
    --cutout-fill: var(--player);
    --cutout-filter: var(--filter-key-soft);
    color: var(--seat-ink, var(--on-seat));
    font-weight: 700;
    box-shadow: none;
  }
  button.chip {
    cursor: pointer;
  }
  button.chip:hover {
    color: var(--text);
    transform: none;
    box-shadow: none;
  }
  button.chip.active:hover {
    --cutout-fill: var(--player);
    color: var(--seat-ink, var(--on-seat));
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
