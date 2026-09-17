import uuid
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from projectpilot.api.schemas.issues_risks import BlockerCreate
from projectpilot.api.schemas.planning_tasks import TaskStatusUpdate
from projectpilot.domain.task_state import is_valid_task_transition
from projectpilot.persistence.base import utc_now
from projectpilot.persistence.models.activity import ActivityEvent
from projectpilot.persistence.models.issues_risks import Blocker, BlockerStatus
from projectpilot.persistence.models.planning_tasks import Task, TaskStatus


async def generate_blocker_key(project_id: uuid.UUID, db: AsyncSession) -> str:
    """
    Generates a deterministic and conflict-free sequential blocker key: BLK-001, BLK-002, etc.
    """
    count_query = select(func.count()).select_from(Blocker).where(Blocker.project_id == project_id)
    count = (await db.execute(count_query)).scalar() or 0
    candidate = f"BLK-{(count + 1):03d}"

    # Ensure key uniqueness across project in case of custom or out-of-sequence keys
    existing_query = select(Blocker.id).where(Blocker.project_id == project_id, Blocker.key == candidate)
    offset = 1
    while (await db.execute(existing_query)).scalar_one_or_none() is not None:
        offset += 1
        candidate = f"BLK-{(count + offset):03d}"
        existing_query = select(Blocker.id).where(Blocker.project_id == project_id, Blocker.key == candidate)

    return candidate


