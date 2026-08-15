import logging
import uuid
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from projectpilot.ai.gemini_adapter import gemini_adapter
from projectpilot.ai.prompt_registry import SYSTEM_LANGUAGE_INSTRUCTION, get_prompt
from projectpilot.persistence.base import utc_now
from projectpilot.persistence.models.ai import (
    AIJob,
    AIJobStatus,
    AISuggestion,
    AISuggestionStatus,
)

logger = logging.getLogger(__name__)


async def claim_next_pending_job(db: AsyncSession, worker_id: str) -> Optional[AIJob]:
    """Concurrency-safe job claiming for durable PostgreSQL queue."""
    query = (
        select(AIJob)
        .where(AIJob.status == AIJobStatus.PENDING)
        .order_by(AIJob.created_at.asc())
        .limit(1)
    )
    result = await db.execute(query)
    job = result.scalar_one_or_none()

    if job:
        job.status = AIJobStatus.PROCESSING
        job.claimed_by = worker_id
        job.claimed_at = utc_now()
        await db.commit()
        await db.refresh(job)
        return job

    return None


async def execute_ai_job(job_id: uuid.UUID, db: AsyncSession) -> AIJob:
    """Executes an AI job by invoking Gemini adapter and generating AISuggestion."""
    query = select(AIJob).where(AIJob.id == job_id)
    res = await db.execute(query)
    job = res.scalar_one_or_none()

    if not job:
        raise ValueError(f"AIJob {job_id} not found.")

    job.status = AIJobStatus.PROCESSING
    job.claimed_at = utc_now()
    await db.commit()

    try:
        payload = job.payload or {}
        evidence_text = payload.get("evidence", "")
        question_text = payload.get("question", "")

        prompt = get_prompt(
            job.job_type,
            evidence=evidence_text,
            question=question_text,
        )

        # Call Gemini 3.5 Flash-Lite
        result_data = await gemini_adapter.generate_structured(
            prompt=prompt,
            system_instruction=SYSTEM_LANGUAGE_INSTRUCTION,
            capability=job.job_type,
        )

        job.result = result_data
        job.status = AIJobStatus.COMPLETED
        job.completed_at = utc_now()

        # If project_id exists, create an AISuggestion for Human Approval Gate
        if job.project_id:
            suggestion = AISuggestion(
                project_id=job.project_id,
                job_id=job.id,
                capability=job.job_type,
                title=f"AI Saran: {job.job_type.replace('_', ' ').title()}",
                suggested_data=result_data,
                evidence_sources=payload.get("sources", {"evidence_excerpt": evidence_text[:200]}),
                status=AISuggestionStatus.GENERATED,
            )
            db.add(suggestion)

        await db.commit()
        await db.refresh(job)
        return job

    except Exception as e:
        logger.error(f"Error executing AI job {job.id}: {str(e)}")
        job.retry_count += 1
        job.error_message = str(e)
        if job.retry_count >= job.max_retries:
            job.status = AIJobStatus.FAILED
        else:
            job.status = AIJobStatus.PENDING  # Allow retry
        await db.commit()
        await db.refresh(job)
        return job
