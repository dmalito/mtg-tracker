# MTG Tracker

Track Commander and Pauper games with ELO ratings, deck management, and game history.

## Structure

```
mtg-tracker/
├── backend/
│   ├── db.js           # SQLite connection + schema
│   ├── server.js       # Express app
│   ├── routes/
│   │   ├── games.js    # Game CRUD + ELO computation
│   │   ├── decks.js    # Deck CRUD
│   │   └── players.js  # ELO leaderboard (derived from games)
│   ├── package.json
│   └── mtg.db          # Created automatically on first run
├── frontend/
│   ├── src/
│   │   ├── App.svelte
│   │   ├── lib/
│   │   │   ├── api.js      # API client
│   │   │   ├── stores.js   # Svelte stores
│   │   │   └── elo.js      # Shared helpers
│   │   └── routes/
│   │       ├── LogGame.svelte
│   │       ├── History.svelte
│   │       ├── Stats.svelte
│   │       └── Decks.svelte
│   ├── .env
│   └── package.json
├── dev.sh
└── deploy.sh
```

## Development

```bash
# Install dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Run both servers
chmod +x dev.sh
./dev.sh
```

## Deploy

```bash
chmod +x deploy.sh
./deploy.sh
```

The backend runs on port `3001` via pm2. The frontend is served by Apache from `/var/www/apps/mtg-tracker`.
