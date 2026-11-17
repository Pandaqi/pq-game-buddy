<script lang="ts">
  /** Secondary detail behind one tap. Native details, so it is keyboard and
   *  screen-reader friendly without script, and it still works in print. */
  import type { Snippet } from 'svelte';

  let {
    title,
    open = false,
    children,
  }: {
    title: string;
    open?: boolean;
    children: Snippet;
  } = $props();
</script>

<details class="fold" open={open}>
  <summary>{title}</summary>
  <div class="fold-body">
    {@render children()}
  </div>
</details>
