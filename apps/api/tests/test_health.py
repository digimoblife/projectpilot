import pytest
from httpx import ASGITransport, AsyncClient
from projectpilot.main import app


@pytest.mark.asyncio
async def test_root_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "ProjectPilot API"
    assert data["version"] == "0.1.0"


@pytest.mark.asyncio
async def test_health_liveness():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "projectpilot-api"
