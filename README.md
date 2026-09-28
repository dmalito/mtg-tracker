# MTG Tracker — Docker deployment

Single container: Express serves both the built Svelte frontend and the API
at the root of port 5001. The frontend uses only relative URLs (Vite
`base: './'`, API base `api`), so the same build also works behind Apache at
any path prefix, e.g. `http://home-server/mtg-tracker/`.

## 1. Deploy

```bash
# on the server, inside this directory
docker compose up -d --build
```

This builds the frontend in a throwaway stage, then runs the Express server
on port 5001, serving:
- `http://localhost:5001/`           → app
- `http://localhost:5001/api/...`    → API
- `http://localhost:5001/api/health` → `{"ok":true}`

Old `/mtg-tracker/...` URLs on this port redirect to the root.

Your existing game/deck/player data (`data/mtg.db`) is already included in
this bundle and is bind-mounted into the container, so it'll be there from
the first `up`. Any future edits happen in `data/mtg.db` on the host and
survive `docker compose up -d --build` (no volume, no data loss).

## 2. Apache — proxy it in

Because every URL the frontend uses is relative, a plain prefix-stripping
proxy pass is enough — no `mod_proxy_html` URL rewriting, and nothing in the
build knows the prefix. The homeserver's `apps.conf` has:

```apache
RedirectMatch ^/mtg-tracker$ /mtg-tracker/
ProxyPass        /mtg-tracker/ http://127.0.0.1:5001/
ProxyPassReverse /mtg-tracker/ http://127.0.0.1:5001/
```

Then:

```bash
sudo apache2ctl configtest
sudo systemctl reload apache2
```

Visit `http://home-server/mtg-tracker/`. The same lines work in any other
vhost (e.g. `testing.conf` on :8090) at whatever prefix you like.

## 3. Wire it into the gioco-immaginazione homepage

Same pattern as the Clash of Saints link: add a card/link pointing at
`/mtg-tracker/` wherever it makes sense on the site (e.g. a "Tools" or
"Games" section). Nothing here needs to change on the tracker side for
that — it's just an outbound `<a href="/mtg-tracker/">`.

## What changed from the original code

- `backend/db.js` — sqlite path now respects `DATA_DIR` (defaults to
  the app folder if unset) so the database can live on a mounted volume
  instead of inside the image.
- `backend/server.js` — now also serves the built frontend as static
  files, next to the API under `/api/*`, so one process/port serves
  everything Apache proxies.
- Everything else (ELO engine, routes, all Svelte components/styling) is
  untouched — it was already solid.

## Local dev (unchanged)

```bash
# terminal 1
cd backend && npm install && npm run dev     # :3002

# terminal 2
cd frontend && npm install && npm run dev    # :5173, proxies to :3002 via .env.development
```
