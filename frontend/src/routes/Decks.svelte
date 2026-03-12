<script>
  import { decks, games, showToast } from '../lib/stores.js';
  import { api } from '../lib/api.js';
  import { COLOR_META, FMT_LABELS } from '../lib/elo.js';

  let showAdd = false;
  let editingId = null;
  let newDeck = { name: '', owner: '', fmt: 'cmd', colors: [] };

  function toggleColor(deck, c) {
    deck.colors = deck.colors.includes(c) ? deck.colors.filter(x => x !== c) : [...deck.colors, c];
    return deck;
  }
  function toggleNewColor(c) {
    newDeck = toggleColor({ ...newDeck }, c);
  }

  // Decks seen in games but not registered
  $: implicitNames = [...new Set(
    $games.flatMap(g => g.players.map(p => p.deckName).filter(Boolean))
  )].filter(name => !$decks.find(d => d.name.toLowerCase() === name.toLowerCase()));

  function deckStats(name) {
    return $games.reduce((a, g) => {
      const p = g.players.find(p => p.deckName?.toLowerCase() === name.toLowerCase());
      if (!p) return a;
      a.g++; if (g.winner === p.name) a.w++;
      return a;
    }, { w: 0, g: 0 });
  }

  async function addDeck() {
    if (!newDeck.name.trim()) { showToast('Enter a deck name'); return; }
    const deck = await api.addDeck({ ...newDeck, name: newDeck.name.trim() });
    decks.update(ds => [...ds, deck]);
    newDeck = { name: '', owner: '', fmt: 'cmd', colors: [] };
    showAdd = false;
    showToast('Deck added!');
  }

  async function registerDeck(name) {
    const deck = await api.addDeck({ name, owner: '', fmt: 'cmd', colors: [] });
    decks.update(ds => [...ds, deck]);
    showToast(`${name} registered!`);
  }

  // Edit state per deck
  let editForms = {};
  function startEdit(d) {
    editForms[d.id] = { ...d, colors: [...d.colors] };
    editingId = d.id;
  }
  function toggleEditColor(id, c) {
    const f = editForms[id];
    f.colors = f.colors.includes(c) ? f.colors.filter(x => x !== c) : [...f.colors, c];
    editForms = { ...editForms };
  }
  async function saveEdit(id) {
    const updated = await api.updateDeck(editForms[id]);
    decks.update(ds => ds.map(d => d.id === updated.id ? updated : d));
    editingId = null;
    showToast('Deck updated!');
  }
  async function deleteDeck(id) {
    if (!confirm('Remove this deck?')) return;
    await api.deleteDeck(id);
    decks.update(ds => ds.filter(d => d.id !== id));
    showToast('Deck removed');
  }
</script>

