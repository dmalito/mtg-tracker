# MTG Tracker — Docker deployment

Single container: Express serves both the built Svelte frontend and the API,
both mounted under `/mtg-tracker` (matching the Vite `base` and
`VITE_API_URL` that were already set in `frontend/.env`).

## 1. Deploy

```bash
# on the server, inside this directory
docker compose up -d --build
```

This builds the frontend in a throwaway stage, then runs the Express server
on port 5001, serving:
- `http://localhost:5001/mtg-tracker/`        → app
- `http://localhost:5001/mtg-tracker/api/...` → API
- `http://localhost:5001/mtg-tracker/api/health` → `{"ok":true}`

Your existing game/deck/player data (`data/mtg.db`) is already included in
this bundle and is bind-mounted into the container, so it'll be there from
the first `up`. Any future edits happen in `data/mtg.db` on the host and
survive `docker compose up -d --build` (no volume, no data loss).

## 2. Apache — proxy it in

Because the frontend's asset paths are already baked with the `/mtg-tracker/`
prefix (`vite.config.js` → `base: '/mtg-tracker/'`), a plain proxy pass is
enough — no `mod_proxy_html` URL rewriting needed here, unlike Clash of
Saints. Add this to `testing.conf` (inside the `<VirtualHost>` block,
alongside the Clash of Saints proxy lines):

```apache
ProxyPass        /mtg-tracker/ http://localhost:5001/mtg-tracker/
ProxyPassReverse /mtg-tracker/ http://localhost:5001/mtg-tracker/
```

Then:

```bash
sudo apache2ctl configtest
sudo systemctl reload apache2
```

Visit `http://<your-host>:8090/mtg-tracker/` (or through the Cloudflare
tunnel, same path).

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
  files under `/mtg-tracker`, and mounts the API under
  `/mtg-tracker/api/*` instead of bare `/api/*`, so one process/port can
  serve everything Apache proxies. Also redirects `/` and `/mtg-tracker`
  (no trailing slash) to `/mtg-tracker/`.
- Everything else (ELO engine, routes, all Svelte components/styling) is
  untouched — it was already solid.

## Local dev (unchanged)

```bash
# terminal 1
cd backend && npm install && npm run dev     # :3002

# terminal 2
cd frontend && npm install && npm run dev    # :5173, proxies to :3002 via .env.development
```
