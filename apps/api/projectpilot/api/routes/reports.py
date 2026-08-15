import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from projectpilot.ai.gemini_adapter import gemini_adapter
from projectpilot.ai.prompt_registry import SYSTEM_LANGUAGE_INSTRUCTION, get_prompt
from projectpilot.api.deps import get_current_pm, get_current_user, get_db
from projectpilot.api.schemas.report import (
    PortfolioReportItemResponse,
    ReportGenerateRequest,
    ReportResponse,
    ReportUpdateRequest,
)
from projectpilot.persistence.base import utc_now
from projectpilot.persistence.models.activity import ActivityEvent
from projectpilot.persistence.models.project import Project
from projectpilot.persistence.models.report import Report, ReportEvidence, ReportStatus, ReportType
from projectpilot.persistence.models.user import User
from projectpilot.services.report_evidence_resolver import resolve_report_evidence

router = APIRouter(tags=["Weekly & Monthly Reporting"])


# =========================================================================
# 1. GENERATE REPORT DRAFT
# =========================================================================
@router.post(
    "/projects/{project_id}/reports/generate-draft",
    response_model=ReportResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_report_draft(
    project_id: uuid.UUID,
    req: ReportGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    # 1. Resolve Evidence & Snapshots
    try:
        resolved = await resolve_report_evidence(
            project_id=project_id,
            report_type=req.report_type,
            start_date=req.reporting_period_start,
            end_date=req.reporting_period_end,
            db=db,
        )
    except ValueError:
        raise HTTPException(status_code=404, detail="Project not found.")

    project = resolved["project"]
    evidence_text = resolved["evidence_text"]
    if req.custom_instructions:
        evidence_text += f"\nCustom PM Instructions:\n{req.custom_instructions}\n"

    # 2. Invoke Gemini Report Generator
    capability = f"REPORT_{req.report_type.value}"
    prompt = get_prompt(capability, project_name=project.name, evidence=evidence_text)
    ai_result = await gemini_adapter.generate_structured(
        prompt=prompt,
        system_instruction=SYSTEM_LANGUAGE_INSTRUCTION,
        capability=capability,
    )

    # 3. Generate Report Key
    count_res = await db.execute(select(Report).where(Report.project_id == project_id))
    existing_count = len(count_res.scalars().all())
    report_key = f"REP-{(existing_count + 1):03d}"

    title = ai_result.get("title", f"Laporan {req.report_type.value}: {project.name}")
    content = ai_result.get("content", "# Laporan Proyek\n\nKonten sedang diproses.")
    summary = ai_result.get("summary")

    # 4. Save Report Entity
    report = Report(
        project_id=project_id,
        report_key=report_key,
        report_type=req.report_type,
        reporting_period_start=req.reporting_period_start,
        reporting_period_end=req.reporting_period_end,
        status=ReportStatus.DRAFT,
        version=1,
        title=title,
        content=content,
        summary=summary,
        created_by_user_id=current_user.id,
    )
    db.add(report)
    await db.flush()

    # 5. Save Evidence Snapshots
    for snap in resolved["snapshots"]:
        db.add(
            ReportEvidence(
                report_id=report.id,
                evidence_type=snap["evidence_type"],
                evidence_entity_id=snap["evidence_entity_id"],
                evidence_snapshot=snap["evidence_snapshot"],
            )
        )

    # 6. Record Activity
    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="REPORT_DRAFT_GENERATED",
        description=f"Draft laporan '{report.title}' ({report.report_key} v1) dibuat dari bukti proyek.",
    )
    db.add(activity)

    await db.commit()

    # Return with evidences
    query = (
        select(Report)
        .where(Report.id == report.id)
        .options(selectinload(Report.evidences))
    )
    res = await db.execute(query)
    return res.scalar_one()


# =========================================================================
# 2. LIST & GET REPORTS
# =========================================================================
@router.get("/projects/{project_id}/reports", response_model=List[ReportResponse])
async def list_project_reports(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(Report)
        .where(Report.project_id == project_id)
        .options(selectinload(Report.evidences))
        .order_by(Report.created_at.desc())
    )
    res = await db.execute(query)
    return res.scalars().all()


@router.get("/projects/{project_id}/reports/{report_id}", response_model=ReportResponse)
async def get_report_detail(
    project_id: uuid.UUID,
    report_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(Report)
        .where(Report.id == report_id, Report.project_id == project_id)
        .options(selectinload(Report.evidences))
    )
    res = await db.execute(query)
    report = res.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")
    return report


# =========================================================================
# 3. UPDATE / EDIT REPORT
# =========================================================================
@router.put("/projects/{project_id}/reports/{report_id}", response_model=ReportResponse)
async def update_report(
    project_id: uuid.UUID,
    report_id: uuid.UUID,
    report_in: ReportUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(Report)
        .where(Report.id == report_id, Report.project_id == project_id)
        .options(selectinload(Report.evidences))
    )
    res = await db.execute(query)
    report = res.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")

    if report.status == ReportStatus.FINAL:
        raise HTTPException(
            status_code=400,
            detail="Finalized report cannot be modified directly. Create a new version revision instead.",
        )

    for field, val in report_in.model_dump(exclude_unset=True).items():
        setattr(report, field, val)

    await db.commit()
    await db.refresh(report)
    return report


# =========================================================================
# 4. FINALIZE REPORT
# =========================================================================
@router.post("/projects/{project_id}/reports/{report_id}/finalize", response_model=ReportResponse)
async def finalize_report(
    project_id: uuid.UUID,
    report_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(Report)
        .where(Report.id == report_id, Report.project_id == project_id)
        .options(selectinload(Report.evidences))
    )
    res = await db.execute(query)
    report = res.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")

    report.status = ReportStatus.FINAL
    report.finalized_by_user_id = current_user.id
    report.finalized_at = utc_now()

    # If this report supersedes an older report, mark the older as SUPERSEDED
    if report.supersedes_report_id:
        old_res = await db.execute(select(Report).where(Report.id == report.supersedes_report_id))
        old_report = old_res.scalar_one_or_none()
        if old_report:
            old_report.status = ReportStatus.SUPERSEDED

    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="REPORT_FINALIZED",
        description=f"Laporan '{report.title}' ({report.report_key} v{report.version}) telah difinalisasi.",
    )
    db.add(activity)

    await db.commit()
    await db.refresh(report)
    return report


