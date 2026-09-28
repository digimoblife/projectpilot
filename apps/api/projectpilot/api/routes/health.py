from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from projectpilot.core.config import settings
from projectpilot.persistence.database import get_db
from projectpilot.services.storage import LocalStorageProvider, get_storage_provider

router = APIRouter(tags=["Health & Diagnostics"])


@router.get("/health", summary="Liveness Probe")
async def liveness():
    """
    Kubernetes / Docker Compose liveness probe.
    Returns 200 OK if the process is alive.
    """
    return {
        "status": "ok",
        "service": "projectpilot-api",
        "environment": settings.ENVIRONMENT,
    }


@router.get("/ready", summary="Readiness Probe")
@router.get("/health/ready", summary="Readiness Probe Alias")
async def readiness(db: AsyncSession = Depends(get_db)):  # noqa: B008
    """
    Kubernetes / Docker Compose readiness probe.
    Verifies database connection, AI service configuration, and storage readiness.
    """
    diagnostics = {
        "status": "ready",
        "database": "unknown",
        "ai_service": "configured" if bool(settings.GEMINI_API_KEY) else "unconfigured",
        "storage": "unknown",
        "environment": settings.ENVIRONMENT,
    }

    try:
        await db.execute(text("SELECT 1"))
        diagnostics["database"] = "connected"
    except Exception as exc:  # noqa: BLE001
        diagnostics["status"] = "not_ready"
        diagnostics["database"] = "disconnected"
        diagnostics["error"] = str(exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=diagnostics,
        )

    try:
        storage_provider = get_storage_provider()
        if (
            isinstance(storage_provider, LocalStorageProvider)
            and not storage_provider.base_dir.exists()
        ):
            raise FileNotFoundError(
                f"Storage directory '{storage_provider.base_dir}' does not exist."
            )
        diagnostics["storage"] = "ready"
    except Exception as exc:  # noqa: BLE001
        diagnostics["status"] = "not_ready"
        diagnostics["storage"] = "error"
        diagnostics["error"] = str(exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=diagnostics,
        )

    return diagnostics
