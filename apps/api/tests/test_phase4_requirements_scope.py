import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_requirements_decisions_and_scope_workflow(client: AsyncClient):
    # 1. Register & Login PM
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "reqpm@projectpilot.id",
            "password": "Password123!",
            "full_name": "Requirements PM",
            "role": "PROJECT_MANAGER",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "reqpm@projectpilot.id", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Client & Project
    c_res = await client.post(
        "/api/v1/clients",
        json={"name": "Logistik Cepat", "company_name": "PT Logistik Cepat Indonesia"},
        headers=headers,
    )
    client_id = c_res.json()["id"]

    p_res = await client.post(
        "/api/v1/projects",
        json={
            "name": "Fleet Tracking & Dispatch",
            "code": "PRJ-FLT-01",
            "client_id": client_id,
        },
        headers=headers,
    )
    project_id = p_res.json()["id"]

    # 3. Create Requirement with Source Link
    req_payload = {
        "key": "REQ-FLT-001",
        "title": "Real-Time GPS Driver Tracking",
        "description": "Aplikasi driver harus memancarkan koordinat GPS setiap 10 detik ke backend telemetry.",
        "category": "FUNCTIONAL",
        "priority": "HIGH",
        "source_type": "CLIENT_ANSWER",
        "acceptance_criteria": "Deviasi update lokasi maksimal 15 detik di peta dashboard.",
    }
    req_res = await client.post(
        f"/api/v1/projects/{project_id}/requirements",
        json=req_payload,
        headers=headers,
    )
    assert req_res.status_code == 201
    req_data = req_res.json()
    req_id = req_data["id"]
    assert req_data["status"] == "DRAFT"
    assert req_data["version"] == 1

    # 4. Progress Requirement: DRAFT -> CONFIRMED -> APPROVED
    conf_res = await client.post(
        f"/api/v1/projects/{project_id}/requirements/{req_id}/status",
        json={"target_status": "CONFIRMED"},
        headers=headers,
    )
    assert conf_res.status_code == 200

    appr_res = await client.post(
        f"/api/v1/projects/{project_id}/requirements/{req_id}/status",
        json={"target_status": "APPROVED"},
        headers=headers,
    )
    assert appr_res.status_code == 200
    assert appr_res.json()["status"] == "APPROVED"

    # 5. Requirement Supersession: Modify Approved Requirement
    # Direct PUT on APPROVED must fail with 400
    direct_put_res = await client.put(
        f"/api/v1/projects/{project_id}/requirements/{req_id}",
        json={"title": "Updated Title Directly"},
        headers=headers,
    )
    assert direct_put_res.status_code == 400

    # Supersede via dedicated endpoint
    sup_payload = {
        "title": "Real-Time GPS Tracking with Battery Optimization",
        "description": "Aplikasi driver memancarkan GPS setiap 10 detik saat bergerak dan setiap 60 detik saat diam.",
        "acceptance_criteria": "Pengurangan konsumsi baterai 30% pada posisi idle.",
    }
    sup_res = await client.post(
        f"/api/v1/projects/{project_id}/requirements/{req_id}/supersede",
        json=sup_payload,
        headers=headers,
    )
    assert sup_res.status_code == 200
    new_req_data = sup_res.json()
    new_req_id = new_req_data["id"]
    assert new_req_data["version"] == 2
    assert new_req_data["supersedes_id"] == req_id

    # Verify old requirement is marked SUPERSEDED and links to new version
    old_req_check = await client.get(
        f"/api/v1/projects/{project_id}/requirements/{req_id}", headers=headers
    )
    assert old_req_check.json()["status"] == "SUPERSEDED"
    assert old_req_check.json()["superseded_by_id"] == new_req_id

    # 6. Test Decision Log
    dec_payload = {
        "key": "DEC-001",
        "title": "Adopsi MQTT Broker untuk GPS Stream",
        "context": "Dibutuhkan protokol ringan dengan overhead packet kecil untuk ribuan device bergerak.",
        "decision": "Menggunakan EMQX MQTT Broker dengan persistensi Postgres/TimescaleDB.",
        "rationale": "Throughput tinggi dengan bandwidth konsumsi minimum 4G.",
    }
    dec_res = await client.post(
        f"/api/v1/projects/{project_id}/decisions", json=dec_payload, headers=headers
    )
    assert dec_res.status_code == 201
    assert dec_res.json()["key"] == "DEC-001"
    assert dec_res.json()["status"] == "ACCEPTED"

    # 7. Test Scope Items (In-Scope & Out-of-Scope)
    scope_res = await client.post(
        f"/api/v1/projects/{project_id}/scope-items",
        json={
            "title": "Modul Dispatch Otomatis",
            "scope_type": "IN_SCOPE",
            "rationale": "Kebutuhan esensial MVP operasional.",
        },
        headers=headers,
    )
    assert scope_res.status_code == 201
    scope_id = scope_res.json()["id"]

    out_scope_res = await client.post(
        f"/api/v1/projects/{project_id}/scope-items",
        json={
            "title": "Integrasi Fuel Sensor IoT Hardware",
            "scope_type": "OUT_OF_SCOPE",
            "rationale": "Direncanakan pada Phase 2 setelah MVP berjalan stabil.",
        },
        headers=headers,
    )
    assert out_scope_res.status_code == 201

    list_scope = await client.get(
        f"/api/v1/projects/{project_id}/scope-items?scope_type=IN_SCOPE", headers=headers
    )
    assert len(list_scope.json()) == 1

    # 8. Test Scope Change Request (CR)
    cr_payload = {
        "key": "CR-001",
        "title": "Penambahan Export PDF Laporan Pengiriman",
        "description": "Klien meminta modul reporting mencetak manifest jalan format PDF bertanda tangan digital.",
        "reason": "Kebutuhan audit fisik di pos pemeriksaan gudang.",
        "impact_summary": "+3 hari kerja developer, tanpa penambahan biaya lisensi.",
    }
    cr_res = await client.post(
        f"/api/v1/projects/{project_id}/scope-changes", json=cr_payload, headers=headers
    )
    assert cr_res.status_code == 201
    cr_id = cr_res.json()["id"]
    assert cr_res.json()["status"] == "IDENTIFIED"

    # Progress CR: IDENTIFIED -> UNDER_EVALUATION -> SUBMITTED -> CLIENT_APPROVED
    for target in ["UNDER_EVALUATION", "SUBMITTED", "CLIENT_APPROVED"]:
        cr_st = await client.post(
            f"/api/v1/projects/{project_id}/scope-changes/{cr_id}/status",
            json={"target_status": target, "approved_by": "Klien Direktur Operasional"},
            headers=headers,
        )
        assert cr_st.status_code == 200
        assert cr_st.json()["status"] == target
