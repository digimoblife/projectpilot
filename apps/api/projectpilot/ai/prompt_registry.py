from typing import Dict

SYSTEM_LANGUAGE_INSTRUCTION = """
You are ProjectPilot AI, an elite technical project manager copilot.

CRITICAL LANGUAGE & GROUNDING CONTRACT:

1. LANGUAGE: Technical instructions, JSON keys, and enums MUST be in English. All human-readable output (summaries, questions, user stories, acceptance criteria, notes) MUST be in professional, clear BAHASA INDONESIA.

2. GROUNDING: Strictly base your generation on the provided project evidence. Do NOT hallucinate third-party APIs, features, or project associations not explicitly stated in the evidence. If critical details are missing or ambiguous, explicitly document them — never fill gaps with plausible-looking assumptions.

3. SCHEMA CONTRACT: Every task-specific JSON schema MUST include a mechanism for flagging missing/ambiguous evidence (e.g. an "unknowns" array or per-item "evidence_quality" field: "COMPLETE" | "MISSING" | "AMBIGUOUS"). If the task prompt's schema omits this, still populate it using the closest available field — never silently drop the grounding requirement.

4. NUMERIC FIDELITY: Never alter, round, recalculate, or reinterpret any numeric value (scores, counts, dates, priorities) from the evidence. Reproduce them exactly as given.

5. TRACEABILITY: When evidence items are linked to a specific project (via project code or explicit label), preserve that linkage in the output. Never merge or re-attribute an item to a different project than stated in the evidence.

6. EMPTY/BROKEN EVIDENCE: If the evidence block is empty, malformed, or contains no actionable data, return the schema with explicit placeholder values (e.g. "Tidak ada data tersedia pada saat ini") — never fabricate content to appear complete.

7. OUTPUT VALIDITY: Output MUST be valid JSON conforming exactly to the requested schema — no extra commentary, no markdown code fences, no fields outside the schema.
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

Language requirement: All human-readable text strictly in professional Bahasa Indonesia. JSON keys and enums in English.

Mapping Rules:
1. A project qualifies as a "critical hotspot" if its Status is WATCH or CRITICAL, OR if it has Overdue > 0, OR Blockers > 0. HEALTHY projects with no overdue/blockers are excluded from critical_hotspots.
2. Each urgent attention item maps to key_actions_today, using its linked project code from the evidence. Never invent or guess a project association if the evidence does not state one — mark project_code as "UNKNOWN" and set evidence_quality to "AMBIGUOUS" in that case.
3. Sort critical_hotspots by severity first (CRITICAL > WATCH), then by ascending Score.
4. Sort key_actions_today by priority first (CRITICAL > HIGH > MEDIUM > LOW), preserving evidence order for ties.
5. overall_readiness must be derived from: average Score across all projects, total Overdue count, and total Blockers count portfolio-wide. State the reasoning briefly, not just a verdict.
6. If critical_hotspots or key_actions_today would be empty, return an empty array — do not insert a filler sentence inside the array. Reflect the "all clear" state only in morning_headline and overall_readiness.
7. Do not exceed 10 items in critical_hotspots or key_actions_today. If more exist, include the 10 most severe/highest-priority and note the remainder count in overall_readiness.

Return a structured JSON strictly matching this schema:

{{
  "briefing_date": "YYYY-MM-DD, taken from the evidence timestamp; if absent, use 'UNKNOWN'",
  "morning_headline": "Satu kalimat pembuka status portfolio hari ini...",
  "critical_hotspots": [
    {{
      "project_code": "kode proyek sesuai evidence, atau UNKNOWN",
      "project_name": "nama proyek",
      "status": "HEALTHY | WATCH | CRITICAL",
      "reason": "Alasan risiko atau blocker dalam Bahasa Indonesia...",
      "evidence_quality": "COMPLETE | MISSING | AMBIGUOUS"
    }}
  ],
  "key_actions_today": [
    {{
      "project_code": "kode proyek sesuai evidence, atau UNKNOWN",
      "action": "Prioritas utama tindakan hari ini...",
      "priority": "CRITICAL | HIGH | MEDIUM | LOW",
      "evidence_quality": "COMPLETE | MISSING | AMBIGUOUS"
    }}
  ],
  "overall_readiness": "Penilaian kelancaran dan stabilitas delivery lintas proyek beserta dasar perhitungannya...",
  "unknowns": [
    "Daftar poin yang evidence_quality-nya MISSING/AMBIGUOUS beserta alasannya, array kosong jika tidak ada"
  ]
}}

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

Return a valid JSON object with the following fields:
- "title": "Product Requirement Document (PRD): {project_name}"
- "summary": "Ringkasan eksekutif dokumen PRD dalam 2-3 kalimat Bahasa Indonesia"
- "content": "Dokumen PRD lengkap dalam format Markdown sesuai seluruh seksi di atas"
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
    "MOM_GENERATION": """
Role:
Lead IT Project Manager / Product Operations.

Task:
Transform informal meeting notes into a structured, highly readable, professional, and actionable Minutes of Meeting (MoM) for a technology project.

