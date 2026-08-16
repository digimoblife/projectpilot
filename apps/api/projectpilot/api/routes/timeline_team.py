import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from projectpilot.api.deps import get_current_pm, get_db
from projectpilot.api.schemas.timeline_team import (
    MilestoneCreate,
    MilestoneResponse,
    MilestoneStatusUpdate,
    MilestoneUpdate,
    MyWorkTaskItem,
    ProjectMemberCreate,
    ProjectMemberResponse,
    ProjectMemberUpdate,
    TaskDependencyCreate,
    TaskDependencyResponse,
)
from projectpilot.domain.dependency_graph import will_create_circular_dependency
from projectpilot.persistence.models.activity import ActivityEvent
from projectpilot.persistence.models.planning_tasks import Task, TaskStatus
from projectpilot.persistence.models.project import Project
from projectpilot.persistence.models.timeline_team import (
    Milestone,
    MilestoneStatus,
    ProjectMember,
    TaskDependency,
)
from projectpilot.persistence.models.user import User

router = APIRouter(tags=["Timeline, Team & Dependencies"])


# =========================================================================
# 1. PROJECT MEMBERS ENDPOINTS
# =========================================================================
@router.get("/projects/{project_id}/members", response_model=List[ProjectMemberResponse])
async def list_project_members(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(ProjectMember)
        .where(ProjectMember.project_id == project_id)
        .order_by(ProjectMember.name.asc())
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.post(
    "/projects/{project_id}/members",
    response_model=ProjectMemberResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_project_member(
    project_id: uuid.UUID,
    member_in: ProjectMemberCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    member = ProjectMember(
        project_id=project_id,
        user_id=member_in.user_id,
        name=member_in.name,
        email=member_in.email,
        role=member_in.role,
        capacity_hours_per_week=member_in.capacity_hours_per_week or 40.0,
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return member


@router.delete("/projects/{project_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_project_member(
    project_id: uuid.UUID,
    member_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(ProjectMember).where(
        ProjectMember.id == member_id, ProjectMember.project_id == project_id
    )
    res = await db.execute(query)
    member = res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Project member not found.")

    await db.delete(member)
    await db.commit()


# =========================================================================
# 2. MILESTONES ENDPOINTS
# =========================================================================
@router.get("/projects/{project_id}/milestones", response_model=List[MilestoneResponse])
async def list_milestones(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(Milestone)
        .where(Milestone.project_id == project_id)
        .order_by(Milestone.target_date.asc())
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.post(
    "/projects/{project_id}/milestones",
    response_model=MilestoneResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_milestone(
    project_id: uuid.UUID,
    mls_in: MilestoneCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    milestone = Milestone(
        project_id=project_id,
        key=mls_in.key,
        title=mls_in.title,
        description=mls_in.description,
        target_date=mls_in.target_date,
        status=MilestoneStatus.PLANNED,
    )
    db.add(milestone)

    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="MILESTONE_CREATED",
        description=f"Milestone '{milestone.key}: {milestone.title}' dibuat dengan target {milestone.target_date}.",
        event_metadata={"key": milestone.key},
    )
    db.add(activity)

    await db.commit()
    await db.refresh(milestone)
    return milestone


@router.put("/projects/{project_id}/milestones/{milestone_id}", response_model=MilestoneResponse)
async def update_milestone(
    project_id: uuid.UUID,
    milestone_id: uuid.UUID,
    mls_in: MilestoneUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(Milestone).where(
        Milestone.id == milestone_id, Milestone.project_id == project_id
    )
    res = await db.execute(query)
    milestone = res.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found.")

    update_data = mls_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(milestone, field, value)

    await db.commit()
    await db.refresh(milestone)
    return milestone


@router.post("/projects/{project_id}/milestones/{milestone_id}/status", response_model=MilestoneResponse)
async def update_milestone_status(
    project_id: uuid.UUID,
    milestone_id: uuid.UUID,
    status_in: MilestoneStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(Milestone).where(
        Milestone.id == milestone_id, Milestone.project_id == project_id
    )
    res = await db.execute(query)
    milestone = res.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found.")

    milestone.status = status_in.target_status
    if status_in.actual_date:
        milestone.actual_date = status_in.actual_date

    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="MILESTONE_STATUS_CHANGED",
        description=f"Milestone '{milestone.key}' status diubah menjadi {milestone.status.value}.",
        event_metadata={"key": milestone.key, "new_status": milestone.status.value},
    )
    db.add(activity)

    await db.commit()
    await db.refresh(milestone)
    return milestone


@router.delete("/projects/{project_id}/milestones/{milestone_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_milestone(
    project_id: uuid.UUID,
    milestone_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(Milestone).where(
        Milestone.id == milestone_id, Milestone.project_id == project_id
    )
    res = await db.execute(query)
    milestone = res.scalar_one_or_none()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found.")

    await db.delete(milestone)
    await db.commit()


# =========================================================================
# 3. TASK DEPENDENCIES ENDPOINTS (WITH CYCLE VALIDATION)
# =========================================================================
@router.get("/projects/{project_id}/task-dependencies", response_model=List[TaskDependencyResponse])
async def list_task_dependencies(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(TaskDependency)
        .where(TaskDependency.project_id == project_id)
        .order_by(TaskDependency.created_at.asc())
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.post(
    "/projects/{project_id}/task-dependencies",
    response_model=TaskDependencyResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_task_dependency(
    project_id: uuid.UUID,
    dep_in: TaskDependencyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    # Fetch all existing dependencies for this project
    existing_query = select(TaskDependency).where(TaskDependency.project_id == project_id)
    existing_res = await db.execute(existing_query)
    existing_deps = existing_res.scalars().all()

    existing_tuples = [
        (d.predecessor_task_id, d.successor_task_id) for d in existing_deps
    ]

    is_cycle, message = will_create_circular_dependency(
        existing_dependencies=existing_tuples,
        new_predecessor_id=dep_in.predecessor_task_id,
        new_successor_id=dep_in.successor_task_id,
    )
    if is_cycle:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=message,
        )

    dependency = TaskDependency(
        project_id=project_id,
        predecessor_task_id=dep_in.predecessor_task_id,
        successor_task_id=dep_in.successor_task_id,
        dependency_type=dep_in.dependency_type or "FINISH_TO_START",
    )
    db.add(dependency)
    await db.commit()
    await db.refresh(dependency)
    return dependency


@router.delete("/projects/{project_id}/task-dependencies/{dep_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task_dependency(
    project_id: uuid.UUID,
    dep_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(TaskDependency).where(
        TaskDependency.id == dep_id, TaskDependency.project_id == project_id
    )
    res = await db.execute(query)
    dep = res.scalar_one_or_none()
    if not dep:
        raise HTTPException(status_code=404, detail="Task dependency not found.")

    await db.delete(dep)
    await db.commit()


# =========================================================================
# 4. CROSS-PROJECT MY WORK ENDPOINT
# =========================================================================
@router.get("/my-work", response_model=List[MyWorkTaskItem])
async def get_my_work(
    task_status: Optional[TaskStatus] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(
            Task.id,
            Task.project_id,
            Project.code.label("project_code"),
            Project.name.label("project_name"),
            Task.key,
            Task.title,
            Task.status,
            Task.priority,
            Task.due_date,
            Task.assignee_name,
            Task.blocker_reason,
        )
        .join(Project, Task.project_id == Project.id)
        .order_by(Task.due_date.asc().nulls_last(), Task.created_at.desc())
    )

    if task_status:
        query = query.where(Task.status == task_status)

    result = await db.execute(query)
    rows = result.all()

    return [
        MyWorkTaskItem(
            id=row.id,
            project_id=row.project_id,
            project_code=row.project_code,
            project_name=row.project_name,
            key=row.key,
            title=row.title,
            status=row.status,
            priority=row.priority,
            due_date=row.due_date,
            assignee_name=row.assignee_name,
            blocker_reason=row.blocker_reason,
        )
        for row in rows
    ]
