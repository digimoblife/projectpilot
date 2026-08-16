from typing import Dict

SYSTEM_LANGUAGE_INSTRUCTION = """
You are ProjectPilot AI, an elite technical project manager copilot.
CRITICAL LANGUAGE & GROUNDING CONTRACT:
1. Technical instructions, JSON keys, and enums MUST be in English.
2. All human-readable output (summaries, questions, user stories, acceptance criteria, notes) MUST be in professional, clear BAHASA INDONESIA.
3. GROUNDING: Strictly base your generation on the provided project evidence. Do NOT hallucinate third-party APIs or features not mentioned. If critical details are missing, explicitly document them as UNKNOWNS with evidence_quality = "MISSING" or "AMBIGUOUS".
4. Standard Discovery Categories to choose from:
   - STAKEHOLDERS_ROLES
   - BUSINESS_GOALS
   - USER_PERSONAS
   - FUNCTIONAL_SCOPE
   - NON_FUNCTIONAL_REQUIREMENTS
   - DATA_MIGRATION
   - INTEGRATIONS_APIS
   - SECURITY_COMPLIANCE
   - TIMELINE_BUDGET
   - DESIGN_BRANDING
   - RISKS_ASSUMPTIONS
   - SUCCESS_METRICS
   - TECHNICAL_ARCHITECTURE
5. Output MUST be valid JSON conforming to the requested schema.
"""

