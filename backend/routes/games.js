const express = require('express');
const router = express.Router();
const db = require('../db');

// ── ELO engine ────────────────────────────────────────────────────────────────
const K = 32;
const expected = (ra, rb) => 1 / (1 + Math.pow(10, (rb - ra) / 400));

function recomputeAllElo(games) {
  const players = {};
  const ep = (n) => { if (!players[n]) players[n] = { elo: 1200, wins: 0, losses: 0 }; };

  [...games].reverse().forEach((g) => {
    const ps = JSON.parse(g.players);
    ps.forEach((p) => ep(p.name));

    if (!g.winner) {
      // draw — adjust ELO for all players, no wins/losses
      const names = ps.map(p => p.name);
      const delta = computeEloDelta(null, null, players, true, names);
      Object.entries(delta).forEach(([n, d]) => { ep(n); players[n].elo += d; });
      return;
    }

    const losers = ps.map((p) => p.name).filter((n) => n !== g.winner);
    ep(g.winner);
    losers.forEach((l) => {
      ep(l);
      const rw = players[g.winner].elo, rl = players[l].elo;
      const dw = Math.round(K * (1 - expected(rw, rl)));
      const dl = Math.round(K * (0 - expected(rl, rw)));
      players[g.winner].elo += dw;
      players[l].elo += dl;
    });
    players[g.winner].wins++;
    losers.forEach((l) => players[l].losses++);
  });

  return players;
}

function computeEloDelta(winner, losers, currentPlayers, isDraw, allPlayers) {
  if (isDraw) {
    const delta = {};
    allPlayers.forEach(name => {
      const others = allPlayers.filter(n => n !== name);
      let d = 0;
      others.forEach(other => {
        const rp = currentPlayers[name]?.elo ?? 1200;
        const ro = currentPlayers[other]?.elo ?? 1200;
        d += Math.round(K * (0.5 - expected(rp, ro)));
      });
      delta[name] = d;
    });
    return delta;
  }
  const delta = { [winner]: 0 };
  losers.forEach((l) => {
    const rw = currentPlayers[winner]?.elo ?? 1200;
    const rl = currentPlayers[l]?.elo ?? 1200;
    const dw = Math.round(K * (1 - expected(rw, rl)));
    const dl = Math.round(K * (0 - expected(rl, rw)));
    delta[winner] = (delta[winner] || 0) + dw;
    delta[l] = dl;
  });
  return delta;
}

function parseGame(g) {
  return {
    ...g,
    players:  JSON.parse(g.players),
    scores:   g.scores ? JSON.parse(g.scores) : null,
    eloDelta: JSON.parse(g.elo_delta || '{}'),
  };
}

// ── GET /api/games ────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  db.all('SELECT * FROM games ORDER BY date DESC, created_at DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows.map(parseGame));
  });
});

