const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// DATA_DIR lets the database live outside the app code, on a mounted
// volume, so it survives container rebuilds/redeploys.
const dataDir = process.env.DATA_DIR || __dirname;
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'mtg.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  }
  console.log(`Connected to SQLite database at ${dbPath}`);
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS decks (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      owner      TEXT DEFAULT '',
      fmt        TEXT DEFAULT 'cmd',
      colors     TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS games (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      date       TEXT NOT NULL,
      fmt        TEXT NOT NULL,
      mode       TEXT NOT NULL DEFAULT 'bo1',
      winner     TEXT DEFAULT '',
      notes      TEXT DEFAULT '',
      players    TEXT NOT NULL,
      scores     TEXT DEFAULT NULL,
      elo_delta  TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
});

module.exports = db;
