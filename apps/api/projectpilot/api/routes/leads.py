import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from projectpilot.api.deps import get_current_pm, get_db
from projectpilot.api.schemas.lead import (
    LeadConvertRequest,
    LeadCreate,
    LeadResponse,
    LeadStatusUpdate,
    LeadUpdate,
)
from projectpilot.api.schemas.project import ProjectResponse
from projectpilot.domain.lead_state import is_valid_lead_transition
from projectpilot.persistence.models.activity import ActivityEvent
from projectpilot.persistence.models.client import Client
from projectpilot.persistence.models.lead import Lead, LeadStatus
from projectpilot.persistence.models.project import Project, ProjectHealth, ProjectLifecycleStage
from projectpilot.persistence.models.user import User

router = APIRouter(prefix="/leads", tags=["Leads"])


@router.get("", response_model=List[LeadResponse])
async def list_leads(
    lead_status: Optional[LeadStatus] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(Lead)
        .options(
            selectinload(Lead.client),
            selectinload(Lead.owner),
            selectinload(Lead.converted_project).selectinload(Project.client),
        )
        .order_by(Lead.created_at.desc())
    )

    if lead_status:
        query = query.where(Lead.status == lead_status)

    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                Lead.name.ilike(search_pattern),
                Lead.company_name.ilike(search_pattern),
                Lead.client_pic_name.ilike(search_pattern),
            )
        )

    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
async def create_lead(
    lead_in: LeadCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    lead = Lead(
        name=lead_in.name,
        company_name=lead_in.company_name,
        client_id=lead_in.client_id,
        owner_id=current_user.id,
        status=LeadStatus.NEW,
        client_pic_name=lead_in.client_pic_name,
        client_pic_email=lead_in.client_pic_email,
        client_pic_phone=lead_in.client_pic_phone,
        project_type=lead_in.project_type,
        source=lead_in.source,
        opportunity_description=lead_in.opportunity_description,
        estimated_budget_note=lead_in.estimated_budget_note,
        brief_notes=lead_in.brief_notes,
    )
    db.add(lead)
    await db.commit()
    await db.refresh(lead)

    query = (
        select(Lead)
        .options(
            selectinload(Lead.client),
            selectinload(Lead.owner),
            selectinload(Lead.converted_project),
        )
        .where(Lead.id == lead.id)
    )
    result = await db.execute(query)
    return result.scalar_one()


@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(Lead)
        .options(
            selectinload(Lead.client),
            selectinload(Lead.owner),
            selectinload(Lead.converted_project).selectinload(Project.client),
        )
        .where(Lead.id == lead_id)
    )
    result = await db.execute(query)
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found.")
    return lead


@router.put("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: uuid.UUID,
    lead_in: LeadUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(Lead)
        .options(
            selectinload(Lead.client),
            selectinload(Lead.owner),
            selectinload(Lead.converted_project),
        )
        .where(Lead.id == lead_id)
    )
    result = await db.execute(query)
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found.")

    if lead.status in [LeadStatus.CONVERTED, LeadStatus.NOT_QUALIFIED, LeadStatus.LOST]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot edit lead in terminal status '{lead.status.value}'.",
        )

    update_data = lead_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lead, field, value)

    await db.commit()
    await db.refresh(lead)
    return lead


@router.post("/{lead_id}/status", response_model=LeadResponse)
async def update_lead_status(
    lead_id: uuid.UUID,
    status_in: LeadStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(Lead)
        .options(
            selectinload(Lead.client),
            selectinload(Lead.owner),
            selectinload(Lead.converted_project),
        )
        .where(Lead.id == lead_id)
    )
    result = await db.execute(query)
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found.")

    is_valid, message = is_valid_lead_transition(
        current_status=lead.status, target_status=status_in.target_status
    )
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=message)

    lead.status = status_in.target_status
    if status_in.target_status == LeadStatus.LOST and status_in.loss_reason:
        lead.loss_reason = status_in.loss_reason

    await db.commit()
    await db.refresh(lead)
    return lead


@router.post("/{lead_id}/convert", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def convert_lead_to_project(
    lead_id: uuid.UUID,
    convert_in: LeadConvertRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(Lead)
        .options(selectinload(Lead.client))
        .where(Lead.id == lead_id)
    )
    result = await db.execute(query)
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found.")

    if lead.status == LeadStatus.CONVERTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lead has already been converted to a project.",
        )

    if lead.status not in [LeadStatus.QUALIFIED, LeadStatus.BRIEF_SCHEDULED, LeadStatus.CONTACTED]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Lead in status '{lead.status.value}' cannot be converted. Must be in a qualified progression.",
        )

    # Check project code uniqueness
    code_query = select(Project).where(Project.code == convert_in.project_code)
    code_res = await db.execute(code_query)
    if code_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Project code '{convert_in.project_code}' already exists.",
        )

    # 1. Resolve or Create Client
    client_id = lead.client_id
    if not client_id:
        client = Client(
            name=lead.name,
            company_name=lead.company_name,
            primary_contact_name=lead.client_pic_name,
            primary_contact_email=lead.client_pic_email,
            primary_contact_phone=lead.client_pic_phone,
            notes=f"Klien dibuat otomatis dari konversi Lead '{lead.name}'.",
        )
        db.add(client)
        await db.flush()
        client_id = client.id
        lead.client_id = client_id

    # 2. Create Project in DISCOVERY stage
    description = convert_in.description or lead.opportunity_description
    if lead.brief_notes:
        description = (description or "") + f"\n\n[Catatan Brief Awal]\n{lead.brief_notes}"

    project = Project(
        name=convert_in.project_name,
        code=convert_in.project_code,
        description=description,
        client_id=client_id,
        owner_id=current_user.id,
        lifecycle_stage=ProjectLifecycleStage.DISCOVERY,
        health=ProjectHealth.HEALTHY,
        start_date=convert_in.start_date,
        target_completion_date=convert_in.target_completion_date,
    )
    db.add(project)
    await db.flush()

    # 3. Update Lead Status to CONVERTED
    lead.status = LeadStatus.CONVERTED
    lead.converted_project_id = project.id

    # 4. Record Activity Events
    activity = ActivityEvent(
        project_id=project.id,
        actor_id=current_user.id,
        event_type="LEAD_CONVERTED",
        description=f"Proyek '{project.name}' ({project.code}) berhasil dibuat dari konversi Lead '{lead.name}'.",
        event_metadata={
            "lead_id": str(lead.id),
            "lead_name": lead.name,
            "company_name": lead.company_name,
        },
    )
    db.add(activity)

    await db.commit()

    # Return created project with relationships
    proj_query = (
        select(Project)
        .options(selectinload(Project.client), selectinload(Project.owner))
        .where(Project.id == project.id)
    )
    proj_res = await db.execute(proj_query)
    return proj_res.scalar_one()
