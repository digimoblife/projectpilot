import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class StakeholderBase(BaseModel):
    name: str
    role: str
    email: Optional[str] = None
    phone: Optional[str] = None
    decision_authority: Optional[str] = None
    notes: Optional[str] = None


class StakeholderCreate(StakeholderBase):
    pass


class StakeholderResponse(StakeholderBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    client_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class ClientBase(BaseModel):
    name: str
    company_name: str
    industry: Optional[str] = None
    website: Optional[str] = None
    primary_contact_name: Optional[str] = None
    primary_contact_email: Optional[str] = None
    primary_contact_phone: Optional[str] = None
    notes: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    company_name: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    primary_contact_name: Optional[str] = None
    primary_contact_email: Optional[str] = None
    primary_contact_phone: Optional[str] = None
    notes: Optional[str] = None


class ClientSimpleResponse(ClientBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class ClientResponse(ClientSimpleResponse):
    stakeholders: List[StakeholderResponse] = []
