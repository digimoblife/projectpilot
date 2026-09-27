import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from projectpilot.core.security import get_password_hash
from projectpilot.persistence.models import (
    Blocker,
    BlockerStatus,
    Client,
    ClientDependency,
    Decision,
    DecisionStatus,
    DiscoveryQuestion,
    DocumentType,
    Epic,
    Feature,
    Issue,
    IssueStatus,
    Meeting,
    Milestone,
    MilestoneStatus,
    MoMDocument,
    Project,
    ProjectLifecycleStage,
    ProjectResource,
    Requirement,
    RequirementStatus,
    ResourceStatus,
    Risk,
    RiskStatus,
    ScopeChange,
    ScopeChangeStatus,
    ScopeItem,
    ScopeType,
    Stakeholder,
    Task,
    TaskStatus,
    User,
    UserRole,
)
from projectpilot.scripts.seed_lapaq_commerce import seed_lapaq_commerce_project
from projectpilot.services.document_evidence_resolver import resolve_document_evidence


@pytest.mark.asyncio
async def test_seed_lapaq_commerce_and_evidence_validation(db_session: AsyncSession):
    """
    Validates that:
    1. The seed script executes successfully and idempotently.
    2. All project entities, relationships, and edge cases are created accurately.
    3. Status distributions match the required specification.
    4. Requirement -> Feature -> Task traceability graph is complete.
    5. The FSD evidence resolver extracts exactly the authoritative evidence.
    """
    # 1. Setup base users required by the seed
    pm_user = User(
        email="pm@projectpilot.io",
        password_hash=get_password_hash("Pilot123!"),
        full_name="Cahyo PM",
        role=UserRole.PROJECT_MANAGER,
        is_active=True,
    )
    dev_user = User(
        email="dev@projectpilot.io",
        password_hash=get_password_hash("Dev123!"),
        full_name="Budi Engineer",
        role=UserRole.TEAM_MEMBER,
        is_active=True,
    )
    des_user = User(
        email="designer@projectpilot.io",
        password_hash=get_password_hash("Design123!"),
        full_name="Sinta Designer",
        role=UserRole.TEAM_MEMBER,
        is_active=True,
    )
    db_session.add_all([pm_user, dev_user, des_user])
    await db_session.commit()

    # 2. Execute Seed (Run twice to test idempotency)
    await seed_lapaq_commerce_project(session=db_session)
    await seed_lapaq_commerce_project(session=db_session)

    # 3. Verify Project
    proj_stmt = select(Project).where(Project.code == "PRJ-005")
    project = (await db_session.execute(proj_stmt)).scalar_one_or_none()
    assert project is not None
    assert project.name == "Lapaq Multi-Store Commerce Platform"
    assert project.lifecycle_stage == ProjectLifecycleStage.ACTIVE_DELIVERY

    # 4. Verify Requirements Distribution
    req_stmt = select(Requirement).where(Requirement.project_id == project.id)
    requirements = (await db_session.execute(req_stmt)).scalars().all()
    assert len(requirements) == 23

    req_by_status = {}
    for r in requirements:
        req_by_status[r.status] = req_by_status.get(r.status, 0) + 1

    assert req_by_status[RequirementStatus.APPROVED] == 12
    assert req_by_status[RequirementStatus.CONFIRMED] == 4
    assert req_by_status[RequirementStatus.APPROVED] + req_by_status[RequirementStatus.CONFIRMED] == 16
    assert req_by_status.get(RequirementStatus.DRAFT, 0) == 1
    assert req_by_status.get(RequirementStatus.NEEDS_CLARIFICATION, 0) == 2
    assert req_by_status.get(RequirementStatus.REJECTED, 0) == 2
    assert req_by_status.get(RequirementStatus.SUPERSEDED, 0) == 2

    # 5. Verify Epics & Features
    epic_stmt = select(Epic).where(Epic.project_id == project.id)
    epics = (await db_session.execute(epic_stmt)).scalars().all()
    assert len(epics) == 13

    feat_stmt = select(Feature).where(Feature.project_id == project.id)
    features = (await db_session.execute(feat_stmt)).scalars().all()
    assert len(features) == 33

    mapped_feats = [f for f in features if f.requirement_id is not None]
    unmapped_feats = [f for f in features if f.requirement_id is None]
    assert len(mapped_feats) == 30
    assert len(unmapped_feats) == 3
    unmapped_keys = {f.key for f in unmapped_feats}
    assert "FEAT-STORE-03" in unmapped_keys
    assert "FEAT-CAT-04" in unmapped_keys
    assert "FEAT-ORD-04" in unmapped_keys

    # 6. Verify Tasks Distribution & Verification Eligibility
    task_stmt = select(Task).where(Task.project_id == project.id)
    tasks = (await db_session.execute(task_stmt)).scalars().all()
    assert len(tasks) == 79

    tasks_by_status = {}
    for t in tasks:
        tasks_by_status[t.status] = tasks_by_status.get(t.status, 0) + 1

    assert tasks_by_status[TaskStatus.DONE] == 40
    assert tasks_by_status[TaskStatus.QA] == 6
    assert tasks_by_status[TaskStatus.IN_PROGRESS] == 10
    assert tasks_by_status[TaskStatus.READY] == 6
    assert tasks_by_status[TaskStatus.IN_REVIEW] == 5
    assert tasks_by_status[TaskStatus.BACKLOG] == 8
    assert tasks_by_status[TaskStatus.BLOCKED] == 2
    assert tasks_by_status[TaskStatus.CANCELLED] == 2

    archived_tasks = [t for t in tasks if t.is_archived]
    assert len(archived_tasks) == 2

    # Tasks eligible as FSD implementation verification:
    # DONE + non-archived + feature_id IS NOT NULL + linked to confirmed/approved requirement
    approved_req_ids = {r.id for r in requirements if r.status in [RequirementStatus.CONFIRMED, RequirementStatus.APPROVED]}
    eligible_verif_tasks = [
        t for t in tasks
        if t.status == TaskStatus.DONE
        and not t.is_archived
        and t.feature_id is not None
        and t.requirement_id in approved_req_ids
    ]
    assert len(eligible_verif_tasks) == 32

    # DONE tasks linked to unmapped features
    emergent_tasks = [
        t for t in tasks
        if t.status == TaskStatus.DONE
        and not t.is_archived
        and t.feature_id is not None
        and t.requirement_id is None
    ]
    assert len(emergent_tasks) == 3

    # DONE tasks that are unlinked (feature_id is None)
    unlinked_done_tasks = [
        t for t in tasks
        if t.status == TaskStatus.DONE
        and not t.is_archived
        and t.feature_id is None
    ]
    assert len(unlinked_done_tasks) == 3

    # 7. Verify Scope Items
    scope_stmt = select(ScopeItem).where(ScopeItem.project_id == project.id)
    scope_items = (await db_session.execute(scope_stmt)).scalars().all()
    assert len(scope_items) == 22
    in_scope = [s for s in scope_items if s.scope_type == ScopeType.IN_SCOPE]
    out_of_scope = [s for s in scope_items if s.scope_type == ScopeType.OUT_OF_SCOPE]
    assert len(in_scope) == 16
    assert len(out_of_scope) == 6

    # 8. Verify Decisions (ADR)
    dec_stmt = select(Decision).where(Decision.project_id == project.id)
    decisions = (await db_session.execute(dec_stmt)).scalars().all()
    assert len(decisions) == 10
    dec_by_status = {d.status: 0 for d in decisions}
    for d in decisions:
        dec_by_status[d.status] = dec_by_status.get(d.status, 0) + 1
    assert dec_by_status[DecisionStatus.ACCEPTED] == 7
    assert dec_by_status[DecisionStatus.PROPOSED] == 1
    assert dec_by_status[DecisionStatus.REVOKED] == 1
    assert dec_by_status[DecisionStatus.SUPERSEDED] == 1

    # 9. Verify Scope Changes
    sc_stmt = select(ScopeChange).where(ScopeChange.project_id == project.id)
    scope_changes = (await db_session.execute(sc_stmt)).scalars().all()
    assert len(scope_changes) == 4
    sc_by_status = {sc.status: 0 for sc in scope_changes}
    for sc in scope_changes:
        sc_by_status[sc.status] = sc_by_status.get(sc.status, 0) + 1
    assert sc_by_status[ScopeChangeStatus.CLIENT_APPROVED] == 1
    assert sc_by_status[ScopeChangeStatus.IMPLEMENTED] == 1
    assert sc_by_status[ScopeChangeStatus.UNDER_EVALUATION] == 1
    assert sc_by_status[ScopeChangeStatus.REJECTED] == 1

    # 10. Verify Issues, Risks, Blockers & Dependencies
    issue_stmt = select(Issue).where(Issue.project_id == project.id)
    issues = (await db_session.execute(issue_stmt)).scalars().all()
    assert len(issues) == 4

    risk_stmt = select(Risk).where(Risk.project_id == project.id)
    risks = (await db_session.execute(risk_stmt)).scalars().all()
    assert len(risks) == 2

    blocker_stmt = select(Blocker).where(Blocker.project_id == project.id)
    blockers = (await db_session.execute(blocker_stmt)).scalars().all()
    assert len(blockers) == 1

    dep_stmt = select(ClientDependency).where(ClientDependency.project_id == project.id)
    deps = (await db_session.execute(dep_stmt)).scalars().all()
    assert len(deps) == 2

    # 11. Verify Delivery Evidence (Milestones & Resources)
    ml_stmt = select(Milestone).where(Milestone.project_id == project.id)
    milestones = (await db_session.execute(ml_stmt)).scalars().all()
    assert len(milestones) == 4
    achieved_mls = [m for m in milestones if m.status == MilestoneStatus.ACHIEVED]
    assert len(achieved_mls) == 2

    res_stmt = select(ProjectResource).where(ProjectResource.project_id == project.id)
    resources = (await db_session.execute(res_stmt)).scalars().all()
    assert len(resources) == 4

    # 12. Verify Traceability Graph: Requirement -> Feature -> Task
    for feat in mapped_feats:
        assert feat.requirement_id in approved_req_ids
    for t in eligible_verif_tasks:
        assert t.feature_id is not None
        assert t.requirement_id in approved_req_ids

    # 13. Test FSD Evidence Resolver Output on the Seeded Project
    resolved = await resolve_document_evidence(project.id, DocumentType.FSD, db_session)
    assert resolved["project"].name == "Lapaq Multi-Store Commerce Platform"
    assert resolved["coverage_percentage"] == 100

    fsd_snapshots = resolved["snapshots"]
    fsd_req_keys = {s["evidence_snapshot"]["key"] for s in fsd_snapshots if s["evidence_type"] == "REQUIREMENT"}
    assert len(fsd_req_keys) == 16
    assert "REQ-STORE-001" in fsd_req_keys
    assert "REQ-PROD-001" in fsd_req_keys
    assert "REQ-DRF-001" not in fsd_req_keys
    assert "REQ-REJ-001" not in fsd_req_keys
    assert "REQ-SUP-001" not in fsd_req_keys

    fsd_dec_keys = {s["evidence_snapshot"]["key"] for s in fsd_snapshots if s["evidence_type"] == "DECISION"}
    assert len(fsd_dec_keys) == 7
    assert "ADR-001" in fsd_dec_keys
    assert "ADR-008" not in fsd_dec_keys
    assert "ADR-009" not in fsd_dec_keys
    assert "ADR-010" not in fsd_dec_keys

    fsd_task_keys = {s["evidence_snapshot"]["key"] for s in fsd_snapshots if s["evidence_type"] == "TASK"}
    # All 35 DONE + non-archived + feature-linked tasks are recorded as task verification evidence (32 mapped + 3 unmapped feature tasks)
    assert len(fsd_task_keys) == 35
    assert "TSK-ST-01" in fsd_task_keys
    assert "TSK-ENG-01" not in fsd_task_keys  # Unlinked task excluded from task snapshot
    assert "TSK-ARC-01" not in fsd_task_keys  # Archived task excluded
    assert "TSK-QA-01" not in fsd_task_keys   # QA task excluded from verification snapshot

    # Verify Evidence Text contains the required hierarchy
    evidence_text = resolved["evidence_text"]
    assert "=== FSD FUNCTIONAL EVIDENCE ===" in evidence_text
    assert "Lapaq Multi-Store Commerce Platform" in evidence_text
    assert "REQ-STORE-001" in evidence_text
    assert "FEAT-STORE-01" in evidence_text
    assert "TSK-ST-01" in evidence_text
    assert "UNMAPPED FEATURES" in evidence_text
    assert "FEAT-STORE-03" in evidence_text
    assert "UNLINKED IMPLEMENTATION WORK" in evidence_text
    assert "TSK-ENG-01" in evidence_text
