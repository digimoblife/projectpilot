import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from projectpilot.api.deps import get_current_pm, get_db
from projectpilot.api.schemas.client import (
    ClientCreate,
    ClientResponse,
    ClientUpdate,
    StakeholderCreate,
    StakeholderResponse,
)
from projectpilot.persistence.models.client import Client, Stakeholder
from projectpilot.persistence.models.user import User

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.get("", response_model=List[ClientResponse])
async def list_clients(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(Client).options(selectinload(Client.stakeholders)).order_by(Client.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    client_in: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    client = Client(
        name=client_in.name,
        company_name=client_in.company_name,
        industry=client_in.industry,
        website=client_in.website,
        primary_contact_name=client_in.primary_contact_name,
        primary_contact_email=client_in.primary_contact_email,
        primary_contact_phone=client_in.primary_contact_phone,
        notes=client_in.notes,
    )
    db.add(client)
    await db.commit()
    await db.refresh(client)

    # Re-query with stakeholders
    query = select(Client).options(selectinload(Client.stakeholders)).where(Client.id == client.id)
    result = await db.execute(query)
    return result.scalar_one()


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(Client).options(selectinload(Client.stakeholders)).where(Client.id == client_id)
    result = await db.execute(query)
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: uuid.UUID,
    client_in: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(Client).options(selectinload(Client.stakeholders)).where(Client.id == client_id)
    result = await db.execute(query)
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    update_data = client_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)

    await db.commit()
    await db.refresh(client)
    return client


@router.post("/{client_id}/stakeholders", response_model=StakeholderResponse, status_code=status.HTTP_201_CREATED)
async def add_stakeholder(
    client_id: uuid.UUID,
    stakeholder_in: StakeholderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(Client).where(Client.id == client_id)
    result = await db.execute(query)
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    stakeholder = Stakeholder(
        client_id=client_id,
        name=stakeholder_in.name,
        role=stakeholder_in.role,
        email=stakeholder_in.email,
        phone=stakeholder_in.phone,
        decision_authority=stakeholder_in.decision_authority,
        notes=stakeholder_in.notes,
    )
    db.add(stakeholder)
    await db.commit()
    await db.refresh(stakeholder)
    return stakeholder
