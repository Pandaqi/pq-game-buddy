<script lang="ts">
  import type { ToolContext } from '../../core/registry';
  import Sheet from '../../core/ui/Sheet.svelte';
  import { colTotal, rowTotal, type FieldType } from './logic';
  import type { CustomInstance } from './tool.svelte';

  let { ctx, instance }: { ctx: ToolContext; instance: CustomInstance } = $props();
  const data = $derived(instance.data);

  let builderOpen = $state(false);
  let fieldLabel = $state('');
  let fieldType = $state<FieldType>('text');
  let counterLabel = $state('');
  let checkLabel = $state('');
  let formulaDraft = $state('');
  let sizeDraft = $state('3x3');
  let playerDraft = $state('');

  const result = $derived(instance.formulaResult());

  function openBuilder(): void {
    fieldLabel = '';
    counterLabel = '';
    checkLabel = '';
    formulaDraft = data.formula;
    sizeDraft = `${data.table.rows}x${data.table.cols}`;
    playerDraft = ctx.session.players().map((player) => player.name).join('\n');
    builderOpen = true;
  }

  function saveBuilder(): void {
    ctx.undo.batch('sheet setup', () => {
      instance.setFormula(formulaDraft);
      const match = sizeDraft.match(/^\s*(\d+)\s*[x×]\s*(\d+)\s*$/i);
      if (match) instance.setTableSize(Number(match[1]), Number(match[2]));
      if (data.perPlayer) {
        const names = playerDraft
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean);
        if (names.length) {
          ctx.undo.push('player sheets');
          data.players = names.map((name) => ({
            name,
            values: Object.fromEntries(data.counters.map((counter) => [counter.id, counter.value])),
          }));
        }
      }
    });
    ctx.toast('Sheet saved');
  }
</script>

