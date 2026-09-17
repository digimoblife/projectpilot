# ProjectPilot 🚀

> **AI-Assisted Software Project Governance & Delivery Management Platform**

ProjectPilot adalah platform tata kelola proyek perangkat lunak dan manajemen *delivery* end-to-end berbasis AI. Platform ini dirancang secara khusus untuk memandu dan mengamankan seluruh siklus hidup proyek: mulai dari *lead presales*, *discovery*, *requirements engineering*, *planning & estimation*, *timeline & team allocation*, *risk & blocker escalation*, *meeting intelligence*, *deterministic health monitoring*, *evidence-grounded reporting*, *document generation*, hingga *handover & formal project completion*.

Sistem ini mengadopsi prinsip **Evidence-Grounded AI** — integrasi AI (Google Gemini) tidak pernah menghasilkan halusinasi atau memutasi data secara otomatis tanpa persetujuan, melainkan selalu menyertakan sitasi faktual proyek (*requirements*, *tasks*, *milestones*, *blockers*, *decisions*, dan *meeting notes*) dan melalui mekanisme **Human Approval Gate**.

---

## 🏛️ Arsitektur 8 Pilar Project Details (The 8 Pillars)

Halaman utama workspace proyek (`/projects/[id]`) mengadopsi arsitektur terpadu **8 Pilar Kanonik** yang menghilangkan fragmentasi navigasi, memperjelas batas domain (*domain boundaries*), dan menyediakan navigasi tab internal yang bersih:

```
Project Details (/projects/[id])
├── 1. Overview         -> Ringkasan eksekutif, status kesehatan, aktivitas, & 7-stage lifecycle stepper
├── 2. Discovery & Scope-> Analisis brief klien, kuesioner klarifikasi, & baseline scope
├── 3. PRD              -> Workspace dokumen PRD interaktif dengan asistensi AI Copilot
├── 4. Work             -> Hub eksekusi tugas (Board, Timeline, Milestones, WBS, Tim & Kapasitas)
├── 5. Issues           -> Manajemen blocker, matriks risiko 5x5, & SLA eskalasi
├── 6. Communication    -> Notulensi rapat (MoM & AI action items) & laporan status mingguan/bulanan
├── 7. Resources        -> Berkas proyek, tautan referensi, & arsip deliverable
└── 8. Delivery         -> Checklist serah-terima operasional, completion gate, & sign-off formal
```

### 1. **Overview** (`/projects/[id]`)
- **Executive Identity & Health**: Kartu metrik kesehatan proyek deterministik (Budget, Schedule, Risk, Quality, Stakeholder) dan 7-stage lifecycle progress indicator.
- **Activity Stream**: Jejak audit komprehensif seluruh aktivitas mutasi entitas proyek secara kronologis.
- **Slide-over AI Q&A Drawer**: Panel asisten AI kontekstual yang dapat dibuka dari mana saja (`Cmd+K` atau trigger drawer) dengan sitasi faktual.

### 2. **Discovery & Scope** (`/projects/[id]/discovery`, `/scope`, `/requirements`)
- **Client Briefing & Clarification**: Pengumpulan brief kebutuhan awal dan kuesioner klarifikasi terstruktur.
- **Scope Baseline & Change Requests**: Penegasan batasan in-scope/out-of-scope dan pencatatan riwayat perubahan ruang lingkup.
- **Scope-to-PRD Handoff**: Banner dan CTA kontekstual yang memandu alur kerja transisi saat pendefinisian ruang lingkup telah matang.

### 3. **PRD (Product Requirement Document)** (`/projects/[id]/prd`)
- **Dedicated PRD Workspace**: Workspace terdedikasi untuk perumusan dokumen spesifikasi produk.
- **AI PRD Copilot**: Generator draf PRD terstruktur berbasis brief dan requirements faktual.
- **Live Markdown Editor & Export**: Penyuntingan dokumen interaktif dengan ekspor multi-format (Markdown, HTML, & PDF).

### 4. **Work (Unified Work Execution Hub)** (`/projects/[id]/work`)
Workspace eksekusi tugas terpadu dengan 5 tab internal:
- **`?tab=board` (Kanban Board)**: 5 kolom kanonik (`Backlog`, `In Progress`, `In Review`, `Blocked`, `Done`), kalkulasi otomatis durasi kerja, inline member quick-add, dan visual scroll cue responsif untuk perangkat mobile.
- **`?tab=timeline` (Timeline & Gantt)**: Visualisasi jadwal, dependensi tugas bebas siklus (DAG), dan peringatan keterlambatan.
- **`?tab=milestones` (Milestones)**: Pelacak target capaian kritis (`Direncanakan`, `Tercapai`, `Terlewat`, `Dibatalkan`).
- **`?tab=wbs` (Work Breakdown Structure)**: Dekomposisi hierarki fungsional (*Epics* dan *Features*) serta auto-breakdown AI.
- **`?tab=team` (Team & Capacity)**: Alokasi beban kerja anggota tim, visualisasi kapasitas mingguan, dan daftar tiket aktif.

