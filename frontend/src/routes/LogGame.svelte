<script>
  import { createEventDispatcher } from 'svelte';
  import { decks, games, players, showToast, refreshPlayers } from '../lib/stores.js';
  import { api } from '../lib/api.js';
  import { deriveWinner } from '../lib/elo.js';

  const dispatch = createEventDispatcher();

  const emptyPlayer = () => ({ name: '', deckName: '' });
  const resetForm = () => ({
    date:    new Date().toISOString().slice(0, 10),
    fmt:     'pau',
    players: [emptyPlayer(), emptyPlayer()],
    scores:  {},
    winner:  '',
    notes:   '',
  });

  let form = resetForm();
  let saving = false;

  $: namedPlayers = form.players.filter(p => p.name.trim());
  $: hasScores = namedPlayers.some(p => form.scores[p.name] !== '' && form.scores[p.name] !== undefined);
  $: autoWinner = hasScores ? deriveWinner(namedPlayers, form.scores) : '';
  $: knownPlayers = Object.keys($players).sort();

  function addPlayer() {
    if (form.players.length >= 4) return;
    form.players = [...form.players, emptyPlayer()];
  }
  function removePlayer(i) {
    form.players = form.players.filter((_, j) => j !== i);
  }
  function setScore(name, val) {
    form.scores = { ...form.scores, [name]: val };
  }

  // Player autocomplete
  let focusedPlayerIdx = null;
  function filteredPlayers(i) {
    const val = form.players[i]?.name || '';
    const usedNames = form.players.map((p, j) => j !== i ? p.name : '').filter(Boolean);
    return knownPlayers.filter(n =>
      n.toLowerCase().includes(val.toLowerCase()) && !usedNames.includes(n)
    );
  }

  // Deck autocomplete
  let focusedDeckIdx = null;
  function filteredDecks(i) {
    const val = form.players[i]?.deckName || '';
    return $decks.filter(d =>
      (d.fmt === form.fmt || d.fmt === 'both') &&
      d.name.toLowerCase().includes(val.toLowerCase())
    );
  }
  function isNewDeck(name) {
    return name && !$decks.find(d => d.name.toLowerCase() === name.toLowerCase());
  }

  // Format pills
  const FMTS = [{ v: 'pau', label: 'Pauper' }, { v: 'cmd', label: 'Commander / EDH' }];

  async function save() {
    if (namedPlayers.length < 2) { showToast('Add at least 2 players'); return; }
    saving = true;
    try {
      const mode   = hasScores ? 'bon' : 'bo1';
      const winner = hasScores ? autoWinner : form.winner;
      const game = await api.saveGame({
        date:    form.date,
        fmt:     form.fmt,
        mode,
        players: namedPlayers.map(p => ({ name: p.name.trim(), deckName: p.deckName?.trim() || null })),
        scores:  hasScores ? form.scores : null,
        winner,
        notes:   form.notes,
      });
      games.update(g => [game, ...g]);
      await refreshPlayers();
      showToast('Game saved!');
      form = resetForm();
      //dispatch('saved');
    } catch (e) {
      showToast('Error saving game');
    } finally {
      saving = false;
    }
  }
</script>

