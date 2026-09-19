import hashlib
import uuid

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Response,
    UploadFile,
    status,
)
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from projectpilot.api.deps import get_current_user, get_db
from projectpilot.api.schemas.resource import (
    DeliverableRegisterRequest,
    ProjectResourceCreate,
    ProjectResourceResponse,
    ProjectResourceUpdate,
    ProjectTextContentResponse,
    ProjectTextResourceCreate,
    ProjectTextResourceUpdate,
    validate_file_safety,
)
from projectpilot.core.config import get_settings
from projectpilot.persistence.base import utc_now
from projectpilot.persistence.models.activity import ActivityEvent
from projectpilot.persistence.models.project import Project
from projectpilot.persistence.models.resource import (
    ProjectResource,
    ResourceStatus,
    ResourceType,
)
from projectpilot.persistence.models.timeline_team import ProjectMember
from projectpilot.persistence.models.user import User, UserRole
from projectpilot.services.storage import get_storage_provider

router = APIRouter(prefix="/projects/{project_id}/resources", tags=["Project Resources"])


async def verify_project_access(
    project_id: uuid.UUID,
    user: User,
    db: AsyncSession,
) -> Project:
    p_res = await db.execute(select(Project).where(Project.id == project_id))
    project = p_res.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    # 1. Admin has global access
    if user.role == UserRole.ADMIN:
        return project

    # 2. Project Owner has access
    if project.owner_id == user.id:
        return project

    # 3. Project Member check
    member_res = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user.id,
        )
    )
    if member_res.scalar_one_or_none():
        return project

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have permission to access resources in this project.",
    )


# =========================================================================
# 1. LIST RESOURCES
# =========================================================================
@router.get("", response_model=list[ProjectResourceResponse])
async def list_project_resources(
    project_id: uuid.UUID,
    type: ResourceType | None = Query(None, description="Filter by resource type"),
    resource_type: ResourceType | None = Query(None, description="Alternative filter for resource type"),
    include_archived: bool = Query(False, description="Include archived resources"),
    search: str | None = Query(None, description="Search term for name or description"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)

    query = (
        select(ProjectResource)
        .options(selectinload(ProjectResource.related_resource))
        .where(ProjectResource.project_id == project_id)
    )

    if not include_archived:
        query = query.where(ProjectResource.status == ResourceStatus.ACTIVE)

    res_type = type or resource_type
    if res_type:
        query = query.where(ProjectResource.resource_type == res_type)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            or_(
                ProjectResource.name.ilike(term),
                ProjectResource.description.ilike(term),
                ProjectResource.file_name.ilike(term),
            )
        )

    query = query.order_by(ProjectResource.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


# =========================================================================
# 2. CREATE RESOURCE
# =========================================================================
@router.post("", response_model=ProjectResourceResponse, status_code=status.HTTP_201_CREATED)
async def create_project_resource(
    project_id: uuid.UUID,
    payload: ProjectResourceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await verify_project_access(project_id, current_user, db)

    # Validate related_resource_id if specified
    if payload.related_resource_id:
        rel_res = await db.execute(
            select(ProjectResource).where(
                ProjectResource.id == payload.related_resource_id,
                ProjectResource.project_id == project_id,
            )
        )
        if not rel_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Related resource does not exist in this project.",
            )

    new_id = uuid.uuid4()
    storage_key = payload.storage_key
    if payload.resource_type == ResourceType.FILE and not storage_key:
        storage_key = f"projects/{project_id}/resources/{new_id}/{payload.file_name}"

    resource = ProjectResource(
        id=new_id,
        project_id=project_id,
        resource_type=payload.resource_type,
        name=payload.name,
        description=payload.description,
        status=ResourceStatus.ACTIVE,
        file_name=payload.file_name,
        file_size_bytes=payload.file_size_bytes,
        mime_type=payload.mime_type,
        storage_key=storage_key,
        checksum_sha256=payload.checksum_sha256,
        url=payload.url,
        link_category=payload.link_category,
        deliverable_version=payload.deliverable_version,
        delivery_date=payload.delivery_date,
        deliverable_status=payload.deliverable_status,
        related_resource_id=payload.related_resource_id,
        created_by_user_id=current_user.id,
        updated_by_user_id=current_user.id,
    )
    db.add(resource)
    await db.flush()

    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="RESOURCE_CREATED",
        description=f"Resource '{resource.name}' ({resource.resource_type.value}) berhasil ditambahkan ke project.",
        event_metadata={
            "resource_id": str(resource.id),
            "resource_type": resource.resource_type.value,
            "resource_name": resource.name,
        },
    )
    db.add(activity)
    await db.commit()

    query = (
        select(ProjectResource)
        .options(selectinload(ProjectResource.related_resource))
        .where(ProjectResource.id == resource.id)
    )
    refreshed = await db.execute(query)
    return refreshed.scalar_one()


