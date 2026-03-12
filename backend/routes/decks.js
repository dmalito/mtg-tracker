const express = require('express');
const router = express.Router();
const db = require('../db');

function parseDeck(d) {
  return { ...d, colors: JSON.parse(d.colors || '[]') };
}

// ── GET /api/decks ────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  db.all('SELECT * FROM decks ORDER BY name ASC', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows.map(parseDeck));
  });
});

// ── POST /api/decks ───────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { name, owner = '', fmt = 'cmd', colors = [] } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' });

  db.run(
    'INSERT INTO decks (name, owner, fmt, colors) VALUES (?, ?, ?, ?)',
    [name.trim(), owner, fmt, JSON.stringify(colors)],
    function (err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      db.get('SELECT * FROM decks WHERE id = ?', [this.lastID], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(parseDeck(row));
      });
    }
  );
});

// ── PUT /api/decks/:id ────────────────────────────────────────────────────────
router.put('/:id', (req, res) => {
  const { name, owner, fmt, colors } = req.body;
  db.run(
    'UPDATE decks SET name = ?, owner = ?, fmt = ?, colors = ? WHERE id = ?',
    [name, owner, fmt, JSON.stringify(colors), req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      db.get('SELECT * FROM decks WHERE id = ?', [req.params.id], (err, row) => {
        if (!row) return res.status(404).json({ error: 'Not found' });
        res.json(parseDeck(row));
      });
    }
  );
});

// ── DELETE /api/decks/:id ─────────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM decks WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ ok: true });
  });
});

module.exports = router;
