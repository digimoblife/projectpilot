# ProjectPilot 🚀

> **AI-Assisted Software Project Governance & Delivery Management Platform**

ProjectPilot adalah platform manajemen proyek perangkat lunak dan tata kelola delivery berbasis AI yang dirancang untuk menjembatani fase *lead presales*, *discovery*, *planning*, *execution*, *monitoring*, hingga *documentation* dan *handover*.

Sistem ini mengedepankan prinsip **Evidence-Grounded AI** — di mana kecerdasan buatan (Google Gemini) tidak pernah menghasilkan halusinasi, melainkan selalu berakar pada bukti faktual proyek (*requirements*, *tasks*, *milestones*, *blockers*, *decisions*, dan *meeting notes*).

---

## 🏗️ Architecture & Tech Stack

ProjectPilot dibangun dengan arsitektur monorepo modular berkinerja tinggi:

### **Backend (`apps/api`)**
- **Framework**: FastAPI (Python 3.12+ / 3.14)
- **Database & ORM**: PostgreSQL dengan SQLAlchemy 2.0 (Asynchronous) & asyncpg
- **Database Migrations**: Alembic
- **AI Core Engine**: Google Gemini API (`gemini-2.5-flash`) dengan fallback parser terstruktur dan Rate Limiter
- **Testing**: Pytest & pytest-asyncio (16 test suites, 100% pass)

### **Frontend (`apps/web`)**
- **Framework**: Next.js 15 (App Router) & React 19
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Architecture**: Dynamic Project Workspaces, State Management terisolasi, Split Markdown Editor & Live Previews

---

## 📦 Core Capabilities & Implemented Phases

| Phase | Modul & Fitur | Status |
|---|---|---|
| **Phase 0** | Repository & Engineering Foundation, Monorepo Setup, Docker Compose, Base Logging | ✅ Selesai |
| **Phase 1** | Authentication & RBAC (PM, Lead, Dev, QA, Client), Project & Client Persistence | ✅ Selesai |
| **Phase 2** | Lead Management, Presales Pipeline, Atomic Lead-to-Project Conversion | ✅ Selesai |
| **Phase 3** | Discovery Foundation, Client Briefs, Discovery Categories & Questionnaires | ✅ Selesai |
| **Phase 4** | Requirements Specification, Acceptance Criteria, Scope Baseline, Decision Records (ADR) | ✅ Selesai |
| **Phase 5** | Planning Hierarchy (Epic & Feature), Task Model, Shared Kanban Workflow | ✅ Selesai |
| **Phase 6** | Timeline & Milestones, Team Capacity Allocation, Task Dependencies Graph | ✅ Selesai |
| **Phase 7** | Issues Tracker, Risk Matrix, Blockers Escalation, Client Dependencies & SLA | ✅ Selesai |
| **Phase 8** | AI Core Infrastructure, Prompt Registry, JSON Sanitizer, Token Usage Tracker | ✅ Selesai |
| **Phase 9** | AI Discovery & Requirement Extraction, Contradiction Detection, Grounded Project Q&A | ✅ Selesai |
| **Phase 10** | Meetings & AI Meeting Intelligence (Action Items extraction, Task/Issue converter) | ✅ Selesai |
| **Phase 11** | PM Control Center, Deterministic Project Health Rules Engine v1.0.0, Portfolio Morning Briefing | ✅ Selesai |
| **Phase 12** | Weekly & Monthly Evidence-Grounded Reporting (Internal & Client-Safe Filtered) | ✅ Selesai |
| **Phase 13** | Documentation Generation (FSD, User Manual, Admin Guide, Technical Architecture Runbook) | ✅ Selesai |

---

## 🚀 Quickstart Guide

### 1. Prasyarat Sistem
- Python 3.12+ (disarankan menggunakan virtualenv)
- Node.js 20+ & npm
- PostgreSQL (atau gunakan SQLite / in-memory untuk mode pengujian lokal)
- Gemini API Key (dari Google AI Studio)

---

### 2. Konfigurasi Environment

Salin file template `.env.example` menjadi `.env` di root project:

```bash
cp .env.example .env
```

Sesuaikan variabel konfigurasi pada `.env`:
```ini
ENVIRONMENT=development
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/projectpilot
SECRET_KEY=your-secure-jwt-secret-key-here
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-2.5-flash
```

---

### 3. Menjalankan Backend (`apps/api`)

1. Masuk ke direktori backend dan aktifkan virtual environment:
   ```bash
   cd apps/api
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -e .
   ```

2. Jalankan migrasi database Alembic:
   ```bash
   alembic upgrade head
   ```

3. Jalankan server backend:
   ```bash
   uvicorn projectpilot.main:app --reload --port 8000
   ```
   * Dokumentasi Swagger API interaktif dapat diakses di: `http://localhost:8000/docs`

---

### 4. Menjalankan Frontend (`apps/web`)

1. Masuk ke direktori frontend dan instal dependensi:
   ```bash
   cd apps/web
   npm install
   ```

2. Jalankan Next.js development server:
   ```bash
   npm run dev
   ```
   * Aplikasi web dapat diakses di: `http://localhost:3000`

---

## 🧪 Pengujian & Verifikasi

### **Backend Automated Tests (Pytest)**
Untuk menjalankan seluruh test suite backend (16 suites):
```bash
apps/api/.venv/bin/pytest apps/api/tests
```

### **Frontend Build & Typecheck (Next.js)**
Untuk memvalidasi integritas compile Next.js (21 routes):
```bash
npm --prefix apps/web run build
```

---

## 🔒 Keamanan & Kebijakan Data
- **Evidence Grounding**: AI tidak diperbolehkan mengarang status atau spesifikasi fungsional tanpa referensi entitas database.
- **Client-Safety Filter**: Laporan untuk audiens eksternal / klien secara otomatis menyaring isu internal yang sensitif.
- **Human Approval Gate**: Rekomendasi AI memerlukan konfirmasi eksplisit dari Project Manager sebelum diterapkan ke status resmi atau task produksi.

---

## 📄 Lisensi
Hak Cipta © 2026 ProjectPilot Team. All rights reserved.
