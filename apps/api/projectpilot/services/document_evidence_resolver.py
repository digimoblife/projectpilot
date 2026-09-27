import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from projectpilot.persistence.models.document import DocumentType
from projectpilot.persistence.models.planning_tasks import Epic, Feature, Task, TaskStatus
from projectpilot.persistence.models.project import Project
from projectpilot.persistence.models.requirements_scope import (
    Decision,
    DecisionStatus,
    Requirement,
    RequirementStatus,
    ScopeChange,
    ScopeChangeStatus,
    ScopeItem,
)


def _enum_str(val: Any) -> str:
    if val is None:
        return ""
    return val.value if hasattr(val, "value") else str(val)


async def resolve_document_evidence(
    project_id: uuid.UUID,
    document_type: DocumentType,
    db: AsyncSession,
) -> Dict[str, Any]:
    """
    Assembles authoritative evidence for documentation generation based on document_type.
    Enforces distinct evidence contracts:
    - FSD receives structured authoritative functional requirements (CONFIRMED/APPROVED),
      accepted business decisions, scope items, features with parent epics, and qualifying
      implementation verification tasks (DONE, non-archived, feature-linked).
    - PRD and other document types receive product-level evidence without implementation task leakage.
    """
    p_res = await db.execute(select(Project).where(Project.id == project_id))
    project = p_res.scalar_one_or_none()
    if not project:
        raise ValueError("Project not found.")

    if document_type == DocumentType.FSD:
        return await _resolve_fsd_evidence(project=project, project_id=project_id, db=db)
    else:
        return await _resolve_generic_evidence(
            project=project, project_id=project_id, document_type=document_type, db=db
        )


