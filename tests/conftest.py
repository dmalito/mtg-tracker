import pytest

import app as tracker_app


@pytest.fixture
def client(tmp_path):
    tracker_app.app.config.update(TESTING=True, TRACKER_DATA_DIR=str(tmp_path))
    with tracker_app.app.test_client() as c:
        yield c


@pytest.fixture
def log(client):
    def log(seats, fmt="pau", mode="bo1", date="2026-10-01", **extra):
        body = {"date": date, "fmt": fmt, "mode": mode, "notes": "", "seats": seats, **extra}
        return client.post("/api/games", json=body)
    return log
