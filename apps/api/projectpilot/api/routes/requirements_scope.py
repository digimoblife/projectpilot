import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from projectpilot.api.deps import get_current_pm, get_db
from projectpilot.api.schemas.requirements_scope import (
    DecisionCreate,
    DecisionResponse,
    DecisionStatusUpdate,
    DecisionUpdate,
    RequirementCreate,
    RequirementResponse,
    RequirementStatusUpdate,
    RequirementSupersedeRequest,
    RequirementUpdate,
    ScopeChangeCreate,
    ScopeChangeResponse,
    ScopeChangeStatusUpdate,
    ScopeChangeUpdate,
    ScopeItemCreate,
    ScopeItemResponse,
    ScopeItemUpdate,
)
from projectpilot.domain.requirement_state import is_valid_requirement_transition
from projectpilot.domain.scope_state import is_valid_scope_change_transition
from projectpilot.persistence.models.activity import ActivityEvent
from projectpilot.persistence.models.discovery import DiscoveryCategory
from projectpilot.persistence.models.project import Project
from projectpilot.persistence.models.requirements_scope import (
    Decision,
    DecisionStatus,
    Requirement,
    RequirementStatus,
    ScopeChange,
    ScopeChangeStatus,
    ScopeItem,
    ScopeType,
)
from projectpilot.persistence.models.user import User

router = APIRouter(prefix="/projects/{project_id}", tags=["Requirements & Scope"])


# =========================================================================
# 1. REQUIREMENTS ENDPOINTS
# =========================================================================
@router.get("/requirements", response_model=List[RequirementResponse])
async def list_requirements(
    project_id: uuid.UUID,
    category: Optional[DiscoveryCategory] = None,
    req_status: Optional[RequirementStatus] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(Requirement)
        .where(Requirement.project_id == project_id)
        .order_by(Requirement.key.asc(), Requirement.version.desc())
    )

    if category:
        query = query.where(Requirement.category == category)
    if req_status:
        query = query.where(Requirement.status == req_status)
    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                Requirement.key.ilike(pattern),
                Requirement.title.ilike(pattern),
                Requirement.description.ilike(pattern),
            )
        )

    result = await db.execute(query)
    return result.scalars().all()


@router.post(
    "/requirements",
    response_model=RequirementResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_requirement(
    project_id: uuid.UUID,
    req_in: RequirementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    proj_query = select(Project).where(Project.id == project_id)
    proj_res = await db.execute(proj_query)
    project = proj_res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    requirement = Requirement(
        project_id=project_id,
        key=req_in.key,
        title=req_in.title,
        description=req_in.description,
        category=req_in.category,
        priority=req_in.priority or "MEDIUM",
        status=RequirementStatus.DRAFT,
        version=1,
        source_type=req_in.source_type,
        source_id=req_in.source_id,
        acceptance_criteria=req_in.acceptance_criteria,
        rationale=req_in.rationale,
    )
    db.add(requirement)

    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="REQUIREMENT_CREATED",
        description=f"Requirement baru '{requirement.key}: {requirement.title}' ditambahkan.",
        event_metadata={"key": requirement.key, "category": requirement.category.value},
    )
    db.add(activity)

    await db.commit()
    await db.refresh(requirement)
    return requirement


@router.get("/requirements/{requirement_id}", response_model=RequirementResponse)
async def get_requirement(
    project_id: uuid.UUID,
    requirement_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(Requirement).where(
        Requirement.id == requirement_id, Requirement.project_id == project_id
    )
    res = await db.execute(query)
    requirement = res.scalar_one_or_none()
    if not requirement:
        raise HTTPException(status_code=404, detail="Requirement not found.")
    return requirement


@router.put("/requirements/{requirement_id}", response_model=RequirementResponse)
async def update_requirement(
    project_id: uuid.UUID,
    requirement_id: uuid.UUID,
    req_in: RequirementUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(Requirement).where(
        Requirement.id == requirement_id, Requirement.project_id == project_id
    )
    res = await db.execute(query)
    requirement = res.scalar_one_or_none()
    if not requirement:
        raise HTTPException(status_code=404, detail="Requirement not found.")

    if requirement.status == RequirementStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot directly edit an APPROVED requirement. Use the supersede endpoint to create a new revision.",
        )

    if requirement.status == RequirementStatus.SUPERSEDED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot edit a SUPERSEDED requirement.",
        )

    update_data = req_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(requirement, field, value)

    await db.commit()
    await db.refresh(requirement)
    return requirement


@router.post("/requirements/{requirement_id}/status", response_model=RequirementResponse)
async def update_requirement_status(
    project_id: uuid.UUID,
    requirement_id: uuid.UUID,
    status_in: RequirementStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(Requirement).where(
        Requirement.id == requirement_id, Requirement.project_id == project_id
    )
    res = await db.execute(query)
    requirement = res.scalar_one_or_none()
    if not requirement:
        raise HTTPException(status_code=404, detail="Requirement not found.")

    is_valid, message = is_valid_requirement_transition(
        current_status=requirement.status, target_status=status_in.target_status
    )
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=message)

    requirement.status = status_in.target_status

    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="REQUIREMENT_STATUS_CHANGED",
        description=f"Requirement '{requirement.key}' diubah statusnya menjadi {requirement.status.value}.",
        event_metadata={"key": requirement.key, "new_status": requirement.status.value},
    )
    db.add(activity)

    await db.commit()
    await db.refresh(requirement)
    return requirement


