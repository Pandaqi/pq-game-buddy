<script lang="ts">
  import { seatVars } from '../../core/colour';
  import { commitOnEnter } from '../../core/dom';
  import { seatName, t } from '../../core/i18n.svelte';
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

  const MODE_LABELS = $derived<{ id: ScoreMode; label: string }[]>([
    { id: 'simple', label: t('score.totals') },
    { id: 'rounds', label: t('score.rounds') },
    { id: 'categories', label: t('score.categories') },
    { id: 'ledger', label: t('score.ledger') },
  ]);

  function rankOf(id: string): number {
    return standings.find((row) => row.id === id)?.rank ?? 0;
  }

  function shownTotal(id: string): string {
    return hiddenNow ? '•••' : String(totalFor(data, id));
  }

  function copySheet(): void {
    void copyText(csvSheet(data)).then((ok) => {
      ctx.toast(ok ? t('score.toast-copied') : t('score.toast-copy-failed'), ok ? 'info' : 'error');
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
    ctx.toast(t('score.toast-cats-saved'));
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

  /** A row's name in the active language; a generated seat never freezes. */
  const label = (player: { name: string; seat?: number }): string => seatName(player.seat, player.name);

  function playerName(id: string): string {
    const player = data.players.find((item) => item.id === id);
    return player ? label(player) : t('score.player');
  }
</script>

<div class="score">
  <div class="modes" role="group" aria-label={t('score.scoring-mode')}>
    {#each MODE_LABELS as item (item.id)}
      <button type="button" class:active={data.mode === item.id} onclick={() => instance.setMode(item.id)}>
        {item.label}
      </button>
    {/each}
  </div>

  <div class="head">
    <span class="mode">
      {data.mode === 'rounds'
        ? t('score.rounds-head', { count: data.roundCount })
        : data.mode === 'categories'
          ? t(data.categories.length === 1 ? 'score.categories-head-one' : 'score.categories-head', {
              count: data.categories.length,
            })
          : data.mode === 'ledger'
            ? t('score.ledger-head')
            : t('score.totals')}
    </span>
    <div class="head-actions">
      {#if data.target}<span class="target">{t('score.target', { target: data.target })}</span>{/if}
      {#if hiddenNow}
        <button type="button" class="reveal" onclick={() => instance.reveal()}>{t('score.reveal-scores')}</button>
      {/if}
      <button type="button" class="settings" onclick={openSettings} aria-label={t('score.settings')}>{t('score.settings')}</button>
    </div>
  </div>

  {#if data.hint}
    <p class="hint-line">{t('score.typical', { score: data.hint })}</p>
  {/if}

  {#if data.mode === 'categories'}
    {#if data.categories.length === 0}
      <p class="empty">{t('score.no-categories')}</p>
    {:else}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">{t('score.category')}</th>
              {#each data.players as player (player.id)}
                <th scope="col">{label(player)}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each data.categories as category (category.name)}
              <tr>
                <th scope="row">
                  {category.name}
                  <small>{t(category.points === 1 ? 'score.points-one' : 'score.points-many', {
                      count: category.points,
                    })}</small>
                </th>
                {#each data.players as player (player.id)}
                  {@const cell = `c:${category.name}`}
                  {@const note = instance.note(player.id, cell)}
                  <td>
                    <div class="cell">
                      <input
                        type="number"
                        min="0"
                        aria-label={t('score.count-aria', { player: label(player), category: category.name })}
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
                        aria-label={t('score.note-aria', { player: label(player), category: category.name })}
                        onclick={() => openNote(player.id, cell, `${label(player)} · ${category.name}`)}
                      >✎</button>
                    </div>
                    {#if note}<small class="cell-note">{note}</small>{/if}
                  </td>
                {/each}
              </tr>
            {/each}
            <tr class="totals-row">
              <th scope="row">{data.formula.trim() ? t('score.formula-total') : t('score.total')}</th>
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
            <th scope="col">{t('score.player')}</th>
            {#each Array(data.roundCount) as _, round (round)}
              <th scope="col">{round + 1}</th>
            {/each}
            <th scope="col">{t('score.total')}</th>
          </tr>
        </thead>
        <tbody>
          {#each data.players as player (player.id)}
            <tr>
              <th scope="row">
                <span class="dot" style={seatVars(player.color)}>{label(player).slice(0, 2).toUpperCase()}</span>
                {label(player)}
              </th>
              {#each Array(data.roundCount) as _, round (round)}
                {@const cell = `r:${round}`}
                {@const note = instance.note(player.id, cell)}
                <td>
                  <div class="cell">
                    <input
                      type="number"
                      aria-label={t('score.round-aria', { player: label(player), round: round + 1 })}
                      value={data.rounds[player.id]?.[round] ?? 0}
                      onkeydown={commitOnEnter}
                      onchange={(event) =>
                        instance.setRound(player.id, round, Number((event.currentTarget as HTMLInputElement).value))}
                    />
                    <button
                      type="button"
                      class="note-btn"
                      class:filled={!!note}
                      aria-label={t('score.note-round-aria', { player: label(player), round: round + 1 })}
                      onclick={() => openNote(player.id, cell, t('score.round-label', { player: label(player), round: round + 1 }))}
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
      <button type="button" onclick={() => instance.addRound()}>{t('score.add-round')}</button>
      <button type="button" onclick={() => instance.removeRound()}>{t('score.remove-round')}</button>
    </div>
  {:else if data.mode === 'ledger'}
    <ul class="ledger">
      {#each data.players as player (player.id)}
        <li class:leader={rankOf(player.id) === 1 && data.players.length > 1}>
          <div class="who">
            <span class="dot" style={seatVars(player.color)}>{label(player).slice(0, 2).toUpperCase()}</span>
            <span class="name">{label(player)}</span>
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
                    aria-label={t('score.remove-entry', { label: entry.label, player: label(player) })}
                    onclick={() => instance.removeLedgerEntry(player.id, entry.id)}
                  >✕</button>
                </li>
              {/each}
            </ul>
          {/if}
          <button type="button" class="add-entry" disabled={hiddenNow} onclick={() => openEntry(player.id)}>
            {t('score.add-entry')}
          </button>
        </li>
      {/each}
    </ul>
  {:else}
    <ul class="players">
      {#each data.players as player (player.id)}
        <li class:leader={rankOf(player.id) === 1 && data.players.length > 1}>
          <div class="who">
            <span class="dot" style={seatVars(player.color)}>{label(player).slice(0, 2).toUpperCase()}</span>
            <span class="name">{label(player)}</span>
            {#if data.players.length > 1}
              <span class="rank">#{rankOf(player.id)}</span>
            {/if}
          </div>
          <button
            type="button"
            class="total-button"
            aria-label={t('score.set-score', { name: label(player) })}
            disabled={hiddenNow}
            onclick={() => (editing = player.id)}
          >
            {shownTotal(player.id)}
          </button>
          <div class="adjust">
            <button type="button" onclick={() => instance.adjust(player.id, -data.step)} aria-label={t('score.minus', { step: data.step, name: label(player) })}>
              −{data.step}
            </button>
            <button type="button" onclick={() => instance.adjust(player.id, data.step)} aria-label={t('score.plus', { step: data.step, name: label(player) })}>
              +{data.step}
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  <div class="row">
    <button type="button" onclick={() => (adding = true)}>{t('score.add-player')}</button>
    <button type="button" onclick={() => instance.syncPlayers()}>{t('score.use-players')}</button>
  </div>
  <div class="row">
    <button type="button" class="band" onclick={copySheet}>{t('score.copy-sheet')}</button>
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
    <summary>{t('score.clear-scores')}</summary>
    <p>{t('score.clear-body', { start: data.start })}</p>
    <button type="button" class="danger" onclick={() => instance.clearAll()}>{t('score.clear-all')}</button>
  </details>
</div>

{#if editing}
  <Sheet title={t('score.set-score-title')} onclose={() => (editing = null)}>
    <NumberPad
      value={totalFor(data, editing)}
      label={t('score.score')}
      onsubmit={(value) => {
        if (editing) instance.setTotal(editing, value);
        editing = null;
      }}
      oncancel={() => (editing = null)}
    />
  </Sheet>
{/if}

{#if adding}
  <Sheet title={t('score.add-player')} onclose={() => (adding = false)}>
    <label class="field">
      <span>{t('score.name')}</span>
      <input type="text" bind:value={newName} onkeydown={(event) => { if (event.key === 'Enter') addPlayerNow(); }} />
    </label>
    <button type="button" class="wide" onclick={addPlayerNow}>{t('score.add')}</button>
  </Sheet>
{/if}

{#if entryFor}
  <Sheet title={t('score.entry-title')} onclose={() => (entryFor = null)}>
    <p class="hint">{t('score.entry-hint', { name: playerName(entryFor) })}</p>
    <label class="field">
      <span>{t('score.entry-label')}</span>
      <input type="text" bind:value={entryLabel} placeholder={t('score.entry-placeholder')} />
    </label>
    <label class="field">
      <span>{t('score.amount')}</span>
      <input type="number" bind:value={entryAmount} placeholder="12" />
    </label>
    <button type="button" class="wide" onclick={saveEntry}>{t('score.add-entry')}</button>
  </Sheet>
{/if}

{#if noteEdit}
  <Sheet title={t('score.note-title')} onclose={() => (noteEdit = null)}>
    <p class="hint">{noteEdit.label}</p>
    <label class="field">
      <span>{t('score.note')}</span>
      <textarea rows="3" bind:value={noteEdit.draft} placeholder={t('score.note-placeholder')} spellcheck="true"></textarea>
    </label>
    <button type="button" class="wide" onclick={saveNote}>{t('score.save-note')}</button>
  </Sheet>
{/if}

{#if settingsOpen}
  <Sheet title={t('score.settings')} onclose={() => (settingsOpen = false)}>
    <label class="field">
      <span>{t('score.win-condition')}</span>
      <select
        value={data.win}
        onchange={(event) =>
          instance.setWin((event.currentTarget as HTMLSelectElement).value as 'highest' | 'lowest')}
      >
        <option value="highest">{t('score.highest')}</option>
        <option value="lowest">{t('score.lowest')}</option>
      </select>
    </label>

    <label class="field">
      <span>{t('score.step')}</span>
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
      <span>{t('score.target-label')}</span>
      <input
        type="number"
        min="0"
        value={data.target}
        onkeydown={commitOnEnter}
        onchange={(event) => instance.setTarget(Number((event.currentTarget as HTMLInputElement).value))}
      />
    </label>

    <label class="field">
      <span>{t('score.hint-label')}</span>
      <input
        type="text"
        value={data.hint}
        placeholder={t('score.hint-placeholder')}
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
      <span>{t('score.hide-totals')}</span>
    </label>

    {#if data.mode === 'categories'}
      <div class="cat-list">
        <span class="cat-head">{t('score.cat-head')}</span>
        {#each categoryDraft as category, index (index)}
          <div class="cat-row">
            <input
              type="text"
              aria-label={t('score.cat-name', { index: index + 1 })}
              bind:value={category.name}
              placeholder={t('score.example-city')}
            />
            <input
              type="number"
              aria-label={t('score.cat-points', { index: index + 1 })}
              bind:value={category.points}
              min="0"
            />
            <button
              type="button"
              class="remove"
              aria-label={t('score.remove-cat', { index: index + 1 })}
              onclick={() => (categoryDraft = categoryDraft.filter((_, at) => at !== index))}
            >✕</button>
          </div>
        {/each}
        <div class="cat-actions">
          <button
            type="button"
            onclick={() => (categoryDraft = [...categoryDraft, { name: '', points: 1 }])}
          >{t('score.add-cat')}</button>
          <button type="button" class="save" onclick={saveCategories}>{t('score.save-cats')}</button>
        </div>
      </div>

      <label class="field">
        <span>{t('score.formula-label')}</span>
        <textarea
          rows="2"
          bind:value={formulaDraft}
          placeholder={t('score.formula-placeholder')}
          spellcheck="false"
        ></textarea>
      </label>
      {#if !formulaCheck.ok}
        <p class="formula bad">{formulaCheck.message}</p>
      {/if}
      <button type="button" class="wide" onclick={saveFormula}>{t('score.save-formula')}</button>
      <p class="hint">{t('score.formula-hint')}</p>
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
    border-radius: var(--radius-pill);
    background: var(--accent-soft);
    color: var(--text);
    cursor: pointer;
    font-weight: 700;
  }
  .settings {
    min-height: 40px;
    padding: 0 var(--space-3);
    border-radius: var(--radius);
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
    border-radius: var(--radius-card);
    padding: var(--space-3) var(--space-4);
    background: var(--surface);
    box-shadow: var(--shadow-card);
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--space-2);
    align-items: center;
  }
  .players li.leader {
    background: linear-gradient(180deg, var(--accent-soft), var(--surface) 70%);
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
    border-radius: var(--radius-round);
    background: var(--player);
    color: var(--seat-ink, var(--on-seat));
    font-family: var(--font-display);
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
    min-width: 96px;
    min-height: 64px;
    padding: 0 var(--space-2);
    border: 0;
    border-radius: var(--radius-lg);
    background: transparent;
    color: var(--accent);
    font-size: clamp(2.5rem, 10vw, 3.5rem);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    line-height: 1;
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
    color: var(--text);
    font-size: var(--text-base);
    font-weight: 700;
    cursor: pointer;
  }


  .table-wrap {
    border-radius: var(--radius);
  }
  .table-wrap table {
    table-layout: fixed;
  }



  tbody th {
    text-align: left;
    font-size: var(--text-sm);
    overflow-wrap: anywhere;
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
    border: 0;
    width: 100%;
    max-width: 4.2rem;
    min-width: 0;
    min-height: 44px;
    border-radius: var(--radius);
    font-family: var(--font-display);
    font-size: var(--text-lg);
    font-weight: 700;
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
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
    font-size: var(--text-xs);
  }
  .note-btn.filled {
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
    border-radius: var(--radius-lg);
    background: var(--surface);
    padding: var(--space-2) var(--space-3);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
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
    border-radius: var(--radius-pill);
    background: var(--surface-2);
    color: var(--text-dim);
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
  /* Placement only: the shared .danger key owns the fill and the shape. */
  .danger {
    cursor: pointer;
    padding: 0 var(--space-3);
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
    border: 0;
    min-height: 44px;
    border-radius: var(--radius-sm);
    background: var(--surface-2);
    color: var(--text);
    padding: 0 var(--space-2);
    font: inherit;
    min-width: 0;
  }
  .cat-row button.remove {
    min-height: 44px;
    border-radius: var(--radius-sm);
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
    color: var(--text);
    cursor: pointer;
    font: inherit;
  }
  .cat-actions button.save {
    --cutout-fill: var(--accent-soft);
    font-weight: 700;
  }

</style>
