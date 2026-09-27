from datetime import date, timedelta
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_weekly_monthly_reporting_workflow(client: AsyncClient):
    # 1. Register & Login PM
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "reportpm@projectpilot.id",
            "password": "Password123!",
            "full_name": "Report PM Lead",
            "role": "PROJECT_MANAGER",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "reportpm@projectpilot.id", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Client & Project
    c_res = await client.post(
        "/api/v1/clients",
        json={"name": "Retail Corp", "company_name": "PT Retail Mandiri"},
        headers=headers,
    )
    client_id = c_res.json()["id"]

    p_res = await client.post(
        "/api/v1/projects",
        json={
            "name": "POS Cloud Migration",
            "code": "PRJ-POS-01",
            "client_id": client_id,
        },
        headers=headers,
    )
    project_id = p_res.json()["id"]

    # Create Milestone & Task
    m_res = await client.post(
        f"/api/v1/projects/{project_id}/milestones",
        json={"key": "M1", "title": "Database Schema Setup", "target_date": date.today().isoformat()},
        headers=headers,
    )
    assert m_res.status_code == 201

    # 3. Generate Weekly Internal Report Draft
    today = date.today()
    last_week = today - timedelta(days=7)

    gen_int_res = await client.post(
        f"/api/v1/projects/{project_id}/reports/generate-draft",
        json={
            "report_type": "WEEKLY_INTERNAL",
            "reporting_period_start": last_week.isoformat(),
            "reporting_period_end": today.isoformat(),
            "custom_instructions": "Highlight progress on PostgreSQL migration.",
        },
        headers=headers,
    )
    assert gen_int_res.status_code == 201
    int_data = gen_int_res.json()
    report_id = int_data["id"]
    assert int_data["report_key"] == "REP-001"
    assert int_data["status"] == "DRAFT"
    assert int_data["version"] == 1
    assert len(int_data["evidences"]) >= 1

    # 4. Generate Weekly Client Report Draft
    gen_client_res = await client.post(
        f"/api/v1/projects/{project_id}/reports/generate-draft",
        json={
            "report_type": "WEEKLY_CLIENT",
            "reporting_period_start": last_week.isoformat(),
            "reporting_period_end": today.isoformat(),
        },
        headers=headers,
    )
    assert gen_client_res.status_code == 201
    client_data = gen_client_res.json()
    assert client_data["report_type"] == "WEEKLY_CLIENT"

    # 5. Edit Report Markdown Content
    edit_res = await client.put(
        f"/api/v1/projects/{project_id}/reports/{report_id}",
        json={
            "title": "Laporan Mingguan Internal Proyek POS (Updated)",
            "content": "# Laporan Internal Proyek\n\n## 1. Highlight\nRevisi manual PM.",
        },
        headers=headers,
    )
    assert edit_res.status_code == 200
    assert edit_res.json()["title"] == "Laporan Mingguan Internal Proyek POS (Updated)"

    # 6. Finalize Report
    fin_res = await client.post(
        f"/api/v1/projects/{project_id}/reports/{report_id}/finalize",
        headers=headers,
    )
    assert fin_res.status_code == 200
    assert fin_res.json()["status"] == "FINAL"
    assert fin_res.json()["finalized_at"] is not None

    # 7. Create New Revision Version
    rev_res = await client.post(
        f"/api/v1/projects/{project_id}/reports/{report_id}/create-version",
        headers=headers,
    )
    assert rev_res.status_code == 200
    rev_data = rev_res.json()
    assert rev_data["version"] == 2
    assert rev_data["status"] == "DRAFT"
    assert rev_data["supersedes_report_id"] == report_id

    # 8. Query Global Reports Feed
    global_res = await client.get("/api/v1/reports", headers=headers)
    assert global_res.status_code == 200
    assert len(global_res.json()) >= 2
    assert "Konten sedang diproses" not in int_data["content"]
    assert len(int_data["content"]) > 50
    assert "Konten sedang diproses" not in client_data["content"]
    assert len(client_data["content"]) > 50

    # 9. Delete Report
    del_res = await client.delete(
        f"/api/v1/projects/{project_id}/reports/{report_id}",
        headers=headers,
    )
    assert del_res.status_code == 204

    # Verify not found
    get_del = await client.get(
        f"/api/v1/projects/{project_id}/reports/{report_id}",
        headers=headers,
    )
    assert get_del.status_code == 404