@router.post("/requirements/{requirement_id}/supersede", response_model=RequirementResponse)
async def supersede_requirement(
    project_id: uuid.UUID,
    requirement_id: uuid.UUID,
    sup_in: RequirementSupersedeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(Requirement).where(
        Requirement.id == requirement_id, Requirement.project_id == project_id
    )
    res = await db.execute(query)
    old_req = res.scalar_one_or_none()
    if not old_req:
        raise HTTPException(status_code=404, detail="Requirement not found.")

    # Create new requirement version
    new_req = Requirement(
        project_id=project_id,
        key=old_req.key,
        title=sup_in.title,
        description=sup_in.description,
        category=sup_in.category or old_req.category,
        priority=sup_in.priority or old_req.priority,
        status=RequirementStatus.CONFIRMED,
        version=old_req.version + 1,
        supersedes_id=old_req.id,
        source_type=old_req.source_type,
        source_id=old_req.source_id,
        acceptance_criteria=sup_in.acceptance_criteria or old_req.acceptance_criteria,
        rationale=sup_in.rationale or old_req.rationale,
    )
    db.add(new_req)
    await db.flush()

    # Mark old requirement as SUPERSEDED and link
    old_req.status = RequirementStatus.SUPERSEDED
    old_req.superseded_by_id = new_req.id

    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="REQUIREMENT_SUPERSEDED",
        description=f"Requirement '{old_req.key}' direvisi ke versi {new_req.version}.",
        event_metadata={
            "key": old_req.key,
            "old_version": old_req.version,
            "new_version": new_req.version,
        },
    )
    db.add(activity)

    await db.commit()
    await db.refresh(new_req)
    return new_req


