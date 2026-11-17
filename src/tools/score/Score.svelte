<script lang="ts">
  import { commitOnEnter } from '../../core/dom';
  import type { ToolContext } from '../../core/registry';
  import { copyText } from '../../core/share';
  import NumberPad from '../../core/ui/NumberPad.svelte';
  import Sheet from '../../core/ui/Sheet.svelte';
  import {
    csvSheet,
    evaluateFormula,
    normaliseName,
    standingsFor,
    totalFor,
    type ScoreCategory,
    type ScoreInstance,
    type ScoreMode,
  } from './logic';

  let { ctx, instance }: { ctx: ToolContext; instance: ScoreInstance } = $props();
  const data = $derived(instance.data);

  let editing = $state<string | null>(null);
  let adding = $state(false);
  let settingsOpen = $state(false);
  let formulaDraft = $state('');
  let categoryDraft = $state<ScoreCategory[]>([]);
  let newName = $state('');
  let entryFor = $state<string | null>(null);
  let entryLabel = $state('');
  let entryAmount = $state('');
  let noteEdit = $state<{ playerId: string; cell: string; label: string; draft: string } | null>(null);

  const standings = $derived(standingsFor(data));
  const hiddenNow = $derived(data.hidden && !data.revealed);
  const formulaCheck = $derived(
    data.formula.trim()
      ? evaluateFormula(data.formula, Object.fromEntries(data.categories.map((c) => [normaliseName(c.name), 0])))
      : { ok: true, value: 0, message: '' },
  );

  const MODE_LABELS: { id: ScoreMode; label: string }[] = [
    { id: 'simple', label: 'Totals' },
    { id: 'rounds', label: 'Rounds' },
    { id: 'categories', label: 'Categories' },
    { id: 'ledger', label: 'Ledger' },
  ];

  function rankOf(id: string): number {
    return standings.find((row) => row.id === id)?.rank ?? 0;
  }

  function shownTotal(id: string): string {
    return hiddenNow ? '•••' : String(totalFor(data, id));
  }

  function copySheet(): void {
    void copyText(csvSheet(data)).then((ok) => {
      ctx.toast(ok ? 'Score sheet copied' : 'Could not copy', ok ? 'info' : 'error');
    });
  }

  function openSettings(): void {
    formulaDraft = data.formula;
    categoryDraft = data.categories.map((category) => ({ ...category }));
    settingsOpen = true;
  }

  function saveCategories(): void {
    instance.setCategories(categoryDraft);
    categoryDraft = data.categories.map((category) => ({ ...category }));
    ctx.toast('Categories saved');
  }

  function addPlayerNow(): void {
    instance.addPlayer(newName);
    newName = '';
    adding = false;
  }

  function saveFormula(): void {
    instance.setFormula(formulaDraft);
  }

  function openEntry(id: string): void {
    entryFor = id;
    entryLabel = '';
    entryAmount = '';
  }

  function saveEntry(): void {
    if (!entryFor) return;
    instance.addLedgerEntry(entryFor, entryLabel, Number(entryAmount));
    entryFor = null;
  }

  function openNote(playerId: string, cell: string, label: string): void {
    noteEdit = { playerId, cell, label, draft: instance.note(playerId, cell) };
  }

  function saveNote(): void {
    if (!noteEdit) return;
    instance.setNote(noteEdit.playerId, noteEdit.cell, noteEdit.draft);
    noteEdit = null;
  }

  function playerName(id: string): string {
    return data.players.find((player) => player.id === id)?.name ?? 'Player';
  }
</script>

