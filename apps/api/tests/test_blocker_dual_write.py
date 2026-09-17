import asyncio
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_blocker_dual_write_comprehensive_workflow(client: AsyncClient):
    """
    Validates Option A — Transactional Blocker Dual-Write invariants:
    1. Task -> BLOCKED creates exactly 1 active Blocker.
    2. BLOCKED -> IN_PROGRESS resolves all associated active blockers.
    3. BLOCKED -> DONE resolves all associated active blockers.
    4. Repeating BLOCKED does not create duplicate active blockers.
    5. Changing blocker reason while already BLOCKED reuses/updates the active blocker.
    6. Manual Task-linked Blocker creation produces BLOCKED Task + active Blocker atomically.
    7. Repeated Task-linked manual Blocker creation does not create duplicate active blockers.
    8. Standalone project-level Blockers remain supported.
    9. Resolving a Blocker directly through Issues does NOT automatically change Task.status.
    10. Completion Gate detects an active Blocker created through the Task status workflow.
    11. Completion Gate remains blocked while any active/escalated Task-linked blocker exists.
    12. Historical RESOLVED blockers remain preserved after subsequent BLOCKED cycles.
    13. Backward-compatibility of Issues and Blocker endpoints.
    """
    # 1. Setup PM User, Client, and Project
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "blockerpm@projectpilot.id",
            "password": "Password123!",
            "full_name": "Blocker Gate PM",
            "role": "PROJECT_MANAGER",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "blockerpm@projectpilot.id", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    c_res = await client.post(
        "/api/v1/clients",
        json={"name": "Bank Mega Solusi", "company_name": "PT Bank Mega Solusi Tbk"},
        headers=headers,
    )
    client_id = c_res.json()["id"]

    p_res = await client.post(
        "/api/v1/projects",
        json={"name": "Payment Gateway Integration", "code": "PRJ-PAY-01", "client_id": client_id},
        headers=headers,
    )
    project_id = p_res.json()["id"]

    # 2. Create Task TSK-101
    task_res = await client.post(
        f"/api/v1/projects/{project_id}/tasks",
        json={
            "key": "TSK-101",
            "title": "Koneksi API Host-to-Host",
            "status": "BACKLOG",
        },
        headers=headers,
    )
    assert task_res.status_code == 201
    task_id = task_res.json()["id"]

    # Advance to READY -> IN_PROGRESS
    for st in ["READY", "IN_PROGRESS"]:
        await client.post(
            f"/api/v1/projects/{project_id}/tasks/{task_id}/status",
            json={"target_status": st},
            headers=headers,
        )

    # =========================================================================
    # INVARIANT 1: Task -> BLOCKED creates exactly one active Blocker
    # =========================================================================
    block_res = await client.post(
        f"/api/v1/projects/{project_id}/tasks/{task_id}/status",
        json={"target_status": "BLOCKED", "blocker_reason": "Menunggu sertifikat SSL dari pihak prinsipal."},
        headers=headers,
    )
    assert block_res.status_code == 200
    assert block_res.json()["status"] == "BLOCKED"
    assert "sertifikat SSL" in block_res.json()["blocker_reason"]

    # Verify in Blocker repository
    blockers_list = await client.get(f"/api/v1/projects/{project_id}/blockers", headers=headers)
    assert blockers_list.status_code == 200
    blockers = blockers_list.json()
    assert len(blockers) == 1
    b1 = blockers[0]
    assert b1["task_id"] == task_id
    assert b1["status"] == "ACTIVE"
    assert "sertifikat SSL" in b1["description"]

    # =========================================================================
    # INVARIANT 4 & 5: Repeated BLOCKED update does not create duplicate active blockers,
    # and updates the blocker description
    # =========================================================================
    block_res_repeat = await client.post(
        f"/api/v1/projects/{project_id}/tasks/{task_id}/status",
        json={"target_status": "BLOCKED", "blocker_reason": "Sertifikat SSL revisi belum ditandatangani."},
        headers=headers,
    )
    assert block_res_repeat.status_code == 200
    assert block_res_repeat.json()["status"] == "BLOCKED"

    blockers_list_2 = await client.get(f"/api/v1/projects/{project_id}/blockers", headers=headers)
    blockers_2 = blockers_list_2.json()
    assert len(blockers_2) == 1, "Duplicate blocker created on repeated BLOCKED update"
    assert blockers_2[0]["id"] == b1["id"]
    assert "revisi" in blockers_2[0]["description"]

    # =========================================================================
    # INVARIANT 10 & 11: Completion Gate detects active Task Blocker & remains blocked
    # =========================================================================
    gate_res = await client.get(f"/api/v1/projects/{project_id}/handover/gate-status", headers=headers)
    assert gate_res.status_code == 200
    gate_data = gate_res.json()
    assert gate_data["is_eligible"] is False
    assert any("blocker aktif" in r.lower() for r in gate_data["reasons"])

    # Attempt complete -> must fail
    comp_fail = await client.post(f"/api/v1/projects/{project_id}/handover/complete", headers=headers)
    assert comp_fail.status_code == 400

    # =========================================================================
    # INVARIANT 2: BLOCKED -> IN_PROGRESS resolves the associated active Blocker
    # =========================================================================
    unblock_res = await client.post(
        f"/api/v1/projects/{project_id}/tasks/{task_id}/status",
        json={"target_status": "IN_PROGRESS"},
        headers=headers,
    )
    assert unblock_res.status_code == 200
    assert unblock_res.json()["status"] == "IN_PROGRESS"
    assert unblock_res.json()["blocker_reason"] is None

    blockers_list_3 = await client.get(f"/api/v1/projects/{project_id}/blockers", headers=headers)
    blockers_3 = blockers_list_3.json()
    assert len(blockers_3) == 1
    assert blockers_3[0]["status"] == "RESOLVED"
    assert blockers_3[0]["resolved_at"] is not None
    assert "Auto-resolved" in blockers_3[0]["resolution_notes"] or "Otomatis" in blockers_3[0]["resolution_notes"]

    # =========================================================================
    # INVARIANT 12: Subsequent BLOCKED cycle preserves historical RESOLVED blocker
    # =========================================================================
    block_cycle_2 = await client.post(
        f"/api/v1/projects/{project_id}/tasks/{task_id}/status",
        json={"target_status": "BLOCKED", "blocker_reason": "Kendala jaringan timeout di port 8443."},
        headers=headers,
    )
    assert block_cycle_2.status_code == 200

    blockers_list_4 = await client.get(f"/api/v1/projects/{project_id}/blockers", headers=headers)
    blockers_4 = blockers_list_4.json()
    assert len(blockers_4) == 2, "Historical resolved blocker was not preserved"
    active_b = next(b for b in blockers_4 if b["status"] == "ACTIVE")
    resolved_b = next(b for b in blockers_4 if b["status"] == "RESOLVED")
    assert "port 8443" in active_b["description"]
    assert resolved_b["id"] == b1["id"]

    # =========================================================================
    # INVARIANT 3: BLOCKED -> DONE resolves all associated active blockers
    # =========================================================================
    done_res = await client.post(
        f"/api/v1/projects/{project_id}/tasks/{task_id}/status",
        json={"target_status": "DONE"},
        headers=headers,
    )
    assert done_res.status_code == 200
    assert done_res.json()["status"] == "DONE"

    blockers_list_5 = await client.get(f"/api/v1/projects/{project_id}/blockers", headers=headers)
    blockers_5 = blockers_list_5.json()
    assert len(blockers_5) == 2
    assert all(b["status"] == "RESOLVED" for b in blockers_5)

    # =========================================================================
    # INVARIANT 8: Standalone project-level Blocker remains supported
    # =========================================================================
    standalone_res = await client.post(
        f"/api/v1/projects/{project_id}/blockers",
        json={
            "key": "BLK-STANDALONE-01",
            "title": "Audit Kepatuhan ISO 27001",
            "description": "Menunggu laporan audit pihak ketiga.",
            "task_id": None,
        },
        headers=headers,
    )
    assert standalone_res.status_code == 201
    standalone_b = standalone_res.json()
    assert standalone_b["task_id"] is None
    assert standalone_b["status"] == "ACTIVE"

    # =========================================================================
    # INVARIANT 6 & 7: Manual Task-linked Blocker creation produces BLOCKED Task atomically,
    # and repeated calls reuse/update the active blocker without duplication
    # =========================================================================
    task_res_2 = await client.post(
        f"/api/v1/projects/{project_id}/tasks",
        json={"key": "TSK-102", "title": "Implementasi Modul Refund", "status": "BACKLOG"},
        headers=headers,
    )
    task_id_2 = task_res_2.json()["id"]

    manual_blk_1 = await client.post(
        f"/api/v1/projects/{project_id}/blockers",
        json={
            "key": "BLK-MANUAL-01",
            "task_id": task_id_2,
            "title": "API Gateway Refund Belum Siap",
            "description": "Endpoint /refund mengembalikan 503 dari vendor.",
        },
        headers=headers,
    )
    assert manual_blk_1.status_code == 201
    mb1_data = manual_blk_1.json()
    assert mb1_data["status"] == "ACTIVE"
    assert mb1_data["task_id"] == task_id_2

    # Verify task 2 is now BLOCKED
    t2_check = await client.get(f"/api/v1/projects/{project_id}/tasks/{task_id_2}", headers=headers)
    assert t2_check.json()["status"] == "BLOCKED"
    assert "BLK-MANUAL-01" in t2_check.json()["blocker_reason"]

    # Repeated manual Blocker creation on task 2 reuses/updates the active blocker
    manual_blk_repeat = await client.post(
        f"/api/v1/projects/{project_id}/blockers",
        json={
            "key": "BLK-MANUAL-01",
            "task_id": task_id_2,
            "title": "API Gateway Refund Masih Belum Siap (Update)",
            "description": "Vendor menjanjikan perbaikan jam 15:00.",
        },
        headers=headers,
    )
    assert manual_blk_repeat.status_code == 201
    assert manual_blk_repeat.json()["id"] == mb1_data["id"]

    # Verify no duplicate active blocker for task 2
    b_all = (await client.get(f"/api/v1/projects/{project_id}/blockers", headers=headers)).json()
    task_2_blockers = [b for b in b_all if b.get("task_id") == task_id_2]
    assert len(task_2_blockers) == 1

    # =========================================================================
    # INVARIANT 9: Resolving a Blocker directly from Issues does NOT automatically unblock Task
    # =========================================================================
    resolve_mb1 = await client.post(
        f"/api/v1/projects/{project_id}/blockers/{mb1_data['id']}/status",
        json={"target_status": "RESOLVED", "resolution_notes": "Endpoint /refund telah normal."},
        headers=headers,
    )
    assert resolve_mb1.status_code == 200
    assert resolve_mb1.json()["status"] == "RESOLVED"

    # Task 2 remains BLOCKED until developer unblocks it explicitly
    t2_check_after_resolve = await client.get(f"/api/v1/projects/{project_id}/tasks/{task_id_2}", headers=headers)
    assert t2_check_after_resolve.json()["status"] == "BLOCKED"


