#!/bin/sh
set -e

DB_HOST_VALUE="${DB_HOST:-db}"
DB_PORT_VALUE="${DB_PORT:-5432}"
DB_SCORES_HOST_VALUE="${DB_SCORES_HOST:-db_scores}"
DB_SCORES_PORT_VALUE="${DB_SCORES_PORT:-5432}"
DB_SCORES_USER_VALUE="${DB_SCORES_USER:-$DB_USER}"

echo "Waiting for default database at $DB_HOST_VALUE:$DB_PORT_VALUE ..."
until pg_isready -h "$DB_HOST_VALUE" -p "$DB_PORT_VALUE" -U "$DB_USER" > /dev/null 2>&1; do
  sleep 1
done

echo "Waiting for lab_scores database at $DB_SCORES_HOST_VALUE:$DB_SCORES_PORT_VALUE ..."
until pg_isready -h "$DB_SCORES_HOST_VALUE" -p "$DB_SCORES_PORT_VALUE" -U "$DB_SCORES_USER_VALUE" > /dev/null 2>&1; do
  sleep 1
done

# Migrate BOTH databases. The LabScoresRouter ensures each app's tables land
# in the correct database.
echo "Applying migrations to the default database ..."
python manage.py migrate --database=default --noinput
echo "Applying migrations to the lab_scores database ..."
python manage.py migrate --database=lab_scores --noinput

if [ -n "$DJANGO_SUPERUSER_EMAIL" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
  python manage.py shell <<'PY'
from django.contrib.auth import get_user_model
import os

User = get_user_model()
email = os.environ["DJANGO_SUPERUSER_EMAIL"]
password = os.environ["DJANGO_SUPERUSER_PASSWORD"]
full_name = os.environ.get("DJANGO_SUPERUSER_FULL_NAME") or "Admin User"

if not User.objects.filter(email=email).exists():
    User.objects.create_superuser(email=email, password=password, full_name=full_name)
PY
fi

if [ "${SEED_DEMO_USERS:-true}" = "true" ]; then
  python manage.py shell <<'PY'
from django.contrib.auth import get_user_model

User = get_user_model()

test_users = [
    {
        "email": "trainee@irsp.local",
        "password": "trainee123",
        "role": "trainee",
        "full_name": "Test Trainee",
    },
    {
        "email": "manager@irsp.local",
        "password": "manager123",
        "role": "manager",
        "full_name": "Test Manager",
    },
]

for user_data in test_users:
    email = user_data["email"]
    if not User.objects.filter(email=email).exists():
        User.objects.create_user(
            email=email,
            password=user_data["password"],
            role=user_data["role"],
            full_name=user_data["full_name"],
            is_active=True,
            is_staff=False,
        )
PY
fi

# Seed Lab B (Endpoint Investigation) alerts + telemetry (idempotent).
python manage.py seed_lab_b

# Seed demo accounts + their lab completions (idempotent, replaces any
# pre-existing sample data on first run).
python manage.py seed_demo_scores

exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers "${GUNICORN_WORKERS:-3}" --timeout "${GUNICORN_TIMEOUT:-120}"
