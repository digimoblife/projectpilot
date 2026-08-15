import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_rbac_and_security_hardening(client: AsyncClient):
    # 1. Register PM and Developer users
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "pm_hardened@projectpilot.id",
            "password": "Password123!",
            "full_name": "Hardened PM",
            "role": "PROJECT_MANAGER",
        },
    )
    pm_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "pm_hardened@projectpilot.id", "password": "Password123!"},
    )
    pm_token = pm_login.json()["access_token"]
    pm_headers = {"Authorization": f"Bearer {pm_token}"}

    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "dev_hardened@projectpilot.id",
            "password": "Password123!",
            "full_name": "Hardened Dev",
            "role": "TEAM_MEMBER",
        },
    )
    dev_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "dev_hardened@projectpilot.id", "password": "Password123!"},
    )
    dev_token = dev_login.json()["access_token"]
    dev_headers = {"Authorization": f"Bearer {dev_token}"}

    # 2. Create Project as PM
    c_res = await client.post(
        "/api/v1/clients",
        json={"name": "Secure Banking", "company_name": "PT Bank Sentosa"},
        headers=pm_headers,
    )
    client_id = c_res.json()["id"]

    p_res = await client.post(
        "/api/v1/projects",
        json={"name": "Core Banking Hardening", "code": "PRJ-SEC-01", "client_id": client_id},
        headers=pm_headers,
    )
    project_id = p_res.json()["id"]

    # 3. RBAC Barrier: Developer CANNOT execute PM-only endpoints
    # Dev attempting to create a report draft -> Expect 403 Forbidden
    dev_rep_res = await client.post(
        f"/api/v1/projects/{project_id}/reports/generate-draft",
        json={
            "report_type": "WEEKLY_INTERNAL",
            "reporting_period_start": "2026-08-01",
            "reporting_period_end": "2026-08-08",
        },
        headers=dev_headers,
    )
    assert dev_rep_res.status_code == 403

    # Dev attempting to complete project handover -> Expect 403 Forbidden
    dev_ho_res = await client.post(
        f"/api/v1/projects/{project_id}/handover/complete",
        headers=dev_headers,
    )
    assert dev_ho_res.status_code == 403

    # 4. Unauthenticated Access Protection -> Expect 401 Unauthorized
    unauth_res = await client.get(f"/api/v1/projects/{project_id}/handover")
    assert unauth_res.status_code == 401

    # 5. Invalid UUID Input Handling -> Expect 422 Unprocessable Content
    invalid_uuid_res = await client.get("/api/v1/projects/not-a-valid-uuid", headers=pm_headers)
    assert invalid_uuid_res.status_code == 422
