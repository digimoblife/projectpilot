import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from projectpilot.api.deps import get_current_pm, get_db
from projectpilot.api.schemas.activity import ActivityEventResponse
from projectpilot.api.schemas.project import (
    ProjectCreate,
    ProjectDetailResponse,
    ProjectResponse,
    ProjectTransitionRequest,
    ProjectUpdate,
)
from projectpilot.domain.project_state import is_valid_project_transition
from projectpilot.persistence.models.activity import ActivityEvent
from projectpilot.persistence.models.client import Client
from projectpilot.persistence.models.project import Project, ProjectHealth, ProjectLifecycleStage
from projectpilot.persistence.models.user import User

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    lifecycle_stage: Optional[ProjectLifecycleStage] = None,
    health: Optional[ProjectHealth] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(Project)
        .options(selectinload(Project.client), selectinload(Project.owner))
        .order_by(Project.created_at.desc())
    )

    if lifecycle_stage:
        query = query.where(Project.lifecycle_stage == lifecycle_stage)
    if health:
        query = query.where(Project.health == health)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_in: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    # Verify Client exists
    client_query = select(Client).where(Client.id == project_in.client_id)
    client_res = await db.execute(client_query)
    client = client_res.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found.")

    # Check project code uniqueness
    code_query = select(Project).where(Project.code == project_in.code)
    code_res = await db.execute(code_query)
    if code_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Project code '{project_in.code}' already exists.")

    project = Project(
        name=project_in.name,
        code=project_in.code,
        description=project_in.description,
        client_id=project_in.client_id,
        owner_id=current_user.id,
        lifecycle_stage=ProjectLifecycleStage.DISCOVERY,
        health=ProjectHealth.HEALTHY,
        start_date=project_in.start_date,
        target_completion_date=project_in.target_completion_date,
    )
    db.add(project)
    await db.flush()

    # Record Activity Event
    activity = ActivityEvent(
        project_id=project.id,
        actor_id=current_user.id,
        event_type="PROJECT_CREATED",
        description=f"Proyek '{project.name}' ({project.code}) berhasil dibuat pada tahap Discovery.",
        event_metadata={
            "lifecycle_stage": project.lifecycle_stage.value,
            "client_name": client.name,
        },
    )
    db.add(activity)
    await db.commit()

    # Re-fetch with relationships
    query = (
        select(Project)
        .options(selectinload(Project.client), selectinload(Project.owner))
        .where(Project.id == project.id)
    )
    result = await db.execute(query)
    return result.scalar_one()


@router.get("/{project_id}", response_model=ProjectDetailResponse)
async def get_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(Project)
        .options(
            selectinload(Project.client),
            selectinload(Project.owner),
            selectinload(Project.activities).selectinload(ActivityEvent.actor),
        )
        .where(Project.id == project_id)
    )
    result = await db.execute(query)
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: uuid.UUID,
    project_in: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(Project)
        .options(selectinload(Project.client), selectinload(Project.owner))
        .where(Project.id == project_id)
    )
    result = await db.execute(query)
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    update_data = project_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)

    activity = ActivityEvent(
        project_id=project.id,
        actor_id=current_user.id,
        event_type="PROJECT_UPDATED",
        description=f"Detail proyek '{project.name}' diperbarui.",
        event_metadata={"updated_fields": list(update_data.keys())},
    )
    db.add(activity)

    await db.commit()
    await db.refresh(project)
    return project


@router.post("/{project_id}/transition", response_model=ProjectResponse)
async def transition_project_stage(
    project_id: uuid.UUID,
    transition_in: ProjectTransitionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(Project)
        .options(selectinload(Project.client), selectinload(Project.owner))
        .where(Project.id == project_id)
    )
    result = await db.execute(query)
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    is_valid, message = is_valid_project_transition(
        current_stage=project.lifecycle_stage, target_stage=transition_in.target_stage
    )
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=message)

    previous_stage = project.lifecycle_stage
    project.lifecycle_stage = transition_in.target_stage

    activity = ActivityEvent(
        project_id=project.id,
        actor_id=current_user.id,
        event_type="PROJECT_STAGE_CHANGED",
        description=f"Tahapan proyek berubah dari '{previous_stage.value}' ke '{transition_in.target_stage.value}'.",
        event_metadata={
            "from_stage": previous_stage.value,
            "to_stage": transition_in.target_stage.value,
            "reason": transition_in.reason,
        },
    )
    db.add(activity)

    await db.commit()
    await db.refresh(project)
    return project


@router.get("/{project_id}/activities", response_model=List[ActivityEventResponse])
async def list_project_activities(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(ActivityEvent)
        .options(selectinload(ActivityEvent.actor))
        .where(ActivityEvent.project_id == project_id)
        .order_by(ActivityEvent.created_at.desc())
    )
    result = await db.execute(query)
    return result.scalars().all()
