import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_auth_flow(client: AsyncClient):
    # 1. Register PM user
    reg_payload = {
        "email": "pm@projectpilot.id",
        "password": "Password123!",
        "full_name": "Antigravity PM",
        "role": "PROJECT_MANAGER",
    }
    reg_res = await client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    user_data = reg_res.json()
    assert user_data["email"] == reg_payload["email"]
    assert user_data["role"] == "PROJECT_MANAGER"

    # 2. Login
    login_payload = {
        "email": "pm@projectpilot.id",
        "password": "Password123!",
    }
    login_res = await client.post("/api/v1/auth/login", json=login_payload)
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data
    token = token_data["access_token"]

    # 3. Get /me
    me_res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == "pm@projectpilot.id"


@pytest.mark.asyncio
async def test_client_and_project_lifecycle(client: AsyncClient):
    # Register & Login
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "leadpm@projectpilot.id",
            "password": "Password123!",
            "full_name": "Lead PM",
            "role": "PROJECT_MANAGER",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "leadpm@projectpilot.id", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Client
    client_payload = {
        "name": "PT Maju Bersama",
        "company_name": "PT Maju Bersama Solusindo",
        "industry": "Fintech",
        "primary_contact_name": "Budi Santoso",
        "primary_contact_email": "budi@majubersama.id",
    }
    create_client_res = await client.post("/api/v1/clients", json=client_payload, headers=headers)
    assert create_client_res.status_code == 201
    client_data = create_client_res.json()
    client_id = client_data["id"]
    assert client_data["name"] == "PT Maju Bersama"

    # 2. Add Stakeholder
    stakeholder_payload = {
        "name": "Siti Rahma",
        "role": "VP of Technology",
        "email": "siti@majubersama.id",
        "decision_authority": "Technical & Architecture Sign-off",
    }
    stk_res = await client.post(
        f"/api/v1/clients/{client_id}/stakeholders", json=stakeholder_payload, headers=headers
    )
    assert stk_res.status_code == 201
    assert stk_res.json()["name"] == "Siti Rahma"

    # 3. Create Project (Must start in DISCOVERY)
    project_payload = {
        "name": "Payment Gateway 2.0",
        "code": "PRJ-PAY-01",
        "description": "Pengembangan sistem integrasi pembayaran multi-channel.",
        "client_id": client_id,
        "start_date": "2026-09-01",
        "target_completion_date": "2026-12-31",
    }
    proj_res = await client.post("/api/v1/projects", json=project_payload, headers=headers)
    assert proj_res.status_code == 201
    proj_data = proj_res.json()
    project_id = proj_data["id"]
    assert proj_data["lifecycle_stage"] == "DISCOVERY"
    assert proj_data["health"] == "HEALTHY"
    assert proj_data["client"]["id"] == client_id

    # 4. Valid Stage Transition: DISCOVERY -> REQUIREMENT_DEFINITION
    trans_payload = {
        "target_stage": "REQUIREMENT_DEFINITION",
        "reason": "Discovery awal telah lengkap, melanjutkan ke formalisasi requirements.",
    }
    trans_res = await client.post(
        f"/api/v1/projects/{project_id}/transition", json=trans_payload, headers=headers
    )
    assert trans_res.status_code == 200
    assert trans_res.json()["lifecycle_stage"] == "REQUIREMENT_DEFINITION"

    # 5. Invalid Stage Transition: REQUIREMENT_DEFINITION -> COMPLETED (Must be rejected with 422)
    invalid_trans = {
        "target_stage": "COMPLETED",
        "reason": "Attempt skipping intermediate lifecycle phases",
    }
    invalid_res = await client.post(
        f"/api/v1/projects/{project_id}/transition", json=invalid_trans, headers=headers
    )
    assert invalid_res.status_code == 422

    # 6. Verify Activity Log
    act_res = await client.get(f"/api/v1/projects/{project_id}/activities", headers=headers)
    assert act_res.status_code == 200
    activities = act_res.json()
    assert len(activities) >= 2  # Created + Stage Changed
    event_types = [a["event_type"] for a in activities]
    assert "PROJECT_CREATED" in event_types
    assert "PROJECT_STAGE_CHANGED" in event_types
