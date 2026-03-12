<script>
  import { games, decks, players, showToast, refreshPlayers } from '../lib/stores.js';
  import { api } from '../lib/api.js';
  import { fmtDate, FMT_LABELS, deriveWinner } from '../lib/elo.js';

  let fmtFilter    = '';
  let playerFilter = '';
  let editingId    = null;
  let editForm     = null;
  let saving       = false;

  $: allPlayerNames = Object.keys($players).sort();

  $: filtered = $games.filter(g =>
    (!fmtFilter    || g.fmt === fmtFilter) &&
    (!playerFilter || g.players.some(p => p.name === playerFilter))
  );

  const FMTS = [{ v: 'pau', label: 'Pauper' }, { v: 'cmd', label: 'Commander / EDH' }];

  function startEdit(g) {
    editingId = g.id;
    editForm = {
      date:    g.date,
      fmt:     g.fmt,
      players: g.players.map(p => ({ ...p })),
      scores:  g.scores ? { ...g.scores } : {},
      notes:   g.notes || '',
    };
  }

  function cancelEdit() { editingId = null; editForm = null; }

  function setScore(name, val) {
    editForm.scores = { ...editForm.scores, [name]: val };
  }

  function addEditPlayer() {
    if (editForm.players.length >= 4) return;
    editForm.players = [...editForm.players, { name: '', deckName: '' }];
  }
  function removeEditPlayer(i) {
    if (editForm.players.length <= 2) return;
    editForm.players = editForm.players.filter((_, j) => j !== i);
  }

  $: editNamedPlayers = editForm ? editForm.players.filter(p => p.name.trim()) : [];
  $: editHasScores = editForm && editNamedPlayers.some(p =>
    editForm.scores[p.name] !== '' && editForm.scores[p.name] !== undefined
  );
  $: editAutoWinner = editHasScores ? deriveWinner(editNamedPlayers, editForm.scores) : '';

  let focusedEditDeckIdx = null;
  function filteredEditDecks(i) {
    const val = editForm?.players[i]?.deckName || '';
    return $decks.filter(d =>
      (d.fmt === editForm.fmt || d.fmt === 'both') &&
      d.name.toLowerCase().includes(val.toLowerCase())
    );
  }

  async function saveEdit(id) {
    if (editNamedPlayers.length < 2) { showToast('Need at least 2 players'); return; }
    saving = true;
    try {
      const updated = await api.updateGame({
        id,
        date:    editForm.date,
        fmt:     editForm.fmt,
        mode:    editHasScores ? 'bon' : 'bo1',
        players: editNamedPlayers.map(p => ({ name: p.name.trim(), deckName: p.deckName?.trim() || null })),
        scores:  editHasScores ? editForm.scores : null,
        winner:  editAutoWinner || '',
        notes:   editForm.notes,
      });
      games.update(gs => gs.map(g => g.id === id ? updated : g));
      await refreshPlayers();
      editingId = null;
      editForm = null;
      showToast('Game updated!');
    } catch (e) {
      showToast('Error updating game');
    } finally {
      saving = false;
    }
  }

  async function deleteGame(id) {
    if (!confirm('Delete this game?')) return;
    await api.deleteGame(id);
    games.update(gs => gs.filter(g => g.id !== id));
    await refreshPlayers();
    showToast('Game deleted');
  }
</script>

