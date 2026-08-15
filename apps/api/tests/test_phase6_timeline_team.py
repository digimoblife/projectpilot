import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_timeline_milestones_and_dependencies_workflow(client: AsyncClient):
    # 1. Register & Login PM
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "timelinepm@projectpilot.id",
            "password": "Password123!",
            "full_name": "Timeline Master PM",
            "role": "PROJECT_MANAGER",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "timelinepm@projectpilot.id", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Client & Project
    c_res = await client.post(
        "/api/v1/clients",
        json={"name": "Aero Logistik", "company_name": "PT Aero Logistik Nusantara"},
        headers=headers,
    )
    client_id = c_res.json()["id"]

    p_res = await client.post(
        "/api/v1/projects",
        json={
            "name": "Cargo Tracking Hub",
            "code": "PRJ-CRG-01",
            "client_id": client_id,
        },
        headers=headers,
    )
    project_id = p_res.json()["id"]

    # 3. Add Project Members
    member_res = await client.post(
        f"/api/v1/projects/{project_id}/members",
        json={
            "name": "Fajar Pratama",
            "email": "fajar@projectpilot.id",
            "role": "TECH_LEAD",
            "capacity_hours_per_week": 40.0,
        },
        headers=headers,
    )
    assert member_res.status_code == 201
    member_id = member_res.json()["id"]

    # 4. Create Milestone
    mls_res = await client.post(
        f"/api/v1/projects/{project_id}/milestones",
        json={
            "key": "MLS-001",
            "title": "Alpha Release & UAT Kargo",
            "target_date": "2026-12-15",
            "description": "Deployment modul tracking internal ke server staging.",
        },
        headers=headers,
    )
    assert mls_res.status_code == 201
    mls_id = mls_res.json()["id"]
    assert mls_res.json()["status"] == "PLANNED"

    # 5. Create 3 Sequential Tasks
    t1_res = await client.post(
        f"/api/v1/projects/{project_id}/tasks",
        json={
            "key": "TSK-001",
            "title": "Setup InfluxDB Telemetry Broker",
            "start_date": "2026-10-01",
            "due_date": "2026-10-05",
            "assignee_name": "Fajar Pratama",
        },
        headers=headers,
    )
    t1_id = t1_res.json()["id"]

    t2_res = await client.post(
        f"/api/v1/projects/{project_id}/tasks",
        json={
            "key": "TSK-002",
            "title": "Implementasi Parser Protokol GPS",
            "start_date": "2026-10-06",
            "due_date": "2026-10-12",
            "assignee_name": "Fajar Pratama",
        },
        headers=headers,
    )
    t2_id = t2_res.json()["id"]

    t3_res = await client.post(
        f"/api/v1/projects/{project_id}/tasks",
        json={
            "key": "TSK-003",
            "title": "Dashboard Live Tracking Map",
            "start_date": "2026-10-13",
            "due_date": "2026-10-20",
            "assignee_name": "Fajar Pratama",
        },
        headers=headers,
    )
    t3_id = t3_res.json()["id"]

    # 6. Create Task Dependency: T1 -> T2 and T2 -> T3
    dep1 = await client.post(
        f"/api/v1/projects/{project_id}/task-dependencies",
        json={"predecessor_task_id": t1_id, "successor_task_id": t2_id},
        headers=headers,
    )
    assert dep1.status_code == 201

    dep2 = await client.post(
        f"/api/v1/projects/{project_id}/task-dependencies",
        json={"predecessor_task_id": t2_id, "successor_task_id": t3_id},
        headers=headers,
    )
    assert dep2.status_code == 201

    # 7. Test Circular Dependency Detection: T3 -> T1 (Must fail with 422!)
    circular_res = await client.post(
        f"/api/v1/projects/{project_id}/task-dependencies",
        json={"predecessor_task_id": t3_id, "successor_task_id": t1_id},
        headers=headers,
    )
    assert circular_res.status_code == 422
    assert "Circular dependency detected" in circular_res.json()["detail"]

    # 8. Test Self-loop: T1 -> T1 (Must fail with 422)
    self_loop_res = await client.post(
        f"/api/v1/projects/{project_id}/task-dependencies",
        json={"predecessor_task_id": t1_id, "successor_task_id": t1_id},
        headers=headers,
    )
    assert self_loop_res.status_code == 422

    # 9. Achieve Milestone
    mls_achieve = await client.post(
        f"/api/v1/projects/{project_id}/milestones/{mls_id}/status",
        json={"target_status": "ACHIEVED", "actual_date": "2026-12-14"},
        headers=headers,
    )
    assert mls_achieve.status_code == 200
    assert mls_achieve.json()["status"] == "ACHIEVED"

    # 10. Cross-Project My Work Endpoint
    my_work_res = await client.get("/api/v1/my-work", headers=headers)
    assert my_work_res.status_code == 200
    my_work_items = my_work_res.json()
    assert len(my_work_items) >= 3
    assert any(i["project_code"] == "PRJ-CRG-01" for i in my_work_items)