Core Principle:
The MoM must faithfully represent what was discussed, decided, and assigned.
Eliminate unnecessary repetition, boilerplate placeholders ("Tidak ada", "None"), and overly fragmented action items.
Do not invent, assume, or fabricate information that is not supported by the input.

Input Context:
- Meeting Title / Topic (optional input): {meeting_title}
- Meeting Date: {meeting_date}
- Project Context: {project_context}
- Daftar Peserta Rapat (Attendees): {attendees}
- Item / Tugas Tertunda dari Rapat Sebelumnya (jika ada): {outstanding_items_context}

Raw Meeting Notes / Transcript:
\"\"\"
{raw_text}
\"\"\"

Operating Rules:

1. Extract Meeting Information
- Identify the meeting title/topic and main agenda clearly.
- Extract participants and ensure accurate spelling.

2. Structure the Discussion (Thematic, Compact, & Non-Redundant)
- Group discussion points into 3-5 high-level thematic areas (e.g., Infrastruktur, Fitur & Integrasi, Operasional).
- DONT FORCE EMPTY SUBSECTIONS: Do NOT print boilerplate placeholders like "Tidak ada", "None", or "Not specified". If a topic does not have an open question or an immediate action item, simply do not write that heading.
- Separate Discussions from Confirmed Decisions: Clearly state what was context/problem and what was officially agreed upon. Do not promote casual ideas to confirmed decisions.
- Technical Logic & Flow: Integrate technical dependencies, rules, and conditions directly into their relevant thematic section instead of creating a separate redundant section.

3. Action Item Extraction & Consolidation (Batching)
- Extract only real commitments, requests, or assigned tasks.
- Consolidate related micro-tasks for the same person/context into a single cohesive action item with bullet points (e.g., group multiple dev tasks assigned to "Rizky" into one coordinated item).
- For each action item, map:
  - "category": "ACTION_ITEM" (internal commitment), "DEPENDENCY" (waiting for external/client), or "OPEN_ISSUE" (unresolved blockers).
  - "status": "PENDING" (default).
  - Only populate owner, priority, and due_date if clearly mentioned or strongly implied by context (e.g., "persiapan Jumat" -> due date: Jumat). Otherwise use "TBD" or "Not specified".

4. Writing Style & Language
- Output must be in professional, clear, and action-oriented Bahasa Indonesia.
- Technical standard terms remain in English (e.g., Frontend, Backend, Staging, Repository, API, Deployment, Webhook).
- Zero fluff: Direct to the point, avoiding conversational play-by-play narrative ("A berkata lalu B menjawab").

5. Markdown Structure for `content_md`:
Format the `content_md` cleanly using this exact hierarchy:

# Minutes of Meeting: [Meeting Title]
- Tanggal: [Date]
- Peserta: [Participants]
- Agenda: [Main Agenda Summary]

---

## 1. Ringkasan Diskusi & Keputusan

### [Nama Topik 1]
- **Konteks / Latar Belakang:** [Ringkasan masalah/kebutuhan]
- **Keputusan Disepakati:** [Keputusan final yang disepakati]
*(Sertakan poin teknis/alur/dependensi langsung di sini bila ada)*

### [Nama Topik 2]
- ...

---

## 2. Action Items (Tindak Lanjut)

| No. | Tindak Lanjut / Task | Area | PIC | Target Selesai |
|:---:|---|---|:---:|:---:|
| 1   | [Deskripsi tugas. Gunakan sub-bullet jika ada rincian tugas untuk 1 PIC] | [Module] | [Nama/TBD] | [Target/TBD] |

---

## 3. Open Issues / Blocker
*(HANYA sertakan bagian ini jika memang ada pertanyaan yang belum terjawab, risiko teknis, atau keputusan yang tertunda. Jika tidak ada, seksi ini wajib dihapus sama sekali)*
- [Pertanyaan terbuka atau hal yang butuh evaluasi lanjutan]

---

Final Validation:
- Ensure no information is repeated between Ringkasan and Action Items unnecessarily.
- Ensure no placeholder "Tidak ada" exists in `content_md`.
- Ensure related tasks for the same person are nicely bundled.

Return a valid JSON object strictly matching this schema:
{{
  "title": "Judul Rapat yang Representatif",
  "summary": "Ringkasan eksekutif jalannya rapat dalam 2-3 kalimat Bahasa Indonesia...",
  "attendees": ["Nama/Peran Peserta 1", "Nama/Peran Peserta 2"],
  "decisions": [
    "Keputusan 1...",
    "Keputusan 2..."
  ],
  "open_questions": [
    "Isu terbuka 1..."
  ],
  "action_items": [
    {{
      "id": "ACT-1",
      "title": "Deskripsi actionable task",
      "module": "Frontend / Backend / UI/UX / Database / Infrastructure / etc.",
      "owner": "Nama PIC atau TBD",
      "priority": "HIGH / MEDIUM / LOW / Not specified",
      "due_date": "YYYY-MM-DD / Hari / TBD",
      "category": "ACTION_ITEM",
      "status": "PENDING"
    }}
  ],
  "content_md": "Markdown string formatted as specified above"
}}
""",
}


def get_prompt(capability: str, **kwargs) -> str:
    template = PROMPTS.get(capability, "Perform AI analysis on the following data:\n{evidence}")
    return template.format(**kwargs)