class TaskService:
    @staticmethod
    async def update_task_status(
        project_id: uuid.UUID,
        task_id: uuid.UUID,
        status_in: TaskStatusUpdate,
        db: AsyncSession,
        current_user_id: uuid.UUID,
    ) -> Task:
        """
        Atomically updates task status with row-level locking (SELECT FOR UPDATE)
        and enforces Transactional Dual-Write (Option A):
        1. When entering BLOCKED: acquires Task lock, updates/creates exactly one active Blocker.
        2. When leaving BLOCKED: resolves all active/escalated Blockers associated with the Task.
        3. Preserves historical resolved blockers and standalone project blockers.
        """
        # 1. Acquire row lock on the target Task
        task_query = (
            select(Task)
            .where(Task.id == task_id, Task.project_id == project_id)
            .with_for_update()
        )
        task_res = await db.execute(task_query)
        task = task_res.scalar_one_or_none()
        if not task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

        # 2. Validate state machine transition
        is_valid, message = is_valid_task_transition(
            current_status=task.status,
            target_status=status_in.target_status,
            blocker_reason=status_in.blocker_reason,
        )
        if not is_valid:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=message)

        previous_status = task.status
        target_status = status_in.target_status

        # 3. Synchronize Blocker table based on transition
        if target_status == TaskStatus.BLOCKED:
            task.status = TaskStatus.BLOCKED
            task.blocker_reason = status_in.blocker_reason

            # Query existing active/escalated blockers for this task with row lock
            b_query = (
                select(Blocker)
                .where(
                    Blocker.task_id == task.id,
                    Blocker.project_id == project_id,
                    Blocker.status.in_([BlockerStatus.ACTIVE, BlockerStatus.ESCALATED]),
                )
                .with_for_update()
            )
            b_res = await db.execute(b_query)
            active_blockers = b_res.scalars().all()

            if active_blockers:
                # Update existing active blocker(s) description instead of creating duplicates
                for blk in active_blockers:
                    blk.description = status_in.blocker_reason
            else:
                # Create exactly one active blocker for this task
                blocker_key = await generate_blocker_key(project_id, db)
                new_blocker = Blocker(
                    project_id=project_id,
                    task_id=task.id,
                    key=blocker_key,
                    title=f"Kendala pada task {task.key}: {task.title}"[:255],
                    description=status_in.blocker_reason,
                    blocker_type="TECHNICAL",
                    status=BlockerStatus.ACTIVE,
                )
                db.add(new_blocker)

        elif previous_status == TaskStatus.BLOCKED and target_status != TaskStatus.BLOCKED:
            task.status = target_status
            task.blocker_reason = None  # Clear reason on task

            # Query and resolve ALL active/escalated blockers associated with this task
            b_query = (
                select(Blocker)
                .where(
                    Blocker.task_id == task.id,
                    Blocker.project_id == project_id,
                    Blocker.status.in_([BlockerStatus.ACTIVE, BlockerStatus.ESCALATED]),
                )
                .with_for_update()
            )
            b_res = await db.execute(b_query)
            active_blockers = b_res.scalars().all()
            now = utc_now()
            for blk in active_blockers:
                blk.status = BlockerStatus.RESOLVED
                blk.resolved_at = now
                blk.resolution_notes = (
                    f"Otomatis diselesaikan karena task '{task.key}' dipindahkan ke status {target_status.value}."
                )

        else:
            task.status = target_status
            if target_status in [TaskStatus.IN_PROGRESS, TaskStatus.DONE, TaskStatus.READY]:
                task.blocker_reason = None

        # 4. Record Activity Event within same atomic transaction
        activity = ActivityEvent(
            project_id=project_id,
            actor_id=current_user_id,
            event_type="TASK_STATUS_CHANGED",
            description=f"Task '{task.key}: {task.title}' status diubah menjadi {task.status.value}.",
            event_metadata={"key": task.key, "new_status": task.status.value},
        )
        db.add(activity)

        # 5. Commit atomic transaction and refresh
        await db.commit()
        await db.refresh(task)
        return task

    @staticmethod
    async def create_blocker(
        project_id: uuid.UUID,
        blocker_in: BlockerCreate,
        db: AsyncSession,
        current_user_id: uuid.UUID,
    ) -> Blocker:
        """
        Creates or updates a Blocker:
        - If task_id is provided: locks the Task, enforces single-active-blocker invariant,
          sets Task status to BLOCKED, and records blocker_reason.
        - If task_id is None: creates a standalone project-level blocker without touching tasks.
        All changes occur within the same database transaction.
        """
        if blocker_in.task_id:
            # 1. Task-linked blocker: acquire row lock on target Task
            task_query = (
                select(Task)
                .where(Task.id == blocker_in.task_id, Task.project_id == project_id)
                .with_for_update()
            )
            task_res = await db.execute(task_query)
            task = task_res.scalar_one_or_none()
            if not task:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Linked task not found.")

            # 2. Check if an active/escalated blocker already exists for that Task
            b_query = (
                select(Blocker)
                .where(
                    Blocker.task_id == task.id,
                    Blocker.project_id == project_id,
                    Blocker.status.in_([BlockerStatus.ACTIVE, BlockerStatus.ESCALATED]),
                )
                .with_for_update()
            )
            b_res = await db.execute(b_query)
            existing_active = b_res.scalars().first()

            if existing_active:
                # Update / reuse existing active blocker rather than creating duplicates
                existing_active.key = blocker_in.key
                existing_active.title = blocker_in.title
                existing_active.description = blocker_in.description
                if blocker_in.blocker_type:
                    existing_active.blocker_type = blocker_in.blocker_type
                blocker = existing_active
            else:
                blocker = Blocker(
                    project_id=project_id,
                    task_id=task.id,
                    key=blocker_in.key,
                    title=blocker_in.title,
                    description=blocker_in.description,
                    blocker_type=blocker_in.blocker_type or "TECHNICAL",
                    status=BlockerStatus.ACTIVE,
                )
                db.add(blocker)

            # 3. Synchronously set Task to BLOCKED with reason
            task.status = TaskStatus.BLOCKED
            task.blocker_reason = f"[{blocker.key}] {blocker.title}"

        else:
            # Standalone project blocker (task_id is None)
            blocker = Blocker(
                project_id=project_id,
                task_id=None,
                key=blocker_in.key,
                title=blocker_in.title,
                description=blocker_in.description,
                blocker_type=blocker_in.blocker_type or "TECHNICAL",
                status=BlockerStatus.ACTIVE,
            )
            db.add(blocker)

        activity = ActivityEvent(
            project_id=project_id,
            actor_id=current_user_id,
            event_type="BLOCKER_CREATED",
            description=f"Blocker '{blocker.key}: {blocker.title}' tercatat.",
            event_metadata={"key": blocker.key},
        )
        db.add(activity)

        await db.commit()
        await db.refresh(blocker)
        return blocker
