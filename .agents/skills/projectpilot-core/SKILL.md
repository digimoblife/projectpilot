---
name: projectpilot-core
description: >-
  Core architecture, data model integrity, language policy, and implementation roadmap guide for ProjectPilot.
  Use when building or modifying backend APIs, database models, Alembic migrations, frontend Next.js App Router pages,
  Kanban/Timeline shared task workflows, and project lifecycle state transitions.
---

# ProjectPilot Core Engineering & Architecture Guide

## 1. Golden Rules & Invariants
1. **Modular Monolith First**: FastAPI backend + Next.js App Router frontend + single PostgreSQL database. Do NOT introduce microservices or separate datastores.
2. **Language Policy Separation**:
   - **Machine & Engineering**: All code, database schemas, field names, API keys, and internal enums MUST be in **English** (e.g. `IN_PROGRESS`, `BLOCKED`, `AWAITING_CLIENT_APPROVAL`).
   - **Operational & UI Content**: User-facing UI labels, project data, briefs, requirements, and generated text MUST default to **Bahasa Indonesia** (e.g. label `"Sedang Dikerjakan"`).
3. **Single Source of Truth for Tasks**:
   - Kanban, List, Timeline, Calendar, Milestones, and Reports MUST query the same underlying `Task` entity. Never duplicate task operational state across views.
4. **Deterministic Logic Before AI**:
   - Calculation of overdue flags, blocker counts, milestone variances, and project health (`HEALTHY`, `WATCH`, `AT_RISK`, `CRITICAL`) MUST be calculated deterministically in backend code, NOT inferred by LLM.

---

## 2. Technology Stack & Directory Conventions
```text
projectpilot/
├── apps/
│   ├── web/                     # Next.js App Router + React + TypeScript + Vanilla CSS
│   │   ├── app/                 # Routes: /dashboard, /leads, /projects, /my-work, /reports, /documents
│   │   ├── components/          # Reusable UI components (attention-first design)
│   │   └── lib/                 # API client, tokens, utilities
│   └── api/                     # Python + FastAPI + SQLAlchemy 2.x + Alembic
│       └── projectpilot/
│           ├── api/             # FastAPI routers & schemas
│           ├── domain/          # Entities & domain business logic
│           ├── persistence/     # SQLAlchemy models & Alembic migrations
│           ├── ai/              # Gemini adapter & prompt definitions
│           ├── jobs/            # Postgres-backed durable background worker
│           └── search/          # Postgres FTS utilities
├── docs/                        # Authoritative Project Docs (DO NOT violate)
└── compose.yml                  # Docker Compose (Web + API + Postgres + Worker)
```

---

## 3. Entity & State Reference
* **Core Entities (28+)**: `User`, `Client`, `Stakeholder`, `Lead`, `Project`, `Brief`, `DiscoveryQuestion`, `ClientAnswer`, `Requirement`, `RequirementSource`, `Decision`, `ScopeItem`, `ScopeChange`, `Epic`, `Feature`, `Task`, `TaskDependency`, `Milestone`, `Issue`, `Risk`, `Blocker`, `ClientDependency`, `Meeting`, `AISuggestion`, `Report`, `GeneratedDocument`, `Handover`, `ActivityEvent`.
* **Lead States**: `NEW` → `CONTACTED` → `BRIEF_SCHEDULED` → `QUALIFIED` → `CONVERTED` (or `NOT_QUALIFIED` / `LOST`).
* **Project Lifecycle**: `DISCOVERY` → `REQUIREMENT_DEFINITION` → `PLANNING` → `CLIENT_APPROVAL` → `ACTIVE_DELIVERY` → `HANDOVER` → `COMPLETED`.
* **Task Workflow**: `BACKLOG` → `READY` → `IN_PROGRESS` → `IN_REVIEW` → `QA` → `DONE` (plus `BLOCKED` with reason & owner).

---

## 4. Implementation Phase Guardrails (19 Phases)
Implementation MUST proceed strictly in dependency order:
- **Phase 0–1**: Foundation, Auth, Shell, Client & Project
- **Phase 2–4**: Lead Management, Discovery, Requirements, Decisions & Scope
- **Phase 5–7**: Planning, Tasks & Kanban, Timeline & Milestones, Issues & Blockers
- **Phase 8–10**: AI Core, Discovery/Req Intelligence, Meeting Intelligence
- **Phase 11–15**: PM Control Center, Reports, Document Generator, Handover, Q&A
- **Phase 16–18**: Mobile Polish, Hardening, Final Verification Gate

*For detailed specifications, always reference files in `/docs`.*
