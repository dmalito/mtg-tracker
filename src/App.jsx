import { useState, useEffect, useCallback } from "react";

/* ─────────────────────────────────────────────
   FONTS (injected once)
───────────────────────────────────────────── */
const FontLink = () => {
  useEffect(() => {
    const id = "mtg-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=Cinzel:wght@400;600;700&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap";
    document.head.appendChild(link);
  }, []);
  return null;
};

/* ─────────────────────────────────────────────
   GLOBAL STYLES
───────────────────────────────────────────── */
const globalCSS = `
  .mtg-root *, .mtg-root *::before, .mtg-root *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .mtg-root {
    --gold: #c9a84c; --gold-l: #e8c97a; --gold-d: #7a6020;
    --bg: #0c0c10; --s1: #131318; --s2: #1a1a22; --s3: #222230;
    --text: #ede4ce; --muted: #6a6258;
    --red: #c94040; --green: #3a9a5c;
    --cmd: #c97440; --pau: #5aaa7a;
    --border: rgba(201,168,76,0.18); --border-h: rgba(201,168,76,0.42);
    font-family: 'EB Garamond', Georgia, serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    background-image:
      radial-gradient(ellipse 60% 40% at 15% 0%, rgba(201,116,64,.07) 0%, transparent 60%),
      radial-gradient(ellipse 60% 40% at 85% 100%, rgba(90,170,122,.05) 0%, transparent 60%);
  }

  /* scrollbar */
  .mtg-root ::-webkit-scrollbar { width: 4px; height: 4px; }
  .mtg-root ::-webkit-scrollbar-track { background: var(--s2); }
  .mtg-root ::-webkit-scrollbar-thumb { background: var(--gold-d); border-radius: 2px; }

  /* typography */
  .font-display { font-family: 'Cinzel Decorative', serif; }
  .font-title   { font-family: 'Cinzel', serif; }

  /* card */
  .card {
    background: var(--s1); border: 1px solid var(--border); border-radius: 8px;
    padding: 1.25rem 1.5rem; position: relative; margin-bottom: 1.25rem;
  }
  .card::before {
    content: ''; position: absolute; top: 0; left: 15%; right: 15%; height: 1px;
    background: linear-gradient(90deg, transparent, var(--gold), transparent); opacity: .35;
  }

  /* section title */
  .sec-title {
    font-family: 'Cinzel', serif; font-size: .6rem; letter-spacing: .22em;
    text-transform: uppercase; color: var(--gold-d);
    margin-bottom: .85rem; padding-bottom: .4rem; border-bottom: 1px solid var(--border);
  }

  /* buttons */
  .btn {
    font-family: 'Cinzel', serif; font-size: .65rem; letter-spacing: .1em; text-transform: uppercase;
    border: none; border-radius: 4px; padding: .56rem 1.2rem; cursor: pointer;
    transition: all .18s; display: inline-flex; align-items: center; gap: .3rem;
  }
  .btn-gold { background: linear-gradient(135deg, #7a6020, var(--gold)); color: #0c0c10; font-weight: 700; }
  .btn-gold:hover { filter: brightness(1.15); box-shadow: 0 0 22px rgba(201,168,76,.35); }
  .btn-ghost { background: transparent; border: 1px solid var(--border); color: var(--muted); }
  .btn-ghost:hover { border-color: var(--gold-d); color: var(--gold-l); }
  .btn-danger { background: rgba(201,64,64,.1); border: 1px solid rgba(201,64,64,.22); color: var(--red); }
  .btn-danger:hover { background: rgba(201,64,64,.22); }
  .btn-sm { padding: .28rem .62rem; font-size: .58rem; }
  .btn-icon { padding: .28rem .5rem; font-size: .72rem; line-height: 1; }

  /* inputs */
  .inp, .sel, .textarea {
    background: var(--s2); border: 1px solid var(--border); border-radius: 4px;
    color: var(--text); font-family: 'EB Garamond', serif; font-size: 1rem;
    padding: .5rem .75rem; width: 100%; transition: border-color .2s; -webkit-appearance: none;
  }
  .inp:focus, .sel:focus, .textarea:focus { outline: none; border-color: var(--gold-d); background: var(--s3); }
  .lbl {
    display: block; font-family: 'Cinzel', serif; font-size: .58rem; letter-spacing: .16em;
    text-transform: uppercase; color: var(--muted); margin-bottom: .28rem;
  }
  .fg { margin-bottom: .85rem; }
  .fr2 { display: grid; grid-template-columns: 1fr 1fr; gap: .85rem; }
  .fr3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: .85rem; }
  @media(max-width:580px) { .fr2, .fr3 { grid-template-columns: 1fr; } }

  /* fmt badges */
  .fb {
    display: inline-block; font-family: 'Cinzel', serif; font-size: .57rem; letter-spacing: .08em;
    padding: .1rem .38rem; border-radius: 3px; border: 1px solid;
  }
  .fb-cmd { color: var(--cmd); border-color: rgba(201,116,64,.4); background: rgba(201,116,64,.08); }
  .fb-pau { color: var(--pau); border-color: rgba(90,170,122,.4); background: rgba(90,170,122,.08); }

  /* divider */
  .divider { height: 1px; background: linear-gradient(90deg, transparent, var(--border), transparent); margin: 1.1rem 0; }

  /* empty */
  .empty { text-align: center; padding: 3rem 1rem; color: var(--muted); font-style: italic; }
  .empty-icon { font-size: 2.2rem; display: block; margin-bottom: .55rem; opacity: .22; }

  /* color pips */
  .cpips { display: flex; gap: 3px; margin-top: .25rem; }
  .cpip {
    width: 13px; height: 13px; border-radius: 50%; border: 1px solid rgba(0,0,0,.5);
    font-size: .46rem; font-weight: bold; display: flex; align-items: center; justify-content: center;
  }
  .cW{background:#f9f0d4;color:#333} .cU{background:#0070b9;color:#fff}
  .cB{background:#1a100a;color:#bbb;border-color:#666} .cR{background:#d3202a;color:#fff}
  .cG{background:#006b3f;color:#fff} .cC{background:#777;color:#fff}

  /* toast */
  .toast {
    position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%) translateY(50px);
    background: var(--s3); border: 1px solid var(--gold-d);
    color: var(--text); font-family: 'Cinzel', serif; font-size: .7rem; letter-spacing: .1em;
    padding: .5rem 1.4rem; border-radius: 5px; opacity: 0; transition: all .3s; z-index: 9999;
    white-space: nowrap; pointer-events: none;
  }
  .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

  /* modal */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,.75);
    display: flex; align-items: center; justify-content: center; z-index: 900;
    animation: fadeUp .2s;
  }
  .modal {
    background: var(--s1); border: 1px solid var(--border); border-radius: 9px;
    padding: 1.75rem; width: min(500px, 96vw); max-height: 90vh; overflow-y: auto; position: relative;
  }
  .modal::before {
    content: ''; position: absolute; top: 0; left: 15%; right: 15%; height: 1px;
    background: linear-gradient(90deg, transparent, var(--gold), transparent); opacity: .4;
  }
  .modal h2 { font-family: 'Cinzel', serif; font-size: .92rem; color: var(--gold); margin-bottom: 1.15rem; letter-spacing: .1em; }
  .modal-act { display: flex; gap: .6rem; justify-content: flex-end; margin-top: 1.15rem; }

  /* fade animation */
  @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
  .fade-in { animation: fadeUp .25s ease; }

  /* game card */
  .game-card {
    background: var(--s1); border: 1px solid var(--border); border-radius: 7px;
    padding: .95rem 1.25rem; margin-bottom: .6rem;
    display: grid; grid-template-columns: 1fr auto; gap: .7rem; align-items: start;
    transition: border-color .2s;
  }
  .game-card:hover { border-color: var(--border-h); }
  .gc-top { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; margin-bottom: .25rem; }
  .gc-date { font-family: 'Cinzel', serif; font-size: .58rem; color: var(--muted); letter-spacing: .1em; }
  .gc-winner { font-family: 'Cinzel', serif; font-size: .9rem; color: var(--gold); }
  .gc-players { font-size: .82rem; color: var(--muted); margin-top: .18rem; }
  .gc-score {
    font-family: 'Cinzel Decorative', serif; font-size: .85rem; color: var(--text);
    background: var(--s2); border: 1px solid var(--border); border-radius: 4px;
    padding: .15rem .6rem; letter-spacing: .05em;
  }
  .gc-notes { font-style: italic; font-size: .8rem; color: var(--muted); margin-top: .2rem; opacity: .7; border-left: 2px solid var(--border); padding-left: .5rem; }

  /* stat boxes */
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(108px,1fr)); gap: .8rem; margin-bottom: 1.35rem; }
  .stat-box { background: var(--s1); border: 1px solid var(--border); border-radius: 7px; padding: .85rem; text-align: center; }
  .stat-num { font-family: 'Cinzel Decorative', serif; font-size: 1.9rem; color: var(--gold); line-height: 1; }
  .stat-lbl { font-family: 'Cinzel', serif; font-size: .54rem; letter-spacing: .15em; color: var(--muted); text-transform: uppercase; margin-top: .2rem; }

  /* leaderboard */
  .lb-hdr {
    display: grid; grid-template-columns: 2rem 1fr 4.2rem 4.8rem 4.2rem 4rem;
    gap: .4rem; padding: .42rem .85rem;
    font-family: 'Cinzel', serif; font-size: .54rem; letter-spacing: .12em;
    color: var(--muted); text-transform: uppercase; border-bottom: 1px solid var(--border);
  }
  .lb-row {
    display: grid; grid-template-columns: 2rem 1fr 4.2rem 4.8rem 4.2rem 4rem;
    gap: .4rem; align-items: center; padding: .62rem .85rem;
    border-bottom: 1px solid rgba(255,255,255,.028); font-size: .87rem; transition: background .15s;
  }
  .lb-row:hover { background: rgba(201,168,76,.03); }
  .lb-row:last-child { border-bottom: none; }
  .lbr { font-family:'Cinzel',serif; font-size:.7rem; color:var(--muted); text-align:center; }
  .lbr-g { color:var(--gold); font-size:.9rem; }
  .lbr-s { color:#aaa; }
  .lbr-b { color:var(--cmd); }
  .lb-name { font-family:'Cinzel',serif; font-size:.8rem; }
  .lb-elo { font-family:'Cinzel Decorative',serif; font-size:.95rem; color:var(--gold); text-align:right; }
  .lb-wr  { color:var(--green); font-family:'Cinzel',serif; font-size:.72rem; text-align:right; }
  .lb-cell { color:var(--muted); font-size:.72rem; text-align:right; }
  @media(max-width:600px){.lb-hdr,.lb-row{grid-template-columns:1.6rem 1fr 3.6rem 3.8rem} .lb-hdr *:nth-child(n+5),.lb-row *:nth-child(n+5){display:none}}

  /* fmt breakdown */
  .fmt-break { display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-top:1.35rem; }
  .fmt-sc { background:var(--s1); border:1px solid var(--border); border-radius:7px; padding:.95rem 1.25rem; }
  .fmt-sc-h { font-family:'Cinzel',serif; font-size:.7rem; letter-spacing:.1em; margin-bottom:.6rem; padding-bottom:.32rem; border-bottom:1px solid var(--border); }
  .fh-cmd { color:var(--cmd); } .fh-pau { color:var(--pau); }
  @media(max-width:500px){ .fmt-break { grid-template-columns:1fr; } }

  /* deck card */
  .deck-card {
    background: var(--s1); border: 1px solid var(--border); border-radius: 7px;
    padding: .95rem 1.25rem; margin-bottom: .6rem;
    transition: border-color .2s;
  }
  .deck-card:hover { border-color: var(--border-h); }
  .dc-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
  .dc-name { font-family:'Cinzel',serif; font-size:.87rem; color:var(--gold); }
  .dc-owner { font-size:.8rem; color:var(--muted); font-style:italic; margin-top:.1rem; }
  .dc-rec { font-family:'Cinzel',serif; font-size:.75rem; color:var(--muted); }
  .dc-actions { display:flex; gap:.4rem; align-items:center; }

  /* edit form inside deck card */
  .deck-edit-form { margin-top:.85rem; padding-top:.85rem; border-top:1px solid var(--border); animation:fadeUp .2s; }

  /* score input row */
  .score-row { display:flex; align-items:center; gap:.5rem; }
  .score-input { width:3.5rem; text-align:center; font-family:'Cinzel Decorative',serif; font-size:1.2rem; padding:.3rem .4rem; }
  .score-sep { font-family:'Cinzel',serif; font-size:.8rem; color:var(--muted); }

  /* perf row */
  .perf-row {
    display:flex; justify-content:space-between; align-items:center;
    font-size:.82rem; padding:.3rem .65rem;
    background:var(--s2); border-radius:4px; margin-bottom:.28rem;
  }

  /* nav */
  .nav-bar {
    display:flex; justify-content:center;
    background:var(--s1); border-bottom:1px solid var(--border);
    overflow-x:auto; position:sticky; top:0; z-index:100;
  }
  .nav-bar::-webkit-scrollbar { display:none; }
  .nav-btn {
    background:none; border:none; color:var(--muted);
    font-family:'Cinzel',serif; font-size:.66rem; letter-spacing:.15em; text-transform:uppercase;
    padding:.88rem 1.1rem; cursor:pointer; border-bottom:2px solid transparent;
    white-space:nowrap; transition:all .2s; flex-shrink:0;
  }
  .nav-btn:hover { color:var(--gold-l); }
  .nav-btn.active { color:var(--gold); border-bottom-color:var(--gold); background:rgba(201,168,76,.04); }

  /* player row in log form */
  .player-row { display:grid; grid-template-columns:1fr 1fr auto; gap:.45rem; align-items:center; margin-bottom:.45rem; }
  @media(max-width:480px){ .player-row { grid-template-columns:1fr; } .player-row .btn-sm { justify-self: start; } }

  /* score display in history */
  .score-badge {
    font-family:'Cinzel Decorative',serif; font-size:.78rem;
    background:var(--s2); border:1px solid var(--border); border-radius:4px;
    padding:.1rem .5rem; color:var(--text);
  }

  /* inline deck suggestion */
  .deck-suggestion {
    position:absolute; z-index:50; background:var(--s3); border:1px solid var(--border);
    border-radius:4px; width:100%; top:calc(100% + 2px); left:0;
    max-height:160px; overflow-y:auto;
  }
  .deck-suggestion-item {
    padding:.42rem .7rem; font-size:.88rem; cursor:pointer; transition:background .12s;
  }
  .deck-suggestion-item:hover { background:rgba(201,168,76,.08); color:var(--gold-l); }
  .deck-input-wrap { position:relative; }

  /* new deck tag */
  .new-deck-tag {
    font-family:'Cinzel',serif; font-size:.56rem; letter-spacing:.08em;
    padding:.08rem .35rem; border-radius:3px;
    background:rgba(201,168,76,.12); border:1px solid rgba(201,168,76,.3); color:var(--gold-d);
    margin-left:.35rem;
  }
`;