<div class="fade-in">
  <!-- Add deck -->
  <div class="card">
    <div class="add-header">
      <div class="sec-title" style="margin:0">Add Deck Manually</div>
      <button class="btn btn-ghost btn-sm" on:click={() => showAdd = !showAdd}>
        {showAdd ? 'Cancel' : '+ Add Deck'}
      </button>
    </div>

    {#if showAdd}
      <div class="add-form fade-in">
        <div class="fr2 fg">
          <div>
            <label class="lbl">Deck Name</label>
            <input bind:value={newDeck.name} placeholder="e.g. Atraxa Counters" />
          </div>
          <div>
            <label class="lbl">Owner</label>
            <input bind:value={newDeck.owner} placeholder="Your name" />
          </div>
        </div>
        <div class="fg">
          <label class="lbl">Format</label>
          <select bind:value={newDeck.fmt} style="width:auto">
            <option value="pau">Pauper</option>
            <option value="cmd">Commander / EDH</option>
            <option value="both">Both</option>
          </select>
        </div>
        <div class="fg">
          <label class="lbl">Colors</label>
          <div class="color-checks">
            {#each COLOR_META as {v, label}}
              <label class="color-check">
                <input type="checkbox" checked={newDeck.colors.includes(v)} on:change={() => toggleNewColor(v)} />
                <span class="cpip c{v}">{v}</span> {label}
              </label>
            {/each}
          </div>
        </div>
        <button class="btn btn-gold" on:click={addDeck}>Add Deck</button>
      </div>
    {/if}
  </div>

  <!-- Unregistered decks from games -->
  {#if implicitNames.length}
    <div class="sec-title">From Games — Not Yet Registered</div>
    {#each implicitNames as name}
      {@const st = deckStats(name)}
      <div class="deck-card implicit">
        <div>
          <div class="dc-name">{name}</div>
          <div class="dc-rec">{st.g ? `${st.w}W–${st.g - st.w}L` : 'No wins'}</div>
        </div>
        <button class="btn btn-ghost btn-sm" on:click={() => registerDeck(name)}>Register</button>
      </div>
    {/each}
  {/if}

  <!-- Registered decks -->
  <div class="sec-title" style="margin-top:{implicitNames.length ? '1.5rem' : '0'}">Deck Collection</div>

  {#if !$decks.length}
    <div class="empty"><span class="empty-icon">🃏</span>No decks registered yet.</div>
  {:else}
    {#each $decks as d (d.id)}
      {@const st = deckStats(d.name)}
      <div class="deck-card">
        <div class="dc-header">
          <div>
            <div class="dc-name">{d.name}</div>
            {#if d.owner}<div class="dc-owner">{d.owner}</div>{/if}
            <div style="margin-top:.28rem">
              {#if d.fmt === 'cmd'}<span class="fb fb-cmd">Commander</span>
              {:else if d.fmt === 'pau'}<span class="fb fb-pau">Pauper</span>
              {:else}<span class="fb fb-both">Both</span>{/if}
            </div>
            <div class="cpips">
              {#each d.colors as c}<div class="cpip c{c}">{c}</div>{/each}
            </div>
          </div>
          <div class="dc-right">
            <div class="dc-rec">{st.g ? `${st.w}W–${st.g - st.w}L` : 'No games'}</div>
            <div class="dc-actions">
              <button class="btn btn-ghost btn-sm" on:click={() => editingId === d.id ? editingId = null : startEdit(d)}>
                {editingId === d.id ? 'Cancel' : 'Edit'}
              </button>
              <button class="btn btn-danger btn-sm" on:click={() => deleteDeck(d.id)}>Remove</button>
            </div>
          </div>
        </div>

        {#if editingId === d.id && editForms[d.id]}
          <div class="edit-form fade-in">
            <div class="fr2 fg">
              <div>
                <label class="lbl">Owner</label>
                <input bind:value={editForms[d.id].owner} placeholder="Owner name" />
              </div>
              <div>
                <label class="lbl">Format</label>
                <select bind:value={editForms[d.id].fmt}>
                  <option value="cmd">Commander / EDH</option>
                  <option value="pau">Pauper</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>
            <div class="fg">
              <label class="lbl">Colors</label>
              <div class="color-checks">
                {#each COLOR_META as {v, label}}
                  <label class="color-check">
                    <input type="checkbox"
                      checked={editForms[d.id].colors.includes(v)}
                      on:change={() => toggleEditColor(d.id, v)} />
                    <span class="cpip c{v}">{v}</span> {label}
                  </label>
                {/each}
              </div>
            </div>
            <div class="edit-actions">
              <button class="btn btn-ghost btn-sm" on:click={() => editingId = null}>Cancel</button>
              <button class="btn btn-gold btn-sm" on:click={() => saveEdit(d.id)}>Save</button>
            </div>
          </div>
        {/if}
      </div>
    {/each}
  {/if}
</div>

<style>
  .add-header { display: flex; justify-content: space-between; align-items: center; }
  .add-form { margin-top: 1rem; }

  .deck-card {
    background: var(--s1); border: 1px solid var(--border); border-radius: 7px;
    padding: .95rem 1.25rem; margin-bottom: .6rem; transition: border-color .2s;
  }
  .deck-card:hover { border-color: var(--border-h); }
  .deck-card.implicit { display: flex; justify-content: space-between; align-items: center; }
  .dc-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
  .dc-name { font-family: 'Cinzel', serif; font-size: .88rem; color: var(--gold); }
  .dc-owner { font-size: .8rem; color: var(--muted); font-style: italic; margin-top: .1rem; }
  .dc-rec { font-family: 'Cinzel', serif; font-size: .75rem; color: var(--muted); }
  .dc-right { text-align: right; }
  .dc-actions { display: flex; gap: .4rem; margin-top: .4rem; justify-content: flex-end; }
  .fb-both { color: var(--muted); border-color: var(--border); background: transparent; }

  .edit-form {
    margin-top: .85rem; padding-top: .85rem; border-top: 1px solid var(--border);
  }
  .edit-actions { display: flex; gap: .5rem; justify-content: flex-end; }

  .color-checks { display: flex; gap: .6rem; flex-wrap: wrap; align-items: center; }
  .color-check {
    display: flex; align-items: center; gap: .25rem;
    font-size: .88rem; cursor: pointer; color: var(--text);
    font-family: 'EB Garamond', serif;
  }
  .color-check input { width: auto; }
</style>
