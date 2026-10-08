// Log / edit a game. The page ships its data as JSON (#log-data); this
// renders the seats and the result picker and posts the game as JSON.
(function () {
  const DATA = JSON.parse(document.getElementById("log-data").textContent);
  const form = document.getElementById("log-form");
  const seatsEl = document.getElementById("seats");
  const quickEl = document.getElementById("quick-players");
  const resultEl = document.getElementById("result");
  const hintEl = document.getElementById("result-hint");
  const drawEl = document.getElementById("draw");
  const drawWrap = document.getElementById("draw-wrap");
  const errorEl = document.getElementById("form-error");
  const MAX_SEATS = 8;
  const ORD = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];

  const blankSeat = () => ({ player: "", deck: "", rank: null, score: 0 });
  const today = () => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  };

  // rank: the tapped finishing position (1 = winner), null = not ranked.
  // Unranked seats share last place when saved.
  let state;

  function fromGame(g) {
    const counts = {};
    g.seats.forEach(s => { counts[s.placement] = (counts[s.placement] || 0) + 1; });
    const draw = g.mode === "bo1" && g.seats.every(s => s.placement === 1);
    return {
      fmt: g.fmt, mode: g.mode, date: g.date, notes: g.notes, draw,
      seats: g.seats.map(s => ({
        player: s.player, deck: s.deck,
        rank: draw || (counts[s.placement] > 1 && s.placement !== 1) ? null : s.placement,
        score: s.score || 0,
      })),
    };
  }

  if (DATA.game) {
    state = fromGame(DATA.game);
  } else {
    const fmt = DATA.last ? DATA.last.fmt : "pau";
    state = { fmt, mode: DATA.last ? DATA.last.mode : "bo1", date: today(), notes: "",
              draw: false, seats: [blankSeat(), blankSeat()] };
  }

  // ── helpers ──────────────────────────────────────────────────────────────
  const named = () => state.seats.filter(s => s.player.trim());
  const norm = s => s.trim().toLowerCase();

  function decksFor(player) {
    const p = norm(player);
    return DATA.decks
      .filter(d => !d.archived && (d.fmt === state.fmt || d.fmt === "both"))
      .sort((a, b) => (norm(b.owner || "") === p) - (norm(a.owner || "") === p)
                      || a.name.localeCompare(b.name));
  }

  function findDeck(name) {
    const n = norm(name || "");
    return n ? DATA.decks.find(d => norm(d.name) === n) : null;
  }

  function pips(colors) {
    return h("span", { class: "pips sm" }, (colors || []).map(c => h("i", { class: "pip pip-" + c })));
  }

  // ── rendering ────────────────────────────────────────────────────────────
  function renderMeta() {
    form.querySelectorAll('input[name="fmt"]').forEach(i => { i.checked = i.value === state.fmt; });
    form.querySelectorAll('input[name="mode"]').forEach(i => { i.checked = i.value === state.mode; });
    form.date.value = state.date;
    form.notes.value = state.notes;
    drawEl.checked = state.draw;
  }

  function renderQuick() {
    const seated = new Set(state.seats.map(s => norm(s.player)));
    const free = DATA.players.filter(p => !seated.has(norm(p)));
    quickEl.replaceChildren(...free.map(name =>
      h("button", { type: "button", class: "chip", onclick: () => addPlayer(name) }, "+ " + name)));
    quickEl.hidden = !free.length;
  }

  function renderSeats() {
    seatsEl.replaceChildren(...state.seats.map((seat, i) => {
      const deck = findDeck(seat.deck);
      const own = seat.player.trim()
        ? decksFor(seat.player).filter(d => norm(d.owner || "") === norm(seat.player)).slice(0, 6)
        : [];
      const listId = "decks-" + i;
      const isNew = seat.deck.trim() && !deck;
      return h("li", { class: "seat-row" },
        h("div", { class: "seat-fields" },
          h("label", { class: "field" },
            h("span", { class: "field-label" }, "Player " + (i + 1)),
            h("input", {
              value: seat.player, list: "player-list", autocomplete: "off", maxlength: 60,
              placeholder: "Name", "aria-label": "Player " + (i + 1),
              oninput: e => { seat.player = e.target.value; renderQuick(); renderResult(); },
              onchange: () => renderSeats(),
            })),
          h("label", { class: "field" },
            h("span", { class: "field-label" }, "Deck"),
            h("span", { class: "deck-input" },
              deck && deck.art ? h("img", { class: "deck-thumb", src: deck.art, alt: "" }) : (deck ? pips(deck.colors) : null),
              h("input", {
                value: seat.deck, list: listId, autocomplete: "off", maxlength: 80,
                placeholder: "Optional", "aria-label": "Deck for player " + (i + 1),
                onchange: e => { seat.deck = e.target.value; renderSeats(); },
                oninput: e => { seat.deck = e.target.value; },
              })),
            h("datalist", { id: listId }, decksFor(seat.player).map(d =>
              h("option", { value: d.name }, d.owner ? d.owner : ""))),
            isNew ? h("span", { class: "field-hint" }, "New deck — it'll be created.") : null),
        ),
        own.length && !deck ? h("div", { class: "deck-chips" }, own.map(d =>
          h("button", { type: "button", class: "chip chip-deck",
                        onclick: () => { seat.deck = d.name; renderSeats(); } },
            pips(d.colors), d.name))) : null,
        state.seats.length > 2 ? h("button", {
          type: "button", class: "icon-btn seat-remove", "aria-label": "Remove player " + (i + 1),
          onclick: () => { state.seats.splice(i, 1); renderAll(); },
        }, "×") : null,
      );
    }));
    document.getElementById("add-seat").hidden = state.seats.length >= MAX_SEATS;
    renderResult();
  }

  function renderResult() {
    const seats = named();
    drawWrap.hidden = state.mode !== "bo1";
    if (seats.length < 2) {
      hintEl.textContent = "Add at least two players.";
      resultEl.replaceChildren();
      return;
    }
    if (state.mode === "bon") {
      hintEl.textContent = "How many games did each player win?";
      resultEl.replaceChildren(h("div", { class: "score-list" }, seats.map(seat =>
        h("div", { class: "score-row" },
          h("span", { class: "score-name" }, seat.player),
          h("span", { class: "stepper" },
            h("button", { type: "button", class: "icon-btn", "aria-label": "One fewer for " + seat.player,
                          onclick: () => { seat.score = Math.max(0, seat.score - 1); renderResult(); } }, "−"),
            h("output", {}, seat.score),
            h("button", { type: "button", class: "icon-btn", "aria-label": "One more for " + seat.player,
                          onclick: () => { seat.score = Math.min(99, seat.score + 1); renderResult(); } }, "+"))))));
      return;
    }
    if (state.draw) {
      hintEl.textContent = "Nobody won: everyone shares first place.";
      resultEl.replaceChildren();
      return;
    }
    hintEl.textContent = seats.length === 2
      ? "Tap the winner."
      : "Tap players in finishing order, winner first. Anyone you don't tap shares last place.";
    resultEl.replaceChildren(h("div", { class: "rank-grid" }, seats.map(seat =>
      h("button", {
        type: "button", class: "rank-btn" + (seat.rank === 1 ? " is-winner" : seat.rank ? " is-ranked" : ""),
        "aria-pressed": seat.rank ? "true" : "false",
        onclick: () => tapRank(seat),
      },
        h("span", { class: "rank-badge" }, seat.rank ? (seat.rank === 1 ? "Winner" : ORD[seat.rank - 1]) : ""),
        h("span", { class: "rank-name" }, seat.player),
        seat.deck ? h("span", { class: "rank-deck" }, seat.deck) : null))));
  }

  function renderAll() {
    renderMeta();
    renderQuick();
    renderSeats();
  }

  // ── actions ──────────────────────────────────────────────────────────────
  function tapRank(seat) {
    const seats = named();
    if (seat.rank) {
      const was = seat.rank;
      seat.rank = null;
      seats.forEach(s => { if (s.rank && s.rank > was) s.rank -= 1; });
    } else {
      if (seats.length === 2) seats.forEach(s => { s.rank = null; });
      seat.rank = 1 + Math.max(0, ...seats.map(s => s.rank || 0));
    }
    renderResult();
  }

  function addPlayer(name) {
    let seat = state.seats.find(s => !s.player.trim());
    if (!seat) {
      if (state.seats.length >= MAX_SEATS) return;
      seat = blankSeat();
      state.seats.push(seat);
    }
    seat.player = name;
    // Pre-fill the deck when the player has exactly one deck for this format.
    const own = decksFor(name).filter(d => norm(d.owner || "") === norm(name));
    if (!seat.deck && own.length === 1) seat.deck = own[0].name;
    renderQuick();
    renderSeats();
  }

  form.addEventListener("change", e => {
    if (e.target.name === "fmt") { state.fmt = e.target.value; if (state.fmt === "cmd") state.mode = "bo1"; renderAll(); }
    if (e.target.name === "mode") { state.mode = e.target.value; renderResult(); }
    if (e.target === drawEl) { state.draw = drawEl.checked; renderResult(); }
  });
  form.date.addEventListener("change", () => { state.date = form.date.value; });
  form.notes.addEventListener("input", () => { state.notes = form.notes.value; });

  document.getElementById("add-seat").addEventListener("click", () => {
    if (state.seats.length < MAX_SEATS) { state.seats.push(blankSeat()); renderSeats(); }
  });

  const rematch = document.getElementById("rematch");
  if (rematch) rematch.addEventListener("click", () => {
    state.fmt = DATA.last.fmt;
    state.mode = DATA.last.mode;
    state.draw = false;
    state.seats = DATA.last.seats.map(s => ({ ...blankSeat(), player: s.player, deck: s.deck }));
    renderAll();
    toast("Same players and decks as last time");
  });

  function payload() {
    const seats = named();
    let placements;
    if (state.mode === "bo1") {
      if (state.draw) placements = seats.map(() => 1);
      else {
        const last = 1 + Math.max(0, ...seats.map(s => s.rank || 0));
        placements = seats.map(s => s.rank || last);
      }
    }
    return {
      date: state.date, fmt: state.fmt, mode: state.mode, notes: state.notes,
      seats: seats.map((s, i) => ({
        player: s.player.trim(), deck: s.deck.trim(),
        placement: placements ? placements[i] : null,
        score: state.mode === "bon" ? s.score : null,
      })),
    };
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    errorEl.hidden = true;
    const body = payload();
    if (state.mode === "bo1" && !state.draw && body.seats.length >= 2 && !named().some(s => s.rank === 1)) {
      errorEl.textContent = "Tap the winner, or tick “It was a draw”.";
      errorEl.hidden = false;
      return;
    }
    const btn = document.getElementById("save");
    btn.disabled = true;
    try {
      const res = DATA.game
        ? await api("PUT", "api/games/" + DATA.game.id, body)
        : await api("POST", "api/games", body);
      location.href = res.url;
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
      btn.disabled = false;
    }
  });

  const del = document.getElementById("delete");
  if (del) del.addEventListener("click", async () => {
    if (!confirm("Delete this game? Ratings after it will be recalculated.")) return;
    try {
      await api("DELETE", "api/games/" + DATA.game.id);
      location.href = APP_ROOT + "history";
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    }
  });

  document.body.append(h("datalist", { id: "player-list" }, DATA.players.map(p => h("option", { value: p }))));
  renderAll();
})();
