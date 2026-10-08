FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements.txt -r requirements-dev.txt

COPY . .

ENV DATA_DIR=/app/data
EXPOSE 5001

# First start after the upgrade from the Svelte version: import data/mtg.db
# into data/tracker.db (does nothing once tracker.db exists).
CMD ["sh", "-c", "python3 tools/import_legacy.py --if-new && exec gunicorn --bind 0.0.0.0:5001 --workers 2 --access-logfile - app:app"]