# =========================================================================
# 2B. UPLOAD FILE RESOURCE (MULTIPART)
# =========================================================================
@router.post("/upload", response_model=ProjectResourceResponse, status_code=status.HTTP_201_CREATED)
async def upload_project_resource_file(
    project_id: uuid.UUID,
    file: UploadFile = File(...),
    name: str | None = Form(None),
    description: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)
    settings = get_settings()

    raw_filename = file.filename or ""
    if not raw_filename.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Filename cannot be empty.",
        )

    try:
        safe_filename = validate_file_safety(raw_filename, file.content_type)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )

    content = await file.read()
    file_size = len(content)

    if file_size > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size ({file_size} bytes) exceeds maximum limit of {settings.MAX_UPLOAD_SIZE_BYTES} bytes.",
        )

    checksum = hashlib.sha256(content).hexdigest()
    new_id = uuid.uuid4()
    storage_key = f"projects/{project_id}/resources/{new_id}/{safe_filename}"
    content_type = file.content_type or "application/octet-stream"

    storage = get_storage_provider()
    try:
        await storage.store(storage_key, content, content_type)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to store uploaded file: {e!s}",
        )

    resource_name = name.strip() if (name and name.strip()) else safe_filename
    resource = ProjectResource(
        id=new_id,
        project_id=project_id,
        resource_type=ResourceType.FILE,
        name=resource_name,
        description=description.strip() if (description and description.strip()) else None,
        status=ResourceStatus.ACTIVE,
        file_name=safe_filename,
        file_size_bytes=file_size,
        mime_type=content_type,
        storage_key=storage_key,
        checksum_sha256=checksum,
        created_by_user_id=current_user.id,
        updated_by_user_id=current_user.id,
    )

    try:
        db.add(resource)
        activity = ActivityEvent(
            project_id=project_id,
            actor_id=current_user.id,
            event_type="RESOURCE_FILE_UPLOADED",
            description=f"File '{resource.name}' ({resource.file_name}) berhasil diunggah ke project.",
            event_metadata={
                "resource_id": str(resource.id),
                "file_name": resource.file_name,
                "file_size_bytes": resource.file_size_bytes,
                "mime_type": resource.mime_type,
            },
        )
        db.add(activity)
        await db.commit()
    except Exception as e:  # noqa: BLE001
        await db.rollback()
        # Compensating failure safety: cleanup stored binary if database fails
        await storage.delete(storage_key)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to persist resource metadata: {e!s}",
        )

    query = (
        select(ProjectResource)
        .options(selectinload(ProjectResource.related_resource))
        .where(ProjectResource.id == resource.id)
    )
    refreshed = await db.execute(query)
    return refreshed.scalar_one()


