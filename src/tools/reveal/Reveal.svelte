<script lang="ts">
  import { language, seatName, t } from '../../core/i18n.svelte';
  import type { ToolContext } from '../../core/registry';
  import PassThePhone from '../../core/ui/PassThePhone.svelte';
  import Sheet from '../../core/ui/Sheet.svelte';
  import {
    allBid,
    allVoted,
    bidLeaders,
    firstUnvoted,
    roleOf,
    tally,
    type RevealInstance,
    type RevealRole,
  } from './logic';

  let { ctx, instance }: { ctx: ToolContext; instance: RevealInstance } = $props();
  const data = $derived(instance.data);

  let rolesOpen = $state(false);
  let roleDraft = $state<RevealRole[]>([]);
  let ballotOpen = $state(false);
  let questionDraft = $state('');
  let optionsDraft = $state('');
  let bidRangeOpen = $state(false);
  let minDraft = $state(0);
  let maxDraft = $state(100);
  let holding = $state(false);
  let bidDraft = $state('');
  // Modal covers trap the board on purpose; these let the table step back out.
  let passing = $state(false);
  let ballotPassing = $state(true);
  let bidPassing = $state(true);
  let autoOpened = false;

  // Once roles are dealt, open the first pass screen. Later re-deals do not
  // reopen it, so the table is never yanked back to the cover mid-game.
  $effect(() => {
    if (autoOpened || !data.dealt || data.allRevealed) return;
    autoOpened = true;
    passing = true;
  });

  const holder = $derived(data.players[data.holder]);
  const voted = $derived(allVoted(data));
  const bidIn = $derived(allBid(data));
  const voterIndex = $derived(firstUnvoted(data, 'ballot'));
  const bidderIndex = $derived(firstUnvoted(data, 'bid'));
  const leaders = $derived(bidLeaders(data, language()));
  /** A player's name in the active language; a generated seat never freezes. */
  const label = (player: { name: string; seat?: number }): string => seatName(player.seat, player.name);

  const MODES: { id: 'roles' | 'ballot' | 'bid'; key: string }[] = [
    { id: 'roles', key: 'reveal.roles' },
    { id: 'ballot', key: 'reveal.ballot' },
    { id: 'bid', key: 'reveal.bid' },
  ];

  function openRoles(): void {
    roleDraft = data.roles.map((role) => ({ ...role }));
    rolesOpen = true;
  }

  function saveRoles(): void {
    instance.setRoles(roleDraft);
    rolesOpen = false;
  }

  function openBallot(): void {
    questionDraft = data.ballot.question;
    optionsDraft = data.ballot.options.join(', ');
    ballotOpen = true;
  }

  function saveBallot(): void {
    ctx.undo.batch(t('reveal.ballot'), () => {
      instance.setBallotQuestion(questionDraft);
      instance.setBallotOptions(optionsDraft.split(','));
    });
    ballotPassing = true;
    ballotOpen = false;
  }

  function openBidRange(): void {
    minDraft = data.bids.min;
    maxDraft = data.bids.max;
    bidRangeOpen = true;
  }

  function saveBidRange(): void {
    const min = Math.max(0, Math.min(minDraft, maxDraft - 1));
    const max = Math.max(min + 1, maxDraft);
    instance.setBidRange(min, max);
    bidRangeOpen = false;
  }

  function saveBid(): void {
    if (bidderIndex < 0) return;
    const player = data.players[bidderIndex];
    instance.setBid(player.id, bidDraft.trim() === '' ? null : Number(bidDraft));
    bidDraft = '';
  }

  function vote(option: string): void {
    if (voterIndex < 0) return;
    instance.castVote(data.players[voterIndex].id, option);
  }
</script>

