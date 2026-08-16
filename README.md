# ProjectPilot 🚀

> **AI-Assisted Software Project Governance & Delivery Management Platform**

ProjectPilot adalah platform tata kelola proyek perangkat lunak dan manajemen *delivery* end-to-end berbasis AI. Platform ini dirancang secara khusus untuk memandu dan mengamankan seluruh siklus hidup proyek: mulai dari *lead presales*, *discovery*, *requirements engineering*, *planning & estimation*, *timeline & team allocation*, *risk & blocker escalation*, *meeting intelligence*, *deterministic health monitoring*, *evidence-grounded reporting*, *document generation*, hingga *handover & formal project completion*.

Sistem ini mengadopsi prinsip **Evidence-Grounded AI** — integrasi AI (Google Gemini) tidak pernah menghasilkan halusinasi atau memutasi data secara otomatis tanpa persetujuan, melainkan selalu menyertakan sitasi faktual proyek (*requirements*, *tasks*, *milestones*, *blockers*, *decisions*, dan *meeting notes*) dan melalui mekanisme **Human Approval Gate**.

---

## 🏗️ Architecture & Tech Stack

ProjectPilot dirancang dengan arsitektur monorepo modular berkinerja tinggi:

```text
projectpilot/
├── apps/
│   ├── api/          # FastAPI REST API Backend (Python 3.12+ / 3.14)
│   └── web/          # Next.js 15 App Router Frontend (React 19 + Tailwind CSS v4)
├── infra/
│   └── nginx/        # Reverse Proxy Gateway & Hardened Security Headers (CSP, HSTS)
├── scripts/          # Backup & Disaster Recovery Automation Scripts
└── docs/             # Authoritative Architectural & Operational Documents
```

### **Backend (`apps/api`)**
- **Framework**: FastAPI (Python 3.12+ / 3.14) dengan arsitektur domain-driven & modular router
- **Database & ORM**: PostgreSQL dengan SQLAlchemy 2.0 (AsyncIO) & asyncpg driver
- **Database Migrations**: Alembic
- **AI Core Engine**: Google Gemini API (`gemini-2.5-flash`) dengan fallback parser terstruktur, rate limiter, sitasi bukti faktual, dan Human Approval Gate
- **Testing & Verification**: Pytest & pytest-asyncio (18 test suites, 25 test functions, 100% pass)

### **Frontend (`apps/web`)**
- **Framework**: Next.js 15 (App Router) & React 19
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **UX & Accessibility**: Mobile-first responsive touch targets (min. 44px), semantic ARIA landmarks, keyboard navigation (`Cmd+K` Command Palette, drawer dialogs)
- **Features**: Realtime Task Kanban, Dynamic Timeline/Gantt, Scoped Search & AI Q&A Assistant Drawer, Interactive Split Markdown Editor & Live Preview

### **Infrastructure & Security (`infra/`, `compose.prod.yml`)**
- **Orchestration**: Docker Compose (Production multi-container orchestration)
- **Reverse Proxy**: NGINX dengan enkapsulasi jaringan internal (PostgreSQL terisolasi private)
- **Security Headers**: HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- **Diagnostics**: Health liveness (`/api/v1/health`) & Readiness probes (`/api/v1/ready`)
- **Automated DR**: Script backup & restore basis data terverifikasi (`backup_db.sh`, `restore_db.sh`)

---

## 📦 Completed Implementation Phases (18/18 Phases)