// ── POST /api/games ───────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { date, fmt, mode, winner, notes, players, scores, draw } = req.body;
  if (!players?.length) return res.status(400).json({ error: 'Players required' });

  db.all('SELECT * FROM games ORDER BY created_at ASC', (err, allGames) => {
    if (err) return res.status(500).json({ error: 'Database error' });

    const currentPlayers = recomputeAllElo(allGames);
    const playerNames = players.map(p => p.name);
    playerNames.forEach(n => { if (!currentPlayers[n]) currentPlayers[n] = { elo: 1200, wins: 0, losses: 0 }; });

    let eloDelta = {};
    if (draw) {
      eloDelta = computeEloDelta(null, null, currentPlayers, true, playerNames);
    } else if (winner) {
      const losers = playerNames.filter(n => n !== winner);
      eloDelta = computeEloDelta(winner, losers, currentPlayers, false, playerNames);
    }

    const sql = `INSERT INTO games (date, fmt, mode, winner, notes, players, scores, elo_delta)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    db.run(sql, [
      date, fmt, mode || 'bo1', draw ? '' : (winner || ''), notes || '',
      JSON.stringify(players),
      scores ? JSON.stringify(scores) : null,
      JSON.stringify(eloDelta),
    ], function (err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      db.get('SELECT * FROM games WHERE id = ?', [this.lastID], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(parseGame(row));
      });
    });
  });
});

// ── PUT /api/games/:id ───────────────────────────────────────────────────────
router.put('/:id', (req, res) => {
  const { date, fmt, mode, winner, notes, players, scores, draw } = req.body;
  if (!players?.length) return res.status(400).json({ error: 'Players required' });

  db.all('SELECT * FROM games ORDER BY created_at ASC', (err, allGames) => {
    if (err) return res.status(500).json({ error: 'Database error' });

    const hasScores = scores && Object.values(scores).some(v => v !== '' && v !== undefined && v !== null);
    const derivedWinner = draw
      ? ''
      : hasScores
        ? players
            .filter(p => scores[p.name] !== '' && scores[p.name] !== undefined)
            .sort((a, b) => Number(scores[b.name]) - Number(scores[a.name]))[0]?.name ?? winner ?? ''
        : winner ?? '';

    const sql = `UPDATE games SET date=?, fmt=?, mode=?, winner=?, notes=?, players=?, scores=? WHERE id=?`;
    db.run(sql, [
      date, fmt, mode || 'bo1', derivedWinner, notes || '',
      JSON.stringify(players),
      hasScores ? JSON.stringify(scores) : null,
      req.params.id,
    ], (err) => {
      if (err) { console.error(err); return res.status(500).json({ error: err.message }); }

      // Recompute all ELO deltas from scratch
      db.all('SELECT * FROM games ORDER BY created_at ASC', (err, remaining) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        const playerMap = {};
        const ep = (n) => { if (!playerMap[n]) playerMap[n] = { elo: 1200, wins: 0, losses: 0 }; };

        remaining.forEach((g) => {
          const ps = JSON.parse(g.players);
          ps.forEach((p) => ep(p.name));
          if (!g.winner) {
            const names = ps.map(p => p.name);
            const delta = computeEloDelta(null, null, playerMap, true, names);
            db.run('UPDATE games SET elo_delta = ? WHERE id = ?', [JSON.stringify(delta), g.id]);
            Object.entries(delta).forEach(([n, d]) => { ep(n); playerMap[n].elo += d; });
            return;
          }
          const losers = ps.map((p) => p.name).filter((n) => n !== g.winner);
          ep(g.winner);
          losers.forEach((l) => ep(l));
          const delta = computeEloDelta(g.winner, losers, playerMap, false, ps.map(p => p.name));
          db.run('UPDATE games SET elo_delta = ? WHERE id = ?', [JSON.stringify(delta), g.id]);
          playerMap[g.winner].wins++;
          losers.forEach((l) => playerMap[l].losses++);
          Object.entries(delta).forEach(([n, d]) => { ep(n); playerMap[n].elo += d; });
        });

        db.get('SELECT * FROM games WHERE id = ?', [req.params.id], (err, row) => {
          if (err || !row) return res.status(500).json({ error: 'Database error' });
          res.json(parseGame(row));
        });
      });
    });
  });
});


router.delete('/:id', (req, res) => {
  db.run('DELETE FROM games WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'Database error' });

    // Recompute ELO deltas for all remaining games
    db.all('SELECT * FROM games ORDER BY created_at ASC', (err, remaining) => {
      if (err) return res.json({ ok: true }); // non-fatal

      const players = {};
      const ep = (n) => { if (!players[n]) players[n] = { elo: 1200, wins: 0, losses: 0 }; };

      remaining.forEach((g) => {
        const ps = JSON.parse(g.players);
        ps.forEach((p) => ep(p.name));
        if (!g.winner) {
          const names = ps.map(p => p.name);
          const delta = computeEloDelta(null, null, players, true, names);
          db.run('UPDATE games SET elo_delta = ? WHERE id = ?', [JSON.stringify(delta), g.id]);
          Object.entries(delta).forEach(([n, d]) => { ep(n); players[n].elo += d; });
          return;
        }
        const losers = ps.map((p) => p.name).filter((n) => n !== g.winner);
        ep(g.winner);
        losers.forEach((l) => ep(l));
        const delta = computeEloDelta(g.winner, losers, players, false, ps.map(p => p.name));
        db.run('UPDATE games SET elo_delta = ? WHERE id = ?', [JSON.stringify(delta), g.id]);

        players[g.winner].wins++;
        losers.forEach((l) => players[l].losses++);
        Object.entries(delta).forEach(([n, d]) => { ep(n); players[n].elo += d; });
      });

      res.json({ ok: true });
    });
  });
});

module.exports = router;
