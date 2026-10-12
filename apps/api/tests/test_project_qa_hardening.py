import json
import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient

from projectpilot.ai.gemini_adapter import GeminiAdapter


@pytest.mark.asyncio
async def test_gemini_adapter_answer_key_normalization():
    adapter = GeminiAdapter()

    # Candidate keys to test
    candidate_cases = [
        ({"jawaban": "Jawaban dari key jawaban"}, "Jawaban dari key jawaban"),
        ({"response": "Jawaban dari key response"}, "Jawaban dari key response"),
        ({"penjelasan": "Penjelasan detail"}, "Penjelasan detail"),
        ({"reply": "Balasan AI"}, "Balasan AI"),
        ({"message": "Pesan AI"}, "Pesan AI"),
        ({"text": "Teks jawaban"}, "Teks jawaban"),
        ({"content": "Konten jawaban"}, "Konten jawaban"),
        ({"hasil": "Hasil analisis"}, "Hasil analisis"),
        ({"answer": "", "jawaban": "Fallback karena answer string kosong"}, "Fallback karena answer string kosong"),
        ({"answer": "   ", "response": "Fallback karena answer whitespace"}, "Fallback karena answer whitespace"),
        ({"answer": None, "penjelasan": "Fallback karena answer None"}, "Fallback karena answer None"),
        (["Poin 1", "Poin 2", "Poin 3"], "Poin 1\nPoin 2\nPoin 3"),
    ]

    for payload, expected_answer in candidate_cases:
        mock_response = AsyncMock()
        mock_response.raise_for_status = lambda: None
        mock_response.json = lambda p=payload: {
            "candidates": [
                {
                    "content": {
                        "parts": [{"text": json.dumps(p)}]
                    }
                }
            ]
        }

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_response
            res = await adapter.generate_structured(
                prompt="Apa status proyek?",
                capability="PROJECT_QA",
            )
            assert res.get("answer") == expected_answer, f"Failed for payload: {payload}"


@pytest.mark.asyncio
async def test_project_qa_empty_and_malformed_ai_responses(client: AsyncClient):
    # 1. Register & Login PM
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "qamalformed@projectpilot.id",
            "password": "Password123!",
            "full_name": "QA Hardening PM",
            "role": "PROJECT_MANAGER",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "qamalformed@projectpilot.id", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Client & Project
    c_res = await client.post(
        "/api/v1/clients",
        json={"name": "PT Solusi Prima", "company_name": "Solusi Prima"},
        headers=headers,
    )
    client_id = c_res.json()["id"]

    p_res = await client.post(
        "/api/v1/projects",
        json={"name": "Sistem Pembayaran", "code": "PRJ-MAL-01", "client_id": client_id},
        headers=headers,
    )
    project_id = p_res.json()["id"]

    malformed_payloads = [
        {},
        {"answer": ""},
        {"answer": "   "},
        {"answer": None},
        {"unknown_random_key": 999},
        {"jawaban": "   "},
    ]

    for malformed in malformed_payloads:
        with patch("projectpilot.services.project_qa_service.gemini_adapter.generate_structured", new_callable=AsyncMock) as mock_gen:
            mock_gen.return_value = malformed

            res = await client.post(
                f"/api/v1/projects/{project_id}/qa",
                json={"question": "Berapa target SLA response waktu transaksi?"},
                headers=headers,
            )
            assert res.status_code == 200
            data = res.json()
            assert "Berdasarkan data proyek Sistem Pembayaran, tidak ditemukan informasi spesifik" in data["answer"]
            assert data["project_id"] == project_id
            assert data["citations"] == []
            assert data["evidence_count"] == 0


