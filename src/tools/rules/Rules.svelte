<script lang="ts">
  import { t } from '../../core/i18n.svelte';
  import type { ToolContext } from '../../core/registry';
  import Sheet from '../../core/ui/Sheet.svelte';
  import {
    glossaryMatches,
    parseRules,
    plainText,
    rulesMatches,
    setupProgress,
    type GlossaryEntry,
    type RulesInstance,
    type ScoringRow,
  } from './logic';

  let { ctx, instance }: { ctx: ToolContext; instance: RulesInstance } = $props();
  const data = $derived(instance.data);

  let query = $state('');
  let textOpen = $state(false);
  let quickDraft = $state('');
  let rulesDraft = $state('');
  let setupDraft = $state('');
  let sourceDraft = $state('');
  let referenceOpen = $state(false);
  let glossaryDraft = $state<GlossaryEntry[]>([]);
  let scoringDraft = $state<ScoringRow[]>([]);

  const blocks = $derived(query.trim() ? rulesMatches(data.rules, query) : parseRules(data.rules));
  const glossaryShown = $derived(glossaryMatches(data.glossary, query));
  const progress = $derived(setupProgress(data.setup));

  function openText(): void {
    quickDraft = data.quick;
    rulesDraft = data.rules;
    setupDraft = data.setup.map((item) => item.text).join('\n');
    sourceDraft = data.source;
    textOpen = true;
  }

  function saveText(): void {
    ctx.undo.batch(t('rules.undo-text'), () => {
      instance.setQuick(quickDraft);
      instance.setRules(rulesDraft);
      instance.setSetup(setupDraft.split('\n'));
      instance.setSource(sourceDraft);
    });
    textOpen = false;
  }

  function openReference(): void {
    glossaryDraft = data.glossary.map((entry) => ({ ...entry }));
    scoringDraft = data.scoring.map((row) => ({ ...row }));
    referenceOpen = true;
  }

  function saveReference(): void {
    ctx.undo.batch(t('rules.undo-reference'), () => {
      instance.setGlossary(glossaryDraft);
      instance.setScoring(scoringDraft);
    });
    referenceOpen = false;
  }
</script>

