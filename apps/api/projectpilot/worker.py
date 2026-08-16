import asyncio
import logging
import os
import signal
import socket
import uuid

from projectpilot.ai.job_runner import (
    claim_next_pending_job,
    execute_ai_job,
)
from projectpilot.persistence.database import async_session_factory


logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
)

logger = logging.getLogger("projectpilot.worker")

POLL_INTERVAL_SECONDS = float(
    os.getenv("WORKER_POLL_INTERVAL_SECONDS", "2")
)

WORKER_ID = (
    os.getenv("WORKER_ID")
    or f"{socket.gethostname()}-{uuid.uuid4().hex[:8]}"
)

shutdown_event = asyncio.Event()


def request_shutdown(signum, frame):
    logger.info("Shutdown signal received: %s", signum)
    shutdown_event.set()


async def process_one_job() -> bool:
    async with async_session_factory() as db:
        try:
            job = await claim_next_pending_job(
                db=db,
                worker_id=WORKER_ID,
            )

            if job is None:
                return False

            job_id = job.id
            job_type = job.job_type

            logger.info(
                "Claimed AI job id=%s type=%s worker=%s",
                job_id,
                job_type,
                WORKER_ID,
            )

            result = await execute_ai_job(
                job_id=job_id,
                db=db,
            )

            logger.info(
                "Finished AI job id=%s status=%s",
                result.id,
                result.status,
            )

            return True

        except asyncio.CancelledError:
            await db.rollback()
            raise

        except Exception:
            await db.rollback()
            logger.exception("Unhandled worker iteration failure.")
            return False


async def run_worker() -> None:
    logger.info(
        "ProjectPilot worker starting worker_id=%s poll_interval=%ss",
        WORKER_ID,
        POLL_INTERVAL_SECONDS,
    )

    while not shutdown_event.is_set():
        processed = await process_one_job()

        if processed:
            continue

        try:
            await asyncio.wait_for(
                shutdown_event.wait(),
                timeout=POLL_INTERVAL_SECONDS,
            )
        except asyncio.TimeoutError:
            pass

    logger.info("ProjectPilot worker stopped cleanly.")


def main() -> None:
    signal.signal(signal.SIGTERM, request_shutdown)
    signal.signal(signal.SIGINT, request_shutdown)

    asyncio.run(run_worker())


if __name__ == "__main__":
    main()