<div class="score">
  <div class="modes" role="group" aria-label="Scoring mode">
    {#each MODE_LABELS as item (item.id)}
      <button type="button" class:active={data.mode === item.id} onclick={() => instance.setMode(item.id)}>
        {item.label}
      </button>
    {/each}
  </div>

  <div class="head">
    <span class="mode">
      {data.mode === 'rounds'
        ? `Rounds · ${data.roundCount}`
        : data.mode === 'categories'
          ? `${data.categories.length} ${data.categories.length === 1 ? 'category' : 'categories'}`
          : data.mode === 'ledger'
            ? 'Ledger · running entries'
            : 'Totals'}
    </span>
    <div class="head-actions">
      {#if data.target}<span class="target">Target {data.target}</span>{/if}
      {#if hiddenNow}
        <button type="button" class="reveal" onclick={() => instance.reveal()}>Reveal scores</button>
      {/if}
      <button type="button" class="settings" onclick={openSettings} aria-label="Score settings">Settings</button>
    </div>
  </div>

  {#if data.hint}
    <p class="hint-line">Typical winning score: {data.hint}</p>
  {/if}

  {#if data.mode === 'categories'}
    {#if data.categories.length === 0}
      <p class="empty">This pad has no categories yet. Add them in settings, or switch to totals.</p>
    {:else}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Category</th>
              {#each data.players as player (player.id)}
                <th scope="col">{player.name}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each data.categories as category (category.name)}
              <tr>
                <th scope="row">
                  {category.name}
                  <small>{category.points} pt{category.points === 1 ? '' : 's'}</small>
                </th>
                {#each data.players as player (player.id)}
                  {@const cell = `c:${category.name}`}
                  {@const note = instance.note(player.id, cell)}
                  <td>
                    <div class="cell">
                      <input
                        type="number"
                        min="0"
                        aria-label="{player.name} {category.name} count"
                        value={data.counts[player.id]?.[category.name] ?? 0}
                        onkeydown={commitOnEnter}
                        onchange={(event) =>
                          instance.setCategoryCount(
                            player.id,
                            category.name,
                            Number((event.currentTarget as HTMLInputElement).value),
                          )}
                      />
                      <button
                        type="button"
                        class="note-btn"
                        class:filled={!!note}
                        aria-label="Note for {player.name} {category.name}"
                        onclick={() => openNote(player.id, cell, `${player.name} · ${category.name}`)}
                      >✎</button>
                    </div>
                    {#if note}<small class="cell-note">{note}</small>{/if}
                  </td>
                {/each}
              </tr>
            {/each}
            <tr class="totals-row">
              <th scope="row">{data.formula.trim() ? 'Formula total' : 'Total'}</th>
              {#each data.players as player (player.id)}
                <td class="total">{shownTotal(player.id)}</td>
              {/each}
            </tr>
          </tbody>
        </table>
      </div>
      {#if data.formula.trim()}
        <p class="formula" class:bad={!formulaCheck.ok}>
          {data.formula}{#if !formulaCheck.ok} — {formulaCheck.message}{/if}
        </p>
      {/if}
    {/if}
  {:else if data.mode === 'rounds'}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Player</th>
            {#each Array(data.roundCount) as _, round (round)}
              <th scope="col">{round + 1}</th>
            {/each}
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {#each data.players as player (player.id)}
            <tr>
              <th scope="row">
                <span class="dot" style="--player: {player.color}">{player.name.slice(0, 2).toUpperCase()}</span>
                {player.name}
              </th>
              {#each Array(data.roundCount) as _, round (round)}
                {@const cell = `r:${round}`}
                {@const note = instance.note(player.id, cell)}
                <td>
                  <div class="cell">
                    <input
                      type="number"
                      aria-label="{player.name} round {round + 1}"
                      value={data.rounds[player.id]?.[round] ?? 0}
                      onkeydown={commitOnEnter}
                      onchange={(event) =>
                        instance.setRound(player.id, round, Number((event.currentTarget as HTMLInputElement).value))}
                    />
                    <button
                      type="button"
                      class="note-btn"
                      class:filled={!!note}
                      aria-label="Note for {player.name} round {round + 1}"
                      onclick={() => openNote(player.id, cell, `${player.name} · round ${round + 1}`)}
                    >✎</button>
                  </div>
                  {#if note}<small class="cell-note">{note}</small>{/if}
                </td>
              {/each}
              <td class="total">{shownTotal(player.id)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <div class="row">
      <button type="button" onclick={() => instance.addRound()}>Add round</button>
      <button type="button" onclick={() => instance.removeRound()}>Remove round</button>
    </div>
  {:else if data.mode === 'ledger'}
    <ul class="ledger">
      {#each data.players as player (player.id)}
        <li class:leader={rankOf(player.id) === 1 && data.players.length > 1}>
          <div class="who">
            <span class="dot" style="--player: {player.color}">{player.name.slice(0, 2).toUpperCase()}</span>
            <span class="name">{player.name}</span>
            <span class="ledger-total">{shownTotal(player.id)}</span>
          </div>
          {#if !hiddenNow}
            <ul class="entries">
              {#each data.ledger[player.id] ?? [] as entry (entry.id)}
                <li>
                  <span>{entry.label}</span>
                  <span class="amount">{entry.amount >= 0 ? '+' : ''}{entry.amount}</span>
                  <button
                    type="button"
                    aria-label="Remove {entry.label} from {player.name}"
                    onclick={() => instance.removeLedgerEntry(player.id, entry.id)}
                  >✕</button>
                </li>
              {/each}
            </ul>
          {/if}
          <button type="button" class="add-entry" disabled={hiddenNow} onclick={() => openEntry(player.id)}>
            Add entry
          </button>
        </li>
      {/each}
    </ul>
  {:else}
    <ul class="players">
      {#each data.players as player (player.id)}
        <li class:leader={rankOf(player.id) === 1 && data.players.length > 1}>
          <div class="who">
            <span class="dot" style="--player: {player.color}">{player.name.slice(0, 2).toUpperCase()}</span>
            <span class="name">{player.name}</span>
            {#if data.players.length > 1}
              <span class="rank">#{rankOf(player.id)}</span>
            {/if}
          </div>
          <button
            type="button"
            class="total-button"
            aria-label="Set {player.name}'s score"
            disabled={hiddenNow}
            onclick={() => (editing = player.id)}
          >
            {shownTotal(player.id)}
          </button>
          <div class="adjust">
            <button type="button" onclick={() => instance.adjust(player.id, -data.step)} aria-label="Minus {data.step} for {player.name}">
              −{data.step}
            </button>
            <button type="button" onclick={() => instance.adjust(player.id, data.step)} aria-label="Plus {data.step} for {player.name}">
              +{data.step}
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  <div class="row">
    <button type="button" onclick={() => (adding = true)}>Add player</button>
    <button type="button" onclick={() => instance.syncPlayers()}>Use session players</button>
  </div>
  <div class="row">
    <button type="button" onclick={copySheet}>Copy sheet</button>
  </div>

  {#if data.players.length > 1}
    <ol class="board" class:hidden={hiddenNow}>
      {#each standings as row (row.id)}
        <li>
          <span class="rank">{row.tied ? '=' : row.rank}</span>
          <span class="name">{row.name}</span>
          <span class="total">{hiddenNow ? '•••' : row.total}</span>
        </li>
      {/each}
    </ol>
  {/if}

  <details class="danger-zone">
    <summary>Clear scores</summary>
    <p>Sets every score back to {data.start}. Undo still works.</p>
    <button type="button" class="danger" onclick={() => instance.clearAll()}>Clear all scores</button>
  </details>
</div>

{#if editing}
  <Sheet title="Set score" onclose={() => (editing = null)}>
    <NumberPad
      value={totalFor(data, editing)}
      label="Score"
      onsubmit={(value) => {
        if (editing) instance.setTotal(editing, value);
        editing = null;
      }}
      oncancel={() => (editing = null)}
    />
  </Sheet>
{/if}

{#if adding}
  <Sheet title="Add player" onclose={() => (adding = false)}>
    <label class="field">
      <span>Name</span>
      <input type="text" bind:value={newName} onkeydown={(event) => { if (event.key === 'Enter') addPlayerNow(); }} />
    </label>
    <button type="button" class="wide" onclick={addPlayerNow}>Add</button>
  </Sheet>
{/if}

{#if entryFor}
  <Sheet title="Add entry" onclose={() => (entryFor = null)}>
    <p class="hint">For {playerName(entryFor)}. Negative amounts take points away.</p>
    <label class="field">
      <span>Label</span>
      <input type="text" bind:value={entryLabel} placeholder="Tickets made" />
    </label>
    <label class="field">
      <span>Amount</span>
      <input type="number" bind:value={entryAmount} placeholder="12" />
    </label>
    <button type="button" class="wide" onclick={saveEntry}>Add entry</button>
  </Sheet>
{/if}

{#if noteEdit}
  <Sheet title="Cell note" onclose={() => (noteEdit = null)}>
    <p class="hint">{noteEdit.label}</p>
    <label class="field">
      <span>Note</span>
      <textarea rows="3" bind:value={noteEdit.draft} placeholder="Why this score changed" spellcheck="true"></textarea>
    </label>
    <button type="button" class="wide" onclick={saveNote}>Save note</button>
  </Sheet>
{/if}

{#if settingsOpen}
  <Sheet title="Score settings" onclose={() => (settingsOpen = false)}>
    <label class="field">
      <span>Win condition</span>
      <select
        value={data.win}
        onchange={(event) =>
          instance.setWin((event.currentTarget as HTMLSelectElement).value as 'highest' | 'lowest')}
      >
        <option value="highest">Highest wins</option>
        <option value="lowest">Lowest wins</option>
      </select>
    </label>

    <label class="field">
      <span>Step</span>
      <input
        type="number"
        min="1"
        max="1000"
        value={data.step}
        onkeydown={commitOnEnter}
        onchange={(event) => instance.setStep(Number((event.currentTarget as HTMLInputElement).value))}
      />
    </label>

    <label class="field">
      <span>Target (0 = none)</span>
      <input
        type="number"
        min="0"
        value={data.target}
        onkeydown={commitOnEnter}
        onchange={(event) => instance.setTarget(Number((event.currentTarget as HTMLInputElement).value))}
      />
    </label>

    <label class="field">
      <span>Typical winning score (optional)</span>
      <input
        type="text"
        value={data.hint}
        placeholder="about 10 points"
        onkeydown={commitOnEnter}
        onchange={(event) => instance.setHint((event.currentTarget as HTMLInputElement).value)}
      />
    </label>

    <label class="check">
      <input
        type="checkbox"
        checked={data.hidden}
        onchange={(event) => instance.setHidden((event.currentTarget as HTMLInputElement).checked)}
      />
      <span>Hide totals until revealed</span>
    </label>

    {#if data.mode === 'categories'}
      <div class="cat-list">
        <span class="cat-head">Categories and points</span>
        {#each categoryDraft as category, index (index)}
          <div class="cat-row">
            <input
              type="text"
              aria-label="Category {index + 1} name"
              bind:value={category.name}
              placeholder="cities"
            />
            <input
              type="number"
              aria-label="Category {index + 1} points"
              bind:value={category.points}
              min="0"
            />
            <button
              type="button"
              class="remove"
              aria-label="Remove category {index + 1}"
              onclick={() => (categoryDraft = categoryDraft.filter((_, at) => at !== index))}
            >✕</button>
          </div>
        {/each}
        <div class="cat-actions">
          <button
            type="button"
            onclick={() => (categoryDraft = [...categoryDraft, { name: '', points: 1 }])}
          >Add category</button>
          <button type="button" class="save" onclick={saveCategories}>Save categories</button>
        </div>
      </div>

      <label class="field">
        <span>Formula (optional)</span>
        <textarea
          rows="2"
          bind:value={formulaDraft}
          placeholder="settlements + cities * 2"
          spellcheck="false"
        ></textarea>
      </label>
      {#if !formulaCheck.ok}
        <p class="formula bad">{formulaCheck.message}</p>
      {/if}
      <button type="button" class="wide" onclick={saveFormula}>Save formula</button>
      <p class="hint">Names come from the categories; `+ - * /`, brackets, min, max, sum and if work.</p>
    {/if}
  </Sheet>
{/if}

<style>
  .score {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3);
  }
  .modes {
    display: flex;
    gap: var(--space-1);
    padding: var(--space-1);
    border-radius: var(--radius);
    background: var(--surface-2);
  }
  .modes button {
    flex: 1;
    min-height: 44px;
    border-radius: var(--radius-sm);
    border: 0;
    background: transparent;
    color: var(--text);
    cursor: pointer;
  }
  .modes button.active {
    background: var(--surface);
    font-weight: 700;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-2);
    color: var(--text-dim);
    font-size: var(--text-sm);
    font-weight: 600;
  }
  .head-actions {
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }
  .reveal {
    min-height: 40px;
    padding: 0 var(--space-3);
    border-radius: 999px;
    border: 1px solid var(--accent);
    background: var(--accent-soft);
    color: var(--text);
    cursor: pointer;
    font-weight: 700;
  }
  .settings {
    min-height: 40px;
    padding: 0 var(--space-3);
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
    font-weight: 600;
  }
  .empty {
    color: var(--text-dim);
    margin: 0;
  }
  .formula {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    color: var(--text-dim);
  }
  .formula.bad {
    color: var(--danger);
  }
  .hint {
    margin: 0;
    color: var(--text-dim);
    font-size: var(--text-sm);
  }
  .hint-line {
    margin: 0;
    color: var(--text-dim);
    font-size: var(--text-sm);
  }
  .players {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .players li {
    border: 2px solid var(--line);
    border-radius: var(--radius-lg);
    padding: var(--space-2) var(--space-3);
    background: var(--surface);
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--space-2);
    align-items: center;
  }
  .players li.leader {
    border-color: var(--accent);
  }
  .who {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }
  .dot {
    display: inline-grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: var(--player);
    color: #fff;
    font-size: var(--text-xs);
    font-weight: 800;
    flex: none;
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
  }
  .rank {
    color: var(--text-dim);
    font-size: var(--text-sm);
  }
  .total-button {
    grid-column: 2;
    grid-row: 1 / span 2;
    min-width: 88px;
    min-height: 56px;
    border: 0;
    border-radius: var(--radius);
    background: var(--surface-2);
    color: var(--text);
    font-size: var(--text-2xl);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    cursor: pointer;
  }
  .total-button:disabled {
    cursor: default;
    color: var(--text-dim);
  }
  .adjust {
    display: flex;
    gap: var(--space-2);
  }
  .adjust button {
    min-width: 64px;
    min-height: 48px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface-2);
    color: var(--text);
    font-size: var(--text-base);
    font-weight: 700;
    cursor: pointer;
  }
  .row {
    display: flex;
    gap: var(--space-2);
  }
  .row button {
    flex: 1;
    min-height: 48px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
    font: inherit;
  }
  .table-wrap {
    overflow-x: auto;
    border: 1px solid var(--line);
    border-radius: var(--radius);
  }
  table {
    border-collapse: collapse;
    min-width: 100%;
  }
  th,
  td {
    padding: var(--space-1);
    text-align: center;
    border-bottom: 1px solid var(--line);
  }
  thead th {
    font-size: var(--text-xs);
    color: var(--text-dim);
    text-transform: uppercase;
  }
  tbody th {
    text-align: left;
    white-space: nowrap;
    font-size: var(--text-sm);
  }
  tbody th small {
    display: block;
    color: var(--text-dim);
    font-weight: 400;
  }
  .cell {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }
  td input {
    width: 4.2rem;
    min-height: 44px;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--text);
    text-align: center;
    font: inherit;
    font-variant-numeric: tabular-nums;
  }
  .note-btn {
    min-width: 32px;
    min-height: 32px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--line);
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
    font-size: var(--text-xs);
  }
  .note-btn.filled {
    border-color: var(--accent);
    background: var(--accent-soft);
    color: var(--text);
  }
  .cell-note {
    display: block;
    max-width: 9rem;
    margin-top: 2px;
    color: var(--text-dim);
    font-size: var(--text-xs);
    line-height: 1.2;
  }
  td.total {
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .totals-row th {
    font-weight: 700;
  }
  .ledger {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .ledger > li {
    border: 2px solid var(--line);
    border-radius: var(--radius-lg);
    background: var(--surface);
    padding: var(--space-2) var(--space-3);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .ledger > li.leader {
    border-color: var(--accent);
  }
  .ledger-total {
    margin-left: auto;
    font-size: var(--text-xl);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .entries {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: var(--text-sm);
  }
  .entries li {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    border-bottom: 1px dotted var(--line);
    padding-bottom: var(--space-1);
  }
  .entries .amount {
    margin-left: auto;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .entries button {
    min-width: 32px;
    min-height: 32px;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
  }
  .add-entry {
    min-height: 44px;
    border-radius: var(--radius);
    border: 1px dashed var(--line);
    background: transparent;
    color: var(--text);
    cursor: pointer;
  }
  .board {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    color: var(--text-dim);
  }
  .board li {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    font-variant-numeric: tabular-nums;
  }
  .board .total {
    margin-left: auto;
    color: var(--text);
    font-weight: 700;
  }
  .danger-zone summary {
    min-height: 44px;
    display: flex;
    align-items: center;
    cursor: pointer;
    color: var(--text-dim);
  }
  .danger {
    min-height: 48px;
    border-radius: var(--radius);
    border: 1px solid var(--danger);
    background: transparent;
    color: var(--danger);
    cursor: pointer;
    padding: 0 var(--space-3);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    color: var(--text-dim);
  }
  .field input,
  .field select,
  .field textarea {
    min-height: 48px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface-2);
    color: var(--text);
    padding: 0 var(--space-3);
    font: inherit;
  }
  .field textarea {
    padding: var(--space-2) var(--space-3);
    font-family: var(--font-mono);
  }
  .check {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-height: 48px;
  }
  .check input {
    width: 24px;
    height: 24px;
  }
  .cat-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .cat-head {
    color: var(--text-dim);
    font-size: var(--text-sm);
  }
  .cat-row {
    display: grid;
    grid-template-columns: 1fr 5rem 2.75rem;
    gap: var(--space-2);
  }
  .cat-row input {
    min-height: 44px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--line);
    background: var(--surface-2);
    color: var(--text);
    padding: 0 var(--space-2);
    font: inherit;
    min-width: 0;
  }
  .cat-row button.remove {
    min-height: 44px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--line);
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
  }
  .cat-actions {
    display: flex;
    gap: var(--space-2);
  }
  .cat-actions button {
    flex: 1;
    min-height: 44px;
    border-radius: var(--radius);
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
    font: inherit;
  }
  .cat-actions button.save {
    border-color: var(--accent);
    background: var(--accent-soft);
    font-weight: 700;
  }
  .wide {
    min-height: 48px;
    border-radius: var(--radius);
    border: 0;
    background: var(--accent);
    color: var(--accent-text);
    font-weight: 700;
    cursor: pointer;
  }
</style>
