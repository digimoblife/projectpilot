from datetime import date, timedelta
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_weekly_monthly_reporting_workflow(client: AsyncClient):
    # 1. Register & Login PM
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "reportpm@projectpilot.id",
            "password": "Password123!",
            "full_name": "Report PM Lead",
            "role": "PROJECT_MANAGER",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "reportpm@projectpilot.id", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Client & Project
    c_res = await client.post(
        "/api/v1/clients",
        json={"name": "Retail Corp", "company_name": "PT Retail Mandiri"},
        headers=headers,
    )
    client_id = c_res.json()["id"]

    p_res = await client.post(
        "/api/v1/projects",
        json={
            "name": "POS Cloud Migration",
            "code": "PRJ-POS-01",
            "client_id": client_id,
        },
        headers=headers,
    )
    project_id = p_res.json()["id"]

    # Create Milestone & Task
    m_res = await client.post(
        f"/api/v1/projects/{project_id}/milestones",
        json={"key": "M1", "title": "Database Schema Setup", "target_date": date.today().isoformat()},
        headers=headers,
    )
    assert m_res.status_code == 201

    # 3. Generate Weekly Internal Report Draft
    today = date.today()
    last_week = today - timedelta(days=7)

    gen_int_res = await client.post(
        f"/api/v1/projects/{project_id}/reports/generate-draft",
        json={
            "report_type": "WEEKLY_INTERNAL",
            "reporting_period_start": last_week.isoformat(),
            "reporting_period_end": today.isoformat(),
            "custom_instructions": "Highlight progress on PostgreSQL migration.",
        },
        headers=headers,
    )
    assert gen_int_res.status_code == 201
    int_data = gen_int_res.json()
    report_id = int_data["id"]
    assert int_data["report_key"] == "REP-001"
    assert int_data["status"] == "DRAFT"
    assert int_data["version"] == 1
    assert len(int_data["evidences"]) >= 1

    # 4. Generate Weekly Client Report Draft
    gen_client_res = await client.post(
        f"/api/v1/projects/{project_id}/reports/generate-draft",
        json={
            "report_type": "WEEKLY_CLIENT",
            "reporting_period_start": last_week.isoformat(),
            "reporting_period_end": today.isoformat(),
        },
        headers=headers,
    )
    assert gen_client_res.status_code == 201
    client_data = gen_client_res.json()
    assert client_data["report_type"] == "WEEKLY_CLIENT"

    # 5. Edit Report Markdown Content
    edit_res = await client.put(
        f"/api/v1/projects/{project_id}/reports/{report_id}",
        json={
            "title": "Laporan Mingguan Internal Proyek POS (Updated)",
            "content": "# Laporan Internal Proyek\n\n## 1. Highlight\nRevisi manual PM.",
        },
        headers=headers,
    )
    assert edit_res.status_code == 200
    assert edit_res.json()["title"] == "Laporan Mingguan Internal Proyek POS (Updated)"

    # 6. Finalize Report
    fin_res = await client.post(
        f"/api/v1/projects/{project_id}/reports/{report_id}/finalize",
        headers=headers,
    )
    assert fin_res.status_code == 200
    assert fin_res.json()["status"] == "FINAL"
    assert fin_res.json()["finalized_at"] is not None

    # 7. Create New Revision Version
    rev_res = await client.post(
        f"/api/v1/projects/{project_id}/reports/{report_id}/create-version",
        headers=headers,
    )
    assert rev_res.status_code == 200
    rev_data = rev_res.json()
    assert rev_data["version"] == 2
    assert rev_data["status"] == "DRAFT"
    assert rev_data["supersedes_report_id"] == report_id

    # 8. Query Global Reports Feed
    global_res = await client.get("/api/v1/reports", headers=headers)
    assert global_res.status_code == 200
    assert len(global_res.json()) >= 2
