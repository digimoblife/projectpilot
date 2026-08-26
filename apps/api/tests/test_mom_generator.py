import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_mom_generation_and_history_workflow(client: AsyncClient):
    # 1. Register & Login PM
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "mompm@projectpilot.id",
            "password": "Password123!",
            "full_name": "MoM PM Lead",
            "role": "PROJECT_MANAGER",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "mompm@projectpilot.id", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Client & Project for optional association
    c_res = await client.post(
        "/api/v1/clients",
        json={"name": "Retail Corp", "company_name": "PT Retail Nusantara"},
        headers=headers,
    )
    client_id = c_res.json()["id"]

    p_res = await client.post(
        "/api/v1/projects",
        json={
            "name": "POS & CRM Integration",
            "code": "PRJ-POS-01",
            "client_id": client_id,
        },
        headers=headers,
    )
    project_id = p_res.json()["id"]

    # 3. Test Generate MoM with Project
    raw_notes = """
    Rapat Koordinasi Integrasi Payment & POS
    Hadir: Cahyo (PM Lead), Budi (Backend), Sinta (UI Designer), Pak Hendra (Klien Retail Nusantara).
    
    Poin pembahasan:
    - Backend sudah menyelesaikan API checkout QRIS dinamis.
    - Klien membutuhkan webhook callback dikirimkan dalam waktu kurang dari 3 detik.
    - Desain UI kasir akan di-demo hari Jumat jam 14.00.
    
    Keputusan:
    - Format laporan disepakati menggunakan format Markdown (.md).
    - Arsitektur webhook menggunakan HMAC token verification.
    
    Action items:
    1. Budi: Setup staging endpoint dan kirim doc API ke tim IT klien paling lambat 28 Agustus 2026.
    2. Sinta: Finalisasi prototype UI/UX kasir sebelum Kamis 27 Agustus 2026.
    3. Cahyo: Jadwalkan sesi UAT dan koordinasi demo Jumat.
    """

    gen_res = await client.post(
        "/api/v1/mom/generate",
        json={
            "raw_text": raw_notes,
            "title": "Rapat Koordinasi Integrasi Payment & POS",
            "attendees_raw": "Cahyo (PM Lead), Budi (Backend), Sinta (UI Designer), Pak Hendra (Klien Retail Nusantara)",
            "project_name": "POS & CRM Integration",
        },
        headers=headers,
    )
    assert gen_res.status_code == 201
    mom_data = gen_res.json()
    mom_id = mom_data["id"]
    assert mom_data["mom_key"].startswith("MOM-")
    assert mom_data["title"] == "Rapat Koordinasi Integrasi Payment & POS"
    assert len(mom_data["attendees"]) == 4
    assert mom_data["project_name"] == "POS & CRM Integration"
    assert "content_md" in mom_data
    assert len(mom_data["content_md"]) > 20
    assert len(mom_data["action_items"]) > 0

    # 4. Test Generate Standalone MoM (Without Project)
    gen_standalone_res = await client.post(
        "/api/v1/mom/generate",
        json={
            "raw_text": "Meeting internal tim tech: review sprint backlog dan alokasi resource.",
            "project_name": "Proyek Custom Lainnya",
        },
        headers=headers,
    )
    assert gen_standalone_res.status_code == 201
    standalone_id = gen_standalone_res.json()["id"]
    assert gen_standalone_res.json()["project_name"] == "Proyek Custom Lainnya"

    # 5. Test List MoM History
    list_res = await client.get("/api/v1/mom", headers=headers)
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert len(list_data) >= 2

    # Filter with search query
    search_res = await client.get("/api/v1/mom?q=Payment", headers=headers)
    assert search_res.status_code == 200
    assert any("Payment" in item["title"] or "MOM-" in item["mom_key"] for item in search_res.json())

    # 6. Test Get MoM Detail
    detail_res = await client.get(f"/api/v1/mom/{mom_id}", headers=headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == mom_id

    # 7. Test Update MoM
    update_res = await client.put(
        f"/api/v1/mom/{mom_id}",
        json={
            "title": "Rapat Koordinasi Integrasi Payment & POS (Final)",
            "content_md": "# MoM Final Edited\n\nKonten sudah direview bersama.",
        },
        headers=headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["title"] == "Rapat Koordinasi Integrasi Payment & POS (Final)"
    assert update_res.json()["content_md"] == "# MoM Final Edited\n\nKonten sudah direview bersama."

    # 8. Test Delete MoM
    del_res = await client.delete(f"/api/v1/mom/{standalone_id}", headers=headers)
    assert del_res.status_code == 204

    # Verify deleted
    get_del_res = await client.get(f"/api/v1/mom/{standalone_id}", headers=headers)
    assert get_del_res.status_code == 404
