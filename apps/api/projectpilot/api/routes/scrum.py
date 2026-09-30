import uuid
from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, exc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from projectpilot.ai.gemini_adapter import gemini_adapter
from projectpilot.ai.prompt_registry import get_prompt
from projectpilot.api.deps import get_current_pm, get_current_user, get_db
from projectpilot.api.schemas.scrum import (
    ScrumEntryCreate,
    ScrumEntryResponse,
    ScrumEntryUpdate,
    ScrumSessionCreate,
    ScrumSessionResponse,
    ScrumSessionUpdate,
    ScrumWeekInfo,
    ScrumWeekPreview,
    ScrumWeeklyReportResponse,
)
from projectpilot.persistence.models.activity import ActivityEvent
from projectpilot.persistence.models.project import Project
from projectpilot.persistence.models.scrum import ScrumEntry, ScrumSession, ScrumWeeklyReport
from projectpilot.persistence.models.user import User

router = APIRouter(prefix="/projects/{project_id}/scrum", tags=["Scrum Daily Log & Weekly Reports"])


# =========================================================================
# 1. SESSIONS
# =========================================================================
@router.post("/sessions", response_model=ScrumSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_scrum_session(
    project_id: uuid.UUID,
    session_in: ScrumSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    # Auto-calculate week_number, week_year
    iso_year, iso_week, _ = session_in.session_date.isocalendar()

    session = ScrumSession(
        project_id=project_id,
        session_date=session_in.session_date,
        week_number=iso_week,
        week_year=iso_year,
        facilitator_id=current_user.id,
        notes=session_in.notes,
    )
    db.add(session)

    try:
        await db.flush()
    except exc.IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Sesi scrum untuk tanggal ini sudah ada di proyek ini."
        )

    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="SCRUM_SESSION_CREATED",
        description=f"Sesi Scrum harian tanggal {session.session_date.strftime('%d %b %Y')} dibuat.",
    )
    db.add(activity)
    await db.commit()

    query = select(ScrumSession).where(ScrumSession.id == session.id).options(selectinload(ScrumSession.entries))
    res = await db.execute(query)
    return res.scalar_one()


