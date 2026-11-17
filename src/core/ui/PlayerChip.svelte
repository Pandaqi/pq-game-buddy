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

{#if onclick}
  <button type="button" class="chip" class:active class:big={size === 'big'} onclick={onclick} style="--player: {color}">
    {@render content()}
  </button>
{:else}
  <div class="chip" class:active class:big={size === 'big'} style="--player: {color}">
    {@render content()}
  </div>
{/if}

<style>
  .chip {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    border-radius: 999px;
    border: 2px solid var(--line);
    background: var(--surface);
    color: var(--text);
    padding: var(--space-1) var(--space-3) var(--space-1) var(--space-1);
    min-height: 44px;
    font: inherit;
    cursor: default;
  }
  .chip.big {
    font-size: var(--text-lg);
    min-height: 56px;
  }
  .chip.active {
    border-color: var(--player);
    box-shadow: 0 0 0 2px var(--player) inset;
  }
  button.chip {
    cursor: pointer;
  }
  .dot {
    display: inline-grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: var(--player);
    color: #fff;
    font-weight: 800;
    font-size: var(--text-sm);
    letter-spacing: 0.02em;
  }
  .big .dot {
    width: 44px;
    height: 44px;
    font-size: var(--text-base);
  }
  .name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 8rem;
  }
</style>
