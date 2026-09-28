import hashlib
import stat
import uuid
from pathlib import Path

import pytest
from httpx import AsyncClient
from projectpilot.services.storage import (
    LocalStorageProvider,
    set_storage_provider,
    validate_storage_preflight,
)


@pytest.mark.asyncio
async def test_local_storage_provider_lifecycle_and_recreation_persistence(
    tmp_path: Path,
):
    """
    Verify that LocalStorageProvider persists data across provider re-instantiation,
    matching the Docker persistent volume recreation model.
    """
    storage_dir = tmp_path / "persistent_storage"
    provider1 = LocalStorageProvider(base_dir=storage_dir)

    # 1. Directory creation
    assert storage_dir.exists()
    assert storage_dir.is_dir()

    # 2. Store binary data
    project_id = uuid.uuid4()
    resource_id = uuid.uuid4()
    filename = "system_architecture_spec.pdf"
    key = f"projects/{project_id}/resources/{resource_id}/{filename}"
    binary_payload = (
        b"%PDF-1.4 Mock Binary Specifications for Persistent Storage Architecture"
    )
    content_type = "application/pdf"
    expected_checksum = hashlib.sha256(binary_payload).hexdigest()

    stored_key = await provider1.store(key, binary_payload, content_type)
    assert stored_key == key

    # 3. Verify file and metadata on disk
    expected_disk_path = (
        storage_dir
        / "projects"
        / str(project_id)
        / "resources"
        / str(resource_id)
        / filename
    )
    assert expected_disk_path.is_file()
    assert expected_disk_path.read_bytes() == binary_payload
    meta_path = expected_disk_path.with_suffix(expected_disk_path.suffix + ".meta")
    assert meta_path.is_file()
    assert meta_path.read_text(encoding="utf-8") == content_type

    # 4. Simulate API Container Recreation:
    # A new container starts up, mounting the same persistent volume directory.
    # We instantiate a new LocalStorageProvider over the same storage directory.
    provider2 = LocalStorageProvider(base_dir=storage_dir)
    assert await provider2.exists(key) is True

    # 5. Retrieve content from recreated provider
    retrieved_data, retrieved_ctype = await provider2.get(key)
    assert retrieved_data == binary_payload
    assert retrieved_ctype == content_type
    assert hashlib.sha256(retrieved_data).hexdigest() == expected_checksum

    # 6. Delete object
    deleted = await provider2.delete(key)
    assert deleted is True
    assert await provider2.exists(key) is False
    assert not expected_disk_path.exists()
    assert not meta_path.exists()


@pytest.mark.asyncio
async def test_local_storage_provider_missing_object_error(tmp_path: Path):
    """Verify expected error behavior when objects do not exist in storage."""
    provider = LocalStorageProvider(base_dir=tmp_path)
    missing_key = "projects/nonexistent/resources/none/file.txt"

    assert await provider.exists(missing_key) is False

    with pytest.raises(FileNotFoundError, match="Storage object .* not found"):
        await provider.get(missing_key)

    deleted = await provider.delete(missing_key)
    assert deleted is False


def test_local_storage_provider_path_traversal_prevention(tmp_path: Path):
    """Verify path traversal prevention in LocalStorageProvider."""
    provider = LocalStorageProvider(base_dir=tmp_path)

    traversal_keys = [
        "../../etc/passwd",
        "projects/../../../secrets",
        "projects/123/../../../../../../etc/shadow",
    ]
    for key in traversal_keys:
        with pytest.raises(ValueError, match="Storage path traversal detected"):
            provider._resolve_path(key)


def test_local_storage_directory_creation_and_writable_validation(tmp_path: Path):
    """Verify deep directory creation and writability validation."""
    nested_dir = tmp_path / "deeply" / "nested" / "storage_root"
    assert not nested_dir.exists()

    provider = LocalStorageProvider(base_dir=nested_dir)
    assert nested_dir.exists()
    assert provider.base_dir == nested_dir.resolve()

    # Test preflight validation with unwritable directory
    unwritable_dir = tmp_path / "read_only_dir"
    unwritable_dir.mkdir(parents=True, exist_ok=True)
    unwritable_dir.chmod(stat.S_IREAD | stat.S_IEXEC)

    try:
        with pytest.raises(RuntimeError, match="cannot be created|not writable"):
            LocalStorageProvider(base_dir=unwritable_dir / "sub_store")
    finally:
        # Restore permissions for cleanup
        unwritable_dir.chmod(stat.S_IRWXU)