<div class="fade-in">
  <div class="filter-bar">
    <div class="sec-title" style="margin:0">Game History</div>
    <div class="filters">
      <select bind:value={fmtFilter}>
        <option value="">All Formats</option>
        <option value="cmd">Commander / EDH</option>
        <option value="pau">Pauper</option>
      </select>
      <select bind:value={playerFilter}>
        <option value="">All Players</option>
        {#each allPlayerNames as p}<option>{p}</option>{/each}
      </select>
    </div>
  </div>

  {#if !filtered.length}
    <div class="empty"><span class="empty-icon">📜</span>No games yet.</div>
  {:else}
    {#each filtered as g (g.id)}
      <div class="game-card" class:editing={editingId === g.id}>

        {#if editingId === g.id && editForm}
          <div class="edit-form fade-in">
            <div class="edit-header">
              <span class="sec-title" style="margin:0">Editing Game</span>
              <button class="btn btn-ghost btn-sm" on:click={cancelEdit}>Cancel</button>
            </div>

            <div class="fg">
              <label class="lbl">Date</label>
              <input type="date" bind:value={editForm.date} />
            </div>

            <div class="fg">
              <label class="lbl">Format</label>
              <div class="pill-row">
                {#each FMTS as f}
                  <button
                    class="pill"
                    class:active-cmd={editForm.fmt === f.v && f.v === 'cmd'}
                    class:active-pau={editForm.fmt === f.v && f.v === 'pau'}
                    on:click={() => editForm.fmt = f.v}
                  >{f.label}</button>
                {/each}
              </div>
            </div>

            <div class="fg">
              <label class="lbl">Players</label>
              {#each editForm.players as player, i}
                <div class="player-row">
                  <input placeholder="Player {i+1}" bind:value={player.name} />
                  <div class="input-wrap">
                    <input
                      placeholder="Deck name"
                      bind:value={player.deckName}
                      on:focus={() => focusedEditDeckIdx = i}
                      on:blur={() => setTimeout(() => focusedEditDeckIdx = null, 150)}
                      autocomplete="off"
                    />
                    {#if focusedEditDeckIdx === i && filteredEditDecks(i).length > 0}
                      <div class="suggestions">
                        {#each filteredEditDecks(i) as d}
                          <!-- svelte-ignore a11y_no_static_element_interactions -->
                          <div class="suggestion-item"
                            on:mousedown={() => { player.deckName = d.name; focusedEditDeckIdx = null; }}>
                            {d.name}
                          </div>
                        {/each}
                      </div>
                    {/if}
                  </div>
                  {#if editForm.players.length > 2}
                    <button class="btn btn-ghost btn-sm" on:click={() => removeEditPlayer(i)}>✕</button>
                  {:else}
                    <span></span>
                  {/if}
                </div>
              {/each}
              {#if editForm.players.length < 4}
                <button class="btn btn-ghost btn-sm" on:click={addEditPlayer}>+ Add Player</button>
              {/if}
            </div>

            <div class="fg">
              <label class="lbl">Scores <span class="lbl-hint">(optional — Best of N)</span></label>
              {#each editNamedPlayers as p}
                <div class="score-row">
                  <span class="score-name">{p.name}</span>
                  <input class="score-input" type="number" min="0"
                    value={editForm.scores[p.name] ?? ''}
                    on:input={e => setScore(p.name, e.target.value)}
                    placeholder="0"
                  />
                  <span class="score-label">wins</span>
                </div>
              {/each}
              {#if editAutoWinner}
                <div class="auto-winner" style="margin-top:.5rem">🏆 {editAutoWinner}</div>
              {/if}
            </div>

            <div class="fg">
              <label class="lbl">Notes <span class="lbl-hint">(optional)</span></label>
              <textarea rows="2" bind:value={editForm.notes} placeholder="Notable plays…"></textarea>
            </div>

            <div class="edit-actions">
              <button class="btn btn-ghost" on:click={cancelEdit}>Cancel</button>
              <button class="btn btn-gold" on:click={() => saveEdit(g.id)} disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>

        {:else}
          <div class="gc-body">
            <div class="gc-top">
              <span class="gc-date">{fmtDate(g.date)}</span>
              <span class="fb fb-{g.fmt}">{FMT_LABELS[g.fmt]}</span>
              {#if g.mode === 'bon'}
                <span class="bon-label">BEST OF N</span>
              {/if}
              {#if g.mode === 'bon' && g.scores}
                <span class="score-badge">
                  {g.players.map(p => `${p.name} ${g.scores?.[p.name] ?? 0}`).join(' — ')}
                </span>
              {/if}
            </div>

            {#if g.winner}
              <div class="gc-winner">
                🏆 {g.winner}
                {#if g.eloDelta?.[g.winner] != null}
                  <span class="elo-up">+{g.eloDelta[g.winner]} ELO</span>
                {/if}
              </div>
            {:else}
              <div class="gc-no-winner">No winner recorded</div>
            {/if}

            <div class="gc-players">
              {#each g.players as p, i}
                {#if i > 0} · {/if}
                {p.name}{#if p.deckName}<em class="deck-label"> ({p.deckName})</em>{/if}
              {/each}
            </div>

            {#if g.notes}
              <div class="gc-notes">{g.notes}</div>
            {/if}
          </div>

          <div class="gc-actions">
            <button class="btn btn-ghost btn-sm" on:click={() => startEdit(g)}>Edit</button>
            <button class="btn btn-danger btn-sm" on:click={() => deleteGame(g.id)}>✕</button>
          </div>
        {/if}

      </div>
    {/each}
  {/if}
</div>

<style>
  .filter-bar {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 1rem; flex-wrap: wrap; gap: .5rem;
  }
  .filters { display: flex; gap: .5rem; }
  .filters select { width: auto; font-size: .85rem; }

  .game-card {
    background: var(--s1); border: 1px solid var(--border); border-radius: 7px;
    padding: .95rem 1.25rem; margin-bottom: .6rem;
    display: grid; grid-template-columns: 1fr auto; gap: .7rem; align-items: start;
    transition: border-color .2s;
  }
  .game-card:hover { border-color: var(--border-h); }
  .game-card.editing { grid-template-columns: 1fr; border-color: var(--gold-d); }

  .gc-top { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; margin-bottom: .25rem; }
  .gc-date { font-family: 'Cinzel', serif; font-size: .58rem; color: var(--muted); letter-spacing: .1em; }
  .bon-label { font-family: 'Cinzel', serif; font-size: .54rem; color: var(--muted); letter-spacing: .1em; }
  .score-badge {
    font-family: 'Cinzel Decorative', serif; font-size: .75rem;
    background: var(--s2); border: 1px solid var(--border); border-radius: 4px;
    padding: .1rem .5rem; color: var(--text);
  }
  .gc-winner { font-family: 'Cinzel', serif; font-size: .9rem; color: var(--gold); }
  .gc-no-winner { color: var(--muted); font-style: italic; font-size: .82rem; }
  .elo-up { color: var(--green); font-family: 'Cinzel', serif; font-size: .62rem; margin-left: .4rem; }
  .gc-players { font-size: .82rem; color: var(--muted); margin-top: .18rem; }
  .deck-label { color: var(--gold-d); font-size: .76rem; }
  .gc-notes {
    font-style: italic; font-size: .8rem; color: var(--muted); margin-top: .2rem; opacity: .7;
    border-left: 2px solid var(--border); padding-left: .5rem;
  }
  .gc-actions { display: flex; flex-direction: column; gap: .35rem; }

  .edit-form { width: 100%; }
  .edit-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
  .edit-actions { display: flex; gap: .5rem; justify-content: flex-end; margin-top: .5rem; }

  .pill-row { display: flex; gap: .5rem; }
  .pill {
    flex: 1; background: var(--s2); border: 2px solid var(--border); border-radius: 6px;
    padding: .5rem .75rem; cursor: pointer; text-align: center; transition: all .2s;
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
    max-height: 140px; overflow-y: auto;
  }
  .suggestion-item { padding: .4rem .7rem; font-size: .88rem; cursor: pointer; transition: background .12s; }
  .suggestion-item:hover { background: rgba(201,168,76,.08); color: var(--gold-l); }

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
