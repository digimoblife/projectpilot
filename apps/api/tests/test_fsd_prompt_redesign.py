import pytest
from httpx import AsyncClient
from projectpilot.ai.prompt_registry import PROMPTS, get_prompt


def test_fsd_prompt_structural_and_semantic_redesign():
    """
    Verifies that DOC_FSD:
    1. No longer contains old PRD-like sections
    2. Contains all 12 formal functional specification sections
    3. Establishes the Lead Functional Analyst / Systems Analyst role
    4. Prohibits PRD content drift (vision, market, business case, KPIs, roadmap)
    5. Prohibits Technical Documentation drift (database schema, ORM, internal API code, deployment)
    6. Strictly restricts Tasks to implementation verification only
    7. Provides explicit anti-hallucination disclaimers for missing evidence
    8. Preserves the expected JSON output schema (title, summary, content)
    """
    raw_prompt = PROMPTS["DOC_FSD"]
    formatted_prompt = get_prompt("DOC_FSD", project_name="Logistics Platform", evidence="Test Evidence Data")

    # 1. Verify old PRD-like sections are GONE
    assert "## 1. Pendahuluan & Gambaran Umum Sistem" not in raw_prompt
    assert "## 2. Batasan Ruang Lingkup (Scope Baseline)" not in raw_prompt
    assert "## 3. Spesifikasi Kebutuhan Fungsional & Kriteria Penerimaan" not in raw_prompt
    assert "## 4. Keputusan Arsitektur & Aturan Bisnis" not in raw_prompt

    # 2. Verify all 12 formal FSD sections exist
    required_sections = [
        "## 1. Kontrol Dokumen & Konteks Sistem",
        "## 2. Batasan Ruang Lingkup Fungsional",
        "## 3. Aktor & Peran Fungsional Sistem",
        "## 4. Spesifikasi Kebutuhan Fungsional",
        "## 5. Alur Kerja Fungsional",
        "## 6. Spesifikasi Input, Output & Aturan Validasi",
        "## 7. Aturan Bisnis & Batasan Fungsional",
        "## 8. Perilaku Status & Transisi State",
        "## 9. Penanganan Kesalahan & Pengecualian",
        "## 10. Kriteria Penerimaan Sistem",
        "## 11. Verifikasi Implementasi",
        "## 12. Matriks Ketertelusuran Fungsional",
    ]
    for section in required_sections:
        assert section in raw_prompt, f"Missing required FSD section: {section}"

    # 3. Verify Analyst Role
    assert "Lead Functional Analyst / Systems Analyst" in raw_prompt

    # 4. Verify Synthesis Rules
    assert "RULE A — SOURCE AUTHORITY & PRECEDENCE" in raw_prompt
    assert "RULE B — TASKS ARE IMPLEMENTATION VERIFICATION ONLY" in raw_prompt
    assert "RULE C — UNMAPPED FEATURES" in raw_prompt
    assert "RULE D — IMPLEMENTATION DOES NOT EQUAL APPROVAL" in raw_prompt
    assert "RULE E — STRICT GROUNDING & NO ASSUMPTIONS" in raw_prompt
    assert "RULE F — NO PRD CONTENT DRIFT" in raw_prompt
    assert "RULE G — NO TECHNICAL DOCUMENTATION DRIFT" in raw_prompt
    assert "RULE H — DO NOT FORCE COMPLETENESS" in raw_prompt

    # 5. Verify Anti-Hallucination Disclosures
    assert "Belum ditentukan dalam evidence proyek." in raw_prompt
    assert "Data aktor/role fungsional terstruktur belum tersedia dalam evidence proyek." in raw_prompt
    assert "Workflow fungsional terstruktur belum tersedia dalam evidence proyek." in raw_prompt
    assert "Detail transisi state belum tersedia dalam evidence proyek." in raw_prompt
    assert "Perilaku penanganan exception spesifik belum ditentukan dalam evidence proyek." in raw_prompt

    # 6. Verify Task Treatment
    assert "Task ini menjadi bukti verifikasi implementasi terhadap Feature terkait." in raw_prompt
    assert "A Task NEVER becomes an independent functional requirement" in raw_prompt

    # 7. Verify JSON schema compatibility
    assert '"title": "Functional Specification Document (FSD): {project_name}"' in raw_prompt
    assert '"summary":' in raw_prompt
    assert '"content":' in raw_prompt

    # 8. Verify formatted output has variables substituted cleanly
    assert "Logistics Platform" in formatted_prompt
    assert "Test Evidence Data" in formatted_prompt
    assert "{project_name}" not in formatted_prompt
    assert "{evidence}" not in formatted_prompt


def test_prd_prompt_remains_unchanged():
    """
    Verifies that DOC_PRD was NOT modified and retains its product-level structure.
    """
    prd_prompt = PROMPTS["DOC_PRD"]

    # Product requirements structure
    assert "# Product Requirement Document (PRD): {project_name}" in prd_prompt
    assert "## 1. Latar Belakang & Tujuan Bisnis" in prd_prompt
    assert "## 2. Target Pengguna (User Persona) & Problem Statement" in prd_prompt
    assert "## 3. Batasan Ruang Lingkup & Asumsi (Scope Baseline)" in prd_prompt
    assert "## 4. Modul Utama & Spesifikasi Fitur" in prd_prompt
    assert "## 5. Kebutuhan Non-Fungsional" in prd_prompt
    assert "## 6. Metrik Keberhasilan (KPI & Acceptance Standard)" in prd_prompt


@pytest.mark.asyncio
async def test_fsd_generation_uses_redesigned_prompt_end_to_end(client: AsyncClient):
    """
    End-to-end integration test verifying that generating an FSD draft
    executes without errors using the redesigned prompt.
    """
    # 1. Register & Login PM
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "fsd_prompt_pm@projectpilot.id",
            "password": "Password123!",
            "full_name": "FSD Prompt PM",
            "role": "PROJECT_MANAGER",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "fsd_prompt_pm@projectpilot.id", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Client & Project
    c_res = await client.post(
        "/api/v1/clients",
        json={"name": "Energy Grid", "company_name": "PT Energy Grid"},
        headers=headers,
    )
    client_id = c_res.json()["id"]

    p_res = await client.post(
        "/api/v1/projects",
        json={"name": "Grid Management", "code": "PRJ-GRID-99", "client_id": client_id},
        headers=headers,
    )
    project_id = p_res.json()["id"]

    # 3. Create confirmed requirement
    req_res = await client.post(
        f"/api/v1/projects/{project_id}/requirements",
        json={
            "key": "REQ-01",
            "title": "Substation Load Balancing",
            "description": "System adjusts load when threshold is reached.",
            "category": "TECHNICAL",
            "acceptance_criteria": "Adjust load within 500ms.",
        },
        headers=headers,
    )
    req_id = req_res.json()["id"]
    await client.post(
        f"/api/v1/projects/{project_id}/requirements/{req_id}/status",
        json={"target_status": "CONFIRMED"},
        headers=headers,
    )

    # 4. Generate FSD Document Draft
    fsd_res = await client.post(
        f"/api/v1/projects/{project_id}/documents/generate-draft",
        json={"document_type": "FSD"},
        headers=headers,
    )
    assert fsd_res.status_code == 201
    fsd_data = fsd_res.json()

    assert fsd_data["document_type"] == "FSD"
    assert fsd_data["status"] == "DRAFT"
    assert fsd_data["version"] == 1
    assert "title" in fsd_data and fsd_data["title"]
    assert "content" in fsd_data and fsd_data["content"]
    assert "summary" in fsd_data and fsd_data["summary"]
