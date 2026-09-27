import uuid
from datetime import date, datetime, timezone
from typing import Any, Dict, List
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from projectpilot.persistence.models.issues_risks import (
    Blocker,
    BlockerStatus,
    ClientDependency,
    ClientDependencyStatus,
    Issue,
    IssueStatus,
    Risk,
    RiskStatus,
)
from projectpilot.persistence.models.meeting import Meeting
from projectpilot.persistence.models.planning_tasks import Task, TaskStatus
from projectpilot.persistence.models.project import Project
from projectpilot.persistence.models.report import ReportType
from projectpilot.persistence.models.requirements_scope import Decision
from projectpilot.persistence.models.timeline_team import Milestone, MilestoneStatus


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
    in_progress_tasks = [t for t in all_tasks if t.status in (TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW, TaskStatus.QA)]
    blocked_tasks = [t for t in all_tasks if t.status == TaskStatus.BLOCKED]
    backlog_tasks = [t for t in all_tasks if t.status in (TaskStatus.BACKLOG, TaskStatus.READY)]

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
    pending_dependencies = [
        d for d in dependencies
        if d.status in (ClientDependencyStatus.REQUESTED, ClientDependencyStatus.IN_PROGRESS, ClientDependencyStatus.OVERDUE)
    ]
    provided_dependencies = [
        d for d in dependencies
        if d.status == ClientDependencyStatus.PROVIDED
    ]

    for d in dependencies:
        snapshots.append({
            "evidence_type": "CLIENT_DEPENDENCY",
            "evidence_entity_id": d.id,
            "evidence_snapshot": {
                "key": d.key,
                "title": d.title,
                "status": d.status.value,
                "dependency_type": getattr(d, "dependency_type", "CREDENTIALS"),
                "expected_date": d.expected_date.isoformat() if d.expected_date else None,
                "provided_date": d.provided_date.isoformat() if d.provided_date else None,
                "receipt_notes": d.receipt_notes,
            },
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
    risks: List[Risk] = []
    active_blockers: List[Blocker] = []
    resolved_blockers: List[Blocker] = []
    unresolved_issues: List[Issue] = []
    resolved_issues: List[Issue] = []
    active_risks: List[Risk] = []
    mitigated_risks: List[Risk] = []

    if not is_client_facing:
        b_res = await db.execute(select(Blocker).where(Blocker.project_id == project_id))
        blockers = b_res.scalars().all()
        active_blockers = [b for b in blockers if b.status in (BlockerStatus.ACTIVE, BlockerStatus.ESCALATED)]
        resolved_blockers = [b for b in blockers if b.status == BlockerStatus.RESOLVED]

        for b in blockers:
            snapshots.append({
                "evidence_type": "BLOCKER",
                "evidence_entity_id": b.id,
                "evidence_snapshot": {
                    "key": b.key,
                    "title": b.title,
                    "status": b.status.value,
                    "blocker_type": getattr(b, "blocker_type", "TECHNICAL"),
                    "resolution_notes": b.resolution_notes,
                    "resolved_at": b.resolved_at.isoformat() if b.resolved_at else None,
                },
            })

        i_res = await db.execute(select(Issue).where(Issue.project_id == project_id))
        issues = i_res.scalars().all()
        unresolved_issues = [i for i in issues if i.status in (IssueStatus.OPEN, IssueStatus.IN_INVESTIGATION)]
        resolved_issues = [i for i in issues if i.status in (IssueStatus.RESOLVED, IssueStatus.CLOSED, IssueStatus.WONT_FIX)]

        for i in issues:
            snapshots.append({
                "evidence_type": "ISSUE",
                "evidence_entity_id": i.id,
                "evidence_snapshot": {
                    "key": i.key,
                    "title": i.title,
                    "severity": getattr(i, "severity", "MEDIUM"),
                    "status": i.status.value,
                    "resolution_notes": i.resolution_notes,
                    "resolved_at": i.resolved_at.isoformat() if i.resolved_at else None,
                },
            })

        r_res = await db.execute(select(Risk).where(Risk.project_id == project_id))
        risks = r_res.scalars().all()
        active_risks = [r for r in risks if r.status in (RiskStatus.IDENTIFIED, RiskStatus.MONITORED, RiskStatus.MATERIALIZED)]
        mitigated_risks = [r for r in risks if r.status in (RiskStatus.MITIGATED, RiskStatus.CLOSED)]

        for r in risks:
            snapshots.append({
                "evidence_type": "RISK",
                "evidence_entity_id": r.id,
                "evidence_snapshot": {
                    "key": r.key,
                    "title": r.title,
                    "status": r.status.value,
                    "probability": getattr(r, "probability", "MEDIUM"),
                    "impact": getattr(r, "impact", "MEDIUM"),
                    "mitigation_plan": r.mitigation_plan,
                },
            })

    # 8. Build Evidence Text for Gemini Prompt
    if is_client_facing:
        pending_dep_lines = [
            f"- [{d.status.value}] {d.title} ({d.key}): Target Tanggal={d.expected_date.isoformat() if d.expected_date else 'TBD'}"
            for d in pending_dependencies
        ]
        provided_dep_lines = [
            f"- [{d.status.value}] {d.title} ({d.key}): Diterima/Terpenuhi ({d.provided_date.isoformat() if d.provided_date else 'Terkonfirmasi'})"
            for d in provided_dependencies
        ]

        evidence_text = f"""=== CLIENT REPORT EVIDENCE ===
Project: {project.name} ({project.code})
Reporting Period: {start_date.isoformat()} s/d {end_date.isoformat()}
Audience: External Client & Stakeholders

1. Deliverables & Progress:
- Completed Deliverables ({len(completed_tasks)}): {', '.join([f'{t.title} ({t.key})' for t in completed_tasks[:10]]) or 'Tidak ada'}
- Active In-Progress ({len(in_progress_tasks)}): {', '.join([f'{t.title} ({t.key})' for t in in_progress_tasks[:10]]) or 'Tidak ada'}

2. Milestones Status:
{chr(10).join([f'- [{m.status.value}] {m.title} ({m.key}) (Target: {m.target_date})' for m in milestones]) or 'Belum ada milestone'}

3. Items Requiring Client Action / Input:
- Pending Client Action ({len(pending_dependencies)}):
{chr(10).join(pending_dep_lines) if pending_dep_lines else '  (Semua dependensi pihak klien saat ini terpenuhi / Zero pending action items)'}
- Completed / Provided by Client ({len(provided_dependencies)}):
{chr(10).join(provided_dep_lines) if provided_dep_lines else '  (Belum ada dependensi yang diserahkan periode ini)'}

4. Confirmed Architecture & Scope Decisions:
{chr(10).join([f'- [{d.status.value}] {d.title} ({d.key}): {d.decision}' for d in decisions]) or 'Tidak ada keputusan baru'}
"""
    else:
        active_blk_lines = [
            f"- [{b.status.value}] {b.title} ({b.key}) - Tipe: {getattr(b, 'blocker_type', 'TECHNICAL')}"
            for b in active_blockers
        ]
        resolved_blk_lines = [
            f"- [RESOLVED] {b.title} ({b.key}) - Catatan Solusi: {b.resolution_notes or 'Terselesaikan'}"
            for b in resolved_blockers
        ]

        unres_iss_lines = [
            f"- [{i.status.value}] {i.title} ({i.key}) [Severity: {getattr(i, 'severity', 'MEDIUM')}]"
            for i in unresolved_issues
        ]
        res_iss_lines = [
            f"- [{i.status.value}] {i.title} ({i.key}) [Severity: {getattr(i, 'severity', 'MEDIUM')}] - Catatan Solusi: {i.resolution_notes or 'Terselesaikan'}"
            for i in resolved_issues
        ]

        active_rsk_lines = [
            f"- [{r.status.value}] {r.title} ({r.key}) [Probabilitas: {getattr(r, 'probability', 'MEDIUM')}, Dampak: {getattr(r, 'impact', 'MEDIUM')}] - Rencana Mitigasi: {r.mitigation_plan or 'Dalam pemantauan'}"
            for r in active_risks
        ]
        mitigated_rsk_lines = [
            f"- [{r.status.value}] {r.title} ({r.key}) - Status Mitigasi: {r.mitigation_plan or 'Termitigasi'}"
            for r in mitigated_risks
        ]

        pending_dep_lines = [
            f"- [{d.status.value}] {d.title} ({d.key}) (Target: {d.expected_date.isoformat() if d.expected_date else 'TBD'})"
            for d in pending_dependencies
        ]
        provided_dep_lines = [
            f"- [PROVIDED] {d.title} ({d.key}) (Diterima: {d.provided_date.isoformat() if d.provided_date else 'Terkonfirmasi'})"
            for d in provided_dependencies
        ]

        evidence_text = f"""=== INTERNAL PM REPORT EVIDENCE ===
Project: {project.name} ({project.code})
Reporting Period: {start_date.isoformat()} s/d {end_date.isoformat()}
Audience: Internal Leadership & Delivery Team

1. Deliverables Progress:
- Total Tasks: {len(all_tasks)}
- Completed (DONE): {len(completed_tasks)}
- In Progress: {len(in_progress_tasks)}
- Blocked: {len(blocked_tasks)}
- Backlog / Ready: {len(backlog_tasks)}

2. Blockers (Status Aktif vs Terselesaikan):
- Active Blockers ({len(active_blockers)}):
{chr(10).join(active_blk_lines) if active_blk_lines else '  (Zero active blockers)'}
- Resolved Blockers ({len(resolved_blockers)}):
{chr(10).join(resolved_blk_lines) if resolved_blk_lines else '  (Tidak ada blocker yang diselesaikan periode ini)'}

3. Issues & Bugs (Status Terbuka vs Terselesaikan):
- Unresolved / Open Issues ({len(unresolved_issues)}):
{chr(10).join(unres_iss_lines) if unres_iss_lines else '  (Zero unresolved issues)'}
- Resolved / Closed Issues ({len(resolved_issues)}):
{chr(10).join(res_iss_lines) if res_iss_lines else '  (Tidak ada isu yang diselesaikan periode ini)'}

4. Operational Risks Analysis:
- Active / Monitored Risks ({len(active_risks)}):
{chr(10).join(active_rsk_lines) if active_rsk_lines else '  (Zero active risks)'}
- Mitigated / Closed Risks ({len(mitigated_risks)}):
{chr(10).join(mitigated_rsk_lines) if mitigated_rsk_lines else '  (Belum ada risiko yang termitigasi)'}

5. Milestones & Timeline:
{chr(10).join([f'- [{m.status.value}] {m.title} ({m.key}) (Target: {m.target_date})' for m in milestones]) or 'Belum ada milestone'}

6. Client Dependencies (Status Ketergantungan Klien):
- Pending Dependencies ({len(pending_dependencies)}):
{chr(10).join(pending_dep_lines) if pending_dep_lines else '  (Semua dependensi klien terpenuhi)'}
- Fulfilled / Provided Dependencies ({len(provided_dependencies)}):
{chr(10).join(provided_dep_lines) if provided_dep_lines else '  (Tidak ada)'}

7. Meetings Conducted ({len(meetings)}):
{chr(10).join([f'- {mtg.title} ({mtg.meeting_key}): {mtg.summary or "Catatan tersimpan"}' for mtg in meetings]) or 'Tidak ada rapat'}
"""

    return {
        "project": project,
        "evidence_text": evidence_text,
        "snapshots": snapshots,
    }
