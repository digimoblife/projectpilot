import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from projectpilot.persistence.models.client import Client
from projectpilot.persistence.models.document import GeneratedDocument
from projectpilot.persistence.models.issues_risks import Blocker, Issue, Risk
from projectpilot.persistence.models.lead import Lead
from projectpilot.persistence.models.meeting import Meeting
from projectpilot.persistence.models.planning_tasks import Task
from projectpilot.persistence.models.project import Project
from projectpilot.persistence.models.report import Report
from projectpilot.persistence.models.requirements_scope import Decision, Requirement, ScopeItem


async def global_search(query_str: str, db: AsyncSession, limit: int = 30) -> List[Dict[str, Any]]:
    """
    Cross-entity full-text keyword search across Projects, Leads, Clients,
    Tasks, Requirements, Decisions, Issues, Risks, Meetings, Reports, and Documents.
    """
    pattern = f"%{query_str.strip()}%"
    results: List[Dict[str, Any]] = []

    # 1. Projects
    p_res = await db.execute(
        select(Project)
        .where(or_(Project.name.ilike(pattern), Project.code.ilike(pattern), Project.description.ilike(pattern)))
        .limit(limit)
    )
    for p in p_res.scalars().all():
        results.append({
            "entity_type": "PROJECT",
            "entity_id": p.id,
            "project_id": p.id,
            "key": p.code,
            "title": p.name,
            "subtitle": f"Status: {p.lifecycle_stage.value}",
            "route": f"/projects/{p.id}",
        })

    # 2. Clients
    c_res = await db.execute(
        select(Client)
        .where(or_(Client.name.ilike(pattern), Client.company_name.ilike(pattern)))
        .limit(limit)
    )
    for c in c_res.scalars().all():
        results.append({
            "entity_type": "CLIENT",
            "entity_id": c.id,
            "project_id": None,
            "key": c.company_name or c.name,
            "title": c.name,
            "subtitle": "Klien",
            "route": "/projects",
        })

    # 3. Leads
    l_res = await db.execute(
        select(Lead)
        .where(or_(Lead.name.ilike(pattern), Lead.company_name.ilike(pattern)))
        .limit(limit)
    )
    for l in l_res.scalars().all():
        results.append({
            "entity_type": "LEAD",
            "entity_id": l.id,
            "project_id": None,
            "key": l.company_name,
            "title": l.name,
            "subtitle": f"Lead • {l.status.value}",
            "route": "/leads",
        })

    # 4. Tasks
    t_res = await db.execute(
        select(Task)
        .where(or_(Task.title.ilike(pattern), Task.key.ilike(pattern), Task.description.ilike(pattern)))
        .limit(limit)
    )
    for t in t_res.scalars().all():
        results.append({
            "entity_type": "TASK",
            "entity_id": t.id,
            "project_id": t.project_id,
            "key": t.key,
            "title": t.title,
            "subtitle": f"Task • {t.status.value}",
            "route": f"/projects/{t.project_id}/tasks",
        })

    # 5. Requirements
    r_res = await db.execute(
        select(Requirement)
        .where(or_(Requirement.title.ilike(pattern), Requirement.key.ilike(pattern), Requirement.description.ilike(pattern)))
        .limit(limit)
    )
    for r in r_res.scalars().all():
        results.append({
            "entity_type": "REQUIREMENT",
            "entity_id": r.id,
            "project_id": r.project_id,
            "key": r.key,
            "title": r.title,
            "subtitle": f"Kebutuhan • {r.status.value}",
            "route": f"/projects/{r.project_id}/requirements",
        })

    # 6. Decisions
    d_res = await db.execute(
        select(Decision)
        .where(or_(Decision.title.ilike(pattern), Decision.key.ilike(pattern), Decision.decision.ilike(pattern)))
        .limit(limit)
    )
    for d in d_res.scalars().all():
        results.append({
            "entity_type": "DECISION",
            "entity_id": d.id,
            "project_id": d.project_id,
            "key": d.key,
            "title": d.title,
            "subtitle": f"Keputusan ADR • {d.status.value}",
            "route": f"/projects/{d.project_id}/requirements",
        })

    # 7. Reports
    rep_res = await db.execute(
        select(Report)
        .where(or_(Report.title.ilike(pattern), Report.report_key.ilike(pattern), Report.content.ilike(pattern)))
        .limit(limit)
    )
    for rep in rep_res.scalars().all():
        results.append({
            "entity_type": "REPORT",
            "entity_id": rep.id,
            "project_id": rep.project_id,
            "key": rep.report_key,
            "title": rep.title,
            "subtitle": f"Laporan • {rep.report_type.value} ({rep.status.value})",
            "route": f"/projects/{rep.project_id}/reports",
        })

    # 8. Documents
    doc_res = await db.execute(
        select(GeneratedDocument)
        .where(or_(GeneratedDocument.title.ilike(pattern), GeneratedDocument.document_key.ilike(pattern), GeneratedDocument.content.ilike(pattern)))
        .limit(limit)
    )
    for doc in doc_res.scalars().all():
        results.append({
            "entity_type": "DOCUMENT",
            "entity_id": doc.id,
            "project_id": doc.project_id,
            "key": doc.document_key,
            "title": doc.title,
            "subtitle": f"Dokumen • {doc.document_type.value} ({doc.status.value})",
            "route": f"/projects/{doc.project_id}/documents",
        })

    return results[:limit]


