"""SQLite storage: schema, and the reads/writes the pages need.

Ratings are never edited directly. Every write to a game ends with
recompute(), which replays all games in order and rewrites the before/after
columns on every seat, so editing an old game corrects everything after it.
"""
import json
import sqlite3
from datetime import datetime, timezone

from . import elo

FORMATS = {"pau": "Pauper", "cmd": "Commander"}
DECK_FORMATS = {**FORMATS, "both": "Both"}
MODES = {"bo1": "Best of 1", "bon": "Best of N"}
COLORS = ("W", "U", "B", "R", "G", "C")

SCHEMA = """
CREATE TABLE IF NOT EXISTS players (
    id         INTEGER PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE COLLATE NOCASE,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS decks (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    owner_id    INTEGER REFERENCES players(id) ON DELETE SET NULL,
    fmt         TEXT NOT NULL DEFAULT 'pau',
    colors      TEXT NOT NULL DEFAULT '[]',
    key_card    TEXT NOT NULL DEFAULT '',
    scryfall_id TEXT,
    art_file    TEXT,
    art_artist  TEXT,
    archived    INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS games (
    id         INTEGER PRIMARY KEY,
    date       TEXT NOT NULL,
    fmt        TEXT NOT NULL,
    mode       TEXT NOT NULL DEFAULT 'bo1',
    notes      TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS seats (
    id              INTEGER PRIMARY KEY,
    game_id         INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_id       INTEGER NOT NULL REFERENCES players(id),
    deck_id         INTEGER REFERENCES decks(id) ON DELETE SET NULL,
    placement       INTEGER NOT NULL,
    score           INTEGER,
    elo_before      REAL,
    elo_after       REAL,
    deck_elo_before REAL,
    deck_elo_after  REAL,
    UNIQUE (game_id, player_id)
);
CREATE INDEX IF NOT EXISTS seats_player ON seats(player_id);
CREATE INDEX IF NOT EXISTS seats_deck ON seats(deck_id);
"""


class Invalid(Exception):
    """User input that can't be saved; the message is shown to the user."""