<div class="fade-in">
  <div class="card">
    <div class="sec-title">Record a Game</div>

    <!-- Date -->
    <div class="fg">
      <label class="lbl">Date</label>
      <input type="date" bind:value={form.date} />
    </div>

    <!-- Format pills -->
    <div class="fg">
      <label class="lbl">Format</label>
      <div class="pill-row">
        {#each FMTS as f}
          <button
            class="pill"
            class:active-cmd={form.fmt === f.v && f.v === 'cmd'}
            class:active-pau={form.fmt === f.v && f.v === 'pau'}
            on:click={() => form.fmt = f.v}
          >{f.label}</button>
        {/each}
      </div>
    </div>

    <!-- Players -->
    <div class="fg">
      <label class="lbl">Players</label>
      {#each form.players as player, i}
        <div class="player-row">

          <!-- player autocomplete -->
          <div class="input-wrap">
            <input
              placeholder="Player {i+1} name"
              bind:value={player.name}
              on:focus={() => focusedPlayerIdx = i}
              on:blur={() => setTimeout(() => focusedPlayerIdx = null, 150)}
              autocomplete="off"
            />
            {#if focusedPlayerIdx === i && filteredPlayers(i).length > 0}
              <div class="suggestions">
                {#each filteredPlayers(i) as name}
                  <div class="suggestion-item"
                    on:mousedown={() => { player.name = name; focusedPlayerIdx = null; }}>
                    {name}
                  </div>
                {/each}
              </div>
            {/if}
          </div>

          <!-- deck autocomplete -->
          <div class="input-wrap">
            <input
              placeholder="Deck name"
              bind:value={player.deckName}
              on:focus={() => focusedDeckIdx = i}
              on:blur={() => setTimeout(() => focusedDeckIdx = null, 150)}
              autocomplete="off"
            />
            {#if player.deckName && isNewDeck(player.deckName)}
              <span class="new-tag">NEW</span>
            {/if}
            {#if focusedDeckIdx === i && filteredDecks(i).length > 0}
              <div class="suggestions">
                {#each filteredDecks(i) as d}
                  <div class="suggestion-item"
                    on:mousedown={() => { player.deckName = d.name; focusedDeckIdx = null; }}>
                    {d.name}
                    {#if d.owner}<span class="suggestion-owner">— {d.owner}</span>{/if}
                  </div>
                {/each}
              </div>
            {/if}
          </div>

          {#if form.players.length > 2}
            <button class="btn btn-ghost btn-sm" on:click={() => removePlayer(i)}>✕</button>
          {:else}
            <span></span>
          {/if}
        </div>
      {/each}
      {#if form.players.length < 4}
        <button class="btn btn-ghost btn-sm" on:click={addPlayer}>+ Add Player</button>
      {/if}
    </div>

    <!-- Scores (optional — BoN inferred) -->
    <div class="fg">
      <label class="lbl">Scores <span class="lbl-hint">(optional — fill in for Best of N)</span></label>
      {#each namedPlayers as p}
        <div class="score-row">
          <span class="score-name">{p.name}</span>
          <input class="score-input" type="number" min="0"
            value={form.scores[p.name] ?? ''}
            on:input={e => setScore(p.name, e.target.value)}
            placeholder="0"
          />
          <span class="score-label">wins</span>
        </div>
      {/each}
    </div>

    <!-- Winner -->
    <div class="fg">
      <label class="lbl">Winner</label>
      {#if autoWinner}
        <div class="auto-winner">🏆 {autoWinner}</div>
      {:else}
        <div class="input-wrap">
          <select bind:value={form.winner}>
            <option value="">— Select Winner —</option>
            {#each namedPlayers as p}
              <option value={p.name}>{p.name}</option>
            {/each}
          </select>
        </div>
      {/if}
    </div>

    <div class="fg">
      <label class="lbl">Notes <span class="lbl-hint">(optional)</span></label>
      <textarea rows="3" placeholder="Notable plays, how it ended…" bind:value={form.notes}></textarea>
    </div>

    <button class="btn btn-gold" on:click={save} disabled={saving}>
      {saving ? 'Saving…' : 'Save Game'}
    </button>
  </div>
</div>

<style>
  /* Format pills — same visual language as deck cards */
  .pill-row { display: flex; gap: .5rem; }
  .pill {
    flex: 1;
    background: var(--s2); border: 2px solid var(--border); border-radius: 6px;
    padding: .6rem 1rem; cursor: pointer; text-align: center; transition: all .2s;
    font-family: 'Cinzel', serif; color: var(--muted); font-size: .72rem; letter-spacing: .1em;
  }
  .pill.active-cmd { border-color: var(--cmd); color: var(--cmd); background: rgba(201,116,64,.08); }
  .pill.active-pau { border-color: var(--pau); color: var(--pau); background: rgba(90,170,122,.08); }

  .player-row {
    display: grid; grid-template-columns: 1fr 1fr auto;
    gap: .45rem; align-items: start; margin-bottom: .45rem;
  }
  @media(max-width:520px) { .player-row { grid-template-columns: 1fr; } }

  .input-wrap { position: relative; }
  .suggestions {
    position: absolute; z-index: 50; background: var(--s3); border: 1px solid var(--border);
    border-radius: 4px; width: 100%; top: calc(100% + 2px); left: 0;
    max-height: 160px; overflow-y: auto;
  }
  .suggestion-item {
    padding: .4rem .7rem; font-size: .88rem; cursor: pointer; transition: background .12s;
  }
  .suggestion-item:hover { background: rgba(201,168,76,.08); color: var(--gold-l); }
  .suggestion-owner { color: var(--muted); font-size: .75rem; margin-left: .3rem; }

  .new-tag {
    position: absolute; right: .5rem; top: 50%; transform: translateY(-50%);
    font-family: 'Cinzel', serif; font-size: .52rem; letter-spacing: .08em;
    padding: .06rem .32rem; border-radius: 3px;
    background: rgba(201,168,76,.12); border: 1px solid rgba(201,168,76,.3); color: var(--gold-d);
    pointer-events: none;
  }

  .lbl-hint { font-family: 'EB Garamond', serif; font-size: .75rem; letter-spacing: 0; text-transform: none; color: var(--muted); font-style: italic; }

  .score-row { display: flex; align-items: center; gap: .65rem; margin-bottom: .4rem; }
  .score-name { font-family: 'Cinzel', serif; font-size: .78rem; min-width: 7rem; }
  .score-input { width: 3.5rem !important; text-align: center; font-family: 'Cinzel Decorative', serif; font-size: 1.1rem; padding: .28rem .4rem; }
  .score-label { color: var(--muted); font-size: .78rem; }

  .auto-winner {
    font-family: 'Cinzel', serif; font-size: .85rem; color: var(--gold);
    padding: .5rem .75rem; background: var(--s2); border: 1px solid var(--border); border-radius: 4px;
  }
</style>
