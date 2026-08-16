import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_production_health_and_readiness_diagnostics(client: AsyncClient):
    # 1. Test Liveness Probe
    health_res = await client.get("/api/v1/health")
    assert health_res.status_code == 200
    health_data = health_res.json()
    assert health_data["status"] == "ok"
    assert health_data["service"] == "projectpilot-api"
    assert "environment" in health_data

    # 2. Test Readiness Probe (/api/v1/ready)
    ready_res = await client.get("/api/v1/ready")
    assert ready_res.status_code == 200
    ready_data = ready_res.json()
    assert ready_data["status"] == "ready"
    assert ready_data["database"] == "connected"
    assert ready_data["ai_service"] in ["configured", "unconfigured"]

    # 3. Test Readiness Probe Alias (/api/v1/health/ready)
    alias_res = await client.get("/api/v1/health/ready")
    assert alias_res.status_code == 200
    alias_data = alias_res.json()
    assert alias_data["status"] == "ready"
    assert alias_data["database"] == "connected"
