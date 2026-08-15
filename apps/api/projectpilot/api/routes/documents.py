import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from projectpilot.ai.gemini_adapter import gemini_adapter
from projectpilot.ai.prompt_registry import SYSTEM_LANGUAGE_INSTRUCTION, get_prompt
from projectpilot.api.deps import get_current_pm, get_current_user, get_db
from projectpilot.api.schemas.document import (
    DocumentGenerateRequest,
    DocumentResponse,
    DocumentUpdateRequest,
    PortfolioDocumentItemResponse,
)
from projectpilot.persistence.base import utc_now
from projectpilot.persistence.models.activity import ActivityEvent
from projectpilot.persistence.models.document import (
    DocumentEvidence,
    DocumentStatus,
    DocumentType,
    GeneratedDocument,
)
from projectpilot.persistence.models.project import Project
from projectpilot.persistence.models.user import User
from projectpilot.services.document_evidence_resolver import resolve_document_evidence

router = APIRouter(tags=["Documentation Generation"])


# =========================================================================
# 1. GENERATE DOCUMENT DRAFT
# =========================================================================
@router.post(
    "/projects/{project_id}/documents/generate-draft",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_document_draft(
    project_id: uuid.UUID,
    req: DocumentGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    try:
        resolved = await resolve_document_evidence(
            project_id=project_id,
            document_type=req.document_type,
            db=db,
        )
    except ValueError:
        raise HTTPException(status_code=404, detail="Project not found.")

    project = resolved["project"]
    evidence_text = resolved["evidence_text"]
    if req.custom_instructions:
        evidence_text += f"\nCustom PM Instructions:\n{req.custom_instructions}\n"

    capability = f"DOC_{req.document_type.value}"
    prompt = get_prompt(capability, project_name=project.name, evidence=evidence_text)
    ai_result = await gemini_adapter.generate_structured(
        prompt=prompt,
        system_instruction=SYSTEM_LANGUAGE_INSTRUCTION,
        capability=capability,
    )

    count_res = await db.execute(select(GeneratedDocument).where(GeneratedDocument.project_id == project_id))
    existing_count = len(count_res.scalars().all())
    doc_key = f"DOC-{(existing_count + 1):03d}"

    title = ai_result.get("title", f"Dokumen {req.document_type.value}: {project.name}")
    content = ai_result.get("content", "# Dokumentasi Proyek\n\nKonten sedang diproses.")
    summary = ai_result.get("summary")

    doc = GeneratedDocument(
        project_id=project_id,
        document_key=doc_key,
        document_type=req.document_type,
        title=title,
        status=DocumentStatus.DRAFT,
        version=1,
        content=content,
        summary=summary,
        created_by_user_id=current_user.id,
    )
    db.add(doc)
    await db.flush()

    for snap in resolved["snapshots"]:
        db.add(
            DocumentEvidence(
                generated_document_id=doc.id,
                evidence_type=snap["evidence_type"],
                evidence_entity_id=snap["evidence_entity_id"],
                evidence_snapshot=snap["evidence_snapshot"],
            )
        )

    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="DOCUMENT_DRAFT_GENERATED",
        description=f"Draft dokumen '{doc.title}' ({doc.document_key} v1) dibuat dari bukti proyek.",
    )
    db.add(activity)

    await db.commit()

    query = (
        select(GeneratedDocument)
        .where(GeneratedDocument.id == doc.id)
        .options(selectinload(GeneratedDocument.evidences))
    )
    res = await db.execute(query)
    return res.scalar_one()


# =========================================================================
# 2. LIST & GET DOCUMENTS
# =========================================================================
@router.get("/projects/{project_id}/documents", response_model=List[DocumentResponse])
async def list_project_documents(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(GeneratedDocument)
        .where(GeneratedDocument.project_id == project_id)
        .options(selectinload(GeneratedDocument.evidences))
        .order_by(GeneratedDocument.created_at.desc())
    )
    res = await db.execute(query)
    return res.scalars().all()


@router.get("/projects/{project_id}/documents/{document_id}", response_model=DocumentResponse)
async def get_document_detail(
    project_id: uuid.UUID,
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(GeneratedDocument)
        .where(GeneratedDocument.id == document_id, GeneratedDocument.project_id == project_id)
        .options(selectinload(GeneratedDocument.evidences))
    )
    res = await db.execute(query)
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc


# =========================================================================
# 3. UPDATE / EDIT DOCUMENT
# =========================================================================
@router.put("/projects/{project_id}/documents/{document_id}", response_model=DocumentResponse)
async def update_document(
    project_id: uuid.UUID,
    document_id: uuid.UUID,
    doc_in: DocumentUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(GeneratedDocument)
        .where(GeneratedDocument.id == document_id, GeneratedDocument.project_id == project_id)
        .options(selectinload(GeneratedDocument.evidences))
    )
    res = await db.execute(query)
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if doc.status == DocumentStatus.FINAL:
        raise HTTPException(
            status_code=400,
            detail="Finalized document cannot be edited directly. Create a new revision version instead.",
        )

    for field, val in doc_in.model_dump(exclude_unset=True).items():
        setattr(doc, field, val)

    await db.commit()
    await db.refresh(doc)
    return doc


# =========================================================================
# 4. FINALIZE DOCUMENT
# =========================================================================
@router.post("/projects/{project_id}/documents/{document_id}/finalize", response_model=DocumentResponse)
async def finalize_document(
    project_id: uuid.UUID,
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(GeneratedDocument)
        .where(GeneratedDocument.id == document_id, GeneratedDocument.project_id == project_id)
        .options(selectinload(GeneratedDocument.evidences))
    )
    res = await db.execute(query)
    doc = res.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    doc.status = DocumentStatus.FINAL
    doc.finalized_by_user_id = current_user.id
    doc.finalized_at = utc_now()

    if doc.supersedes_document_id:
        old_res = await db.execute(select(GeneratedDocument).where(GeneratedDocument.id == doc.supersedes_document_id))
        old_doc = old_res.scalar_one_or_none()
        if old_doc:
            old_doc.status = DocumentStatus.SUPERSEDED

    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="DOCUMENT_FINALIZED",
        description=f"Dokumen '{doc.title}' ({doc.document_key} v{doc.version}) telah difinalisasi.",
    )
    db.add(activity)

    await db.commit()
    await db.refresh(doc)
    return doc