def test_storage_preflight_validation(tmp_path: Path, monkeypatch):
    """Verify preflight check produces safe summary without leaking secrets."""
    storage_dir = tmp_path / "preflight_storage"
    monkeypatch.setenv("STORAGE_LOCAL_PATH", str(storage_dir))
    monkeypatch.setenv("STORAGE_PROVIDER", "local")

    from projectpilot.core.config import get_settings

    get_settings.cache_clear()
    set_storage_provider(None)

    try:
        result = validate_storage_preflight()
        assert result["status"] == "ready"
        assert result["provider"] == "local"
        assert str(storage_dir.resolve()) in result["path"]

        # Verify no secret keywords leaked in returned dict
        for val in result.values():
            for s in ["projectpilot_secret", "development_secret_key"]:
                assert s not in val.lower()
    finally:
        get_settings.cache_clear()
        set_storage_provider(None)


@pytest.mark.asyncio
async def test_api_resource_upload_and_persistent_download_across_recreation(
    client: AsyncClient,
    tmp_path: Path,
):
    """
    End-to-end integration test:
    1. Upload resource binary via API into LocalStorageProvider.
    2. Simulate container recreation by resetting and re-instantiating LocalStorageProvider
       pointing to the same volume directory.
    3. Verify authenticated download succeeds with exact content and checksum.
    4. Verify missing object returns 404 HTTP error.
    """
    storage_dir = tmp_path / "api_persistent_volume"
    local_provider = LocalStorageProvider(base_dir=storage_dir)
    set_storage_provider(local_provider)

    try:
        # Register PM user
        unique_email = f"pm_storage_{uuid.uuid4().hex[:6]}@projectpilot.id"
        await client.post(
            "/api/v1/auth/register",
            json={
                "email": unique_email,
                "password": "Password123!",
                "full_name": "Storage Persistence PM",
                "role": "PROJECT_MANAGER",
            },
        )
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"email": unique_email, "password": "Password123!"},
        )
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Create Client & Project
        client_res = await client.post(
            "/api/v1/clients",
            json={"name": "Persistent Client", "company_name": "PT Persistent Storage"},
            headers=headers,
        )
        client_id = client_res.json()["id"]

        proj_res = await client.post(
            "/api/v1/projects",
            json={
                "name": "Persistent Storage Project",
                "code": f"PRJ-{uuid.uuid4().hex[:4].upper()}",
                "client_id": client_id,
            },
            headers=headers,
        )
        project_id = proj_res.json()["id"]

        # Upload file binary
        file_bytes = b"CRITICAL SPECIFICATION BINARY: Must survive Docker container recreation intact."
        expected_sha = hashlib.sha256(file_bytes).hexdigest()

        upload_res = await client.post(
            f"/api/v1/projects/{project_id}/resources/upload",
            files={"file": ("blueprint_v1.pdf", file_bytes, "application/pdf")},
            data={
                "name": "Blueprint v1",
                "description": "Persistent blueprint document",
            },
            headers=headers,
        )
        assert upload_res.status_code == 201
        upload_data = upload_res.json()
        resource_id = upload_data["id"]
        storage_key = upload_data["storage_key"]
        assert upload_data["checksum_sha256"] == expected_sha
        assert upload_data["file_size_bytes"] == len(file_bytes)

        # Confirm file is on disk in persistent volume
        disk_path = storage_dir / storage_key
        assert disk_path.is_file()
        assert disk_path.read_bytes() == file_bytes

        # SIMULATE CONTAINER RECREATION:
        # Provider singleton is reset and re-instantiated pointing to the same storage_dir
        recreated_provider = LocalStorageProvider(base_dir=storage_dir)
        set_storage_provider(recreated_provider)

        # Authenticated Download after container recreation
        download_res = await client.get(
            f"/api/v1/projects/{project_id}/resources/{resource_id}/download",
            headers=headers,
        )
        assert download_res.status_code == 200
        assert download_res.content == file_bytes
        assert download_res.headers["content-type"] == "application/pdf"
        assert 'filename="blueprint_v1.pdf"' in download_res.headers.get(
            "content-disposition", ""
        )
        assert hashlib.sha256(download_res.content).hexdigest() == expected_sha

        # Simulate missing file on disk (corrupted or lost storage object)
        disk_path.unlink()
        missing_download = await client.get(
            f"/api/v1/projects/{project_id}/resources/{resource_id}/download",
            headers=headers,
        )
        assert missing_download.status_code == 404
        assert "File content not found in storage" in missing_download.json()["detail"]

    finally:
        set_storage_provider(None)


@pytest.mark.asyncio
async def test_readiness_probe_includes_storage_health(
    client: AsyncClient,
    tmp_path: Path,
):
    """Verify that readiness probe reflects storage readiness."""
    storage_dir = tmp_path / "readiness_storage"
    provider = LocalStorageProvider(base_dir=storage_dir)
    set_storage_provider(provider)

    try:
        ready_res = await client.get("/api/v1/ready")
        assert ready_res.status_code == 200
        data = ready_res.json()
        assert data["status"] == "ready"
        assert data["database"] == "connected"
        assert data["storage"] == "ready"
    finally:
        set_storage_provider(None)
