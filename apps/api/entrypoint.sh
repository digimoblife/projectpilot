#!/bin/bash
set -e

echo "=== [ProjectPilot API] Initializing Production Startup ==="

echo "[ProjectPilot API] Ensuring Alembic version table exists..."
alembic ensure_version

echo "[ProjectPilot API] Ensuring Alembic version column supports long revision IDs..."

python - <<'PY'
import asyncio
import os

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine


async def main() -> None:
    database_url = os.environ["DATABASE_URL"]

    engine = create_async_engine(database_url)

    try:
        async with engine.begin() as connection:
            result = await connection.execute(
                text(
                    """
                    SELECT character_maximum_length
                    FROM information_schema.columns
                    WHERE table_schema = current_schema()
                      AND table_name = 'alembic_version'
                      AND column_name = 'version_num'
                    """
                )
            )

            current_length = result.scalar_one_or_none()

            if current_length is None:
                raise RuntimeError(
                    "alembic_version.version_num was not found after "
                    "alembic ensure_version"
                )

            print(
                f"[ProjectPilot API] Current Alembic version column length: "
                f"{current_length}"
            )

            if current_length < 128:
                await connection.execute(
                    text(
                        """
                        ALTER TABLE alembic_version
                        ALTER COLUMN version_num TYPE VARCHAR(128)
                        """
                    )
                )

                print(
                    "[ProjectPilot API] Alembic version column widened "
                    "to VARCHAR(128)."
                )
            else:
                print(
                    "[ProjectPilot API] Alembic version column already "
                    "supports long revision IDs."
                )

    finally:
        await engine.dispose()


asyncio.run(main())
PY

echo "[ProjectPilot API] Running database migrations (alembic upgrade head)..."
alembic upgrade head
echo "[ProjectPilot API] Migrations applied successfully."

echo "[ProjectPilot API] Starting API application with multi-worker ASGI server..."

exec uvicorn projectpilot.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers ${WORKER_COUNT:-2} \
  --proxy-headers \
  --forwarded-allow-ips='*'
