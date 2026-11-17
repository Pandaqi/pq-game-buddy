<script lang="ts">
  import type { ToolContext } from '../../core/registry';
  import Fold from '../../core/ui/Fold.svelte';
  import { facesFor, type DiceInstance } from './logic';

  let { ctx, instance }: { ctx: ToolContext; instance: DiceInstance } = $props();
  const data = $derived(instance.data);

  const QUICK = ['1d6', '2d6', '1d20', '4d6kh3', '2d20kh1', '1d100', '8d10>7', '4dF'];
  let setName = $state('');

  function submit(event: SubmitEvent): void {
    event.preventDefault();
    instance.roll();
  }

  function editFace(index: number, value: string): void {
    const next = data.faces.slice();
    next[index] = value;
    instance.setFaces(next);
  }

  function addFace(): void {
    if (data.faces.length >= 12) return;
    instance.setFaces([...data.faces, 'New face']);
  }

  function removeFace(index: number): void {
    if (data.faces.length <= 2) return;
    instance.setFaces(data.faces.filter((_, at) => at !== index));
  }

  function saveSet(): void {
    instance.saveSet(setName);
    setName = '';
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
    <button type="button" class:active={data.mode === 'lab'} onclick={() => instance.setMode('lab')}>
      Faces
    </button>
  </div>

  {#if data.mode === 'lab'}
    <div class="lab">
      <div class="faces-edit">
        {#each data.faces as face, index (index)}
          <div class="face-row">
            <label>
              <span class="sr-only">Face {index + 1}</span>
              <input
                value={face}
                maxlength="20"
                autocomplete="off"
                oninput={(event) => editFace(index, (event.currentTarget as HTMLInputElement).value)}
              />
            </label>
            <button
              type="button"
              onclick={() => removeFace(index)}
              disabled={data.faces.length <= 2}
              aria-label="Remove the face {face}"
            >✕</button>
          </div>
        {/each}
      </div>
      {#if data.faces.length < 12}
        <button type="button" class="add-face" onclick={addFace}>Add a face</button>
      {/if}
      <p class="breakdown">Two named faces are the minimum. A blank face is skipped.</p>

      <div class="lab-roll">
        <div class="lab-count" role="group" aria-label="Custom dice per roll">
          <button
            type="button"
            aria-label="One fewer die"
            onclick={() => instance.setLabCount(data.labCount - 1)}
            disabled={data.labCount <= 1}
          >−</button>
          <span>{data.labCount} {data.labCount === 1 ? 'die' : 'dice'}</span>
          <button
            type="button"
            aria-label="One more die"
            onclick={() => instance.setLabCount(data.labCount + 1)}
            disabled={data.labCount >= 12}
          >+</button>
        </div>
        <button type="button" class="roll" onclick={() => instance.rollLab()}>Roll</button>
      </div>

      <div class="sets">
        <label>
          <span class="sr-only">Name for this face set</span>
          <input bind:value={setName} placeholder="Name this face set" autocomplete="off" />
        </label>
        <button type="button" onclick={saveSet}>Save set</button>
      </div>
      {#if Object.keys(data.sets).length}
        <div class="quick">
          {#each Object.entries(data.sets) as [name, faces] (name)}
            <span class="set-chip">
              <button type="button" class="macro" onclick={() => instance.loadSet(name)} title={faces.join(' · ')}>
                {name}
              </button>
              <button type="button" class="drop" aria-label="Delete the face set {name}" onclick={() => instance.deleteSet(name)}>✕</button>
            </span>
          {/each}
        </div>
      {/if}
    </div>
  {:else}
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
  {/if}

  {#if data.error}
    <p class="error" role="alert">{data.error}</p>
  {/if}

  <div class="result" aria-live="polite">
    {#if data.mode === 'lab'}
      {#if data.lab}
        <div class="faces">
          {#each data.lab.results as face, index (index)}
            <span class="face custom">{face}</span>
          {/each}
        </div>
        <p class="breakdown">
          {data.lab.tally.map((row) => `${row.face} × ${row.count}`).join(' · ')}
        </p>
      {:else}
        <p class="total idle">—</p>
        <p class="breakdown">Set the faces, then roll. Saved sets are one tap away.</p>
      {/if}
    {:else if data.result}
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

  {#if data.mode !== 'lab' && Object.keys(data.macros).length}
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
  .face.custom {
    padding: var(--space-1) var(--space-3);
    font-family: var(--font-display);
    font-size: var(--text-lg);
    background: var(--accent-soft);
    color: var(--accent-deep);
    animation: pop-in var(--motion-bounce) var(--ease-bounce);
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
  .lab {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .faces-edit {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: var(--space-2);
  }
  .face-row {
    display: flex;
    gap: var(--space-1);
  }
  .face-row label {
    flex: 1;
  }
  .face-row input {
    width: 100%;
    min-height: 48px;
    font-family: var(--font);
    font-size: var(--text-base);
  }
  .face-row button {
    min-width: 44px;
    min-height: 48px;
    border-radius: var(--radius);
    background: var(--surface-2);
    color: var(--text-dim);
    cursor: pointer;
  }
  .face-row button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .add-face {
    align-self: flex-start;
    min-height: 46px;
    padding: 0 var(--space-4);
    border-radius: var(--radius-pill);
    background: var(--surface-2);
    color: var(--text);
    cursor: pointer;
  }
  .lab-roll {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex-wrap: wrap;
  }
  .lab-count {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1);
    border-radius: var(--radius-pill);
    background: var(--surface-2);
  }
  .lab-count button {
    min-width: 44px;
    min-height: 44px;
    border-radius: var(--radius-pill);
    background: var(--surface);
    color: var(--text);
    font-size: var(--text-lg);
    cursor: pointer;
  }
  .lab-count button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .lab-count span {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .lab-roll .roll {
    flex: 1;
    min-width: 8rem;
  }
  .sets {
    display: flex;
    gap: var(--space-2);
  }
  .sets label {
    flex: 1;
  }
  .sets input {
    width: 100%;
    min-height: 48px;
    font-family: var(--font);
    font-size: var(--text-base);
  }
  .sets > button {
    min-height: 48px;
    padding: 0 var(--space-4);
    border-radius: var(--radius-pill);
    background: var(--surface-2);
    color: var(--text);
    font-weight: 700;
    cursor: pointer;
  }
  .set-chip {
    display: inline-flex;
    align-items: center;
    border-radius: var(--radius-pill);
    background: var(--accent-soft);
  }
  .set-chip .macro {
    background: transparent;
    color: var(--accent-deep);
    border-radius: var(--radius-pill) 0 0 var(--radius-pill);
  }
  .set-chip .drop {
    min-width: 44px;
    min-height: 46px;
    background: transparent;
    color: var(--accent-deep);
    cursor: pointer;
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
