const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// The whole app (API + static frontend) lives under this path, matching
// the Apache ProxyPass mount point and the Vite `base` used at build time.
const BASE_PATH = '/mtg-tracker';

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? false                        // Apache/this same server serves the frontend, no CORS needed
    : 'http://localhost:5173',     // Vite dev server
}));
app.use(express.json());

// ── API routes ────────────────────────────────────────────────────────────────
app.use(`${BASE_PATH}/api/games`,   require('./routes/games'));
app.use(`${BASE_PATH}/api/decks`,   require('./routes/decks'));
app.use(`${BASE_PATH}/api/players`, require('./routes/players'));

// Health check
app.get(`${BASE_PATH}/api/health`, (req, res) => res.json({ ok: true }));

// ── Static frontend (built by `npm run build` in frontend) ───────────────
const staticDir = path.join(__dirname, 'public');
app.use(BASE_PATH, express.static(staticDir));

// Convenience redirects so both '/' and the bare base path land on the app
app.get('/', (req, res) => res.redirect(`${BASE_PATH}/`));
app.get(BASE_PATH, (req, res) => res.redirect(`${BASE_PATH}/`));

// SPA fallback: any other GET under BASE_PATH that isn't a static file or
// an API route serves index.html (harmless even though the app currently
// has no client-side URL routing — keeps direct links/bookmarks working).
app.get(`${BASE_PATH}/*`, (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`MTG Tracker running on http://localhost:${PORT}${BASE_PATH}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
