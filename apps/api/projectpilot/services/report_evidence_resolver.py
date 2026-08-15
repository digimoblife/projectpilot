import uuid
from datetime import date, datetime, timezone
from typing import Any, Dict, List
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from projectpilot.persistence.models.issues_risks import Blocker, ClientDependency, Issue, Risk
from projectpilot.persistence.models.meeting import Meeting
from projectpilot.persistence.models.planning_tasks import Task, TaskStatus
from projectpilot.persistence.models.project import Project
from projectpilot.persistence.models.report import ReportType
from projectpilot.persistence.models.requirements_scope import Decision
from projectpilot.persistence.models.timeline_team import Milestone


async def resolve_report_evidence(
    project_id: uuid.UUID,
    report_type: ReportType,
    start_date: date,
    end_date: date,
    db: AsyncSession,
) -> Dict[str, Any]:
    """
    Collects deterministic evidence within a date period for a project report.
    Applies client-safety filters if report_type is WEEKLY_CLIENT or MONTHLY_CLIENT.
    """
    is_client_facing = report_type in (ReportType.WEEKLY_CLIENT, ReportType.MONTHLY_CLIENT)

    # 1. Project Info
    p_res = await db.execute(select(Project).where(Project.id == project_id))
    project = p_res.scalar_one_or_none()
    if not project:
        raise ValueError("Project not found.")

    snapshots: List[Dict[str, Any]] = []

    # 2. Tasks
    task_res = await db.execute(select(Task).where(Task.project_id == project_id))
    all_tasks = task_res.scalars().all()
    completed_tasks = [t for t in all_tasks if t.status == TaskStatus.DONE]
    in_progress_tasks = [t for t in all_tasks if t.status == TaskStatus.IN_PROGRESS]
    blocked_tasks = [t for t in all_tasks if t.status == TaskStatus.BLOCKED]

    for t in all_tasks:
        snapshots.append({
            "evidence_type": "TASK",
            "evidence_entity_id": t.id,
            "evidence_snapshot": {"key": t.key, "title": t.title, "status": t.status.value, "due_date": t.due_date.isoformat() if t.due_date else None},
        })

    # 3. Milestones
    m_res = await db.execute(select(Milestone).where(Milestone.project_id == project_id))
    milestones = m_res.scalars().all()
    for m in milestones:
        snapshots.append({
            "evidence_type": "MILESTONE",
            "evidence_entity_id": m.id,
            "evidence_snapshot": {"key": m.key, "title": m.title, "status": m.status.value, "target_date": m.target_date.isoformat() if m.target_date else None},
        })

    # 4. Client Dependencies
    dep_res = await db.execute(select(ClientDependency).where(ClientDependency.project_id == project_id))
    dependencies = dep_res.scalars().all()
    for d in dependencies:
        snapshots.append({
            "evidence_type": "CLIENT_DEPENDENCY",
            "evidence_entity_id": d.id,
            "evidence_snapshot": {"key": d.key, "title": d.title, "status": d.status.value, "expected_date": d.expected_date.isoformat() if d.expected_date else None},
        })

    # 5. Decisions
    dec_res = await db.execute(select(Decision).where(Decision.project_id == project_id))
    decisions = dec_res.scalars().all()
    for d in decisions:
        snapshots.append({
            "evidence_type": "DECISION",
            "evidence_entity_id": d.id,
            "evidence_snapshot": {"key": d.key, "title": d.title, "decision": d.decision, "status": d.status.value},
        })

    # 6. Meetings in period
    start_dt = datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc)
    end_dt = datetime.combine(end_date, datetime.max.time(), tzinfo=timezone.utc)
    mtg_res = await db.execute(
        select(Meeting).where(
            Meeting.project_id == project_id,
            Meeting.occurred_at >= start_dt,
            Meeting.occurred_at <= end_dt,
        )
    )
    meetings = mtg_res.scalars().all()
    for mtg in meetings:
        snapshots.append({
            "evidence_type": "MEETING",
            "evidence_entity_id": mtg.id,
            "evidence_snapshot": {"meeting_key": mtg.meeting_key, "title": mtg.title, "occurred_at": mtg.occurred_at.isoformat(), "summary": mtg.summary},
        })

    # 7. Internal Only: Blockers, Issues, Risks (Filtered for client reports)
    blockers: List[Blocker] = []
    issues: List[Issue] = []
    if not is_client_facing:
        b_res = await db.execute(select(Blocker).where(Blocker.project_id == project_id))
        blockers = b_res.scalars().all()
        for b in blockers:
            snapshots.append({
                "evidence_type": "BLOCKER",
                "evidence_entity_id": b.id,
                "evidence_snapshot": {"key": b.key, "title": b.title, "status": b.status.value},
            })

        i_res = await db.execute(select(Issue).where(Issue.project_id == project_id))
        issues = i_res.scalars().all()
        for i in issues:
            snapshots.append({
                "evidence_type": "ISSUE",
                "evidence_entity_id": i.id,
                "evidence_snapshot": {"key": i.key, "title": i.title, "severity": getattr(i, "severity", "MEDIUM"), "status": i.status.value},
            })

    # 8. Build Evidence Text for Gemini Prompt
    if is_client_facing:
        evidence_text = f"""=== CLIENT REPORT EVIDENCE ===
Project: {project.name} ({project.code})
Reporting Period: {start_date.isoformat()} s/d {end_date.isoformat()}
Audience: External Client & Stakeholders

1. Deliverables & Progress:
- Completed Deliverables ({len(completed_tasks)}): {', '.join([f'{t.title} ({t.key})' for t in completed_tasks[:10]]) or 'Tidak ada'}
- Active In-Progress ({len(in_progress_tasks)}): {', '.join([f'{t.title} ({t.key})' for t in in_progress_tasks[:10]]) or 'Tidak ada'}

2. Milestones Status:
{chr(10).join([f'- {m.title} ({m.key}): {m.status.value} (Target: {m.target_date})' for m in milestones]) or 'Belum ada milestone'}

3. Items Requiring Client Action / Input:
{chr(10).join([f'- {d.title} ({d.key}): {d.status.value} (Target: {d.expected_date})' for d in dependencies]) or 'Semua dependensi klien terpenuhi'}

4. Confirmed Architecture & Scope Decisions:
{chr(10).join([f'- {d.title} ({d.key}): {d.decision}' for d in decisions]) or 'Tidak ada keputusan baru'}
"""
    else:
        evidence_text = f"""=== INTERNAL PM REPORT EVIDENCE ===
Project: {project.name} ({project.code})
Reporting Period: {start_date.isoformat()} s/d {end_date.isoformat()}
Audience: Internal Leadership & Delivery Team

1. Deliverables Progress:
- Total Tasks: {len(all_tasks)}
- Completed: {len(completed_tasks)}
- In Progress: {len(in_progress_tasks)}
- Blocked: {len(blocked_tasks)}

2. Active Blockers & Issues:
- Active Blockers ({len(blockers)}): {', '.join([f'{b.title} ({b.key})' for b in blockers]) or 'Zero blockers'}
- Unresolved Issues ({len(issues)}): {', '.join([f'{i.title} [{getattr(i, "severity", "MEDIUM")}]' for i in issues[:5]]) or 'Zero issues'}

3. Milestones & Timeline:
{chr(10).join([f'- {m.title} ({m.key}): {m.status.value} (Target: {m.target_date})' for m in milestones]) or 'Belum ada milestone'}

4. Pending Client Dependencies:
{chr(10).join([f'- {d.title} ({d.key}): {d.status.value}' for d in dependencies]) or 'Tidak ada'}

5. Meetings Conducted ({len(meetings)}):
{chr(10).join([f'- {mtg.title} ({mtg.meeting_key}): {mtg.summary or "Catatan tersimpan"}' for mtg in meetings]) or 'Tidak ada rapat'}
"""

    return {
        "project": project,
        "evidence_text": evidence_text,
        "snapshots": snapshots,
    }