<div class="custom">
  {#if data.fields.length}
    <section class="block">
      <h2>Fields</h2>
      <div class="fields">
        {#each data.fields as field (field.id)}
          <label class="field" class:wide={field.type === 'note'}>
            <span>{field.label}</span>
            {#if field.type === 'checkbox'}
              <input type="checkbox" checked={!!field.value} onchange={(event) => instance.setFieldValue(field.id, (event.currentTarget as HTMLInputElement).checked)} />
            {:else if field.type === 'number'}
              <input type="number" value={Number(field.value) || 0} onchange={(event) => instance.setFieldValue(field.id, Number((event.currentTarget as HTMLInputElement).value))} />
            {:else if field.type === 'note'}
              <textarea rows="2" value={String(field.value ?? '')} onchange={(event) => instance.setFieldValue(field.id, (event.currentTarget as HTMLTextAreaElement).value)}></textarea>
            {:else if field.type === 'select'}
              <select value={String(field.value ?? '')} onchange={(event) => instance.setFieldValue(field.id, (event.currentTarget as HTMLSelectElement).value)}>
                <option value="">—</option>
                {#each field.options as option (option)}
                  <option value={option}>{option}</option>
                {/each}
              </select>
            {:else}
              <input type="text" value={String(field.value ?? '')} onchange={(event) => instance.setFieldValue(field.id, (event.currentTarget as HTMLInputElement).value)} />
            {/if}
          </label>
        {/each}
      </div>
    </section>
  {/if}

  {#if data.counters.length}
    <section class="block">
      <h2>Counters</h2>
      <ul class="counters">
        {#each data.counters as counter (counter.id)}
          <li>
            <span class="label">{counter.label}</span>
            <span class="value" aria-live="polite">{counter.value}</span>
            <span class="steppers">
              <button type="button" onclick={() => instance.adjustCounter(counter.id, -counter.step)} aria-label="Decrease {counter.label}">−</button>
              <button type="button" onclick={() => instance.adjustCounter(counter.id, counter.step)} aria-label="Increase {counter.label}">+</button>
            </span>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if data.perPlayer && data.players.length && data.counters.length}
    <section class="block">
      <h2>Per player</h2>
      <div class="scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Player</th>
              {#each data.counters as counter (counter.id)}
                <th scope="col">{counter.label}</th>
              {/each}
              <th scope="col">Score</th>
            </tr>
          </thead>
          <tbody>
            {#each data.players as player (player.name)}
              <tr>
                <th scope="row">{player.name}</th>
                {#each data.counters as counter (counter.id)}
                  <td class="cell">
                    <button type="button" onclick={() => instance.adjustPlayerValue(player.name, counter.id, -1)} aria-label="Decrease {counter.label} for {player.name}">−</button>
                    <span>{player.values[counter.id] ?? 0}</span>
                    <button type="button" onclick={() => instance.adjustPlayerValue(player.name, counter.id, 1)} aria-label="Increase {counter.label} for {player.name}">+</button>
                  </td>
                {/each}
                <td class="score">{instance.formulaResult(player.name) ?? '—'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}

  {#if data.checklist.length}
    <section class="block">
      <h2>Checklist</h2>
      <ul class="checklist">
        {#each data.checklist as item, index (item.id)}
          <li>
            <label>
              <input type="checkbox" checked={item.done} onchange={() => instance.toggleChecklist(index)} />
              <span class:done={item.done}>{item.text}</span>
            </label>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <section class="block">
    <h2>Table</h2>
    <div class="scroll">
      <table class="sheet">
        <tbody>
          {#each Array.from({ length: data.table.rows }, (_, row) => row) as row (row)}
            <tr>
              {#each Array.from({ length: data.table.cols }, (_, col) => col) as col (col)}
                <td>
                  <label>
                    <span class="sr-only">Row {row + 1}, column {col + 1}</span>
                    <input
                      type="number"
                      value={data.table.cells[row * data.table.cols + col] ?? 0}
                      onchange={(event) => instance.setCell(row, col, Number((event.currentTarget as HTMLInputElement).value))}
                    />
                  </label>
                </td>
              {/each}
              <th scope="row" class="total">{rowTotal(data.table, row)}</th>
            </tr>
          {/each}
          <tr>
            {#each Array.from({ length: data.table.cols }, (_, col) => col) as col (col)}
              <th scope="col" class="total">{colTotal(data.table, col)}</th>
            {/each}
            <th scope="col" class="total grand">{data.table.cells.reduce((sum, value) => sum + value, 0)}</th>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section class="block">
    <h2>Formula</h2>
    {#if data.formula}
      <p class="formula"><code>{data.formula}</code> = <strong>{result ?? '—'}</strong></p>
      {#if result === null}<p class="dim small">That formula cannot be read. Use counter names, numbers, + − * / and min/max/round.</p>{/if}
    {:else}
      <p class="dim small">No formula yet. Open the builder to add one.</p>
    {/if}
  </section>

  <div class="row">
    <button type="button" class="primary" onclick={openBuilder}>Build the sheet</button>
  </div>

  {#if data.history.length}
    <ol class="history dim small">
      {#each data.history as line, index (index)}
        <li>{line}</li>
      {/each}
    </ol>
  {/if}
</div>

{#if builderOpen}
  <Sheet title="Build the sheet" onclose={() => (builderOpen = false)}>
    <h3>Add a field</h3>
    <div class="inline-form">
      <input type="text" bind:value={fieldLabel} placeholder="label" aria-label="New field label" />
      <select bind:value={fieldType} aria-label="Field type">
        <option value="text">text</option>
        <option value="number">number</option>
        <option value="checkbox">checkbox</option>
        <option value="note">note</option>
      </select>
      <button type="button" onclick={() => { instance.addField(fieldLabel, fieldType); fieldLabel = ''; }}>Add</button>
    </div>
    {#if data.fields.length}
      <ul class="chips">
        {#each data.fields as field (field.id)}
          <li>{field.label} <button type="button" onclick={() => instance.removeField(field.id)} aria-label="Remove {field.label}">✕</button></li>
        {/each}
      </ul>
    {/if}

    <h3>Add a counter</h3>
    <div class="inline-form">
      <input type="text" bind:value={counterLabel} placeholder="label" aria-label="New counter label" />
      <button type="button" onclick={() => { instance.addCounter(counterLabel); counterLabel = ''; }}>Add</button>
    </div>
    {#if data.counters.length}
      <ul class="chips">
        {#each data.counters as counter (counter.id)}
          <li>{counter.label} <button type="button" onclick={() => instance.removeCounter(counter.id)} aria-label="Remove {counter.label}">✕</button></li>
        {/each}
      </ul>
    {/if}

    <h3>Checklist</h3>
    <div class="inline-form">
      <input type="text" bind:value={checkLabel} placeholder="step" aria-label="New checklist item" />
      <button type="button" onclick={() => { instance.addChecklist(checkLabel); checkLabel = ''; }}>Add</button>
    </div>

    <label class="field">
      <span>Table size (rows x columns)</span>
      <input type="text" bind:value={sizeDraft} placeholder="3x3" />
    </label>

    <label class="field">
      <span>Formula</span>
      <input type="text" bind:value={formulaDraft} placeholder="wood + stone * 2" />
    </label>

    <label class="check">
      <input type="checkbox" checked={data.perPlayer} onchange={(event) => instance.setPerPlayer((event.currentTarget as HTMLInputElement).checked)} />
      <span>A sheet per player</span>
    </label>

    {#if data.perPlayer}
      <label class="field">
        <span>Players (one name per line)</span>
        <textarea rows="4" bind:value={playerDraft}></textarea>
      </label>
    {/if}

    <button type="button" class="wide primary" onclick={saveBuilder}>Save the sheet</button>
    <p class="dim small">The formula can use any counter name, plus min, max, round and abs.</p>
  </Sheet>
{/if}

<style>
  .custom {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3);
  }

  h2 {
    margin: 0;
    font-size: var(--text-base);
  }
  h3 {
    margin: var(--space-2) 0 0;
    font-size: var(--text-sm);
  }
  .fields {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: var(--space-2);
  }

  .field.wide {
    grid-column: 1 / -1;
  }


  .counters {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .counters li {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) 0;
    border-bottom: 1px solid var(--line);
  }
  .counters li:last-child {
    border-bottom: 0;
  }
  .label {
    font-weight: 700;
  }
  .counters .value {
    margin-left: auto;
    font-size: var(--text-xl);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .steppers {
    display: flex;
    gap: var(--space-1);
  }
  .steppers button,
  .cell button {
    min-width: 48px;
    min-height: 48px;
    border-radius: var(--radius);
    background: var(--surface-2);
    color: var(--text);
    font-size: var(--text-lg);
    font-weight: 700;
    cursor: pointer;
  }
  .scroll {
    overflow-x: auto;
  }



  .cell {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    justify-content: center;
  }
  .cell span {
    min-width: 1.5rem;
    text-align: center;
    font-weight: 700;
  }
  .score {
    font-weight: 800;
    text-align: right;
  }
  .sheet td input {
    border: 0;
    width: 4.5rem;
    min-height: 44px;
    border-radius: var(--radius-sm);
    background: var(--surface-2);
    color: var(--text);
    text-align: center;
    font-variant-numeric: tabular-nums;
  }
  .total {
    text-align: right;
    color: var(--text-dim);
  }
  .grand {
    color: var(--text);
    font-weight: 800;
  }
  .checklist {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .checklist label {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-height: 48px;
    cursor: pointer;
  }
  .checklist input {
    border: 0;
    width: 24px;
    height: 24px;
  }
  .checklist .done {
    color: var(--text-dim);
    text-decoration: line-through;
  }
  .formula {
    margin: 0;
    font-size: var(--text-lg);
  }
  .formula code {
    font-family: var(--font-mono);
    background: var(--surface-2);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
  }



  .inline-form {
    display: flex;
    gap: var(--space-2);
  }
  .inline-form input,
  .inline-form select {
    border: 0;
    flex: 1;
    min-height: 48px;
    background: var(--surface-2);
    color: var(--text);
    padding: 0 var(--space-2);
    min-width: 0;
  }
  .inline-form button {
    min-height: 48px;
    padding: 0 var(--space-3);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
  }
  .chips {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }
  .chips li {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding-left: var(--space-2);
    border-radius: var(--radius-pill);
    background: var(--surface-2);
    font-size: var(--text-sm);
  }
  .chips button {
    min-width: 36px;
    min-height: 36px;
    border: 0;
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
  }







</style>
