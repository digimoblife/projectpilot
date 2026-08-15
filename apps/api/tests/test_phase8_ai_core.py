import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_ai_core_infrastructure_and_human_gate_workflow(client: AsyncClient):
    # 1. Register & Login PM
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "aipm@projectpilot.id",
            "password": "Password123!",
            "full_name": "AI Orchestrator PM",
            "role": "PROJECT_MANAGER",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "aipm@projectpilot.id", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Client & Project
    c_res = await client.post(
        "/api/v1/clients",
        json={"name": "Retail Corp", "company_name": "PT Retail Mega Sukses"},
        headers=headers,
    )
    client_id = c_res.json()["id"]

    p_res = await client.post(
        "/api/v1/projects",
        json={
            "name": "Omnichannel Point of Sale",
            "code": "PRJ-POS-01",
            "client_id": client_id,
        },
        headers=headers,
    )
    project_id = p_res.json()["id"]

    # 3. Enqueue AI Job (Brief Analysis)
    job_res = await client.post(
        f"/api/v1/projects/{project_id}/ai/jobs",
        json={
            "job_type": "BRIEF_ANALYSIS",
            "payload": {
                "evidence": "Klien membutuhkan sistem kasir POS berbasis tablet yang terintegrasi printer bluetooth dan QRIS.",
            },
        },
        headers=headers,
    )
    assert job_res.status_code == 201
    job_data = job_res.json()
    assert job_data["status"] == "COMPLETED"
    assert "summary" in job_data["result"]

    # 4. Verify AISuggestion was created in GENERATED status
    sugg_list_res = await client.get(
        f"/api/v1/projects/{project_id}/ai/suggestions",
        headers=headers,
    )
    assert sugg_list_res.status_code == 200
    suggestions = sugg_list_res.json()
    assert len(suggestions) >= 1
    target_sugg = suggestions[0]
    assert target_sugg["status"] == "GENERATED"
    assert target_sugg["capability"] == "BRIEF_ANALYSIS"

    # 5. Human Approval Gate: Review & ACCEPT
    review_res = await client.post(
        f"/api/v1/projects/{project_id}/ai/suggestions/{target_sugg['id']}/review",
        json={
            "action": "ACCEPTED",
            "review_notes": "Analisis AI sudah sesuai dengan ekspektasi brief.",
        },
        headers=headers,
    )
    assert review_res.status_code == 200
    assert review_res.json()["status"] == "ACCEPTED"
    assert review_res.json()["reviewed_at"] is not None

    # 6. Test Synchronous Process Helper
    sync_res = await client.post(
        f"/api/v1/projects/{project_id}/ai/process-sync",
        json={
            "capability": "DISCOVERY_QUESTION_GEN",
            "payload": {"evidence": "Kebutuhan integrasi printer struk kasir."},
        },
        headers=headers,
    )
    assert sync_res.status_code == 200
    sync_data = sync_res.json()
    assert sync_data["capability"] == "DISCOVERY_QUESTION_GEN"
    assert "questions" in sync_data["result"]
