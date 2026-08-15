import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_documentation_generation_workflow(client: AsyncClient):
    # 1. Register & Login PM
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "docpm@projectpilot.id",
            "password": "Password123!",
            "full_name": "Doc PM Lead",
            "role": "PROJECT_MANAGER",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "docpm@projectpilot.id", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Client & Project
    c_res = await client.post(
        "/api/v1/clients",
        json={"name": "Energy Corp", "company_name": "PT Energi Nusantara"},
        headers=headers,
    )
    client_id = c_res.json()["id"]

    p_res = await client.post(
        "/api/v1/projects",
        json={
            "name": "Smart Grid Monitoring",
            "code": "PRJ-GRID-01",
            "client_id": client_id,
        },
        headers=headers,
    )
    project_id = p_res.json()["id"]

    # Create Requirement, ScopeItem, and Decision for evidence grounding
    req_res = await client.post(
        f"/api/v1/projects/{project_id}/requirements",
        json={
            "key": "REQ-001",
            "title": "Realtime Power Telemetry Stream",
            "description": "Stream power metrics from smart meters to central dashboard.",
            "category": "TECHNICAL",
            "acceptance_criteria": "Stream updates every 500ms over WebSocket.",
        },
        headers=headers,
    )
    assert req_res.status_code == 201

    scope_res = await client.post(
        f"/api/v1/projects/{project_id}/scope-items",
        json={
            "title": "Substation IoT Gateway Module",
            "scope_type": "IN_SCOPE",
        },
        headers=headers,
    )
    assert scope_res.status_code == 201

    dec_res = await client.post(
        f"/api/v1/projects/{project_id}/decisions",
        json={
            "key": "ADR-001",
            "title": "Pilihan Protocol Telemetry: MQTT over TLS",
            "context": "Perlu protocol ringan yang aman untuk transfer telemetry IoT.",
            "decision": "Menggunakan protocol MQTT dengan mutual TLS.",
        },
        headers=headers,
    )
    assert dec_res.status_code == 201

    # 3. Generate FSD Document Draft
    fsd_res = await client.post(
        f"/api/v1/projects/{project_id}/documents/generate-draft",
        json={
            "document_type": "FSD",
            "custom_instructions": "Focus on high-availability telemetry requirements.",
        },
        headers=headers,
    )
    assert fsd_res.status_code == 201
    fsd_data = fsd_res.json()
    doc_id = fsd_data["id"]
    assert fsd_data["document_key"] == "DOC-001"
    assert fsd_data["document_type"] == "FSD"
    assert fsd_data["status"] == "DRAFT"
    assert fsd_data["version"] == 1
    assert len(fsd_data["evidences"]) >= 3

    # 4. Generate User Guide Draft
    ug_res = await client.post(
        f"/api/v1/projects/{project_id}/documents/generate-draft",
        json={"document_type": "USER_GUIDE"},
        headers=headers,
    )
    assert ug_res.status_code == 201
    assert ug_res.json()["document_type"] == "USER_GUIDE"

    # 5. Edit Document Markdown Content
    edit_res = await client.put(
        f"/api/v1/projects/{project_id}/documents/{doc_id}",
        json={
            "title": "Functional Specification Document (FSD) - Smart Grid v1",
            "content": "# FSD Smart Grid\n\n## 1. Pendahuluan\nSistem telemetri grid cerdas.",
        },
        headers=headers,
    )
    assert edit_res.status_code == 200
    assert edit_res.json()["title"] == "Functional Specification Document (FSD) - Smart Grid v1"

    # 6. Finalize Document
    fin_res = await client.post(
        f"/api/v1/projects/{project_id}/documents/{doc_id}/finalize",
        headers=headers,
    )
    assert fin_res.status_code == 200
    assert fin_res.json()["status"] == "FINAL"
    assert fin_res.json()["finalized_at"] is not None

    # 7. Create New Revision Version
    rev_res = await client.post(
        f"/api/v1/projects/{project_id}/documents/{doc_id}/create-version",
        headers=headers,
    )
    assert rev_res.status_code == 200
    rev_data = rev_res.json()
    assert rev_data["version"] == 2
    assert rev_data["status"] == "DRAFT"
    assert rev_data["supersedes_document_id"] == doc_id

    # 8. Query Global Documents Repository
    global_res = await client.get("/api/v1/documents", headers=headers)
    assert global_res.status_code == 200
    assert len(global_res.json()) >= 2