# =========================================================================
# 5. CREATE NEW REVISION VERSION
# =========================================================================
@router.post("/projects/{project_id}/documents/{document_id}/create-version", response_model=DocumentResponse)
async def create_document_version(
    project_id: uuid.UUID,
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(GeneratedDocument)
        .where(GeneratedDocument.id == document_id, GeneratedDocument.project_id == project_id)
        .options(selectinload(GeneratedDocument.evidences))
    )
    res = await db.execute(query)
    source_doc = res.scalar_one_or_none()
    if not source_doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    new_doc = GeneratedDocument(
        project_id=project_id,
        document_key=source_doc.document_key,
        document_type=source_doc.document_type,
        title=f"{source_doc.title} (Rev {source_doc.version + 1})",
        status=DocumentStatus.DRAFT,
        version=source_doc.version + 1,
        content=source_doc.content,
        summary=source_doc.summary,
        created_by_user_id=current_user.id,
        supersedes_document_id=source_doc.id,
    )
    db.add(new_doc)
    await db.flush()

    for ev in source_doc.evidences:
        db.add(
            DocumentEvidence(
                generated_document_id=new_doc.id,
                evidence_type=ev.evidence_type,
                evidence_entity_id=ev.evidence_entity_id,
                evidence_snapshot=ev.evidence_snapshot,
            )
        )

    await db.commit()

    query_new = (
        select(GeneratedDocument)
        .where(GeneratedDocument.id == new_doc.id)
        .options(selectinload(GeneratedDocument.evidences))
    )
    res_new = await db.execute(query_new)
    return res_new.scalar_one()


# =========================================================================
# 6. GLOBAL PORTFOLIO DOCUMENTS FEED
# =========================================================================
@router.get("/documents", response_model=List[PortfolioDocumentItemResponse])
async def list_portfolio_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(GeneratedDocument)
        .options(selectinload(GeneratedDocument.project))
        .order_by(GeneratedDocument.created_at.desc())
    )
    res = await db.execute(query)
    docs = res.scalars().all()

    items = []
    for d in docs:
        items.append(
            PortfolioDocumentItemResponse(
                id=d.id,
                project_id=d.project_id,
                project_name=d.project.name if d.project else "Unknown",
                project_code=d.project.code if d.project else "",
                document_key=d.document_key,
                document_type=d.document_type,
                title=d.title,
                status=d.status,
                version=d.version,
                summary=d.summary,
                created_at=d.created_at,
                finalized_at=d.finalized_at,
            )
        )
    return items