@pytest.mark.asyncio
async def test_gemini_adapter_report_normalization():
    from unittest.mock import AsyncMock, patch, MagicMock
    from projectpilot.ai.gemini_adapter import GeminiAdapter

    adapter = GeminiAdapter()
    adapter.api_key = "test_key"

    def make_mock_response(json_payload: str):
        mock_resp = MagicMock()
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json.return_value = {
            "candidates": [
                {
                    "content": {
                        "parts": [{"text": json_payload}]
                    }
                }
            ]
        }
        return mock_resp

    # Case 1: Gemini returns report key instead of content
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = make_mock_response('{"title": "Laporan Proyek", "report": "# Laporan Progres\\n\\nSemua selesai.", "summary": "Ringkasan"}')
        result = await adapter.generate_structured(prompt="test", capability="REPORT_WEEKLY_INTERNAL")
        assert result["content"] == "# Laporan Progres\n\nSemua selesai."
        assert result["title"] == "Laporan Proyek"

    # Case 2: Gemini returns sections dict
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = make_mock_response('{"title": "Laporan Proyek", "sections": {"ringkasan": "Aman", "kemajuan": "Selesai 100%"}, "summary": "Ringkasan"}')
        result = await adapter.generate_structured(prompt="test", capability="REPORT_WEEKLY_INTERNAL")
        assert "## Ringkasan\nAman" in result["content"]
        assert "## Kemajuan\nSelesai 100%" in result["content"]

    # Case 3: Gemini returns nested report object
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = make_mock_response('{"weekly_report": {"title": "Laporan Mingguan", "content": "# Mingguan\\n\\nBerjalan lancar.", "summary": "Semua on track."}}')
        result = await adapter.generate_structured(prompt="test", capability="REPORT_WEEKLY_INTERNAL")
        assert result["content"] == "# Mingguan\n\nBerjalan lancar."
        assert result["title"] == "Laporan Mingguan"
        assert result["summary"] == "Semua on track."


