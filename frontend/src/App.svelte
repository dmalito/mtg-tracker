<script>
  import { onMount } from 'svelte';
  import { loadAll, toast, loading } from './lib/stores.js';
  import LogGame from './routes/LogGame.svelte';
  import History from './routes/History.svelte';
  import Stats   from './routes/Stats.svelte';
  import Decks   from './routes/Decks.svelte';
  import Players from './routes/Players.svelte';

  let tab = 'log';

  const TABS = [
    { id: 'log',     label: 'Log Game'   },
    { id: 'history', label: 'History'    },
    { id: 'stats',   label: 'Stats & ELO'},
    { id: 'players', label: 'Players'    },
    { id: 'decks',   label: 'Decks'      },
  ];

  onMount(() => loadAll());
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=Cinzel:wght@400;600;700&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap">
</svelte:head>

<div class="root">
  <!-- Header -->
  <header>
    <div class="orn">✦ ✦ ✦</div>
    <h1>MTG Tracker</h1>
    <p>Commander &amp; Pauper · ELO · History</p>
  </header>

  <!-- Nav -->
  <nav>
    {#each TABS as t}
      <button class:active={tab === t.id} on:click={() => tab = t.id}>{t.label}</button>
    {/each}
  </nav>

  <!-- Content -->
  <main>
    {#if $loading}
      <div class="loading">LOADING…</div>
    {:else}
      {#if tab === 'log'}     <LogGame on:saved={() => tab = 'history'} /> {/if}
      {#if tab === 'history'} <History /> {/if}
      {#if tab === 'stats'}   <Stats />   {/if}
      {#if tab === 'players'} <Players /> {/if}
      {#if tab === 'decks'}   <Decks />   {/if}
    {/if}
  </main>

  <!-- Toast -->
  <div class="toast" class:show={$toast.visible}>{$toast.msg}</div>
</div>

<style>
  :global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }
  :global(html, body, #app) { width: 100%; min-height: 100vh; }

  :global(:root) {
    --gold: #c9a84c; --gold-l: #e8c97a; --gold-d: #7a6020;
    --bg: #0c0c10; --s1: #131318; --s2: #1a1a22; --s3: #222230;
    --text: #ede4ce; --muted: #6a6258;
    --red: #c94040; --green: #3a9a5c;
    --cmd: #c97440; --pau: #5aaa7a;
    --border: rgba(201,168,76,0.18); --border-h: rgba(201,168,76,0.42);
  }

  :global(body) {
    font-family: 'EB Garamond', Georgia, serif;
    background: var(--bg); color: var(--text);
    background-image:
      radial-gradient(ellipse 60% 40% at 15% 0%, rgba(201,116,64,.07) 0%, transparent 60%),
      radial-gradient(ellipse 60% 40% at 85% 100%, rgba(90,170,122,.05) 0%, transparent 60%);
  }

  :global(::-webkit-scrollbar) { width: 4px; height: 4px; }
  :global(::-webkit-scrollbar-track) { background: var(--s2); }
  :global(::-webkit-scrollbar-thumb) { background: var(--gold-d); border-radius: 2px; }

  /* ── shared component styles ── */
  :global(.card) {
    background: var(--s1); border: 1px solid var(--border); border-radius: 8px;
    padding: 1.25rem 1.5rem; position: relative; margin-bottom: 1.25rem;
  }
  :global(.card::before) {
    content: ''; position: absolute; top: 0; left: 15%; right: 15%; height: 1px;
    background: linear-gradient(90deg, transparent, var(--gold), transparent); opacity: .35;
  }
  :global(.sec-title) {
    font-family: 'Cinzel', serif; font-size: .6rem; letter-spacing: .22em; text-transform: uppercase;
    color: var(--gold-d); margin-bottom: .85rem; padding-bottom: .4rem; border-bottom: 1px solid var(--border);
  }
  :global(.btn) {
    font-family: 'Cinzel', serif; font-size: .65rem; letter-spacing: .1em; text-transform: uppercase;
    border: none; border-radius: 4px; padding: .55rem 1.15rem; cursor: pointer;
    transition: all .18s; display: inline-flex; align-items: center; gap: .3rem;
  }
  :global(.btn-gold) { background: linear-gradient(135deg, #7a6020, var(--gold)); color: #0c0c10; font-weight: 700; }
  :global(.btn-gold:hover) { filter: brightness(1.15); box-shadow: 0 0 22px rgba(201,168,76,.35); }
  :global(.btn-ghost) { background: transparent; border: 1px solid var(--border); color: var(--muted); }
  :global(.btn-ghost:hover) { border-color: var(--gold-d); color: var(--gold-l); }
  :global(.btn-danger) { background: rgba(201,64,64,.1); border: 1px solid rgba(201,64,64,.22); color: var(--red); }
  :global(.btn-danger:hover) { background: rgba(201,64,64,.22); }
  :global(.btn-sm) { padding: .28rem .6rem; font-size: .58rem; }
  :global(input), :global(select), :global(textarea) {
    background: var(--s2); border: 1px solid var(--border); border-radius: 4px;
    color: var(--text); font-family: 'EB Garamond', serif; font-size: 1rem;
    padding: .5rem .75rem; width: 100%; transition: border-color .2s; -webkit-appearance: none;
  }
  :global(input:focus), :global(select:focus), :global(textarea:focus) {
    outline: none; border-color: var(--gold-d); background: var(--s3);
  }
  :global(label.lbl) {
    display: block; font-family: 'Cinzel', serif; font-size: .58rem; letter-spacing: .16em;
    text-transform: uppercase; color: var(--muted); margin-bottom: .28rem;
  }
  :global(.fg) { margin-bottom: .85rem; }
  :global(.fr2) { display: grid; grid-template-columns: 1fr 1fr; gap: .85rem; }
  :global(.fr3) { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: .85rem; }
  @media(max-width:580px) { :global(.fr2), :global(.fr3) { grid-template-columns: 1fr; } }
  :global(.fb) {
    display: inline-block; font-family: 'Cinzel', serif; font-size: .57rem; letter-spacing: .08em;
    padding: .1rem .38rem; border-radius: 3px; border: 1px solid;
  }
  :global(.fb-cmd) { color: var(--cmd); border-color: rgba(201,116,64,.4); background: rgba(201,116,64,.08); }
  :global(.fb-pau) { color: var(--pau); border-color: rgba(90,170,122,.4); background: rgba(90,170,122,.08); }
  :global(.divider) { height: 1px; background: linear-gradient(90deg, transparent, var(--border), transparent); margin: 1.1rem 0; }
  :global(.empty) { text-align: center; padding: 3rem 1rem; color: var(--muted); font-style: italic; }
  :global(.empty-icon) { font-size: 2.2rem; display: block; margin-bottom: .55rem; opacity: .22; }
  :global(.cpips) { display: flex; gap: 3px; margin-top: .25rem; }
  :global(.cpip) {
    width: 13px; height: 13px; border-radius: 50%; border: 1px solid rgba(0,0,0,.5);
    font-size: .46rem; font-weight: bold; display: flex; align-items: center; justify-content: center;
  }
  :global(.cW){background:#f9f0d4;color:#333} :global(.cU){background:#0070b9;color:#fff}
  :global(.cB){background:#1a100a;color:#bbb;border-color:#666} :global(.cR){background:#d3202a;color:#fff}
  :global(.cG){background:#006b3f;color:#fff} :global(.cC){background:#777;color:#fff}
  :global(.fade-in) { animation: fadeUp .25s ease; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }

  /* ── layout ── */
  .root { min-height: 100vh; }

  header {
    text-align: center; padding: 2rem 1rem 1.25rem;
    border-bottom: 1px solid var(--border);
    background: linear-gradient(180deg, rgba(201,168,76,.05) 0%, transparent 100%);
    position: relative;
  }
  header::after {
    content: ''; position: absolute; bottom: 0; left: 10%; right: 10%; height: 1px;
    background: linear-gradient(90deg, transparent, var(--gold), transparent); opacity: .5;
  }
  .orn { font-family: 'Cinzel', serif; font-size: 1rem; color: var(--gold-d); letter-spacing: .9rem; opacity: .5; margin-bottom: .35rem; }
  h1 {
    font-family: 'Cinzel Decorative', serif;
    font-size: clamp(1.3rem, 3.5vw, 2.1rem); color: var(--gold);
    letter-spacing: .06em; text-shadow: 0 0 40px rgba(201,168,76,.25);
  }
  header p { font-style: italic; color: var(--muted); margin-top: .22rem; font-size: .95rem; }

  nav {
    display: flex; justify-content: center;
    background: var(--s1); border-bottom: 1px solid var(--border);
    overflow-x: auto; position: sticky; top: 0; z-index: 100;
  }
  nav::-webkit-scrollbar { display: none; }
  nav button {
    background: none; border: none; color: var(--muted);
    font-family: 'Cinzel', serif; font-size: .66rem; letter-spacing: .15em; text-transform: uppercase;
    padding: .88rem 1.1rem; cursor: pointer; border-bottom: 2px solid transparent;
    white-space: nowrap; transition: all .2s; flex-shrink: 0;
  }
  nav button:hover { color: var(--gold-l); }
  nav button.active { color: var(--gold); border-bottom-color: var(--gold); background: rgba(201,168,76,.04); }

  main { padding: 1.75rem 1rem 5rem; }

  .loading {
    display: flex; align-items: center; justify-content: center;
    min-height: 40vh; font-family: 'Cinzel', serif; color: var(--gold);
    font-size: .9rem; letter-spacing: .2em;
  }

  .toast {
    position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%) translateY(50px);
    background: var(--s3); border: 1px solid var(--gold-d);
    color: var(--text); font-family: 'Cinzel', serif; font-size: .7rem; letter-spacing: .1em;
    padding: .5rem 1.4rem; border-radius: 5px; opacity: 0; transition: all .3s; z-index: 9999;
    white-space: nowrap; pointer-events: none;
  }
  .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
</style>
