<script>
  import { players, games, decks } from '../lib/stores.js';
  import { fmtDate, FMT_LABELS } from '../lib/elo.js';

  let selected = null;

  $: sorted = Object.entries($players)
    .map(([name, d]) => {
      const t = d.wins + d.losses;
      return { name, elo: d.elo, wins: d.wins, losses: d.losses, total: t, wr: t ? Math.round(d.wins / t * 100) : 0 };
    })
    .filter(p => p.total > 0)
    .sort((a, b) => b.elo - a.elo);

  $: profile = selected ? buildProfile(selected) : null;

  function buildProfile(name) {
    const playerGames = $games.filter(g => g.players.some(p => p.name === name));

    // Per-format stats
    const byFmt = {};
    playerGames.forEach(g => {
      if (!byFmt[g.fmt]) byFmt[g.fmt] = { wins: 0, total: 0 };
      byFmt[g.fmt].total++;
      if (g.winner === name) byFmt[g.fmt].wins++;
    });

    // Most used decks
    const deckCount = {};
    const deckWins  = {};
    playerGames.forEach(g => {
      const p = g.players.find(p => p.name === name);
      if (!p?.deckName) return;
      deckCount[p.deckName] = (deckCount[p.deckName] || 0) + 1;
      if (!deckWins[p.deckName]) deckWins[p.deckName] = 0;
      if (g.winner === name) deckWins[p.deckName]++;
    });
    const topDecks = Object.entries(deckCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([deckName, played]) => ({
        deckName,
        played,
        wins: deckWins[deckName] || 0,
        wr: Math.round((deckWins[deckName] || 0) / played * 100),
      }));

    // Recent games (latest 10)
    const recent = playerGames.slice(0, 10);

    // Win streak
    let streak = 0;
    for (const g of playerGames) {
      if (g.winner === name) streak++;
      else break;
    }

    return { playerGames, byFmt, topDecks, recent, streak };
  }

  function rankIcon(i) { return i===0?'👑':i===1?'🥈':i===2?'🥉':`${i+1}`; }
  function rankClass(i) { return i===0?'g':i===1?'s':i===2?'b':''; }
</script>

