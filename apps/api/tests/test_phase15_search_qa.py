import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_search_and_project_qa_workflow(client: AsyncClient):
    # 1. Register & Login PM
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "searchpm@projectpilot.id",
            "password": "Password123!",
            "full_name": "Search PM Lead",
            "role": "PROJECT_MANAGER",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "searchpm@projectpilot.id", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Client & 2 Projects
    c_res = await client.post(
        "/api/v1/clients",
        json={"name": "Fintech Global", "company_name": "PT Finansial Global"},
        headers=headers,
    )
    client_id = c_res.json()["id"]

    p1_res = await client.post(
        "/api/v1/projects",
        json={"name": "Payment Gateway Alpha", "code": "PRJ-PGA-01", "client_id": client_id},
        headers=headers,
    )
    alpha_id = p1_res.json()["id"]

    p2_res = await client.post(
        "/api/v1/projects",
        json={"name": "E-Commerce Beta", "code": "PRJ-ECB-01", "client_id": client_id},
        headers=headers,
    )
    beta_id = p2_res.json()["id"]

    # 3. Create records in Project Alpha
    await client.post(
        f"/api/v1/projects/{alpha_id}/requirements",
        json={
            "key": "REQ-001",
            "title": "Dynamic QRIS Payment Integration",
            "description": "Handle dynamic QRIS payments with instant callback webhook.",
            "category": "TECHNICAL",
        },
        headers=headers,
    )

    await client.post(
        f"/api/v1/projects/{alpha_id}/decisions",
        json={
            "key": "ADR-001",
            "title": "Use Redis for Idempotency",
            "context": "Prevent duplicate webhook charges.",
            "decision": "Store idempotency key in Redis cache.",
        },
        headers=headers,
    )

    # 4. Create records in Project Beta
    await client.post(
        f"/api/v1/projects/{beta_id}/requirements",
        json={
            "key": "REQ-002",
            "title": "Shopping Cart Persistence",
            "description": "Cart items saved for 30 days.",
            "category": "FUNCTIONAL",
        },
        headers=headers,
    )

    # 5. Test Global Search
    glob_res = await client.get("/api/v1/search?q=QRIS", headers=headers)
    assert glob_res.status_code == 200
    glob_data = glob_res.json()
    assert glob_data["total_count"] >= 1
    assert any(r["key"] == "REQ-001" for r in glob_data["results"])

    # 6. Test Project-Scoped Search (Isolated to Project Alpha)
    alpha_search = await client.get(f"/api/v1/projects/{alpha_id}/search?q=Redis", headers=headers)
    assert alpha_search.status_code == 200
    alpha_data = alpha_search.json()
    assert alpha_data["total_count"] >= 1
    assert any(r["key"] == "ADR-001" for r in alpha_data["results"])

    # Search for Beta's requirement in Alpha's scope -> Expect 0 results (boundary isolation)
    isolated_search = await client.get(f"/api/v1/projects/{alpha_id}/search?q=Shopping", headers=headers)
    assert isolated_search.status_code == 200
    assert isolated_search.json()["total_count"] == 0

    # 7. Test Grounded Project Q&A
    qa_res = await client.post(
        f"/api/v1/projects/{alpha_id}/qa",
        json={"question": "Bagaimana arsitektur idempotency untuk webhook pembayaran?"},
        headers=headers,
    )
    assert qa_res.status_code == 200
    qa_data = qa_res.json()
    assert qa_data["project_id"] == alpha_id
    assert len(qa_data["answer"]) > 10
    assert qa_data["evidence_count"] >= 2