# =========================================================================
# 2B. CREATE TEXT RESOURCE (MARKDOWN / TEXT)
# =========================================================================
@router.post("/text", response_model=ProjectResourceResponse, status_code=status.HTTP_201_CREATED)
async def create_text_resource(
    project_id: uuid.UUID,
    payload: ProjectTextResourceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)

    storage = get_storage_provider()
    new_id = uuid.uuid4()
    content_bytes = payload.content.encode("utf-8")
    file_size = len(content_bytes)
    checksum = hashlib.sha256(content_bytes).hexdigest()
    safe_filename = payload.file_name or f"{payload.name.lower().replace(' ', '_')}.md"
    storage_key = f"projects/{project_id}/resources/{new_id}/{safe_filename}"

    try:
        await storage.store(
            storage_key,
            content_bytes,
            "text/markdown",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to store text document: {e!s}",
        )

    resource = ProjectResource(
        id=new_id,
        project_id=project_id,
        resource_type=ResourceType.FILE,
        name=payload.name,
        description=payload.description.strip() if payload.description else None,
        status=ResourceStatus.ACTIVE,
        file_name=safe_filename,
        file_size_bytes=file_size,
        mime_type="text/markdown",
        storage_key=storage_key,
        checksum_sha256=checksum,
        created_by_user_id=current_user.id,
        updated_by_user_id=current_user.id,
    )

    try:
        db.add(resource)
        activity = ActivityEvent(
            project_id=project_id,
            actor_id=current_user.id,
            event_type="RESOURCE_TEXT_CREATED",
            description=f"Dokumen teks markdown '{resource.name}' ({resource.file_name}) berhasil dibuat.",
            event_metadata={
                "resource_id": str(resource.id),
                "file_name": resource.file_name,
                "file_size_bytes": resource.file_size_bytes,
                "mime_type": resource.mime_type,
            },
        )
        db.add(activity)
        await db.commit()
    except Exception as e:
        await db.rollback()
        await storage.delete(storage_key)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save text resource metadata: {e!s}",
        )

    query = (
        select(ProjectResource)
        .options(selectinload(ProjectResource.related_resource))
        .where(ProjectResource.id == resource.id)
    )
    refreshed = await db.execute(query)
    return refreshed.scalar_one()


# =========================================================================
# 2C. UPDATE TEXT RESOURCE CONTENT & METADATA
# =========================================================================
@router.put("/{resource_id}/text", response_model=ProjectResourceResponse)
async def update_text_resource(
    project_id: uuid.UUID,
    resource_id: uuid.UUID,
    payload: ProjectTextResourceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)

    query = (
        select(ProjectResource)
        .options(selectinload(ProjectResource.related_resource))
        .where(
            ProjectResource.id == resource_id,
            ProjectResource.project_id == project_id,
        )
    )
    res = await db.execute(query)
    resource = res.scalar_one_or_none()
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found in this project.",
        )

    storage = get_storage_provider()
    content_bytes = payload.content.encode("utf-8")
    file_size = len(content_bytes)
    checksum = hashlib.sha256(content_bytes).hexdigest()

    safe_filename = payload.file_name or resource.file_name or f"{resource.name.lower().replace(' ', '_')}.md"
    storage_key = resource.storage_key or f"projects/{project_id}/resources/{resource.id}/{safe_filename}"

    try:
        await storage.store(
            storage_key,
            content_bytes,
            "text/markdown",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update text document storage: {e!s}",
        )

    if payload.name:
        resource.name = payload.name
    if payload.description is not None:
        resource.description = payload.description.strip() if payload.description else None
    resource.file_name = safe_filename
    resource.file_size_bytes = file_size
    resource.storage_key = storage_key
    resource.checksum_sha256 = checksum
    resource.updated_by_user_id = current_user.id
    resource.updated_at = utc_now()

    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="RESOURCE_TEXT_UPDATED",
        description=f"Dokumen teks markdown '{resource.name}' ({resource.file_name}) diperbarui.",
        event_metadata={
            "resource_id": str(resource.id),
            "file_name": resource.file_name,
            "file_size_bytes": resource.file_size_bytes,
        },
    )
    db.add(activity)
    await db.commit()
    await db.refresh(resource)
    return resource


# =========================================================================
# 2D. GET TEXT RESOURCE RAW CONTENT
# =========================================================================
@router.get("/{resource_id}/content", response_model=ProjectTextContentResponse)
async def get_text_resource_content(
    project_id: uuid.UUID,
    resource_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)

    query = select(ProjectResource).where(
        ProjectResource.id == resource_id,
        ProjectResource.project_id == project_id,
    )
    result = await db.execute(query)
    resource = result.scalar_one_or_none()
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found in this project.",
        )

    if not resource.storage_key:
        return ProjectTextContentResponse(
            id=resource.id,
            name=resource.name,
            file_name=resource.file_name,
            content="",
        )

    storage = get_storage_provider()
    try:
        data, _ = await storage.get(resource.storage_key)
        text_content = data.decode("utf-8", errors="replace")
    except FileNotFoundError:
        text_content = ""

    return ProjectTextContentResponse(
        id=resource.id,
        name=resource.name,
        file_name=resource.file_name,
        content=text_content,
    )