/* ─────────────────────────────────────────────
   ELO ENGINE
───────────────────────────────────────────── */
const K = 32;
const expected = (ra, rb) => 1 / (1 + Math.pow(10, (rb - ra) / 400));

function computeEloDeltas(winner, losers, players) {
  const p = JSON.parse(JSON.stringify(players));
  const delta = {};
  delta[winner] = 0;
  losers.forEach(l => {
    const rw = p[winner]?.elo ?? 1200;
    const rl = p[l]?.elo ?? 1200;
    const dw = Math.round(K * (1 - expected(rw, rl)));
    const dl = Math.round(K * (0 - expected(rl, rw)));
    delta[winner] = (delta[winner] || 0) + dw;
    delta[l] = dl;
  });
  return delta;
}

function recomputeAllElo(games) {
  const players = {};
  const ep = (n) => { if (!players[n]) players[n] = { elo: 1200, wins: 0, losses: 0 }; };
  [...games].reverse().forEach(g => {
    g.players.forEach(p => ep(p.name));
    if (!g.winner) return;
    const losers = g.players.map(p => p.name).filter(n => n !== g.winner);
    const delta = computeEloDeltas(g.winner, losers, players);
    players[g.winner].wins++;
    losers.forEach(l => players[l].losses++);
    Object.entries(delta).forEach(([n, d]) => { ep(n); players[n].elo += d; });
  });
  return players;
}

