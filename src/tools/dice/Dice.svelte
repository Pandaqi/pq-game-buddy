<script lang="ts">
  import type { ToolContext } from '../../core/registry';
  import Fold from '../../core/ui/Fold.svelte';
  import { facesFor, type DiceInstance } from './logic';

  let { ctx, instance }: { ctx: ToolContext; instance: DiceInstance } = $props();
  const data = $derived(instance.data);

  const QUICK = ['1d6', '2d6', '1d20', '4d6kh3', '2d20kh1', '1d100', '8d10>7', '4dF'];

  function submit(event: SubmitEvent): void {
    event.preventDefault();
    instance.roll();
  }
</script>

<div class="dice">
  <div class="modes" role="group" aria-label="Roll mode">
    <button type="button" class:active={data.mode === 'single'} onclick={() => instance.setMode('single')}>
      Dice
    </button>
    <button type="button" class:active={data.mode === 'pool'} onclick={() => instance.setMode('pool')}>
      Pool
    </button>
  </div>

  <form class="entry" onsubmit={submit}>
    {#if data.mode === 'pool'}
      <label class="sr-only" for="dice-pool">Dice pool</label>
      <input
        id="dice-pool"
        value={data.pool}
        placeholder="4d6+2d8"
        autocomplete="off"
        spellcheck="false"
        oninput={(event) => instance.setPool((event.currentTarget as HTMLInputElement).value)}
      />
    {:else}
      <label class="sr-only" for="dice-notation">Dice notation</label>
      <input
        id="dice-notation"
        value={data.notation}
        placeholder="2d6+1"
        autocomplete="off"
        spellcheck="false"
        oninput={(event) => instance.setNotation((event.currentTarget as HTMLInputElement).value)}
      />
    {/if}
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
      <p class="total idle">—</p>
      <p class="breakdown">
        {data.mode === 'pool' ? 'Roll the pool.' : `Press roll for ${data.notation || 'a die'}.`}
      </p>
    {/if}
  </div>

  {#if data.mode === 'single'}
    <div class="quick">
      {#each QUICK as notation (notation)}
        <button type="button" onclick={() => instance.roll(notation)}>{notation}</button>
      {/each}
    </div>
  {/if}

  {#if Object.keys(data.macros).length}
    <div class="quick">
      {#each Object.entries(data.macros) as [name, notation] (name)}
        <button type="button" class="macro" onclick={() => instance.roll(notation)}>{name}</button>
      {/each}
    </div>
  {/if}

  <Fold title="Roll options">
    <div class="options">
    {#if data.mode === 'single'}
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
    {/if}
    <label>
      <span>Success at</span>
      <input
        type="number"
        min="0"
        max="100"
        value={data.successAt}
        onchange={(event) => instance.setSuccessAt(Number((event.currentTarget as HTMLInputElement).value))}
        placeholder="0 = off"
      />
    </label>
    <label>
      <span>Seed (optional)</span>
      <input
        type="text"
        value={data.seed}
        placeholder="repeatable rolls"
        onchange={(event) => instance.setSeed((event.currentTarget as HTMLInputElement).value)}
      />
    </label>
    </div>
  </Fold>

  {#if data.history.length}
    <Fold title="Recent rolls">
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
    </Fold>
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
    border: 0;
    flex: 1;
    min-height: 56px;
    background: var(--surface);
    color: var(--text);
    padding: 0 var(--space-3);
    font-size: var(--text-lg);
    font-family: var(--font-mono);
  }
  input:focus-visible {
    border: 0;
  }
  .roll {
    min-width: 110px;
    min-height: 56px;
    border-radius: var(--radius-pill);
    background: var(--accent);
    color: var(--accent-text);
    box-shadow: var(--shadow-key);
    font-size: var(--text-xl);
    font-weight: 800;
    cursor: pointer;
  }
  .error {
    color: var(--danger);
    margin: 0;
  }
  .result {
    padding: var(--space-4) 0 var(--space-2);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    align-items: center;
  }
  .total {
    margin: 0;
    font-size: clamp(4.5rem, 26vw, 8rem);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    line-height: 0.9;
    color: var(--accent);
    text-shadow: 0 5px 0 var(--accent-soft);
    animation: pop-in var(--motion-bounce) var(--ease-bounce);
  }
  .total.idle {
    color: var(--text-faint);
    text-shadow: none;
    font-size: clamp(3.5rem, 18vw, 5.5rem);
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
    font-size: var(--text-base);
    text-align: center;
  }
  .quick {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .quick button {
    min-height: 46px;
    padding: 0 var(--space-4);
    border-radius: var(--radius-pill);
    background: var(--surface-2);
    color: var(--text);
    font-size: var(--text-base);
    font-weight: 600;
    cursor: pointer;
  }
  .quick button.macro {
    font-family: var(--font);
    font-weight: 700;
    background: var(--accent-soft);
    color: var(--accent-deep);
  }
  .options {
    display: grid;
    gap: var(--space-2);
    grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
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
    border: 0;
    min-height: 48px;
    background: var(--surface-2);
    color: var(--text);
    padding: 0 var(--space-2);
    font-size: var(--text-base);
    font-family: var(--font);
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  h2 {
    font-size: var(--text-base);
    margin: 0;
  }
  header button {
    min-height: 44px;
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
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-pill);
    background: var(--surface-2);
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
