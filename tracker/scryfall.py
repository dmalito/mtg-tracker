"""Card lookups for deck art.

Scryfall rejects requests without a real User-Agent, and double-faced cards
keep their images under card_faces[0] instead of at the top level. The art
crop is downloaded once into data/art/ and served from there, so pages never
hotlink Scryfall and keep working offline.
"""
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request

API = "https://api.scryfall.com"
HEADERS = {"User-Agent": "mtg-tracker/2.0 (home server)", "Accept": "application/json"}
SAFE_ID = re.compile(r"^[0-9a-f-]{36}$")

_last_call = 0.0


class NotFound(Exception):
    pass


def _get(url, raw=False):
    # Scryfall asks for at most ~10 requests a second.
    global _last_call
    wait = 0.1 - (time.monotonic() - _last_call)
    if wait > 0:
        time.sleep(wait)
    _last_call = time.monotonic()
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = resp.read()
    except urllib.error.HTTPError as e:
        if e.code == 404:
            raise NotFound() from e
        raise
    return data if raw else json.loads(data)


def autocomplete(q):
    q = (q or "").strip()
    if len(q) < 2:
        return []
    data = _get(f"{API}/cards/autocomplete?" + urllib.parse.urlencode({"q": q}))
    return data.get("data", [])[:10]


def lookup(name):
    """The card's name, id, colour identity, artist and art-crop URL."""
    card = _get(f"{API}/cards/named?" + urllib.parse.urlencode({"fuzzy": name}))
    face = card if "image_uris" in card else (card.get("card_faces") or [{}])[0]
    art = (face.get("image_uris") or {}).get("art_crop")
    if not art or not SAFE_ID.match(card.get("id", "")):
        raise NotFound()
    return {
        "name": card["name"],
        "id": card["id"],
        "colors": card.get("color_identity") or [],
        "artist": face.get("artist") or card.get("artist") or "",
        "art_url": art,
    }


def download_art(card, art_dir):
    """Save the art crop as <id>.jpg (once) and return the file name."""
    art_dir.mkdir(parents=True, exist_ok=True)
    fname = f"{card['id']}.jpg"
    target = art_dir / fname
    if not target.exists():
        tmp = target.with_suffix(".part")
        tmp.write_bytes(_get(card["art_url"], raw=True))
        tmp.replace(target)
    return fname
