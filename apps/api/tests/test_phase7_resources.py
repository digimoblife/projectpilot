
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_resources_backend_full_lifecycle_and_security(client: AsyncClient):
    # =========================================================================
    # SETUP: Register 2 PMs and 1 Developer
    # =========================================================================
    # User 1: PM Lead for Project Alpha
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "pm_alpha@projectpilot.id",
            "password": "Password123!",
            "full_name": "PM Alpha Lead",
            "role": "PROJECT_MANAGER",
        },
    )
    pm1_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "pm_alpha@projectpilot.id", "password": "Password123!"},
    )
    token_pm1 = pm1_login.json()["access_token"]
    headers_pm1 = {"Authorization": f"Bearer {token_pm1}"}

    # User 2: PM for Project Beta (Tenant/Project Isolation test)
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "pm_beta@projectpilot.id",
            "password": "Password123!",
            "full_name": "PM Beta Lead",
            "role": "PROJECT_MANAGER",
        },
    )
    pm2_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "pm_beta@projectpilot.id", "password": "Password123!"},
    )
    token_pm2 = pm2_login.json()["access_token"]
    headers_pm2 = {"Authorization": f"Bearer {token_pm2}"}

    # User 3: Developer / Team Member
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "dev_member@projectpilot.id",
            "password": "Password123!",
            "full_name": "Dev Member",
            "role": "TEAM_MEMBER",
        },
    )
    dev_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "dev_member@projectpilot.id", "password": "Password123!"},
    )
    token_dev = dev_login.json()["access_token"]
    headers_dev = {"Authorization": f"Bearer {token_dev}"}
    dev_user_id = dev_login.json().get("user_id")

    # Fetch dev user info to get UUID
    dev_me = await client.get("/api/v1/auth/me", headers=headers_dev)
    dev_user_id = dev_me.json()["id"]

    # =========================================================================
    # CREATE PROJECTS: Project Alpha (by PM1) and Project Beta (by PM2)
    # =========================================================================
    c_res = await client.post(
        "/api/v1/clients",
        json={"name": "Alpha Client", "company_name": "PT Alpha Digital"},
        headers=headers_pm1,
    )
    client_alpha_id = c_res.json()["id"]

    p_alpha_res = await client.post(
        "/api/v1/projects",
        json={"name": "Alpha Mobile Banking", "code": "PRJ-ALPHA-01", "client_id": client_alpha_id},
        headers=headers_pm1,
    )
    project_alpha_id = p_alpha_res.json()["id"]

    c_beta_res = await client.post(
        "/api/v1/clients",
        json={"name": "Beta Client", "company_name": "PT Beta Logistics"},
        headers=headers_pm2,
    )
    client_beta_id = c_beta_res.json()["id"]

    p_beta_res = await client.post(
        "/api/v1/projects",
        json={"name": "Beta Warehouse App", "code": "PRJ-BETA-01", "client_id": client_beta_id},
        headers=headers_pm2,
    )
    project_beta_id = p_beta_res.json()["id"]

    # =========================================================================
    # A. PROJECT ISOLATION & AUTHORIZATION
    # =========================================================================
    # PM2 tries to list resources for Project Alpha -> Expect 403 Forbidden
    unauth_list = await client.get(f"/api/v1/projects/{project_alpha_id}/resources", headers=headers_pm2)
    assert unauth_list.status_code == 403, "Unrelated PM must not access Project Alpha resources"

    # Dev (not yet added as member) tries to list resources for Project Alpha -> Expect 403 Forbidden
    dev_unauth_list = await client.get(f"/api/v1/projects/{project_alpha_id}/resources", headers=headers_dev)
    assert dev_unauth_list.status_code == 403, "Non-member dev must not access Project Alpha resources"

    # Add Dev as ProjectMember to Project Alpha
    add_member_res = await client.post(
        f"/api/v1/projects/{project_alpha_id}/members",
        json={
            "name": "Dev Member",
            "email": "dev_member@projectpilot.id",
            "role": "Frontend Developer",
            "user_id": dev_user_id,
            "capacity_hours_per_week": 40.0,
        },
        headers=headers_pm1,
    )
    assert add_member_res.status_code == 201

    # Dev now has project-level member access to Project Alpha -> Expect 200 OK
    dev_auth_list = await client.get(f"/api/v1/projects/{project_alpha_id}/resources", headers=headers_dev)
    assert dev_auth_list.status_code == 200
    assert dev_auth_list.json() == []

    # =========================================================================
    # B. FILE RESOURCE METADATA & VALIDATION
    # =========================================================================
    # 1. Valid FILE resource
    valid_file_payload = {
        "resource_type": "FILE",
        "name": "Client Requirements Brief v2",
        "description": "Dokumen acuan ruang lingkup awal dari klien.",
        "file_name": "requirements_brief_v2.pdf",
        "file_size_bytes": 1048576,  # 1 MB
        "mime_type": "application/pdf",
        "checksum_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    }
    file_res = await client.post(
        f"/api/v1/projects/{project_alpha_id}/resources",
        json=valid_file_payload,
        headers=headers_pm1,
    )
    assert file_res.status_code == 201
    file_data = file_res.json()
    assert file_data["resource_type"] == "FILE"
    assert file_data["name"] == "Client Requirements Brief v2"
    assert file_data["file_name"] == "requirements_brief_v2.pdf"
    assert file_data["file_size_bytes"] == 1048576
    assert file_data["status"] == "ACTIVE"
    assert file_data["storage_key"] is not None
    assert "requirements_brief_v2.pdf" in file_data["storage_key"]
    file_resource_id = file_data["id"]

    # 2. Invalid FILE: Directory traversal attempt in filename -> Expect 422
    traversal_payload = {
        "resource_type": "FILE",
        "name": "Malicious Traversal",
        "file_name": "../../etc/passwd",
        "file_size_bytes": 500,
        "mime_type": "text/plain",
    }
    traversal_res = await client.post(
        f"/api/v1/projects/{project_alpha_id}/resources",
        json=traversal_payload,
        headers=headers_pm1,
    )
    assert traversal_res.status_code == 422

    # 3. Invalid FILE: Traversal in storage_key -> Expect 422
    storage_traversal = {
        "resource_type": "FILE",
        "name": "Storage Key Exploit",
        "file_name": "safe.pdf",
        "file_size_bytes": 500,
        "mime_type": "application/pdf",
        "storage_key": "projects/alpha/../../root/secret",
    }
    st_res = await client.post(
        f"/api/v1/projects/{project_alpha_id}/resources",
        json=storage_traversal,
        headers=headers_pm1,
    )
    assert st_res.status_code == 422

    # 4. Invalid FILE: Negative file size -> Expect 422
    negative_size_payload = {
        "resource_type": "FILE",
        "name": "Negative Size",
        "file_name": "test.png",
        "file_size_bytes": -10,
        "mime_type": "image/png",
    }
    neg_res = await client.post(
        f"/api/v1/projects/{project_alpha_id}/resources",
        json=negative_size_payload,
        headers=headers_pm1,
    )
    assert neg_res.status_code == 422

    # =========================================================================
    # C. LINK RESOURCE PERSISTENCE & URL VALIDATION
    # =========================================================================
    # 1. Valid LINK resource
    valid_link_payload = {
        "resource_type": "LINK",
        "name": "Design System Figma",
        "description": "High fidelity prototypes and UI design tokens.",
        "url": "https://www.figma.com/file/xyz123/Alpha-Design-System",
        "link_category": "FIGMA",
    }
    link_res = await client.post(
        f"/api/v1/projects/{project_alpha_id}/resources",
        json=valid_link_payload,
        headers=headers_dev,  # Authorized member can also create resources
    )
    assert link_res.status_code == 201
    link_data = link_res.json()
    assert link_data["resource_type"] == "LINK"
    assert link_data["url"] == "https://www.figma.com/file/xyz123/Alpha-Design-System"
    assert link_data["link_category"] == "FIGMA"
    link_resource_id = link_data["id"]

    # 2. Malformed URL: non-http/https (e.g. ftp, javascript) -> Expect 422
    bad_url_payload = {
        "resource_type": "LINK",
        "name": "XSS Vector",
        "url": "javascript:alert(document.cookie)",
    }
    bad_url_res = await client.post(
        f"/api/v1/projects/{project_alpha_id}/resources",
        json=bad_url_payload,
        headers=headers_pm1,
    )
    assert bad_url_res.status_code == 422

    # 3. Malformed URL: relative string -> Expect 422
    relative_url_payload = {
        "resource_type": "LINK",
        "name": "Relative Link",
        "url": "/relative/path/not/absolute",
    }
    rel_url_res = await client.post(
        f"/api/v1/projects/{project_alpha_id}/resources",
        json=relative_url_payload,
        headers=headers_pm1,
    )
    assert rel_url_res.status_code == 422

    # =========================================================================
    # D. DELIVERABLE REGISTRATION & SEMANTICS
    # =========================================================================
    # 1. Register existing FILE as a DELIVERABLE
    deliv_register_payload = {
        "name": "Alpha Mobile APK Release Candidate 1",
        "description": "Final build submitted for UAT testing.",
        "deliverable_version": "v1.0.0-rc1",
        "delivery_date": "2026-09-18",
        "deliverable_status": "SUBMITTED",
    }
    deliv_res = await client.post(
        f"/api/v1/projects/{project_alpha_id}/resources/{file_resource_id}/deliverable",
        json=deliv_register_payload,
        headers=headers_pm1,
    )
    assert deliv_res.status_code == 201
    deliv_data = deliv_res.json()
    assert deliv_data["resource_type"] == "DELIVERABLE"
    assert deliv_data["name"] == "Alpha Mobile APK Release Candidate 1"
    assert deliv_data["deliverable_version"] == "v1.0.0-rc1"
    assert deliv_data["deliverable_status"] == "SUBMITTED"
    assert deliv_data["related_resource_id"] == file_resource_id
    assert deliv_data["related_resource"]["id"] == file_resource_id
    assert deliv_data["related_resource"]["file_name"] == "requirements_brief_v2.pdf"

    # 2. Verify source FILE remained intact and did not mutate resource_type
    verify_file_res = await client.get(
        f"/api/v1/projects/{project_alpha_id}/resources/{file_resource_id}",
        headers=headers_pm1,
    )
    assert verify_file_res.status_code == 200
    assert verify_file_res.json()["resource_type"] == "FILE", "Source resource must retain FILE type"

    # 3. Direct registration of a standalone DELIVERABLE
    standalone_deliv = {
        "resource_type": "DELIVERABLE",
        "name": "Production Handover Sign-off Certificate",
        "description": "Signed acceptance by VP Technology.",
        "deliverable_version": "Final v1.0",
        "deliverable_status": "ACCEPTED",
    }
    std_res = await client.post(
        f"/api/v1/projects/{project_alpha_id}/resources",
        json=standalone_deliv,
        headers=headers_pm1,
    )
    assert std_res.status_code == 201
    std_data = std_res.json()
    assert std_data["resource_type"] == "DELIVERABLE"
    assert std_data["deliverable_status"] == "ACCEPTED"
    assert std_data["related_resource_id"] is None
    std_deliv_id = std_data["id"]

    # =========================================================================
    # E. RESOURCE LISTING, FILTERING & SEARCH
    # =========================================================================
    # Total active resources in Alpha now: 4 (1 File, 1 Link, 2 Deliverables)
    all_res = await client.get(f"/api/v1/projects/{project_alpha_id}/resources", headers=headers_pm1)
    assert all_res.status_code == 200
    all_list = all_res.json()
    assert len(all_list) == 4

    # Filter by type: FILE
    files_only = await client.get(f"/api/v1/projects/{project_alpha_id}/resources?type=FILE", headers=headers_pm1)
    assert files_only.status_code == 200
    assert len(files_only.json()) == 1
    assert files_only.json()[0]["resource_type"] == "FILE"

    # Filter by type: LINK
    links_only = await client.get(f"/api/v1/projects/{project_alpha_id}/resources?type=LINK", headers=headers_pm1)
    assert links_only.status_code == 200
    assert len(links_only.json()) == 1
    assert links_only.json()[0]["resource_type"] == "LINK"

    # Filter by type: DELIVERABLE
    delivs_only = await client.get(f"/api/v1/projects/{project_alpha_id}/resources?type=DELIVERABLE", headers=headers_pm1)
    assert delivs_only.status_code == 200
    assert len(delivs_only.json()) == 2

    # Search filter: "Figma"
    search_figma = await client.get(f"/api/v1/projects/{project_alpha_id}/resources?search=Figma", headers=headers_pm1)
    assert search_figma.status_code == 200
    assert len(search_figma.json()) == 1
    assert search_figma.json()[0]["id"] == link_resource_id

    # =========================================================================
    # F. RESOURCE UPDATE
    # =========================================================================
    # 1. Authorized project member updates link category and description
    patch_payload = {
        "description": "Updated prototype link for mobile screens.",
        "link_category": "PROTOTYPE",
    }
    patch_res = await client.patch(
        f"/api/v1/projects/{project_alpha_id}/resources/{link_resource_id}",
        json=patch_payload,
        headers=headers_dev,
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["description"] == "Updated prototype link for mobile screens."
    assert patch_res.json()["link_category"] == "PROTOTYPE"

    # 2. Unauthorized PM (PM2) attempts to update Project Alpha resource -> Expect 403
    unauth_patch = await client.patch(
        f"/api/v1/projects/{project_alpha_id}/resources/{link_resource_id}",
        json={"name": "Hijacked Link"},
        headers=headers_pm2,
    )
    assert unauth_patch.status_code == 403

    # =========================================================================
    # G. LIFECYCLE: ARCHIVE & RESTORE
    # =========================================================================
    # 1. Archive the Link resource
    archive_res = await client.post(
        f"/api/v1/projects/{project_alpha_id}/resources/{link_resource_id}/archive",
        headers=headers_pm1,
    )
    assert archive_res.status_code == 200
    assert archive_res.json()["status"] == "ARCHIVED"
    assert archive_res.json()["archived_at"] is not None

    # 2. Default list now returns only 3 active resources (the archived link is excluded)
    active_after_archive = await client.get(
        f"/api/v1/projects/{project_alpha_id}/resources",
        headers=headers_pm1,
    )
    assert active_after_archive.status_code == 200
    active_ids = [r["id"] for r in active_after_archive.json()]
    assert link_resource_id not in active_ids
    assert len(active_ids) == 3

    # 3. Listing with include_archived=true returns all 4 resources
    all_incl_archived = await client.get(
        f"/api/v1/projects/{project_alpha_id}/resources?include_archived=true",
        headers=headers_pm1,
    )
    assert all_incl_archived.status_code == 200
    assert len(all_incl_archived.json()) == 4
    archived_item = next(r for r in all_incl_archived.json() if r["id"] == link_resource_id)
    assert archived_item["status"] == "ARCHIVED"

    # 4. Soft-delete alias (DELETE endpoint) test on standalone deliverable
    delete_res = await client.delete(
        f"/api/v1/projects/{project_alpha_id}/resources/{std_deliv_id}",
        headers=headers_pm1,
    )
    assert delete_res.status_code == 200
    assert delete_res.json()["status"] == "ARCHIVED"

    # 5. Restore the Link resource back to ACTIVE
    restore_res = await client.post(
        f"/api/v1/projects/{project_alpha_id}/resources/{link_resource_id}/restore",
        headers=headers_pm1,
    )
    assert restore_res.status_code == 200
    assert restore_res.json()["status"] == "ACTIVE"
    assert restore_res.json()["archived_at"] is None

    # Verify restored link is back in active list
    active_after_restore = await client.get(
        f"/api/v1/projects/{project_alpha_id}/resources",
        headers=headers_pm1,
    )
    assert link_resource_id in [r["id"] for r in active_after_restore.json()]

    # =========================================================================
    # H. CROSS-PROJECT ACCESS INTEGRITY (TAMPERING DEFENSE)
    # =========================================================================
    # Create a resource in Project Beta by PM2
    beta_resource_res = await client.post(
        f"/api/v1/projects/{project_beta_id}/resources",
        json={
            "resource_type": "LINK",
            "name": "Beta Private Git Repo",
            "url": "https://github.com/myorg/beta-logistics",
        },
        headers=headers_pm2,
    )
    assert beta_resource_res.status_code == 201
    beta_resource_id = beta_resource_res.json()["id"]

    # PM1 queries Project Alpha route using Beta's resource_id -> Expect 404 Not Found
    tampered_get = await client.get(
        f"/api/v1/projects/{project_alpha_id}/resources/{beta_resource_id}",
        headers=headers_pm1,
    )
    assert tampered_get.status_code == 404, "Cross-project resource access must return 404 Not Found"

    # PM1 attempts to update Beta's resource through Project Alpha URL -> Expect 404 Not Found
    tampered_patch = await client.patch(
        f"/api/v1/projects/{project_alpha_id}/resources/{beta_resource_id}",
        json={"name": "Attacker Hijack"},
        headers=headers_pm1,
    )
    assert tampered_patch.status_code == 404, "Cross-project resource modification must return 404 Not Found"

    # PM1 attempts to archive Beta's resource through Project Alpha URL -> Expect 404 Not Found
    tampered_archive = await client.post(
        f"/api/v1/projects/{project_alpha_id}/resources/{beta_resource_id}/archive",
        headers=headers_pm1,
    )
    assert tampered_archive.status_code == 404

    # PM1 attempts to register a deliverable linking Beta's resource -> Expect 404 Not Found
    tampered_deliv = await client.post(
        f"/api/v1/projects/{project_alpha_id}/resources/{beta_resource_id}/deliverable",
        json={"name": "Tampered Deliverable", "deliverable_version": "v1.0"},
        headers=headers_pm1,
    )
    assert tampered_deliv.status_code == 404

    # =========================================================================
    # I. DOMAIN ISOLATION GATE: GeneratedDocument != ProjectResource
    # =========================================================================
    # Verify /projects/{project_id}/documents still functions independently
    # and creating resources did NOT create any GeneratedDocument rows.
    docs_list = await client.get(f"/api/v1/projects/{project_alpha_id}/documents", headers=headers_pm1)
    assert docs_list.status_code == 200
    assert len(docs_list.json()) == 0, "No GeneratedDocument should be automatically created by Resources"


@pytest.mark.asyncio
async def test_resources_file_upload_download_and_validation(client: AsyncClient):
    import hashlib

    from projectpilot.services.storage import (
        InMemoryStorageProvider,
        set_storage_provider,
    )

    # Use in-memory storage for clean test isolation
    storage = InMemoryStorageProvider()
    set_storage_provider(storage)

    # 1. Register PM and Dev
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "pm_storage@projectpilot.id",
            "password": "Password123!",
            "full_name": "Storage PM",
            "role": "PROJECT_MANAGER",
        },
    )
    pm_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "pm_storage@projectpilot.id", "password": "Password123!"},
    )
    token_pm = pm_login.json()["access_token"]
    headers_pm = {"Authorization": f"Bearer {token_pm}"}

    # Register unauthorized user
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "unauth_user@projectpilot.id",
            "password": "Password123!",
            "full_name": "Unauth User",
            "role": "PROJECT_MANAGER",
        },
    )
    unauth_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "unauth_user@projectpilot.id", "password": "Password123!"},
    )
    token_unauth = unauth_login.json()["access_token"]
    headers_unauth = {"Authorization": f"Bearer {token_unauth}"}

    # 2. Create Project
    c_res = await client.post(
        "/api/v1/clients",
        json={"name": "Storage Client", "company_name": "PT Storage Test"},
        headers=headers_pm,
    )
    client_id = c_res.json()["id"]

    p_res = await client.post(
        "/api/v1/projects",
        json={"name": "Storage Testing Project", "code": "PRJ-STOR-01", "client_id": client_id},
        headers=headers_pm,
    )
    project_id = p_res.json()["id"]

    # 3. Successful Multipart File Upload
    pdf_bytes = b"%PDF-1.4 Mock Binary Content for Project Architecture Specification"
    expected_checksum = hashlib.sha256(pdf_bytes).hexdigest()

    upload_res = await client.post(
        f"/api/v1/projects/{project_id}/resources/upload",
        files={"file": ("architecture_v1.pdf", pdf_bytes, "application/pdf")},
        data={"name": "Architecture Specification v1", "description": "High level system blueprint"},
        headers=headers_pm,
    )
    assert upload_res.status_code == 201
    upload_data = upload_res.json()
    resource_id = upload_data["id"]
    assert upload_data["resource_type"] == "FILE"
    assert upload_data["name"] == "Architecture Specification v1"
    assert upload_data["file_name"] == "architecture_v1.pdf"
    assert upload_data["file_size_bytes"] == len(pdf_bytes)
    assert upload_data["checksum_sha256"] == expected_checksum
    assert upload_data["storage_key"].startswith(f"projects/{project_id}/resources/{resource_id}/")
    assert await storage.exists(upload_data["storage_key"]) is True

    # 4. Download Uploaded File
    download_res = await client.get(
        f"/api/v1/projects/{project_id}/resources/{resource_id}/download",
        headers=headers_pm,
    )
    assert download_res.status_code == 200
    assert download_res.content == pdf_bytes
    assert "attachment" in download_res.headers.get("content-disposition", "")
    assert "architecture_v1.pdf" in download_res.headers.get("content-disposition", "")
    assert download_res.headers.get("content-length") == str(len(pdf_bytes))

    # 5. Unauthorized User Download -> Expect 403 Forbidden
    unauth_download = await client.get(
        f"/api/v1/projects/{project_id}/resources/{resource_id}/download",
        headers=headers_unauth,
    )
    assert unauth_download.status_code == 403

    # 6. Cross-Project Download Attempt -> Expect 404 Not Found
    # Create project 2 for unauth user
    c2 = await client.post("/api/v1/clients", json={"name": "C2", "company_name": "C2 Corp"}, headers=headers_unauth)
    p2 = await client.post("/api/v1/projects", json={"name": "P2", "code": "PRJ-P2-01", "client_id": c2.json()["id"]}, headers=headers_unauth)
    p2_id = p2.json()["id"]

    cross_download = await client.get(
        f"/api/v1/projects/{p2_id}/resources/{resource_id}/download",
        headers=headers_unauth,
    )
    assert cross_download.status_code == 404

    # 7. Validation: Empty Filename -> Expect 422
    empty_fn_res = await client.post(
        f"/api/v1/projects/{project_id}/resources/upload",
        files={"file": ("", b"some data", "text/plain")},
        headers=headers_pm,
    )
    assert empty_fn_res.status_code == 422

    # 8. Validation: Path Traversal Filename -> Expect 422
    traversal_fn_res = await client.post(
        f"/api/v1/projects/{project_id}/resources/upload",
        files={"file": ("../../etc/shadow", b"root:x", "text/plain")},
        headers=headers_pm,
    )
    assert traversal_fn_res.status_code == 422

    # 9. Validation: Dangerous Executable Format (.exe, .sh, .bat) -> Expect 422
    exe_res = await client.post(
        f"/api/v1/projects/{project_id}/resources/upload",
        files={"file": ("ransomware.exe", b"MZ\x90\x00executable", "application/x-msdownload")},
        headers=headers_pm,
    )
    assert exe_res.status_code == 422

    sh_res = await client.post(
        f"/api/v1/projects/{project_id}/resources/upload",
        files={"file": ("exploit.sh", b"#!/bin/bash\nrm -rf /", "application/x-sh")},
        headers=headers_pm,
    )
    assert sh_res.status_code == 422

    # 10. Validation: Oversized File (> 25 MB) -> Expect 413
    oversized_bytes = b"0" * (25 * 1024 * 1024 + 1024)
    oversized_res = await client.post(
        f"/api/v1/projects/{project_id}/resources/upload",
        files={"file": ("huge_archive.zip", oversized_bytes, "application/zip")},
        headers=headers_pm,
    )
    assert oversized_res.status_code == 413

    # Reset storage provider
    set_storage_provider(None)