### 5. **Issues & Blockers** (`/projects/[id]/issues`)
- **Dual-Write Transactional Synchronization**: Sinkronisasi transaksional otomatis antara status tugas `BLOCKED` dan entitas `Blocker` formal.
- **Decoupled Task Unblocking**: Penyelesaian (*resolve*) Blocker tidak secara otomatis mengubah status Task menjadi status lain — pembukaan blokir tugas tetap berada di bawah kendali workflow eksplisit tim.
- **Explanatory Notice**: Edukasi UI kontekstual yang menjelaskan pemisahan tanggung jawab antara mitigasi blocker dan mutasi status task.
- **5x5 Risk Matrix**: Peta visual probabilitas vs dampak risiko proyek.

### 6. **Communication** (`/projects/[id]/communication`)
Hub komunikasi dan pelaporan tim:
- **`?tab=meetings` (Notulensi Rapat - MoM)**: Pencatatan agenda, transkripsi, ekstraksi AI action items, konversi atomik menjadi task/issue, serta tautan publik MoM terenkapsulasi token.
- **`?tab=reports` (Laporan Status)**: Generator draf laporan mingguan dan bulanan dengan filter otomatis *client-safe* (menyaring isu sensitif internal sebelum dipublikasikan ke klien).

### 7. **Resources** (`/projects/[id]/resources`)
Manajemen aset dan referensi proyek:
- **`?tab=files` (Berkas Proyek)**: Daftar dokumen spesifikasi, panduan, dan aset digital.
- **`?tab=links` (Tautan Referensi)**: Repositori tautan eksternal (Figma, repository, staging, drive).
- **`?tab=deliverables` (Arsip Deliverable)**: Bukti serah terima dan artefak rilis proyek.

### 8. **Delivery & Handover** (`/projects/[id]/handover`)
- **Operational Handover Checklist**: Verifikasi seluruh item serah terima wajib (kode sumber, kredensial, dokumentasi, deployment, pelatihan).
- **Completion Gate Enforcement**: Pencegahan otomatis perubahan status proyek menjadi `COMPLETED` apabila masih terdapat *active blocker* yang belum terselesaikan.
- **Formal Sign-off**: Pencatatan tanda tangan digital persetujuan serah terima oleh Project Manager dan perwakilan Klien.

> **Zero Broken Links**: Seluruh rute historis (`/tasks`, `/planning`, `/timeline`, `/meetings`, `/reports`, `/documents`, `/handover`) dipertahankan melalui *compatibility wrappers* yang otomatis mengarahkan ke pilar dan tab yang sesuai.

---

## 🏗️ Architecture & Tech Stack

ProjectPilot dirancang dengan arsitektur monorepo modular berkinerja tinggi:

```text
projectpilot/
├── apps/
│   ├── api/          # FastAPI REST API Backend (Python 3.11+ / 3.14)
│   └── web/          # Next.js 15 App Router Frontend (React 19 + Tailwind CSS v4)
├── infra/
│   └── nginx/        # Reverse Proxy Gateway & Hardened Security Headers (CSP, HSTS)
├── scripts/          # Backup, Disaster Recovery, & Idempotent Database Seeding Scripts
└── docs/             # Authoritative Architectural & Operational Documents
```

### **Backend (`apps/api`)**
- **Framework**: FastAPI dengan arsitektur *domain-driven* & modular router
- **Database & ORM**: PostgreSQL dengan SQLAlchemy 2.0 (AsyncIO) & asyncpg driver
- **Database Migrations**: Alembic
- **Transactional Engine**: Dual-Write Blocker & Task Synchronization di `TaskService`
- **AI Core Engine**: Google Gemini API (`gemini-2.5-flash`) dengan structured parser, rate limiter, sitasi bukti faktual, dan Human Approval Gate
- **Testing & Verification**: Pytest & pytest-asyncio (19 test suites, 28 test cases, 100% pass)

### **Frontend (`apps/web`)**
- **Framework**: Next.js 15 (App Router) & React 19
- **Styling**: Tailwind CSS v4 & Corporate Monochrome Design System (kontras tinggi, tipografi bersih)
- **Icons**: Lucide React
- **Print Isolation**: Iframe-isolated print styling untuk ekspor multi-halaman PDF dokumen markdown yang rapi
- **UX & Accessibility**: Mobile-first touch targets ($\ge 44\text{px}$), horizontal scroll cues pada kanban board, semantic ARIA landmarks, keyboard navigation (`Cmd+K` Command Palette, drawer dialogs)

### **Infrastructure & Security (`infra/`, `compose.prod.yml`)**
- **Orchestration**: Docker Compose (Production multi-container orchestration)
- **Reverse Proxy**: NGINX dengan enkapsulasi jaringan internal (PostgreSQL terisolasi private)
- **Security Headers**: HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- **Diagnostics**: Health liveness (`/api/v1/health`) & Readiness probes (`/api/v1/ready`)
- **Automated DR & Seeding**: Script backup & restore basis data (`backup_db.sh`, `restore_db.sh`) serta *idempotent seed script* (`seed_db.sh`)

