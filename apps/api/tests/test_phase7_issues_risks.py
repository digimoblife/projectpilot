import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_issues_risks_blockers_and_dependencies_workflow(client: AsyncClient):
    # 1. Register & Login PM
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "riskpm@projectpilot.id",
            "password": "Password123!",
            "full_name": "Risk & Issue Master PM",
            "role": "PROJECT_MANAGER",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "riskpm@projectpilot.id", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Client & Project
    c_res = await client.post(
        "/api/v1/clients",
        json={"name": "Klinik Sehat", "company_name": "PT Klinik Sehat Sentosa"},
        headers=headers,
    )
    client_id = c_res.json()["id"]

    p_res = await client.post(
        "/api/v1/projects",
        json={
            "name": "E-Prescription System",
            "code": "PRJ-RX-01",
            "client_id": client_id,
        },
        headers=headers,
    )
    project_id = p_res.json()["id"]

    # 3. Create Issue & Resolve
    issue_res = await client.post(
        f"/api/v1/projects/{project_id}/issues",
        json={
            "key": "ISS-001",
            "title": "Bug sinkronisasi resep BPJS gagal format XML",
            "description": "Respons HTTP 500 saat mengirim payload klaim BPJS.",
            "severity": "HIGH",
        },
        headers=headers,
    )
    assert issue_res.status_code == 201
    issue_id = issue_res.json()["id"]
    assert issue_res.json()["status"] == "OPEN"

    resolve_issue = await client.post(
        f"/api/v1/projects/{project_id}/issues/{issue_id}/status",
        json={"target_status": "RESOLVED", "resolution_notes": "Memperbaiki namespace XML tag BPJS v2."},
        headers=headers,
    )
    assert resolve_issue.status_code == 200
    assert resolve_issue.json()["status"] == "RESOLVED"
    assert resolve_issue.json()["resolved_at"] is not None

    # 4. Create Risk & Materialize into Issue
    risk_res = await client.post(
        f"/api/v1/projects/{project_id}/risks",
        json={
            "key": "RSK-001",
            "title": "Keterlambatan sertifikasi bridging SatuSehat Kemenkes",
            "description": "Proses sandbox SatuSehat memakan waktu hingga 4 minggu.",
            "probability": "HIGH",
            "impact": "HIGH",
            "mitigation_plan": "Kirim permohonan sertifikasi di awal sprint 1.",
        },
        headers=headers,
    )
    assert risk_res.status_code == 201
    risk_id = risk_res.json()["id"]
    assert risk_res.json()["status"] == "IDENTIFIED"

    # Materialize Risk -> Issue
    mat_res = await client.post(
        f"/api/v1/projects/{project_id}/risks/{risk_id}/materialize",
        headers=headers,
    )
    assert mat_res.status_code == 200
    mat_issue = mat_res.json()
    assert "[Materialized]" in mat_issue["title"]
    assert mat_issue["severity"] == "CRITICAL"
    assert mat_issue["source_risk_id"] == risk_id

    # Verify Risk is now MATERIALIZED
    risks_list = await client.get(f"/api/v1/projects/{project_id}/risks", headers=headers)
    risk_item = next(r for r in risks_list.json() if r["id"] == risk_id)
    assert risk_item["status"] == "MATERIALIZED"
    assert risk_item["materialized_issue_id"] == mat_issue["id"]

    # 5. Create Task and Link Blocker
    task_res = await client.post(
        f"/api/v1/projects/{project_id}/tasks",
        json={"key": "TSK-001", "title": "Modul Cetak Surat Kontrol"},
        headers=headers,
    )
    task_id = task_res.json()["id"]

    blocker_res = await client.post(
        f"/api/v1/projects/{project_id}/blockers",
        json={
            "key": "BLK-001",
            "task_id": task_id,
            "title": "Template PDF Surat Kontrol belum disetujui RS",
            "blocker_type": "CLIENT_DEPENDENCY",
        },
        headers=headers,
    )
    assert blocker_res.status_code == 201
    blk_id = blocker_res.json()["id"]

    # Verify Task is automatically marked BLOCKED
    task_check = await client.get(f"/api/v1/projects/{project_id}/tasks/{task_id}", headers=headers)
    assert task_check.json()["status"] == "BLOCKED"
    assert "BLK-001" in task_check.json()["blocker_reason"]

    # Resolve Blocker
    blk_resolve = await client.post(
        f"/api/v1/projects/{project_id}/blockers/{blk_id}/status",
        json={"target_status": "RESOLVED", "resolution_notes": "Template resmi telah ditandatangani."},
        headers=headers,
    )
    assert blk_resolve.status_code == 200
    assert blk_resolve.json()["status"] == "RESOLVED"

    # 6. Create Client Dependency (Waiting Matrix)
    dep_res = await client.post(
        f"/api/v1/projects/{project_id}/client-dependencies",
        json={
            "key": "CDP-001",
            "title": "API Secret Key & Kredensial Database SIMRS",
            "dependency_type": "CREDENTIALS",
            "requested_date": "2026-10-01",
            "expected_date": "2026-10-08",
            "impact_summary": "Pengerjaan ETL sinkronisasi resep terhenti tanpa akses DB.",
        },
        headers=headers,
    )
    assert dep_res.status_code == 201
    dep_id = dep_res.json()["id"]
    assert dep_res.json()["status"] == "REQUESTED"

    # Mark as Provided
    dep_provided = await client.post(
        f"/api/v1/projects/{project_id}/client-dependencies/{dep_id}/status",
        json={"target_status": "PROVIDED", "provided_date": "2026-10-06"},
        headers=headers,
    )
    assert dep_provided.status_code == 200
    assert dep_provided.json()["status"] == "PROVIDED"
    assert dep_provided.json()["waiting_days"] == 5
