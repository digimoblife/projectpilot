import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from projectpilot.api.deps import get_current_pm, get_db
from projectpilot.api.schemas.planning_tasks import (
    EpicCreate,
    EpicResponse,
    EpicUpdate,
    FeatureCreate,
    FeatureResponse,
    FeatureUpdate,
    TaskCreate,
    TaskResponse,
    TaskStatusUpdate,
    TaskUpdate,
)
from projectpilot.domain.task_state import is_valid_task_transition
from projectpilot.persistence.models.activity import ActivityEvent
from projectpilot.persistence.models.planning_tasks import Epic, Feature, Task, TaskStatus
from projectpilot.persistence.models.project import Project
from projectpilot.persistence.models.user import User

router = APIRouter(prefix="/projects/{project_id}", tags=["Planning & Tasks"])


# =========================================================================
# 1. EPICS ENDPOINTS
# =========================================================================
@router.get("/epics", response_model=List[EpicResponse])
async def list_epics(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(Epic)
        .where(Epic.project_id == project_id)
        .order_by(Epic.key.asc())
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/epics", response_model=EpicResponse, status_code=status.HTTP_201_CREATED)
async def create_epic(
    project_id: uuid.UUID,
    epic_in: EpicCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    epic = Epic(
        project_id=project_id,
        key=epic_in.key,
        title=epic_in.title,
        description=epic_in.description,
        status=epic_in.status or "PLANNED",
    )
    db.add(epic)
    await db.commit()
    await db.refresh(epic)
    return epic


@router.put("/epics/{epic_id}", response_model=EpicResponse)
async def update_epic(
    project_id: uuid.UUID,
    epic_id: uuid.UUID,
    epic_in: EpicUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(Epic).where(Epic.id == epic_id, Epic.project_id == project_id)
    res = await db.execute(query)
    epic = res.scalar_one_or_none()
    if not epic:
        raise HTTPException(status_code=404, detail="Epic not found.")

    update_data = epic_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(epic, field, value)

    await db.commit()
    await db.refresh(epic)
    return epic


# =========================================================================
# 2. FEATURES ENDPOINTS
# =========================================================================
@router.get("/features", response_model=List[FeatureResponse])
async def list_features(
    project_id: uuid.UUID,
    epic_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(Feature).where(Feature.project_id == project_id).order_by(Feature.key.asc())
    if epic_id:
        query = query.where(Feature.epic_id == epic_id)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/features", response_model=FeatureResponse, status_code=status.HTTP_201_CREATED)
async def create_feature(
    project_id: uuid.UUID,
    feat_in: FeatureCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    feature = Feature(
        project_id=project_id,
        epic_id=feat_in.epic_id,
        requirement_id=feat_in.requirement_id,
        key=feat_in.key,
        title=feat_in.title,
        description=feat_in.description,
        status=feat_in.status or "PLANNED",
    )
    db.add(feature)
    await db.commit()
    await db.refresh(feature)
    return feature


@router.put("/features/{feature_id}", response_model=FeatureResponse)
async def update_feature(
    project_id: uuid.UUID,
    feature_id: uuid.UUID,
    feat_in: FeatureUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(Feature).where(Feature.id == feature_id, Feature.project_id == project_id)
    res = await db.execute(query)
    feature = res.scalar_one_or_none()
    if not feature:
        raise HTTPException(status_code=404, detail="Feature not found.")

    update_data = feat_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(feature, field, value)

    await db.commit()
    await db.refresh(feature)
    return feature


# =========================================================================
# 3. TASKS ENDPOINTS (KANBAN & LIST SHARED ENGINE)
# =========================================================================
@router.get("/tasks", response_model=List[TaskResponse])
async def list_tasks(
    project_id: uuid.UUID,
    task_status: Optional[TaskStatus] = None,
    epic_id: Optional[uuid.UUID] = None,
    feature_id: Optional[uuid.UUID] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(Task)
        .where(Task.project_id == project_id)
        .order_by(Task.order_index.asc(), Task.created_at.asc())
    )

    if task_status:
        query = query.where(Task.status == task_status)
    if epic_id:
        query = query.where(Task.epic_id == epic_id)
    if feature_id:
        query = query.where(Task.feature_id == feature_id)
    if priority:
        query = query.where(Task.priority == priority)
    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                Task.key.ilike(pattern),
                Task.title.ilike(pattern),
                Task.assignee_name.ilike(pattern),
            )
        )

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    project_id: uuid.UUID,
    task_in: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    proj_query = select(Project).where(Project.id == project_id)
    proj_res = await db.execute(proj_query)
    project = proj_res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    task = Task(
        project_id=project_id,
        epic_id=task_in.epic_id,
        feature_id=task_in.feature_id,
        requirement_id=task_in.requirement_id,
        scope_item_id=task_in.scope_item_id,
        parent_task_id=task_in.parent_task_id,
        key=task_in.key,
        title=task_in.title,
        description=task_in.description,
        status=task_in.status or TaskStatus.BACKLOG,
        priority=task_in.priority or "MEDIUM",
        estimated_hours=task_in.estimated_hours,
        actual_hours=task_in.actual_hours,
        assignee_name=task_in.assignee_name,
        due_date=task_in.due_date,
        order_index=task_in.order_index or 0,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


@router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(Task).where(Task.id == task_id, Task.project_id == project_id)
    res = await db.execute(query)
    task = res.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    return task


@router.put("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    task_in: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(Task).where(Task.id == task_id, Task.project_id == project_id)
    res = await db.execute(query)
    task = res.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    update_data = task_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)

    await db.commit()
    await db.refresh(task)
    return task


@router.post("/tasks/{task_id}/status", response_model=TaskResponse)
async def update_task_status(
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    status_in: TaskStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(Task).where(Task.id == task_id, Task.project_id == project_id)
    res = await db.execute(query)
    task = res.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    is_valid, message = is_valid_task_transition(
        current_status=task.status,
        target_status=status_in.target_status,
        blocker_reason=status_in.blocker_reason,
    )
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=message)

    task.status = status_in.target_status
    if status_in.target_status == TaskStatus.BLOCKED:
        task.blocker_reason = status_in.blocker_reason
    elif status_in.target_status in [TaskStatus.IN_PROGRESS, TaskStatus.DONE, TaskStatus.READY]:
        task.blocker_reason = None  # Clear blocker once unblocked

    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="TASK_STATUS_CHANGED",
        description=f"Task '{task.key}: {task.title}' status diubah menjadi {task.status.value}.",
        event_metadata={"key": task.key, "new_status": task.status.value},
    )
    db.add(activity)

    await db.commit()
    await db.refresh(task)
    return task


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(Task).where(Task.id == task_id, Task.project_id == project_id)
    res = await db.execute(query)
    task = res.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    await db.delete(task)
    await db.commit()
