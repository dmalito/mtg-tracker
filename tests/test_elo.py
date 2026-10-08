import pytest

from tracker import elo


def test_two_players_is_classic_elo():
    d = elo.deltas([1200, 1200], [1, 2])
    assert d == pytest.approx([16, -16])
    d = elo.deltas([1400, 1200], [2, 1])
    exp = elo.expected(1200, 1400)
    assert d[1] == pytest.approx(32 * (1 - exp))


def test_draw_between_equals_changes_nothing():
    assert elo.deltas([1200, 1200], [1, 1]) == pytest.approx([0, 0])


def test_draw_moves_ratings_toward_each_other():
    d = elo.deltas([1300, 1100], [1, 1])
    assert d[0] < 0 < d[1]


def test_pod_is_zero_sum_and_ordered():
    d = elo.deltas([1200, 1250, 1180, 1300], [1, 2, 3, 3])
    assert sum(d) == pytest.approx(0)
    assert d[0] > 0 and d[2] < 0 and d[3] < 0


def test_pod_total_swing_comparable_to_1v1():
    pod = elo.deltas([1200] * 4, [1, 2, 3, 4])
    assert pod[0] == pytest.approx(16)  # winner beats 3 others at K/3 each


def seat(i, player, placement, deck=None):
    return {"id": i, "player_id": player, "deck_id": deck, "placement": placement}


def test_replay_carries_ratings_and_separates_formats():
    games = [
        {"fmt": "pau", "seats": [seat(1, "a", 1, 10), seat(2, "b", 2, 11)]},
        {"fmt": "pau", "seats": [seat(3, "a", 1, 10), seat(4, "b", 2, 11)]},
        {"fmt": "cmd", "seats": [seat(5, "a", 2), seat(6, "b", 1)]},
    ]
    out = elo.replay(games)
    assert out[1]["elo_after"] == pytest.approx(1216)
    assert out[3]["elo_before"] == pytest.approx(1216)
    assert out[3]["deck_elo_before"] == pytest.approx(1216)
    # Commander starts fresh
    assert out[5]["elo_before"] == elo.START
    assert out[5]["deck_elo_before"] is None


def test_seat_without_deck_sits_out_deck_rating():
    out = elo.replay([{"fmt": "cmd", "seats": [seat(1, "a", 1, 10), seat(2, "b", 2),
                                               seat(3, "c", 3, 12)]}])
    assert out[2]["deck_elo_after"] is None
    assert out[1]["deck_elo_after"] == pytest.approx(1216)
