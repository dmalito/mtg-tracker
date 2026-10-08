"""Derived numbers: leaderboards, records, head-to-heads, rating series, and
the small inline-SVG charts that draw them."""
from collections import defaultdict

from markupsafe import Markup, escape

from .db import ORDER
from .elo import START


def seat_rows(conn, fmt=None):
    """Every seat, oldest game first, with names and its game's draw flag."""
    sql = f"""
        SELECT s.*, g.date, g.fmt, p.name AS player, d.name AS deck,
               (SELECT COUNT(*) FROM seats o WHERE o.game_id = s.game_id) AS n,
               (SELECT COUNT(*) FROM seats o WHERE o.game_id = s.game_id
                                               AND o.placement = 1) AS firsts
        FROM seats s JOIN games g ON g.id = s.game_id
        JOIN players p ON p.id = s.player_id
        LEFT JOIN decks d ON d.id = s.deck_id
        {"WHERE g.fmt = ?" if fmt else ""}
        ORDER BY {ORDER}, s.id"""
    rows = []
    for r in conn.execute(sql, (fmt,) if fmt else ()):
        r = dict(r)
        if r["placement"] == 1:
            r["result"] = "W" if r["firsts"] == 1 else "D"
        else:
            r["result"] = "L"
        rows.append(r)
    return rows


def _keys(kind):
    if kind == "deck":
        return "deck_id", "deck", "deck_elo_after"
    return "player_id", "player", "elo_after"


def leaderboard(rows, kind="player"):
    """[{id, name, rating, games, W, D, L, series}] best rating first."""
    id_key, name_key, after_key = _keys(kind)
    table = {}
    for r in rows:
        if r[id_key] is None:
            continue
        e = table.setdefault(r[id_key], {"id": r[id_key], "name": r[name_key],
                                         "games": 0, "W": 0, "D": 0, "L": 0,
                                         "series": [START]})
        e["games"] += 1
        e[r["result"]] += 1
        e["series"].append(r[after_key])
    for e in table.values():
        e["rating"] = e["series"][-1]
        e["win_pct"] = round(100 * e["W"] / e["games"]) if e["games"] else 0
    return sorted(table.values(), key=lambda e: (-e["rating"], e["name"].lower()))


def pairwise(rows, kind="player"):
    """{(a, b): {"W", "D", "L", "games"}} where W counts the games a finished
    ahead of b. In a pod every pair of seats counts as one meeting."""
    id_key, _, _ = _keys(kind)
    by_game = defaultdict(list)
    for r in rows:
        if r[id_key] is not None:
            by_game[r["game_id"]].append(r)
    out = defaultdict(lambda: {"W": 0, "D": 0, "L": 0, "games": 0})
    for seats in by_game.values():
        for a in seats:
            for b in seats:
                if a is b or a[id_key] == b[id_key]:
                    continue
                cell = out[(a[id_key], b[id_key])]
                cell["games"] += 1
                if a["placement"] < b["placement"]:
                    cell["W"] += 1
                elif a["placement"] == b["placement"]:
                    cell["D"] += 1
                else:
                    cell["L"] += 1
    for cell in out.values():
        cell["pct"] = round(100 * (cell["W"] + cell["D"] / 2) / cell["games"])
    return dict(out)


def opponents(rows, me, kind="player"):
    """Head-to-head list for one player or deck, most-met opponent first."""
    id_key, name_key, _ = _keys(kind)
    names = {r[id_key]: r[name_key] for r in rows if r[id_key] is not None}
    pairs = pairwise(rows, kind)
    out = [{"id": b, "name": names[b], **cell}
           for (a, b), cell in pairs.items() if a == me]
    return sorted(out, key=lambda o: (-o["games"], o["name"].lower()))


def matrix(rows, kind="player", min_games=1):
    """Names in leaderboard order plus the pairwise cells, for a grid."""
    board = [e for e in leaderboard(rows, kind) if e["games"] >= min_games]
    return board, pairwise(rows, kind)


