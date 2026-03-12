const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'mtg.db'), (err) => {
  if (err) {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
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
