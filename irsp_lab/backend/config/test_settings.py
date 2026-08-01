"""Local test settings: two SQLite databases instead of PostgreSQL.

Used ONLY for local integration testing of the lab_scores integration.
Production keeps the PostgreSQL configuration in settings.py.
"""
import os

# settings.py validates these env vars at import time.
os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASSWORD", "test")
os.environ.setdefault("DJANGO_SECRET_KEY", "test-secret-key")
os.environ.setdefault("DEBUG", "True")

from .settings import *  # noqa: E402,F401,F403
from pathlib import Path  # noqa: E402

_BASE = Path(__file__).resolve().parent.parent

# Allow the local static-server origin during integration testing only.
CORS_ALLOW_ALL_ORIGINS = True

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": str(_BASE / "test_default.sqlite3"),
    },
    "lab_scores": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": str(_BASE / "test_lab_scores.sqlite3"),
    },
}