<div class="rules">
  {#if data.quick}
    <p class="quick">{data.quick}</p>
  {/if}

  {#if data.setup.length}
    <section class="block">
      <header>
        <h2>{t('rules.setup')}</h2>
        <span class="progress">{t('rules.progress', { done: progress.done, total: progress.total })}</span>
      </header>
      <ul class="checklist">
        {#each data.setup as item, index (index)}
          <li>
            <label>
              <input
                type="checkbox"
                checked={item.done}
                onchange={() => instance.toggleSetup(index)}
              />
              <span class:done={item.done}>{item.text}</span>
            </label>
          </li>
        {/each}
      </ul>
      {#if progress.done}<button type="button" class="ghost" onclick={() => instance.resetSetup()}>{t('rules.reset-checklist')}</button>{/if}
    </section>
  {/if}

  {#if data.rules || data.glossary.length}
    <label class="search">
      <span class="sr-only">{t('rules.search')}</span>
      <input type="search" bind:value={query} placeholder={t('rules.search-placeholder')} />
    </label>
  {/if}

  {#if data.rules}
    <section class="block text">
      {#each blocks as block, index (index)}
        {#if block.kind === 'heading'}
          <h3 class="h{block.level}">{plainText(block.text)}</h3>
        {:else if block.kind === 'item'}
          <p class="item">• {plainText(block.text)}</p>
        {:else}
          <p>{plainText(block.text)}</p>
        {/if}
      {/each}
      {#if query.trim() && blocks.length === 0}
        <p class="hint">{t('rules.nothing-rules', { query })}</p>
      {/if}
    </section>
  {/if}

  {#if data.scoring.length}
    <section class="block">
      <h2>{t('rules.scoring')}</h2>
      <table>
        <thead>
          <tr><th scope="col">{t('rules.thing')}</th><th scope="col">{t('rules.points')}</th></tr>
        </thead>
        <tbody>
          {#each data.scoring as row (row.name)}
            <tr>
              <th scope="row">{row.name}</th>
              <td>{row.points}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </section>
  {/if}

  {#if data.glossary.length}
    <section class="block">
      <h2>{t('rules.glossary')}</h2>
      {#if glossaryShown.length}
        <dl>
          {#each glossaryShown as entry (entry.term)}
            <dt>{entry.term}</dt>
            <dd>{entry.definition}</dd>
          {/each}
        </dl>
      {:else}
        <p class="hint">{t('rules.nothing-glossary', { query })}</p>
      {/if}
    </section>
  {/if}

  {#if data.source}
    <p class="source">
      {t('rules.source')}
      {#if /^https?:\/\//.test(data.source)}
        <a href={data.source} target="_blank" rel="noopener noreferrer">{data.source}</a>
      {:else}
        <span>{data.source}</span>
      {/if}
    </p>
  {/if}

  <div class="row">
    <button type="button" onclick={openText}>{t('rules.edit-rules')}</button>
    <button type="button" onclick={openReference}>{t('rules.edit-reference')}</button>
  </div>
</div>

{#if textOpen}
  <Sheet title={t('rules.text-title')} onclose={() => (textOpen = false)}>
    <label class="field">
      <span>{t('rules.quick-card')}</span>
      <input type="text" bind:value={quickDraft} placeholder={t('rules.quick-placeholder')} />
    </label>
    <label class="field">
      <span>{t('rules.rules')}</span>
      <textarea rows="10" bind:value={rulesDraft} spellcheck="true" placeholder={t('rules.rules-placeholder')}></textarea>
    </label>
    <label class="field">
      <span>{t('rules.setup-label')}</span>
      <textarea rows="4" bind:value={setupDraft} spellcheck="true" placeholder={t('rules.setup-placeholder')}></textarea>
    </label>
    <label class="field">
      <span>{t('rules.source-link')}</span>
      <input type="text" bind:value={sourceDraft} placeholder={t('rules.source-placeholder')} />
    </label>
    <button type="button" class="wide" onclick={saveText}>{t('rules.save-rules')}</button>
    <p class="hint">{t('rules.text-hint')}</p>
  </Sheet>
{/if}

{#if referenceOpen}
  <Sheet title={t('rules.reference')} onclose={() => (referenceOpen = false)}>
    <h3>{t('rules.scoring')}</h3>
    {#each scoringDraft as row, index (index)}
      <div class="ref-row">
        <input type="text" aria-label={t('rules.scoring-name', { index: index + 1 })} bind:value={row.name} placeholder={t('rules.example-city')} />
        <input type="number" aria-label={t('rules.scoring-points', { index: index + 1 })} bind:value={row.points} />
        <button type="button" aria-label={t('rules.remove-scoring', { index: index + 1 })} onclick={() => (scoringDraft = scoringDraft.filter((_, at) => at !== index))}>✕</button>
      </div>
    {/each}
    <button type="button" onclick={() => (scoringDraft = [...scoringDraft, { name: '', points: 1 }])}>{t('rules.add-scoring')}</button>

    <h3>{t('rules.glossary')}</h3>
    {#each glossaryDraft as entry, index (index)}
      <div class="ref-row">
        <input type="text" aria-label={t('rules.glossary-term', { index: index + 1 })} bind:value={entry.term} placeholder={t('rules.example-meeple')} />
        <input type="text" aria-label={t('rules.glossary-definition', { index: index + 1 })} bind:value={entry.definition} placeholder={t('rules.example-person')} />
        <button type="button" aria-label={t('rules.remove-glossary', { index: index + 1 })} onclick={() => (glossaryDraft = glossaryDraft.filter((_, at) => at !== index))}>✕</button>
      </div>
    {/each}
    <button type="button" onclick={() => (glossaryDraft = [...glossaryDraft, { term: '', definition: '' }])}>{t('rules.add-term')}</button>

    <button type="button" class="wide" onclick={saveReference}>{t('rules.save-reference')}</button>
  </Sheet>
{/if}

<style>
  .rules {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3);
  }
  .quick {
    margin: 0;
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-lg);
    background: var(--accent-soft);
    font-size: var(--text-lg);
    font-weight: 700;
  }

  .block header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-2);
  }
  h2 {
    margin: 0;
    font-size: var(--text-lg);
  }
  h3 {
    margin: 0;
    font-size: var(--text-base);
  }
  .progress {
    color: var(--text-dim);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
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
    flex: none;
  }
  .checklist .done {
    color: var(--text-dim);
    text-decoration: line-through;
  }
  .text h3 {
    margin-top: var(--space-2);
  }
  .text .h1 {
    font-size: var(--text-xl);
  }
  .text .h2 {
    font-size: var(--text-lg);
  }
  .text p {
    margin: 0;
    color: var(--text);
  }
  .text .item {
    padding-left: var(--space-3);
  }
  .search input {
    border: 0;
    width: 100%;
    min-height: 48px;
    border-radius: var(--radius-pill);
    background: var(--surface);
    color: var(--text);
    padding: 0 var(--space-3);
  }



  tbody td {
    text-align: right;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  dl {
    margin: 0;
    display: grid;
    grid-template-columns: minmax(6rem, auto) 1fr;
    gap: var(--space-1) var(--space-3);
  }
  dt {
    font-weight: 700;
  }
  dd {
    margin: 0;
    color: var(--text-dim);
  }
  .source {
    margin: 0;
    color: var(--text-dim);
    font-size: var(--text-sm);
    overflow-wrap: anywhere;
  }





  .field input,
  .field textarea {
    border: 0;
    min-height: 48px;
    background: var(--surface-2);
    color: var(--text);
    padding: 0 var(--space-3);
    font: inherit;
  }

  .ref-row {
    display: grid;
    grid-template-columns: 1fr 1fr 2.75rem;
    gap: var(--space-2);
  }
  .ref-row input {
    border: 0;
    min-height: 44px;
    border-radius: var(--radius-sm);
    background: var(--surface-2);
    color: var(--text);
    padding: 0 var(--space-2);
    font: inherit;
    min-width: 0;
  }
  .ref-row button {
    min-height: 44px;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
  }

</style>
