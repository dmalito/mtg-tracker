const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? false                        // Apache/this same server serves the frontend, no CORS needed
    : 'http://localhost:5173',     // Vite dev server
}));
app.use(express.json());

// ── API routes ────────────────────────────────────────────────────────────────
// Mounted at the root. The frontend uses relative URLs throughout, so the
// same build works directly on this port and behind Apache at /mtg-tracker/
// (which strips the prefix before proxying).
app.use('/api/games',   require('./routes/games'));
app.use('/api/decks',   require('./routes/decks'));
app.use('/api/players', require('./routes/players'));

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// ── Static frontend (built by `npm run build` in frontend) ───────────────
const staticDir = path.join(__dirname, 'public');
app.use(express.static(staticDir));

// The app used to live under /mtg-tracker/ on this port; send old bookmarks
// to the root. Relative, so it also lands right behind the Apache prefix.
app.get(['/mtg-tracker', '/mtg-tracker/*'], (req, res) => res.redirect('../'));

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`MTG Tracker running on http://localhost:${PORT}/`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
