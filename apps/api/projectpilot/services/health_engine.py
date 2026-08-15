import uuid
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from projectpilot.persistence.models.discovery import DiscoveryQuestion, DiscoveryQuestionStatus
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
from projectpilot.persistence.models.meeting import ActionItem, ActionItemStatus
from projectpilot.persistence.models.planning_tasks import Task, TaskStatus
from projectpilot.persistence.models.project import Project, ProjectHealth, ProjectLifecycleStage

HEALTH_RULES_VERSION = "v1.0.0"


async def compute_project_health(project_id: uuid.UUID, db: AsyncSession) -> Dict[str, Any]:
    """
    Deterministic Project Health Rules Engine v1.0.0.
    Evaluates:
    - Overdue tasks
    - Active blockers
    - Client dependencies (pending/overdue)
    - Unresolved high/critical issues
    - Unanswered discovery questions
    - Active risks
    - Pending action items
    """
    today = date.today()

    # 1. Fetch project
    p_res = await db.execute(select(Project).where(Project.id == project_id))
    project = p_res.scalar_one_or_none()
    if not project:
        raise ValueError("Project not found.")

    # 2. Query Tasks
    task_res = await db.execute(select(Task).where(Task.project_id == project_id))
    tasks = task_res.scalars().all()

    overdue_tasks = [
        t for t in tasks
        if t.due_date and t.due_date < today and t.status not in (TaskStatus.DONE, TaskStatus.CANCELLED)
    ]
    blocked_tasks = [t for t in tasks if t.status == TaskStatus.BLOCKED]
    completed_tasks = [t for t in tasks if t.status == TaskStatus.DONE]
    total_tasks = len(tasks)
    progress_percentage = int((len(completed_tasks) / total_tasks * 100)) if total_tasks > 0 else 0

    # 3. Query Blockers
    blocker_res = await db.execute(
        select(Blocker).where(Blocker.project_id == project_id, Blocker.status == BlockerStatus.ACTIVE)
    )
    active_blockers = blocker_res.scalars().all()

    # 4. Query Client Dependencies
    dep_res = await db.execute(select(ClientDependency).where(ClientDependency.project_id == project_id))
    dependencies = dep_res.scalars().all()
    pending_dependencies = [
        d for d in dependencies
        if d.status in (ClientDependencyStatus.REQUESTED, ClientDependencyStatus.IN_PROGRESS, ClientDependencyStatus.OVERDUE)
    ]
    overdue_dependencies = [
        d for d in dependencies
        if d.status == ClientDependencyStatus.OVERDUE or (d.expected_date and d.expected_date < today and d.status != ClientDependencyStatus.PROVIDED)
    ]

    # 5. Query Issues
    issue_res = await db.execute(
        select(Issue).where(
            Issue.project_id == project_id,
            Issue.status.in_([IssueStatus.OPEN, IssueStatus.IN_INVESTIGATION]),
        )
    )
    unresolved_issues = issue_res.scalars().all()
    critical_issues = [i for i in unresolved_issues if getattr(i, "severity", "").upper() == "CRITICAL"]
    high_issues = [i for i in unresolved_issues if getattr(i, "severity", "").upper() == "HIGH"]

    # 6. Query Discovery Questions
    q_res = await db.execute(
        select(DiscoveryQuestion).where(
            DiscoveryQuestion.project_id == project_id,
            DiscoveryQuestion.status.in_([DiscoveryQuestionStatus.SENT, DiscoveryQuestionStatus.NEEDS_FOLLOW_UP]),
        )
    )
    pending_questions = q_res.scalars().all()

    # 7. Query Action Items
    action_res = await db.execute(
        select(ActionItem).where(
            ActionItem.project_id == project_id,
            ActionItem.status.in_([ActionItemStatus.OPEN, ActionItemStatus.IN_PROGRESS]),
        )
    )
    pending_actions = action_res.scalars().all()

    # 8. Deterministic Health Rules Evaluation
    evidence: List[str] = []
    health_status = ProjectHealth.HEALTHY
    score = 100

    # Rule CRITICAL:
    if len(active_blockers) > 0:
        health_status = ProjectHealth.CRITICAL
        score -= 40
        evidence.append(f"Terdapat {len(active_blockers)} blocker aktif yang menahan jalannya deliverable.")
    if len(overdue_tasks) >= 3:
        health_status = ProjectHealth.CRITICAL
        score -= 30
        evidence.append(f"Terdapat {len(overdue_tasks)} tugas yang telah melewati batas waktu (overdue).")
    if len(critical_issues) > 0:
        health_status = ProjectHealth.CRITICAL
        score -= 30
        evidence.append(f"Terdapat {len(critical_issues)} isu berkategori CRITICAL yang belum terselesaikan.")

    # Rule AT_RISK:
    if health_status != ProjectHealth.CRITICAL:
        if 1 <= len(overdue_tasks) < 3:
            health_status = ProjectHealth.AT_RISK
            score -= 20
            evidence.append(f"Terdapat {len(overdue_tasks)} tugas overdue yang perlu dimitigasi.")
        if len(high_issues) > 0:
            health_status = ProjectHealth.AT_RISK
            score -= 20
            evidence.append(f"Terdapat {len(high_issues)} isu berprioritas/keparahan TINGGI.")
        if len(overdue_dependencies) > 0:
            health_status = ProjectHealth.AT_RISK
            score -= 20
            evidence.append(f"Terdapat {len(overdue_dependencies)} ketergantungan klien yang terlambat.")

    # Rule WATCH:
    if health_status not in (ProjectHealth.CRITICAL, ProjectHealth.AT_RISK):
        if len(pending_questions) > 0:
            health_status = ProjectHealth.WATCH
            score -= 10
            evidence.append(f"Terdapat {len(pending_questions)} pertanyaan discovery klien menunggu respon.")
        if len(pending_dependencies) > 0:
            health_status = ProjectHealth.WATCH
            score -= 10
            evidence.append(f"Terdapat {len(pending_dependencies)} ketergantungan klien dalam proses.")
        if len(unresolved_issues) >= 2:
            health_status = ProjectHealth.WATCH
            score -= 10
            evidence.append(f"Terdapat {len(unresolved_issues)} isu terbuka.")

    if not evidence:
        evidence.append("Seluruh deliverables, dependensi klien, dan milestone berjalan sesuai rencana.")

    score = max(0, min(100, score))

    return {
        "project_id": project.id,
        "project_name": project.name,
        "project_code": project.code,
        "health_status": health_status.value,
        "health_score": score,
        "progress_percentage": progress_percentage,
        "metrics": {
            "total_tasks": total_tasks,
            "completed_tasks": len(completed_tasks),
            "overdue_tasks": len(overdue_tasks),
            "blocked_tasks": len(blocked_tasks),
            "active_blockers": len(active_blockers),
            "pending_client_dependencies": len(pending_dependencies),
            "overdue_client_dependencies": len(overdue_dependencies),
            "unresolved_issues": len(unresolved_issues),
            "critical_issues": len(critical_issues),
            "high_issues": len(high_issues),
            "pending_discovery_questions": len(pending_questions),
            "pending_action_items": len(pending_actions),
        },
        "health_evidence": evidence,
        "rules_version": HEALTH_RULES_VERSION,
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
    }


