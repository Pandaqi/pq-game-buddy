<script lang="ts">
  import { seatName, t } from '../../core/i18n.svelte';
  import type { ToolContext } from '../../core/registry';
  import { colTotal, rowTotal, tableTotal } from './logic';
  import type { PluginInstance } from './tool.svelte';

  let { instance }: { ctx: ToolContext; instance: PluginInstance } = $props();
  const data = $derived(instance.data);
  const blocks = $derived(instance.blocks);
  // Rows follow the table: adding, renaming or removing a player needs no action.
  const sheets = $derived(instance.sheets());
  /** A confirming button asks a second time; nothing here is destructive on one tap. */
  let confirming = $state('');

  function run(id: string, confirm: boolean): void {
    if (confirm && confirming !== id) {
      confirming = id;
      return;
    }
    confirming = '';
    instance.run(id);
  }
</script>

<div class="plugin">
  {#if !blocks.length}
    <section class="empty">
      <h2>{t('plugin.no-definition')}</h2>
      <p class="dim">{t('plugin.no-definition-hint')}</p>
    </section>
  {:else}
    <div class="top">
      <button type="button" class="ghost" onclick={() => instance.reset()}>{t('plugin.reset')}</button>
    </div>

    {#each blocks as block (block.id)}
      {#if block.kind === 'counter'}
        <section class="card">
          <h2>{block.label}</h2>
          {#if block.perPlayer}
            <ul class="counters">
              {#each sheets as sheet (sheet.id)}
                <li>
                  <span class="label">{seatName(sheet.seat, sheet.name)}</span>
                  <span class="value" aria-live="polite">{sheet.values[block.id] ?? block.start}</span>
                  <span class="steppers">
                    <button type="button" onclick={() => instance.adjustSheet(block.id, sheet.id, -block.step)} aria-label={t('ui.decrease')}>−</button>
                    <button type="button" onclick={() => instance.adjustSheet(block.id, sheet.id, block.step)} aria-label={t('ui.increase')}>+</button>
                  </span>
                </li>
              {/each}
            </ul>
          {:else}
            <div class="counter">
              <button type="button" class="step" onclick={() => instance.adjustCounter(block.id, -block.step)} aria-label={t('ui.decrease')}>−</button>
              <span class="big" aria-live="polite">{data.counters[block.id] ?? block.start}</span>
              <button type="button" class="step" onclick={() => instance.adjustCounter(block.id, block.step)} aria-label={t('ui.increase')}>+</button>
            </div>
          {/if}
        </section>
      {:else if block.kind === 'checklist'}
        {@const checks = data.checks[block.id] ?? []}
        <section class="card">
          <h2>{block.label}</h2>
          <ul class="checks">
            {#each block.items as item, index (index)}
              <li>
                <label>
                  <input
                    type="checkbox"
                    checked={!!checks[index]}
                    onchange={() => instance.toggleCheck(block.id, index)}
                  />
                  <span>{item}</span>
                </label>
              </li>
            {/each}
          </ul>
        </section>
      {:else if block.kind === 'table'}
        {@const table = data.tables[block.id]}
        {#if table}
          <section class="card">
            <h2>{block.label}</h2>
            <div class="scroll">
              <table>
                <tbody>
                  {#each Array.from({ length: table.rows }, (_, index) => index) as row (row)}
                    <tr>
                      {#each Array.from({ length: table.cols }, (_, index) => index) as col (col)}
                        <td>
                          <input
                            type="number"
                            value={table.cells[row * table.cols + col] ?? 0}
                            aria-label={t('plugin.row-col', { row: row + 1, column: col + 1 })}
                            onchange={(event) =>
                              instance.setCell(
                                block.id,
                                row,
                                col,
                                Number((event.currentTarget as HTMLInputElement).value),
                              )}
                          />
                        </td>
                      {/each}
                      <th scope="row">{rowTotal(table, row)}</th>
                    </tr>
                  {/each}
                  <tr>
                    {#each Array.from({ length: table.cols }, (_, index) => index) as col (col)}
                      <th scope="col">{colTotal(table, col)}</th>
                    {/each}
                    <th scope="col">{t('plugin.table-total')}: {tableTotal(table)}</th>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        {/if}
      {:else if block.kind === 'field'}
        <section class="card">
          <label class="field">
            <span>{block.label}</span>
            {#if block.fieldType === 'number'}
              <input
                type="number"
                value={Number(data.fields[block.id]) || 0}
                onchange={(event) => instance.setField(block.id, Number((event.currentTarget as HTMLInputElement).value))}
              />
            {:else if block.fieldType === 'note'}
              <textarea
                rows="2"
                value={String(data.fields[block.id] ?? '')}
                onchange={(event) => instance.setField(block.id, (event.currentTarget as HTMLTextAreaElement).value)}
              ></textarea>
            {:else if block.fieldType === 'select'}
              <select
                value={String(data.fields[block.id] ?? '')}
                onchange={(event) => instance.setField(block.id, (event.currentTarget as HTMLSelectElement).value)}
              >
                <option value="">—</option>
                {#each block.options as option (option)}
                  <option value={option}>{option}</option>
                {/each}
              </select>
            {:else}
              <input
                type="text"
                value={String(data.fields[block.id] ?? '')}
                onchange={(event) => instance.setField(block.id, (event.currentTarget as HTMLInputElement).value)}
              />
            {/if}
          </label>
        </section>
      {:else if block.kind === 'roll'}
        <section class="card">
          <h2>{block.label}</h2>
          <p class="big" aria-live="polite">{data.rolls[block.id] ?? '—'}</p>
          <button type="button" class="primary" onclick={() => instance.doRoll(block.id)}>{t('plugin.roll')}</button>
        </section>
      {:else if block.kind === 'pick'}
        <section class="card">
          <h2>{block.label}</h2>
          {#if data.picks[block.id]?.length}
            <ul class="chips">
              {#each data.picks[block.id] as item (item)}
                <li>{item}</li>
              {/each}
            </ul>
          {/if}
          <div class="actions">
            <button type="button" class="primary" onclick={() => instance.doPick(block.id)}>{t('plugin.pick')}</button>
            {#if data.picks[block.id]?.length}
              <button type="button" onclick={() => instance.shufflePick(block.id)}>{t('plugin.shuffle')}</button>
            {/if}
          </div>
        </section>
      {:else if block.kind === 'readout'}
        {@const value = instance.readout(block.id)}
        <section class="card readout">
          <h2>{block.label}</h2>
          <p class="big" aria-live="polite">{value === null ? '—' : value}</p>
        </section>
      {:else if block.kind === 'button'}
        <section class="card">
          <button type="button" class="primary wide" onclick={() => run(block.id, block.confirm)}>
            {confirming === block.id ? t('plugin.confirm') : block.label}
          </button>
        </section>
      {:else if block.kind === 'note'}
        <section class="card note">
          {#if block.label !== block.id}<h2>{block.label}</h2>{/if}
          <p>{block.text}</p>
        </section>
      {/if}
    {/each}
  {/if}
</div>

<style>
  .plugin {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    max-width: 40rem;
    margin: 0 auto;
  }
  .top {
    display: flex;
    justify-content: flex-end;
  }
  .ghost {
    min-height: 44px;
    padding: 0 var(--space-4);
    border-radius: var(--radius-pill);
    background: var(--surface-2);
    color: var(--text-dim);
    cursor: pointer;
  }
  .card {
    padding: var(--space-4);
    border-radius: var(--radius-lg);
    background: var(--surface);
    box-shadow: var(--shadow-card);
  }
  h2 {
    margin: 0 0 var(--space-2);
    font-size: var(--text-lg);
  }
  .dim {
    color: var(--text-dim);
    margin: 0;
  }
  .empty {
    padding: var(--space-5);
    border-radius: var(--radius-lg);
    background: var(--surface);
    text-align: center;
  }
  .counter {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }
  .step {
    width: 64px;
    height: 64px;
    border-radius: var(--radius-round);
    background: var(--surface-2);
    color: var(--text);
    font-size: var(--text-2xl);
    cursor: pointer;
  }
  .big {
    font-family: var(--font-display);
    font-size: clamp(2.5rem, 12vw, 4rem);
    font-weight: 800;
    margin: 0;
    text-align: center;
    color: var(--forest);
  }
  .counters,
  .checks,
  .chips {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .counters li {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .counters .label {
    flex: 1;
    min-width: 0;
  }
  .counters .value {
    font-weight: 800;
    font-size: var(--text-lg);
  }
  .steppers {
    display: flex;
    gap: var(--space-1);
  }
  .steppers button {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-round);
    background: var(--surface-2);
    color: var(--text);
    cursor: pointer;
  }
  .checks label {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-height: 44px;
  }
  .checks input {
    width: 22px;
    height: 22px;
    flex: none;
  }
  .scroll {
    overflow-x: auto;
  }
  table {
    border-collapse: collapse;
  }
  td,
  th {
    padding: 2px;
    text-align: center;
  }
  td input {
    width: 3.6rem;
    min-height: 44px;
    text-align: center;
  }
  th {
    color: var(--text-dim);
    font-size: var(--text-sm);
    font-weight: 700;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    color: var(--text-dim);
    font-size: var(--text-sm);
  }
  .field input,
  .field select,
  .field textarea {
    min-height: 46px;
    color: var(--text);
  }
  .chips {
    flex-direction: row;
    flex-wrap: wrap;
    margin-bottom: var(--space-2);
  }
  .chips li {
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-pill);
    background: var(--accent-soft);
    color: var(--accent-deep);
    font-weight: 700;
  }
  .actions {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }
  .primary {
    min-height: 52px;
    padding: 0 var(--space-5);
    border-radius: var(--radius-pill);
    background: var(--accent);
    color: var(--accent-text);
    box-shadow: var(--shadow-key);
    font-weight: 800;
    cursor: pointer;
  }
  .primary.wide {
    width: 100%;
  }
  .note p {
    margin: 0;
    color: var(--text-dim);
  }
</style>
