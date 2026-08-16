#!/bin/bash
set -e

echo "=== [ProjectPilot API] Initializing Production Startup ==="

# 1. Run Alembic Database Migrations
echo "[ProjectPilot API] Running database migrations (alembic upgrade head)..."
alembic upgrade head
echo "[ProjectPilot API] Migrations applied successfully."

# 2. Start Application Server
echo "[ProjectPilot API] Starting API application with multi-worker ASGI server..."
exec uvicorn projectpilot.main:app --host 0.0.0.0 --port 8000 --workers ${WORKER_COUNT:-2} --proxy-headers --forwarded-allow-ips='*'