| Phase | Modul & Cakupan Fitur | Status |
|---|---|---|
| **Phase 0** | **Repository & Engineering Foundation**: Monorepo Setup, Docker Compose, Base Structured Logging | ✅ Selesai |
| **Phase 1** | **Authentication & RBAC**: JWT Auth, Role-Based Access Control (PM, Lead, Dev, QA, Client), Project & Client Persistence | ✅ Selesai |
| **Phase 2** | **Lead Management**: Presales Pipeline, Contact Management, Atomic Lead-to-Project Conversion | ✅ Selesai |
| **Phase 3** | **Discovery Foundation**: Client Briefs, Discovery Questionnaires, Categories, Structured Answer Gathering | ✅ Selesai |
| **Phase 4** | **Requirements & Scope**: Requirements Specification, Acceptance Criteria, Scope Baseline, Decision Records (ADR) | ✅ Selesai |
| **Phase 5** | **Planning & Tasks**: Planning Hierarchy (Epics & Features), Task Data Model, 5-Column Kanban Workflow & Auto-Calculation | ✅ Selesai |
| **Phase 6** | **Timeline & Team**: Milestones Lifecycle, Team Workload Dashboard, Inline Quick-Add Roster, Task Dependencies Graph | ✅ Selesai |
| **Phase 7** | **Risks & Blockers**: Issues Tracker, 5x5 Risk Matrix, Blocker Escalation Engine, Client Dependencies with SLAs | ✅ Selesai |
| **Phase 8** | **AI Core Infrastructure**: Prompt Registry, Token Usage Tracking, Schema Validator, Robust JSON Sanitizer | ✅ Selesai |
| **Phase 9** | **AI Discovery Intelligence**: AI Brief Analysis, Question Generation, Requirement Extraction & PRD Copilot | ✅ Selesai |
| **Phase 10** | **Meeting Management & AI**: Meeting Logs, AI Action Items Extraction, Atomic Task & Issue Conversion | ✅ Selesai |
| **Phase 11** | **PM Control Center**: Deterministic Project Health Rules Engine v1.0.0, Portfolio Morning Briefing & Diagnostics | ✅ Selesai |
| **Phase 12** | **Evidence-Grounded Reporting**: Weekly & Monthly Reports, Client-Safe Sanitization, Status History Snapshots | ✅ Selesai |
| **Phase 13** | **Document Generation**: FSD, Technical Architecture Runbook, User Manual, Admin Guide Markdown & HTML Export | ✅ Selesai |
| **Phase 14** | **Handover & Project Completion**: Handover Workspace, Deliverables Checklist, Blocker Gates, Formal Project Sign-off | ✅ Selesai |
| **Phase 15** | **Global Search & Grounded AI Q&A**: Global & Project-Scoped Multi-Entity Search, Citation-Backed Project Q&A Drawer | ✅ Selesai |
| **Phase 16** | **Mobile UX & Accessibility Hardening**: Touch Target Audits (>=44px), Mobile Task Switchers, ARIA Dialog Focus Traps | ✅ Selesai |
| **Phase 17** | **Production Hardening & Deployment**: Production Compose, NGINX Gateway, Automated Backup/Restore, Production Runbook | ✅ Selesai |
| **Phase 18** | **Final Verification Gate & System Acceptance**: End-to-End Acceptance Suite, Isolation Integrity, Release Certification | ✅ Selesai |

---

## ✨ Key Feature Highlights & Operational Workflows

### 1. 🔍 Discovery & AI PRD Assistant
* **Brief Analysis**: Analisis kebutuhan awal klien berbasis bukti faktual (*evidence-grounded*).
* **PRD Generator**: Menghasilkan dokumen PRD (*Product Requirement Document*) terstruktur dengan fitur peninjauan dan penyuntingan langsung.

### 2. 📋 Planning, Epics & Features
* **WBS Decomposition**: Pembagian sistem menjadi modul-modul fungsional (*Epics*) dan fitur teknis detail (*Features*).
* **AI Task Auto-Breakdown**: AI Copilot untuk memecah fitur menjadi tiket pengerjaan teknis developer.

### 3. 📊 5-Column Kanban Board & Smart Task Management
* **Kanban Alur Terstruktur**: 5 kolom kanonik (`Backlog`, `In Progress`, `In Review`, `Blocked`, `Done`) yang bersih dan responsif.
* **Auto-Calculate Estimasi Hari**: Menghitung durasi hari kerja secara instan dari rentang **Tanggal Mulai (*Start Date*)** dan **Tenggat Selesai (*Due Date*)**.
* **Inline Quick-Add Member**: Mendaftarkan anggota tim baru langsung dari dalam modal task tanpa perlu berpindah halaman (*Zero Friction*).

### 4. ⏱️ Timeline, Dependencies & Team Allocation
* **Milestones Tracking**: Pengelolaan target pencapaian proyek dengan status interaktif (`Direncanakan`, `Tercapai`, `Terlewat`, `Dibatalkan`).
* **Task Dependencies Graph**: Menghubungkan tugas prasyarat (*Predecessor*) dan penerus (*Successor*) dengan validasi DAG bebas siklus (*cycle-free*).
* **Real-time Team Workload Dashboard**: Kartu personil tim dengan metrik kapasitas harian mingguan, progress bar tugas, daftar tiket aktif (maks. 5 + auto-scroll), dan peringatan blocker otomatis.

---

## 🚀 Quickstart Guide

