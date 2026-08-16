import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from projectpilot.ai.context_builder import (
    build_discovery_context,
    build_planning_context,
    build_requirements_context,
    build_tasks_context,
)
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
from projectpilot.persistence.models.planning_tasks import Epic, Feature, Task, TaskStatus
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


@router.post("/generate-epics-features", response_model=AISuggestionResponse)
async def generate_epics_features(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    context = await build_planning_context(project_id, db)
    prompt = get_prompt("EPIC_FEATURE_GEN", evidence=context)

    result_data = await gemini_adapter.generate_structured(
        prompt=prompt,
        system_instruction=SYSTEM_LANGUAGE_INSTRUCTION,
        capability="EPIC_FEATURE_GEN",
    )

    suggestion = AISuggestion(
        project_id=project_id,
        capability="EPIC_FEATURE_GEN",
        title="Rekomendasi Pemetaan Modul (Epics) & Sub-Fitur (Features)",
        suggested_data=result_data,
        evidence_sources={"evidence_preview": context[:300]},
        status=AISuggestionStatus.GENERATED,
    )
    db.add(suggestion)
    await db.commit()
    await db.refresh(suggestion)
    return suggestion


@router.post("/generate-tasks", response_model=AISuggestionResponse)
async def generate_tasks(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    context = await build_tasks_context(project_id, db)
    prompt = get_prompt("TASK_BREAKDOWN_GEN", evidence=context)

    result_data = await gemini_adapter.generate_structured(
        prompt=prompt,
        system_instruction=SYSTEM_LANGUAGE_INSTRUCTION,
        capability="TASK_BREAKDOWN_GEN",
    )

    suggestion = AISuggestion(
        project_id=project_id,
        capability="TASK_BREAKDOWN_GEN",
        title="Rekomendasi Auto-Breakdown Task Teknis Kanban (WBS)",
        suggested_data=result_data,
        evidence_sources={"evidence_preview": context[:300]},
        status=AISuggestionStatus.GENERATED,
    )
    db.add(suggestion)
    await db.commit()
    await db.refresh(suggestion)
    return suggestion


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
    suggested_data = suggestion.suggested_data or {}
    if isinstance(suggested_data, list):
        questions_data = suggested_data
    elif isinstance(suggested_data, dict):
        questions_data = (
            suggested_data.get("questions")
            or suggested_data.get("discovery_questions")
            or suggested_data.get("items")
            or []
        )
    else:
        questions_data = []

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

    suggested_data = suggestion.suggested_data or {}
    if isinstance(suggested_data, list):
        reqs_data = suggested_data
    elif isinstance(suggested_data, dict):
        reqs_data = (
            suggested_data.get("requirements")
            or suggested_data.get("candidate_requirements")
            or suggested_data.get("discovery_requirements")
            or suggested_data.get("items")
            or []
        )
    else:
        reqs_data = []

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


@router.post("/suggestions/{suggestion_id}/accept-epics-features")
async def accept_epics_features_suggestion(
    project_id: uuid.UUID,
    suggestion_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    """Transactional acceptance: converts AI suggested Epics & Features into authoritative records."""
    query = select(AISuggestion).where(
        AISuggestion.id == suggestion_id, AISuggestion.project_id == project_id
    )
    res = await db.execute(query)
    suggestion = res.scalar_one_or_none()
    if not suggestion:
        raise HTTPException(status_code=404, detail="AI Suggestion not found.")

    suggested_data = suggestion.suggested_data or {}
    if isinstance(suggested_data, list):
        epics_data = suggested_data
    elif isinstance(suggested_data, dict):
        epics_data = suggested_data.get("epics") or suggested_data.get("items") or []
    else:
        epics_data = []

    if not epics_data:
        raise HTTPException(status_code=400, detail="No epics data in suggestion.")

    # Get existing requirements map (key -> id)
    reqs_res = await db.execute(select(Requirement).where(Requirement.project_id == project_id))
    reqs_map = {r.key: r.id for r in reqs_res.scalars().all()}

    # Count existing epics for fallback keys
    e_res = await db.execute(select(Epic).where(Epic.project_id == project_id))
    existing_epics_count = len(e_res.scalars().all())

    created_epics_count = 0
    created_features_count = 0

    for e_idx, e_item in enumerate(epics_data):
        e_key = e_item.get("key") or f"EPIC-{(existing_epics_count + e_idx + 1):02d}"
        
        # Check if epic already exists
        existing_epic_q = select(Epic).where(Epic.project_id == project_id, Epic.key == e_key)
        existing_epic_res = await db.execute(existing_epic_q)
        epic = existing_epic_res.scalar_one_or_none()

        if not epic:
            epic = Epic(
                project_id=project_id,
                key=e_key,
                title=e_item.get("title", f"Modul {e_key}"),
                description=e_item.get("description"),
                status="PLANNED",
            )
            db.add(epic)
            await db.flush()
            created_epics_count += 1

        # Create features for this epic
        features_list = e_item.get("features", [])
        for f_idx, f_item in enumerate(features_list):
            f_key = f_item.get("key") or f"FEAT-{(created_features_count + 1):02d}"
            req_key = f_item.get("requirement_key")
            req_id = reqs_map.get(req_key) if req_key else None

            feat = Feature(
                project_id=project_id,
                epic_id=epic.id,
                requirement_id=req_id,
                key=f_key,
                title=f_item.get("title", f"Fitur {f_key}"),
                description=f_item.get("description"),
                status="PLANNED",
            )
            db.add(feat)
            created_features_count += 1

    suggestion.status = AISuggestionStatus.ACCEPTED
    suggestion.reviewed_by_id = current_user.id
    suggestion.reviewed_at = utc_now()
    suggestion.review_notes = f"Diterima: {created_epics_count} Epics dan {created_features_count} Features ditambahkan."

    await db.commit()
    return {
        "status": "SUCCESS",
        "created_epics_count": created_epics_count,
        "created_features_count": created_features_count,
        "message": f"Berhasil menambahkan {created_epics_count} Epics dan {created_features_count} Features ke daftar perencanaan.",
    }


@router.post("/suggestions/{suggestion_id}/accept-tasks")
async def accept_tasks_suggestion(
    project_id: uuid.UUID,
    suggestion_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    """Transactional acceptance: converts AI suggested tasks into Kanban task records with default 0 estimated hours."""
    query = select(AISuggestion).where(
        AISuggestion.id == suggestion_id, AISuggestion.project_id == project_id
    )
    res = await db.execute(query)
    suggestion = res.scalar_one_or_none()
    if not suggestion:
        raise HTTPException(status_code=404, detail="AI Suggestion not found.")

    suggested_data = suggestion.suggested_data or {}
    if isinstance(suggested_data, list):
        tasks_data = suggested_data
    elif isinstance(suggested_data, dict):
        tasks_data = suggested_data.get("tasks") or suggested_data.get("items") or []
    else:
        tasks_data = []

    if not tasks_data:
        raise HTTPException(status_code=400, detail="No tasks data in suggestion.")

    # Get epics and features map
    epics_res = await db.execute(select(Epic).where(Epic.project_id == project_id))
    epics_map = {e.key: e.id for e in epics_res.scalars().all()}

    feats_res = await db.execute(select(Feature).where(Feature.project_id == project_id))
    feats_map = {f.key: f.id for f in feats_res.scalars().all()}

    # Count existing tasks
    t_res = await db.execute(select(Task).where(Task.project_id == project_id))
    existing_tasks_count = len(t_res.scalars().all())

    created_tasks = []
    for idx, t_item in enumerate(tasks_data):
        t_key = t_item.get("key") or f"TASK-{(existing_tasks_count + idx + 1):03d}"
        epic_key = t_item.get("epic_key")
        feat_key = t_item.get("feature_key")

        epic_id = epics_map.get(epic_key) if epic_key else None
        feat_id = feats_map.get(feat_key) if feat_key else None

        role = t_item.get("suggested_role", "")
        role_tag = f"[{role}] " if role else ""

        task = Task(
            project_id=project_id,
            epic_id=epic_id,
            feature_id=feat_id,
            key=t_key,
            title=f"{role_tag}{t_item.get('title', 'Tugas Teknis')}",
            description=t_item.get("description"),
            status=TaskStatus.BACKLOG,
            priority=t_item.get("priority", "MEDIUM"),
            estimated_hours=0.0,  # Strict user requirement: default 0 hours
            actual_hours=0.0,
            order_index=existing_tasks_count + idx,
        )
        db.add(task)
        created_tasks.append(task)

    suggestion.status = AISuggestionStatus.ACCEPTED
    suggestion.reviewed_by_id = current_user.id
    suggestion.reviewed_at = utc_now()
    suggestion.review_notes = f"Diterima: {len(created_tasks)} tasks ditambahkan ke Kanban Backlog (Estimasi: 0 jam)."

    await db.commit()
    return {
        "status": "SUCCESS",
        "created_count": len(created_tasks),
        "message": f"Berhasil menambahkan {len(created_tasks)} tugas ke papan Kanban Backlog.",
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
