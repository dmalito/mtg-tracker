const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? false                        // Apache serves frontend, no CORS needed
    : 'http://localhost:5173',     // Vite dev server
}));
app.use(express.json());

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use('/api/games',   require('./routes/games'));
app.use('/api/decks',   require('./routes/decks'));
app.use('/api/players', require('./routes/players'));

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`MTG Tracker backend running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
