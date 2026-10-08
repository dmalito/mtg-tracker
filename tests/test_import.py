import shutil
import sqlite3
from pathlib import Path

import pytest

from tools import import_legacy

LEGACY = Path(__file__).resolve().parent.parent / "data" / "mtg.db"


@pytest.mark.skipif(not LEGACY.exists(), reason="no legacy database here")
def test_import_matches_legacy(tmp_path):
    old = tmp_path / "mtg.db"
    shutil.copy(LEGACY, old)
    conn = import_legacy.migrate(old, tmp_path / "tracker.db")
    legacy = sqlite3.connect(old)
    n_games = legacy.execute("SELECT COUNT(*) FROM games").fetchone()[0]
    assert conn.execute("SELECT COUNT(*) FROM games").fetchone()[0] == n_games
    assert conn.execute("SELECT COUNT(*) FROM decks").fetchone()[0] >= \
        legacy.execute("SELECT COUNT(*) FROM decks").fetchone()[0]
    # Every game with a winner still has that winner alone in first place.
    for (date, winner) in legacy.execute("SELECT date, winner FROM games WHERE winner != ''"):
        assert winner
    winners = sorted(r[0] for r in legacy.execute("SELECT winner FROM games WHERE winner != ''"))
    new_winners = sorted(r[0] for r in conn.execute("""
        SELECT p.name FROM seats s JOIN players p ON p.id = s.player_id
        WHERE s.placement = 1 AND (SELECT COUNT(*) FROM seats o
                                   WHERE o.game_id = s.game_id AND o.placement = 1) = 1"""))
    assert new_winners == winners
    with pytest.raises(SystemExit):
        import_legacy.migrate(old, tmp_path / "tracker.db")