# =========================================================================
# 3. GET SINGLE RESOURCE
# =========================================================================
@router.get("/{resource_id}", response_model=ProjectResourceResponse)
async def get_project_resource(
    project_id: uuid.UUID,
    resource_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)

    query = (
        select(ProjectResource)
        .options(selectinload(ProjectResource.related_resource))
        .where(
            ProjectResource.id == resource_id,
            ProjectResource.project_id == project_id,
        )
    )
    result = await db.execute(query)
    resource = result.scalar_one_or_none()
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found in this project.",
        )
    return resource


# =========================================================================
# 3B. DOWNLOAD RESOURCE FILE
# =========================================================================
@router.get("/{resource_id}/download")
async def download_project_resource_file(
    project_id: uuid.UUID,
    resource_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)

    query = select(ProjectResource).where(
        ProjectResource.id == resource_id,
        ProjectResource.project_id == project_id,
    )
    result = await db.execute(query)
    resource = result.scalar_one_or_none()
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found in this project.",
        )

    if resource.resource_type != ResourceType.FILE or not resource.storage_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resource is not a downloadable file.",
        )

    storage = get_storage_provider()
    try:
        data, content_type = await storage.get(resource.storage_key)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File content not found in storage.",
        )

    media_type = resource.mime_type or content_type or "application/octet-stream"
    safe_filename = resource.file_name or "download"

    return Response(
        content=data,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{safe_filename}"',
            "Content-Length": str(len(data)),
        },
    )


# =========================================================================
# 4. UPDATE RESOURCE
# =========================================================================
@router.patch("/{resource_id}", response_model=ProjectResourceResponse)
async def update_project_resource(
    project_id: uuid.UUID,
    resource_id: uuid.UUID,
    payload: ProjectResourceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)

    query = (
        select(ProjectResource)
        .options(selectinload(ProjectResource.related_resource))
        .where(
            ProjectResource.id == resource_id,
            ProjectResource.project_id == project_id,
        )
    )
    result = await db.execute(query)
    resource = result.scalar_one_or_none()
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found in this project.",
        )

    if payload.name is not None:
        resource.name = payload.name
    if payload.description is not None:
        resource.description = payload.description
    if payload.file_name is not None and resource.resource_type == ResourceType.FILE:
        resource.file_name = payload.file_name
    if payload.url is not None and resource.resource_type == ResourceType.LINK:
        resource.url = payload.url
    if payload.link_category is not None and resource.resource_type == ResourceType.LINK:
        resource.link_category = payload.link_category
    if payload.deliverable_version is not None and resource.resource_type == ResourceType.DELIVERABLE:
        resource.deliverable_version = payload.deliverable_version
    if payload.delivery_date is not None and resource.resource_type == ResourceType.DELIVERABLE:
        resource.delivery_date = payload.delivery_date
    if payload.deliverable_status is not None and resource.resource_type == ResourceType.DELIVERABLE:
        resource.deliverable_status = payload.deliverable_status

    resource.updated_by_user_id = current_user.id
    await db.commit()

    query = (
        select(ProjectResource)
        .options(selectinload(ProjectResource.related_resource))
        .where(ProjectResource.id == resource_id)
    )
    refreshed = await db.execute(query)
    return refreshed.scalar_one()


# =========================================================================
# 5. ARCHIVE RESOURCE
# =========================================================================
@router.post("/{resource_id}/archive", response_model=ProjectResourceResponse)
async def archive_project_resource(
    project_id: uuid.UUID,
    resource_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)

    query = (
        select(ProjectResource)
        .options(selectinload(ProjectResource.related_resource))
        .where(
            ProjectResource.id == resource_id,
            ProjectResource.project_id == project_id,
        )
    )
    result = await db.execute(query)
    resource = result.scalar_one_or_none()
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found in this project.",
        )

    resource.status = ResourceStatus.ARCHIVED
    resource.archived_at = utc_now()
    resource.archived_by_user_id = current_user.id
    resource.updated_by_user_id = current_user.id

    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="RESOURCE_ARCHIVED",
        description=f"Resource '{resource.name}' telah diarsipkan.",
        event_metadata={
            "resource_id": str(resource.id),
            "resource_type": resource.resource_type.value,
        },
    )
    db.add(activity)
    await db.commit()

    query = (
        select(ProjectResource)
        .options(selectinload(ProjectResource.related_resource))
        .where(ProjectResource.id == resource_id)
    )
    refreshed = await db.execute(query)
    return refreshed.scalar_one()


