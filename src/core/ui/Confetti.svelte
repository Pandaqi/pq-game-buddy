<script lang="ts">
  /** Confetti, allowed exactly once: a finished game with a winner. Purely CSS,
   *  decorative, and skipped entirely under reduced motion. */
  import { onMount } from 'svelte';

  let { active = true }: { active?: boolean } = $props();

  let pieces = $state<{ x: number; delay: number; spin: number; size: number }[]>([]);
  let gone = $state(false);

  onMount(() => {
    if (!active) return;
    const reduce =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || document.documentElement.dataset.motion === 'reduce') {
      gone = true;
      return;
    }
    pieces = Array.from({ length: 26 }, (_, index) => ({
      x: (index * 37) % 100,
      delay: (index % 9) * 40,
      spin: ((index * 53) % 360) - 180,
      size: 7 + (index % 5),
    }));
    const timer = setTimeout(() => (gone = true), 2600);
    return () => clearTimeout(timer);
  });
</script>

{#if !gone}
  <div class="confetti" aria-hidden="true">
    {#each pieces as piece, index (index)}
      <i
        style="--x: {piece.x}%; --d: {piece.delay}ms; --r: {piece.spin}deg; --s: {piece.size}px; --c: {index % 4}"
      ></i>
    {/each}
  </div>
{/if}

<style>
  .confetti {
    position: fixed;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 45;
  }
  i {
    position: absolute;
    top: -12px;
    left: var(--x);
    width: var(--s);
    height: calc(var(--s) * 0.6);
    border-radius: var(--radius-xs);
    background: var(--accent);
    transform: rotate(var(--r));
    animation: fall 1400ms var(--ease-out) var(--d) forwards;
    opacity: 0;
  }
  i:nth-child(4n + 2) {
    background: var(--danger);
  }
  i:nth-child(4n + 3) {
    background: var(--success);
  }
  i:nth-child(4n + 4) {
    background: var(--warning);
  }
  @keyframes fall {
    0% {
      opacity: 1;
      transform: translateY(0) rotate(var(--r));
    }
    100% {
      opacity: 0;
      transform: translateY(65vh) rotate(calc(var(--r) + 220deg));
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .confetti {
      display: none;
    }
  }
  :global(:root[data-motion='reduce']) .confetti {
    display: none;
  }
</style>
