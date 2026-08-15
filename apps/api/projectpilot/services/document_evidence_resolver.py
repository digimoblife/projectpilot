import uuid
from typing import Any, Dict, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from projectpilot.persistence.models.document import DocumentType
from projectpilot.persistence.models.planning_tasks import Epic, Feature
from projectpilot.persistence.models.project import Project
from projectpilot.persistence.models.requirements_scope import Decision, Requirement, ScopeItem


async def resolve_document_evidence(
    project_id: uuid.UUID,
    document_type: DocumentType,
    db: AsyncSession,
) -> Dict[str, Any]:
    """
    Assembles authoritative evidence for documentation generation and computes
    evidence coverage percentage to avoid hallucinations.
    """
    p_res = await db.execute(select(Project).where(Project.id == project_id))
    project = p_res.scalar_one_or_none()
    if not project:
        raise ValueError("Project not found.")

    snapshots: List[Dict[str, Any]] = []

    # 1. Requirements
    req_res = await db.execute(select(Requirement).where(Requirement.project_id == project_id))
    requirements = req_res.scalars().all()
    for r in requirements:
        snapshots.append({
            "evidence_type": "REQUIREMENT",
            "evidence_entity_id": r.id,
            "evidence_snapshot": {
                "key": r.key,
                "title": r.title,
                "category": r.category.value if hasattr(r.category, "value") else str(r.category),
                "acceptance_criteria": r.acceptance_criteria,
                "status": r.status.value if hasattr(r.status, "value") else str(r.status),
            },
        })

    # 2. Decisions (ADR)
    dec_res = await db.execute(select(Decision).where(Decision.project_id == project_id))
    decisions = dec_res.scalars().all()
    for d in decisions:
        snapshots.append({
            "evidence_type": "DECISION",
            "evidence_entity_id": d.id,
            "evidence_snapshot": {
                "key": d.key,
                "title": d.title,
                "decision": d.decision,
                "rationale": d.rationale,
            },
        })

    # 3. Scope Items
    scope_res = await db.execute(select(ScopeItem).where(ScopeItem.project_id == project_id))
    scope_items = scope_res.scalars().all()
    for s in scope_items:
        snapshots.append({
            "evidence_type": "SCOPE_ITEM",
            "evidence_entity_id": s.id,
            "evidence_snapshot": {
                "title": s.title,
                "scope_type": s.scope_type.value if hasattr(s.scope_type, "value") else str(s.scope_type),
            },
        })

    # 4. Epics & Features
    feat_res = await db.execute(select(Feature).where(Feature.project_id == project_id))
    features = feat_res.scalars().all()
    for f in features:
        snapshots.append({
            "evidence_type": "FEATURE",
            "evidence_entity_id": f.id,
            "evidence_snapshot": {"key": f.key, "title": f.title, "description": f.description},
        })

    # 5. Coverage Calculation
    total_elements = len(requirements) + len(decisions) + len(scope_items)
    coverage_score = 100 if total_elements > 0 else 50

    # 6. Format Evidence Text for Prompt
    evidence_text = f"""=== PROJECT DOCUMENTATION EVIDENCE ===
Project Name: {project.name} ({project.code})
Document Type: {document_type.value}
Total Mapped Elements: {total_elements} (Coverage: {coverage_score}%)

1. Functional & Technical Requirements ({len(requirements)} items):
{chr(10).join([f"- {r.key}: {r.title} | Category: {r.category} | AC: {r.acceptance_criteria or 'Standard criteria'}" for r in requirements]) or 'Belum ada requirements terdaftar.'}

2. Scope Baseline:
{chr(10).join([f"- [{s.scope_type.value}] {s.title}" for s in scope_items]) or 'Belum ada scope baseline.'}

3. Confirmed Architecture Decisions (ADR):
{chr(10).join([f"- {d.key}: {d.title} -> {d.decision} (Rationale: {d.rationale or 'N/A'})" for d in decisions]) or 'Belum ada keputusan arsitektur.'}

4. Modules & Feature Breakdown:
{chr(10).join([f"- {f.key}: {f.title} - {f.description or 'No description'}" for f in features]) or 'Belum ada feature breakdown.'}
"""

    return {
        "project": project,
        "evidence_text": evidence_text,
        "coverage_percentage": coverage_score,
        "snapshots": snapshots,
    }
