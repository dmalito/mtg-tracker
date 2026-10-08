"""The one rating engine. Pure functions, no database.

A game is a list of seats with a placement (1 = winner, equal placements =
tied). Every pair of seats is scored as a mini-match: finishing ahead is a
win, level is a draw. Each pair moves ratings by K / (n - 1), so a 1v1 is
classic Elo with K = 32, a four-player pod moves about as much in total as a
1v1, and every game is zero-sum.

Ratings are separate per format (Pauper 1v1 and Commander pods are different
games) and separate for players and decks.
"""

K = 32
START = 1200.0


def expected(ra, rb):
    return 1 / (1 + 10 ** ((rb - ra) / 400))


def deltas(ratings, placements):
    """Rating change for each seat, given equal-length lists."""
    n = len(ratings)
    if n < 2:
        return [0.0] * n
    k = K / (n - 1)
    out = [0.0] * n
    for i in range(n):
        for j in range(i + 1, n):
            if placements[i] < placements[j]:
                s = 1.0
            elif placements[i] == placements[j]:
                s = 0.5
            else:
                s = 0.0
            d = k * (s - expected(ratings[i], ratings[j]))
            out[i] += d
            out[j] -= d
    return out


def replay(games):
    """Play games in the order given.

    games: iterable of {"fmt", "seats": [{"id", "player_id", "deck_id",
    "placement"}]}. Returns {seat id: {elo_before, elo_after,
    deck_elo_before, deck_elo_after}}; deck values are None for seats
    without a deck.
    """
    ratings = {}
    out = {}
    for game in games:
        fmt, seats = game["fmt"], game["seats"]
        keys = [(fmt, "player", s["player_id"]) for s in seats]
        before = [ratings.get(k, START) for k in keys]
        change = deltas(before, [s["placement"] for s in seats])
        for s, k, b, d in zip(seats, keys, before, change):
            ratings[k] = b + d
            out[s["id"]] = {"elo_before": b, "elo_after": b + d,
                            "deck_elo_before": None, "deck_elo_after": None}

        # Decks only rate against other decks; a seat with no deck recorded
        # sits out. Two seats on the same deck (a mirror) still count as two.
        decked = [s for s in seats if s["deck_id"]]
        keys = [(fmt, "deck", s["deck_id"]) for s in decked]
        before = [ratings.get(k, START) for k in keys]
        change = deltas(before, [s["placement"] for s in decked])
        for s, k, b, d in zip(decked, keys, before, change):
            ratings[k] = ratings.get(k, START) + d
            out[s["id"]]["deck_elo_before"] = b
            out[s["id"]]["deck_elo_after"] = b + d
    return out