@pytest.mark.asyncio
async def test_report_evidence_resolver_status_partitioning(db_session):
    from sqlalchemy.ext.asyncio import AsyncSession
    from projectpilot.persistence.models.project import Project, ProjectLifecycleStage
    from projectpilot.persistence.models.client import Client
    from projectpilot.persistence.models.user import User, UserRole
    from projectpilot.persistence.models.issues_risks import (
        Issue,
        Blocker,
        Risk,
        ClientDependency,
        IssueStatus,
        BlockerStatus,
        RiskStatus,
        ClientDependencyStatus,
    )
    from projectpilot.persistence.models.report import ReportType
    from projectpilot.services.report_evidence_resolver import resolve_report_evidence

    # Create User
    user = User(
        email="testpm@test.com",
        password_hash="hashedpass",
        full_name="PM Tester",
        role=UserRole.PROJECT_MANAGER,
    )
    db_session.add(user)
    await db_session.flush()

    # Create Client & Project
    test_client = Client(name="Test Retail", company_name="PT Retail Test")
    db_session.add(test_client)
    await db_session.flush()

    project = Project(
        name="Lapaq Test Project",
        code="PRJ-LPQ-TEST",
        client_id=test_client.id,
        owner_id=user.id,
        lifecycle_stage=ProjectLifecycleStage.ACTIVE_DELIVERY,
    )
    db_session.add(project)
    await db_session.flush()

    # Create Issues (1 Resolved, 1 Open, 1 In Investigation)
    iss_res = Issue(
        project_id=project.id,
        key="ISS-01",
        title="SKU uniqueness constraint failed",
        severity="CRITICAL",
        status=IssueStatus.RESOLVED,
        resolution_notes="Fixed with DB lock and composite unique index",
    )
    iss_open = Issue(
        project_id=project.id,
        key="ISS-02",
        title="Checkout inventory race condition",
        severity="HIGH",
        status=IssueStatus.OPEN,
    )
    iss_inv = Issue(
        project_id=project.id,
        key="ISS-03",
        title="Webhook intermittent failure",
        severity="MEDIUM",
        status=IssueStatus.IN_INVESTIGATION,
    )

    # Create Blockers (1 Active, 1 Resolved)
    blk_act = Blocker(
        project_id=project.id,
        key="BLK-01",
        title="Waiting for payment gateway credentials",
        blocker_type="INTEGRATION",
        status=BlockerStatus.ACTIVE,
    )
    blk_res = Blocker(
        project_id=project.id,
        key="BLK-02",
        title="Staging network firewall blocked",
        blocker_type="TECHNICAL",
        status=BlockerStatus.RESOLVED,
        resolution_notes="Whitelist rule applied on AWS security group",
    )

    # Create Dependencies (1 Provided, 1 Requested)
    dep_prov = ClientDependency(
        project_id=project.id,
        key="DEP-01",
        title="Production Midtrans Sandbox Key",
        status=ClientDependencyStatus.PROVIDED,
        requested_date=date.today() - timedelta(days=20),
        expected_date=date.today() - timedelta(days=10),
        provided_date=date.today() - timedelta(days=12),
        receipt_notes="Key verified in staging",
    )
    dep_req = ClientDependency(
        project_id=project.id,
        key="DEP-02",
        title="Postal Code Master Data",
        status=ClientDependencyStatus.REQUESTED,
        requested_date=date.today() - timedelta(days=5),
        expected_date=date.today() + timedelta(days=5),
    )

    # Create Risks (1 Active, 1 Mitigated)
    rsk_act = Risk(
        project_id=project.id,
        key="RSK-01",
        title="Courier API rate limiting",
        probability="MEDIUM",
        impact="HIGH",
        status=RiskStatus.IDENTIFIED,
        mitigation_plan="Implement Redis caching for rates",
    )
    rsk_mit = Risk(
        project_id=project.id,
        key="RSK-02",
        title="Sandbox latency spike",
        probability="LOW",
        impact="MEDIUM",
        status=RiskStatus.MITIGATED,
        mitigation_plan="Implemented retry mechanism with exponential backoff",
    )

    db_session.add_all([
        iss_res, iss_open, iss_inv,
        blk_act, blk_res,
        dep_prov, dep_req,
        rsk_act, rsk_mit,
    ])
    await db_session.commit()

    # 1. Test Internal Report Evidence Resolution
    internal_res = await resolve_report_evidence(
        project_id=project.id,
        report_type=ReportType.WEEKLY_INTERNAL,
        start_date=date.today() - timedelta(days=7),
        end_date=date.today(),
        db=db_session,
    )
    int_ev_text = internal_res["evidence_text"]

    # Verify Blockers Partitioning
    assert "Active Blockers (1):" in int_ev_text
    assert "BLK-01" in int_ev_text
    assert "Resolved Blockers (1):" in int_ev_text
    assert "BLK-02" in int_ev_text
    assert "Whitelist rule applied on AWS security group" in int_ev_text

    # Verify Issues Partitioning
    assert "Unresolved / Open Issues (2):" in int_ev_text
    assert "ISS-02" in int_ev_text
    assert "ISS-03" in int_ev_text
    assert "Resolved / Closed Issues (1):" in int_ev_text
    assert "ISS-01" in int_ev_text
    assert "Fixed with DB lock and composite unique index" in int_ev_text

    # Critical check: ISS-01 and BLK-02 must NOT be in unresolved/active headers
    unresolved_section = int_ev_text.split("Unresolved / Open Issues (2):")[1].split("Resolved / Closed Issues")[0]
    assert "ISS-01" not in unresolved_section
    active_blk_section = int_ev_text.split("Active Blockers (1):")[1].split("Resolved Blockers")[0]
    assert "BLK-02" not in active_blk_section

    # Verify Risks
    assert "Active / Monitored Risks (1):" in int_ev_text
    assert "RSK-01" in int_ev_text
    assert "Mitigated / Closed Risks (1):" in int_ev_text
    assert "RSK-02" in int_ev_text

    # Verify Client Dependencies
    assert "Pending Dependencies (1):" in int_ev_text
    assert "DEP-02" in int_ev_text
    assert "Fulfilled / Provided Dependencies (1):" in int_ev_text
    assert "DEP-01" in int_ev_text

    # 2. Test Client-Facing Report Evidence Resolution
    client_res = await resolve_report_evidence(
        project_id=project.id,
        report_type=ReportType.WEEKLY_CLIENT,
        start_date=date.today() - timedelta(days=7),
        end_date=date.today(),
        db=db_session,
    )
    client_ev_text = client_res["evidence_text"]

    # Pending items must only contain DEP-02
    assert "Pending Client Action (1):" in client_ev_text
    assert "DEP-02" in client_ev_text
    client_pending_section = client_ev_text.split("Pending Client Action (1):")[1].split("Completed / Provided by Client")[0]
    assert "DEP-01" not in client_pending_section

    # Completed items must contain DEP-01
    assert "Completed / Provided by Client (1):" in client_ev_text
    assert "DEP-01" in client_ev_text

    # Confidential items must NOT appear in client report evidence
    assert "BLK-01" not in client_ev_text
    assert "ISS-01" not in client_ev_text
    assert "ISS-02" not in client_ev_text
    assert "RSK-01" not in client_ev_text

    # 3. Test Snapshots Integrity
    snapshots = internal_res["snapshots"]
    iss_res_snap = next(s for s in snapshots if s["evidence_entity_id"] == iss_res.id)
    assert iss_res_snap["evidence_snapshot"]["status"] == "RESOLVED"
    assert iss_res_snap["evidence_snapshot"]["resolution_notes"] == "Fixed with DB lock and composite unique index"

    blk_res_snap = next(s for s in snapshots if s["evidence_entity_id"] == blk_res.id)
    assert blk_res_snap["evidence_snapshot"]["status"] == "RESOLVED"
    assert blk_res_snap["evidence_snapshot"]["resolution_notes"] == "Whitelist rule applied on AWS security group"


