import json
from collections import defaultdict

from flask import (abort, jsonify, redirect, render_template, request,
                   send_from_directory, url_for)

from . import art_dir, bp, db, get_db, requires_edit, scryfall, stats


def pick_fmt(conn):
    """?fmt= if valid, else the format of the most recent game."""
    fmt = request.args.get("fmt")
    if fmt in db.FORMATS:
        return fmt
    row = conn.execute(f"SELECT fmt FROM games g ORDER BY {db.ORDER} DESC LIMIT 1").fetchone()
    return row["fmt"] if row else "pau"


def played_formats(conn):
    return [r["fmt"] for r in conn.execute(
        "SELECT fmt, COUNT(*) n FROM games GROUP BY fmt ORDER BY n DESC")]


# ── pages ───────────────────────────────────────────────────────────────────

@bp.route("/")
def home():
    conn = get_db()
    fmt = pick_fmt(conn)
    rows = stats.seat_rows(conn, fmt)
    return render_template(
        "tracker/home.html", fmt=fmt, formats=played_formats(conn),
        board=stats.leaderboard(rows), deck_board=stats.leaderboard(rows, "deck")[:5],
        recent=db.games(conn, fmt=fmt, limit=5), sparkline=stats.sparkline,
        total=conn.execute("SELECT COUNT(*) FROM games WHERE fmt = ?", (fmt,)).fetchone()[0])


@bp.route("/history")
def history():
    conn = get_db()
    fmt = request.args.get("fmt") if request.args.get("fmt") in db.FORMATS else None
    player = request.args.get("player", type=int)
    deck = request.args.get("deck", type=int)
    return render_template(
        "tracker/history.html", games=db.games(conn, fmt=fmt, player=player, deck=deck),
        fmt=fmt, player=player, deck=deck, players=db.players(conn), decks=db.decks(conn))


def log_context(conn, game=None):
    decks = [{"id": d["id"], "name": d["name"], "fmt": d["fmt"], "owner": d["owner"],
              "colors": d["colors"], "archived": bool(d["archived"]),
              "art": url_for("tracker.art", fname=d["art_file"]) if d["art_file"] else None}
             for d in db.decks(conn)]
    last = db.games(conn, limit=1)
    return {
        "players": [p["name"] for p in db.players(conn)],
        "decks": decks,
        "last": {"fmt": last[0]["fmt"], "mode": last[0]["mode"],
                 "seats": [{"player": s["player"], "deck": s["deck"] or ""}
                           for s in last[0]["seats"]]} if last else None,
        "game": {"id": game["id"], "date": game["date"], "fmt": game["fmt"],
                 "mode": game["mode"], "notes": game["notes"],
                 "seats": [{"player": s["player"], "deck": s["deck"] or "",
                            "placement": s["placement"], "score": s["score"]}
                           for s in game["seats"]]} if game else None,
    }


@bp.route("/log")
@requires_edit
def log():
    return render_template("tracker/log.html", data=log_context(get_db()))


@bp.route("/games/<int:gid>/edit")
@requires_edit
def edit_game(gid):
    conn = get_db()
    game = db.get_game(conn, gid)
    if not game:
        abort(404)
    return render_template("tracker/log.html", data=log_context(conn, game))


@bp.route("/players")
def players():
    conn = get_db()
    boards = {f: stats.leaderboard(stats.seat_rows(conn, f)) for f in played_formats(conn)}
    seen = {e["id"] for b in boards.values() for e in b}
    idle = [p for p in db.players(conn) if p["id"] not in seen]
    return render_template("tracker/players.html", boards=boards, idle=idle,
                           sparkline=stats.sparkline)


@bp.route("/players/<int:pid>")
def player(pid):
    conn = get_db()
    me = db.get_player(conn, pid)
    if not me:
        abort(404)
    sections = []
    for fmt in played_formats(conn):
        rows = stats.seat_rows(conn, fmt)
        mine = [r for r in rows if r["player_id"] == pid]
        if not mine:
            continue
        entry = next(e for e in stats.leaderboard(rows) if e["id"] == pid)
        decks = defaultdict(lambda: {"W": 0, "D": 0, "L": 0, "games": 0})
        for r in mine:
            key = (r["deck_id"], r["deck"] or "No deck recorded")
            decks[key]["games"] += 1
            decks[key][r["result"]] += 1
        sections.append({
            "fmt": fmt, "entry": entry,
            "chart": stats.line_chart([{"name": me["name"], "cls": "c0",
                                        "values": [v for _, v in stats.series(rows, pid)]}]),
            "decks": sorted(({"id": k[0], "name": k[1], **v} for k, v in decks.items()),
                            key=lambda d: -d["games"]),
            "opponents": stats.opponents(rows, pid),
        })
    return render_template("tracker/player.html", me=me, sections=sections,
                           recent=db.games(conn, player=pid, limit=10))


@bp.route("/players/<int:pid>/rename", methods=["POST"])
@requires_edit
def rename_player(pid):
    conn = get_db()
    if not db.get_player(conn, pid):
        abort(404)
    db.rename_player(conn, pid, request.form.get("name"))
    return redirect(url_for("tracker.player", pid=pid))


@bp.route("/players/<int:pid>/delete", methods=["POST"])
@requires_edit
def delete_player(pid):
    db.delete_player(get_db(), pid)
    return redirect(url_for("tracker.players"))


