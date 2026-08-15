import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_planning_and_kanban_task_workflow(client: AsyncClient):
    # 1. Register & Login PM
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "kanbanpm@projectpilot.id",
            "password": "Password123!",
            "full_name": "Kanban Master PM",
            "role": "PROJECT_MANAGER",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "kanbanpm@projectpilot.id", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Client, Project, and Requirement
    c_res = await client.post(
        "/api/v1/clients",
        json={"name": "Fintech Prima", "company_name": "PT Fintech Prima Indonesia"},
        headers=headers,
    )
    client_id = c_res.json()["id"]

    p_res = await client.post(
        "/api/v1/projects",
        json={
            "name": "Micro-Lending App",
            "code": "PRJ-LND-01",
            "client_id": client_id,
        },
        headers=headers,
    )
    project_id = p_res.json()["id"]

    req_res = await client.post(
        f"/api/v1/projects/{project_id}/requirements",
        json={
            "key": "REQ-LND-001",
            "title": "KYC Automated Verification",
            "description": "Verifikasi KTP dan Liveness check biometrik pengguna.",
            "category": "SECURITY",
        },
        headers=headers,
    )
    req_id = req_res.json()["id"]

    # 3. Create Epic & Feature
    epic_res = await client.post(
        f"/api/v1/projects/{project_id}/epics",
        json={
            "key": "EPC-001",
            "title": "Onboarding & KYC",
            "description": "Alur pendaftaran nasabah dan verifikasi identitas.",
        },
        headers=headers,
    )
    assert epic_res.status_code == 201
    epic_id = epic_res.json()["id"]

    feat_res = await client.post(
        f"/api/v1/projects/{project_id}/features",
        json={
            "key": "FEAT-001",
            "epic_id": epic_id,
            "requirement_id": req_id,
            "title": "OCR KTP & Dukcapil Matcher",
            "description": "Ekstraksi NIK dan pencocokan data ke Dukcapil.",
        },
        headers=headers,
    )
    assert feat_res.status_code == 201
    feat_id = feat_res.json()["id"]

    # 4. Create Task
    task_res = await client.post(
        f"/api/v1/projects/{project_id}/tasks",
        json={
            "key": "TSK-001",
            "epic_id": epic_id,
            "feature_id": feat_id,
            "requirement_id": req_id,
            "title": "Integrasi SDK OCR Scanner",
            "description": "Pasang SDK kamera OCR di aplikasi Android & iOS.",
            "priority": "HIGH",
            "estimated_hours": 16.0,
            "assignee_name": "Rizky (Mobile Dev)",
            "due_date": "2026-11-15",
        },
        headers=headers,
    )
    assert task_res.status_code == 201
    task_data = task_res.json()
    task_id = task_data["id"]
    assert task_data["status"] == "BACKLOG"

    # 5. Invalid Transition: BACKLOG -> DONE (Must fail with 422)
    inv_res = await client.post(
        f"/api/v1/projects/{project_id}/tasks/{task_id}/status",
        json={"target_status": "DONE"},
        headers=headers,
    )
    assert inv_res.status_code == 422

    # 6. Progression: BACKLOG -> READY -> IN_PROGRESS
    for st in ["READY", "IN_PROGRESS"]:
        st_res = await client.post(
            f"/api/v1/projects/{project_id}/tasks/{task_id}/status",
            json={"target_status": st},
            headers=headers,
        )
        assert st_res.status_code == 200
        assert st_res.json()["status"] == st

    # 7. Test BLOCKED without reason (Must fail with 422)
    block_fail = await client.post(
        f"/api/v1/projects/{project_id}/tasks/{task_id}/status",
        json={"target_status": "BLOCKED"},
        headers=headers,
    )
    assert block_fail.status_code == 422

    # Test BLOCKED with valid reason
    block_ok = await client.post(
        f"/api/v1/projects/{project_id}/tasks/{task_id}/status",
        json={
            "target_status": "BLOCKED",
            "blocker_reason": "Menunggu kredensial API sandbox dari vendor Dukcapil.",
        },
        headers=headers,
    )
    assert block_ok.status_code == 200
    assert block_ok.json()["status"] == "BLOCKED"
    assert "Dukcapil" in block_ok.json()["blocker_reason"]

    # 8. Unblock: BLOCKED -> IN_PROGRESS -> IN_REVIEW -> QA -> DONE
    for st in ["IN_PROGRESS", "IN_REVIEW", "QA", "DONE"]:
        st_res = await client.post(
            f"/api/v1/projects/{project_id}/tasks/{task_id}/status",
            json={"target_status": st},
            headers=headers,
        )
        assert st_res.status_code == 200
        assert st_res.json()["status"] == st

    # Verify task is DONE and blocker_reason is cleared
    task_done = await client.get(f"/api/v1/projects/{project_id}/tasks/{task_id}", headers=headers)
    assert task_done.json()["status"] == "DONE"
    assert task_done.json()["blocker_reason"] is None

    # 9. Reopening: DONE -> IN_PROGRESS
    reopen_res = await client.post(
        f"/api/v1/projects/{project_id}/tasks/{task_id}/status",
        json={"target_status": "IN_PROGRESS"},
        headers=headers,
    )
    assert reopen_res.status_code == 200
    assert reopen_res.json()["status"] == "IN_PROGRESS"
