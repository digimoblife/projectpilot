import uuid
from typing import Any, Dict, List, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from projectpilot.persistence.base import utc_now
from projectpilot.persistence.models.handover import (
    Handover,
    HandoverItem,
    HandoverItemStatus,
    HandoverItemType,
    HandoverStatus,
)
from projectpilot.persistence.models.issues_risks import Blocker, BlockerStatus
from projectpilot.persistence.models.project import Project, ProjectLifecycleStage

DEFAULT_HANDOVER_CHECKLIST = [
    {
        "item_type": HandoverItemType.PRODUCTION_DEPLOYMENT,
        "title": "Deployment Production & Verifikasi Smoke Test",
        "description": "Aplikasi telah live di environment production klien dan lulus uji smoke test tanpa error kritikal.",
        "required": True,
        "sort_order": 1,
    },
    {
        "item_type": HandoverItemType.UAT_APPROVAL,
        "title": "UAT Sign-Off & Berita Acara Penerimaan (BAP)",
        "description": "Stakeholder klien telah menandatangani persetujuan UAT dan berita acara penerimaan hasil pekerjaan.",
        "required": True,
        "sort_order": 2,
    },
    {
        "item_type": HandoverItemType.CLIENT_ACCEPTANCE,
        "title": "Konfirmasi Serah Terima Stakeholder Klien",
        "description": "Pemberitahuan resmi dan konfirmasi penutupan proyek dari sponsor klien.",
        "required": True,
        "sort_order": 3,
    },
    {
        "item_type": HandoverItemType.SOURCE_CODE,
        "title": "Penyerahan Repository & Source Code Bersih",
        "description": "Akses Git repository atau transfer kepemilikan source code kepada tim teknis klien.",
        "required": True,
        "sort_order": 4,
    },
    {
        "item_type": HandoverItemType.CREDENTIALS,
        "title": "Serah Terima Kredensial, Secrets & Akses Produksi",
        "description": "Kredensial database, API keys pihak ketiga, dan akses root server diserahterimakan secara aman.",
        "required": True,
        "sort_order": 5,
    },
    {
        "item_type": HandoverItemType.FSD,
        "title": "Dokumen Spesifikasi Fungsional (FSD) Final",
        "description": "Dokumen FSD berstatus FINAL yang mencakup baseline scope dan matriks kebutuhan.",
        "required": False,
        "sort_order": 6,
    },
    {
        "item_type": HandoverItemType.USER_GUIDE,
        "title": "Panduan Pengguna (User Manual)",
        "description": "Buku petunjuk operasional langkah demi langkah untuk pengguna akhir sistem.",
        "required": False,
        "sort_order": 7,
    },
    {
        "item_type": HandoverItemType.ADMIN_GUIDE,
        "title": "Panduan Administrator & Runbook Operasional",
        "description": "Dokumentasi teknis untuk admin TI klien terkait deployment, backup, dan troubleshooting.",
        "required": False,
        "sort_order": 8,
    },
    {
        "item_type": HandoverItemType.BACKUP_RECOVERY,
        "title": "Prosedur Backup & Disaster Recovery",
        "description": "Konfigurasi snapshot database dan instruksi pemulihan data berkala.",
        "required": False,
        "sort_order": 9,
    },
    {
        "item_type": HandoverItemType.TRAINING,
        "title": "Sesi Pelatihan User / Tim Operasional Klien",
        "description": "Pelaksanaan knowledge transfer atau workshop penggunaan sistem kepada staf klien.",
        "required": False,
        "sort_order": 10,
    },
]


async def get_or_create_handover(project_id: uuid.UUID, db: AsyncSession) -> Handover:
    """
    Retrieves the Handover record for a project, lazily creating it with default
    checklist items if it doesn't exist yet.
    """
    query = (
        select(Handover)
        .where(Handover.project_id == project_id)
        .options(
            selectinload(Handover.items).selectinload(HandoverItem.completed_by),
            selectinload(Handover.items).selectinload(HandoverItem.related_document),
            selectinload(Handover.project),
        )
    )
    res = await db.execute(query)
    handover = res.scalar_one_or_none()

    if not handover:
        handover = Handover(
            project_id=project_id,
            status=HandoverStatus.NOT_STARTED,
        )
        db.add(handover)
        await db.flush()

        for item_data in DEFAULT_HANDOVER_CHECKLIST:
            db.add(
                HandoverItem(
                    handover_id=handover.id,
                    item_type=item_data["item_type"],
                    title=item_data["title"],
                    description=item_data["description"],
                    required=item_data["required"],
                    status=HandoverItemStatus.PENDING,
                    sort_order=item_data["sort_order"],
                )
            )

        await db.commit()

        # Reload with relationships
        res = await db.execute(query)
        handover = res.scalar_one()

    return handover


async def validate_handover_completion_gate(
    handover: Handover,
    db: AsyncSession,
) -> Tuple[bool, List[str]]:
    """
    Evaluates whether the handover meets all conditions to transition to COMPLETED:
    1. Zero unresolved required items (must be COMPLETED, WAIVED, or NOT_APPLICABLE).
    2. Zero unresolved project blockers.
    """
    reasons: List[str] = []

    # Check checklist items
    for item in handover.items:
        if item.required:
            if item.status not in (
                HandoverItemStatus.COMPLETED,
                HandoverItemStatus.WAIVED,
                HandoverItemStatus.NOT_APPLICABLE,
            ):
                reasons.append(f"Item wajib '{item.title}' belum diselesaikan atau di-waive.")
            elif item.status == HandoverItemStatus.WAIVED and not item.waiver_reason:
                reasons.append(f"Item waived '{item.title}' memerlukan alasan waiver tertulis.")

    # Check active project blockers
    b_res = await db.execute(
        select(Blocker).where(
            Blocker.project_id == handover.project_id,
            Blocker.status.in_([BlockerStatus.ACTIVE, BlockerStatus.ESCALATED]),
        )
    )
    active_blockers = b_res.scalars().all()
    if active_blockers:
        reasons.append(f"Masih terdapat {len(active_blockers)} blocker aktif yang belum diselesaikan pada proyek.")

    is_eligible = len(reasons) == 0
    return is_eligible, reasons