/* ─────────────────────────────────────────────
   STORAGE
───────────────────────────────────────────── */
const SK = "mtg_react_v1";
const loadState = () => {
  try { const r = localStorage.getItem(SK); if (r) return JSON.parse(r); } catch (e) {}
  return { games: [], decks: [] };
};
const saveState = (s) => { try { localStorage.setItem(SK, JSON.stringify(s)); } catch (e) {} };

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const FMT_LABELS = { cmd: "Commander / EDH", pau: "Pauper" };
const fmtDate = (d) => {
  if (!d) return "—";
  const [y, m, dd] = d.split("-");
  return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(m)-1] + " " + parseInt(dd) + ", " + y;
};
const COLOR_META = [
  { v:"W", label:"White" }, { v:"U", label:"Blue" }, { v:"B", label:"Black" },
  { v:"R", label:"Red" },   { v:"G", label:"Green" },{ v:"C", label:"Colorless" }
];

/* ─────────────────────────────────────────────
   COLOR PIPS
───────────────────────────────────────────── */
const ColorPips = ({ colors = [] }) => (
  <div className="cpips">
    {colors.map(c => <div key={c} className={`cpip c${c}`}>{c}</div>)}
  </div>
);

/* ─────────────────────────────────────────────
   TOAST
───────────────────────────────────────────── */
const Toast = ({ msg, visible }) => (
  <div className={`toast${visible ? " show" : ""}`}>{msg}</div>
);