<div class="fade-in">
  {#if !selected}
    <!-- Player list -->
    {#if !sorted.length}
      <div class="empty"><span class="empty-icon">⚔</span>No players yet — log some games first.</div>
    {:else}
      <div class="sec-title">All Players</div>
      {#each sorted as p, i}
        <button class="player-card" on:click={() => selected = p.name}>
          <div class="pc-left">
            <span class="pc-rank {rankClass(i)}">{rankIcon(i)}</span>
            <div>
              <div class="pc-name">{p.name}</div>
              <div class="pc-rec">{p.wins}W – {p.losses}L · {p.total} games</div>
            </div>
          </div>
          <div class="pc-right">
            <div class="pc-elo">{p.elo}</div>
            <div class="pc-wr">{p.wr}% WR</div>
          </div>
        </button>
      {/each}
    {/if}

  {:else}
    <!-- Player profile -->
    {@const p = $players[selected]}
    {@const pr = profile}
    {@const total = (p?.wins ?? 0) + (p?.losses ?? 0)}

    <div class="profile-header">
      <button class="btn btn-ghost btn-sm back-btn" on:click={() => selected = null}>← All Players</button>
      <div class="profile-name">{selected}</div>
      <div class="profile-elo">{p?.elo ?? 1200}</div>
      <div class="profile-sub">ELO Rating</div>
    </div>

    <!-- Overview stats -->
    <div class="stats-grid">
      {#each [
        [total, 'Games Played'],
        [p?.wins ?? 0, 'Wins'],
        [p?.losses ?? 0, 'Losses'],
        [total ? Math.round((p?.wins ?? 0) / total * 100) + '%' : '—', 'Win Rate'],
        [pr?.streak ?? 0, 'Current Streak'],
      ] as [n, l]}
        <div class="stat-box">
          <div class="stat-num">{n}</div>
          <div class="stat-lbl">{l}</div>
        </div>
      {/each}
    </div>

    <!-- Format breakdown -->
    {#if Object.keys(pr?.byFmt ?? {}).length}
      <div class="card">
        <div class="sec-title">By Format</div>
        <div class="fmt-row-list">
          {#each Object.entries(pr.byFmt) as [fmt, st]}
            <div class="fmt-stat-row">
              <span class="fb fb-{fmt}">{FMT_LABELS[fmt]}</span>
              <span class="fmt-stat-nums">
                <span class="fmt-stat-wr">{Math.round(st.wins / st.total * 100)}%</span>
                <span class="fmt-stat-rec">{st.wins}W–{st.total - st.wins}L</span>
                <span class="fmt-stat-total">{st.total} games</span>
              </span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Top decks -->
    {#if pr?.topDecks.length}
      <div class="card">
        <div class="sec-title">Most Used Decks</div>
        {#each pr.topDecks as d}
          <div class="deck-perf-row">
            <div>
              <span class="dp-name">{d.deckName}</span>
              <span class="dp-played">{d.played} games</span>
            </div>
            <div class="dp-stats">
              <span class="dp-wr">{d.wr}%</span>
              <span class="dp-rec">{d.wins}W–{d.played - d.wins}L</span>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Recent games -->
    {#if pr?.recent.length}
      <div class="card">
        <div class="sec-title">Recent Games</div>
        {#each pr.recent as g}
          {@const isWin = g.winner === selected}
          {@const pEntry = g.players.find(p => p.name === selected)}
          <div class="recent-row" class:win={isWin} class:loss={g.winner && !isWin}>
            <div class="rr-left">
              <span class="rr-result">{isWin ? 'W' : g.winner ? 'L' : '—'}</span>
              <div>
                <div class="rr-date-fmt">
                  {fmtDate(g.date)}
                  <span class="fb fb-{g.fmt}" style="margin-left:.4rem">{FMT_LABELS[g.fmt]}</span>
                </div>
                <div class="rr-players">
                  vs {g.players.filter(p => p.name !== selected).map(p => p.name).join(', ')}
                </div>
                {#if pEntry?.deckName}
                  <div class="rr-deck">{pEntry.deckName}</div>
                {/if}
              </div>
            </div>
            {#if g.mode === 'bon' && g.scores}
              <span class="score-badge">
                {g.players.map(p => `${p.name} ${g.scores?.[p.name] ?? 0}`).join(' — ')}
              </span>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  /* Player list */
  .player-card {
    width: 100%; background: var(--s1); border: 1px solid var(--border); border-radius: 7px;
    padding: .95rem 1.25rem; margin-bottom: .6rem;
    display: flex; justify-content: space-between; align-items: center;
    cursor: pointer; transition: border-color .2s; text-align: left;
  }
  .player-card:hover { border-color: var(--border-h); }
  .pc-left { display: flex; align-items: center; gap: .85rem; }
  .pc-rank { font-family: 'Cinzel', serif; font-size: .9rem; color: var(--muted); min-width: 1.5rem; text-align: center; }
  .pc-rank.g { color: var(--gold); font-size: 1.1rem; }
  .pc-rank.s { color: #aaa; }
  .pc-rank.b { color: var(--cmd); }
  .pc-name { font-family: 'Cinzel', serif; font-size: .9rem; color: var(--text); }
  .pc-rec { font-size: .78rem; color: var(--muted); margin-top: .1rem; }
  .pc-right { text-align: right; }
  .pc-elo { font-family: 'Cinzel Decorative', serif; font-size: 1.3rem; color: var(--gold); line-height: 1; }
  .pc-wr { font-family: 'Cinzel', serif; font-size: .7rem; color: var(--green); margin-top: .15rem; }

  /* Profile */
  .profile-header {
    text-align: center; padding: 1.5rem 1rem 1.25rem;
    background: var(--s1); border: 1px solid var(--border); border-radius: 8px;
    margin-bottom: 1.25rem; position: relative;
  }
  .back-btn { position: absolute; top: 1rem; left: 1rem; }
  .profile-name {
    font-family: 'Cinzel Decorative', serif; font-size: clamp(1.2rem, 3vw, 1.8rem);
    color: var(--gold); text-shadow: 0 0 30px rgba(201,168,76,.2);
    margin-top: .5rem;
  }
  .profile-elo {
    font-family: 'Cinzel Decorative', serif; font-size: 2.8rem; color: var(--text);
    line-height: 1; margin-top: .6rem;
  }
  .profile-sub { font-family: 'Cinzel', serif; font-size: .6rem; letter-spacing: .2em; color: var(--muted); text-transform: uppercase; margin-top: .2rem; }

  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(100px,1fr)); gap: .8rem; margin-bottom: 1.25rem; }
  .stat-box { background: var(--s1); border: 1px solid var(--border); border-radius: 7px; padding: .85rem; text-align: center; }
  .stat-num { font-family: 'Cinzel Decorative', serif; font-size: 1.7rem; color: var(--gold); line-height: 1; }
  .stat-lbl { font-family: 'Cinzel', serif; font-size: .52rem; letter-spacing: .14em; color: var(--muted); text-transform: uppercase; margin-top: .2rem; }

  /* Format stats */
  .fmt-row-list { display: flex; flex-direction: column; gap: .5rem; }
  .fmt-stat-row { display: flex; justify-content: space-between; align-items: center; padding: .4rem .6rem; background: var(--s2); border-radius: 4px; }
  .fmt-stat-nums { display: flex; gap: 1rem; align-items: center; }
  .fmt-stat-wr { color: var(--green); font-family: 'Cinzel', serif; font-size: .78rem; }
  .fmt-stat-rec { color: var(--muted); font-size: .75rem; }
  .fmt-stat-total { color: var(--muted); font-size: .72rem; }

  /* Deck perf */
  .deck-perf-row { display: flex; justify-content: space-between; align-items: center; padding: .38rem .6rem; background: var(--s2); border-radius: 4px; margin-bottom: .28rem; }
  .dp-name { font-family: 'Cinzel', serif; font-size: .82rem; color: var(--gold); margin-right: .5rem; }
  .dp-played { font-size: .72rem; color: var(--muted); }
  .dp-stats { display: flex; gap: .75rem; align-items: center; }
  .dp-wr { color: var(--green); font-family: 'Cinzel', serif; font-size: .75rem; }
  .dp-rec { color: var(--muted); font-size: .72rem; }

  /* Recent games */
  .recent-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: .6rem .75rem; border-radius: 5px; margin-bottom: .3rem;
    background: var(--s2); border-left: 3px solid transparent;
    transition: border-color .15s;
  }
  .recent-row.win  { border-left-color: var(--green); }
  .recent-row.loss { border-left-color: var(--red); }
  .rr-left { display: flex; align-items: center; gap: .75rem; }
  .rr-result {
    font-family: 'Cinzel', serif; font-size: .85rem; font-weight: 700;
    min-width: 1.2rem; text-align: center;
  }
  .win  .rr-result { color: var(--green); }
  .loss .rr-result { color: var(--red); }
  .rr-date-fmt { font-family: 'Cinzel', serif; font-size: .65rem; color: var(--muted); }
  .rr-players { font-size: .82rem; color: var(--text); margin-top: .1rem; }
  .rr-deck { font-size: .75rem; color: var(--gold-d); font-style: italic; margin-top: .08rem; }
  .score-badge {
    font-family: 'Cinzel Decorative', serif; font-size: .72rem;
    background: var(--s3); border: 1px solid var(--border); border-radius: 4px;
    padding: .1rem .45rem; color: var(--text); white-space: nowrap;
  }
</style>