async def get_cross_project_attention_items(db: AsyncSession) -> List[Dict[str, Any]]:
    """
    Returns an aggregated list of urgent operational attention items across all projects.
    """
    today = date.today()
    attention_items: List[Dict[str, Any]] = []

    # 1. Overdue Tasks
    overdue_res = await db.execute(
        select(Task)
        .options(selectinload(Task.project))
        .where(
            Task.due_date.is_not(None),
            Task.due_date < today,
            Task.status.not_in([TaskStatus.DONE, TaskStatus.CANCELLED]),
        )
    )
    for t in overdue_res.scalars().all():
        attention_items.append({
            "id": str(t.id),
            "project_id": str(t.project_id),
            "project_name": t.project.name if t.project else "Unknown",
            "project_code": t.project.code if t.project else "",
            "category": "OVERDUE_TASK",
            "title": f"Tugas Terlambat: {t.title} ({t.key})",
            "severity": "HIGH",
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "target_url": f"/projects/{t.project_id}/tasks",
        })

    # 2. Active Blockers
    blocker_res = await db.execute(
        select(Blocker)
        .options(selectinload(Blocker.project))
        .where(Blocker.status == BlockerStatus.ACTIVE)
    )
    for b in blocker_res.scalars().all():
        attention_items.append({
            "id": str(b.id),
            "project_id": str(b.project_id),
            "project_name": b.project.name if b.project else "Unknown",
            "project_code": b.project.code if b.project else "",
            "category": "ACTIVE_BLOCKER",
            "title": f"Blocker Aktif: {b.title} ({b.key})",
            "severity": "CRITICAL",
            "target_url": f"/projects/{b.project_id}/issues",
        })

    # 3. Pending / Overdue Client Dependencies
    dep_res = await db.execute(
        select(ClientDependency)
        .options(selectinload(ClientDependency.project))
        .where(
            ClientDependency.status.in_([
                ClientDependencyStatus.REQUESTED,
                ClientDependencyStatus.IN_PROGRESS,
                ClientDependencyStatus.OVERDUE,
            ])
        )
    )
    for d in dep_res.scalars().all():
        is_overdue = d.expected_date and d.expected_date < today
        attention_items.append({
            "id": str(d.id),
            "project_id": str(d.project_id),
            "project_name": d.project.name if d.project else "Unknown",
            "project_code": d.project.code if d.project else "",
            "category": "CLIENT_DEPENDENCY",
            "title": f"Ketergantungan Klien: {d.title} ({d.key})",
            "severity": "CRITICAL" if is_overdue else "MEDIUM",
            "due_date": d.expected_date.isoformat() if d.expected_date else None,
            "target_url": f"/projects/{d.project_id}/issues",
        })

    # 4. Critical & High Issues
    issue_res = await db.execute(
        select(Issue)
        .options(selectinload(Issue.project))
        .where(Issue.status.in_([IssueStatus.OPEN, IssueStatus.IN_INVESTIGATION]))
    )
    for i in issue_res.scalars().all():
        sev = getattr(i, "severity", "MEDIUM").upper()
        if sev in ("HIGH", "CRITICAL"):
            attention_items.append({
                "id": str(i.id),
                "project_id": str(i.project_id),
                "project_name": i.project.name if i.project else "Unknown",
                "project_code": i.project.code if i.project else "",
                "category": "HIGH_ISSUE",
                "title": f"Isu {sev}: {i.title} ({i.key})",
                "severity": sev,
                "target_url": f"/projects/{i.project_id}/issues",
            })

    return attention_items
