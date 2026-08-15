from datetime import date, timedelta
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_control_center_deterministic_health_and_ai_briefings(client: AsyncClient):
    # 1. Register & Login PM
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "controlpm@projectpilot.id",
            "password": "Password123!",
            "full_name": "Control Center PM Lead",
            "role": "PROJECT_MANAGER",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "controlpm@projectpilot.id", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Client & Project
    c_res = await client.post(
        "/api/v1/clients",
        json={"name": "Logistics Corp", "company_name": "PT Logistik Prima"},
        headers=headers,
    )
    client_id = c_res.json()["id"]

    p_res = await client.post(
        "/api/v1/projects",
        json={
            "name": "Fleet Tracking System",
            "code": "PRJ-FLEET-01",
            "client_id": client_id,
        },
        headers=headers,
    )
    project_id = p_res.json()["id"]

    # 3. Verify Initial HEALTHY state
    health_res = await client.get(f"/api/v1/projects/{project_id}/health", headers=headers)
    assert health_res.status_code == 200
    h_data = health_res.json()
    assert h_data["health_status"] == "HEALTHY"
    assert h_data["health_score"] == 100
    assert h_data["rules_version"] == "v1.0.0"

    # 4. Add Overdue Task -> Verify Transition to AT_RISK
    epic_res = await client.post(
        f"/api/v1/projects/{project_id}/epics",
        json={"key": "EPC-001", "title": "GPS Ingestion", "description": "Core GPS stream"},
        headers=headers,
    )
    epic_id = epic_res.json()["id"]

    feat_res = await client.post(
        f"/api/v1/projects/{project_id}/features",
        json={"key": "FTR-001", "epic_id": epic_id, "title": "MQTT Broker Setup"},
        headers=headers,
    )
    feature_id = feat_res.json()["id"]

    yesterday = date.today() - timedelta(days=2)
    task_res = await client.post(
        f"/api/v1/projects/{project_id}/tasks",
        json={
            "feature_id": feature_id,
            "key": "TSK-001",
            "title": "Configure EMQX broker",
            "due_date": yesterday.isoformat(),
            "status": "IN_PROGRESS",
        },
        headers=headers,
    )
    assert task_res.status_code == 201

    # Check updated health -> should be AT_RISK
    health_res_2 = await client.get(f"/api/v1/projects/{project_id}/health", headers=headers)
    assert health_res_2.status_code == 200
    assert health_res_2.json()["health_status"] == "AT_RISK"
    assert health_res_2.json()["metrics"]["overdue_tasks"] == 1
    assert any("overdue" in e.lower() for e in health_res_2.json()["health_evidence"])

    # 5. Add Active Blocker -> Verify Transition to CRITICAL
    blocker_res = await client.post(
        f"/api/v1/projects/{project_id}/blockers",
        json={
            "key": "BLK-001",
            "title": "IP Whitelist Server GPS belum dibuka",
            "status": "ACTIVE",
        },
        headers=headers,
    )
    assert blocker_res.status_code == 201

    health_res_3 = await client.get(f"/api/v1/projects/{project_id}/health", headers=headers)
    assert health_res_3.status_code == 200
    assert health_res_3.json()["health_status"] == "CRITICAL"
    assert health_res_3.json()["metrics"]["active_blockers"] == 1

    # 6. Test Dashboard Overview endpoint
    overview_res = await client.get("/api/v1/dashboard/overview", headers=headers)
    assert overview_res.status_code == 200
    ov_data = overview_res.json()
    assert ov_data["total_projects"] >= 1
    assert ov_data["overdue_tasks_count"] >= 1
    assert ov_data["active_blockers_count"] >= 1
    assert len(ov_data["attention_items"]) >= 2
    assert len(ov_data["project_health_cards"]) >= 1

    # 7. Test AI PM Project Daily Briefing
    ai_proj_res = await client.post(
        f"/api/v1/projects/{project_id}/health/ai-summary",
        headers=headers,
    )
    assert ai_proj_res.status_code == 200
    ai_proj_data = ai_proj_res.json()
    assert ai_proj_data["capability"] == "PM_DAILY_SUMMARY"
    assert "executive_summary" in ai_proj_data["summary_data"]
    assert "top_priorities" in ai_proj_data["summary_data"]

    # 8. Test AI Portfolio Morning Briefing
    ai_port_res = await client.post(
        "/api/v1/dashboard/ai-summary",
        headers=headers,
    )
    assert ai_port_res.status_code == 200
    ai_port_data = ai_port_res.json()
    assert ai_port_data["capability"] == "PORTFOLIO_PM_SUMMARY"
    assert "morning_headline" in ai_port_data["summary_data"]
