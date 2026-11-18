<script lang="ts">
  import { t } from '../../core/i18n.svelte';
  import type { ToolContext } from '../../core/registry';
  import { WORD_LANGS, cachedPack, packName, type WordLang } from '../../data/words/packs';
  import { WORD_MODES, type WordMode } from './logic';
  import type { WordsInstance } from './tool.svelte';

  let { ctx, instance }: { ctx: ToolContext; instance: WordsInstance } = $props();
  const data = $derived(instance.data);
  // The pack is a chunk of its own: the frame draws now, the count arrives with it.
  // `ready` is read here so the derived value recomputes when the chunk lands.
  const pack = $derived(data.ready ? cachedPack(data.lang) : undefined);

  const MODE_LABELS = $derived<Record<WordMode, string>>({
    check: t('words.mode-check'),
    filters: t('words.mode-filters'),
    anagram: t('words.mode-anagram'),
    rack: t('words.mode-rack'),
    letters: t('words.mode-letters'),
    codenames: t('words.mode-codenames'),
  });

  const KEY_LABELS = $derived({
    red: t('words.key-red'),
    blue: t('words.key-blue'),
    neutral: t('words.key-neutral'),
    assassin: t('words.key-assassin'),
  });
</script>

<div class="words">
  <div class="head">
    <label class="field">
      <span>{t('words.word-pack')}</span>
      <select value={data.lang} onchange={(event) => instance.setLang((event.currentTarget as HTMLSelectElement).value as WordLang)}>
        {#each WORD_LANGS as lang (lang)}
          <option value={lang}>{packName(lang)}</option>
        {/each}
      </select>
    </label>
    {#if pack}
      <p class="dim small">{t('words.pack-line', { count: pack.words.length, license: pack.license })}</p>
    {/if}
  </div>

  <div class="modes" role="group" aria-label={t('words.word-tool')}>
    {#each WORD_MODES as mode (mode)}
      <button type="button" class:active={data.mode === mode} onclick={() => instance.setMode(mode)}>
        {MODE_LABELS[mode]}
      </button>
    {/each}
  </div>

  {#if data.mode === 'check'}
    <form class="entry" onsubmit={(event) => { event.preventDefault(); instance.run(); }}>
      <label class="sr-only" for="words-check">{t('words.word-to-check')}</label>
      <input id="words-check" type="text" value={data.query} placeholder={t('words.check-placeholder')} autocomplete="off" spellcheck="false" oninput={(event) => instance.setQuery((event.currentTarget as HTMLInputElement).value)} />
      <button type="submit" class="primary">{t('words.check')}</button>
    </form>
    {#if data.check}
      <p class="verdict" class:bad={!data.check.valid} role="status">
        <strong>{data.check.word}</strong>
        {data.check.valid
          ? t('words.in-list', { pack: packName(data.lang) })
          : t('words.not-in-list')}
      </p>
      {#if !data.check.valid && data.check.close.length}
        <p class="dim small">{t('words.close-matches', { words: data.check.close.join(', ') })}</p>
      {/if}
      <p class="dim small">{t('words.list-warning')}</p>
    {/if}
  {:else if data.mode === 'filters'}
    <div class="filters">
      <label class="field"><span>{t('words.shortest')}</span><input type="number" min="0" max="30" value={data.filters.min} onchange={(event) => instance.setFilter('min', Number((event.currentTarget as HTMLInputElement).value))} /></label>
      <label class="field"><span>{t('words.longest')}</span><input type="number" min="0" max="30" value={data.filters.max} onchange={(event) => instance.setFilter('max', Number((event.currentTarget as HTMLInputElement).value))} /></label>
      <label class="field"><span>{t('words.starts-with')}</span><input type="text" value={data.filters.starts} oninput={(event) => instance.setFilter('starts', (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="field"><span>{t('words.ends-with')}</span><input type="text" value={data.filters.ends} oninput={(event) => instance.setFilter('ends', (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="field"><span>{t('words.contains')}</span><input type="text" value={data.filters.contains} oninput={(event) => instance.setFilter('contains', (event.currentTarget as HTMLInputElement).value)} /></label>
      <label class="field"><span>{t('words.pattern')}</span><input type="text" value={data.filters.pattern} placeholder="c_t" oninput={(event) => instance.setFilter('pattern', (event.currentTarget as HTMLInputElement).value)} /></label>
    </div>
    <button type="button" class="primary wide" onclick={() => instance.run()}>{t('words.search')}</button>
  {:else if data.mode === 'anagram' || data.mode === 'rack'}
    <form class="entry" onsubmit={(event) => { event.preventDefault(); instance.run(); }}>
      <label class="sr-only" for="words-letters">{t('words.letters')}</label>
      <input id="words-letters" type="text" value={data.letters} placeholder="RETAIN" autocomplete="off" spellcheck="false" oninput={(event) => instance.setLetters((event.currentTarget as HTMLInputElement).value)} />
      <button type="submit" class="primary">{data.mode === 'rack' ? t('words.solve') : t('words.find')}</button>
    </form>
    {#if data.mode === 'rack'}
      <label class="inline">
        <span>{t('words.blanks')}</span>
        <input type="number" min="0" max="4" value={data.blanks} onchange={(event) => instance.setBlanks(Number((event.currentTarget as HTMLInputElement).value))} />
      </label>
    {/if}
  {:else if data.mode === 'letters'}
    <div class="entry">
      <label class="field"><span>{t('words.how-many')}</span><input type="number" min="1" max="20" value={data.count} onchange={(event) => instance.setCount(Number((event.currentTarget as HTMLInputElement).value))} /></label>
      <button type="button" class="primary" onclick={() => instance.run()}>{t('words.draw-letters')}</button>
    </div>
    {#if data.picked.length}
      <ul class="picked" aria-label={t('words.picked-letters')}>
        {#each data.picked as letter (letter)}
          <li>{letter.toUpperCase()}</li>
        {/each}
      </ul>
    {/if}
  {:else}
    <div class="row">
      <button type="button" class="primary" onclick={() => instance.newBoard()}>{t('words.new-board')}</button>
      <button type="button" onclick={() => instance.toggleKey()}>{data.showKey ? t('words.hide-key') : t('words.show-key')}</button>
    </div>
    <div class="board" role="grid" aria-label={t('words.board')}>
      {#each data.board.words as word, index (index)}
        <button
          type="button"
          class="tile"
          class:keyed={data.showKey}
          class:red={data.showKey && data.board.key[index] === 'red'}
          class:blue={data.showKey && data.board.key[index] === 'blue'}
          class:neutral={data.showKey && data.board.key[index] === 'neutral'}
          class:assassin={data.showKey && data.board.key[index] === 'assassin'}
          class:revealed={data.board.revealed[index]}
          onclick={() => instance.revealTile(index)}
        >
          <span class="word">{word}</span>
          {#if data.showKey}<span class="key">{KEY_LABELS[data.board.key[index]] ?? ''}</span>{/if}
        </button>
      {/each}
    </div>
  {/if}

  {#if data.scored.length}
    <ol class="results scored">
      {#each data.scored as row (row.word)}
        <li><span class="word">{row.word}</span><span class="points">{row.score}{#if !row.exact}<span class="blank"> {t('words.blank')}</span>{/if}</span></li>
      {/each}
    </ol>
  {:else if data.results.length}
    <ul class="results">
      {#each data.results as word (word)}
        <li>{word}</li>
      {/each}
    </ul>
  {/if}

  <label class="inline">
    <span>{t('words.seed')}</span>
    <input type="text" value={data.seed} placeholder={t('words.seed-placeholder')} onchange={(event) => instance.setSeed((event.currentTarget as HTMLInputElement).value)} />
  </label>

  {#if data.history.length}
    <ol class="history dim small">
      {#each data.history as line, index (index)}
        <li>{line}</li>
      {/each}
    </ol>
  {/if}
</div>

<style>
  .words {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3);
  }
  .head {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    align-items: flex-end;
    justify-content: space-between;
  }

  .field input,
  .field select {
    border: 0;
    min-height: 44px;
    background: var(--surface-2);
    color: var(--text);
    padding: 0 var(--space-2);
    font: inherit;
  }



  .entry {
    display: flex;
    gap: var(--space-2);
    align-items: flex-end;
  }
  .entry input {
    border: 0;
    flex: 1;
    min-height: 56px;
    background: var(--surface);
    color: var(--text);
    padding: 0 var(--space-3);
    font-family: var(--font-mono);
    font-size: var(--text-lg);
    text-transform: uppercase;
  }

  .primary.wide {
    width: 100%;
  }
  .verdict {
    margin: 0;
    padding: var(--space-3);
    border-radius: var(--radius);
    background: var(--accent-soft);
  }
  .verdict.bad {
    background: var(--danger-soft);
  }
  .filters {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
    gap: var(--space-2);
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
    min-width: 8rem;
    background: var(--surface-2);
    color: var(--text);
    padding: 0 var(--space-2);
  }
  .results {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }
  .results li {
    display: flex;
    gap: var(--space-2);
    align-items: baseline;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius);
    background: var(--surface-2);
    font-family: var(--font-mono);
  }
  .results.scored {
    flex-direction: column;
    align-items: stretch;
    gap: 2px;
  }
  .results.scored li {
    justify-content: space-between;
    font-family: var(--font);
  }
  .points {
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .blank {
    font-weight: 400;
    color: var(--text-dim);
    font-size: var(--text-xs);
  }
  .picked {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  .picked li {
    display: grid;
    place-items: center;
    min-width: 56px;
    min-height: 64px;
    border-radius: var(--radius);
    background: var(--accent-soft);
    font-size: var(--text-xl);
    font-weight: 800;
    font-family: var(--font-mono);
  }



  .board {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: var(--space-1);
  }
  .tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    min-height: 4.2rem;
    padding: var(--space-1);
    border-radius: var(--radius-sm);
    background: var(--surface-2);
    color: var(--text);
    font-weight: 700;
    font-size: var(--text-sm);
    cursor: pointer;
  }
  .tile.keyed.red {
    background: var(--team-red-wash);
    color: var(--text);
  }
  .tile.keyed.blue {
    background: var(--team-blue-wash);
    color: var(--text);
  }
  .tile.keyed.neutral {
    background: var(--surface-2);
  }
  .tile.keyed.assassin {
    background: var(--team-black);
    color: var(--on-accent);
  }
  .tile.revealed {
    text-decoration: line-through;
    opacity: 0.65;
  }
  .key {
    font-size: var(--text-xs);
    font-weight: 600;
  }



</style>