# =========================================================================
# 5. CREATE NEW REVISION VERSION
# =========================================================================
@router.post("/projects/{project_id}/reports/{report_id}/create-version", response_model=ReportResponse)
async def create_report_version(
    project_id: uuid.UUID,
    report_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(Report)
        .where(Report.id == report_id, Report.project_id == project_id)
        .options(selectinload(Report.evidences))
    )
    res = await db.execute(query)
    source_report = res.scalar_one_or_none()
    if not source_report:
        raise HTTPException(status_code=404, detail="Report not found.")

    new_report = Report(
        project_id=project_id,
        report_key=source_report.report_key,
        report_type=source_report.report_type,
        reporting_period_start=source_report.reporting_period_start,
        reporting_period_end=source_report.reporting_period_end,
        status=ReportStatus.DRAFT,
        version=source_report.version + 1,
        title=f"{source_report.title} (Rev {source_report.version + 1})",
        content=source_report.content,
        summary=source_report.summary,
        created_by_user_id=current_user.id,
        supersedes_report_id=source_report.id,
    )
    db.add(new_report)
    await db.flush()

    # Clone evidence snapshots
    for ev in source_report.evidences:
        db.add(
            ReportEvidence(
                report_id=new_report.id,
                evidence_type=ev.evidence_type,
                evidence_entity_id=ev.evidence_entity_id,
                evidence_snapshot=ev.evidence_snapshot,
            )
        )

    await db.commit()

    query_new = (
        select(Report)
        .where(Report.id == new_report.id)
        .options(selectinload(Report.evidences))
    )
    res_new = await db.execute(query_new)
    return res_new.scalar_one()


# =========================================================================
# 6. GLOBAL PORTFOLIO REPORTS FEED
# =========================================================================
@router.get("/reports", response_model=List[PortfolioReportItemResponse])
async def list_portfolio_reports(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(Report)
        .options(selectinload(Report.project))
        .order_by(Report.created_at.desc())
    )
    res = await db.execute(query)
    reports = res.scalars().all()

    items = []
    for r in reports:
        items.append(
            PortfolioReportItemResponse(
                id=r.id,
                project_id=r.project_id,
                project_name=r.project.name if r.project else "Unknown",
                project_code=r.project.code if r.project else "",
                report_key=r.report_key,
                report_type=r.report_type,
                reporting_period_start=r.reporting_period_start,
                reporting_period_end=r.reporting_period_end,
                status=r.status,
                version=r.version,
                title=r.title,
                summary=r.summary,
                created_at=r.created_at,
                finalized_at=r.finalized_at,
            )
        )
    return items
