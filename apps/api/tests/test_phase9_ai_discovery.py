import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_ai_discovery_and_requirement_intelligence_workflow(client: AsyncClient):
    # 1. Register & Login PM
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "discoveryai_pm@projectpilot.id",
            "password": "Password123!",
            "full_name": "Discovery AI Copilot PM",
            "role": "PROJECT_MANAGER",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "discoveryai_pm@projectpilot.id", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Client & Project
    c_res = await client.post(
        "/api/v1/clients",
        json={"name": "Logistik Express", "company_name": "PT Logistik Express Indonesia"},
        headers=headers,
    )
    client_id = c_res.json()["id"]

    p_res = await client.post(
        "/api/v1/projects",
        json={
            "name": "Fleet Telematics & Dispatch",
            "code": "PRJ-FLT-01",
            "client_id": client_id,
        },
        headers=headers,
    )
    project_id = p_res.json()["id"]

    # 3. Create Project Brief
    await client.put(
        f"/api/v1/projects/{project_id}/brief",
        json={
            "objective": "Otomasi routing kurir dan pelacakan live armada ekspedisi.",
            "raw_content": "Klien memerlukan aplikasi telematics driver GPS, integrasi payment gateway QRIS untuk cash-on-delivery, dan dashboard dispatch armada.",
        },
        headers=headers,
    )

    # 4. Trigger AI Brief Analysis
    brief_ai = await client.post(
        f"/api/v1/projects/{project_id}/ai/analyze-brief",
        headers=headers,
    )
    assert brief_ai.status_code == 200
    brief_sugg = brief_ai.json()
    assert brief_sugg["capability"] == "BRIEF_ANALYSIS"
    assert "summary" in brief_sugg["suggested_data"]

    # 5. Trigger AI Discovery Question Generation
    q_gen = await client.post(
        f"/api/v1/projects/{project_id}/ai/generate-questions",
        headers=headers,
    )
    assert q_gen.status_code == 200
    q_sugg = q_gen.json()
    assert q_sugg["capability"] == "DISCOVERY_QUESTION_GEN"
    assert "questions" in q_sugg["suggested_data"]

    # 6. Transactional Acceptance of Questions -> Creates real DiscoveryQuestion records
    accept_q = await client.post(
        f"/api/v1/projects/{project_id}/ai/suggestions/{q_sugg['id']}/accept-questions",
        headers=headers,
    )
    assert accept_q.status_code == 200
    assert accept_q.json()["created_count"] >= 1

    # Verify discovery questions now exist in the database
    disc_list = await client.get(
        f"/api/v1/projects/{project_id}/discovery-questions",
        headers=headers,
    )
    assert disc_list.status_code == 200
    assert len(disc_list.json()) >= 1

    # 7. Trigger AI Requirement Extraction
    req_ai = await client.post(
        f"/api/v1/projects/{project_id}/ai/extract-requirements",
        headers=headers,
    )
    assert req_ai.status_code == 200
    req_sugg = req_ai.json()
    assert req_sugg["capability"] == "REQUIREMENT_EXTRACTION"
    assert "requirements" in req_sugg["suggested_data"]

    # 8. Transactional Acceptance of Requirements -> Creates real Requirement records with DRAFT status
    accept_r = await client.post(
        f"/api/v1/projects/{project_id}/ai/suggestions/{req_sugg['id']}/accept-requirements",
        headers=headers,
    )
    assert accept_r.status_code == 200
    assert accept_r.json()["created_count"] >= 1

    # Verify requirements exist in the catalog
    req_catalog = await client.get(
        f"/api/v1/projects/{project_id}/requirements",
        headers=headers,
    )
    assert req_catalog.status_code == 200
    assert len(req_catalog.json()) >= 1
    assert any(r["source_type"] == "BRIEF" for r in req_catalog.json())

    # 9. Trigger Contradiction Detection & Project Q&A
    contra_res = await client.post(
        f"/api/v1/projects/{project_id}/ai/detect-contradictions",
        headers=headers,
    )
    assert contra_res.status_code == 200

    qa_res = await client.post(
        f"/api/v1/projects/{project_id}/ai/qa",
        json={"question": "Kapan target rilis sistem ini?"},
        headers=headers,
    )
    assert qa_res.status_code == 200
    assert "answer" in qa_res.json()
