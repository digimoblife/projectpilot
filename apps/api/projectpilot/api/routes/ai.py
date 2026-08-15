import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from projectpilot.ai.context_builder import build_discovery_context, build_requirements_context
from projectpilot.ai.gemini_adapter import gemini_adapter
from projectpilot.ai.job_runner import execute_ai_job
from projectpilot.ai.prompt_registry import SYSTEM_LANGUAGE_INSTRUCTION, get_prompt
from projectpilot.api.deps import get_current_pm, get_db
from projectpilot.api.schemas.ai import (
    AIJobCreate,
    AIJobResponse,
    AISuggestionResponse,
    AISuggestionReviewRequest,
    AISyncProcessRequest,
    AISyncProcessResponse,
)
from projectpilot.persistence.base import utc_now
from projectpilot.persistence.models.activity import ActivityEvent
from projectpilot.persistence.models.ai import (
    AIJob,
    AIJobStatus,
    AISuggestion,
    AISuggestionStatus,
)
from projectpilot.persistence.models.discovery import (
    DiscoveryCategory,
    DiscoveryQuestion,
    DiscoveryQuestionStatus,
)
from projectpilot.persistence.models.requirements_scope import (
    Requirement,
    RequirementSourceType,
    RequirementStatus,
)
from projectpilot.persistence.models.user import User

router = APIRouter(prefix="/projects/{project_id}/ai", tags=["AI Core & Discovery Intelligence"])


