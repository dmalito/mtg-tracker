import sqlite3

import pytest


def ratings(tmp_path):
    conn = sqlite3.connect(tmp_path / "tracker.db")
    rows = conn.execute("""
        SELECT p.name, s.elo_after FROM seats s JOIN players p ON p.id = s.player_id
        JOIN games g ON g.id = s.game_id ORDER BY g.date, g.created_at, g.id""").fetchall()
    return dict(rows)  # last one wins = current


def test_pages_render_empty(client):
    for url in ["/", "/history", "/players", "/decks", "/matchups", "/log", "/decks/new",
                "/?fmt=cmd", "/api/health"]:
        assert client.get(url).status_code == 200, url


def test_log_1v1_and_pages(client, log, tmp_path):
    r = log([{"player": "Ann", "deck": "Slivers", "placement": 1},
             {"player": "Bob", "deck": "Goblins", "placement": 2}])
    assert r.status_code == 201, r.json
    assert ratings(tmp_path) == pytest.approx({"Ann": 1216, "Bob": 1184})
    for url in ["/", "/history", "/players", "/players/1", "/decks", "/decks/1",
                "/matchups", "/games/1/edit"]:
        page = client.get(url)
        assert page.status_code == 200, url
    assert b"Slivers" in client.get("/decks").data
    assert b"+16" in client.get("/history").data


def test_bon_scores_decide_placement(client, log):
    r = log([{"player": "Ann", "score": 1}, {"player": "Bob", "score": 2}], mode="bon")
    assert r.status_code == 201
    page = client.get("/history").data.decode().split('class="games"')[1]
    assert page.index("Bob") < page.index("Ann")  # winner listed first


def test_pod_and_draw(client, log, tmp_path):
    r = log([{"player": p, "placement": pl} for p, pl in
             [("A", 1), ("B", 2), ("C", 3), ("D", 3)]], fmt="cmd")
    assert r.status_code == 201
    got = ratings(tmp_path)
    assert sum(got.values()) == pytest.approx(4800)
    assert got["A"] > got["B"] > got["C"] == pytest.approx(got["D"])
    assert b"4-player pod" in client.get("/history").data
    r = log([{"player": "A", "placement": 1}, {"player": "B", "placement": 1}], fmt="cmd")
    assert r.status_code == 201
    assert b"Draw" in client.get("/history?fmt=cmd").data


def test_editing_an_old_game_changes_later_ratings(client, log, tmp_path):
    log([{"player": "Ann", "placement": 1}, {"player": "Bob", "placement": 2}], date="2026-01-01")
    log([{"player": "Ann", "placement": 1}, {"player": "Bob", "placement": 2}], date="2026-01-02")
    before = ratings(tmp_path)["Ann"]
    r = client.put("/api/games/1", json={
        "date": "2026-01-01", "fmt": "pau", "mode": "bo1",
        "seats": [{"player": "Ann", "placement": 2}, {"player": "Bob", "placement": 1}]})
    assert r.status_code == 200
    after = ratings(tmp_path)["Ann"]
    assert after < before
    assert after == pytest.approx(1200, abs=2)
    assert client.delete("/api/games/1").status_code == 200
    assert ratings(tmp_path)["Ann"] == pytest.approx(1216)


@pytest.mark.parametrize("seats,mode,msg", [
    ([{"player": "Ann", "placement": 1}], "bo1", "at least two"),
    ([{"player": "Ann", "placement": 1}, {"player": "ann", "placement": 2}], "bo1", "twice"),
    ([{"player": "Ann", "placement": 2}, {"player": "Bob", "placement": 2}], "bo1", "winner"),
    ([{"player": "Ann", "score": 0}, {"player": "Bob", "score": 0}], "bon", "won"),
])
def test_invalid_games_rejected_without_side_effects(client, log, seats, mode, msg):
    r = log(seats, mode=mode)
    assert r.status_code == 400
    assert msg in r.json["error"]
    assert b"Ann" not in client.get("/players").data


def test_deck_form_and_retire(client, monkeypatch):
    from tracker import scryfall
    monkeypatch.setattr(scryfall, "lookup", lambda name: (_ for _ in ()).throw(scryfall.NotFound()))
    r = client.post("/decks/new", data={"name": "Elves", "fmt": "pau", "colors": ["G"],
                                        "owner": "Ann", "key_card": "Not A Card"})
    assert r.status_code == 302
    page = client.get(r.headers["Location"])
    assert b"Couldn" in page.data and b"Elves" in page.data
    r = client.post("/decks/1/edit", data={"name": "Elves", "fmt": "pau", "archived": "1"})
    assert r.status_code == 302
    assert b"Elves" not in client.get("/decks").data
    assert b"Elves" in client.get("/decks?archived=1").data


def test_deck_art_from_scryfall(client, monkeypatch, tmp_path):
    from tracker import scryfall
    card = {"name": "Sliver Overlord", "id": "a" * 8 + "-" + "b" * 4 + "-" + "c" * 4 + "-" + "d" * 4 + "-" + "e" * 12,
            "colors": ["W", "U", "B", "R", "G"], "artist": "Someone", "art_url": "x"}
    monkeypatch.setattr(scryfall, "lookup", lambda name: card)
    monkeypatch.setattr(scryfall, "_get", lambda url, raw=False: b"JPEGDATA")
    r = client.post("/decks/new", data={"name": "Slivers", "fmt": "cmd", "key_card": "sliver overlord"})
    page = client.get(r.headers["Location"]).data
    assert b"Sliver Overlord" in page and b"art by Someone" in page
    assert b"pip-G" in page  # colours filled from colour identity
    assert client.get(f"/art/{card['id']}.jpg").data == b"JPEGDATA"


def test_prefix_from_proxy(client):
    page = client.get("/", headers={"X-Forwarded-Prefix": "/mtg-tracker"}).data.decode()
    assert 'window.APP_ROOT = "/mtg-tracker/"' in page
    assert 'href="/mtg-tracker/history"' in page


def test_player_rename_and_delete(client, log):
    log([{"player": "Ann", "placement": 1}, {"player": "Bob", "placement": 2}])
    client.post("/players/1/rename", data={"name": "Anna"})
    assert b"Anna" in client.get("/players").data
    assert client.post("/players/2/rename", data={"name": "anna"}).status_code == 400
    assert client.post("/players/1/delete").status_code == 400