def now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def connect(path):
    conn = sqlite3.connect(path, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(SCHEMA)
    return conn


# ── players ─────────────────────────────────────────────────────────────────

def player_id(conn, name, create=True):
    name = " ".join((name or "").split())
    if not name:
        raise Invalid("Every seat needs a player name.")
    if len(name) > 60:
        raise Invalid("That player name is too long.")
    row = conn.execute("SELECT id FROM players WHERE name = ?", (name,)).fetchone()
    if row:
        return row["id"]
    if not create:
        return None
    return conn.execute("INSERT INTO players (name, created_at) VALUES (?, ?)",
                        (name, now())).lastrowid


def players(conn):
    return conn.execute("SELECT * FROM players ORDER BY name").fetchall()


def get_player(conn, pid):
    return conn.execute("SELECT * FROM players WHERE id = ?", (pid,)).fetchone()


def rename_player(conn, pid, name):
    name = " ".join((name or "").split())
    if not name:
        raise Invalid("The name can't be empty.")
    clash = conn.execute("SELECT id FROM players WHERE name = ? AND id != ?",
                         (name, pid)).fetchone()
    if clash:
        raise Invalid(f"There's already a player called {name}.")
    conn.execute("UPDATE players SET name = ? WHERE id = ?", (name, pid))
    conn.commit()


def delete_player(conn, pid):
    used = conn.execute("SELECT 1 FROM seats WHERE player_id = ?", (pid,)).fetchone()
    if used:
        raise Invalid("This player has games; delete those first.")
    conn.execute("DELETE FROM players WHERE id = ?", (pid,))
    conn.commit()


# ── decks ───────────────────────────────────────────────────────────────────

def _deck(row):
    if row is None:
        return None
    d = dict(row)
    d["colors"] = json.loads(d["colors"] or "[]")
    return d


def decks(conn, include_archived=True):
    rows = conn.execute("""
        SELECT d.*, p.name AS owner FROM decks d
        LEFT JOIN players p ON p.id = d.owner_id
        WHERE ? OR d.archived = 0
        ORDER BY d.archived, lower(d.name)""", (include_archived,)).fetchall()
    return [_deck(r) for r in rows]


def get_deck(conn, did):
    return _deck(conn.execute("""
        SELECT d.*, p.name AS owner FROM decks d
        LEFT JOIN players p ON p.id = d.owner_id WHERE d.id = ?""", (did,)).fetchone())


def clean_deck(conn, form):
    name = " ".join((form.get("name") or "").split())
    if not name:
        raise Invalid("The deck needs a name.")
    if len(name) > 80:
        raise Invalid("That deck name is too long.")
    fmt = form.get("fmt") or "pau"
    if fmt not in DECK_FORMATS:
        raise Invalid("Unknown format.")
    colors = [c for c in COLORS if c in (form.get("colors") or [])]
    owner = (form.get("owner") or "").strip()
    return {
        "name": name,
        "fmt": fmt,
        "colors": json.dumps(colors),
        "owner_id": player_id(conn, owner) if owner else None,
        "key_card": " ".join((form.get("key_card") or "").split())[:150],
        "archived": 1 if form.get("archived") else 0,
    }


def save_deck(conn, values, did=None):
    if did is None:
        values = {**values, "created_at": now()}
        cols = ", ".join(values)
        marks = ", ".join("?" for _ in values)
        did = conn.execute(f"INSERT INTO decks ({cols}) VALUES ({marks})",
                           tuple(values.values())).lastrowid
    else:
        sets = ", ".join(f"{k} = ?" for k in values)
        conn.execute(f"UPDATE decks SET {sets} WHERE id = ?", (*values.values(), did))
    conn.commit()
    return did


def delete_deck(conn, did):
    # Seats keep the game but lose the deck (ON DELETE SET NULL), which
    # changes deck ratings, so recompute.
    conn.execute("DELETE FROM decks WHERE id = ?", (did,))
    recompute(conn)
    conn.commit()


def deck_for_seat(conn, name, fmt, owner_id):
    """A deck by name (case-insensitive), created on the fly if it's new.
    Prefers the seat's player's own deck when two share a name."""
    name = " ".join((name or "").split())
    if not name:
        return None
    rows = conn.execute("SELECT id, owner_id FROM decks WHERE name = ? COLLATE NOCASE",
                        (name,)).fetchall()
    for r in rows:
        if r["owner_id"] == owner_id:
            return r["id"]
    if rows:
        return rows[0]["id"]
    return conn.execute(
        "INSERT INTO decks (name, owner_id, fmt, created_at) VALUES (?, ?, ?, ?)",
        (name[:80], owner_id, fmt, now())).lastrowid


# ── games ───────────────────────────────────────────────────────────────────

def clean_game(conn, data):
    """Validate a game posted by the log form and resolve names to ids.

    Seats: [{player, deck, placement, score}]. Best-of-N derives placements
    from scores (more game wins = better; equal = shared). Best-of-1 takes
    placements as given; everyone on placement 1 means a draw.
    """
    date = (data.get("date") or "").strip()
    try:
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise Invalid("Pick a date.")
    fmt = data.get("fmt")
    if fmt not in FORMATS:
        raise Invalid("Pick a format.")
    mode = data.get("mode") or "bo1"
    if mode not in MODES:
        raise Invalid("Unknown mode.")
    raw = [s for s in (data.get("seats") or []) if (s.get("player") or "").strip()]
    if len(raw) < 2:
        raise Invalid("A game needs at least two players.")
    if len(raw) > 8:
        raise Invalid("At most eight players.")

    seats = []
    for s in raw:
        pid = player_id(conn, s["player"])
        if any(x["player_id"] == pid for x in seats):
            raise Invalid(f"{s['player'].strip()} is in the game twice.")
        seats.append({
            "player_id": pid,
            "deck_id": deck_for_seat(conn, s.get("deck"), fmt, pid),
            "placement": s.get("placement"),
            "score": s.get("score"),
        })

    if mode == "bon":
        for s in seats:
            try:
                s["score"] = int(s["score"] or 0)
            except (TypeError, ValueError):
                raise Invalid("Scores are whole numbers.")
            if not 0 <= s["score"] <= 99:
                raise Invalid("Scores are whole numbers.")
        if not any(s["score"] for s in seats):
            raise Invalid("Enter how many games each player won.")
        for s in seats:
            s["placement"] = 1 + sum(o["score"] > s["score"] for o in seats)
    else:
        for s in seats:
            s["score"] = None
            try:
                s["placement"] = int(s["placement"])
            except (TypeError, ValueError):
                raise Invalid("Pick a winner (or mark it a draw).")
            if not 1 <= s["placement"] <= len(seats):
                raise Invalid("Placements go from 1 to the number of players.")
        if not any(s["placement"] == 1 for s in seats):
            raise Invalid("Pick a winner (or mark it a draw).")

    notes = (data.get("notes") or "").strip()[:2000]
    return {"date": date, "fmt": fmt, "mode": mode, "notes": notes}, seats


def save_game(conn, game, seats, gid=None):
    if gid is None:
        gid = conn.execute(
            "INSERT INTO games (date, fmt, mode, notes, created_at) VALUES (?, ?, ?, ?, ?)",
            (game["date"], game["fmt"], game["mode"], game["notes"], now())).lastrowid
    else:
        conn.execute("UPDATE games SET date = ?, fmt = ?, mode = ?, notes = ? WHERE id = ?",
                     (game["date"], game["fmt"], game["mode"], game["notes"], gid))
        conn.execute("DELETE FROM seats WHERE game_id = ?", (gid,))
    conn.executemany(
        "INSERT INTO seats (game_id, player_id, deck_id, placement, score) VALUES (?, ?, ?, ?, ?)",
        [(gid, s["player_id"], s["deck_id"], s["placement"], s["score"]) for s in seats])
    recompute(conn)
    conn.commit()
    return gid


def delete_game(conn, gid):
    conn.execute("DELETE FROM games WHERE id = ?", (gid,))
    recompute(conn)
    conn.commit()


ORDER = "g.date, g.created_at, g.id"


def recompute(conn):
    """Replay every game in order and store each seat's ratings."""
    games = {}
    for r in conn.execute(f"""
            SELECT s.id, s.game_id, s.player_id, s.deck_id, s.placement, g.fmt
            FROM seats s JOIN games g ON g.id = s.game_id
            ORDER BY {ORDER}, s.id"""):
        games.setdefault(r["game_id"], {"fmt": r["fmt"], "seats": []})["seats"].append(dict(r))
    results = elo.replay(games.values())
    conn.executemany(
        """UPDATE seats SET elo_before = ?, elo_after = ?,
           deck_elo_before = ?, deck_elo_after = ? WHERE id = ?""",
        [(r["elo_before"], r["elo_after"], r["deck_elo_before"], r["deck_elo_after"], sid)
         for sid, r in results.items()])


def games(conn, fmt=None, player=None, deck=None, limit=None):
    """Games newest first, each with its seats (best placement first)."""
    where, args = [], []
    if fmt:
        where.append("g.fmt = ?")
        args.append(fmt)
    if player:
        where.append("g.id IN (SELECT game_id FROM seats WHERE player_id = ?)")
        args.append(player)
    if deck:
        where.append("g.id IN (SELECT game_id FROM seats WHERE deck_id = ?)")
        args.append(deck)
    sql = "SELECT * FROM games g"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY g.date DESC, g.created_at DESC, g.id DESC"
    if limit:
        sql += f" LIMIT {int(limit)}"
    rows = [dict(r) for r in conn.execute(sql, args)]
    if not rows:
        return []
    by_id = {g["id"]: g for g in rows}
    for g in rows:
        g["seats"] = []
    marks = ",".join("?" for _ in by_id)
    for s in conn.execute(f"""
            SELECT s.*, p.name AS player, d.name AS deck, d.colors AS deck_colors,
                   d.art_file AS deck_art
            FROM seats s JOIN players p ON p.id = s.player_id
            LEFT JOIN decks d ON d.id = s.deck_id
            WHERE s.game_id IN ({marks})
            ORDER BY s.placement, s.id""", tuple(by_id)):
        s = dict(s)
        s["deck_colors"] = json.loads(s["deck_colors"] or "[]")
        by_id[s["game_id"]]["seats"].append(s)
    for g in rows:
        g["draw"] = all(s["placement"] == 1 for s in g["seats"])
        g["winners"] = [s for s in g["seats"] if s["placement"] == 1]
    return rows


def get_game(conn, gid):
    found = [g for g in games(conn) if g["id"] == gid]
    return found[0] if found else None
