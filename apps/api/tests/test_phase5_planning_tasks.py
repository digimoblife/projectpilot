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

    # 10. Create second task for reorder testing
    task2_res = await client.post(
        f"/api/v1/projects/{project_id}/tasks",
        json={
            "key": "TSK-002",
            "title": "Setup Logging Infrastructure",
            "priority": "LOW",
            "order_index": 1,
        },
        headers=headers,
    )
    assert task2_res.status_code == 201
    task2_id = task2_res.json()["id"]

    # Reorder tasks: swap order_index
    reorder_res = await client.patch(
        f"/api/v1/projects/{project_id}/tasks/reorder",
        json={
            "items": [
                {"id": task2_id, "order_index": 0},
                {"id": task_id, "order_index": 1},
            ]
        },
        headers=headers,
    )
    assert reorder_res.status_code == 200

    # Verify task order from GET /tasks
    tasks_list_res = await client.get(f"/api/v1/projects/{project_id}/tasks", headers=headers)
    assert tasks_list_res.status_code == 200
    items = tasks_list_res.json()
    assert items[0]["id"] == task2_id
    assert items[0]["order_index"] == 0

    # 11. Archive Task
    archive_res = await client.post(
        f"/api/v1/projects/{project_id}/tasks/{task2_id}/archive",
        headers=headers,
    )
    assert archive_res.status_code == 200
    assert archive_res.json()["is_archived"] is True
    assert archive_res.json()["archived_at"] is not None

    # Verify task2 is excluded from normal list
    active_tasks = await client.get(f"/api/v1/projects/{project_id}/tasks", headers=headers)
    active_ids = [t["id"] for t in active_tasks.json()]
    assert task2_id not in active_ids

    # Verify task2 is present in archived list
    archived_tasks = await client.get(
        f"/api/v1/projects/{project_id}/tasks?archived_only=true",
        headers=headers,
    )
    archived_ids = [t["id"] for t in archived_tasks.json()]
    assert task2_id in archived_ids

    # 12. Restore Task
    restore_res = await client.post(
        f"/api/v1/projects/{project_id}/tasks/{task2_id}/restore",
        headers=headers,
    )
    assert restore_res.status_code == 200
    assert restore_res.json()["is_archived"] is False
    assert restore_res.json()["archived_at"] is None

    # Verify task2 is back in active list
    restored_tasks = await client.get(f"/api/v1/projects/{project_id}/tasks", headers=headers)
    restored_ids = [t["id"] for t in restored_tasks.json()]
    assert task2_id in restored_ids

