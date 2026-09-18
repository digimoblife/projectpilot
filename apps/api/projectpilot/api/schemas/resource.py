import uuid
from datetime import date, datetime
from urllib.parse import urlparse

from projectpilot.persistence.models.resource import (
    DeliverableStatus,
    ResourceStatus,
    ResourceType,
)
from pydantic import BaseModel, ConfigDict, Field, model_validator


def validate_http_url(url: str) -> str:
    cleaned = url.strip()
    if not cleaned:
        raise ValueError("URL cannot be empty.")
    parsed = urlparse(cleaned)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise ValueError("URL must be a valid absolute HTTP or HTTPS URL.")
    return cleaned


DANGEROUS_EXTENSIONS = {
    ".exe", ".bat", ".cmd", ".sh", ".bin", ".msi", ".com",
    ".php", ".py", ".js", ".vbs", ".scr", ".jar", ".app", ".dmg", ".apk"
}


def validate_filename(filename: str) -> str:
    cleaned = filename.strip()
    if not cleaned:
        raise ValueError("Filename cannot be empty.")
    if "/" in cleaned or "\\" in cleaned or ".." in cleaned:
        raise ValueError("Filename must not contain directory traversal characters ('/', '\\', '..').")
    if len(cleaned) > 255:
        raise ValueError("Filename cannot exceed 255 characters.")
    return cleaned


def validate_file_safety(filename: str, mime_type: str | None = None) -> str:
    cleaned = validate_filename(filename)
    lower = cleaned.lower()
    for ext in DANGEROUS_EXTENSIONS:
        if lower.endswith(ext):
            raise ValueError(f"File type with extension '{ext}' is restricted and not permitted.")

    if mime_type:
        dangerous_mimes = {
            "application/x-msdownload", "application/x-sh", "application/x-bat",
            "application/x-executable", "application/x-dosexec"
        }
        if mime_type.lower() in dangerous_mimes:
            raise ValueError(f"MIME type '{mime_type}' is restricted and not permitted.")
    return cleaned


class RelatedResourceBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    resource_type: ResourceType
    name: str
    file_name: str | None = None
    url: str | None = None
    mime_type: str | None = None
    file_size_bytes: int | None = None


class ProjectResourceCreate(BaseModel):
    resource_type: ResourceType
    name: str
    description: str | None = None

    # File fields
    file_name: str | None = None
    file_size_bytes: int | None = Field(default=None, ge=0)
    mime_type: str | None = None
    storage_key: str | None = None
    checksum_sha256: str | None = None

    # Link fields
    url: str | None = None
    link_category: str | None = None

    # Deliverable fields
    deliverable_version: str | None = None
    delivery_date: date | None = None
    deliverable_status: DeliverableStatus | None = None
    related_resource_id: uuid.UUID | None = None

    @model_validator(mode="after")
    def validate_resource_type_fields(self) -> "ProjectResourceCreate":
        if not self.name or not self.name.strip():
            raise ValueError("Resource name cannot be empty.")
        self.name = self.name.strip()

        if self.resource_type == ResourceType.FILE:
            if not self.file_name:
                raise ValueError("file_name is required for FILE resources.")
            self.file_name = validate_file_safety(self.file_name, self.mime_type)
            if self.file_size_bytes is None or self.file_size_bytes < 0:
                raise ValueError("file_size_bytes must be a non-negative integer.")
            if not self.mime_type or not self.mime_type.strip():
                raise ValueError("mime_type is required for FILE resources.")
            if self.storage_key and ".." in self.storage_key:
                raise ValueError("storage_key must not contain path traversal ('..').")

        elif self.resource_type == ResourceType.LINK:
            if not self.url:
                raise ValueError("url is required for LINK resources.")
            self.url = validate_http_url(self.url)

        elif self.resource_type == ResourceType.DELIVERABLE:
            if not self.deliverable_status:
                self.deliverable_status = DeliverableStatus.SUBMITTED

        return self


class ProjectResourceUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    file_name: str | None = None
    url: str | None = None
    link_category: str | None = None
    deliverable_version: str | None = None
    delivery_date: date | None = None
    deliverable_status: DeliverableStatus | None = None

    @model_validator(mode="after")
    def validate_update_fields(self) -> "ProjectResourceUpdate":
        if self.name is not None:
            cleaned_name = self.name.strip()
            if not cleaned_name:
                raise ValueError("Resource name cannot be empty.")
            self.name = cleaned_name

        if self.file_name is not None:
            self.file_name = validate_file_safety(self.file_name)

        if self.url is not None:
            self.url = validate_http_url(self.url)

        return self


class DeliverableRegisterRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    deliverable_version: str | None = "v1.0"
    delivery_date: date | None = None
    deliverable_status: DeliverableStatus = DeliverableStatus.SUBMITTED


class ProjectResourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    resource_type: ResourceType
    name: str
    description: str | None = None
    status: ResourceStatus

    # File fields
    file_name: str | None = None
    file_size_bytes: int | None = None
    mime_type: str | None = None
    storage_key: str | None = None
    checksum_sha256: str | None = None

    # Link fields
    url: str | None = None
    link_category: str | None = None

    # Deliverable fields
    deliverable_version: str | None = None
    delivery_date: date | None = None
    deliverable_status: DeliverableStatus | None = None
    related_resource_id: uuid.UUID | None = None
    related_resource: RelatedResourceBrief | None = None

    # Audit & Lifecycle
    created_by_user_id: uuid.UUID | None = None
    updated_by_user_id: uuid.UUID | None = None
    archived_by_user_id: uuid.UUID | None = None
    archived_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