---

## 📦 Completed Implementation Phases (18/18 Phases + Project Details Remodel)

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
| **Phase 10** | **Meeting Management & AI**: Meeting Logs, AI Action Items Extraction, Atomic Task & Issue Conversion, Public MoM Links | ✅ Selesai |
| **Phase 11** | **PM Control Center**: Deterministic Project Health Rules Engine v1.0.0, Portfolio Morning Briefing & Diagnostics | ✅ Selesai |
| **Phase 12** | **Evidence-Grounded Reporting**: Weekly & Monthly Reports, Client-Safe Sanitization, Status History Snapshots | ✅ Selesai |
| **Phase 13** | **Document Generation**: FSD, Technical Architecture Runbook, User Manual, Admin Guide Markdown & HTML Export | ✅ Selesai |
| **Phase 14** | **Handover & Project Completion**: Handover Workspace, Deliverables Checklist, Blocker Gates, Formal Project Sign-off | ✅ Selesai |
| **Phase 15** | **Global Search & Grounded AI Q&A**: Global & Project-Scoped Multi-Entity Search, Citation-Backed Project Q&A Drawer | ✅ Selesai |
| **Phase 16** | **Mobile UX & Accessibility Hardening**: Touch Target Audits ($\ge 44\text{px}$), Mobile Task Switchers, ARIA Dialog Focus Traps | ✅ Selesai |
| **Phase 17** | **Production Hardening & Deployment**: Production Compose, NGINX Gateway, Automated Backup/Restore, Production Runbook | ✅ Selesai |
| **Phase 18** | **Final Verification Gate & System Acceptance**: End-to-End Acceptance Suite, Isolation Integrity, Release Certification | ✅ Selesai |
| **Pillar Remodel** | **Project Details 8-Pillar Architecture & Option A Blocker Dual-Write**: Navigasi 8 pilar, PRD workspace mandiri, dual-write blocker sync, corporate monochrome theme | ✅ Selesai |

---

## 🚀 Quickstart Guide

### 1. Prasyarat Sistem
- Python 3.11+ (disarankan menggunakan virtualenv)
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
pip install -e ".[dev]"

# Jalankan migrasi basis data
alembic upgrade head

# (Opsional) Jalankan data seeding lokal untuk demonstrasi & development
cd ../..
./scripts/seed_db.sh

# Jalankan development server
cd apps/api
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

ProjectPilot dilengkapi pengujian otomatis end-to-end yang mencakup seluruh domain backend dan frontend:

### **Backend Pytest Suite (28 Tests / 19 Suites — 100% Pass)**
```bash
apps/api/.venv/bin/pytest apps/api/tests -v
```

Hasil verifikasi:
```text
apps/api/tests/test_blocker_dual_write.py PASSED (Dual-Write Comprehensive & Transitions)
apps/api/tests/test_health.py PASSED
apps/api/tests/test_mom_generator.py PASSED
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

======================= 28 passed in ~14s =======================
```

### **Frontend Next.js Build & Typecheck Integrity**
```bash
cd apps/web
npx tsc --noEmit
npm run build
```

---

## 🛡️ Prinsip Keamanan & Tata Kelola Data

1. **Strict Project Isolation**: Entitas antar-proyek (Brief, Requirement, Task, Blocker, Meeting, Document, Handover) terisolasi penuh secara kriptografis & query-level. Proyek A tidak dapat membaca atau memutasi entitas Proyek B.
2. **Evidence-Grounded AI & Zero Hallucination**: Seluruh respons dan analisis AI selalu diverifikasi terhadap database proyek dan menyertakan sitasi id entitas sebagai bukti.
3. **Human-in-the-Loop Approval Gate**: Rekomendasi AI (seperti ekstraksi requirement dari meeting/brief) memerlukan konfirmasi eksplisit dari Project Manager sebelum menjadi data resmi.
4. **Option A Decoupled Blocker Unblocking**: Penyelesaian blocker dicatat sebagai mitigasi risiko tanpa memutasi status tiket secara terburu-buru, memastikan tim pengembang secara sadar memindahkan status tiket ke kolom kerja berikutnya.
5. **Completion Gating**: Status proyek tidak dapat diubah menjadi `COMPLETED` apabila masih terdapat *active blocker* yang belum terselesaikan atau item *handover* wajib yang belum disetujui/di-waive.
6. **Client-Safe Reporting**: Filter otomatis menyaring isu internal dan risiko teknis sensitif saat mempublikasikan laporan untuk pihak klien.

---

## 🗄️ Backup, Disaster Recovery & Seeding

Script otomatisasi tersedia di folder `scripts/`:

- **Seed Basis Data Lokal**:
  ```bash
  ./scripts/seed_db.sh
  ```
  Menginisialisasi basis data lokal secara idempoten dengan proyek lengkap, leads, WBS, kanban tasks, blockers, meetings, dan laporan contoh.

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
