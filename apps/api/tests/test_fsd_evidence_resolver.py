import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from projectpilot.persistence.models.client import Client
from projectpilot.persistence.models.document import DocumentType
from projectpilot.persistence.models.planning_tasks import Epic, Feature, Task, TaskStatus
from projectpilot.persistence.models.project import Project, ProjectHealth, ProjectLifecycleStage
from projectpilot.persistence.models.discovery import DiscoveryCategory
from projectpilot.persistence.models.requirements_scope import (
    Decision,
    DecisionStatus,
    Requirement,
    RequirementStatus,
    ScopeChange,
    ScopeChangeStatus,
    ScopeItem,
    ScopeType,
)
from projectpilot.persistence.models.user import User, UserRole
from projectpilot.services.document_evidence_resolver import resolve_document_evidence


@pytest.mark.asyncio
async def test_fsd_evidence_resolver_filtering_and_hierarchy(db_session: AsyncSession):
    """
    Unit test for resolve_document_evidence verifying:
    1. FSD vs PRD contract differentiation
    2. Requirement status filtering (only CONFIRMED & APPROVED)
    3. Decision status filtering (only ACCEPTED)
    4. Task filtering (only DONE, non-archived, feature-linked)
    5. Hierarchy preservation (Requirement -> Feature -> Task)
    6. Unmapped features and unlinked tasks handling
    7. No Task leakage into PRD
    """
    # Setup test user, client, and project
    user = User(
        email="pm_test@projectpilot.id",
        password_hash="fakehash",
        full_name="PM Resolver Tester",
        role=UserRole.PROJECT_MANAGER,
    )
    db_session.add(user)
    await db_session.flush()

    client = Client(name="Test Client Corp", company_name="PT Test Client")
    db_session.add(client)
    await db_session.flush()

    project = Project(
        code="PRJ-FSD-001",
        name="Enterprise Logistics Core",
        client_id=client.id,
        owner_id=user.id,
        lifecycle_stage=ProjectLifecycleStage.ACTIVE_DELIVERY,
        health=ProjectHealth.HEALTHY,
    )
    db_session.add(project)
    await db_session.flush()

    # Requirements: various statuses
    r_confirmed = Requirement(
        project_id=project.id,
        key="REQ-001",
        title="Automated Route Optimization",
        description="System must automatically optimize vehicle routes.",
        category="TECHNICAL",
        priority="HIGH",
        status=RequirementStatus.CONFIRMED,
        acceptance_criteria="Route calculated in < 3 seconds.",
    )
    r_approved = Requirement(
        project_id=project.id,
        key="REQ-002",
        title="Driver Telematics Ingestion",
        description="Ingest GPS telemetry every 10 seconds.",
        category="DATA",
        priority="CRITICAL",
        status=RequirementStatus.APPROVED,
        acceptance_criteria="Zero message loss over MQTT broker.",
    )
    r_draft = Requirement(
        project_id=project.id,
        key="REQ-003",
        title="Draft Requirement",
        description="Draft spec not yet confirmed.",
        category="FUNCTIONAL",
        priority="LOW",
        status=RequirementStatus.DRAFT,
    )
    r_clarification = Requirement(
        project_id=project.id,
        key="REQ-004",
        title="Unclear Requirement",
        description="Needs client clarification.",
        category="FUNCTIONAL",
        priority="MEDIUM",
        status=RequirementStatus.NEEDS_CLARIFICATION,
    )
    r_rejected = Requirement(
        project_id=project.id,
        key="REQ-005",
        title="Rejected Requirement",
        description="Stakeholder rejected feature.",
        category="FUNCTIONAL",
        priority="LOW",
        status=RequirementStatus.REJECTED,
    )
    r_superseded = Requirement(
        project_id=project.id,
        key="REQ-006",
        title="Superseded Requirement",
        description="Older version of route optimization.",
        category="FUNCTIONAL",
        priority="MEDIUM",
        status=RequirementStatus.SUPERSEDED,
    )
    db_session.add_all([r_confirmed, r_approved, r_draft, r_clarification, r_rejected, r_superseded])

    # Scope Items
    s_in = ScopeItem(
        project_id=project.id,
        title="Core Dispatch Engine",
        description="Real-time dispatch optimization service.",
        scope_type=ScopeType.IN_SCOPE,
        rationale="Essential for business SLA.",
    )
    s_out = ScopeItem(
        project_id=project.id,
        title="Customer Mobile Native App",
        description="Native iOS/Android application for drivers.",
        scope_type=ScopeType.OUT_OF_SCOPE,
        rationale="Deferred to Phase 2.",
    )
    db_session.add_all([s_in, s_out])

    # Decisions: various statuses
    d_accepted = Decision(
        project_id=project.id,
        key="ADR-001",
        title="Async Event Bus: Kafka",
        context="High throughput telemetry processing.",
        decision="Adopt Apache Kafka for vehicle telemetry streaming.",
        rationale="Sub-second delivery with partitioned scaling.",
        implications="Requires 3-node cluster and schema registry.",
        status=DecisionStatus.ACCEPTED,
    )
    d_proposed = Decision(
        project_id=project.id,
        key="ADR-002",
        title="Proposed Cache: Redis Cluster",
        context="Evaluation of Redis vs Memcached.",
        decision="Proposed Redis cluster.",
        status=DecisionStatus.PROPOSED,
    )
    d_revoked = Decision(
        project_id=project.id,
        key="ADR-003",
        title="Revoked Decision: RabbitMQ",
        context="Initial message broker thought.",
        decision="RabbitMQ selected.",
        status=DecisionStatus.REVOKED,
    )
    db_session.add_all([d_accepted, d_proposed, d_revoked])

    # Epic & Features
    epic = Epic(
        project_id=project.id,
        key="EPIC-01",
        title="Dispatch Optimization Engine",
        description="Core dispatching algorithms and routing.",
    )
    db_session.add(epic)
    await db_session.flush()

    feat_mapped = Feature(
        project_id=project.id,
        epic_id=epic.id,
        requirement_id=r_confirmed.id,
        key="FEAT-001",
        title="Multi-Stop Route Calculator",
        description="Calculates optimal stop sequence using TSP heuristic.",
        status="IN_PROGRESS",
    )
    feat_unmapped = Feature(
        project_id=project.id,
        epic_id=epic.id,
        requirement_id=None,
        key="FEAT-002",
        title="Manual Override Dispatch Console",
        description="Allows PM/Dispatcher to manually drag-and-drop orders.",
        status="PLANNED",
    )
    db_session.add_all([feat_mapped, feat_unmapped])
    await db_session.flush()

    # Tasks: various statuses and linkages
    # 1. Qualifying task: DONE + non-archived + feature_id is not None
    task_qualifying = Task(
        project_id=project.id,
        epic_id=epic.id,
        feature_id=feat_mapped.id,
        requirement_id=r_confirmed.id,
        key="TASK-001",
        title="Implement Dijkstra Algorithm Helper",
        description="Graph routing calculation service helper.",
        status=TaskStatus.DONE,
        is_archived=False,
    )
    # 2. Non-qualifying: IN_PROGRESS
    task_in_progress = Task(
        project_id=project.id,
        epic_id=epic.id,
        feature_id=feat_mapped.id,
        key="TASK-002",
        title="Connect Route UI to Backend API",
        status=TaskStatus.IN_PROGRESS,
        is_archived=False,
    )
    # 3. Non-qualifying: BACKLOG
    task_backlog = Task(
        project_id=project.id,
        epic_id=epic.id,
        feature_id=feat_mapped.id,
        key="TASK-003",
        title="Benchmark 100-stop performance",
        status=TaskStatus.BACKLOG,
        is_archived=False,
    )
    # 4. Non-qualifying: DONE but archived
    task_archived = Task(
        project_id=project.id,
        epic_id=epic.id,
        feature_id=feat_mapped.id,
        key="TASK-004",
        title="Legacy Prototype Routing Test",
        status=TaskStatus.DONE,
        is_archived=True,
    )
    # 5. Non-qualifying for functional synthesis: DONE but unlinked (feature_id=None)
    task_unlinked_done = Task(
        project_id=project.id,
        key="TASK-005",
        title="Setup CI/CD GitHub Actions Runner",
        status=TaskStatus.DONE,
        is_archived=False,
        feature_id=None,
    )
    db_session.add_all([task_qualifying, task_in_progress, task_backlog, task_archived, task_unlinked_done])

    # ScopeChange: CLIENT_APPROVED vs IDENTIFIED
    sc_approved = ScopeChange(
        project_id=project.id,
        key="SC-001",
        title="Add Hazardous Cargo Weight Constraint",
        description="Include hazardous chemical transport limits in routing.",
        reason="Client compliance update with Ministry of Transportation.",
        status=ScopeChangeStatus.CLIENT_APPROVED,
    )
    sc_identified = ScopeChange(
        project_id=project.id,
        key="SC-002",
        title="Toll Road Cost Optimizer",
        description="Option to avoid toll roads.",
        reason="Cost reduction request.",
        status=ScopeChangeStatus.IDENTIFIED,
    )
    db_session.add_all([sc_approved, sc_identified])
    await db_session.commit()

    # =========================================================================
    # A. Resolve FSD Evidence
    # =========================================================================
    fsd_result = await resolve_document_evidence(project.id, DocumentType.FSD, db_session)

    # 1. Requirement filtering
    req_snapshots = [s for s in fsd_result["snapshots"] if s["evidence_type"] == "REQUIREMENT"]
    req_keys = {s["evidence_snapshot"]["key"] for s in req_snapshots}
    assert "REQ-001" in req_keys  # CONFIRMED -> Included
    assert "REQ-002" in req_keys  # APPROVED -> Included
    assert "REQ-003" not in req_keys  # DRAFT -> Excluded
    assert "REQ-004" not in req_keys  # NEEDS_CLARIFICATION -> Excluded
    assert "REQ-005" not in req_keys  # REJECTED -> Excluded
    assert "REQ-006" not in req_keys  # SUPERSEDED -> Excluded
    assert len(req_snapshots) == 2

    # 2. Decision filtering
    dec_snapshots = [s for s in fsd_result["snapshots"] if s["evidence_type"] == "DECISION"]
    dec_keys = {s["evidence_snapshot"]["key"] for s in dec_snapshots}
    assert "ADR-001" in dec_keys  # ACCEPTED -> Included
    assert "ADR-002" not in dec_keys  # PROPOSED -> Excluded
    assert "ADR-003" not in dec_keys  # REVOKED -> Excluded
    assert len(dec_snapshots) == 1

    # 3. Scope items: both IN_SCOPE and OUT_OF_SCOPE included
    scope_snapshots = [s for s in fsd_result["snapshots"] if s["evidence_type"] == "SCOPE_ITEM"]
    assert len(scope_snapshots) == 2

    # 4. Scope change filtering: only CLIENT_APPROVED / IMPLEMENTED
    sc_snapshots = [s for s in fsd_result["snapshots"] if s["evidence_type"] == "SCOPE_CHANGE"]
    sc_keys = {s["evidence_snapshot"]["key"] for s in sc_snapshots}
    assert "SC-001" in sc_keys
    assert "SC-002" not in sc_keys
    assert len(sc_snapshots) == 1

    # 5. Task filtering: only DONE + non-archived + feature_id is not None
    task_snapshots = [s for s in fsd_result["snapshots"] if s["evidence_type"] == "TASK"]
    task_keys = {s["evidence_snapshot"]["key"] for s in task_snapshots}
    assert "TASK-001" in task_keys  # Qualifying
    assert "TASK-002" not in task_keys  # IN_PROGRESS -> Excluded
    assert "TASK-003" not in task_keys  # BACKLOG -> Excluded
    assert "TASK-004" not in task_keys  # Archived -> Excluded
    assert "TASK-005" not in task_keys  # Unlinked -> Excluded from functional synthesis snapshots
    assert len(task_snapshots) == 1

    # 6. Hierarchy in evidence_text:
    fsd_text = fsd_result["evidence_text"]
    assert "=== FSD FUNCTIONAL EVIDENCE ===" in fsd_text
    assert "REQ-001" in fsd_text
    assert "FEAT-001" in fsd_text
    assert "TASK-001" in fsd_text
    # Unmapped feature is exposed in exception metadata, not fabricated as requirement
    assert "FEAT-002" in fsd_text
    assert "UNMAPPED FEATURES" in fsd_text
    # Unlinked task is noted under exceptions
    assert "TASK-005" in fsd_text
    assert "UNLINKED IMPLEMENTATION WORK" in fsd_text
    # Anti-hallucination disclaimers
    assert "ACTOR & ROLE DATA" in fsd_text
    assert "WORKFLOW DATA" in fsd_text

    # 7. Coverage metric
    assert 0 < fsd_result["coverage_percentage"] <= 100

    # =========================================================================
    # B. Resolve PRD Evidence (Verify separation and zero leakage)
    # =========================================================================
    prd_result = await resolve_document_evidence(project.id, DocumentType.PRD, db_session)

    # Verify contracts differ
    assert fsd_result["evidence_text"] != prd_result["evidence_text"]
    assert "=== FSD FUNCTIONAL EVIDENCE ===" not in prd_result["evidence_text"]

    # Verify PRD does NOT receive Task evidence
    prd_task_snapshots = [s for s in prd_result["snapshots"] if s["evidence_type"] == "TASK"]
    assert len(prd_task_snapshots) == 0
    assert "TASK-001" not in prd_result["evidence_text"]
    assert "IMPLEMENTATION VERIFICATION EVIDENCE" not in prd_result["evidence_text"]


