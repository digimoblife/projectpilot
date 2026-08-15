import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_discovery_brief_and_questions_workflow(client: AsyncClient):
    # 1. Register & Login PM
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "discoverypm@projectpilot.id",
            "password": "Password123!",
            "full_name": "Discovery PM",
            "role": "PROJECT_MANAGER",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "discoverypm@projectpilot.id", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Client & Project
    c_res = await client.post(
        "/api/v1/clients",
        json={"name": "Bank Mega Digital", "company_name": "PT Bank Mega Digital Tbk"},
        headers=headers,
    )
    client_id = c_res.json()["id"]

    p_res = await client.post(
        "/api/v1/projects",
        json={
            "name": "SuperApp Core Banking",
            "code": "PRJ-BNK-01",
            "client_id": client_id,
            "description": "Pengembangan modul transfer BI-FAST dan pembayaran QRIS.",
        },
        headers=headers,
    )
    project_id = p_res.json()["id"]

    # 3. Test Brief Upsert & Retrieval
    brief_payload = {
        "objective": "Membangun sistem mobile banking dengan ketahanan transaksi tinggi.",
        "business_context": "Meningkatkan adopsi nasabah retail generasi muda.",
        "intended_users": "Nasabah retail, merchant QRIS, staf operasional bank.",
        "expected_functionality": "Transfer antar bank BI-FAST, top-up e-wallet, mutasi rekening real-time.",
        "constraints": "Harus patuh regulasi Bank Indonesia dan OJK.",
        "known_integrations": "Core banking AS400, BI-FAST switch gateway.",
        "raw_content": "Catatan kick-off meeting 15 Agustus 2026.",
    }
    brief_res = await client.put(
        f"/api/v1/projects/{project_id}/brief", json=brief_payload, headers=headers
    )
    assert brief_res.status_code == 200
    brief_data = brief_res.json()
    assert brief_data["objective"] == brief_payload["objective"]

    get_brief_res = await client.get(f"/api/v1/projects/{project_id}/brief", headers=headers)
    assert get_brief_res.status_code == 200
    assert get_brief_res.json()["constraints"] == "Harus patuh regulasi Bank Indonesia dan OJK."

    # 4. Create Discovery Question
    q_payload = {
        "category": "INTEGRATION",
        "question": "Protokol apa yang digunakan untuk koneksi ke gateway BI-FAST (REST API atau ISO 8583)?",
        "rationale": "Menentukan arsitektur message broker dan middleware adapter.",
        "priority": "HIGH",
    }
    q_res = await client.post(
        f"/api/v1/projects/{project_id}/discovery-questions",
        json=q_payload,
        headers=headers,
    )
    assert q_res.status_code == 201
    q_data = q_res.json()
    question_id = q_data["id"]
    assert q_data["status"] == "DRAFT"
    assert q_data["category"] == "INTEGRATION"

    # 5. Invalid Question Status Jump (DRAFT -> ANSWERED must fail with 422)
    invalid_res = await client.post(
        f"/api/v1/projects/{project_id}/discovery-questions/{question_id}/status",
        json={"target_status": "ANSWERED"},
        headers=headers,
    )
    assert invalid_res.status_code == 422

    # 6. Valid Transition: DRAFT -> READY -> SENT
    for target in ["READY", "SENT"]:
        st_res = await client.post(
            f"/api/v1/projects/{project_id}/discovery-questions/{question_id}/status",
            json={"target_status": target},
            headers=headers,
        )
        assert st_res.status_code == 200
        assert st_res.json()["status"] == target

    # 7. Record Client Answer (auto transitions question to ANSWERED)
    ans_payload = {
        "answer_text": "Koneksi menggunakan REST API JSON dengan mutual TLS (mTLS) dan payload signature HMAC SHA-256.",
        "respondent_name": "Budi Santoso",
        "respondent_role": "Lead Architect Bank",
        "source": "Technical Clarification Meeting",
    }
    ans_res = await client.post(
        f"/api/v1/projects/{project_id}/discovery-questions/{question_id}/answers",
        json=ans_payload,
        headers=headers,
    )
    assert ans_res.status_code == 201
    ans_data = ans_res.json()
    assert ans_data["respondent_name"] == "Budi Santoso"

    # Verify Question is now ANSWERED
    q_after_res = await client.get(
        f"/api/v1/projects/{project_id}/discovery-questions/{question_id}",
        headers=headers,
    )
    assert q_after_res.status_code == 200
    q_after = q_after_res.json()
    assert q_after["status"] == "ANSWERED"
    assert len(q_after["answers"]) == 1

    # 8. Follow-up Workflow: ANSWERED -> NEEDS_FOLLOW_UP
    fu_res = await client.post(
        f"/api/v1/projects/{project_id}/discovery-questions/{question_id}/status",
        json={"target_status": "NEEDS_FOLLOW_UP"},
        headers=headers,
    )
    assert fu_res.status_code == 200
    assert fu_res.json()["status"] == "NEEDS_FOLLOW_UP"

    # Create Follow-up child question
    child_q_res = await client.post(
        f"/api/v1/projects/{project_id}/discovery-questions",
        json={
            "category": "SECURITY",
            "question": "Bagaimana rotasi sertifikat mTLS dan penyerahan public key dilakukan?",
            "parent_question_id": question_id,
            "priority": "HIGH",
        },
        headers=headers,
    )
    assert child_q_res.status_code == 201
    assert child_q_res.json()["parent_question_id"] == question_id

    # 9. List questions with filter
    list_res = await client.get(
        f"/api/v1/projects/{project_id}/discovery-questions?category=INTEGRATION",
        headers=headers,
    )
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1
