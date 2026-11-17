<script lang="ts">
  import { t } from '../../core/i18n.svelte';
  import type { ToolContext } from '../../core/registry';
  import EmptyState from '../../core/ui/EmptyState.svelte';
  import Sheet from '../../core/ui/Sheet.svelte';
  import { PROMPT_PACKS } from '../../data/prompts';
  import type { PromptsInstance } from './tool.svelte';

  let { ctx, instance }: { ctx: ToolContext; instance: PromptsInstance } = $props();
  const data = $derived(instance.data);

  let importOpen = $state(false);
  let importDraft = $state('');

  const packs = $derived([
    ...PROMPT_PACKS,
    ...data.custom.map((pack) => ({
      id: pack.name,
      name: pack.name,
      blurb: t('prompts.entries', { count: pack.items.length }),
      items: pack.items,
    })),
  ]);
</script>

<div class="prompts">
  <div class="controls">
    <label class="field">
      <span>{t('prompts.cards')}</span>
      <input type="number" min="1" max="10" value={data.draw} onchange={(event) => instance.setDraw(Number((event.currentTarget as HTMLInputElement).value))} />
    </label>
    <button type="button" class="primary" onclick={() => instance.draw()}>{t('prompts.draw')}</button>
  </div>

  <div class="packs">
    {#each packs as pack (pack.id)}
      <button type="button" class:active={data.packs.includes(pack.id)} onclick={() => instance.togglePack(pack.id)} title={pack.blurb}>
        {pack.name}
      </button>
    {/each}
  </div>

  <label class="check">
    <input type="checkbox" checked={data.designer} onchange={(event) => instance.setDesigner((event.currentTarget as HTMLInputElement).checked)} />
    <span>{t('prompts.designer')}</span>
  </label>

  {#if data.cards.length}
    <ul class="cards">
      {#each data.cards as card, index (card.item)}
        <li>
          <span class="pack">{card.pack}</span>
          <p class="item">{card.item}</p>
          <div class="actions">
            <button type="button" onclick={() => instance.reroll(index)} aria-label={t('prompts.replace', { item: card.item })}>{t('prompts.reroll')}</button>
            <button type="button" class:on={data.locked.includes(card.item)} onclick={() => instance.toggleLock(card.item)} aria-pressed={data.locked.includes(card.item)}>
              {data.locked.includes(card.item) ? t('prompts.locked') : t('prompts.lock')}
            </button>
            <button type="button" onclick={() => instance.toggleFavorite(card.item)} aria-pressed={data.favorites.includes(card.item)}>
              {data.favorites.includes(card.item) ? '★' : '☆'}
            </button>
            <button type="button" onclick={() => instance.exclude(card.item)}>{t('prompts.hide')}</button>
          </div>
        </li>
      {/each}
    </ul>
  {:else}
    <EmptyState title={t('prompts.empty-title')} body={t('prompts.empty-body')} />
  {/if}

  {#if data.favorites.length}
    <section class="panel">
      <h2>{t('prompts.favourites')}</h2>
      <ul class="faves">
        {#each data.favorites as item (item)}
          <li>{item}</li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if data.excluded.length}
    <section class="panel">
      <header>
        <h2>{t('prompts.hidden', { count: data.excluded.length })}</h2>
        <button type="button" onclick={() => { data.excluded = []; }}>{t('prompts.show-again')}</button>
      </header>
      <p class="dim small">{data.excluded.join(' · ')}</p>
    </section>
  {/if}

  <label class="inline">
    <span>{t('prompts.seed')}</span>
    <input type="text" value={data.seed} placeholder={t('prompts.seed-placeholder')} onchange={(event) => instance.setSeed((event.currentTarget as HTMLInputElement).value)} />
  </label>

  <div class="row">
    <button type="button" onclick={() => (importOpen = true)}>{t('prompts.import-packs')}</button>
    <button type="button" onclick={() => instance.clear()}>{t('prompts.clear-table')}</button>
  </div>

  {#if data.history.length}
    <ol class="history dim small">
      {#each data.history as line, index (index)}
        <li>{line}</li>
      {/each}
    </ol>
  {/if}
</div>

{#if importOpen}
  <Sheet title={t('prompts.import-title')} onclose={() => (importOpen = false)}>
    <p class="dim small">{t('prompts.import-hint')}</p>
    <label class="field">
      <span>{t('prompts.pack-text')}</span>
      <textarea rows="10" bind:value={importDraft} spellcheck="false" placeholder="[Snacks]&#10;toast&#10;olives&#10;cold pizza"></textarea>
    </label>
    <button type="button" class="wide primary" onclick={() => { instance.importPacks(importDraft); importOpen = false; }}>{t('prompts.add-packs')}</button>
  </Sheet>
{/if}

<style>
  .prompts {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3);
  }
  .controls {
    display: flex;
    align-items: flex-end;
    gap: var(--space-2);
  }



  .packs {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }
  .packs button {
    min-height: 44px;
    padding: 0 var(--space-3);
    border-radius: var(--radius-pill);
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
    font-size: var(--text-sm);
  }
  .packs button.active {
    background: var(--accent-soft);
    font-weight: 700;
  }


  .cards {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
    gap: var(--space-2);
  }
  .cards li {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3);
    border-radius: var(--radius-lg);
    background: var(--surface-2);
  }
  .pack {
    font-size: var(--text-xs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-dim);
    font-weight: 700;
  }
  .item {
    margin: 0;
    font-size: var(--text-lg);
    font-weight: 700;
    flex: 1;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }
  .actions button {
    min-height: 40px;
    padding: 0 var(--space-2);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--text);
    font-size: var(--text-sm);
    cursor: pointer;
  }
  .actions button.on {
    background: var(--accent-soft);
    font-weight: 700;
  }


  h2 {
    margin: 0;
    font-size: var(--text-base);
  }
  .panel header button {
    min-height: 40px;
    padding: 0 var(--space-2);
    border-radius: var(--radius);
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
  }
  .faves {
    margin: 0;
    padding-left: var(--space-4);
    color: var(--text-dim);
  }
  .inline {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    color: var(--text-dim);
    min-height: 48px;
  }
  .inline input {
    border: 0;
    min-height: 44px;
    min-width: 9rem;
    background: var(--surface-2);
    color: var(--text);
    padding: 0 var(--space-2);
  }








</style>