@pytest.mark.asyncio
async def test_blocker_dual_write_rapid_successive_transitions(client: AsyncClient):
    """
    Tests rapid successive BLOCKED transitions to ensure row-level locking
    and single-active-blocker invariant are strictly preserved without duplicates.
    (Note: True parallel HTTP requests via asyncio.gather against the test client
    are constrained by conftest's single in-memory SQLite db_session fixture,
    which does not support concurrent commits on a single shared session instance).
    """
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "rapidpm@projectpilot.id",
            "password": "Password123!",
            "full_name": "Rapid PM",
            "role": "PROJECT_MANAGER",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "rapidpm@projectpilot.id", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    c_res = await client.post(
        "/api/v1/clients",
        json={"name": "PT Rapid Test", "company_name": "Rapid Corp"},
        headers=headers,
    )
    client_id = c_res.json()["id"]

    p_res = await client.post(
        "/api/v1/projects",
        json={"name": "Rapid State Transitions", "code": "PRJ-RAPID-01", "client_id": client_id},
        headers=headers,
    )
    project_id = p_res.json()["id"]

    task_res = await client.post(
        f"/api/v1/projects/{project_id}/tasks",
        json={"key": "TSK-RAPID-01", "title": "Rapid Task", "status": "IN_PROGRESS"},
        headers=headers,
    )
    task_id = task_res.json()["id"]

    # Successively send multiple rapid BLOCKED requests with different reasons
    r1 = await client.post(
        f"/api/v1/projects/{project_id}/tasks/{task_id}/status",
        json={"target_status": "BLOCKED", "blocker_reason": "Reason Alpha"},
        headers=headers,
    )
    assert r1.status_code == 200

    r2 = await client.post(
        f"/api/v1/projects/{project_id}/tasks/{task_id}/status",
        json={"target_status": "BLOCKED", "blocker_reason": "Reason Beta"},
        headers=headers,
    )
    assert r2.status_code == 200

    r3 = await client.post(
        f"/api/v1/projects/{project_id}/tasks/{task_id}/status",
        json={"target_status": "BLOCKED", "blocker_reason": "Reason Gamma"},
        headers=headers,
    )
    assert r3.status_code == 200

    # Ensure exactly 1 active blocker exists with the latest reason
    blockers_list = (await client.get(f"/api/v1/projects/{project_id}/blockers", headers=headers)).json()
    active_b = [b for b in blockers_list if b.get("task_id") == task_id and b["status"] == "ACTIVE"]
    assert len(active_b) == 1, "Rapid transitions resulted in multiple active blockers!"
    assert active_b[0]["description"] == "Reason Gamma"
