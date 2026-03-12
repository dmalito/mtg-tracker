const express = require('express');
const router = express.Router();
const db = require('../db');

const K = 32;
const expected = (ra, rb) => 1 / (1 + Math.pow(10, (rb - ra) / 400));

// ── GET /api/players ──────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  db.all('SELECT * FROM games ORDER BY created_at ASC', (err, games) => {
    if (err) return res.status(500).json({ error: 'Database error' });

    const players = {};
    const ep = (n) => { if (!players[n]) players[n] = { elo: 1200, wins: 0, losses: 0 }; };

    games.forEach((g) => {
      const ps = JSON.parse(g.players);
      ps.forEach((p) => ep(p.name));
      if (!g.winner) return;

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

    res.json(players);
  });
});

module.exports = router;