# =========================================================================
# 2. DECISIONS ENDPOINTS
# =========================================================================
@router.get("/decisions", response_model=List[DecisionResponse])
async def list_decisions(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(Decision)
        .where(Decision.project_id == project_id)
        .order_by(Decision.created_at.desc())
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.post(
    "/decisions", response_model=DecisionResponse, status_code=status.HTTP_201_CREATED
)
async def create_decision(
    project_id: uuid.UUID,
    dec_in: DecisionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    decision = Decision(
        project_id=project_id,
        key=dec_in.key,
        title=dec_in.title,
        context=dec_in.context,
        decision=dec_in.decision,
        rationale=dec_in.rationale,
        implications=dec_in.implications,
        status=DecisionStatus.ACCEPTED,
        decided_by=dec_in.decided_by or current_user.full_name,
    )
    db.add(decision)

    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="DECISION_LOGGED",
        description=f"Keputusan baru '{decision.key}: {decision.title}' dicatat.",
        event_metadata={"key": decision.key},
    )
    db.add(activity)

    await db.commit()
    await db.refresh(decision)
    return decision


# =========================================================================
# 3. SCOPE ITEMS ENDPOINTS
# =========================================================================
@router.get("/scope-items", response_model=List[ScopeItemResponse])
async def list_scope_items(
    project_id: uuid.UUID,
    scope_type: Optional[ScopeType] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(ScopeItem)
        .where(ScopeItem.project_id == project_id)
        .order_by(ScopeItem.created_at.asc())
    )
    if scope_type:
        query = query.where(ScopeItem.scope_type == scope_type)

    result = await db.execute(query)
    return result.scalars().all()


@router.post(
    "/scope-items", response_model=ScopeItemResponse, status_code=status.HTTP_201_CREATED
)
async def create_scope_item(
    project_id: uuid.UUID,
    item_in: ScopeItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    item = ScopeItem(
        project_id=project_id,
        requirement_id=item_in.requirement_id,
        title=item_in.title,
        description=item_in.description,
        scope_type=item_in.scope_type,
        rationale=item_in.rationale,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/scope-items/{item_id}", response_model=ScopeItemResponse)
async def update_scope_item(
    project_id: uuid.UUID,
    item_id: uuid.UUID,
    item_in: ScopeItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(ScopeItem).where(
        ScopeItem.id == item_id, ScopeItem.project_id == project_id
    )
    res = await db.execute(query)
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Scope item not found.")

    update_data = item_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/scope-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scope_item(
    project_id: uuid.UUID,
    item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(ScopeItem).where(
        ScopeItem.id == item_id, ScopeItem.project_id == project_id
    )
    res = await db.execute(query)
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Scope item not found.")

    await db.delete(item)
    await db.commit()


# =========================================================================
# 4. SCOPE CHANGES (CR) ENDPOINTS
# =========================================================================
@router.get("/scope-changes", response_model=List[ScopeChangeResponse])
async def list_scope_changes(
    project_id: uuid.UUID,
    change_status: Optional[ScopeChangeStatus] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(ScopeChange)
        .where(ScopeChange.project_id == project_id)
        .order_by(ScopeChange.created_at.desc())
    )
    if change_status:
        query = query.where(ScopeChange.status == change_status)

    result = await db.execute(query)
    return result.scalars().all()


@router.post(
    "/scope-changes",
    response_model=ScopeChangeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_scope_change(
    project_id: uuid.UUID,
    change_in: ScopeChangeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    change = ScopeChange(
        project_id=project_id,
        key=change_in.key,
        title=change_in.title,
        description=change_in.description,
        reason=change_in.reason,
        impact_summary=change_in.impact_summary,
        status=ScopeChangeStatus.IDENTIFIED,
        requested_by=change_in.requested_by or current_user.full_name,
    )
    db.add(change)

    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="SCOPE_CHANGE_IDENTIFIED",
        description=f"Scope Change Request baru diajukan '{change.key}: {change.title}'.",
        event_metadata={"key": change.key},
    )
    db.add(activity)

    await db.commit()
    await db.refresh(change)
    return change


@router.post(
    "/scope-changes/{change_id}/status", response_model=ScopeChangeResponse
)
async def update_scope_change_status(
    project_id: uuid.UUID,
    change_id: uuid.UUID,
    status_in: ScopeChangeStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(ScopeChange).where(
        ScopeChange.id == change_id, ScopeChange.project_id == project_id
    )
    res = await db.execute(query)
    change = res.scalar_one_or_none()
    if not change:
        raise HTTPException(status_code=404, detail="Scope change request not found.")

    is_valid, message = is_valid_scope_change_transition(
        current_status=change.status, target_status=status_in.target_status
    )
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=message)

    change.status = status_in.target_status
    if status_in.target_status == ScopeChangeStatus.CLIENT_APPROVED:
        change.approved_by = status_in.approved_by or current_user.full_name
        change.approved_at = datetime.now(timezone.utc)

    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="SCOPE_CHANGE_STATUS_CHANGED",
        description=f"Scope Change Request '{change.key}' status diubah menjadi {change.status.value}.",
        event_metadata={"key": change.key, "new_status": change.status.value},
    )
    db.add(activity)

    await db.commit()
    await db.refresh(change)
    return change