@pytest.mark.asyncio
async def test_weekly_report_api_generation_status_accuracy(client: AsyncClient, db_session):
    from projectpilot.persistence.models.issues_risks import (
        Issue,
        Blocker,
        ClientDependency,
        IssueStatus,
        BlockerStatus,
        ClientDependencyStatus,
    )
    from projectpilot.persistence.database import async_session_factory
    from unittest.mock import patch, AsyncMock

    # 1. Register & Login PM
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "accuracy_pm@projectpilot.id",
            "password": "Password123!",
            "full_name": "Accuracy PM",
            "role": "PROJECT_MANAGER",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "accuracy_pm@projectpilot.id", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Client & Project
    c_res = await client.post(
        "/api/v1/clients",
        json={"name": "Retail Corp", "company_name": "PT Retail Corp"},
        headers=headers,
    )
    client_id = c_res.json()["id"]

    p_res = await client.post(
        "/api/v1/projects",
        json={
            "name": "Lapaq Status Accuracy Check",
            "code": "PRJ-LPQ-ACC",
            "client_id": client_id,
        },
        headers=headers,
    )
    project_id = p_res.json()["id"]

    # 3. Insert Issue (1 Resolved, 1 Open) and Blocker (1 Resolved, 1 Active) directly via db_session
    import uuid
    p_uuid = uuid.UUID(project_id)
    db_session.add(
        Issue(
            project_id=p_uuid,
            key="ISS-LPQ-01",
            title="SKU uniqueness constraint bug",
            severity="CRITICAL",
            status=IssueStatus.RESOLVED,
            resolution_notes="Resolved with composite index",
        )
    )
    db_session.add(
        Issue(
            project_id=p_uuid,
            key="ISS-LPQ-02",
            title="Checkout concurrency race",
            severity="HIGH",
            status=IssueStatus.OPEN,
        )
    )
    db_session.add(
        Blocker(
            project_id=p_uuid,
            key="BLK-LPQ-01",
            title="Firewall port 443 blocked",
            blocker_type="NETWORK",
            status=BlockerStatus.RESOLVED,
            resolution_notes="Port opened by SecOps",
        )
    )
    db_session.add(
        Blocker(
            project_id=p_uuid,
            key="BLK-LPQ-02",
            title="Pending Midtrans production secret key",
            blocker_type="CREDENTIALS",
            status=BlockerStatus.ACTIVE,
        )
    )
    await db_session.commit()

    # 4. Generate Weekly Report Draft
    today = date.today()
    last_week = today - timedelta(days=7)

    gen_res = await client.post(
        f"/api/v1/projects/{project_id}/reports/generate-draft",
        json={
            "report_type": "WEEKLY_INTERNAL",
            "reporting_period_start": last_week.isoformat(),
            "reporting_period_end": today.isoformat(),
        },
        headers=headers,
    )
    assert gen_res.status_code == 201
    data = gen_res.json()

    # Check that evidences were saved with accurate statuses
    evidences = data["evidences"]
    iss_evs = [e for e in evidences if e["evidence_type"] == "ISSUE"]
    assert len(iss_evs) == 2
    iss_01 = next(e for e in iss_evs if e["evidence_snapshot"]["key"] == "ISS-LPQ-01")
    assert iss_01["evidence_snapshot"]["status"] == "RESOLVED"
    assert iss_01["evidence_snapshot"]["resolution_notes"] == "Resolved with composite index"

    iss_02 = next(e for e in iss_evs if e["evidence_snapshot"]["key"] == "ISS-LPQ-02")
    assert iss_02["evidence_snapshot"]["status"] == "OPEN"

    blk_evs = [e for e in evidences if e["evidence_type"] == "BLOCKER"]
    assert len(blk_evs) == 2
    blk_01 = next(e for e in blk_evs if e["evidence_snapshot"]["key"] == "BLK-LPQ-01")
    assert blk_01["evidence_snapshot"]["status"] == "RESOLVED"
    assert blk_01["evidence_snapshot"]["resolution_notes"] == "Port opened by SecOps"

    blk_02 = next(e for e in blk_evs if e["evidence_snapshot"]["key"] == "BLK-LPQ-02")
    assert blk_02["evidence_snapshot"]["status"] == "ACTIVE"