@pytest.mark.asyncio
async def test_project_qa_meeting_context_citations_and_evidence_count(client: AsyncClient):
    # 1. Register & Login
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "qameeting@projectpilot.id",
            "password": "Password123!",
            "full_name": "QA Meeting PM",
            "role": "PROJECT_MANAGER",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "qameeting@projectpilot.id", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Client & Project
    c_res = await client.post(
        "/api/v1/clients",
        json={"name": "PT Maju Jaya", "company_name": "Maju Jaya Corp"},
        headers=headers,
    )
    client_id = c_res.json()["id"]

    p_res = await client.post(
        "/api/v1/projects",
        json={"name": "Aplikasi Kasir Pintar", "code": "PRJ-AKP-01", "client_id": client_id},
        headers=headers,
    )
    project_id = p_res.json()["id"]

    # 3. Create 1 Requirement
    await client.post(
        f"/api/v1/projects/{project_id}/requirements",
        json={
            "key": "REQ-001",
            "title": "Dukungan Cetak Struk Bluetooth",
            "description": "Printer thermal bluetooth 58mm.",
            "category": "TECHNICAL",
            "acceptance_criteria": "Struk tercetak dalam < 2 detik.",
        },
        headers=headers,
    )

    # 4. Create 1 Decision
    await client.post(
        f"/api/v1/projects/{project_id}/decisions",
        json={
            "key": "ADR-001",
            "title": "Protokol ESC/POS",
            "context": "Standar perintah cetak.",
            "decision": "Gunakan pustaka ESC/POS native.",
        },
        headers=headers,
    )

    # 5. Create Epic & Feature & Task
    epic_res = await client.post(
        f"/api/v1/projects/{project_id}/epics",
        json={"key": "EPC-001", "title": "Printing Engine", "description": "Thermal printer"},
        headers=headers,
    )
    epic_id = epic_res.json()["id"]

    feat_res = await client.post(
        f"/api/v1/projects/{project_id}/features",
        json={"key": "FTR-001", "epic_id": epic_id, "title": "ESC/POS Driver", "description": "Driver code"},
        headers=headers,
    )
    feature_id = feat_res.json()["id"]

    task_res = await client.post(
        f"/api/v1/projects/{project_id}/tasks",
        json={
            "key": "TSK-001",
            "title": "Integrasi Bluetooth Service",
            "feature_id": feature_id,
        },
        headers=headers,
    )
    task_id = task_res.json()["id"]

    # 6. Advance task to create 1 active Blocker (BLK-001)
    for st in ["READY", "IN_PROGRESS"]:
        await client.post(
            f"/api/v1/projects/{project_id}/tasks/{task_id}/status",
            json={"target_status": st},
            headers=headers,
        )

    await client.post(
        f"/api/v1/projects/{project_id}/tasks/{task_id}/status",
        json={"target_status": "BLOCKED", "blocker_reason": "Keterbatasan Unit Uji Fisik Printer"},
        headers=headers,
    )

    # 7. Create 1 Meeting
    await client.post(
        f"/api/v1/projects/{project_id}/meetings",
        json={
            "title": "Sesi Demo Cetak Struk & Pembahasan Blocker",
            "meeting_type": "WEEKLY_SYNC",
            "notes": "Klien menyetujui pengiriman 2 unit printer contoh.",
        },
        headers=headers,
    )

    captured_prompt = None

    async def fake_ai_generate(*args, **kwargs):
        nonlocal captured_prompt
        captured_prompt = kwargs.get("prompt", "")
        return {
            "answer": "Berdasarkan pembahasan pada rapat [MTG-001] serta keputusan [ADR-001] dan kebutuhan [REQ-001], printer ESC/POS disetujui meskipun terdapat kendala [BLK-001] pada pengerjaan tugas [TSK-001]."
        }

    with patch("projectpilot.services.project_qa_service.gemini_adapter.generate_structured", side_effect=fake_ai_generate):
        qa_res = await client.post(
            f"/api/v1/projects/{project_id}/qa",
            json={"question": "Bagaimana kelanjutan pengujian printer thermal?"},
            headers=headers,
        )

    assert qa_res.status_code == 200
    res = qa_res.json()

    # 1. Verify Meeting Context was included in prompt
    assert captured_prompt is not None
    assert "=== PROJECT DATA CONTEXT (Aplikasi Kasir Pintar - PRJ-AKP-01) ===" in captured_prompt
    assert "6. Meetings & Notes (1):" in captured_prompt
    assert "[MTG-001] Sesi Demo Cetak Struk & Pembahasan Blocker" in captured_prompt
    assert "Notes: Klien menyetujui pengiriman 2 unit printer contoh." in captured_prompt

    # 2. Verify Citations
    citation_keys = {c["key"]: c for c in res["citations"]}
    assert "MTG-001" in citation_keys
    meeting_citation = citation_keys["MTG-001"]
    assert meeting_citation["type"] == "MEETING"
    assert meeting_citation["title"] == "Sesi Demo Cetak Struk & Pembahasan Blocker"
    assert meeting_citation["route"] == f"/projects/{project_id}/communication?tab=meetings"

    assert "REQ-001" in citation_keys
    assert "ADR-001" in citation_keys
    assert "TSK-001" in citation_keys
    assert "BLK-001" in citation_keys

    # 3. Verify exact evidence_count calculation (1 req + 1 dec + 1 task + 1 blk + 1 mtg = 5)
    assert res["evidence_count"] == 5


@pytest.mark.asyncio
async def test_project_qa_citations_from_question_query(client: AsyncClient):
    # 1. Register & Login
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "qacitation@projectpilot.id",
            "password": "Password123!",
            "full_name": "QA Citation PM",
            "role": "PROJECT_MANAGER",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "qacitation@projectpilot.id", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Client & Project
    c_res = await client.post(
        "/api/v1/clients",
        json={"name": "PT Mitra Global", "company_name": "Mitra Global"},
        headers=headers,
    )
    client_id = c_res.json()["id"]

    p_res = await client.post(
        "/api/v1/projects",
        json={"name": "Ekosistem Logistik", "code": "PRJ-LOG-01", "client_id": client_id},
        headers=headers,
    )
    project_id = p_res.json()["id"]

    # 3. Create Meeting
    m_res = await client.post(
        f"/api/v1/projects/{project_id}/meetings",
        json={
            "title": "Kickoff Rute Distribusi Jawa Timur",
            "meeting_type": "KICKOFF",
            "notes": "Pembagian PIC rute wilayah barat dan timur.",
        },
        headers=headers,
    )
    m_data = m_res.json()
    created_key = m_data["meeting_key"]

    with patch("projectpilot.services.project_qa_service.gemini_adapter.generate_structured", new_callable=AsyncMock) as mock_gen:
        mock_gen.return_value = {
            "jawaban": "Pada pertemuan tersebut, PIC rute wilayah timur telah dialokasikan kepada Budi."
        }

        qa_res = await client.post(
            f"/api/v1/projects/{project_id}/qa",
            json={"question": f"Apa yang dibahas pada {created_key} kemarin?"},
            headers=headers,
        )

        assert qa_res.status_code == 200
        res = qa_res.json()
        assert res["answer"] == "Pada pertemuan tersebut, PIC rute wilayah timur telah dialokasikan kepada Budi."
        assert len(res["citations"]) == 1
        assert res["citations"][0]["key"] == created_key
        assert res["citations"][0]["type"] == "MEETING"
        assert res["evidence_count"] == 1