@bp.route("/decks")
def decks():
    conn = get_db()
    ratings = {}
    for fmt in played_formats(conn):
        for e in stats.leaderboard(stats.seat_rows(conn, fmt), "deck"):
            ratings.setdefault(e["id"], {})[fmt] = e
    return render_template("tracker/decks.html", decks=db.decks(conn), ratings=ratings,
                           show_archived=request.args.get("archived") == "1")


@bp.route("/decks/<int:did>")
def deck(did):
    conn = get_db()
    d = db.get_deck(conn, did)
    if not d:
        abort(404)
    sections = []
    for fmt in played_formats(conn):
        rows = stats.seat_rows(conn, fmt)
        mine = [r for r in rows if r["deck_id"] == did]
        if not mine:
            continue
        entry = next(e for e in stats.leaderboard(rows, "deck") if e["id"] == did)
        pilots = defaultdict(lambda: {"W": 0, "D": 0, "L": 0, "games": 0})
        for r in mine:
            pilots[(r["player_id"], r["player"])]["games"] += 1
            pilots[(r["player_id"], r["player"])][r["result"]] += 1
        sections.append({
            "fmt": fmt, "entry": entry,
            "chart": stats.line_chart([{"name": d["name"], "cls": "c0",
                                        "values": [v for _, v in stats.series(rows, did, "deck")]}]),
            "pilots": sorted(({"id": k[0], "name": k[1], **v} for k, v in pilots.items()),
                             key=lambda p: -p["games"]),
            "opponents": stats.opponents(rows, did, "deck"),
        })
    return render_template("tracker/deck.html", deck=d, sections=sections,
                           recent=db.games(conn, deck=did, limit=10),
                           notice=request.args.get("notice"))


@bp.route("/decks/new", methods=["GET", "POST"])
@bp.route("/decks/<int:did>/edit", methods=["GET", "POST"])
@requires_edit
def deck_form(did=None):
    conn = get_db()
    current = db.get_deck(conn, did) if did else None
    if did and not current:
        abort(404)
    if request.method == "GET":
        return render_template("tracker/deck_form.html", deck=current,
                               players=db.players(conn), error=None)

    form = {**request.form, "colors": request.form.getlist("colors")}
    try:
        values = db.clean_deck(conn, form)
    except db.Invalid as e:
        conn.rollback()
        return render_template("tracker/deck_form.html", deck=current or {}, form=form,
                               players=db.players(conn), error=str(e)), 400

    notice = None
    old_card = (current or {}).get("key_card") or ""
    if not values["key_card"]:
        values.update(scryfall_id=None, art_file=None, art_artist=None)
    elif values["key_card"].lower() != old_card.lower() or not (current or {}).get("art_file"):
        try:
            card = scryfall.lookup(values["key_card"])
            values.update(key_card=card["name"], scryfall_id=card["id"],
                          art_file=scryfall.download_art(card, art_dir()),
                          art_artist=card["artist"])
            if values["colors"] == "[]":
                values["colors"] = json.dumps(card["colors"] or ["C"])
        except scryfall.NotFound:
            notice = f"Couldn't find a card called “{values['key_card']}” on Scryfall."
        except Exception:  # network trouble: keep the deck, skip the art
            notice = "Couldn't reach Scryfall; saved without art. Try again later."
    did = db.save_deck(conn, values, did)
    return redirect(url_for("tracker.deck", did=did, notice=notice))


@bp.route("/decks/<int:did>/delete", methods=["POST"])
@requires_edit
def delete_deck(did):
    db.delete_deck(get_db(), did)
    return redirect(url_for("tracker.decks"))


@bp.route("/matchups")
def matchups():
    conn = get_db()
    fmt = pick_fmt(conn)
    rows = stats.seat_rows(conn, fmt)
    players, player_cells = stats.matrix(rows)
    decks, deck_cells = stats.matrix(rows, "deck")
    return render_template("tracker/matchups.html", fmt=fmt, formats=played_formats(conn),
                           players=players, player_cells=player_cells,
                           decks=decks, deck_cells=deck_cells,
                           chart=stats.line_chart([
                               {"name": e["name"], "values": e["series"], "cls": f"c{i % 6}"}
                               for i, e in enumerate(players[:6])]))


@bp.route("/art/<fname>")
def art(fname):
    return send_from_directory(art_dir(), fname, max_age=30 * 86400)


# ── JSON ────────────────────────────────────────────────────────────────────

@bp.route("/api/health")
def health():
    return jsonify(ok=True)


@bp.route("/api/games", methods=["POST"])
@requires_edit
def create_game():
    conn = get_db()
    try:
        game, seats = db.clean_game(conn, request.get_json(force=True) or {})
    except db.Invalid:
        conn.rollback()
        raise
    gid = db.save_game(conn, game, seats)
    return jsonify(id=gid, url=url_for("tracker.history", _anchor=f"g{gid}")), 201


@bp.route("/api/games/<int:gid>", methods=["PUT", "DELETE"])
@requires_edit
def change_game(gid):
    conn = get_db()
    if not conn.execute("SELECT 1 FROM games WHERE id = ?", (gid,)).fetchone():
        abort(404)
    if request.method == "DELETE":
        db.delete_game(conn, gid)
        return jsonify(ok=True)
    try:
        game, seats = db.clean_game(conn, request.get_json(force=True) or {})
    except db.Invalid:
        conn.rollback()
        raise
    db.save_game(conn, game, seats, gid)
    return jsonify(id=gid, url=url_for("tracker.history", _anchor=f"g{gid}"))


@bp.route("/api/cards")
def card_names():
    try:
        return jsonify(scryfall.autocomplete(request.args.get("q")))
    except Exception:
        return jsonify([])
