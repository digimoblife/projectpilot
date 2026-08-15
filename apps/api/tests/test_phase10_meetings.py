import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_meeting_management_ai_analysis_and_action_item_conversion(client: AsyncClient):
    # 1. Register & Login PM
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "meetingpm@projectpilot.id",
            "password": "Password123!",
            "full_name": "Meeting PM Lead",
            "role": "PROJECT_MANAGER",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "meetingpm@projectpilot.id", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Client & Project
    c_res = await client.post(
        "/api/v1/clients",
        json={"name": "Fintech Solutions", "company_name": "PT Fintech Indonesia"},
        headers=headers,
    )
    client_id = c_res.json()["id"]

    p_res = await client.post(
        "/api/v1/projects",
        json={
            "name": "Payment Gateway Integration",
            "code": "PRJ-PAY-01",
            "client_id": client_id,
        },
        headers=headers,
    )
    project_id = p_res.json()["id"]

    # Create Epic & Feature for task conversion
    epic_res = await client.post(
        f"/api/v1/projects/{project_id}/epics",
        json={"key": "EPC-001", "title": "Core Payment Engine", "description": "Payment modules"},
        headers=headers,
    )
    epic_id = epic_res.json()["id"]

    feat_res = await client.post(
        f"/api/v1/projects/{project_id}/features",
        json={"key": "FTR-001", "epic_id": epic_id, "title": "QRIS Dinamis Checkout", "description": "Checkout module"},
        headers=headers,
    )
    feature_id = feat_res.json()["id"]

    # 3. Create Meeting with Participants and Notes
    mtg_res = await client.post(
        f"/api/v1/projects/{project_id}/meetings",
        json={
            "title": "Kickoff & Architecture Review",
            "meeting_type": "KICKOFF",
            "notes": "Membahas integrasi QRIS dinamis dan webhook callback perbankan. Target sandbox API key minggu depan.",
            "participants": [
                {"participant_type": "INTERNAL", "display_name_snapshot": "Tech Lead", "role_snapshot": "Architect"},
                {"participant_type": "CLIENT", "display_name_snapshot": "Bpk Hendra", "role_snapshot": "VP Product"},
            ],
        },
        headers=headers,
    )
    assert mtg_res.status_code == 201
    mtg_data = mtg_res.json()
    meeting_id = mtg_data["id"]
    assert mtg_data["meeting_key"] == "MTG-001"
    assert len(mtg_data["participants"]) == 2

    # 4. Trigger AI Meeting Analysis
    ai_res = await client.post(
        f"/api/v1/projects/{project_id}/meetings/{meeting_id}/analyze-ai",
        headers=headers,
    )
    assert ai_res.status_code == 200
    ai_data = ai_res.json()
    assert ai_data["capability"] == "MEETING_ANALYSIS"
    assert "decisions" in ai_data["suggested_data"]
    assert "action_items" in ai_data["suggested_data"]

    # 5. Create Action Item manually
    action_res = await client.post(
        f"/api/v1/projects/{project_id}/meetings/{meeting_id}/action-items",
        json={
            "title": "Minta API staging credentials ke vendor",
            "description": "Email tim vendor perbankan untuk token sandbox.",
            "owner_name": "Tech Lead",
        },
        headers=headers,
    )
    assert action_res.status_code == 201
    action_item_id = action_res.json()["id"]
    assert action_res.json()["status"] == "OPEN"

    # 6. Convert Action Item -> Task
    convert_task_res = await client.post(
        f"/api/v1/projects/{project_id}/meetings/{meeting_id}/action-items/{action_item_id}/convert",
        json={"target_entity": "TASK", "feature_id": feature_id},
        headers=headers,
    )
    assert convert_task_res.status_code == 200
    converted_data = convert_task_res.json()
    assert converted_data["status"] == "CONVERTED"
    assert converted_data["converted_entity_type"] == "TASK"
    assert converted_data["converted_entity_id"] is not None

    # Verify task was created
    tasks_res = await client.get(f"/api/v1/projects/{project_id}/tasks", headers=headers)
    assert tasks_res.status_code == 200
    assert len(tasks_res.json()) >= 1

    # 7. Create another Action Item and convert to Client Dependency
    dep_action_res = await client.post(
        f"/api/v1/projects/{project_id}/meetings/{meeting_id}/action-items",
        json={
            "title": "Menunggu konfirmasi IP Whitelist dari Klien",
            "owner_name": "Bpk Hendra",
        },
        headers=headers,
    )
    dep_item_id = dep_action_res.json()["id"]

    convert_dep_res = await client.post(
        f"/api/v1/projects/{project_id}/meetings/{meeting_id}/action-items/{dep_item_id}/convert",
        json={"target_entity": "CLIENT_DEPENDENCY"},
        headers=headers,
    )
    assert convert_dep_res.status_code == 200
    assert convert_dep_res.json()["converted_entity_type"] == "CLIENT_DEPENDENCY"

    # 8. Finalize Meeting
    fin_res = await client.post(
        f"/api/v1/projects/{project_id}/meetings/{meeting_id}/finalize",
        headers=headers,
    )
    assert fin_res.status_code == 200
    assert fin_res.json()["status"] == "FINALIZED"
    assert fin_res.json()["finalized_at"] is not None
