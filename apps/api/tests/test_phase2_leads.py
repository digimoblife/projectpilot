import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_lead_lifecycle_and_atomic_conversion(client: AsyncClient):
    # 1. Register & Login PM
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "leadmaster@projectpilot.id",
            "password": "Password123!",
            "full_name": "Lead Master PM",
            "role": "PROJECT_MANAGER",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "leadmaster@projectpilot.id", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Lead
    lead_payload = {
        "name": "E-Commerce Replatforming",
        "company_name": "PT Retail Sukses Mandiri",
        "client_pic_name": "Dewi Sartika",
        "client_pic_email": "dewi@retailsukses.id",
        "client_pic_phone": "+628123456789",
        "project_type": "E-Commerce Web & Mobile",
        "source": "Direct Inbound",
        "opportunity_description": "Migrasi dari sistem monolitik lama ke arsitektur micro-frontend modern.",
        "brief_notes": "Klien butuh integrasi payment gateway dan sinkronisasi stok real-time.",
    }
    create_res = await client.post("/api/v1/leads", json=lead_payload, headers=headers)
    assert create_res.status_code == 201
    lead_data = create_res.json()
    lead_id = lead_data["id"]
    assert lead_data["status"] == "NEW"
    assert lead_data["name"] == "E-Commerce Replatforming"

    # 3. Invalid Status Transition: NEW -> CONVERTED (Must fail with 422)
    invalid_res = await client.post(
        f"/api/v1/leads/{lead_id}/status",
        json={"target_status": "CONVERTED"},
        headers=headers,
    )
    assert invalid_res.status_code == 422

    # 4. Progression: NEW -> CONTACTED -> BRIEF_SCHEDULED -> QUALIFIED
    for target in ["CONTACTED", "BRIEF_SCHEDULED", "QUALIFIED"]:
        prog_res = await client.post(
            f"/api/v1/leads/{lead_id}/status",
            json={"target_status": target},
            headers=headers,
        )
        assert prog_res.status_code == 200
        assert prog_res.json()["status"] == target

    # 5. Atomic Conversion to Project
    convert_payload = {
        "project_code": "PRJ-RET-01",
        "project_name": "Retail E-Commerce 2.0",
        "description": "Pengembangan sistem e-commerce terintegrasi.",
        "start_date": "2026-10-01",
        "target_completion_date": "2027-01-31",
    }
    convert_res = await client.post(
        f"/api/v1/leads/{lead_id}/convert", json=convert_payload, headers=headers
    )
    assert convert_res.status_code == 201
    project_data = convert_res.json()
    project_id = project_data["id"]
    assert project_data["code"] == "PRJ-RET-01"
    assert project_data["lifecycle_stage"] == "DISCOVERY"
    assert project_data["client"] is not None
    assert project_data["client"]["company_name"] == "PT Retail Sukses Mandiri"

    # 6. Verify Lead is marked CONVERTED and links to created project
    lead_after_res = await client.get(f"/api/v1/leads/{lead_id}", headers=headers)
    assert lead_after_res.status_code == 200
    lead_after = lead_after_res.json()
    assert lead_after["status"] == "CONVERTED"
    assert lead_after["converted_project_id"] == project_id

    # 7. Test Lost Lead flow with another Lead
    lost_lead_res = await client.post(
        "/api/v1/leads",
        json={
            "name": "ERP Integration",
            "company_name": "PT Industri Logistik",
            "opportunity_description": "Integrasi SAP dengan warehouse internal.",
        },
        headers=headers,
    )
    lost_lead_id = lost_lead_res.json()["id"]

    lost_status_res = await client.post(
        f"/api/v1/leads/{lost_lead_id}/status",
        json={
            "target_status": "LOST",
            "loss_reason": "Klien menunda anggaran hingga kuartal depan.",
        },
        headers=headers,
    )
    assert lost_status_res.status_code == 200
    assert lost_status_res.json()["status"] == "LOST"
    assert "menunda anggaran" in lost_status_res.json()["loss_reason"]
