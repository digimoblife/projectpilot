import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.attributes import flag_modified

from projectpilot.ai.gemini_adapter import gemini_adapter
from projectpilot.ai.prompt_registry import SYSTEM_LANGUAGE_INSTRUCTION, get_prompt
from projectpilot.api.deps import get_current_user, get_db
from projectpilot.api.schemas.mom import (
    ActionItemUpdate,
    MoMDocumentResponse,
    MoMGenerateRequest,
    MoMListItemResponse,
    MoMUpdateRequest,
    PendingMoMItemResponse,
)
from projectpilot.persistence.base import utc_now
from projectpilot.persistence.models.activity import ActivityEvent
from projectpilot.persistence.models.mom import MoMDocument
from projectpilot.persistence.models.project import Project
from projectpilot.persistence.models.user import User

router = APIRouter(prefix="/mom", tags=["Minutes of Meeting (MoM) Generator"])


def _map_mom_response(doc: MoMDocument) -> MoMDocumentResponse:
    project_name = doc.project.name if doc.project else doc.project_name
    project_code = doc.project.code if doc.project else None

    return MoMDocumentResponse(
        id=doc.id,
        mom_key=doc.mom_key,
        title=doc.title,
        meeting_date=doc.meeting_date,
        project_id=doc.project_id,
        project_name=project_name,
        project_code=project_code,
        raw_text=doc.raw_text,
        content_md=doc.content_md,
        summary=doc.summary,
        attendees=doc.attendees or [],
        action_items=doc.action_items or [],
        decisions=doc.decisions or [],
        created_by_user_id=doc.created_by_user_id,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )


# =========================================================================
# 1. GENERATE MOM (AI COPILOT)
# =========================================================================
@router.post("/generate", response_model=MoMDocumentResponse, status_code=status.HTTP_201_CREATED)
async def generate_mom(
    req: MoMGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not req.raw_text.strip():
        raise HTTPException(status_code=400, detail="Teks mentah hasil rapat tidak boleh kosong.")

    project_name_input = req.project_name.strip() if req.project_name and req.project_name.strip() else None
    matched_project_id = req.project_id
    project_code = None

    if req.project_id:
        p_res = await db.execute(select(Project).where(Project.id == req.project_id))
        proj = p_res.scalar_one_or_none()
        if proj:
            project_name_input = proj.name
            project_code = proj.code
    elif project_name_input:
        p_res = await db.execute(
            select(Project).where(
                or_(
                    Project.name.ilike(project_name_input),
                    Project.code.ilike(project_name_input),
                )
            )
        )
        proj = p_res.scalars().first()
        if proj:
            matched_project_id = proj.id
            project_code = proj.code

    project_context = (
        f"Proyek: {project_name_input} ({project_code})"
        if project_code
        else f"Proyek: {project_name_input}"
        if project_name_input
        else "Tidak terikat proyek khusus (Umum)"
    )

    meeting_date_str = req.meeting_date.strftime("%d %B %Y") if req.meeting_date else "Hari ini"
    meeting_title_str = req.title.strip() if req.title and req.title.strip() else "Hasil Rapat"

    # Process explicit attendees if provided in dedicated form field
    explicit_attendees: List[str] = []
    if req.attendees:
        explicit_attendees = [a.strip() for a in req.attendees if a.strip()]
    elif req.attendees_raw:
        explicit_attendees = [a.strip() for a in req.attendees_raw.replace("\n", ",").split(",") if a.strip()]

    attendees_prompt_str = ", ".join(explicit_attendees) if explicit_attendees else "Ekstrak otomatis dari teks rapat jika tersedia"

    # Process previous outstanding items to review
    if req.previous_pending_items and len(req.previous_pending_items) > 0:
        outstanding_items_context = "\n".join([f"- {item}" for item in req.previous_pending_items])
    else:
        outstanding_items_context = "Tidak ada item tertunda dari rapat sebelumnya."

    prompt = get_prompt(
        "MOM_GENERATION",
        meeting_title=meeting_title_str,
        meeting_date=meeting_date_str,
        project_context=project_context,
        attendees=attendees_prompt_str,
        outstanding_items_context=outstanding_items_context,
        raw_text=req.raw_text,
    )

    ai_result = await gemini_adapter.generate_structured(
        prompt=prompt,
        system_instruction=SYSTEM_LANGUAGE_INSTRUCTION,
        capability="MOM_GENERATION",
    )

    # Generate sequential mom_key
    count_res = await db.execute(select(MoMDocument))
    existing_count = len(count_res.scalars().all())
    mom_key = f"MOM-{(existing_count + 1):03d}"

    final_title = req.title.strip() if req.title and req.title.strip() else ai_result.get("title", f"MoM Rapat: {project_name_input or 'Umum'}")
    content_md = ai_result.get("content_md", f"# Minutes of Meeting (MoM)\n\n{req.raw_text}")
    summary = ai_result.get("summary")
    attendees = explicit_attendees if explicit_attendees else (ai_result.get("attendees") or [])
    raw_action_items = ai_result.get("action_items") or []
    decisions = ai_result.get("decisions") or []

    # Normalize action items with id, category, and status
    normalized_action_items = []
    for idx, act in enumerate(raw_action_items):
        item_id = act.get("id") or f"ACT-{(idx + 1)}"
        category = act.get("category") or "ACTION_ITEM"
        if category not in ["ACTION_ITEM", "DEPENDENCY", "OPEN_ISSUE"]:
            category = "ACTION_ITEM"
        status_val = act.get("status") or "PENDING"
        if status_val not in ["PENDING", "COMPLETED", "CARRIED_OVER"]:
            status_val = "PENDING"
        normalized_action_items.append({
            "id": item_id,
            "title": act.get("title") or "Tindak lanjut rapat",
            "owner": act.get("owner") or act.get("owner_name") or "Tim Terkait",
            "due_date": act.get("due_date"),
            "category": category,
            "status": status_val,
        })

    doc = MoMDocument(
        mom_key=mom_key,
        title=final_title,
        meeting_date=req.meeting_date or utc_now(),
        project_id=matched_project_id,
        project_name=project_name_input,
        raw_text=req.raw_text,
        content_md=content_md,
        summary=summary,
        attendees=attendees,
        action_items=normalized_action_items,
        decisions=decisions,
        created_by_user_id=current_user.id,
    )
    db.add(doc)
    await db.flush()

    if matched_project_id:
        activity = ActivityEvent(
            project_id=matched_project_id,
            actor_id=current_user.id,
            event_type="MOM_GENERATED",
            description=f"Dokumen MoM '{doc.title}' ({doc.mom_key}) berhasil digenerate menggunakan AI.",
        )
        db.add(activity)

    await db.commit()

    # Re-fetch with project relationship
    query = select(MoMDocument).where(MoMDocument.id == doc.id).options(selectinload(MoMDocument.project))
    res = await db.execute(query)
    saved_doc = res.scalar_one()

    return _map_mom_response(saved_doc)


# =========================================================================
# 2. LIST MOM REPOSITORY / HISTORY
# =========================================================================
@router.get("", response_model=List[MoMListItemResponse])
async def list_mom_documents(
    q: Optional[str] = Query(None, description="Pencarian judul atau kode MOM"),
    project_id: Optional[uuid.UUID] = Query(None, description="Filter berdasarkan ID proyek"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(MoMDocument).options(selectinload(MoMDocument.project)).order_by(desc(MoMDocument.created_at))

    if project_id:
        query = query.where(MoMDocument.project_id == project_id)

    if q and q.strip():
        search_pattern = f"%{q.strip()}%"
        query = query.where(
            or_(
                MoMDocument.title.ilike(search_pattern),
                MoMDocument.mom_key.ilike(search_pattern),
                MoMDocument.project_name.ilike(search_pattern),
                MoMDocument.summary.ilike(search_pattern),
                MoMDocument.content_md.ilike(search_pattern),
            )
        )

    query = query.offset(offset).limit(limit)
    res = await db.execute(query)
    docs = res.scalars().all()

    items: List[MoMListItemResponse] = []
    for d in docs:
        action_count = len(d.action_items) if d.action_items else 0
        items.append(
            MoMListItemResponse(
                id=d.id,
                mom_key=d.mom_key,
                title=d.title,
                meeting_date=d.meeting_date,
                project_id=d.project_id,
                project_name=d.project.name if d.project else d.project_name,
                project_code=d.project.code if d.project else None,
                summary=d.summary,
                action_items_count=action_count,
                created_at=d.created_at,
            )
        )

    return items


# =========================================================================
# 3. GET PENDING & OUTSTANDING MOM CHECKLIST ITEMS
# =========================================================================
@router.get("/pending-items", response_model=List[PendingMoMItemResponse])
async def get_pending_mom_items(
    project_id: Optional[uuid.UUID] = Query(None, description="Filter berdasarkan ID proyek"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(MoMDocument).options(selectinload(MoMDocument.project)).order_by(desc(MoMDocument.meeting_date), desc(MoMDocument.created_at))
    if project_id:
        query = query.where(MoMDocument.project_id == project_id)

    res = await db.execute(query)
    docs = res.scalars().all()

    pending_items: List[PendingMoMItemResponse] = []
    for doc in docs:
        if not doc.action_items:
            continue
        for idx, item in enumerate(doc.action_items):
            status_val = (item.get("status") or "PENDING").upper()
            if status_val in ["PENDING", "CARRIED_OVER", "OPEN"]:
                pending_items.append(
                    PendingMoMItemResponse(
                        mom_id=doc.id,
                        mom_key=doc.mom_key,
                        meeting_title=doc.title,
                        project_id=doc.project_id,
                        project_name=doc.project.name if doc.project else doc.project_name,
                        item_index=idx,
                        id=item.get("id") or f"ACT-{idx+1}",
                        title=item.get("title") or "Tugas belum selesai",
                        owner=item.get("owner"),
                        due_date=item.get("due_date"),
                        category=item.get("category") or "ACTION_ITEM",
                        status=status_val,
                    )
                )
    return pending_items


# =========================================================================
# 4. GET MOM DETAIL
# =========================================================================
@router.get("/{mom_id}", response_model=MoMDocumentResponse)
async def get_mom_detail(
    mom_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(MoMDocument).where(MoMDocument.id == mom_id).options(selectinload(MoMDocument.project))
    res = await db.execute(query)
    doc = res.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Dokumen MoM tidak ditemukan.")

    return _map_mom_response(doc)


# =========================================================================
# 5. UPDATE ACTION ITEM STATUS (CHECKLIST INTERAKTIF)
# =========================================================================
@router.patch("/{mom_id}/items/{item_index}", response_model=MoMDocumentResponse)
async def update_action_item_status(
    mom_id: uuid.UUID,
    item_index: int,
    req: ActionItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(MoMDocument).where(MoMDocument.id == mom_id).options(selectinload(MoMDocument.project))
    res = await db.execute(query)
    doc = res.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Dokumen MoM tidak ditemukan.")

    items = list(doc.action_items or [])
    if item_index < 0 or item_index >= len(items):
        raise HTTPException(status_code=400, detail="Index item checklist tidak valid.")

    curr = dict(items[item_index])
    curr["status"] = req.status
    if req.title is not None:
        curr["title"] = req.title
    if req.owner is not None:
        curr["owner"] = req.owner
    if req.due_date is not None:
        curr["due_date"] = req.due_date
    if req.category is not None:
        curr["category"] = req.category

    items[item_index] = curr
    doc.action_items = items
    doc.updated_at = utc_now()
    flag_modified(doc, "action_items")

    await db.commit()
    await db.refresh(doc)
    return _map_mom_response(doc)


# =========================================================================
# 6. UPDATE MOM DOCUMENT
# =========================================================================
@router.put("/{mom_id}", response_model=MoMDocumentResponse)
async def update_mom_document(
    mom_id: uuid.UUID,
    req: MoMUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(MoMDocument).where(MoMDocument.id == mom_id).options(selectinload(MoMDocument.project))
    res = await db.execute(query)
    doc = res.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Dokumen MoM tidak ditemukan.")

    if req.title is not None:
        doc.title = req.title
    if req.content_md is not None:
        doc.content_md = req.content_md
    if req.summary is not None:
        doc.summary = req.summary
    if req.meeting_date is not None:
        doc.meeting_date = req.meeting_date
    if req.project_id is not None:
        doc.project_id = req.project_id
    if req.project_name is not None:
        doc.project_name = req.project_name
    if req.attendees is not None:
        doc.attendees = req.attendees
    if req.action_items is not None:
        doc.action_items = req.action_items
        flag_modified(doc, "action_items")

    doc.updated_at = utc_now()
    await db.commit()
    await db.refresh(doc)

    return _map_mom_response(doc)


# =========================================================================
# 7. DELETE MOM DOCUMENT
# =========================================================================
@router.delete("/{mom_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mom_document(
    mom_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(MoMDocument).where(MoMDocument.id == mom_id)
    res = await db.execute(query)
    doc = res.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Dokumen MoM tidak ditemukan.")

    await db.delete(doc)
    await db.commit()
    return None
