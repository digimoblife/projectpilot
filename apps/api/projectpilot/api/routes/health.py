from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from projectpilot.persistence.database import get_db

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", summary="Liveness Probe")
async def liveness():
    return {"status": "ok", "service": "projectpilot-api"}


@router.get("/ready", summary="Readiness Probe")
async def readiness(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ready", "database": "connected"}
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail={"status": "not_ready", "database": "disconnected", "error": str(exc)},
        )