/* ─────────────────────────────────────────────
   FORMAT BADGE
───────────────────────────────────────────── */
const FmtBadge = ({ fmt }) => (
  <span className={`fb fb-${fmt}`}>{FMT_LABELS[fmt] || fmt}</span>
);

/* ─────────────────────────────────────────────
   DECK AUTOCOMPLETE INPUT
   Shows existing decks as suggestions; typing a new
   name marks it as "new" (will be created on save).
───────────────────────────────────────────── */
const DeckInput = ({ value, onChange, decks, fmt }) => {
  const [open, setOpen] = useState(false);
  const filtered = decks.filter(d =>
    (d.fmt === fmt || d.fmt === "both") &&
    d.name.toLowerCase().includes((value || "").toLowerCase())
  );
  const isNew = value && !decks.find(d => d.name.toLowerCase() === value.toLowerCase());

  return (
    <div className="deck-input-wrap">
      <input
        className="inp"
        placeholder="Deck name (type or pick)"
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
      />
      {value && isNew && <span className="new-deck-tag">NEW</span>}
      {open && filtered.length > 0 && (
        <div className="deck-suggestion">
          {filtered.map(d => (
            <div
              key={d.id}
              className="deck-suggestion-item"
              onMouseDown={() => { onChange(d.name); setOpen(false); }}
            >
              {d.name}
              <span style={{ color: "var(--muted)", fontSize: ".75rem", marginLeft: ".4rem" }}>
                — {d.owner}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   LOG GAME TAB
───────────────────────────────────────────── */
const emptyPlayer = () => ({ name: "", deckName: "" });
const emptyLog = () => ({
  date: new Date().toISOString().slice(0, 10),
  fmt: "cmd",
  mode: "bo1",       // bo1 | bon
  players: [emptyPlayer(), emptyPlayer()],
  scores: {},        // name -> number (for BoN)
  winner: "",
  notes: "",
});

const LogGame = ({ decks, onSave }) => {
  const [form, setForm] = useState(emptyLog());

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const setPlayer = (i, field, val) =>
    setForm(f => {
      const players = f.players.map((p, j) => j === i ? { ...p, [field]: val } : p);
      return { ...f, players };
    });

  const addPlayer = () => {
    if (form.players.length >= 4) return;
    setForm(f => ({ ...f, players: [...f.players, emptyPlayer()] }));
  };

  const removePlayer = (i) =>
    setForm(f => ({ ...f, players: f.players.filter((_, j) => j !== i) }));

  const setScore = (name, val) =>
    setForm(f => ({ ...f, scores: { ...f.scores, [name]: val } }));

  const namedPlayers = form.players.filter(p => p.name.trim());

  const handleSave = () => {
    if (namedPlayers.length < 2) { alert("Add at least 2 players."); return; }
    onSave(form);
    setForm(emptyLog());
  };

  return (
    <div className="fade-in">
      <div className="card">
        <div className="sec-title">Record a Game</div>

        <div className="fr2 fg">
          <div>
            <label className="lbl">Date</label>
            <input className="inp" type="date" value={form.date}
              onChange={e => setField("date", e.target.value)} />
          </div>
          <div>
            <label className="lbl">Format</label>
            <select className="sel" value={form.fmt} onChange={e => setField("fmt", e.target.value)}>
              <option value="cmd">Commander / EDH</option>
              <option value="pau">Pauper</option>
            </select>
          </div>
        </div>

        {/* BoX mode */}
        <div className="fg">
          <label className="lbl">Series Mode</label>
          <div style={{ display: "flex", gap: ".5rem" }}>
            {[["bo1","Best of 1"],["bon","Best of N"]].map(([v,l]) => (
              <button key={v}
                className={"btn " + (form.mode===v ? "btn-gold" : "btn-ghost")}
                onClick={() => setField("mode", v)}
                style={{ flex:1 }}
              >{l}</button>
            ))}
          </div>
        </div>

        {/* Players */}
        <div className="fg">
          <label className="lbl">Players</label>
          {form.players.map((p, i) => (
            <div key={i} className="player-row" style={{ marginBottom: ".55rem" }}>
              <input
                className="inp"
                placeholder={`Player ${i + 1} name`}
                value={p.name}
                onChange={e => setPlayer(i, "name", e.target.value)}
              />
              <DeckInput
                value={p.deckName}
                onChange={v => setPlayer(i, "deckName", v)}
                decks={decks}
                fmt={form.fmt}
              />
              {form.players.length > 2 ? (
                <button className="btn btn-ghost btn-icon" onClick={() => removePlayer(i)}>✕</button>
              ) : <span />}
            </div>
          ))}
          {form.players.length < 4 && (
            <button className="btn btn-ghost btn-sm" onClick={addPlayer}>+ Add Player</button>
          )}
        </div>

        {/* Score section */}
        {form.mode === "bon" ? (
          <div className="fg">
            <label className="lbl">Scores</label>
            {namedPlayers.map(p => (
              <div key={p.name} style={{ display:"flex", alignItems:"center", gap:".65rem", marginBottom:".4rem" }}>
                <span style={{ fontFamily:"'Cinzel',serif", fontSize:".78rem", minWidth:"7rem", color:"var(--text)" }}>{p.name}</span>
                <input
                  className="inp score-input"
                  type="number" min="0"
                  value={form.scores[p.name] ?? ""}
                  onChange={e => setScore(p.name, e.target.value)}
                  placeholder="0"
                />
                <span style={{ color:"var(--muted)", fontSize:".78rem" }}>wins</span>
              </div>
            ))}
          </div>
        ) : null}

        {/* Winner */}
        {form.mode === "bon" ? (
          <div className="fg">
            <label className="lbl">Series Winner</label>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:".85rem", color:"var(--gold)", padding:".5rem .75rem", background:"var(--s2)", border:"1px solid var(--border)", borderRadius:4 }}>
              {(() => {
                const top = namedPlayers
                  .filter(p => form.scores[p.name] !== "" && form.scores[p.name] !== undefined)
                  .sort((a, b) => Number(form.scores[b.name]) - Number(form.scores[a.name]));
                return top.length ? `🏆 ${top[0].name}` : "— enter scores above —";
              })()}
            </div>
          </div>
        ) : (
          <div className="fg">
            <label className="lbl">Winner</label>
            <select className="sel" value={form.winner} onChange={e => setField("winner", e.target.value)}>
              <option value="">— Select Winner —</option>
              {namedPlayers.map(p => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="fg">
          <label className="lbl">Notes (optional)</label>
          <textarea className="inp textarea" rows={3}
            placeholder="Notable plays, how it ended…"
            value={form.notes}
            onChange={e => setField("notes", e.target.value)}
          />
        </div>

        <button className="btn btn-gold" onClick={handleSave}>Save Game</button>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   HISTORY TAB
───────────────────────────────────────────── */
const History = ({ games, decks, players, onDelete }) => {
  const [fmtF, setFmtF] = useState("");
  const [playerF, setPlayerF] = useState("");

  const allPlayers = Object.keys(players);
  const filtered = games.filter(g =>
    (!fmtF || g.fmt === fmtF) &&
    (!playerF || g.players.some(p => p.name === playerF))
  );

  const deckLabel = (deckName) => {
    const d = decks.find(d => d.name.toLowerCase() === deckName?.toLowerCase());
    return deckName || null;
  };

  const scoreDisplay = (g) => {
    if (g.mode !== "bon") return null;
    const parts = g.players.map(p => `${p.name} ${g.scores?.[p.name] ?? 0}`).join(" — ");
    return <span className="score-badge">{parts}</span>;
  };

  return (
    <div className="fade-in">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem", flexWrap:"wrap", gap:".5rem" }}>
        <div className="sec-title" style={{ margin:0 }}>Game History</div>
        <div style={{ display:"flex", gap:".5rem" }}>
          <select className="sel" style={{ width:"auto", fontSize:".85rem" }} value={fmtF} onChange={e => setFmtF(e.target.value)}>
            <option value="">All Formats</option>
            <option value="cmd">Commander / EDH</option>
            <option value="pau">Pauper</option>
          </select>
          <select className="sel" style={{ width:"auto", fontSize:".85rem" }} value={playerF} onChange={e => setPlayerF(e.target.value)}>
            <option value="">All Players</option>
            {allPlayers.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {!filtered.length ? (
        <div className="empty"><span className="empty-icon">📜</span>No games yet.</div>
      ) : filtered.map(g => {
        const eloD = g.eloDelta && g.winner ? g.eloDelta[g.winner] : null;
        return (
          <div key={g.id} className="game-card">
            <div>
              <div className="gc-top">
                <span className="gc-date">{fmtDate(g.date)}</span>
                <FmtBadge fmt={g.fmt} />
                {g.mode === "bon" && <span style={{ fontFamily:"'Cinzel',serif", fontSize:".55rem", color:"var(--muted)", letterSpacing:".1em" }}>BEST OF N</span>}
                {scoreDisplay(g)}
              </div>
              {g.winner
                ? <div className="gc-winner">
                    🏆 {g.winner}
                    {eloD != null && <span style={{ color:"var(--green)", fontFamily:"'Cinzel',serif", fontSize:".65rem", marginLeft:".4rem" }}>+{eloD} ELO</span>}
                  </div>
                : <div style={{ color:"var(--muted)", fontStyle:"italic", fontSize:".82rem" }}>No winner recorded</div>
              }
              <div className="gc-players">
                {g.players.map((p, i) => (
                  <span key={i}>
                    {i > 0 && " · "}
                    {p.name}
                    {p.deckName && <em style={{ color:"var(--gold-d)", fontSize:".76rem" }}> ({p.deckName})</em>}
                  </span>
                ))}
              </div>
              {g.notes && <div className="gc-notes">{g.notes}</div>}
            </div>
            <button className="btn btn-danger btn-sm" onClick={() => onDelete(g.id)}>✕</button>
          </div>
        );
      })}
    </div>
  );
};

/* ─────────────────────────────────────────────
   STATS TAB
───────────────────────────────────────────── */
const Stats = ({ games, decks, players }) => {
  const sorted = Object.entries(players)
    .map(([name, d]) => {
      const t = d.wins + d.losses;
      return { name, elo: d.elo, wins: d.wins, losses: d.losses, total: t, wr: t ? Math.round(d.wins / t * 100) : 0 };
    })
    .filter(p => p.total > 0)
    .sort((a, b) => b.elo - a.elo);

  const ri = (i) => i===0?"👑":i===1?"🥈":i===2?"🥉":`${i+1}`;
  const rc = (i) => i===0?"lbr lbr-g":i===1?"lbr lbr-s":i===2?"lbr lbr-b":"lbr";

  const fmtStat = (fmt) => {
    const fg = games.filter(g => g.fmt === fmt);
    if (!fg.length) return <div style={{ color:"var(--muted)", fontStyle:"italic", fontSize:".83rem" }}>No games yet</div>;
    const wins = {};
    fg.forEach(g => { if (g.winner) wins[g.winner] = (wins[g.winner] || 0) + 1; });
    const top = Object.entries(wins).sort((a,b) => b[1]-a[1]);
    return (
      <>
        <div style={{ fontSize:".82rem", color:"var(--muted)" }}>{fg.length} games</div>
        {top[0] && <div style={{ marginTop:".35rem", fontFamily:"'Cinzel',serif", fontSize:".78rem", color:"var(--gold)" }}>🏆 {top[0][0]} ({top[0][1]} wins)</div>}
        <div style={{ marginTop:".4rem" }}>
          {top.map(([n, w]) => (
            <div key={n} style={{ display:"flex", justifyContent:"space-between", fontSize:".78rem", padding:".16rem 0", borderBottom:"1px solid rgba(255,255,255,.03)" }}>
              <span>{n}</span>
              <span style={{ color:"var(--gold)", fontFamily:"'Cinzel',serif" }}>{w}W</span>
            </div>
          ))}
        </div>
      </>
    );
  };

  // deck performance
  const ds = {};
  games.forEach(g => g.players.forEach(p => {
    if (!p.deckName) return;
    if (!ds[p.deckName]) ds[p.deckName] = { w:0, g:0 };
    ds[p.deckName].g++;
    if (g.winner === p.name) ds[p.deckName].w++;
  }));

  return (
    <div className="fade-in">
      <div className="stats-grid">
        {[
          [games.length, "Total Games"],
          [Object.keys(players).filter(p => players[p].wins + players[p].losses > 0).length, "Players"],
          [decks.length, "Decks"],
          [games.filter(g => g.fmt==="cmd").length, "Commander"],
          [games.filter(g => g.fmt==="pau").length, "Pauper"],
        ].map(([n, l]) => (
          <div key={l} className="stat-box">
            <div className="stat-num">{n}</div>
            <div className="stat-lbl">{l}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="sec-title">ELO Leaderboard</div>
        <div className="lb-hdr">
          <span>#</span><span>Player</span>
          <span style={{textAlign:"right"}}>ELO</span>
          <span style={{textAlign:"right"}}>Win Rate</span>
          <span style={{textAlign:"right"}}>Record</span>
          <span style={{textAlign:"right"}}>Games</span>
        </div>
        {!sorted.length
          ? <div className="empty">No games recorded yet.</div>
          : sorted.map((p, i) => (
            <div key={p.name} className="lb-row">
              <span className={rc(i)}>{ri(i)}</span>
              <span className="lb-name">{p.name}</span>
              <span className="lb-elo">{p.elo}</span>
              <span className="lb-wr">{p.wr}%</span>
              <span className="lb-cell">{p.wins}W–{p.losses}L</span>
              <span className="lb-cell">{p.total}</span>
            </div>
          ))
        }
      </div>

      <div className="fmt-break">
        <div className="fmt-sc">
          <div className="fmt-sc-h fh-cmd">Commander / EDH</div>
          {fmtStat("cmd")}
        </div>
        <div className="fmt-sc">
          <div className="fmt-sc-h fh-pau">Pauper</div>
          {fmtStat("pau")}
        </div>
      </div>

      {Object.keys(ds).length > 0 && (
        <div className="card" style={{ marginTop:"1.25rem" }}>
          <div className="sec-title">Deck Performance</div>
          {Object.entries(ds).map(([name, st]) => {
            const wr = st.g ? Math.round(st.w / st.g * 100) : 0;
            return (
              <div key={name} className="perf-row">
                <span style={{ fontFamily:"'Cinzel',serif", fontSize:".82rem", color:"var(--gold)" }}>{name}</span>
                <span style={{ display:"flex", gap:"1rem", alignItems:"center" }}>
                  <span style={{ color:"var(--green)", fontFamily:"'Cinzel',serif", fontSize:".75rem" }}>{wr}%</span>
                  <span style={{ color:"var(--muted)", fontSize:".72rem" }}>{st.w}W–{st.g-st.w}L</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   DECKS TAB
   - Lists all known decks (from saved games + manually added)
   - Inline edit: owner, format, colors
───────────────────────────────────────────── */
const DeckEditForm = ({ deck, onSave, onCancel }) => {
  const [d, setD] = useState({ ...deck });
  const toggle = (c) => setD(prev => {
    const colors = prev.colors.includes(c) ? prev.colors.filter(x => x !== c) : [...prev.colors, c];
    return { ...prev, colors };
  });
  return (
    <div className="deck-edit-form">
      <div className="fr2 fg">
        <div>
          <label className="lbl">Owner</label>
          <input className="inp" value={d.owner} onChange={e => setD(p => ({...p, owner: e.target.value}))} placeholder="Owner name" />
        </div>
        <div>
          <label className="lbl">Format</label>
          <select className="sel" value={d.fmt} onChange={e => setD(p => ({...p, fmt: e.target.value}))}>
            <option value="cmd">Commander / EDH</option>
            <option value="pau">Pauper</option>
            <option value="both">Both</option>
          </select>
        </div>
      </div>
      <div className="fg">
        <label className="lbl">Colors</label>
        <div style={{ display:"flex", gap:".6rem", flexWrap:"wrap", alignItems:"center" }}>
          {COLOR_META.map(({ v, label }) => (
            <label key={v} style={{ display:"flex", alignItems:"center", gap:".25rem", fontSize:".88rem", cursor:"pointer", letterSpacing:0, textTransform:"none", fontFamily:"inherit", color:"var(--text)" }}>
              <input type="checkbox" checked={d.colors.includes(v)} onChange={() => toggle(v)} />
              <span className={`cpip c${v}`}>{v}</span>
              {label}
            </label>
          ))}
        </div>
      </div>
      <div style={{ display:"flex", gap:".5rem", justifyContent:"flex-end" }}>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        <button className="btn btn-gold btn-sm" onClick={() => onSave(d)}>Save</button>
      </div>
    </div>
  );
};

const Decks = ({ decks, games, onUpdateDeck, onAddDeck, onDeleteDeck }) => {
  const [editing, setEditing] = useState(null); // deck id
  const [showAdd, setShowAdd] = useState(false);
  const [newDeck, setNewDeck] = useState({ name:"", owner:"", fmt:"cmd", colors:[] });

  // Collect deck names from games that aren't in decks yet
  const implicitNames = new Set();
  games.forEach(g => g.players.forEach(p => {
    if (p.deckName && !decks.find(d => d.name.toLowerCase() === p.deckName.toLowerCase())) {
      implicitNames.add(p.deckName);
    }
  }));

  const deckStats = (name) => games.reduce((a, g) => {
    const p = g.players.find(p => p.deckName?.toLowerCase() === name.toLowerCase());
    if (!p) return a;
    a.g++; if (g.winner === p.name) a.w++;
    return a;
  }, { w:0, g:0 });

  const toggleNewColor = (c) => setNewDeck(p => ({
    ...p, colors: p.colors.includes(c) ? p.colors.filter(x=>x!==c) : [...p.colors, c]
  }));

  return (
    <div className="fade-in">
      {/* Add deck */}
      <div className="card">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div className="sec-title" style={{ margin:0 }}>Add Deck Manually</div>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(s => !s)}>
            {showAdd ? "Cancel" : "+ Add Deck"}
          </button>
        </div>
        {showAdd && (
          <div style={{ marginTop:"1rem", animation:"fadeUp .2s" }}>
            <div className="fr2 fg">
              <div>
                <label className="lbl">Deck Name</label>
                <input className="inp" value={newDeck.name} onChange={e => setNewDeck(p=>({...p,name:e.target.value}))} placeholder="e.g. Atraxa Counters" />
              </div>
              <div>
                <label className="lbl">Owner</label>
                <input className="inp" value={newDeck.owner} onChange={e => setNewDeck(p=>({...p,owner:e.target.value}))} placeholder="Your name" />
              </div>
            </div>
            <div className="fr2 fg">
              <div>
                <label className="lbl">Format</label>
                <select className="sel" value={newDeck.fmt} onChange={e => setNewDeck(p=>({...p,fmt:e.target.value}))}>
                  <option value="cmd">Commander / EDH</option>
                  <option value="pau">Pauper</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>
            <div className="fg">
              <label className="lbl">Colors</label>
              <div style={{ display:"flex", gap:".6rem", flexWrap:"wrap" }}>
                {COLOR_META.map(({v,label}) => (
                  <label key={v} style={{ display:"flex", alignItems:"center", gap:".25rem", fontSize:".88rem", cursor:"pointer", letterSpacing:0, textTransform:"none", fontFamily:"inherit", color:"var(--text)" }}>
                    <input type="checkbox" checked={newDeck.colors.includes(v)} onChange={() => toggleNewColor(v)} />
                    <span className={`cpip c${v}`}>{v}</span> {label}
                  </label>
                ))}
              </div>
            </div>
            <button className="btn btn-gold" onClick={() => {
              if (!newDeck.name.trim()) return;
              onAddDeck({ ...newDeck, name: newDeck.name.trim() });
              setNewDeck({ name:"", owner:"", fmt:"cmd", colors:[] });
              setShowAdd(false);
            }}>Add Deck</button>
          </div>
        )}
      </div>

      {/* Unregistered decks from games */}
      {implicitNames.size > 0 && (
        <div style={{ marginBottom:"1rem" }}>
          <div className="sec-title">Decks from Games (not yet registered)</div>
          {[...implicitNames].map(name => {
            const st = deckStats(name);
            return (
              <div key={name} className="deck-card" style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div className="dc-name">{name}</div>
                  <div className="dc-rec" style={{ marginTop:".15rem" }}>{st.g ? `${st.w}W–${st.g-st.w}L` : "No wins recorded"}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => {
                  onAddDeck({ name, owner:"", fmt:"cmd", colors:[] });
                }}>Register</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Registered decks */}
      <div className="sec-title">Deck Collection</div>
      {!decks.length
        ? <div className="empty"><span className="empty-icon">🃏</span>No decks registered yet.</div>
        : decks.map(d => {
          const st = deckStats(d.name);
          const fmtBadge = d.fmt === "cmd"
            ? <span className="fb fb-cmd">Commander</span>
            : d.fmt === "pau"
            ? <span className="fb fb-pau">Pauper</span>
            : <span className="fb" style={{color:"var(--muted)",borderColor:"var(--border)"}}>Both</span>;
          return (
            <div key={d.id} className="deck-card">
              <div className="dc-header">
                <div>
                  <div className="dc-name">{d.name}</div>
                  {d.owner && <div className="dc-owner">{d.owner}</div>}
                  <div style={{ marginTop:".28rem" }}>{fmtBadge}</div>
                  <ColorPips colors={d.colors} />
                </div>
                <div style={{ textAlign:"right" }}>
                  <div className="dc-rec">{st.g ? `${st.w}W–${st.g-st.w}L` : "No games"}</div>
                  <div className="dc-actions" style={{ marginTop:".4rem" }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(editing===d.id?null:d.id)}>
                      {editing===d.id ? "Cancel" : "Edit"}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => onDeleteDeck(d.id)}>Remove</button>
                  </div>
                </div>
              </div>
              {editing === d.id && (
                <DeckEditForm
                  deck={d}
                  onSave={(updated) => { onUpdateDeck(updated); setEditing(null); }}
                  onCancel={() => setEditing(null)}
                />
              )}
            </div>
          );
        })
      }
    </div>
  );
};

/* ─────────────────────────────────────────────
   ROOT APP
───────────────────────────────────────────── */
export default function App() {
  const [tab, setTab] = useState("log");
  const [state, setState] = useState(loadState);
  const [toast, setToastState] = useState({ msg:"", visible:false });

  // Inject CSS once
  useEffect(() => {
    const id = "mtg-global-css";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = globalCSS;
    document.head.appendChild(style);
  }, []);

  const showToast = useCallback((msg) => {
    setToastState({ msg, visible:true });
    setTimeout(() => setToastState(s => ({ ...s, visible:false })), 2600);
  }, []);

  const persist = useCallback((next) => {
    setState(next);
    saveState(next);
  }, []);

  // Derive ELO from all games
  const players = recomputeAllElo(state.games);

  /* ── ensure decks from game logs exist in decks array ── */
  const normalizeDecks = (games, decks) => {
    const next = [...decks];
    games.forEach(g => g.players.forEach(p => {
      if (p.deckName && !next.find(d => d.name.toLowerCase() === p.deckName.toLowerCase())) {
        // don't auto-add — they show as "unregistered" in Decks tab
      }
    }));
    return next;
  };

  const handleSaveGame = (form) => {
    const namedPlayers = form.players.filter(p => p.name.trim());
    const derivedWinner = form.mode === "bon"
      ? namedPlayers
          .filter(p => form.scores[p.name] !== "" && form.scores[p.name] !== undefined)
          .sort((a, b) => Number(form.scores[b.name]) - Number(form.scores[a.name]))[0]?.name ?? ""
      : form.winner;

    const game = {
      id: Date.now(),
      date: form.date,
      fmt: form.fmt,
      mode: form.mode,
      players: namedPlayers.map(p => ({ name: p.name.trim(), deckName: p.deckName?.trim() || null })),
      scores: form.mode === "bon" ? form.scores : null,
      winner: derivedWinner,
      notes: form.notes,
      eloDelta: {},
    };

    // compute ELO with current snapshot
    const currentPlayers = recomputeAllElo(state.games);
    if (game.winner) {
      const losers = game.players.map(p => p.name).filter(n => n !== game.winner);
      game.eloDelta = computeEloDeltas(game.winner, losers, currentPlayers);
    }

    persist(s => ({ ...s, games: [game, ...s.games] }));
    showToast("Game saved!");
    setTab("history");
  };

  const handleDeleteGame = (id) => {
    if (!confirm("Delete this game?")) return;
    persist(s => ({ ...s, games: s.games.filter(g => g.id !== id) }));
    showToast("Game deleted");
  };

  const handleAddDeck = (d) => {
    const deck = { ...d, id: Date.now() };
    persist(s => ({ ...s, decks: [...s.decks, deck] }));
    showToast("Deck added!");
  };

  const handleUpdateDeck = (updated) => {
    persist(s => ({ ...s, decks: s.decks.map(d => d.id === updated.id ? updated : d) }));
    showToast("Deck updated!");
  };

  const handleDeleteDeck = (id) => {
    if (!confirm("Remove this deck?")) return;
    persist(s => ({ ...s, decks: s.decks.filter(d => d.id !== id) }));
    showToast("Deck removed");
  };

  const TABS = [
    { id:"log",     label:"Log Game" },
    { id:"history", label:"History" },
    { id:"stats",   label:"Stats & ELO" },
    { id:"decks",   label:"Decks" },
  ];

  return (
    <div className="mtg-root">
      <FontLink />

      {/* Header */}
      <header style={{
        textAlign:"center", padding:"2rem 1rem 1.25rem",
        borderBottom:"1px solid var(--border)",
        background:"linear-gradient(180deg,rgba(201,168,76,.05) 0%,transparent 100%)",
        position:"relative",
      }}>
        <div style={{ fontFamily:"'Cinzel',serif", fontSize:"1rem", color:"var(--gold-d)", letterSpacing:"1rem", opacity:.5, marginBottom:".35rem" }}>✦ ✦ ✦</div>
        <h1 className="font-display" style={{ fontSize:"clamp(1.3rem,3.5vw,2.1rem)", color:"var(--gold)", letterSpacing:".06em", textShadow:"0 0 40px rgba(201,168,76,.25)" }}>
          MTG Tracker
        </h1>
        <p style={{ fontStyle:"italic", color:"var(--muted)", marginTop:".22rem", fontSize:".95rem" }}>
          Commander &amp; Pauper · ELO · History
        </p>
      </header>

      {/* Nav */}
      <nav className="nav-bar">
        {TABS.map(t => (
          <button
            key={t.id}
            className={"nav-btn" + (tab===t.id?" active":"")}
            onClick={() => setTab(t.id)}
          >{t.label}</button>
        ))}
      </nav>

      {/* Content */}
      <main style={{ padding: "1.75rem 1rem 5rem" }}>
        {tab === "log" && (
          <LogGame decks={state.decks} onSave={handleSaveGame} />
        )}
        {tab === "history" && (
          <History games={state.games} decks={state.decks} players={players} onDelete={handleDeleteGame} />
        )}
        {tab === "stats" && (
          <Stats games={state.games} decks={state.decks} players={players} />
        )}
        {tab === "decks" && (
          <Decks
            decks={state.decks}
            games={state.games}
            onUpdateDeck={handleUpdateDeck}
            onAddDeck={handleAddDeck}
            onDeleteDeck={handleDeleteDeck}
          />
        )}
      </main>

      <Toast msg={toast.msg} visible={toast.visible} />
    </div>
  );
}
