import uuid
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from projectpilot.api.deps import get_current_pm, get_current_user, get_db
from projectpilot.api.schemas.handover import (
    HandoverCompletionGateResponse,
    HandoverItemCreateRequest,
    HandoverItemResponse,
    HandoverItemUpdateRequest,
    HandoverResponse,
    HandoverStatusUpdateRequest,
)
from projectpilot.persistence.base import utc_now
from projectpilot.persistence.models.activity import ActivityEvent
from projectpilot.persistence.models.handover import (
    Handover,
    HandoverItem,
    HandoverItemStatus,
    HandoverStatus,
)
from projectpilot.persistence.models.project import Project, ProjectLifecycleStage
from projectpilot.persistence.models.user import User
from projectpilot.services.handover_service import (
    get_or_create_handover,
    validate_handover_completion_gate,
)

router = APIRouter(tags=["Handover & Project Completion"])


# =========================================================================
# 1. GET HANDOVER WORKSPACE & CHECKLIST
# =========================================================================
@router.get("/projects/{project_id}/handover", response_model=HandoverResponse)
async def get_project_handover(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p_res = await db.execute(select(Project).where(Project.id == project_id))
    if not p_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found.")

    handover = await get_or_create_handover(project_id, db)
    return handover


# =========================================================================
# 2. CHECK COMPLETION GATE STATUS
# =========================================================================
@router.get("/projects/{project_id}/handover/gate-status", response_model=HandoverCompletionGateResponse)
async def get_handover_gate_status(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    handover = await get_or_create_handover(project_id, db)
    is_eligible, reasons = await validate_handover_completion_gate(handover, db)

    total_count = len(handover.items)
    required_count = len([i for i in handover.items if i.required])
    completed_count = len([
        i for i in handover.items
        if i.status in (HandoverItemStatus.COMPLETED, HandoverItemStatus.WAIVED, HandoverItemStatus.NOT_APPLICABLE)
    ])

    return HandoverCompletionGateResponse(
        is_eligible=is_eligible,
        reasons=reasons,
        completed_count=completed_count,
        required_count=required_count,
        total_count=total_count,
    )


# =========================================================================
# 3. UPDATE HANDOVER STATUS LIFECYCLE
# =========================================================================
@router.put("/projects/{project_id}/handover/status", response_model=HandoverResponse)
async def update_handover_status(
    project_id: uuid.UUID,
    req: HandoverStatusUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    handover = await get_or_create_handover(project_id, db)

    if req.target_status == HandoverStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail="To complete handover, use the formal POST /handover/complete endpoint which verifies the completion gate.",
        )

    handover.status = req.target_status
    if req.notes is not None:
        handover.notes = req.notes

    now = utc_now()
    if req.target_status == HandoverStatus.IN_PREPARATION and not handover.started_at:
        handover.started_at = now
        # Also ensure project is in HANDOVER lifecycle stage
        p_res = await db.execute(select(Project).where(Project.id == project_id))
        proj = p_res.scalar_one_or_none()
        if proj and proj.lifecycle_stage != ProjectLifecycleStage.HANDOVER:
            proj.lifecycle_stage = ProjectLifecycleStage.HANDOVER

    elif req.target_status == HandoverStatus.READY_FOR_REVIEW:
        handover.ready_for_review_at = now
    elif req.target_status == HandoverStatus.AWAITING_CLIENT_ACCEPTANCE:
        handover.submitted_at = now

    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="HANDOVER_STATUS_UPDATED",
        description=f"Status serah terima diubah menjadi {req.target_status.value}.",
    )
    db.add(activity)

    await db.commit()
    await db.refresh(handover)
    return handover


# =========================================================================
# 4. ADD CUSTOM HANDOVER ITEM
# =========================================================================
@router.post(
    "/projects/{project_id}/handover/items",
    response_model=HandoverItemResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_handover_item(
    project_id: uuid.UUID,
    item_in: HandoverItemCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    handover = await get_or_create_handover(project_id, db)

    item = HandoverItem(
        handover_id=handover.id,
        title=item_in.title,
        description=item_in.description,
        item_type=item_in.item_type,
        required=item_in.required,
        status=HandoverItemStatus.PENDING,
        sort_order=item_in.sort_order or len(handover.items) + 1,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


# =========================================================================
# 5. UPDATE HANDOVER ITEM (RESOLVE / WAIVE / EDIT)
# =========================================================================
@router.put("/projects/{project_id}/handover/items/{item_id}", response_model=HandoverItemResponse)
async def update_handover_item(
    project_id: uuid.UUID,
    item_id: uuid.UUID,
    item_in: HandoverItemUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    handover = await get_or_create_handover(project_id, db)
    query = select(HandoverItem).where(HandoverItem.id == item_id, HandoverItem.handover_id == handover.id)
    res = await db.execute(query)
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Handover item not found.")

    data = item_in.model_dump(exclude_unset=True)

    if "status" in data:
        new_status = data["status"]
        if new_status == HandoverItemStatus.WAIVED and not data.get("waiver_reason") and not item.waiver_reason:
            raise HTTPException(
                status_code=400,
                detail="Waiver requires an explicit justification in 'waiver_reason'.",
            )
        if new_status == HandoverItemStatus.COMPLETED:
            item.completed_at = utc_now()
            item.completed_by_user_id = current_user.id

    for field, val in data.items():
        setattr(item, field, val)

    await db.commit()
    await db.refresh(item)
    return item


# =========================================================================
# 6. DELETE HANDOVER ITEM
# =========================================================================
@router.delete("/projects/{project_id}/handover/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_handover_item(
    project_id: uuid.UUID,
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    handover = await get_or_create_handover(project_id, db)
    query = select(HandoverItem).where(HandoverItem.id == item_id, HandoverItem.handover_id == handover.id)
    res = await db.execute(query)
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Handover item not found.")

    await db.delete(item)
    await db.commit()
    return None


# =========================================================================
# 7. COMPLETE HANDOVER & PROJECT
# =========================================================================
@router.post("/projects/{project_id}/handover/complete", response_model=HandoverResponse)
async def complete_handover_and_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    handover = await get_or_create_handover(project_id, db)
    is_eligible, reasons = await validate_handover_completion_gate(handover, db)

    if not is_eligible:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot complete handover. Gating checks failed: {'; '.join(reasons)}",
        )

    now = utc_now()
    handover.status = HandoverStatus.COMPLETED
    handover.completed_at = now

    p_res = await db.execute(select(Project).where(Project.id == project_id))
    project = p_res.scalar_one()
    project.lifecycle_stage = ProjectLifecycleStage.COMPLETED
    project.actual_completion_date = date.today()

    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="PROJECT_COMPLETED",
        description=f"Proyek '{project.name}' ({project.code}) telah resmi diserahterimakan dan diselesaikan.",
    )
    db.add(activity)

    await db.commit()
    await db.refresh(handover)
    return handover
