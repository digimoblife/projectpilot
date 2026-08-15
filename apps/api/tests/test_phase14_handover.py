import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_handover_and_project_completion_lifecycle(client: AsyncClient):
    # 1. Register & Login PM
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "handoverpm@projectpilot.id",
            "password": "Password123!",
            "full_name": "Handover PM Lead",
            "role": "PROJECT_MANAGER",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "handoverpm@projectpilot.id", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Client & Project
    c_res = await client.post(
        "/api/v1/clients",
        json={"name": "Logistics Corp", "company_name": "PT Logistik Prima"},
        headers=headers,
    )
    client_id = c_res.json()["id"]

    p_res = await client.post(
        "/api/v1/projects",
        json={
            "name": "Fleet Tracking System",
            "code": "PRJ-FLEET-01",
            "client_id": client_id,
        },
        headers=headers,
    )
    project_id = p_res.json()["id"]

    # 3. Fetch Handover Workspace (lazy init)
    ho_res = await client.get(f"/api/v1/projects/{project_id}/handover", headers=headers)
    assert ho_res.status_code == 200
    ho_data = ho_res.json()
    assert ho_data["status"] == "NOT_STARTED"
    assert len(ho_data["items"]) >= 8

    # 4. Start Handover Preparation
    status_res = await client.put(
        f"/api/v1/projects/{project_id}/handover/status",
        json={"target_status": "IN_PREPARATION", "notes": "Memulai persiapan serah terima modul fleet."},
        headers=headers,
    )
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "IN_PREPARATION"
    assert status_res.json()["started_at"] is not None

    # 5. Attempt Completion while items are pending -> Expect 400
    early_comp = await client.post(f"/api/v1/projects/{project_id}/handover/complete", headers=headers)
    assert early_comp.status_code == 400

    # 6. Add an active Blocker
    blocker_res = await client.post(
        f"/api/v1/projects/{project_id}/blockers",
        json={"key": "BLK-001", "title": "IP Whitelist Staging Belum Terbuka", "description": "Menahan validasi UAT"},
        headers=headers,
    )
    assert blocker_res.status_code == 201
    blocker_id = blocker_res.json()["id"]

    # 7. Complete / Waive all mandatory checklist items
    for item in ho_data["items"]:
        item_id = item["id"]
        if item["required"]:
            if item["item_type"] == "SOURCE_CODE":
                # Waive one item with explicit reason
                w_res = await client.put(
                    f"/api/v1/projects/{project_id}/handover/items/{item_id}",
                    json={"status": "WAIVED", "waiver_reason": "Klien menggunakan private repository internal mereka."},
                    headers=headers,
                )
                assert w_res.status_code == 200
            else:
                c_res = await client.put(
                    f"/api/v1/projects/{project_id}/handover/items/{item_id}",
                    json={"status": "COMPLETED"},
                    headers=headers,
                )
                assert c_res.status_code == 200

    # 8. Attempt completion with active blocker -> Expect 400
    comp_with_blocker = await client.post(f"/api/v1/projects/{project_id}/handover/complete", headers=headers)
    assert comp_with_blocker.status_code == 400

    # 9. Resolve the Blocker
    res_b = await client.post(
        f"/api/v1/projects/{project_id}/blockers/{blocker_id}/status",
        json={"target_status": "RESOLVED", "resolution_notes": "IP Whitelist telah dibuka oleh tim TI klien."},
        headers=headers,
    )
    assert res_b.status_code == 200

    # 10. Check Gate Status
    gate_res = await client.get(f"/api/v1/projects/{project_id}/handover/gate-status", headers=headers)
    assert gate_res.status_code == 200
    assert gate_res.json()["is_eligible"] is True

    # 11. Execute Formal Handover Completion Gate
    comp_res = await client.post(f"/api/v1/projects/{project_id}/handover/complete", headers=headers)
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "COMPLETED"
    assert comp_res.json()["completed_at"] is not None

    # 12. Verify Project lifecycle_stage is COMPLETED
    proj_res = await client.get(f"/api/v1/projects/{project_id}", headers=headers)
    assert proj_res.status_code == 200
    assert proj_res.json()["lifecycle_stage"] == "COMPLETED"
    assert proj_res.json()["actual_completion_date"] is not None
