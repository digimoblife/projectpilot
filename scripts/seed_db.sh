#!/usr/bin/env bash
# =============================================================================
# ProjectPilot Database Seed Helper Script
# =============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=== [ProjectPilot Seed] Running Idempotent Database Seeding ==="

if [ -f "${ROOT_DIR}/apps/api/.venv/bin/python" ]; then
    echo "[Seed] Using local Python virtual environment..."
    cd "${ROOT_DIR}/apps/api"
    .venv/bin/python -m projectpilot.scripts.seed
elif command -v docker &> /dev/null && docker ps | grep -q "projectpilot_api"; then
    echo "[Seed] Using running Docker container (projectpilot_api)..."
    docker exec -t projectpilot_api python -m projectpilot.scripts.seed
else
    echo "[Seed] Running via default python3 in apps/api..."
    cd "${ROOT_DIR}/apps/api"
    python3 -m projectpilot.scripts.seed
fi

echo "=== [ProjectPilot Seed] Seeding finished successfully! ==="
