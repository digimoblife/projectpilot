import re
import uuid
from typing import Any, Dict, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from projectpilot.ai.gemini_adapter import gemini_adapter
from projectpilot.ai.prompt_registry import SYSTEM_LANGUAGE_INSTRUCTION, get_prompt
from projectpilot.persistence.models.issues_risks import Blocker, BlockerStatus, ClientDependency, Issue
from projectpilot.persistence.models.meeting import ActionItem, Meeting
from projectpilot.persistence.models.planning_tasks import Task
from projectpilot.persistence.models.project import Project
from projectpilot.persistence.models.report import Report
from projectpilot.persistence.models.requirements_scope import Decision, Requirement, ScopeItem


async def answer_project_question(
    project_id: uuid.UUID,
    question: str,
    db: AsyncSession,
) -> Dict[str, Any]:
    """
    Answers a project question strictly grounded in the project's own database records.
    Returns structured answer with cited entity references.
    """
    # 1. Fetch Project
    p_res = await db.execute(select(Project).where(Project.id == project_id))
    project = p_res.scalar_one_or_none()
    if not project:
        raise ValueError("Project not found.")

    # 2. Fetch Project Data Boundary
    req_res = await db.execute(select(Requirement).where(Requirement.project_id == project_id))
    requirements = req_res.scalars().all()

    dec_res = await db.execute(select(Decision).where(Decision.project_id == project_id))
    decisions = dec_res.scalars().all()

    scope_res = await db.execute(select(ScopeItem).where(ScopeItem.project_id == project_id))
    scope_items = scope_res.scalars().all()

    task_res = await db.execute(select(Task).where(Task.project_id == project_id))
    tasks = task_res.scalars().all()

    blocker_res = await db.execute(select(Blocker).where(Blocker.project_id == project_id))
    blockers = blocker_res.scalars().all()

    dep_res = await db.execute(select(ClientDependency).where(ClientDependency.project_id == project_id))
    dependencies = dep_res.scalars().all()

    meeting_res = await db.execute(select(Meeting).where(Meeting.project_id == project_id))
    meetings = meeting_res.scalars().all()

    # 3. Assemble Structured Evidence
    evidence_text = f"""=== PROJECT DATA CONTEXT ({project.name} - {project.code}) ===
Status: {project.lifecycle_stage.value} | Health: {project.health.value}

1. Requirements ({len(requirements)}):
{chr(10).join([f"- [{r.key}] {r.title} ({r.category.value if hasattr(r.category, 'value') else r.category}) - AC: {r.acceptance_criteria or 'N/A'}" for r in requirements]) or 'None'}

2. Architecture Decisions ({len(decisions)}):
{chr(10).join([f"- [{d.key}] {d.title} -> {d.decision}" for d in decisions]) or 'None'}

3. Scope Baseline:
{chr(10).join([f"- [{s.scope_type.value}] {s.title}" for s in scope_items]) or 'None'}

4. Tasks ({len(tasks)}):
{chr(10).join([f"- [{t.key}] {t.title} -> Status: {t.status.value}" for t in tasks]) or 'None'}

5. Active Blockers & Dependencies:
{chr(10).join([f"- [Blocker {b.key}] {b.title} ({b.status.value})" for b in blockers if b.status != BlockerStatus.RESOLVED]) or 'No active blockers'}
{chr(10).join([f"- [Dependency {dep.key}] {dep.title} ({dep.status.value})" for dep in dependencies]) or 'No client dependencies'}
"""

    # 4. Invoke Gemini Project Q&A
    prompt = f"""You are the ProjectPilot AI Assistant answering a project inquiry.
Strict Rule: Answer ONLY based on the project evidence provided below. Do not assume or hallucinate outside features.
Whenever citing a requirement, decision, task, or blocker, include its exact key in brackets like [REQ-001] or [ADR-001].
If the requested information is not present in the evidence, clearly state that it is not documented yet.
Language: Professional Bahasa Indonesia.

User Question:
{question}

Evidence Context:
{evidence_text}
"""

    ai_res = await gemini_adapter.generate_structured(
        prompt=prompt,
        system_instruction=SYSTEM_LANGUAGE_INSTRUCTION,
        capability="PROJECT_QA",
    )

    answer_text = ai_res.get("answer") or ai_res.get("message") or (
        f"Berdasarkan data proyek {project.name}, status saat ini berada pada tahap {project.lifecycle_stage.value} dengan {len(tasks)} tugas terdaftar dan {len(requirements)} kebutuhan fungsional."
    )

    # 5. Extract Citations
    citations: List[Dict[str, Any]] = []
    found_keys = set(re.findall(r"\[([A-Z0-9_-]+)\]", answer_text))

    for r in requirements:
        if r.key in found_keys or r.key in question:
            citations.append({"key": r.key, "type": "REQUIREMENT", "title": r.title, "route": f"/projects/{project_id}/requirements"})
    for d in decisions:
        if d.key in found_keys or d.key in question:
            citations.append({"key": d.key, "type": "DECISION", "title": d.title, "route": f"/projects/{project_id}/requirements"})
    for t in tasks:
        if t.key in found_keys or t.key in question:
            citations.append({"key": t.key, "type": "TASK", "title": t.title, "route": f"/projects/{project_id}/tasks"})
    for b in blockers:
        if b.key in found_keys or b.key in question:
            citations.append({"key": b.key, "type": "BLOCKER", "title": b.title, "route": f"/projects/{project_id}/issues"})

    return {
        "project_id": project_id,
        "question": question,
        "answer": answer_text,
        "citations": citations,
        "evidence_count": len(requirements) + len(decisions) + len(tasks) + len(blockers),
    }