async def _resolve_fsd_evidence(
    project: Project,
    project_id: uuid.UUID,
    db: AsyncSession,
) -> Dict[str, Any]:
    """
    FSD-specific evidence resolver enforcing the Authoritative Functional Evidence hierarchy.
    """
    snapshots: List[Dict[str, Any]] = []

    # 1. Authoritative Requirements (CONFIRMED & APPROVED only)
    req_res = await db.execute(
        select(Requirement)
        .where(
            Requirement.project_id == project_id,
            Requirement.status.in_([RequirementStatus.CONFIRMED, RequirementStatus.APPROVED]),
        )
        .order_by(Requirement.key.asc())
    )
    requirements = req_res.scalars().all()
    for r in requirements:
        snapshots.append({
            "evidence_type": "REQUIREMENT",
            "evidence_entity_id": r.id,
            "evidence_snapshot": {
                "key": r.key,
                "title": r.title,
                "description": r.description,
                "category": r.category.value if hasattr(r.category, "value") else str(r.category),
                "priority": r.priority,
                "acceptance_criteria": r.acceptance_criteria,
                "status": r.status.value if hasattr(r.status, "value") else str(r.status),
                "source_type": r.source_type.value if hasattr(r.source_type, "value") else str(r.source_type),
                "source_id": str(r.source_id) if r.source_id else None,
            },
        })

    # 2. Scope Items (IN_SCOPE & OUT_OF_SCOPE)
    scope_res = await db.execute(
        select(ScopeItem)
        .where(ScopeItem.project_id == project_id)
        .order_by(ScopeItem.scope_type.asc(), ScopeItem.title.asc())
    )
    scope_items = scope_res.scalars().all()
    for s in scope_items:
        snapshots.append({
            "evidence_type": "SCOPE_ITEM",
            "evidence_entity_id": s.id,
            "evidence_snapshot": {
                "title": s.title,
                "scope_type": s.scope_type.value if hasattr(s.scope_type, "value") else str(s.scope_type),
                "description": s.description,
                "rationale": s.rationale,
            },
        })

    # 3. Supporting Decisions (ACCEPTED only)
    dec_res = await db.execute(
        select(Decision)
        .where(
            Decision.project_id == project_id,
            Decision.status == DecisionStatus.ACCEPTED,
        )
        .order_by(Decision.key.asc())
    )
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
                "implications": d.implications,
                "status": d.status.value if hasattr(d.status, "value") else str(d.status),
            },
        })

    # 4. Epics & Features
    epic_res = await db.execute(
        select(Epic).where(Epic.project_id == project_id).order_by(Epic.key.asc())
    )
    epics = epic_res.scalars().all()
    epics_by_id = {e.id: e for e in epics}

    feat_res = await db.execute(
        select(Feature).where(Feature.project_id == project_id).order_by(Feature.key.asc())
    )
    features = feat_res.scalars().all()
    for f in features:
        snapshots.append({
            "evidence_type": "FEATURE",
            "evidence_entity_id": f.id,
            "evidence_snapshot": {
                "key": f.key,
                "title": f.title,
                "description": f.description,
                "status": f.status,
                "requirement_id": str(f.requirement_id) if f.requirement_id else None,
                "epic_id": str(f.epic_id) if f.epic_id else None,
            },
        })

    # 5. Implementation Verification Tasks
    # Qualifying tasks: project_id == project_id, status == DONE, is_archived == False, feature_id IS NOT NULL
    task_res = await db.execute(
        select(Task)
        .where(
            Task.project_id == project_id,
            Task.status == TaskStatus.DONE,
            Task.is_archived == False,
            Task.feature_id.is_not(None),
        )
        .order_by(Task.key.asc())
    )
    qualifying_tasks = task_res.scalars().all()
    for t in qualifying_tasks:
        snapshots.append({
            "evidence_type": "TASK",
            "evidence_entity_id": t.id,
            "evidence_snapshot": {
                "key": t.key,
                "title": t.title,
                "description": t.description,
                "status": t.status.value if hasattr(t.status, "value") else str(t.status),
                "feature_id": str(t.feature_id) if t.feature_id else None,
                "requirement_id": str(t.requirement_id) if t.requirement_id else None,
                "epic_id": str(t.epic_id) if t.epic_id else None,
            },
        })

    # Query unlinked DONE tasks for exception metadata (excluded from functional synthesis snapshots)
    unlinked_task_res = await db.execute(
        select(Task)
        .where(
            Task.project_id == project_id,
            Task.status == TaskStatus.DONE,
            Task.is_archived == False,
            Task.feature_id.is_(None),
        )
        .order_by(Task.key.asc())
    )
    unlinked_done_tasks = unlinked_task_res.scalars().all()

    # 6. Scope Changes (CLIENT_APPROVED & IMPLEMENTED)
    sc_res = await db.execute(
        select(ScopeChange)
        .where(
            ScopeChange.project_id == project_id,
            ScopeChange.status.in_([
                ScopeChangeStatus.CLIENT_APPROVED,
                ScopeChangeStatus.IMPLEMENTED,
            ]),
        )
        .order_by(ScopeChange.key.asc())
    )
    scope_changes = sc_res.scalars().all()
    for sc in scope_changes:
        snapshots.append({
            "evidence_type": "SCOPE_CHANGE",
            "evidence_entity_id": sc.id,
            "evidence_snapshot": {
                "key": sc.key,
                "title": sc.title,
                "description": sc.description,
                "reason": sc.reason,
                "impact_summary": sc.impact_summary,
                "status": sc.status.value if hasattr(sc.status, "value") else str(sc.status),
            },
        })

    # 7. Meaningful FSD Coverage Calculation
    has_requirements = len(requirements) > 0
    has_features = len(features) > 0
    has_ac = any(bool(r.acceptance_criteria and r.acceptance_criteria.strip()) for r in requirements)
    has_scope = len(scope_items) > 0
    has_decisions = len(decisions) > 0
    has_tasks = len(qualifying_tasks) > 0

    coverage_score = 0
    if has_requirements:
        coverage_score += 30
    if has_features:
        coverage_score += 25
    if has_ac:
        coverage_score += 15
    if has_scope:
        coverage_score += 10
    if has_decisions:
        coverage_score += 10
    if has_tasks:
        coverage_score += 10

    # 8. Hierarchical Relationship Mapping
    features_by_req: Dict[uuid.UUID, List[Feature]] = {}
    unmapped_features: List[Feature] = []
    req_ids = {r.id for r in requirements}

    for f in features:
        if f.requirement_id and f.requirement_id in req_ids:
            features_by_req.setdefault(f.requirement_id, []).append(f)
        else:
            unmapped_features.append(f)

    tasks_by_feat: Dict[uuid.UUID, List[Task]] = {}
    feat_key_map: Dict[uuid.UUID, str] = {f.id: f.key for f in features}
    for t in qualifying_tasks:
        if t.feature_id:
            tasks_by_feat.setdefault(t.feature_id, []).append(t)

    # 9. Format Explicit FSD Evidence Text
    req_lines = []
    if requirements:
        for r in requirements:
            r_feats = features_by_req.get(r.id, [])
            feat_block = []
            if r_feats:
                for rf in r_feats:
                    epic_name = epics_by_id[rf.epic_id].title if rf.epic_id and rf.epic_id in epics_by_id else "Unassigned Module"
                    f_tasks = tasks_by_feat.get(rf.id, [])
                    task_block = []
                    if f_tasks:
                        for ft in f_tasks:
                            task_block.append(f"          - [{ft.key}] {ft.title} (Status: DONE)")
                    else:
                        task_block.append("          - (No implementation verification tasks recorded)")

                    feat_block.append(
                        f"      * Feature [{rf.key}] {rf.title} (Status: {rf.status}, Module: {epic_name})\n"
                        f"        Description: {rf.description or 'No description'}\n"
                        f"        Implementation Verification (DONE Tasks):\n" + "\n".join(task_block)
                    )
            else:
                feat_block.append("      * (No implementing features linked)")

            req_lines.append(
                f"• Requirement [{r.key}] {r.title}\n"
                f"  - Status: {_enum_str(r.status)} | Category: {_enum_str(r.category)} | Priority: {r.priority}\n"
                f"  - Description: {r.description}\n"
                f"  - Acceptance Criteria: {r.acceptance_criteria or 'Standard criteria'}\n"
                f"  - Source: {_enum_str(r.source_type)} (ID: {r.source_id or 'N/A'})\n"
                f"  - Implementing Features & Verification:\n" + "\n".join(feat_block)
            )
    else:
        req_lines.append("• (No confirmed or approved functional requirements found.)")

    scope_lines = []
    if scope_items:
        for s in scope_items:
            scope_lines.append(
                f"• [{_enum_str(s.scope_type)}] {s.title}\n"
                f"  - Description: {s.description or 'N/A'}\n"
                f"  - Rationale: {s.rationale or 'N/A'}"
            )
    else:
        scope_lines.append("• (No scope boundaries registered.)")

    decision_lines = []
    if decisions:
        for d in decisions:
            decision_lines.append(
                f"• [{d.key}] {d.title}\n"
                f"  - Decision: {d.decision}\n"
                f"  - Rationale: {d.rationale or 'N/A'}\n"
                f"  - Functional Implications: {d.implications or 'N/A'}"
            )
    else:
        decision_lines.append("• (No accepted functional decisions/business rules registered.)")

    sc_lines = []
    if scope_changes:
        for sc in scope_changes:
            sc_lines.append(
                f"• [{sc.key}] {sc.title} (Status: {_enum_str(sc.status)})\n"
                f"  - Description: {sc.description}\n"
                f"  - Reason: {sc.reason}\n"
                f"  - Impact Summary: {sc.impact_summary or 'N/A'}"
            )
    else:
        sc_lines.append("• (No client-approved or implemented scope changes found.)")

    tasks_summary_lines = []
    if qualifying_tasks:
        for t in qualifying_tasks:
            f_key = feat_key_map.get(t.feature_id, "Unknown Feature")
            tasks_summary_lines.append(f"• [{t.key}] {t.title} -> Linked Feature: {f_key} (Status: DONE)")
    else:
        tasks_summary_lines.append("• (No qualifying DONE feature-linked tasks found.)")

    unmapped_feat_lines = []
    if unmapped_features:
        for uf in unmapped_features:
            epic_name = epics_by_id[uf.epic_id].title if uf.epic_id and uf.epic_id in epics_by_id else "Unassigned Module"
            uf_tasks = tasks_by_feat.get(uf.id, [])
            unmapped_feat_lines.append(
                f"• [{uf.key}] {uf.title} (Status: {uf.status}, Module: {epic_name})\n"
                f"  Description: {uf.description or 'No description'}\n"
                f"  Linked DONE Tasks: {len(uf_tasks)}"
            )
    else:
        unmapped_feat_lines.append("• (None. All features are linked to confirmed requirements.)")

    unlinked_tasks_lines = []
    if unlinked_done_tasks:
        for ut in unlinked_done_tasks:
            unlinked_tasks_lines.append(f"• [{ut.key}] {ut.title} (Status: DONE, Feature: None)")
    else:
        unlinked_tasks_lines.append("• (None. No unlinked DONE tasks found.)")

    evidence_text = f"""=== FSD FUNCTIONAL EVIDENCE ===
Project: {project.name} ({project.code})
Document Type: FSD
Evidence Coverage: {coverage_score}%

---
1. AUTHORITATIVE FUNCTIONAL EVIDENCE

[A] REQUIREMENTS (CONFIRMED & APPROVED ONLY)
Total Qualifying Requirements: {len(requirements)}
{chr(10).join(req_lines)}

[B] SCOPE BOUNDARY (IN_SCOPE & OUT_OF_SCOPE)
Total Scope Items: {len(scope_items)}
{chr(10).join(scope_lines)}

---
2. SUPPORTING FUNCTIONAL EVIDENCE

[A] BUSINESS RULES & FUNCTIONAL DECISIONS (ACCEPTED ONLY)
Total Accepted Decisions: {len(decisions)}
(Note: Reflects confirmed business rules and functional constraints; technical architecture details belong in Technical Documentation.)
{chr(10).join(decision_lines)}

[B] SCOPE CHANGES (CLIENT_APPROVED & IMPLEMENTED)
Total Approved/Implemented Changes: {len(scope_changes)}
{chr(10).join(sc_lines)}

---
3. IMPLEMENTATION VERIFICATION EVIDENCE

[A] DONE TASKS LINKED TO FEATURES
Total Qualifying Tasks: {len(qualifying_tasks)}
(Notice: These tasks serve strictly as verification proof for implemented features and MUST NOT be synthesized as independent functional requirements.)
{chr(10).join(tasks_summary_lines)}

---
4. COVERAGE / EXCEPTIONS & UNMAPPED WORK

[A] UNMAPPED FEATURES (Features without Confirmed Requirement Link)
Total Unmapped Features: {len(unmapped_features)}
(Notice: Unmapped features are preserved for contextual completeness and must NOT be fabricated into non-existent requirements.)
{chr(10).join(unmapped_feat_lines)}

[B] UNLINKED IMPLEMENTATION WORK (Excluded from Functional Synthesis)
Total Unlinked DONE Tasks: {len(unlinked_done_tasks)}
(Notice: Generic or unlinked tasks have no Feature association and are strictly excluded from functional synthesis.)
{chr(10).join(unlinked_tasks_lines)}

---
5. ANTI-HALLUCINATION & STRUCTURAL DISCLOSURES
• ACTOR & ROLE DATA: No structured actor/role model is available in the current project data schema.
• WORKFLOW DATA: No structured workflow definition is available in the current project data schema.
"""

    return {
        "project": project,
        "evidence_text": evidence_text,
        "coverage_percentage": coverage_score,
        "snapshots": snapshots,
    }


