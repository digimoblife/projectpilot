import uuid
from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict
from projectpilot.api.schemas.auth import UserResponse


class ActivityEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: Optional[uuid.UUID] = None
    actor_id: uuid.UUID
    event_type: str
    description: str
    event_metadata: Dict[str, Any] = {}
    created_at: datetime
    actor: Optional[UserResponse] = None
