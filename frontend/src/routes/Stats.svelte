<script>
  import { games, decks, players } from '../lib/stores.js';
  import { FMT_LABELS } from '../lib/elo.js';

  $: sorted = Object.entries($players)
    .map(([name, d]) => {
      const t = d.wins + d.losses;
      return { name, elo: d.elo, wins: d.wins, losses: d.losses, total: t, wr: t ? Math.round(d.wins / t * 100) : 0 };
    })
    .filter(p => p.total > 0)
    .sort((a, b) => b.elo - a.elo);

  function rankIcon(i)  { return i===0?'👑':i===1?'🥈':i===2?'🥉':`${i+1}`; }
  function rankClass(i) { return i===0?'g':i===1?'s':i===2?'b':''; }

  function fmtStats(fmt) {
    const fg = $games.filter(g => g.fmt === fmt);
    if (!fg.length) return null;
    const wins = {};
    fg.forEach(g => { if (g.winner) wins[g.winner] = (wins[g.winner] || 0) + 1; });
    const top = Object.entries(wins).sort((a, b) => b[1] - a[1]);
    return { count: fg.length, top };
  }

  $: cmdStats = fmtStats('cmd');
  $: pauStats = fmtStats('pau');

  $: deckStats = (() => {
    const ds = {};
    $games.forEach(g => g.players.forEach(p => {
      if (!p.deckName) return;
      if (!ds[p.deckName]) ds[p.deckName] = { w: 0, g: 0 };
      ds[p.deckName].g++;
      if (g.winner === p.name) ds[p.deckName].w++;
    }));
    return Object.entries(ds).map(([name, st]) => ({
      name, ...st, wr: st.g ? Math.round(st.w / st.g * 100) : 0
    })).sort((a, b) => b.wr - a.wr);
  })();
</script>

