"""MTG Tracker: games, ratings and matchups for a playgroup.

A self-contained blueprint (own templates, static files and database), so it
can later be registered inside the gioco-immaginazione site as-is. Writes go
through can_edit(): open to everyone for now; there it becomes the admins
check.
"""
import os
from datetime import date
from functools import wraps
from pathlib import Path

from flask import Blueprint, abort, current_app, g, jsonify, request, url_for

from . import db

bp = Blueprint("tracker", __name__, template_folder="templates",
               static_folder="static", static_url_path="/static/tracker")


def data_dir():
    configured = current_app.config.get("TRACKER_DATA_DIR") or os.environ.get("DATA_DIR")
    return Path(configured or Path(__file__).parent.parent / "data")


def art_dir():
    return data_dir() / "art"


def get_db():
    if "tracker_db" not in g:
        path = data_dir()
        path.mkdir(parents=True, exist_ok=True)
        g.tracker_db = db.connect(path / "tracker.db")
    return g.tracker_db


@bp.teardown_app_request
def close_db(_exc):
    conn = g.pop("tracker_db", None)
    if conn is not None:
        conn.close()


def can_edit():
    """Who may log, edit and delete. Everyone, for now."""
    return True


def requires_edit(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not can_edit():
            abort(403)
        return view(*args, **kwargs)
    return wrapped


def tracker_root():
    """This blueprint's URL with any proxy prefix, with a trailing slash."""
    return url_for("tracker.home")


@bp.app_errorhandler(db.Invalid)
def invalid(exc):
    if request.is_json or "/api/" in request.path:
        return jsonify(error=str(exc)), 400
    return str(exc), 400


THEMES = ("light", "dark")


@bp.context_processor
def context():
    theme = request.cookies.get("mtg_theme")
    return {
        "root": tracker_root(),
        "can_edit": can_edit(),
        "theme": theme if theme in THEMES else None,
        "FORMATS": db.FORMATS,
        "DECK_FORMATS": db.DECK_FORMATS,
        "COLORS": db.COLORS,
        "today": date.today().isoformat(),
    }


MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split()


@bp.app_template_filter("nicedate")
def nicedate(value):
    try:
        y, m, d = value.split("-")
        return f"{int(d)} {MONTHS[int(m) - 1]} {y}"
    except (AttributeError, ValueError, IndexError):
        return value or "—"


@bp.app_template_filter("monthname")
def monthname(value):
    try:
        y, m = value.split("-")[:2]
        return f"{MONTHS[int(m) - 1]} {y}"
    except (AttributeError, ValueError, IndexError):
        return value or ""


@bp.app_template_filter("rating")
def rating(value):
    return "—" if value is None else str(round(value))


@bp.app_template_filter("signed")
def signed(value):
    if value is None:
        return ""
    v = round(value)
    return f"+{v}" if v > 0 else ("±0" if v == 0 else f"−{-v}")


from . import views  # noqa: E402,F401  (registers the routes on bp)