### 1. Prasyarat Sistem
- Python 3.12+ (disarankan menggunakan virtualenv)
- Node.js 20+ & npm
- Docker & Docker Compose (opsional, untuk deployment kontainer)
- Google Gemini API Key (dari [Google AI Studio](https://aistudio.google.com/))

---

### 2. Menjalankan secara Lokal (Development Mode)

#### A. Konfigurasi Environment
Salin template konfigurasi `.env.example` ke `.env`:
```bash
cp .env.example .env
```

Sesuaikan nilai environment variable:
```ini
ENVIRONMENT=development
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/projectpilot
SECRET_KEY=your-super-secret-jwt-key
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
```

#### B. Backend Setup (`apps/api`)
```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -e .

# Jalankan migrasi basis data
alembic upgrade head

# Jalankan development server
uvicorn projectpilot.main:app --reload --port 8000
```
* Interactive API Documentation (Swagger): `http://localhost:8000/docs`
* Health Check Endpoint: `http://localhost:8000/api/v1/health`
* Readiness Probe: `http://localhost:8000/api/v1/ready`

#### C. Frontend Setup (`apps/web`)
```bash
cd apps/web
npm install
npm run dev
```
* Web Application UI: `http://localhost:3000`

---

### 3. Menjalankan dengan Docker Compose (Production Mode)

ProjectPilot menyediakan konfigurasi orchestration *production-ready* dengan isolasi jaringan dan NGINX gateway:

```bash
# 1. Pastikan file .env sudah dikonfigurasi
# 2. Build dan jalankan seluruh container
docker compose -f compose.prod.yml up -d --build

# 3. Verifikasi status container
docker compose -f compose.prod.yml ps
```

Container yang berjalan:
1. `projectpilot-db`: PostgreSQL 16 (Port 5432 terisolasi, hanya dapat diakses internal)
2. `projectpilot-api`: FastAPI backend dengan auto-run Alembic migration saat boot
3. `projectpilot-web`: Next.js production build (standalone)
4. `projectpilot-gateway`: NGINX reverse proxy di Port 80/443 dengan security header lengkap

---

## 🧪 Pengujian & Verifikasi Kualitas (Quality Gates)

ProjectPilot dilengkapi pengujian otomatis end-to-end yang mencakup 18 fase implementasi.

### **Backend Pytest Suite (25 Tests / 18 Suites)**
```bash
apps/api/.venv/bin/pytest apps/api/tests -v
```

Hasil verifikasi:
```text
apps/api/tests/test_phase1.py PASSED
apps/api/tests/test_phase2_leads.py PASSED
apps/api/tests/test_phase3_discovery.py PASSED
apps/api/tests/test_phase4_requirements_scope.py PASSED
apps/api/tests/test_phase5_planning_tasks.py PASSED
apps/api/tests/test_phase6_timeline_team.py PASSED
apps/api/tests/test_phase7_issues_risks.py PASSED
apps/api/tests/test_phase8_ai_core.py PASSED
apps/api/tests/test_phase9_ai_discovery.py PASSED
apps/api/tests/test_phase10_meetings.py PASSED
apps/api/tests/test_phase11_control_center.py PASSED
apps/api/tests/test_phase12_reports.py PASSED
apps/api/tests/test_phase13_documents.py PASSED
apps/api/tests/test_phase14_handover.py PASSED
apps/api/tests/test_phase15_search_qa.py PASSED
apps/api/tests/test_phase16_quality_hardening.py PASSED
apps/api/tests/test_phase17_production_hardening.py PASSED
apps/api/tests/test_phase18_e2e_acceptance.py PASSED (5 Gate Tests)

======================= 25 passed in ~12s =======================
```

### **Frontend Next.js Build Integrity**
```bash
npm --prefix apps/web run build
```

---

## 🛡️ Prinsip Keamanan & Tata Kelola Data

1. **Strict Project Isolation**: Entitas antar-proyek (Brief, Requirement, Task, Blocker, Meeting, Document, Handover) terisolasi penuh secara kriptografis & query-level. Proyek A tidak dapat membaca atau memutasi entitas Proyek B.
2. **Evidence-Grounded AI & Zero Hallucination**: Seluruh respons dan analisis AI selalu diverifikasi terhadap database proyek dan menyertakan sitasi id entitas sebagai bukti.
3. **Human-in-the-Loop Approval Gate**: Rekomendasi AI (seperti ekstraksi requirement dari meeting/brief) memerlukan konfirmasi eksplisit dari Project Manager sebelum menjadi data resmi.
4. **Completion Gating**: Status proyek tidak dapat diubah menjadi `COMPLETED` apabila masih terdapat *active blocker* yang belum terselesaikan atau item *handover* wajib yang belum disetujui/di-waive.
5. **Client-Safe Reporting**: Filter otomatis menyaring isu internal dan risiko teknis sensitif saat mempublikasikan laporan untuk pihak klien.

---

## 🗄️ Backup & Disaster Recovery

Script otomatisasi tersedia di folder `scripts/`:

- **Backup Database**:
  ```bash
  ./scripts/backup_db.sh
  ```
  Menghasilkan arsip terkompresi `.sql.gz` dengan timestamp di direktori `backups/`.

- **Restore Database**:
  ```bash
  ./scripts/restore_db.sh backups/projectpilot_backup_YYYYMMDD_HHMMSS.sql.gz
  ```

---

## 📄 Lisensi & Kepemilikan
Hak Cipta © 2026 **ProjectPilot Team**. Seluruh hak cipta dilindungi undang-undang.