<div class="reveal">
  <div class="modes" role="group" aria-label={t('reveal.mode')}>
    {#each MODES as item (item.id)}
      <button type="button" class:active={data.mode === item.id} onclick={() => instance.setMode(item.id)}>
        {t(item.key)}
      </button>
    {/each}
  </div>

  {#if data.mode === 'roles'}
    {#if !data.dealt}
      <div class="panel">
        <h2>{t('reveal.roles')}</h2>
        {#if data.roles.length}
          <ul class="role-list">
            {#each data.roles as role (role.name)}
              <li>
                <strong>{role.name}</strong>
                <span class="count">×{role.count}</span>
                {#if role.description}<small>{role.description}</small>{/if}
              </li>
            {/each}
          </ul>
          <p class="hint">{t('reveal.cards-for', {
            cards: data.roles.reduce((sum, role) => sum + role.count, 0),
            players: data.players.length,
          })}</p>
        {:else}
          <p class="hint">{t('reveal.no-roles')}</p>
        {/if}
        <button
          type="button"
          class="wide"
          onclick={() => {
            instance.deal();
            passing = true;
          }}
        >{t('reveal.deal')}</button>
        <button type="button" onclick={openRoles}>{t('reveal.edit-roles')}</button>
      </div>
    {:else if data.allRevealed}
      <div class="panel">
        <h2>{t('reveal.everyones-role')}</h2>
        <ul class="role-list">
          {#each data.players as player (player.id)}
            <li>
              <strong>{label(player)}</strong>
              <span class="role">{roleOf(data, player.id)?.name ?? '—'}</span>
              {#if roleOf(data, player.id)?.description}<small>{roleOf(data, player.id)?.description}</small>{/if}
            </li>
          {/each}
        </ul>
        <button type="button" onclick={() => instance.coverAll()}>{t('reveal.cover-again')}</button>
        <button type="button" onclick={() => instance.clearDeal()}>{t('reveal.redeal')}</button>
      </div>
    {:else if passing}
      <PassThePhone
        name={holder ? label(holder) : t('reveal.player')}
        hint={t('reveal.card-of', { index: data.holder + 1, total: data.players.length })}
        action={t('reveal.have-phone')}
        autoHide={data.autoHide}
        onhide={() => (holding = false)}
        onnext={() => {
          holding = false;
          instance.nextHolder();
        }}
        oncancel={() => (passing = false)}
      >
        <p class="lead">{t('reveal.hold-lead')}</p>
        <button
          type="button"
          class="hold"
          class:held={holding}
          onpointerdown={() => (holding = true)}
          onpointerup={() => (holding = false)}
          onpointerleave={() => (holding = false)}
          onpointercancel={() => (holding = false)}
          onkeydown={(event) => {
            if (event.key === ' ' || event.key === 'Enter') {
              event.preventDefault();
              holding = true;
            }
          }}
          onkeyup={() => (holding = false)}
          onblur={() => (holding = false)}
        >
          {holding ? t('reveal.release') : t('reveal.hold')}
        </button>
        {#if holding}
          <p class="secret-role" aria-live="polite">{roleOf(data, holder?.id ?? '')?.name ?? t('reveal.no-role')}</p>
          {#if roleOf(data, holder?.id ?? '')?.description}
            <p class="secret-notes">{roleOf(data, holder?.id ?? '')?.description}</p>
          {/if}
        {:else}
          <p class="hint">{t('reveal.thumb')}</p>
        {/if}
        {#if data.players.length > 1}
          <button
            type="button"
            class="next-holder"
            onclick={() => {
              holding = false;
              instance.nextHolder();
            }}
          >{t('reveal.next-player')}</button>
        {/if}
      </PassThePhone>
    {:else}
      <div class="panel">
        <h2>{t('reveal.dealt')}</h2>
        <p class="hint">{t('reveal.dealt-hint')}</p>
        <button type="button" class="wide" onclick={() => (passing = true)}>{t('reveal.pass-phone')}</button>
        <div class="row">
          <button type="button" onclick={() => instance.revealAll()}>{t('reveal.reveal-all')}</button>
          <button type="button" onclick={() => instance.clearDeal()}>{t('reveal.redeal')}</button>
        </div>
        <details class="how">
          <summary>{t('reveal.how-title')}</summary>
          <p>
            {t('reveal.how-1')} <strong>{t('reveal.pass-phone')}</strong>{t('reveal.how-2')}
            <kbd>Space</kbd> {t('reveal.how-3')} <kbd>Enter</kbd> {t('reveal.how-4')}
            <em>{t('reveal.hold')}</em>{t('reveal.how-5')}
            <kbd>Escape</kbd> {t('reveal.how-6')} <strong>{t('reveal.next-player-label')}</strong
            >{t('reveal.how-7')}
          </p>
          <p>{t('reveal.how-8')}</p>
        </details>
      </div>
    {/if}
  {:else if data.mode === 'ballot'}
    <div class="panel">
      <h2>{data.ballot.question}</h2>
      {#if data.ballot.revealed}
        <ul class="tally">
          {#each tally(data.ballot.votes, data.ballot.options) as row (row.option)}
            <li>
              <span class="option">{row.option}</span>
              <span class="bar" style="--share: {row.count / Math.max(1, data.players.length)}"></span>
              <span class="count">{row.count}</span>
            </li>
          {/each}
        </ul>
        <button type="button" onclick={() => instance.coverBallot()}>{t('reveal.hide-votes')}</button>
      {:else}
        <ul class="status">
          {#each data.players as player (player.id)}
            <li>
              <span>{label(player)}</span>
              <span class="state">{data.ballot.votes[player.id] ? t('reveal.voted') : t('reveal.waiting')}</span>
            </li>
          {/each}
        </ul>
        {#if voted}
          <button type="button" class="wide" onclick={() => instance.revealBallot()}>{t('reveal.reveal-votes')}</button>
        {:else if voterIndex >= 0 && ballotPassing}
          <PassThePhone
            name={label(data.players[voterIndex])}
            hint={t('reveal.secret-ballot')}
            action={t('reveal.cast-vote')}
            autoHide={0}
            oncancel={() => (ballotPassing = false)}
          >
            <p class="lead">{t('reveal.choose-one')}</p>
            <div class="options">
              {#each data.ballot.options as option (option)}
                <button type="button" class="option-button" onclick={() => vote(option)}>{option}</button>
              {/each}
            </div>
          </PassThePhone>
        {:else if voterIndex >= 0}
          <button type="button" class="wide" onclick={() => (ballotPassing = true)}>{t('reveal.pass-to-vote')}</button>
        {/if}
        <button type="button" onclick={() => data.ballot.options.length && instance.revealBallot()}>
          {t('reveal.end-early')}
        </button>
      {/if}
      <button type="button" onclick={openBallot}>{t('reveal.edit-ballot')}</button>
    </div>
  {:else}
    <div class="panel">
      <h2>{t('reveal.blind-bid')}</h2>
      <p class="hint">{t('reveal.bid-range', { min: data.bids.min, max: data.bids.max })}</p>
      {#if data.bids.revealed}
        <ul class="status">
          {#each data.players as player (player.id)}
            <li>
              <span>{label(player)}</span>
              <span class="state strong">{data.bids.values[player.id] ?? '—'}</span>
            </li>
          {/each}
        </ul>
        {#if leaders.length}
          <p class="winner">{t('reveal.highest-list', { names: leaders.join(', ') })}</p>
        {/if}
        <button type="button" onclick={() => instance.coverBids()}>{t('reveal.hide-bids')}</button>
      {:else}
        <ul class="status">
          {#each data.players as player (player.id)}
            <li>
              <span>{label(player)}</span>
              <span class="state">{typeof data.bids.values[player.id] === 'number' ? t('reveal.in') : t('reveal.waiting')}</span>
            </li>
          {/each}
        </ul>
        {#if bidIn}
          <button type="button" class="wide" onclick={() => instance.revealBids()}>{t('reveal.reveal-bids')}</button>
        {:else if bidderIndex >= 0 && bidPassing}
          <PassThePhone
            name={label(data.players[bidderIndex])}
            hint={t('reveal.nobody-sees')}
            action={t('reveal.enter-bid')}
            autoHide={0}
            oncancel={() => (bidPassing = false)}
          >
            <label class="field">
              <span>{t('reveal.your-bid')}</span>
              <input
                type="number"
                min={data.bids.min}
                max={data.bids.max}
                bind:value={bidDraft}
                onkeydown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    saveBid();
                  }
                }}
              />
            </label>
            <div class="row">
              <button type="button" onclick={() => (bidDraft = String(data.bids.min))}>{t('reveal.min')}</button>
              <button type="button" onclick={() => (bidDraft = String(data.bids.max))}>{t('reveal.max')}</button>
            </div>
            <button type="button" class="wide" onclick={saveBid}>{t('reveal.save-bid')}</button>
          </PassThePhone>
        {:else if bidderIndex >= 0}
          <button type="button" class="wide" onclick={() => (bidPassing = true)}>{t('reveal.pass-to-bid')}</button>
        {/if}
      {/if}
      <button type="button" onclick={openBidRange}>{t('reveal.edit-range')}</button>
    </div>
  {/if}
</div>

{#if rolesOpen}
  <Sheet title={t('reveal.roles')} onclose={() => (rolesOpen = false)}>
    {#each roleDraft as role, index (index)}
      <div class="role-edit">
        <input type="text" aria-label={t('reveal.role-name', { index: index + 1 })} bind:value={role.name} placeholder={t('reveal.example-role')} />
        <input type="number" aria-label={t('reveal.role-count', { index: index + 1 })} bind:value={role.count} min="0" max="30" />
        <button type="button" aria-label={t('reveal.remove-role', { index: index + 1 })} onclick={() => (roleDraft = roleDraft.filter((_, at) => at !== index))}>✕</button>
      </div>
      <label class="field">
        <span>{t('reveal.role-does')}</span>
        <input type="text" bind:value={role.description} placeholder={t('reveal.role-placeholder')} />
      </label>
    {/each}
    <div class="row">
      <button type="button" onclick={() => (roleDraft = [...roleDraft, { name: '', count: 1, description: '' }])}>{t('reveal.add-role')}</button>
      <button type="button" class="wide" onclick={saveRoles}>{t('reveal.save-roles')}</button>
    </div>
    <p class="hint">{t('reveal.role-hint')}</p>
  </Sheet>
{/if}

{#if ballotOpen}
  <Sheet title={t('reveal.ballot')} onclose={() => (ballotOpen = false)}>
    <label class="field">
      <span>{t('reveal.question')}</span>
      <input type="text" bind:value={questionDraft} />
    </label>
    <label class="field">
      <span>{t('reveal.options-label')}</span>
      <input type="text" bind:value={optionsDraft} placeholder={t('reveal.options-placeholder')} />
    </label>
    <button type="button" class="wide" onclick={saveBallot}>{t('reveal.save-ballot')}</button>
  </Sheet>
{/if}

{#if bidRangeOpen}
  <Sheet title={t('reveal.range-title')} onclose={() => (bidRangeOpen = false)}>
    <label class="field">
      <span>{t('reveal.lowest')}</span>
      <input type="number" min="0" bind:value={minDraft} />
    </label>
    <label class="field">
      <span>{t('reveal.highest-label')}</span>
      <input type="number" min="1" bind:value={maxDraft} />
    </label>
    <button type="button" class="wide" onclick={saveBidRange}>{t('reveal.save-range')}</button>
  </Sheet>
{/if}

<style>
  .reveal {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-3);
  }




  h2 {
    margin: 0;
    font-size: var(--text-lg);
  }
  .lead {
    margin: 0;
    color: var(--text-dim);
    font-weight: 600;
  }
  .hold {
    min-height: 88px;
    padding: 0 var(--space-4);
    border-radius: var(--radius-lg);
    background: var(--accent-soft);
    color: var(--text);
    font-size: var(--text-lg);
    font-weight: 800;
    cursor: pointer;
    touch-action: none;
    user-select: none;
  }
  .hold.held {
    background: var(--accent);
    color: var(--accent-text);
  }
  .secret-role {
    margin: var(--space-2) 0 0;
    font-size: clamp(2rem, 12vw, 3rem);
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .secret-notes {
    margin: 0;
    max-width: 24rem;
    color: var(--text-dim);
  }
  .next-holder {
    min-height: 48px;
    margin-top: var(--space-2);
    padding: 0 var(--space-4);
    border-radius: var(--radius-pill);
    background: var(--surface);
    color: var(--text);
    font-weight: 700;
    cursor: pointer;
  }
  .role-list,
  .status,
  .tally {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .role-list li,
  .status li {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius);
    background: var(--surface);
  }
  .role-list small {
    flex-basis: 100%;
    color: var(--text-dim);
  }
  .role-list .count {
    color: var(--text-dim);
    font-weight: 700;
  }
  .role-list .role {
    margin-left: auto;
    font-weight: 800;
  }
  .status .state {
    margin-left: auto;
    color: var(--text-dim);
    font-size: var(--text-sm);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .status .state.strong {
    color: var(--text);
    font-size: var(--text-base);
  }
  .tally li {
    display: grid;
    grid-template-columns: 6rem 1fr 2rem;
    align-items: center;
    gap: var(--space-2);
  }
  .tally .bar {
    height: 12px;
    border-radius: var(--radius-pill);
    background: var(--accent);
    transform-origin: left;
    transform: scaleX(min(1, var(--share)));
  }
  .tally .count {
    text-align: right;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
    gap: var(--space-2);
    width: 100%;
    max-width: 30rem;
  }
  .option-button {
    min-height: 64px;
    border-radius: var(--radius-lg);
    background: var(--surface-2);
    box-shadow: var(--shadow-soft);
    color: var(--text);
    font-weight: 700;
    cursor: pointer;
  }
  .winner {
    margin: 0;
    font-weight: 800;
  }
  .how {
    margin-top: var(--space-3);
    border-radius: var(--radius);
    background: var(--surface);
    padding: var(--space-1) var(--space-3);
  }
  .how summary {
    display: flex;
    align-items: center;
    min-height: 44px;
    cursor: pointer;
    font-weight: 600;
  }
  .how p {
    margin: 0 0 var(--space-2);
    color: var(--text-dim);
    font-size: var(--text-sm);
    line-height: 1.5;
  }
  .how kbd {
    display: inline-block;
    padding: 0 var(--space-1);
    border-radius: var(--radius-sm);
    background: var(--surface-2);
    color: var(--text);
    font: inherit;
  }




  .role-edit {
    display: grid;
    grid-template-columns: 1fr 4.5rem 2.75rem;
    gap: var(--space-2);
  }
  .role-edit input {
    border: 0;
    min-height: 44px;
    border-radius: var(--radius-sm);
    background: var(--surface-2);
    color: var(--text);
    padding: 0 var(--space-2);
    font: inherit;
    min-width: 0;
  }
  .role-edit button {
    min-height: 44px;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--text-dim);
    cursor: pointer;
  }


</style>
