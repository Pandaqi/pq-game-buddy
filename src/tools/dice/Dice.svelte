<script lang="ts">
  import type { ToolContext } from '../../core/registry';
  import { facesFor, type DiceInstance } from './logic';

  let { ctx, instance }: { ctx: ToolContext; instance: DiceInstance } = $props();
  const data = $derived(instance.data);

  const QUICK = ['1d6', '2d6', '1d20', '4d6kh3', '2d20kh1', '1d100', '8d10>7', '4dF'];

  let draft = $state('');

  // Follow the tool's notation without capturing a stale initial value.
  $effect(() => {
    draft = data.notation;
  });

  function submit(event: SubmitEvent): void {
    event.preventDefault();
    instance.roll(draft);
  }
</script>

<div class="dice">
  <form class="entry" onsubmit={submit}>
    <label class="sr-only" for="dice-notation">Dice notation</label>
    <input id="dice-notation" bind:value={draft} placeholder="2d6+1" autocomplete="off" spellcheck="false" />
    <button type="submit" class="roll">Roll</button>
  </form>

  {#if data.error}
    <p class="error" role="alert">{data.error}</p>
  {/if}

  <div class="result" aria-live="polite">
    {#if data.result}
      <p class="total">
        {data.result.total}
        {#if data.result.successes}
          <span class="successes">{data.result.successes} successes</span>
        {/if}
      </p>
      <div class="faces">
        {#each data.result.terms as term, termIndex (termIndex)}
          {#each term.rolls as value, index (index)}
            <span class="face" class:dropped={!term.kept.includes(value)} class:fate={term.sides === 0}>
              {facesFor(value, term.sides)}
            </span>
          {/each}
          {#if termIndex < data.result.terms.length - 1}
            <span class="plus">{term.sign < 0 ? '−' : '+'}</span>
          {/if}
        {/each}
      </div>
      {#if data.showBreakdown}
        <p class="breakdown">
          {data.result.terms.map((term) => `${term.sign < 0 ? '−' : ''}${term.source} (${term.kept.join(', ')})`).join(' ')}
        </p>
      {/if}
    {:else}
      <p class="total">—</p>
      <p class="breakdown">Press roll for a {data.notation}.</p>
    {/if}
  </div>

  <div class="quick">
    {#each QUICK as notation (notation)}
      <button type="button" onclick={() => { draft = notation; instance.roll(notation); }}>{notation}</button>
    {/each}
  </div>

  <div class="options">
    <label>
      <span>Advantage</span>
      <select
        value={data.advantage}
        onchange={(event) => instance.setAdvantage((event.currentTarget as HTMLSelectElement).value as typeof data.advantage)}
      >
        <option value="none">None</option>
        <option value="advantage">Advantage</option>
        <option value="disadvantage">Disadvantage</option>
      </select>
    </label>
    <label>
      <span>Seed (optional)</span>
      <input
        type="text"
        value={data.seed}
        placeholder="for repeatable rolls"
        onchange={(event) => instance.setSeed((event.currentTarget as HTMLInputElement).value)}
      />
    </label>
  </div>

  {#if data.history.length}
    <section class="history">
      <header>
        <h2>History</h2>
        <button type="button" onclick={() => instance.clearHistory()}>Clear</button>
      </header>
      <ol>
        {#each data.history as item, index (index)}
          <li>
            <span class="nota">{item.notation}</span>
            <span class="sum">{item.total}</span>
          </li>
        {/each}
      </ol>
    </section>
  {/if}
</div>

<style>
  .dice {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3);
  }
  .entry {
    display: flex;
    gap: var(--space-2);
  }
  input {
    flex: 1;
    min-height: 56px;
    border-radius: var(--radius);
    border: 2px solid var(--line);
    background: var(--surface);
    color: var(--text);
    padding: 0 var(--space-3);
    font-size: var(--text-lg);
    font-family: var(--font-mono);
  }
  input:focus-visible {
    border-color: var(--accent);
  }
  .roll {
    min-width: 96px;
    min-height: 56px;
    border-radius: var(--radius);
    border: 0;
    background: var(--accent);
    color: var(--accent-text);
    font-size: var(--text-lg);
    font-weight: 700;
    cursor: pointer;
  }
  .error {
    color: var(--danger);
    margin: 0;
  }
  .result {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    align-items: center;
  }
  .total {
    margin: 0;
    font-size: clamp(2.6rem, 16vw, 4.5rem);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }
  .successes {
    display: block;
    font-size: var(--text-base);
    font-weight: 600;
    color: var(--text-dim);
    margin-top: var(--space-1);
  }
  .faces {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    justify-content: center;
    align-items: center;
  }
  .face {
    display: inline-grid;
    place-items: center;
    min-width: 44px;
    min-height: 44px;
    padding: 0 var(--space-2);
    border-radius: var(--radius);
    background: var(--surface-2);
    border: 1px solid var(--line);
    font-size: var(--text-xl);
    font-weight: 700;
  }
  .face.fate {
    color: var(--text-dim);
  }
  .face.dropped {
    opacity: 0.45;
    text-decoration: line-through;
  }
  .plus {
    color: var(--text-dim);
    font-weight: 700;
  }
  .breakdown {
    margin: 0;
    color: var(--text-dim);
    font-size: var(--text-sm);
    text-align: center;
  }
  .quick {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .quick button {
    min-height: 44px;
    padding: 0 var(--space-3);
    border-radius: 999px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    font-family: var(--font-mono);
    cursor: pointer;
  }
  .options {
    display: grid;
    gap: var(--space-2);
    grid-template-columns: 1fr 1fr;
  }
  .options label {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: var(--text-sm);
    color: var(--text-dim);
  }
  .options select,
  .options input {
    min-height: 48px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--surface-2);
    color: var(--text);
    padding: 0 var(--space-2);
    font-size: var(--text-base);
  }
  .history header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  h2 {
    font-size: var(--text-base);
    margin: 0;
  }
  .history button {
    min-height: 44px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    border-radius: var(--radius);
    padding: 0 var(--space-3);
    cursor: pointer;
  }
  ol {
    list-style: none;
    margin: var(--space-2) 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  li {
    display: flex;
    justify-content: space-between;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius);
    background: var(--surface);
    border: 1px solid var(--line);
    font-variant-numeric: tabular-nums;
  }
  .nota {
    font-family: var(--font-mono);
    color: var(--text-dim);
  }
  .sum {
    font-weight: 700;
  }
</style>