def series(rows, me, kind="player"):
    """Rating after each game for one player or deck: [(date, rating)],
    starting from the start rating."""
    id_key, _, after_key = _keys(kind)
    pts = [(None, START)]
    pts += [(r["date"], r[after_key]) for r in rows if r[id_key] == me]
    return pts


# ── charts ──────────────────────────────────────────────────────────────────

def _scale(values, lo_px, hi_px, pad=0.0):
    lo, hi = min(values), max(values)
    if hi - lo < 1:
        lo, hi = lo - 10, hi + 10
    lo -= pad * (hi - lo)
    hi += pad * (hi - lo)
    return lambda v: hi_px - (v - lo) / (hi - lo) * (hi_px - lo_px), lo, hi


def sparkline(values, width=90, height=24):
    if len(values) < 2:
        return Markup("")
    y, _, _ = _scale(values, 2, height - 2)
    step = (width - 4) / (len(values) - 1)
    pts = " ".join(f"{2 + i * step:.1f},{y(v):.1f}" for i, v in enumerate(values))
    trend = "up" if values[-1] >= values[0] else "down"
    return Markup(
        f'<svg class="spark spark-{trend}" viewBox="0 0 {width} {height}" '
        f'width="{width}" height="{height}" aria-hidden="true">'
        f'<line x1="0" x2="{width}" y1="{y(START):.1f}" y2="{y(START):.1f}" class="spark-base"/>'
        f'<polyline points="{pts}"/></svg>')


def line_chart(lines, width=640, height=220, label="Rating over time"):
    """lines: [{"name", "values", "cls"}]; x is the game number."""
    lines = [ln for ln in lines if len(ln["values"]) >= 2]
    if not lines:
        return Markup('<p class="muted">Not enough games for a chart yet.</p>')
    left, right, top, bottom = 40, width - 10, 10, height - 24
    allv = [v for ln in lines for v in ln["values"]] + [START]
    y, lo, hi = _scale(allv, top, bottom, pad=0.08)
    longest = max(len(ln["values"]) for ln in lines)
    step = (right - left) / max(longest - 1, 1)
    parts = [f'<svg class="chart" viewBox="0 0 {width} {height}" role="img" '
             f'aria-label="{escape(label)}">']
    # Gridlines on round ratings.
    span = hi - lo
    grid = 25 if span < 150 else 50 if span < 400 else 100
    v = (int(lo) // grid + 1) * grid
    while v < hi:
        cls = "grid start" if v == START else "grid"
        parts.append(f'<line class="{cls}" x1="{left}" x2="{right}" y1="{y(v):.1f}" y2="{y(v):.1f}"/>')
        parts.append(f'<text class="axis" x="{left - 6}" y="{y(v) + 4:.1f}" text-anchor="end">{v}</text>')
        v += grid
    parts.append(f'<text class="axis" x="{left}" y="{height - 6}">start</text>')
    parts.append(f'<text class="axis" x="{right}" y="{height - 6}" text-anchor="end">'
                 f'game {longest - 1}</text>')
    for ln in lines:
        pts = " ".join(f"{left + i * step:.1f},{y(v):.1f}" for i, v in enumerate(ln["values"]))
        parts.append(f'<polyline class="line {escape(ln.get("cls", ""))}" points="{pts}">'
                     f'<title>{escape(ln["name"])}</title></polyline>')
        last = ln["values"][-1]
        x_last = left + (len(ln["values"]) - 1) * step
        parts.append(f'<circle class="dot {escape(ln.get("cls", ""))}" cx="{x_last:.1f}" '
                     f'cy="{y(last):.1f}" r="3.5"><title>{escape(ln["name"])}: '
                     f'{round(last)}</title></circle>')
    parts.append("</svg>")
    return Markup("".join(parts))
