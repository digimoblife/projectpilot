import uuid
from datetime import datetime, timezone
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
    TaskReorderRequest,
    TaskResponse,
    TaskStatusUpdate,
    TaskUpdate,
)
from projectpilot.domain.task_state import is_valid_task_transition
from projectpilot.persistence.models.activity import ActivityEvent
from projectpilot.persistence.models.planning_tasks import Epic, Feature, Task, TaskStatus
from projectpilot.persistence.models.project import Project
from projectpilot.persistence.models.user import User
from projectpilot.services.task_service import TaskService

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


@router.delete("/epics/{epic_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_epic(
    project_id: uuid.UUID,
    epic_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(Epic).where(Epic.id == epic_id, Epic.project_id == project_id)
    res = await db.execute(query)
    epic = res.scalar_one_or_none()
    if not epic:
        raise HTTPException(status_code=404, detail="Epic not found.")

    await db.delete(epic)
    await db.commit()


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


@router.delete("/features/{feature_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_feature(
    project_id: uuid.UUID,
    feature_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(Feature).where(Feature.id == feature_id, Feature.project_id == project_id)
    res = await db.execute(query)
    feature = res.scalar_one_or_none()
    if not feature:
        raise HTTPException(status_code=404, detail="Feature not found.")

    await db.delete(feature)
    await db.commit()


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
    archived_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(Task)
        .where(Task.project_id == project_id)
        .order_by(Task.order_index.asc(), Task.created_at.asc())
    )

    if archived_only:
        query = query.where(Task.is_archived == True)
    else:
        query = query.where(Task.is_archived == False)

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
    return await TaskService.update_task_status(
        project_id=project_id,
        task_id=task_id,
        status_in=status_in,
        db=db,
        current_user_id=current_user.id,
    )


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


@router.patch("/tasks/reorder", status_code=status.HTTP_200_OK)
async def reorder_tasks(
    project_id: uuid.UUID,
    reorder_in: TaskReorderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    for item in reorder_in.items:
        query = select(Task).where(Task.id == item.id, Task.project_id == project_id)
        res = await db.execute(query)
        task = res.scalar_one_or_none()
        if task:
            task.order_index = item.order_index
            if item.status and task.status != item.status:
                task.status = item.status

    await db.commit()
    return {"message": "Urutan task berhasil diperbarui."}


@router.post("/tasks/{task_id}/archive", response_model=TaskResponse)
async def archive_task(
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

    task.is_archived = True
    task.archived_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(task)
    return task


@router.post("/tasks/{task_id}/restore", response_model=TaskResponse)
async def restore_task(
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

    task.is_archived = False
    task.archived_at = None
    await db.commit()
    await db.refresh(task)
    return task