# =========================================================================
# 1. AI JOBS (DURABLE QUEUE)
# =========================================================================
@router.post("/jobs", response_model=AIJobResponse, status_code=status.HTTP_201_CREATED)
async def enqueue_ai_job(
    project_id: uuid.UUID,
    job_in: AIJobCreate,
    auto_execute: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    job = AIJob(
        project_id=project_id,
        job_type=job_in.job_type,
        payload=job_in.payload,
        status=AIJobStatus.PENDING,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    if auto_execute:
        job = await execute_ai_job(job.id, db)

    return job


@router.get("/jobs/{job_id}", response_model=AIJobResponse)
async def get_ai_job(
    project_id: uuid.UUID,
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(AIJob).where(AIJob.id == job_id, AIJob.project_id == project_id)
    res = await db.execute(query)
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="AI Job not found.")
    return job


# =========================================================================
# 2. AI DISCOVERY & REQUIREMENT OPERATIONS
# =========================================================================
@router.post("/analyze-brief", response_model=AISuggestionResponse)
async def analyze_brief(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    context = await build_discovery_context(project_id, db)
    prompt = get_prompt("BRIEF_ANALYSIS", evidence=context)

    result_data = await gemini_adapter.generate_structured(
        prompt=prompt,
        system_instruction=SYSTEM_LANGUAGE_INSTRUCTION,
        capability="BRIEF_ANALYSIS",
    )

    suggestion = AISuggestion(
        project_id=project_id,
        capability="BRIEF_ANALYSIS",
        title="AI Analisis Eksekutif Brief Proyek",
        suggested_data=result_data,
        evidence_sources={"evidence_preview": context[:300]},
        status=AISuggestionStatus.GENERATED,
    )
    db.add(suggestion)

    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="AI_BRIEF_ANALYSIS_GENERATED",
        description="AI menyelesaikan analisis ringkasan brief dan batasan proyek.",
    )
    db.add(activity)

    await db.commit()
    await db.refresh(suggestion)
    return suggestion


@router.post("/generate-questions", response_model=AISuggestionResponse)
async def generate_discovery_questions(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    context = await build_discovery_context(project_id, db)
    prompt = get_prompt("DISCOVERY_QUESTION_GEN", evidence=context)

    result_data = await gemini_adapter.generate_structured(
        prompt=prompt,
        system_instruction=SYSTEM_LANGUAGE_INSTRUCTION,
        capability="DISCOVERY_QUESTION_GEN",
    )

    suggestion = AISuggestion(
        project_id=project_id,
        capability="DISCOVERY_QUESTION_GEN",
        title="AI Rekomendasi Pertanyaan Discovery",
        suggested_data=result_data,
        evidence_sources={"evidence_preview": context[:300]},
        status=AISuggestionStatus.GENERATED,
    )
    db.add(suggestion)

    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="AI_QUESTIONS_GENERATED",
        description="AI menghasilkan daftar pertanyaan discovery terstruktur.",
    )
    db.add(activity)

    await db.commit()
    await db.refresh(suggestion)
    return suggestion


@router.post("/extract-requirements", response_model=AISuggestionResponse)
async def extract_requirements(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    context = await build_requirements_context(project_id, db)
    prompt = get_prompt("REQUIREMENT_EXTRACTION", evidence=context)

    result_data = await gemini_adapter.generate_structured(
        prompt=prompt,
        system_instruction=SYSTEM_LANGUAGE_INSTRUCTION,
        capability="REQUIREMENT_EXTRACTION",
    )

    suggestion = AISuggestion(
        project_id=project_id,
        capability="REQUIREMENT_EXTRACTION",
        title="AI Ekstraksi Kandidat Requirement",
        suggested_data=result_data,
        evidence_sources={"evidence_preview": context[:300]},
        status=AISuggestionStatus.GENERATED,
    )
    db.add(suggestion)

    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="AI_REQUIREMENTS_EXTRACTED",
        description="AI mengekstraksi kandidat requirement dari brief dan hasil discovery.",
    )
    db.add(activity)

    await db.commit()
    await db.refresh(suggestion)
    return suggestion


@router.post("/detect-contradictions", response_model=AISuggestionResponse)
async def detect_contradictions(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    context = await build_requirements_context(project_id, db)
    prompt = get_prompt("CONTRADICTION_DETECTION", evidence=context)

    result_data = await gemini_adapter.generate_structured(
        prompt=prompt,
        system_instruction=SYSTEM_LANGUAGE_INSTRUCTION,
        capability="CONTRADICTION_DETECTION",
    )

    suggestion = AISuggestion(
        project_id=project_id,
        capability="CONTRADICTION_DETECTION",
        title="AI Deteksi Kontradiksi & Gap Spesifikasi",
        suggested_data=result_data,
        evidence_sources={"evidence_preview": context[:300]},
        status=AISuggestionStatus.GENERATED,
    )
    db.add(suggestion)

    await db.commit()
    await db.refresh(suggestion)
    return suggestion


class QAQueryRequest(BaseModel):
    question: str


@router.post("/qa")
async def answer_project_qa(
    project_id: uuid.UUID,
    req: QAQueryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    context = await build_requirements_context(project_id, db)
    prompt = get_prompt("PROJECT_QA", evidence=context, question=req.question)

    result_data = await gemini_adapter.generate_structured(
        prompt=prompt,
        system_instruction=SYSTEM_LANGUAGE_INSTRUCTION,
        capability="PROJECT_QA",
    )
    return result_data


# =========================================================================
# 3. TRANSACTIONAL ACCEPTANCE INTO AUTHORITATIVE ENTITIES
# =========================================================================
@router.post("/suggestions/{suggestion_id}/accept-questions")
async def accept_questions_suggestion(
    project_id: uuid.UUID,
    suggestion_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    """Transactional acceptance: converts AI suggested questions into real DiscoveryQuestion records."""
    query = select(AISuggestion).where(
        AISuggestion.id == suggestion_id, AISuggestion.project_id == project_id
    )
    res = await db.execute(query)
    suggestion = res.scalar_one_or_none()
    if not suggestion:
        raise HTTPException(status_code=404, detail="AI Suggestion not found.")

    questions_data = suggestion.suggested_data.get("questions", [])
    if not questions_data:
        raise HTTPException(status_code=400, detail="No questions data in suggestion.")

    category_map = {
        "TECHNICAL_ARCHITECTURE": DiscoveryCategory.TECHNICAL,
        "PAYMENT_INTEGRATION": DiscoveryCategory.INTEGRATION,
        "INTEGRATIONS_APIS": DiscoveryCategory.INTEGRATION,
        "SECURITY_COMPLIANCE": DiscoveryCategory.SECURITY,
        "BUSINESS_GOALS": DiscoveryCategory.BUSINESS,
        "USER_PERSONAS": DiscoveryCategory.UX,
        "FUNCTIONAL_SCOPE": DiscoveryCategory.FUNCTIONAL,
        "NON_FUNCTIONAL_REQUIREMENTS": DiscoveryCategory.NON_FUNCTIONAL,
        "DATA_MIGRATION": DiscoveryCategory.DATA,
        "TIMELINE_BUDGET": DiscoveryCategory.OPERATIONAL,
        "DESIGN_BRANDING": DiscoveryCategory.UX,
        "RISKS_ASSUMPTIONS": DiscoveryCategory.OPERATIONAL,
        "SUCCESS_METRICS": DiscoveryCategory.REPORTING,
    }

    created_questions = []
    for q_item in questions_data:
        cat_str = q_item.get("category", "TECHNICAL")
        if cat_str in category_map:
            category_enum = category_map[cat_str]
        else:
            try:
                category_enum = DiscoveryCategory[cat_str]
            except KeyError:
                category_enum = DiscoveryCategory.TECHNICAL

        disc_q = DiscoveryQuestion(
            project_id=project_id,
            category=category_enum,
            question=q_item.get("question", ""),
            rationale=q_item.get("context"),
            status=DiscoveryQuestionStatus.DRAFT,
        )
        db.add(disc_q)
        created_questions.append(disc_q)

    # Mark suggestion accepted
    suggestion.status = AISuggestionStatus.ACCEPTED
    suggestion.reviewed_by_id = current_user.id
    suggestion.reviewed_at = utc_now()
    suggestion.review_notes = f"Diterima: {len(created_questions)} pertanyaan ditambahkan ke Discovery."

    await db.commit()
    return {
        "status": "SUCCESS",
        "created_count": len(created_questions),
        "message": f"Berhasil menambahkan {len(created_questions)} pertanyaan ke papan Discovery.",
    }


@router.post("/suggestions/{suggestion_id}/accept-requirements")
async def accept_requirements_suggestion(
    project_id: uuid.UUID,
    suggestion_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    """Transactional acceptance: converts AI suggested requirements into real Requirement records."""
    query = select(AISuggestion).where(
        AISuggestion.id == suggestion_id, AISuggestion.project_id == project_id
    )
    res = await db.execute(query)
    suggestion = res.scalar_one_or_none()
    if not suggestion:
        raise HTTPException(status_code=404, detail="AI Suggestion not found.")

    reqs_data = suggestion.suggested_data.get("requirements", [])
    if not reqs_data:
        raise HTTPException(status_code=400, detail="No requirements data in suggestion.")

    # Fetch total requirements count for key generation
    r_count_res = await db.execute(select(Requirement).where(Requirement.project_id == project_id))
    existing_count = len(r_count_res.scalars().all())

    category_map = {
        "SECURITY": DiscoveryCategory.SECURITY,
        "INTEGRATIONS": DiscoveryCategory.INTEGRATION,
        "CORE_FEATURE": DiscoveryCategory.FUNCTIONAL,
        "FUNCTIONAL": DiscoveryCategory.FUNCTIONAL,
        "PERFORMANCE": DiscoveryCategory.NON_FUNCTIONAL,
        "DATA": DiscoveryCategory.DATA,
        "UI_UX": DiscoveryCategory.UX,
        "TECHNICAL": DiscoveryCategory.TECHNICAL,
    }

    created_reqs = []
    for idx, r_item in enumerate(reqs_data):
        req_key = f"REQ-AI-{(existing_count + idx + 1):03d}"
        criteria_list = r_item.get("acceptance_criteria", [])
        criteria_str = (
            "\n".join(f"- {c}" for c in criteria_list)
            if isinstance(criteria_list, list)
            else str(criteria_list) if criteria_list else None
        )
        cat_str = r_item.get("category", "FUNCTIONAL")
        cat_enum = category_map.get(cat_str, DiscoveryCategory.FUNCTIONAL)

        req = Requirement(
            project_id=project_id,
            key=req_key,
            title=r_item.get("title", "AI Requirement"),
            description=r_item.get("description", "Deskripsi requirement"),
            category=cat_enum,
            priority=r_item.get("priority", "MEDIUM"),
            status=RequirementStatus.DRAFT,
            source_type=RequirementSourceType.BRIEF,
            acceptance_criteria=criteria_str,
            version=1,
        )
        db.add(req)
        created_reqs.append(req)

    # Mark suggestion accepted
    suggestion.status = AISuggestionStatus.ACCEPTED
    suggestion.reviewed_by_id = current_user.id
    suggestion.reviewed_at = utc_now()
    suggestion.review_notes = f"Diterima: {len(created_reqs)} requirement ditambahkan sebagai DRAFT."

    await db.commit()
    return {
        "status": "SUCCESS",
        "created_count": len(created_reqs),
        "message": f"Berhasil menambahkan {len(created_reqs)} requirement ke katalog dalam status DRAFT.",
    }


# =========================================================================
# 4. SUGGESTIONS LIST & GENERIC REVIEW
# =========================================================================
@router.get("/suggestions", response_model=List[AISuggestionResponse])
async def list_ai_suggestions(
    project_id: uuid.UUID,
    status_filter: Optional[AISuggestionStatus] = None,
    capability: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(AISuggestion)
        .where(AISuggestion.project_id == project_id)
        .order_by(AISuggestion.created_at.desc())
    )

    if status_filter:
        query = query.where(AISuggestion.status == status_filter)
    if capability:
        query = query.where(AISuggestion.capability == capability)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/suggestions/{suggestion_id}/review", response_model=AISuggestionResponse)
async def review_ai_suggestion(
    project_id: uuid.UUID,
    suggestion_id: uuid.UUID,
    review_in: AISuggestionReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(AISuggestion).where(
        AISuggestion.id == suggestion_id, AISuggestion.project_id == project_id
    )
    res = await db.execute(query)
    suggestion = res.scalar_one_or_none()
    if not suggestion:
        raise HTTPException(status_code=404, detail="AI Suggestion not found.")

    suggestion.status = review_in.action
    suggestion.reviewed_by_id = current_user.id
    suggestion.reviewed_at = utc_now()
    if review_in.review_notes:
        suggestion.review_notes = review_in.review_notes

    if review_in.action == AISuggestionStatus.EDITED and review_in.edited_data:
        suggestion.suggested_data = review_in.edited_data

    await db.commit()
    await db.refresh(suggestion)
    return suggestion


@router.post("/process-sync", response_model=AISyncProcessResponse)
async def process_ai_sync(
    project_id: uuid.UUID,
    request_in: AISyncProcessRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    payload = request_in.payload or {}
    prompt = get_prompt(
        request_in.capability,
        evidence=payload.get("evidence", ""),
        question=payload.get("question", ""),
    )

    result_data = await gemini_adapter.generate_structured(
        prompt=prompt,
        system_instruction=SYSTEM_LANGUAGE_INSTRUCTION,
    )

    return AISyncProcessResponse(
        capability=request_in.capability,
        result=result_data,
        model_used=gemini_adapter.model_name,
    )
