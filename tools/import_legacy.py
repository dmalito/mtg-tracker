"""Import the old Svelte/Express database (mtg.db) into tracker.db.

    python3 tools/import_legacy.py [OLD_DB] [NEW_DB]

Defaults: data/mtg.db -> data/tracker.db. The old file is opened read-only
and left untouched. Refuses to run if the new database already has games.

Old games kept players as JSON names with an optional deck name, the winner
as a name ('' = draw), and best-of-N scores as {"name": "games won"} (a
missing name means 0). Old decks had a free-text owner, which becomes a
player.
"""
import json
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tracker import db  # noqa: E402


def migrate(old_path, new_path):
    old = sqlite3.connect(f"file:{old_path}?mode=ro", uri=True)
    old.row_factory = sqlite3.Row
    new = db.connect(new_path)
    if new.execute("SELECT COUNT(*) FROM games").fetchone()[0]:
        raise SystemExit(f"{new_path} already has games; not importing twice.")

    deck_ids = {}
    for d in old.execute("SELECT * FROM decks ORDER BY id"):
        owner = (d["owner"] or "").strip()
        colors = [c for c in db.COLORS if c in json.loads(d["colors"] or "[]")]
        fmt = d["fmt"] if d["fmt"] in db.DECK_FORMATS else "pau"
        deck_ids[d["name"].strip().lower()] = new.execute(
            "INSERT INTO decks (name, owner_id, fmt, colors, created_at) VALUES (?, ?, ?, ?, ?)",
            (d["name"].strip(), db.player_id(new, owner) if owner else None, fmt,
             json.dumps(colors), d["created_at"])).lastrowid

    games = old.execute("SELECT * FROM games ORDER BY date, created_at, id").fetchall()
    for g in games:
        players = json.loads(g["players"])
        scores = json.loads(g["scores"]) if g["scores"] else None
        mode = "bon" if scores else "bo1"
        gid = new.execute(
            "INSERT INTO games (date, fmt, mode, notes, created_at) VALUES (?, ?, ?, ?, ?)",
            (g["date"], g["fmt"], mode, g["notes"] or "", g["created_at"])).lastrowid
        if scores:
            wins = {p["name"]: int(scores.get(p["name"]) or 0) for p in players}
        for p in players:
            pid = db.player_id(new, p["name"])
            deck = (p.get("deckName") or "").strip()
            did = deck_ids.get(deck.lower()) if deck else None
            if deck and did is None:
                did = deck_ids[deck.lower()] = db.deck_for_seat(new, deck, g["fmt"], pid)
            if scores:
                placement = 1 + sum(w > wins[p["name"]] for w in wins.values())
                score = wins[p["name"]]
            else:
                placement = 1 if not g["winner"] or g["winner"] == p["name"] else 2
                score = None
            new.execute(
                "INSERT INTO seats (game_id, player_id, deck_id, placement, score) VALUES (?, ?, ?, ?, ?)",
                (gid, pid, did, placement, score))

    db.recompute(new)
    new.commit()
    return new


def main():
    root = Path(__file__).resolve().parent.parent
    old_path = Path(sys.argv[1]) if len(sys.argv) > 1 else root / "data" / "mtg.db"
    new_path = Path(sys.argv[2]) if len(sys.argv) > 2 else root / "data" / "tracker.db"
    conn = migrate(old_path, new_path)
    count = lambda t: conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]  # noqa: E731
    print(f"Imported into {new_path}: {count('games')} games, {count('decks')} decks, "
          f"{count('players')} players.")
    for r in conn.execute("""
            SELECT g.fmt, p.name, s.elo_after FROM seats s
            JOIN games g ON g.id = s.game_id JOIN players p ON p.id = s.player_id
            WHERE s.id IN (SELECT s2.id FROM seats s2 JOIN games g2 ON g2.id = s2.game_id
                           WHERE s2.player_id = s.player_id AND g2.fmt = g.fmt
                           ORDER BY g2.date DESC, g2.created_at DESC, g2.id DESC LIMIT 1)
            ORDER BY g.fmt, s.elo_after DESC"""):
        print(f"  {db.FORMATS[r['fmt']]:<10} {r['name']:<15} {round(r['elo_after'])}")


if __name__ == "__main__":
    main()