@pytest.mark.asyncio
async def test_fsd_generation_e2e_evidence_snapshots(client: AsyncClient):
    """
    End-to-end integration test verifying that generating an FSD draft
    records exactly the filtered evidence snapshots in the database.
    """
    # 1. Register & Login PM
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "fsd_e2e_pm@projectpilot.id",
            "password": "Password123!",
            "full_name": "FSD Resolver PM",
            "role": "PROJECT_MANAGER",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "fsd_e2e_pm@projectpilot.id", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Client & Project
    c_res = await client.post(
        "/api/v1/clients",
        json={"name": "Logistics Global", "company_name": "PT Logistics Global"},
        headers=headers,
    )
    client_id = c_res.json()["id"]

    p_res = await client.post(
        "/api/v1/projects",
        json={"name": "Fleet Dispatch Pro", "code": "PRJ-FLEET-01", "client_id": client_id},
        headers=headers,
    )
    project_id = p_res.json()["id"]

    # 3. Create a confirmed requirement
    req_res = await client.post(
        f"/api/v1/projects/{project_id}/requirements",
        json={
            "key": "REQ-CONFIRMED",
            "title": "Real-time Vehicle Tracking",
            "description": "Track fleet vehicle locations via GPS.",
            "category": "TECHNICAL",
            "acceptance_criteria": "Latency < 1s.",
        },
        headers=headers,
    )
    req_id = req_res.json()["id"]
    await client.post(
        f"/api/v1/projects/{project_id}/requirements/{req_id}/status",
        json={"target_status": "CONFIRMED"},
        headers=headers,
    )

    # Create a draft requirement (should be excluded from FSD)
    await client.post(
        f"/api/v1/projects/{project_id}/requirements",
        json={
            "key": "REQ-DRAFT",
            "title": "Experimental AI Voice Commands",
            "description": "Voice command driver interface.",
            "category": "FUNCTIONAL",
        },
        headers=headers,
    )

    # Create ScopeItem & Accepted Decision
    await client.post(
        f"/api/v1/projects/{project_id}/scope-items",
        json={"title": "GPS Ingestion Service", "scope_type": "IN_SCOPE"},
        headers=headers,
    )
    await client.post(
        f"/api/v1/projects/{project_id}/decisions",
        json={
            "key": "ADR-01",
            "title": "Use PostgreSQL PostGIS",
            "context": "Geospatial queries needed.",
            "decision": "Adopt PostGIS extension.",
        },
        headers=headers,
    )

    # 4. Generate FSD Document Draft
    fsd_res = await client.post(
        f"/api/v1/projects/{project_id}/documents/generate-draft",
        json={"document_type": "FSD"},
        headers=headers,
    )
    assert fsd_res.status_code == 201
    fsd_data = fsd_res.json()

    evidences = fsd_data["evidences"]
    req_evidence = [e for e in evidences if e["evidence_type"] == "REQUIREMENT"]
    assert len(req_evidence) == 1
    assert req_evidence[0]["evidence_snapshot"]["key"] == "REQ-CONFIRMED"

    # Verify no DRAFT requirement in snapshots
    all_keys = [e["evidence_snapshot"].get("key") for e in evidences if e["evidence_snapshot"]]
    assert "REQ-DRAFT" not in all_keys
