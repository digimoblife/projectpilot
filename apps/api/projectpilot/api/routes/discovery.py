import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from projectpilot.api.deps import get_current_pm, get_db
from projectpilot.api.schemas.discovery import (
    BriefCreateUpdate,
    BriefResponse,
    ClientAnswerCreate,
    ClientAnswerResponse,
    DiscoveryQuestionCreate,
    DiscoveryQuestionResponse,
    DiscoveryQuestionStatusUpdate,
    DiscoveryQuestionUpdate,
)
from projectpilot.domain.discovery_state import is_valid_question_transition
from projectpilot.persistence.models.activity import ActivityEvent
from projectpilot.persistence.models.discovery import (
    Brief,
    ClientAnswer,
    DiscoveryCategory,
    DiscoveryQuestion,
    DiscoveryQuestionStatus,
)
from projectpilot.persistence.models.project import Project
from projectpilot.persistence.models.user import User

router = APIRouter(prefix="/projects/{project_id}", tags=["Discovery"])


# --- Brief Endpoints ---
@router.get("/brief", response_model=BriefResponse)
async def get_project_brief(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(Brief).where(Brief.project_id == project_id)
    result = await db.execute(query)
    brief = result.scalar_one_or_none()
    if not brief:
        raise HTTPException(status_code=404, detail="Brief not found for this project.")
    return brief


@router.put("/brief", response_model=BriefResponse)
async def upsert_project_brief(
    project_id: uuid.UUID,
    brief_in: BriefCreateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    # Verify project exists
    proj_query = select(Project).where(Project.id == project_id)
    proj_res = await db.execute(proj_query)
    project = proj_res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    query = select(Brief).where(Brief.project_id == project_id)
    result = await db.execute(query)
    brief = result.scalar_one_or_none()

    if not brief:
        brief = Brief(
            project_id=project_id,
            objective=brief_in.objective,
            business_context=brief_in.business_context,
            intended_users=brief_in.intended_users,
            expected_functionality=brief_in.expected_functionality,
            constraints=brief_in.constraints,
            known_integrations=brief_in.known_integrations,
            raw_content=brief_in.raw_content,
        )
        db.add(brief)
        activity_desc = f"Brief proyek '{project.name}' berhasil dibuat."
    else:
        update_data = brief_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(brief, field, value)
        activity_desc = f"Brief proyek '{project.name}' diperbarui."

    # Record Activity Event
    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="BRIEF_UPDATED",
        description=activity_desc,
        event_metadata={"project_code": project.code},
    )
    db.add(activity)

    await db.commit()
    await db.refresh(brief)
    return brief


# --- Discovery Question Endpoints ---
@router.get("/discovery-questions", response_model=List[DiscoveryQuestionResponse])
async def list_discovery_questions(
    project_id: uuid.UUID,
    category: Optional[DiscoveryCategory] = None,
    question_status: Optional[DiscoveryQuestionStatus] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(DiscoveryQuestion)
        .options(selectinload(DiscoveryQuestion.answers))
        .where(DiscoveryQuestion.project_id == project_id)
        .order_by(DiscoveryQuestion.order_index.asc(), DiscoveryQuestion.created_at.asc())
    )

    if category:
        query = query.where(DiscoveryQuestion.category == category)

    if question_status:
        query = query.where(DiscoveryQuestion.status == question_status)

    result = await db.execute(query)
    return result.scalars().all()


@router.post(
    "/discovery-questions",
    response_model=DiscoveryQuestionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_discovery_question(
    project_id: uuid.UUID,
    question_in: DiscoveryQuestionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    # Verify project exists
    proj_query = select(Project).where(Project.id == project_id)
    proj_res = await db.execute(proj_query)
    if not proj_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found.")

    question = DiscoveryQuestion(
        project_id=project_id,
        parent_question_id=question_in.parent_question_id,
        category=question_in.category,
        question=question_in.question,
        rationale=question_in.rationale,
        priority=question_in.priority,
        order_index=question_in.order_index or 0,
        status=DiscoveryQuestionStatus.DRAFT,
    )
    db.add(question)
    await db.commit()
    await db.refresh(question)

    query = (
        select(DiscoveryQuestion)
        .options(selectinload(DiscoveryQuestion.answers))
        .where(DiscoveryQuestion.id == question.id)
    )
    res = await db.execute(query)
    return res.scalar_one()


@router.get("/discovery-questions/{question_id}", response_model=DiscoveryQuestionResponse)
async def get_discovery_question(
    project_id: uuid.UUID,
    question_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(DiscoveryQuestion)
        .options(selectinload(DiscoveryQuestion.answers))
        .where(
            DiscoveryQuestion.id == question_id,
            DiscoveryQuestion.project_id == project_id,
        )
    )
    result = await db.execute(query)
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Discovery question not found.")
    return question


@router.put("/discovery-questions/{question_id}", response_model=DiscoveryQuestionResponse)
async def update_discovery_question(
    project_id: uuid.UUID,
    question_id: uuid.UUID,
    question_in: DiscoveryQuestionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(DiscoveryQuestion)
        .options(selectinload(DiscoveryQuestion.answers))
        .where(
            DiscoveryQuestion.id == question_id,
            DiscoveryQuestion.project_id == project_id,
        )
    )
    result = await db.execute(query)
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Discovery question not found.")

    update_data = question_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(question, field, value)

    await db.commit()
    await db.refresh(question)
    return question


@router.post("/discovery-questions/{question_id}/status", response_model=DiscoveryQuestionResponse)
async def update_question_status(
    project_id: uuid.UUID,
    question_id: uuid.UUID,
    status_in: DiscoveryQuestionStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(DiscoveryQuestion)
        .options(selectinload(DiscoveryQuestion.answers))
        .where(
            DiscoveryQuestion.id == question_id,
            DiscoveryQuestion.project_id == project_id,
        )
    )
    result = await db.execute(query)
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Discovery question not found.")

    is_valid, message = is_valid_question_transition(
        current_status=question.status, target_status=status_in.target_status
    )
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=message)

    question.status = status_in.target_status
    await db.commit()
    await db.refresh(question)
    return question


@router.post(
    "/discovery-questions/{question_id}/answers",
    response_model=ClientAnswerResponse,
    status_code=status.HTTP_201_CREATED,
)
async def record_client_answer(
    project_id: uuid.UUID,
    question_id: uuid.UUID,
    answer_in: ClientAnswerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(DiscoveryQuestion).where(
        DiscoveryQuestion.id == question_id,
        DiscoveryQuestion.project_id == project_id,
    )
    result = await db.execute(query)
    question = result.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Discovery question not found.")

    answer = ClientAnswer(
        question_id=question_id,
        answer_text=answer_in.answer_text,
        respondent_name=answer_in.respondent_name,
        respondent_role=answer_in.respondent_role,
        source=answer_in.source,
    )
    db.add(answer)

    # Auto-advance question to ANSWERED if not already closed
    if question.status != DiscoveryQuestionStatus.CLOSED:
        question.status = DiscoveryQuestionStatus.ANSWERED

    # Log Activity Event
    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="DISCOVERY_ANSWER_RECORDED",
        description=f"Jawaban klien dicatat untuk pertanyaan discovery ({question.category.value}).",
        event_metadata={
            "question_id": str(question.id),
            "respondent_name": answer_in.respondent_name,
        },
    )
    db.add(activity)

    await db.commit()
    await db.refresh(answer)
    return answer
