# ── Stage 1: build the Svelte/Vite frontend ─────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
# Relative asset and API URLs (vite base './', API base 'api') are baked into
# the build here, so it works at / and behind Apache at /mtg-tracker/.
RUN npm run build

# ── Stage 2: runtime — Express serves the API and the built frontend ───────
# node:20-slim (Debian) rather than alpine, since sqlite3's native bindings
# are more reliably prebuilt for glibc than for musl.
FROM node:20-slim
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5001
ENV DATA_DIR=/app/data

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/db.js backend/server.js ./
COPY backend/routes/ ./routes/

# Built frontend assets, served statically by Express at /
COPY --from=frontend-build /app/frontend/dist ./public

# Data directory for the sqlite db — expected to be bind-mounted so it
# persists across image rebuilds (see docker-compose.yml)
RUN mkdir -p /app/data

EXPOSE 5001
CMD ["node", "server.js"]
