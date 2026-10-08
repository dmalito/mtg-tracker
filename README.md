# MTG Tracker

Games, ratings and matchups for our playgroup: Pauper 1v1s (single games or
Bo3/Bo5 matches) and Commander pods of up to eight.

Flask + SQLite, one container on port **5001**, also at
`http://home-server/mtg-tracker/` through Apache.

## Pages

- **Standings**: player and deck ratings for each format, plus the most recent games.
- **Log game**: pick known players with one tap, choose a deck for each (new
  decks are created on the fly), then tap the winner. In a pod, tap players
  in the order they finished, winner first. For a match, enter games won.
  "Rematch" copies the players and decks from the last game.
- **History**: every game with each player's rating change; filter by format,
  player or deck; edit or delete any game.
- **Players**: each player's rating chart, record, the decks they've played
  and their head-to-head against everyone.
- **Decks**: art for each deck (from the commander or key card, via Scryfall),
  its rating chart, matchups against other decks, and who has piloted it.
- **Matchups**: player-vs-player and deck-vs-deck grids.

## Ratings

- Elo starts at 1200, with ratings kept separately for each format and
  separately for players and decks.
- Each game is scored as a set of pairwise results: finishing ahead of
  someone counts as a win against them, finishing level as a draw.
- Each pair moves `32 / (players − 1)` points, so a 1v1 is plain Elo with
  K = 32 and every game is zero-sum.
- Seats without a deck recorded are left out of deck ratings.
- Changing or deleting any game replays the whole history in date order, so
  ratings are always consistent.

## Run

```bash
docker compose up -d --build
```

- The database (`data/tracker.db`) and downloaded card art (`data/art/`)
  live in `data/`, which is bind-mounted, so rebuilds keep them.
- On first start, if there's no `tracker.db` yet, the container imports the
  old Svelte-era `data/mtg.db` automatically. The old file is left untouched
  as a backup.
- Health check: `http://localhost:5001/api/health`.

## Develop

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt -r requirements-dev.txt
DATA_DIR=/tmp/mtg-dev .venv/bin/python app.py   # http://localhost:5001
.venv/bin/pytest
```

## Code

- `tracker/` is a self-contained Flask blueprint with its own templates,
  static files and database location. `app.py` only hosts it.
- That makes moving it into gioco-immaginazione mostly a matter of copying
  the package and calling `register_blueprint(tracker.bp, url_prefix=...)`.
- All writes are gated by `tracker.can_edit()`, which currently returns True.
- Code layout:
  - `tracker/elo.py`: the rating engine.
  - `tracker/stats.py`: leaderboards, head-to-head and the SVG charts.
  - `tracker/db.py`: the schema and validation.
- `tools/import_legacy.py` does the one-off import from the old database.