# =========================================================================
# 6. RESTORE RESOURCE
# =========================================================================
@router.post("/{resource_id}/restore", response_model=ProjectResourceResponse)
async def restore_project_resource(
    project_id: uuid.UUID,
    resource_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)

    query = (
        select(ProjectResource)
        .options(selectinload(ProjectResource.related_resource))
        .where(
            ProjectResource.id == resource_id,
            ProjectResource.project_id == project_id,
        )
    )
    result = await db.execute(query)
    resource = result.scalar_one_or_none()
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found in this project.",
        )

    resource.status = ResourceStatus.ACTIVE
    resource.archived_at = None
    resource.archived_by_user_id = None
    resource.updated_by_user_id = current_user.id

    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="RESOURCE_RESTORED",
        description=f"Resource '{resource.name}' dikembalikan dari arsip.",
        event_metadata={
            "resource_id": str(resource.id),
            "resource_type": resource.resource_type.value,
        },
    )
    db.add(activity)
    await db.commit()

    query = (
        select(ProjectResource)
        .options(selectinload(ProjectResource.related_resource))
        .where(ProjectResource.id == resource_id)
    )
    refreshed = await db.execute(query)
    return refreshed.scalar_one()


# =========================================================================
# 7. REGISTER RESOURCE AS DELIVERABLE
# =========================================================================
@router.post(
    "/{resource_id}/deliverable",
    response_model=ProjectResourceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_deliverable_from_resource(
    project_id: uuid.UUID,
    resource_id: uuid.UUID,
    payload: DeliverableRegisterRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await verify_project_access(project_id, current_user, db)

    # Fetch source resource
    query = select(ProjectResource).where(
        ProjectResource.id == resource_id,
        ProjectResource.project_id == project_id,
    )
    result = await db.execute(query)
    source_resource = result.scalar_one_or_none()
    if not source_resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source resource not found in this project.",
        )

    deliv_name = payload.name.strip() if (payload.name and payload.name.strip()) else f"Deliverable: {source_resource.name}"
    deliv_desc = payload.description if payload.description is not None else source_resource.description
    deliv_date = payload.delivery_date or utc_now().date()

    deliverable = ProjectResource(
        id=uuid.uuid4(),
        project_id=project_id,
        resource_type=ResourceType.DELIVERABLE,
        name=deliv_name,
        description=deliv_desc,
        status=ResourceStatus.ACTIVE,
        deliverable_version=payload.deliverable_version or "v1.0",
        delivery_date=deliv_date,
        deliverable_status=payload.deliverable_status,
        related_resource_id=source_resource.id,
        created_by_user_id=current_user.id,
        updated_by_user_id=current_user.id,
    )
    db.add(deliverable)
    await db.flush()

    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="DELIVERABLE_REGISTERED",
        description=f"Deliverable '{deliverable.name}' ({deliverable.deliverable_version}) didaftarkan dari resource '{source_resource.name}'.",
        event_metadata={
            "deliverable_id": str(deliverable.id),
            "source_resource_id": str(source_resource.id),
            "version": deliverable.deliverable_version,
        },
    )
    db.add(activity)
    await db.commit()

    query = (
        select(ProjectResource)
        .options(selectinload(ProjectResource.related_resource))
        .where(ProjectResource.id == deliverable.id)
    )
    refreshed = await db.execute(query)
    return refreshed.scalar_one()


# =========================================================================
# 8. SOFT-DELETE (ALIAS TO ARCHIVE)
# =========================================================================
@router.delete("/{resource_id}", response_model=ProjectResourceResponse)
async def delete_project_resource(
    project_id: uuid.UUID,
    resource_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft-delete resource by transitioning it to ARCHIVED status."""
    return await archive_project_resource(project_id, resource_id, db, current_user)