@router.get("/sessions", response_model=List[ScrumSessionResponse])
async def list_scrum_sessions(
    project_id: uuid.UUID,
    week_number: Optional[int] = None,
    week_year: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(ScrumSession).where(ScrumSession.project_id == project_id).options(selectinload(ScrumSession.entries))
    if week_number is not None:
        query = query.where(ScrumSession.week_number == week_number)
    if week_year is not None:
        query = query.where(ScrumSession.week_year == week_year)
    
    query = query.order_by(ScrumSession.session_date.desc())
    res = await db.execute(query)
    return res.scalars().all()


@router.get("/sessions/today", response_model=ScrumSessionResponse)
async def get_today_scrum_session(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    query = (
        select(ScrumSession)
        .where(ScrumSession.project_id == project_id, ScrumSession.session_date == today)
        .options(selectinload(ScrumSession.entries))
    )
    res = await db.execute(query)
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Sesi scrum untuk hari ini belum ada.")
    return session


@router.get("/sessions/{session_id}", response_model=ScrumSessionResponse)
async def get_scrum_session(
    project_id: uuid.UUID,
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(ScrumSession)
        .where(ScrumSession.id == session_id, ScrumSession.project_id == project_id)
        .options(selectinload(ScrumSession.entries))
    )
    res = await db.execute(query)
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Sesi scrum tidak ditemukan.")
    return session


@router.patch("/sessions/{session_id}", response_model=ScrumSessionResponse)
async def update_scrum_session(
    project_id: uuid.UUID,
    session_id: uuid.UUID,
    session_in: ScrumSessionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(ScrumSession).where(ScrumSession.id == session_id, ScrumSession.project_id == project_id).options(selectinload(ScrumSession.entries))
    res = await db.execute(query)
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Sesi scrum tidak ditemukan.")

    if session_in.notes is not None:
        session.notes = session_in.notes

    await db.commit()
    await db.refresh(session)
    return session


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scrum_session(
    project_id: uuid.UUID,
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(ScrumSession).where(ScrumSession.id == session_id, ScrumSession.project_id == project_id)
    res = await db.execute(query)
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Sesi scrum tidak ditemukan.")

    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="SCRUM_SESSION_DELETED",
        description=f"Sesi Scrum tanggal {session.session_date.strftime('%d %b %Y')} dihapus.",
    )
    db.add(activity)

    await db.delete(session)
    await db.commit()
    return None


# =========================================================================
# 2. ENTRIES
# =========================================================================
@router.post("/sessions/{session_id}/entries", response_model=ScrumEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_scrum_entry(
    project_id: uuid.UUID,
    session_id: uuid.UUID,
    entry_in: ScrumEntryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    # Verify session exists
    session_res = await db.execute(select(ScrumSession).where(ScrumSession.id == session_id, ScrumSession.project_id == project_id))
    session = session_res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Sesi scrum tidak ditemukan.")

    # Enforce case-insensitive uniqueness
    entries_res = await db.execute(select(ScrumEntry).where(ScrumEntry.session_id == session_id))
    existing_entries = entries_res.scalars().all()
    
    if any(e.member_name.lower() == entry_in.member_name.lower() for e in existing_entries):
        raise HTTPException(
            status_code=409,
            detail=f"Programmer {entry_in.member_name} sudah memiliki entry di sesi ini. Silakan edit entry yang sudah ada."
        )

    entry = ScrumEntry(
        session_id=session_id,
        project_id=project_id,
        member_id=entry_in.member_id,
        member_name=entry_in.member_name,
        what_done=entry_in.what_done,
        issues=entry_in.issues,
        what_next=entry_in.what_next,
        order_index=entry_in.order_index,
    )
    db.add(entry)
    
    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="SCRUM_ENTRY_ADDED",
        description=f"Log Scrum untuk {entry.member_name} ditambahkan.",
    )
    db.add(activity)

    await db.commit()
    await db.refresh(entry)
    return entry


@router.put("/sessions/{session_id}/entries/{entry_id}", response_model=ScrumEntryResponse)
async def update_scrum_entry(
    project_id: uuid.UUID,
    session_id: uuid.UUID,
    entry_id: uuid.UUID,
    entry_in: ScrumEntryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(ScrumEntry).where(ScrumEntry.id == entry_id, ScrumEntry.session_id == session_id, ScrumEntry.project_id == project_id)
    res = await db.execute(query)
    entry = res.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry scrum tidak ditemukan.")

    # Check for name uniqueness if name is updated
    if entry_in.member_name is not None and entry_in.member_name.lower() != entry.member_name.lower():
        entries_res = await db.execute(select(ScrumEntry).where(ScrumEntry.session_id == session_id, ScrumEntry.id != entry_id))
        existing_entries = entries_res.scalars().all()
        if any(e.member_name.lower() == entry_in.member_name.lower() for e in existing_entries):
            raise HTTPException(
                status_code=409,
                detail=f"Programmer {entry_in.member_name} sudah memiliki entry di sesi ini."
            )

    for field, val in entry_in.model_dump(exclude_unset=True).items():
        setattr(entry, field, val)

    await db.commit()
    await db.refresh(entry)
    return entry


@router.delete("/sessions/{session_id}/entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scrum_entry(
    project_id: uuid.UUID,
    session_id: uuid.UUID,
    entry_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(ScrumEntry).where(ScrumEntry.id == entry_id, ScrumEntry.session_id == session_id, ScrumEntry.project_id == project_id)
    res = await db.execute(query)
    entry = res.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry scrum tidak ditemukan.")

    await db.delete(entry)
    await db.commit()
    return None


# =========================================================================
# 3. WEEKLY REPORTS
# =========================================================================
@router.get("/weeks", response_model=List[ScrumWeekInfo])
async def list_scrum_weeks(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Fetch all sessions
    query = select(ScrumSession.week_year, ScrumSession.week_number).where(ScrumSession.project_id == project_id)
    res = await db.execute(query)
    rows = res.all()
    
    # Group by (week_year, week_number)
    week_counts = {}
    for r in rows:
        key = (r.week_year, r.week_number)
        week_counts[key] = week_counts.get(key, 0) + 1

    # Fetch reports to check already_generated
    rep_query = select(ScrumWeeklyReport).where(ScrumWeeklyReport.project_id == project_id)
    rep_res = await db.execute(rep_query)
    reports_map = {(r.week_year, r.week_number): r for r in rep_res.scalars().all()}

    results = []
    for (wy, wn), count in sorted(week_counts.items(), key=lambda x: (x[0][0], x[0][1]), reverse=True):
        st = date.fromisocalendar(wy, wn, 1)
        ed = date.fromisocalendar(wy, wn, 7)
        rep = reports_map.get((wy, wn))
        
        results.append(
            ScrumWeekInfo(
                week_number=wn,
                week_year=wy,
                start_date=st,
                end_date=ed,
                session_count=count,
                already_generated=bool(rep),
                report_id=rep.id if rep else None,
            )
        )
    return results


@router.get("/weeks/{week_year}/{week_number}/preview", response_model=ScrumWeekPreview)
async def get_scrum_week_preview(
    project_id: uuid.UUID,
    week_year: int,
    week_number: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(ScrumSession)
        .where(
            ScrumSession.project_id == project_id,
            ScrumSession.week_year == week_year,
            ScrumSession.week_number == week_number
        )
        .options(selectinload(ScrumSession.entries))
        .order_by(ScrumSession.session_date.asc())
    )
    res = await db.execute(query)
    sessions = res.scalars().all()
    
    rep_query = select(ScrumWeeklyReport).where(
        ScrumWeeklyReport.project_id == project_id,
        ScrumWeeklyReport.week_year == week_year,
        ScrumWeeklyReport.week_number == week_number
    )
    rep_res = await db.execute(rep_query)
    report = rep_res.scalar_one_or_none()

    st = date.fromisocalendar(week_year, week_number, 1)
    ed = date.fromisocalendar(week_year, week_number, 7)

    return ScrumWeekPreview(
        week_number=week_number,
        week_year=week_year,
        start_date=st,
        end_date=ed,
        session_count=len(sessions),
        already_generated=bool(report),
        report_id=report.id if report else None,
        sessions=list(sessions),
    )


@router.post("/weeks/{week_year}/{week_number}/generate", response_model=ScrumWeeklyReportResponse)
async def generate_scrum_weekly_report(
    project_id: uuid.UUID,
    week_year: int,
    week_number: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    proj_res = await db.execute(select(Project).where(Project.id == project_id))
    proj = proj_res.scalar_one_or_none()
    if not proj:
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan.")

    query = (
        select(ScrumSession)
        .where(
            ScrumSession.project_id == project_id,
            ScrumSession.week_year == week_year,
            ScrumSession.week_number == week_number
        )
        .options(selectinload(ScrumSession.entries))
        .order_by(ScrumSession.session_date.asc())
    )
    res = await db.execute(query)
    sessions = res.scalars().all()
    
    if not sessions:
        raise HTTPException(status_code=400, detail="Tidak ada sesi scrum di minggu ini.")

    # Build scrum_data_text
    scrum_data_text = ""
    for s in sessions:
        scrum_data_text += f"[{s.session_date.strftime('%A, %d %b %Y')}]\n"
        for e in sorted(s.entries, key=lambda x: x.order_index):
            scrum_data_text += f"{e.member_name}:\n  DONE: {e.what_done}\n  ISSUE: {e.issues or 'Tidak ada'}\n  NEXT: {e.what_next}\n"

    st = date.fromisocalendar(week_year, week_number, 1)
    ed = date.fromisocalendar(week_year, week_number, 7)

    prompt = get_prompt(
        "SCRUM_WEEKLY_REPORT",
        scrum_data=scrum_data_text,
        project_name=proj.name,
        project_code=proj.code,
        week_number=week_number,
        week_year=week_year,
        start_date=st.strftime("%d %b %Y"),
        end_date=ed.strftime("%d %b %Y")
    )

    ai_result = await gemini_adapter.generate_structured(
        prompt=prompt,
        capability="SCRUM_WEEKLY_REPORT",
    )

    day_map = {
        "Monday": "Senin", "Tuesday": "Selasa", "Wednesday": "Rabu",
        "Thursday": "Kamis", "Friday": "Jumat", "Saturday": "Sabtu", "Sunday": "Minggu"
    }

    # Build Markdown Report
    start_str = st.strftime("%d %b %Y")
    end_str = ed.strftime("%d %b %Y")
    
    key_achievements = "\n".join([f"- {a}" for a in ai_result.get("key_achievements", [])])
    recurring_issues_list = ai_result.get("recurring_issues", [])
    if recurring_issues_list:
        recurring_issues = "\n".join([f"- {i}" for i in recurring_issues_list])
    else:
        recurring_issues = "- Tidak ada issue berulang minggu ini."

    md_content = f"""# Laporan Scrum Mingguan
**Proyek:** {proj.name} ({proj.code})  
**Periode:** {start_str} – {end_str} (Minggu ke-{week_number}, {week_year})  
**Jumlah Sesi:** {len(sessions)} hari  

---

## 🎯 Ringkasan Eksekutif
{ai_result.get('executive_summary', '')}

## ✅ Pencapaian Utama
{key_achievements}

## ⚠️ Issue & Kendala
{recurring_issues}

## 🔭 Outlook Minggu Depan
{ai_result.get('next_week_outlook', '')}

---

## 📋 Log Harian
"""

    for s in sessions:
        day_en = s.session_date.strftime("%A")
        day_id = day_map.get(day_en, day_en)
        date_str = s.session_date.strftime("%d %b %Y")
        
        md_content += f"### {day_id}, {date_str}\n"
        for e in sorted(s.entries, key=lambda x: x.order_index):
            md_content += f"**👤 {e.member_name}**\n"
            md_content += f"- ✅ **Done:** {e.what_done}\n"
            md_content += f"- ⚠️ **Issue:** {e.issues or 'Tidak ada'}\n"
            md_content += f"- 🎯 **Next:** {e.what_next}\n\n"

    # Upsert Report
    rep_query = select(ScrumWeeklyReport).where(
        ScrumWeeklyReport.project_id == project_id,
        ScrumWeeklyReport.week_year == week_year,
        ScrumWeeklyReport.week_number == week_number
    )
    rep_res = await db.execute(rep_query)
    report = rep_res.scalar_one_or_none()

    if report:
        report.session_count = len(sessions)
        report.ai_summary = ai_result.get('executive_summary', '')
        report.report_markdown = md_content
        report.generated_by_id = current_user.id
    else:
        report = ScrumWeeklyReport(
            project_id=project_id,
            week_number=week_number,
            week_year=week_year,
            session_count=len(sessions),
            ai_summary=ai_result.get('executive_summary', ''),
            report_markdown=md_content,
            generated_by_id=current_user.id,
        )
        db.add(report)
        
    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="SCRUM_WEEKLY_REPORT_GENERATED",
        description=f"Laporan Mingguan Scrum (Minggu {week_number}, {week_year}) di-generate oleh AI.",
    )
    db.add(activity)

    await db.commit()
    await db.refresh(report)
    
    # Add generated_at as created_at since it's mapped to it in schema
    # But for Pydantic if from_attributes=True, Pydantic will read from the object. Let's patch it:
    report.generated_at = report.created_at
    return report


@router.get("/reports", response_model=List[ScrumWeeklyReportResponse])
async def list_scrum_reports(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(ScrumWeeklyReport).where(ScrumWeeklyReport.project_id == project_id).order_by(
        ScrumWeeklyReport.week_year.desc(), ScrumWeeklyReport.week_number.desc()
    )
    res = await db.execute(query)
    reports = list(res.scalars().all())
    for r in reports:
        r.generated_at = r.created_at
    return reports


@router.get("/reports/{report_id}", response_model=ScrumWeeklyReportResponse)
async def get_scrum_report(
    project_id: uuid.UUID,
    report_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(ScrumWeeklyReport).where(ScrumWeeklyReport.id == report_id, ScrumWeeklyReport.project_id == project_id)
    res = await db.execute(query)
    report = res.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Laporan tidak ditemukan.")
    report.generated_at = report.created_at
    return report
