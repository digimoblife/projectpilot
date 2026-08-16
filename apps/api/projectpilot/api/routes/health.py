import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from projectpilot.core.config import settings
from projectpilot.persistence.database import get_db

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
async def readiness(db: AsyncSession = Depends(get_db)):
    """
    Kubernetes / Docker Compose readiness probe.
    Verifies database connection and AI service configuration.
    """
    diagnostics = {
        "status": "ready",
        "database": "unknown",
        "ai_service": "configured" if bool(settings.GEMINI_API_KEY) else "unconfigured",
        "environment": settings.ENVIRONMENT,
    }

    try:
        await db.execute(text("SELECT 1"))
        diagnostics["database"] = "connected"
        return diagnostics
    except Exception as exc:
        diagnostics["status"] = "not_ready"
        diagnostics["database"] = "disconnected"
        diagnostics["error"] = str(exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=diagnostics,
        )
