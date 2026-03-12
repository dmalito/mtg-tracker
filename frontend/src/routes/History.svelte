<script>
  import { games, decks, players, showToast } from '../lib/stores.js';
  import { api } from '../lib/api.js';
  import { fmtDate, FMT_LABELS } from '../lib/elo.js';

  let fmtFilter    = '';
  let playerFilter = '';

  $: allPlayers = Object.keys($players);

  $: filtered = $games.filter(g =>
    (!fmtFilter    || g.fmt === fmtFilter) &&
    (!playerFilter || g.players.some(p => p.name === playerFilter))
  );

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
        <option value="pau">Pauper</option>
        <option value="cmd">Commander / EDH</option>
      </select>
      <select bind:value={playerFilter}>
        <option value="">All Players</option>
        {#each allPlayers as p}<option>{p}</option>{/each}
      </select>
    </div>
  </div>

  {#if !filtered.length}
    <div class="empty"><span class="empty-icon">📜</span>No games yet.</div>
  {:else}
    {#each filtered as g (g.id)}
      <div class="game-card">
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
        <button class="btn btn-danger btn-sm" on:click={() => deleteGame(g.id)}>✕</button>
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
</style>