<div class="fade-in">
  <!-- Overview -->
  <div class="stats-grid">
    {#each [
      [$games.length, 'Total Games'],
      [sorted.length, 'Players'],
      [$decks.length, 'Decks'],
      [$games.filter(g=>g.fmt==='cmd').length, 'Commander'],
      [$games.filter(g=>g.fmt==='pau').length, 'Pauper'],
    ] as [n, l]}
      <div class="stat-box">
        <div class="stat-num">{n}</div>
        <div class="stat-lbl">{l}</div>
      </div>
    {/each}
  </div>

  <!-- ELO Leaderboard -->
  <div class="card">
    <div class="sec-title">ELO Leaderboard</div>
    <div class="lb-hdr">
      <span>#</span><span>Player</span>
      <span class="r">ELO</span><span class="r">Win Rate</span>
      <span class="r">Record</span><span class="r">Games</span>
    </div>
    {#if !sorted.length}
      <div class="empty">No games yet.</div>
    {:else}
      {#each sorted as p, i}
        <div class="lb-row">
          <span class="lbr {rankClass(i)}">{rankIcon(i)}</span>
          <span class="lb-name">{p.name}</span>
          <span class="lb-elo r">{p.elo}</span>
          <span class="lb-wr r">{p.wr}%</span>
          <span class="lb-cell r">{p.wins}W–{p.losses}L</span>
          <span class="lb-cell r">{p.total}</span>
        </div>
      {/each}
    {/if}
  </div>

  <!-- Format breakdown -->
  <div class="fmt-break">
    {#each [['cmd', cmdStats], ['pau', pauStats]] as [fmt, stats]}
      <div class="fmt-sc">
        <div class="fmt-sc-h {fmt}">{FMT_LABELS[fmt]}</div>
        {#if !stats}
          <div style="color:var(--muted);font-style:italic;font-size:.83rem;">No games yet</div>
        {:else}
          <div style="font-size:.82rem;color:var(--muted);">{stats.count} games</div>
          {#if stats.top[0]}
            <div class="fmt-top">🏆 {stats.top[0][0]} ({stats.top[0][1]} wins)</div>
          {/if}
          {#each stats.top as [name, wins]}
            <div class="fmt-row">
              <span>{name}</span>
              <span class="fmt-wins">{wins}W</span>
            </div>
          {/each}
        {/if}
      </div>
    {/each}
  </div>

  <!-- Deck performance -->
  {#if deckStats.length}
    <div class="card" style="margin-top:1.25rem">
      <div class="sec-title">Deck Performance</div>
      {#each deckStats as d}
        <div class="perf-row">
          <span class="perf-name">{d.name}</span>
          <span class="perf-stats">
            <span class="perf-wr">{d.wr}%</span>
            <span class="perf-rec">{d.w}W–{d.g - d.w}L</span>
          </span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(108px,1fr)); gap: .8rem; margin-bottom: 1.35rem; }
  .stat-box { background: var(--s1); border: 1px solid var(--border); border-radius: 7px; padding: .85rem; text-align: center; }
  .stat-num { font-family: 'Cinzel Decorative', serif; font-size: 1.9rem; color: var(--gold); line-height: 1; }
  .stat-lbl { font-family: 'Cinzel', serif; font-size: .54rem; letter-spacing: .15em; color: var(--muted); text-transform: uppercase; margin-top: .2rem; }

  .lb-hdr {
    display: grid; grid-template-columns: 2rem 1fr 4.2rem 4.8rem 4.2rem 4rem;
    gap: .4rem; padding: .42rem .85rem;
    font-family: 'Cinzel', serif; font-size: .54rem; letter-spacing: .12em;
    color: var(--muted); text-transform: uppercase; border-bottom: 1px solid var(--border);
  }
  .lb-row {
    display: grid; grid-template-columns: 2rem 1fr 4.2rem 4.8rem 4.2rem 4rem;
    gap: .4rem; align-items: center; padding: .62rem .85rem;
    border-bottom: 1px solid rgba(255,255,255,.028); transition: background .15s;
  }
  .lb-row:hover { background: rgba(201,168,76,.03); }
  .lb-row:last-child { border-bottom: none; }
  .r { text-align: right; }
  .lbr { font-family:'Cinzel',serif; font-size:.7rem; color:var(--muted); text-align:center; }
  .lbr.g { color:var(--gold); font-size:.9rem; }
  .lbr.s { color:#aaa; }
  .lbr.b { color:var(--cmd); }
  .lb-name { font-family:'Cinzel',serif; font-size:.8rem; }
  .lb-elo { font-family:'Cinzel Decorative',serif; font-size:.95rem; color:var(--gold); }
  .lb-wr  { color:var(--green); font-family:'Cinzel',serif; font-size:.72rem; }
  .lb-cell { color:var(--muted); font-size:.72rem; }
  @media(max-width:600px){.lb-hdr,.lb-row{grid-template-columns:1.6rem 1fr 3.6rem 3.8rem} .lb-hdr :global(*:nth-child(n+5)),.lb-row :global(*:nth-child(n+5)){display:none}}

  .fmt-break { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1.35rem; }
  @media(max-width:500px) { .fmt-break { grid-template-columns: 1fr; } }
  .fmt-sc { background: var(--s1); border: 1px solid var(--border); border-radius: 7px; padding: .95rem 1.25rem; }
  .fmt-sc-h { font-family:'Cinzel',serif; font-size:.7rem; letter-spacing:.1em; margin-bottom:.6rem; padding-bottom:.32rem; border-bottom:1px solid var(--border); }
  .fmt-sc-h.cmd { color: var(--cmd); } .fmt-sc-h.pau { color: var(--pau); }
  .fmt-top { margin-top:.35rem; font-family:'Cinzel',serif; font-size:.78rem; color:var(--gold); }
  .fmt-row { display:flex; justify-content:space-between; font-size:.78rem; padding:.16rem 0; border-bottom:1px solid rgba(255,255,255,.03); }
  .fmt-wins { color:var(--gold); font-family:'Cinzel',serif; }

  .perf-row { display:flex; justify-content:space-between; align-items:center; font-size:.82rem; padding:.3rem .65rem; background:var(--s2); border-radius:4px; margin-bottom:.28rem; }
  .perf-name { font-family:'Cinzel',serif; font-size:.82rem; color:var(--gold); }
  .perf-stats { display:flex; gap:1rem; align-items:center; }
  .perf-wr { color:var(--green); font-family:'Cinzel',serif; font-size:.75rem; }
  .perf-rec { color:var(--muted); font-size:.72rem; }
</style>