PROMPTS: Dict[str, str] = {
    "BRIEF_ANALYSIS": """
Analyze the following project brief and evidence.
Extract:
1. summary (ringkasan eksekutif proyek dalam Bahasa Indonesia)
2. known_facts (daftar fakta atau kebutuhan yang sudah jelas)
3. unknowns (hal yang belum jelas atau perlu diklarifikasi lebih lanjut)
4. constraints (batasan jadwal, teknologi, regulasi, atau anggaran)

Evidence:
{evidence}
""",
    "DISCOVERY_QUESTION_GEN": """
Analyze the project brief and existing discovery findings.
Generate a list of non-duplicate, high-impact discovery questions to ask the client.
For each question, provide:
- category: One of the 13 standard Discovery Categories (e.g. TECHNICAL_ARCHITECTURE, INTEGRATIONS_APIS, SECURITY_COMPLIANCE, etc.)
- question: The question text in polite, professional Bahasa Indonesia
- context: Why this question is critical for delivery scope
- evidence_quality: EXPLICIT, INFERRED, AMBIGUOUS, or MISSING

Evidence:
{evidence}
""",
    "REQUIREMENT_EXTRACTION": """
Extract candidate functional and non-functional requirements from the project discovery evidence.
For each requirement, provide:
- title: Concise title in Bahasa Indonesia
- description: User story / functional description
- category: SECURITY, INTEGRATIONS, CORE_FEATURE, PERFORMANCE, DATA, or UI_UX
- priority: LOW, MEDIUM, HIGH, or CRITICAL
- acceptance_criteria: List of verifiable acceptance criteria in Bahasa Indonesia
- evidence_quality: EXPLICIT, INFERRED, AMBIGUOUS, or CONFLICTING

Evidence:
{evidence}
""",
    "CONTRADICTION_DETECTION": """
Scan all discovery notes, brief, client answers, and decisions for contradictory or conflicting specifications.
For each contradiction found, provide:
- title: Brief summary of the conflict
- statement_a: First statement/source
- statement_b: Conflicting statement/source
- impact: Delivery or architectural impact
- recommended_resolution: Suggested question to clarify with stakeholder

Evidence:
{evidence}
""",
    "MEETING_ANALYSIS": """
Analyze the following meeting notes, transcript, and attendee context.
Extract structured project knowledge:
1. summary (Ringkasan eksekutif rapat dalam Bahasa Indonesia)
2. decisions (Daftar keputusan yang disepakati bersama konteks & rasionalnya)
3. action_items (Daftar tindak lanjut beserta penanggung jawab / owner_name dan deskripsi)
4. candidate_requirements (Kebutuhan fungsional / teknis baru yang diajukan)
5. risks_blockers (Kendala, isu ketergantungan, atau risiko teknis yang teridentifikasi)

Meeting Content & Context:
{evidence}
""",
    "PROJECT_QA": """
Answer the project manager's question using the project context below.
Provide a clear, grounded answer in Bahasa Indonesia with citations of the relevant brief or discovery answers.

Question: {question}

Evidence:
{evidence}
""",
    "PM_DAILY_SUMMARY": """
Synthesize the following deterministic project health metrics, overdue tasks, blockers, and dependencies into an executive PM daily brief.
Language requirement: Output strictly in professional Bahasa Indonesia.
Return a structured JSON with:
1. executive_summary (Ringkasan kondisi proyek 2-3 kalimat)
2. top_priorities (Daftar 3 hal paling mendesak yang harus diselesaikan hari ini)
3. client_action_needed (Hal yang perlu di-follow up ke klien, jika ada)
4. risk_outlook (Pandangan stabilitas rilis / delivery)

Deterministic Signals:
{evidence}
""",
    "PORTFOLIO_PM_SUMMARY": """
Synthesize the portfolio-wide operational metrics and attention items into a unified daily morning briefing for the Project Manager.
Language requirement: Output strictly in professional Bahasa Indonesia.
Return a structured JSON with:
1. morning_headline (Satu kalimat pembuka status portfolio hari ini)
2. critical_hotspots (Daftar proyek berkategori CRITICAL atau AT_RISK beserta alasannya)
3. key_actions_today (Prioritas utama eksekusi hari ini)
4. overall_readiness (Penilaian kelancaran delivery lintas proyek)

Portfolio Data:
{evidence}
""",
    "REPORT_WEEKLY_INTERNAL": """
Generate a comprehensive, structured Weekly Internal Project Report in Markdown format based on the evidence below.
Language: Professional Bahasa Indonesia.
Include the following Markdown sections:
# Laporan Mingguan Internal: {project_name}
## 1. Ringkasan Eksekutif & Status Kesehatan
## 2. Kemajuan Deliverable & Task Selesai
## 3. Kendala, Blocker & Eskalasi Teknis
## 4. Status Milestone & Rencana Kerja Minggu Depan

Evidence:
{evidence}
""",
    "REPORT_WEEKLY_CLIENT": """
Generate an executive, professional Weekly Client Progress Report in Markdown format based on the evidence below.
Language: Professional, polished Bahasa Indonesia for client executives.
Include the following Markdown sections:
# Laporan Progres Mingguan: {project_name}
## 1. Highlight Pencapaian Minggu Ini
## 2. Status Milestone & Deliverables
## 3. Kebutuhan Masukan / Aksi dari Pihak Klien
## 4. Rencana Kerja Periode Berikutnya

Evidence:
{evidence}
""",
    "REPORT_MONTHLY_INTERNAL": """
Generate a Monthly Internal Governance Report in Markdown format based on the evidence below.
Language: Professional Bahasa Indonesia.
Include executive summary, monthly milestone achievement rate, operational risk analysis, and resource recommendations.

Evidence:
{evidence}
""",
    "REPORT_MONTHLY_CLIENT": """
Generate a Monthly Client Steering Committee Report in Markdown format based on the evidence below.
Language: Professional Bahasa Indonesia.
Include executive summary, key roadmap deliverables completed, upcoming milestones, and steering approvals needed.

Evidence:
{evidence}
""",
    "DOC_FSD": """
Generate a comprehensive, formal Functional Specification Document (FSD) in Markdown format based on the project requirements and scope evidence below.
Language: Professional Bahasa Indonesia.
Include sections:
# Functional Specification Document (FSD): {project_name}
## 1. Pendahuluan & Gambaran Umum Sistem
## 2. Batasan Ruang Lingkup (Scope Baseline)
## 3. Spesifikasi Kebutuhan Fungsional & Kriteria Penerimaan
## 4. Keputusan Arsitektur & Aturan Bisnis
## 5. Matriks Ketertelusuran (Traceability Matrix)

Evidence:
{evidence}
""",
    "DOC_USER_GUIDE": """
Generate an intuitive, user-friendly End-User Guide in Markdown format based on the features and requirements below.
Language: Clear, step-by-step Bahasa Indonesia.
Include sections:
# Panduan Pengguna (User Manual): {project_name}
## 1. Pengenalan Aplikasi & Alur Utama
## 2. Petunjuk Penggunaan Fitur Utama (Langkah demi Langkah)
## 3. FAQ & Solusi Kendala Umum

Evidence:
{evidence}
""",
    "DOC_ADMIN_GUIDE": """
Generate an Administrator & Operations Guide in Markdown format based on the technical decisions and configurations below.
Language: Professional Bahasa Indonesia.
Include sections:
# Panduan Administrator & Operasional: {project_name}
## 1. Manajemen Hak Akses & Peran Pengguna
## 2. Konfigurasi Sistem & Parameter Integrasi
## 3. Prosedur Monitoring & Troubleshooting

Evidence:
{evidence}
""",
    "DOC_TECHNICAL_DOCUMENTATION": """
Generate an Architecture & Technical Implementation Runbook in Markdown format based on the architectural decisions, database models, and APIs below.
Language: Professional technical Bahasa Indonesia.
Include sections:
# Dokumentasi Teknis & Arsitektur: {project_name}
## 1. Arsitektur Sistem & Komponen
## 2. Diagram Alur Data & Integrasi API
## 3. Keputusan Desain & Pertimbangan Keamanan
## 4. Panduan Deployment & Environment Setup

Evidence:
{evidence}
""",
    "DOC_PRD": """
Generate a comprehensive Product Requirement Document (PRD) in Markdown format based on the project brief, client discovery answers, and approved requirements below.
Language: Professional, structured Bahasa Indonesia.
Include sections:
# Product Requirement Document (PRD): {project_name}
## 1. Latar Belakang & Tujuan Bisnis
## 2. Target Pengguna (User Persona) & Problem Statement
## 3. Batasan Ruang Lingkup & Asumsi (Scope Baseline)
## 4. Modul Utama & Spesifikasi Fitur
## 5. Kebutuhan Non-Fungsional (Performa, Keamanan, Aksesibilitas)
## 6. Metrik Keberhasilan (KPI & Acceptance Standard)

Evidence:
{evidence}
""",
    "EPIC_FEATURE_GEN": """
Analyze the following project brief, requirements, and discovery evidence.
Extract high-level modules (Epics) and specific sub-features (Features) in Bahasa Indonesia.
Return a structured JSON object with the key "epics":
[
  {{
    "key": "EPIC-01",
    "title": "Judul Modul / Epic (contoh: Modul Company Profile & Portofolio)",
    "description": "Deskripsi cakupan modul ini",
    "features": [
      {{
        "key": "FEAT-01",
        "title": "Judul Sub-Fitur (contoh: Halaman Showcase Portofolio Interaktif)",
        "description": "Deskripsi fungsional sub-fitur ini",
        "requirement_key": "REQ-001 (opsional, jika terkait requirement tertentu)"
      }}
    ]
  }}
]

Evidence:
{evidence}
""",
    "TASK_BREAKDOWN_GEN": """
Analyze the following Epics, Features, and Requirements evidence for the project.
Break down each module into concrete, actionable technical tasks for software engineers, UI/UX designers, and QA testers.
IMPORTANT: Do NOT estimate hours; set estimated_hours strictly to 0 for all tasks (PM will input manually).
Return a structured JSON object with the key "tasks":
[
  {{
    "key": "TASK-01",
    "epic_key": "EPIC-01",
    "feature_key": "FEAT-01 (opsional)",
    "title": "Judul Task Teknis (contoh: Slicing UI Form Kontak & Validasi Input)",
    "description": "Deskripsi teknis pengerjaan task",
    "priority": "HIGH / MEDIUM / LOW / CRITICAL",
    "estimated_hours": 0,
    "suggested_role": "FRONTEND / BACKEND / UI_UX / QA / DEVOPS"
  }}
]

Evidence:
{evidence}
""",
}


def get_prompt(capability: str, **kwargs) -> str:
    template = PROMPTS.get(capability, "Perform AI analysis on the following data:\n{evidence}")
    return template.format(**kwargs)
