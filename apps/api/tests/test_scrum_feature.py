import uuid
import datetime
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_scrum_feature_flow(client: AsyncClient, monkeypatch):
    # 1. Register & Login PM
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "scrumpm@projectpilot.id",
            "password": "Password123!",
            "full_name": "Scrum Master",
            "role": "PROJECT_MANAGER",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "scrumpm@projectpilot.id", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    pm_headers = {"Authorization": f"Bearer {token}"}

    # Register & Login Developer (Non-PM)
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "scrumdev@projectpilot.id",
            "password": "Password123!",
            "full_name": "Scrum Dev",
            "role": "TEAM_MEMBER",
        },
    )
    dev_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "scrumdev@projectpilot.id", "password": "Password123!"},
    )
    dev_token = dev_login.json()["access_token"]
    dev_headers = {"Authorization": f"Bearer {dev_token}"}

    # 2. Create Client & Project
    c_res = await client.post(
        "/api/v1/clients",
        json={"name": "Scrum Client", "company_name": "PT Scrum"},
        headers=pm_headers,
    )
    client_id = c_res.json()["id"]

    p_res = await client.post(
        "/api/v1/projects",
        json={
            "name": "Scrum Initiative",
            "code": "PRJ-SCRUM",
            "client_id": client_id,
        },
        headers=pm_headers,
    )
    project_id = p_res.json()["id"]
    
    # 3. GET today session -> 404 (not found)
    today_res = await client.get(f"/api/v1/projects/{project_id}/scrum/sessions/today", headers=pm_headers)
    assert today_res.status_code == 404
    
    # 4. POST session
    today_str = datetime.date.today().isoformat()
    sess_res = await client.post(
        f"/api/v1/projects/{project_id}/scrum/sessions",
        json={"session_date": today_str, "notes": "Init"},
        headers=pm_headers
    )
    assert sess_res.status_code == 201
    session_id = sess_res.json()["id"]
    
    # 5. POST session same date -> 409
    dup_res = await client.post(
        f"/api/v1/projects/{project_id}/scrum/sessions",
        json={"session_date": today_str},
        headers=pm_headers
    )
    assert dup_res.status_code == 409
    
    # 6. GET list sessions
    list_res = await client.get(f"/api/v1/projects/{project_id}/scrum/sessions", headers=pm_headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1
    
    # 7. POST entry
    ent_res = await client.post(
        f"/api/v1/projects/{project_id}/scrum/sessions/{session_id}/entries",
        json={"member_name": "Alice", "what_done": "A", "what_next": "B", "issues": None},
        headers=pm_headers
    )
    assert ent_res.status_code == 201
    entry_id = ent_res.json()["id"]
    
    # 8. POST entry same member -> 409
    dup_ent_res = await client.post(
        f"/api/v1/projects/{project_id}/scrum/sessions/{session_id}/entries",
        json={"member_name": "alice", "what_done": "C", "what_next": "D"}, # case insensitive check
        headers=pm_headers
    )
    assert dup_ent_res.status_code == 409
    
    # 9. PUT entry
    put_ent_res = await client.put(
        f"/api/v1/projects/{project_id}/scrum/sessions/{session_id}/entries/{entry_id}",
        json={"member_name": "Alice Updated", "what_done": "AA", "what_next": "BB"},
        headers=pm_headers
    )
    assert put_ent_res.status_code == 200
    assert put_ent_res.json()["member_name"] == "Alice Updated"
    
    # 10. Non-PM write -> 403
    dev_write_res = await client.post(
        f"/api/v1/projects/{project_id}/scrum/sessions/{session_id}/entries",
        json={"member_name": "Bob", "what_done": "X", "what_next": "Y"},
        headers=dev_headers
    )
    assert dev_write_res.status_code == 403
    
    # 11. Wrong project boundary
    fake_proj = str(uuid.uuid4())
    wrong_proj_res = await client.get(f"/api/v1/projects/{fake_proj}/scrum/sessions", headers=pm_headers)
    assert wrong_proj_res.json() == [] # Empty list for wrong project if it works or 404 if project_id validation fails, actually standard is []
    
    wrong_sess_res = await client.get(f"/api/v1/projects/{fake_proj}/scrum/sessions/{session_id}", headers=pm_headers)
    assert wrong_sess_res.status_code == 404
    
    # 12. GET weeks
    weeks_res = await client.get(f"/api/v1/projects/{project_id}/scrum/weeks", headers=pm_headers)
    assert weeks_res.status_code == 200
    
    year = datetime.date.today().isocalendar()[0]
    week = datetime.date.today().isocalendar()[1]
    
    # 13. Preview week
    preview_res = await client.get(f"/api/v1/projects/{project_id}/scrum/weeks/{year}/{week}/preview", headers=pm_headers)
    assert preview_res.status_code == 200
    assert len(preview_res.json()["sessions"]) == 1
    
    # 14. Generate with mocked Gemini (Success)
    async def mock_generate_success(*args, **kwargs):
        return {
            "executive_summary": "Ini summary sukses.",
            "key_achievements": ["Achievement A"],
            "recurring_issues": [],
            "next_week_outlook": "Aman."
        }
    
    from projectpilot.ai.gemini_adapter import gemini_adapter
    monkeypatch.setattr(gemini_adapter, "generate_structured", mock_generate_success)
    
    gen_res = await client.post(f"/api/v1/projects/{project_id}/scrum/weeks/{year}/{week}/generate", headers=pm_headers)
    assert gen_res.status_code == 200
    assert gen_res.json()["ai_summary"] == "Ini summary sukses."
    
    # 15. Generate with mocked Gemini (Failure/Fallback)
    async def mock_generate_fail(*args, **kwargs):
        return {
            "executive_summary": None,
            "key_achievements": [],
            "recurring_issues": [],
            "next_week_outlook": None
        }
    monkeypatch.setattr(gemini_adapter, "generate_structured", mock_generate_fail)
    
    # Change week to avoid constraint error or just re-generate (wait, regenerate updates the same report?)
    # Route does an upsert based on report.project_id, week_year, week_number
    gen_fail_res = await client.post(f"/api/v1/projects/{project_id}/scrum/weeks/{year}/{week}/generate", headers=pm_headers)
    assert gen_fail_res.status_code == 200
    assert gen_fail_res.json()["ai_summary"] is None
    
    # 16. DELETE entry
    del_ent_res = await client.delete(
        f"/api/v1/projects/{project_id}/scrum/sessions/{session_id}/entries/{entry_id}",
        headers=pm_headers
    )
    assert del_ent_res.status_code == 204
