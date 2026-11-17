<script lang="ts">
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
  const leaders = $derived(bidLeaders(data));

  const MODES: { id: 'roles' | 'ballot' | 'bid'; label: string }[] = [
    { id: 'roles', label: 'Roles' },
    { id: 'ballot', label: 'Ballot' },
    { id: 'bid', label: 'Blind bid' },
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
    ctx.undo.batch('ballot', () => {
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
  <div class="modes" role="group" aria-label="Reveal mode">
    {#each MODES as item (item.id)}
      <button type="button" class:active={data.mode === item.id} onclick={() => instance.setMode(item.id)}>
        {item.label}
      </button>
    {/each}
  </div>

  {#if data.mode === 'roles'}
    {#if !data.dealt}
      <div class="panel">
        <h2>Roles</h2>
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
          <p class="hint">{data.roles.reduce((sum, role) => sum + role.count, 0)} cards for {data.players.length} players.</p>
        {:else}
          <p class="hint">No roles yet. Add werewolves, villagers, traitors — whatever the game needs.</p>
        {/if}
        <button
          type="button"
          class="wide"
          onclick={() => {
            instance.deal();
            passing = true;
          }}
        >Deal roles</button>
        <button type="button" onclick={openRoles}>Edit roles</button>
      </div>
    {:else if data.allRevealed}
      <div class="panel">
        <h2>Everyone's role</h2>
        <ul class="role-list">
          {#each data.players as player (player.id)}
            <li>
              <strong>{player.name}</strong>
              <span class="role">{roleOf(data, player.id)?.name ?? '—'}</span>
              {#if roleOf(data, player.id)?.description}<small>{roleOf(data, player.id)?.description}</small>{/if}
            </li>
          {/each}
        </ul>
        <button type="button" onclick={() => instance.coverAll()}>Cover again</button>
        <button type="button" onclick={() => instance.clearDeal()}>Redeal</button>
      </div>
    {:else if passing}
      <PassThePhone
        name={holder?.name ?? 'Player'}
        hint={`Card ${data.holder + 1} of ${data.players.length}`}
        action="I have the phone"
        autoHide={data.autoHide}
        onhide={() => (holding = false)}
        onnext={() => {
          holding = false;
          instance.nextHolder();
        }}
        oncancel={() => (passing = false)}
      >
        <p class="lead">Hold the button to see your role</p>
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
          {holding ? 'Release to hide' : 'Hold to reveal'}
        </button>
        {#if holding}
          <p class="secret-role" aria-live="polite">{roleOf(data, holder?.id ?? '')?.name ?? 'No role'}</p>
          {#if roleOf(data, holder?.id ?? '')?.description}
            <p class="secret-notes">{roleOf(data, holder?.id ?? '')?.description}</p>
          {/if}
        {:else}
          <p class="hint">Keep your thumb on the button. Let go and it hides.</p>
        {/if}
        {#if data.players.length > 1}
          <button
            type="button"
            class="next-holder"
            onclick={() => {
              holding = false;
              instance.nextHolder();
            }}
          >Next player →</button>
        {/if}
      </PassThePhone>
    {:else}
      <div class="panel">
        <h2>Roles are dealt</h2>
        <p class="hint">Pass the phone when everyone is ready, or reveal the whole table at the end.</p>
        <button type="button" class="wide" onclick={() => (passing = true)}>Pass the phone</button>
        <div class="row">
          <button type="button" onclick={() => instance.revealAll()}>Reveal all</button>
          <button type="button" onclick={() => instance.clearDeal()}>Redeal</button>
        </div>
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
        <button type="button" onclick={() => instance.coverBallot()}>Hide votes</button>
      {:else}
        <ul class="status">
          {#each data.players as player (player.id)}
            <li>
              <span>{player.name}</span>
              <span class="state">{data.ballot.votes[player.id] ? 'voted' : 'waiting'}</span>
            </li>
          {/each}
        </ul>
        {#if voted}
          <button type="button" class="wide" onclick={() => instance.revealBallot()}>Reveal votes</button>
        {:else if voterIndex >= 0 && ballotPassing}
          <PassThePhone
            name={data.players[voterIndex].name}
            hint="Secret ballot"
            action="Cast my vote"
            autoHide={0}
            oncancel={() => (ballotPassing = false)}
          >
            <p class="lead">Choose one</p>
            <div class="options">
              {#each data.ballot.options as option (option)}
                <button type="button" class="option-button" onclick={() => vote(option)}>{option}</button>
              {/each}
            </div>
          </PassThePhone>
        {:else if voterIndex >= 0}
          <button type="button" class="wide" onclick={() => (ballotPassing = true)}>Pass the phone to vote</button>
        {/if}
        <button type="button" onclick={() => data.ballot.options.length && instance.revealBallot()}>
          End voting early
        </button>
      {/if}
      <button type="button" onclick={openBallot}>Edit ballot</button>
    </div>
  {:else}
    <div class="panel">
      <h2>Blind bid</h2>
      <p class="hint">Bids between {data.bids.min} and {data.bids.max}. Nobody sees a number until the reveal.</p>
      {#if data.bids.revealed}
        <ul class="status">
          {#each data.players as player (player.id)}
            <li>
              <span>{player.name}</span>
              <span class="state strong">{data.bids.values[player.id] ?? '—'}</span>
            </li>
          {/each}
        </ul>
        {#if leaders.length}
          <p class="winner">Highest: {leaders.join(', ')}</p>
        {/if}
        <button type="button" onclick={() => instance.coverBids()}>Hide bids</button>
      {:else}
        <ul class="status">
          {#each data.players as player (player.id)}
            <li>
              <span>{player.name}</span>
              <span class="state">{typeof data.bids.values[player.id] === 'number' ? 'in' : 'waiting'}</span>
            </li>
          {/each}
        </ul>
        {#if bidIn}
          <button type="button" class="wide" onclick={() => instance.revealBids()}>Reveal bids</button>
        {:else if bidderIndex >= 0 && bidPassing}
          <PassThePhone
            name={data.players[bidderIndex].name}
            hint="Nobody else can see this"
            action="Enter my bid"
            autoHide={0}
            oncancel={() => (bidPassing = false)}
          >
            <label class="field">
              <span>Your bid</span>
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
              <button type="button" onclick={() => (bidDraft = String(data.bids.min))}>Min</button>
              <button type="button" onclick={() => (bidDraft = String(data.bids.max))}>Max</button>
            </div>
            <button type="button" class="wide" onclick={saveBid}>Save bid</button>
          </PassThePhone>
        {:else if bidderIndex >= 0}
          <button type="button" class="wide" onclick={() => (bidPassing = true)}>Pass the phone to bid</button>
        {/if}
      {/if}
      <button type="button" onclick={openBidRange}>Edit bid range</button>
    </div>
  {/if}
</div>

{#if rolesOpen}
  <Sheet title="Roles" onclose={() => (rolesOpen = false)}>
    {#each roleDraft as role, index (index)}
      <div class="role-edit">
        <input type="text" aria-label="Role {index + 1} name" bind:value={role.name} placeholder="werewolf" />
        <input type="number" aria-label="Role {index + 1} count" bind:value={role.count} min="0" max="30" />
        <button type="button" aria-label="Remove role {index + 1}" onclick={() => (roleDraft = roleDraft.filter((_, at) => at !== index))}>✕</button>
      </div>
      <label class="field">
        <span>What this role does</span>
        <input type="text" bind:value={role.description} placeholder="Eats a villager each night" />
      </label>
    {/each}
    <div class="row">
      <button type="button" onclick={() => (roleDraft = [...roleDraft, { name: '', count: 1, description: '' }])}>Add role</button>
      <button type="button" class="wide" onclick={saveRoles}>Save roles</button>
    </div>
    <p class="hint">The count is how many of that card go into the deck.</p>
  </Sheet>
{/if}

{#if ballotOpen}
  <Sheet title="Ballot" onclose={() => (ballotOpen = false)}>
    <label class="field">
      <span>Question</span>
      <input type="text" bind:value={questionDraft} />
    </label>
    <label class="field">
      <span>Options (comma separated)</span>
      <input type="text" bind:value={optionsDraft} placeholder="Yes, No" />
    </label>
    <button type="button" class="wide" onclick={saveBallot}>Save ballot</button>
  </Sheet>
{/if}

{#if bidRangeOpen}
  <Sheet title="Bid range" onclose={() => (bidRangeOpen = false)}>
    <label class="field">
      <span>Lowest</span>
      <input type="number" min="0" bind:value={minDraft} />
    </label>
    <label class="field">
      <span>Highest</span>
      <input type="number" min="1" bind:value={maxDraft} />
    </label>
    <button type="button" class="wide" onclick={saveBidRange}>Save range</button>
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