async def project_scoped_search(project_id: uuid.UUID, query_str: str, db: AsyncSession, limit: int = 30) -> List[Dict[str, Any]]:
    """
    Strictly isolated search within a single project's data boundary.
    """
    pattern = f"%{query_str.strip()}%"
    results: List[Dict[str, Any]] = []

    # 1. Tasks
    t_res = await db.execute(
        select(Task)
        .where(Task.project_id == project_id, or_(Task.title.ilike(pattern), Task.key.ilike(pattern), Task.description.ilike(pattern)))
        .limit(limit)
    )
    for t in t_res.scalars().all():
        results.append({
            "entity_type": "TASK",
            "entity_id": t.id,
            "project_id": project_id,
            "key": t.key,
            "title": t.title,
            "subtitle": f"Task • {t.status.value}",
            "route": f"/projects/{project_id}/tasks",
        })

    # 2. Requirements
    r_res = await db.execute(
        select(Requirement)
        .where(Requirement.project_id == project_id, or_(Requirement.title.ilike(pattern), Requirement.key.ilike(pattern), Requirement.description.ilike(pattern)))
        .limit(limit)
    )
    for r in r_res.scalars().all():
        results.append({
            "entity_type": "REQUIREMENT",
            "entity_id": r.id,
            "project_id": project_id,
            "key": r.key,
            "title": r.title,
            "subtitle": f"Kebutuhan • {r.status.value}",
            "route": f"/projects/{project_id}/requirements",
        })

    # 3. Decisions
    d_res = await db.execute(
        select(Decision)
        .where(Decision.project_id == project_id, or_(Decision.title.ilike(pattern), Decision.key.ilike(pattern), Decision.decision.ilike(pattern)))
        .limit(limit)
    )
    for d in d_res.scalars().all():
        results.append({
            "entity_type": "DECISION",
            "entity_id": d.id,
            "project_id": project_id,
            "key": d.key,
            "title": d.title,
            "subtitle": f"Keputusan ADR • {d.status.value}",
            "route": f"/projects/{project_id}/requirements",
        })

    # 4. Blockers
    b_res = await db.execute(
        select(Blocker)
        .where(Blocker.project_id == project_id, or_(Blocker.title.ilike(pattern), Blocker.key.ilike(pattern), Blocker.description.ilike(pattern)))
        .limit(limit)
    )
    for b in b_res.scalars().all():
        results.append({
            "entity_type": "BLOCKER",
            "entity_id": b.id,
            "project_id": project_id,
            "key": b.key,
            "title": b.title,
            "subtitle": f"Blocker • {b.status.value}",
            "route": f"/projects/{project_id}/issues",
        })

    # 5. Meetings
    m_res = await db.execute(
        select(Meeting)
        .where(Meeting.project_id == project_id, or_(Meeting.title.ilike(pattern), Meeting.summary.ilike(pattern), Meeting.transcript.ilike(pattern)))
        .limit(limit)
    )
    for m in m_res.scalars().all():
        results.append({
            "entity_type": "MEETING",
            "entity_id": m.id,
            "project_id": project_id,
            "key": m.title,
            "title": m.title,
            "subtitle": f"Rapat • {m.meeting_type.value}",
            "route": f"/projects/{project_id}/meetings",
        })

    # 6. Reports & Documents
    rep_res = await db.execute(
        select(Report)
        .where(Report.project_id == project_id, or_(Report.title.ilike(pattern), Report.report_key.ilike(pattern), Report.content.ilike(pattern)))
        .limit(limit)
    )
    for rep in rep_res.scalars().all():
        results.append({
            "entity_type": "REPORT",
            "entity_id": rep.id,
            "project_id": project_id,
            "key": rep.report_key,
            "title": rep.title,
            "subtitle": f"Laporan • {rep.report_type.value}",
            "route": f"/projects/{project_id}/reports",
        })

    return results[:limit]