@pytest.mark.asyncio
async def test_resources_storage_failure_and_compensating_cleanup(client: AsyncClient):
    from projectpilot.services.storage import (
        InMemoryStorageProvider,
        set_storage_provider,
    )

    # Set up failure-simulating storage provider
    failing_storage = InMemoryStorageProvider()
    failing_storage.simulate_failure = True
    set_storage_provider(failing_storage)

    # 1. Register PM and create project
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "pm_failtest@projectpilot.id",
            "password": "Password123!",
            "full_name": "Failtest PM",
            "role": "PROJECT_MANAGER",
        },
    )
    pm_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "pm_failtest@projectpilot.id", "password": "Password123!"},
    )
    token = pm_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    c_res = await client.post("/api/v1/clients", json={"name": "FC", "company_name": "Fail Corp"}, headers=headers)
    p_res = await client.post("/api/v1/projects", json={"name": "Fail Test", "code": "PRJ-FAIL-01", "client_id": c_res.json()["id"]}, headers=headers)
    project_id = p_res.json()["id"]

    # 2. Upload while storage fails -> Expect 500
    failed_upload = await client.post(
        f"/api/v1/projects/{project_id}/resources/upload",
        files={"file": ("test_doc.pdf", b"Some PDF bytes", "application/pdf")},
        headers=headers,
    )
    assert failed_upload.status_code == 500

    # 3. Confirm no orphan ProjectResource was persisted in database
    list_res = await client.get(f"/api/v1/projects/{project_id}/resources", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 0, "No database record should be left after storage failure"

    # Reset storage provider
    set_storage_provider(None)


@pytest.mark.asyncio
async def test_resources_archived_file_download_and_recoverability(client: AsyncClient):
    from projectpilot.services.storage import (
        InMemoryStorageProvider,
        set_storage_provider,
    )

    storage = InMemoryStorageProvider()
    set_storage_provider(storage)

    # 1. Register & setup project
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "pm_archrecover@projectpilot.id",
            "password": "Password123!",
            "full_name": "Archive Recover PM",
            "role": "PROJECT_MANAGER",
        },
    )
    pm_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "pm_archrecover@projectpilot.id", "password": "Password123!"},
    )
    token = pm_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    c_res = await client.post("/api/v1/clients", json={"name": "AC", "company_name": "Arch Corp"}, headers=headers)
    p_res = await client.post("/api/v1/projects", json={"name": "Arch Project", "code": "PRJ-ARCH-01", "client_id": c_res.json()["id"]}, headers=headers)
    project_id = p_res.json()["id"]

    # 2. Upload file
    file_bytes = b"Important Contract Document for Long Term Archive"
    upload_res = await client.post(
        f"/api/v1/projects/{project_id}/resources/upload",
        files={"file": ("contract_v1.docx", file_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        data={"name": "Master Services Agreement"},
        headers=headers,
    )
    assert upload_res.status_code == 201
    resource_id = upload_res.json()["id"]

    # 3. Archive the resource
    arch_res = await client.post(f"/api/v1/projects/{project_id}/resources/{resource_id}/archive", headers=headers)
    assert arch_res.status_code == 200
    assert arch_res.json()["status"] == "ARCHIVED"

    # 4. Default list excludes archived resource
    list_active = await client.get(f"/api/v1/projects/{project_id}/resources", headers=headers)
    assert list_active.status_code == 200
    assert len(list_active.json()) == 0

    # 5. Authorized project member can still download/recover archived file
    arch_download = await client.get(
        f"/api/v1/projects/{project_id}/resources/{resource_id}/download",
        headers=headers,
    )
    assert arch_download.status_code == 200
    assert arch_download.content == file_bytes

    # 6. Restore resource -> Returns to active list
    restore_res = await client.post(f"/api/v1/projects/{project_id}/resources/{resource_id}/restore", headers=headers)
    assert restore_res.status_code == 200
    assert restore_res.json()["status"] == "ACTIVE"

    list_restored = await client.get(f"/api/v1/projects/{project_id}/resources", headers=headers)
    assert list_restored.status_code == 200
    assert len(list_restored.json()) == 1
    assert list_restored.json()[0]["id"] == resource_id

    # Reset storage provider
    set_storage_provider(None)