async def _resolve_generic_evidence(
    project: Project,
    project_id: uuid.UUID,
    document_type: DocumentType,
    db: AsyncSession,
) -> Dict[str, Any]:
    """
    Generic resolver for non-FSD documents (PRD, USER_GUIDE, ADMIN_GUIDE, etc.).
    Preserves existing product-level evidence contracts without leaking FSD implementation verification tasks.
    """
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

    # 5. Coverage Calculation (Generic)
    total_elements = len(requirements) + len(decisions) + len(scope_items) + len(features)
    coverage_score = 100 if total_elements > 0 else 50

    # 6. Format Evidence Text for Prompt
    evidence_text = f"""=== PROJECT DOCUMENTATION EVIDENCE ===
Project Name: {project.name} ({project.code})
Document Type: {document_type.value}
Total Mapped Elements: {total_elements} (Coverage: {coverage_score}%)

1. Functional & Technical Requirements ({len(requirements)} items):
{chr(10).join([f"- {r.key}: {r.title} | Category: {r.category} | AC: {r.acceptance_criteria or 'Standard criteria'}" for r in requirements]) or 'Belum ada requirements terdaftar.'}

2. Scope Baseline:
{chr(10).join([f"- [{_enum_str(s.scope_type)}] {s.title}" for s in scope_items]) or 'Belum ada scope baseline.'}

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
