# Project Details Refactor

---

## 1. Document Status

- **Status**: Accepted with Documented Limitations
- **Scope**: Project Details (`/projects/[id]`) Workspace Architecture
- **Refactor Baseline**: Phase 4.3 Final Acceptance Audit
- **Date**: 2026-09-17
- **Purpose**: This document serves as the permanent, authoritative architectural and functional reference for the Project Details workspace in ProjectHub. It records the rationale, structural transformations, domain boundaries, transactional rules, and long-term maintenance guardrails established during the remodeling.

---

## 2. Background & Problem Statement

Prior to this remodeling, the Project Details interface suffered from functional fragmentation, visual clutter, and ambiguous domain boundaries:

1. **Navigation Sprawl**: The workspace presented a large number of fragmented top-level and secondary navigation surfaces and routes (`/tasks`, `/planning`, `/timeline`, `/meetings`, `/reports`, `/documents`, `/requirements`, `/handover`), causing high cognitive load for small-to-medium project teams.
2. **Duplicated Workflows**: Planning and execution workflows were split across separate "Tasks", "Planning", and "Timeline" views, creating confusion over where to create tasks, track milestones, or manage capacity.
3. **Domain Conflation**:
   - Structured specification documents (PRD, FSD) were mixed with unstructured file uploads and reference links under a generic "Documents" label.
   - Impediments were recorded in two disconnected formats: a free-text `Task.blocker_reason` on individual tasks and formal rows in the `Blocker` table, causing state divergence.
   - Handover Completion Gate checks were unaware of task-level blockers unless manually re-entered as separate blocker tickets.
4. **Surplus & Dead UI Surfaces**: Overview contained redundant widgets (e.g. active blocker lists, epic progress bars) that duplicated dedicated workspace views, along with disconnected AI Q&A modals.

The refactor consolidated this surface into **exactly eight primary pillars**, eliminated redundant UI surfaces, formalized domain boundaries, and unified task and blocker state via transactional dual-write synchronization.

---

## 3. Scope

### In Scope
- **Route Namespace**: `/projects/[id]` and all direct child routes.
- **Navigation Shell**: 2-tier responsive navigation bar, health/identity card, 7-stage lifecycle stepper, and grounded Project Q&A drawer (`layout.tsx`).
- **Canonical Workspaces**: Overview, Discovery & Scope, PRD, Work, Issues, Communication, Resources, Delivery.
- **Legacy Compatibility Wrappers**: Thin adapter routes (`/tasks`, `/planning`, `/timeline`, `/meetings`, `/reports`, `/documents`, `/handover`) preserving external links, bookmarks, and historical workflows.
- **Transactional Blocker Synchronization**: Option A Dual-Write engine in `TaskService` connecting task status transitions to the `Blocker` domain.

### Out of Scope
- Global application pages outside `/projects/[id]` (e.g. `/projects`, `/dashboard`, `/leads`, `/clients`, `/my-work`, global `/documents`, global `/mom`, global `/reports`).
- Backend binary storage pipelines, S3/GCS object storage adapters, and multipart upload endpoints for Resources.
- Consolidated `/projects/[id]/delivery` umbrella workspace (deferred; `/handover` remains the live Delivery entry point).

---

## 4. Before → After

The remodeling evaluated historical capabilities across Project Details against the rationalization framework:
- **KEEP**: 13 capabilities
- **SIMPLIFY**: 15 capabilities
- **MERGE**: 2 capabilities
- **MOVE**: 7 capabilities
- **REMOVE**: 2 capabilities

### Authoritative CAP Rationalization Mapping

| Capability Identifier & Name | Final Ownership | Decision | Architectural Rationale |
|---|---|:---:|---|
| **CAP-01**: Project Identity & Health Header | Cross-Cutting Shell | **KEEP** | Standardized into permanent layout header across all pillars. |
| **CAP-02**: Project Lifecycle Stepper | Cross-Cutting Shell | **KEEP** | Preserved 7-stage progress indicator in layout header. |
| **CAP-03**: Grounded Project Q&A | Cross-Cutting Shell | **SIMPLIFY** | Extracted from page-level modals into a persistent slide-over drawer in `layout.tsx`. |
| **CAP-04**: Overview Activity Stream | Overview | **KEEP** | Retained on canonical `/projects/[id]` overview dashboard. |
| **CAP-05**: Overview Active Blockers UI Surface | Issues | **REMOVE** | Overview blocker UI was removed to eliminate duplicate triage surfaces; the underlying `Blocker` domain remains active under Issues. |
| **CAP-07**: Overview Epics Progress UI Surface | Work | **REMOVE** | Overview epic progress UI was removed to eliminate duplicate planning widgets; the underlying Epic/Feature/WBS domain remains active under Work. |
| **CAP-10**: Client Briefing & Versioning | Discovery & Scope | **KEEP** | Canonical under `/projects/[id]/discovery`. |
| **CAP-12**: Clarification Questions | Discovery & Scope | **KEEP** | Canonical under `/projects/[id]/discovery`. |
| **CAP-15**: Requirements Repository | Discovery & Scope | **KEEP** | Canonical under `/projects/[id]/requirements`. Traceability anchor. |
| **CAP-18**: Scope Baseline & Change Requests | Discovery & Scope | **SIMPLIFY** | Canonical under `/projects/[id]/scope`. |
| **CAP-20**: Milestones | Work | **MOVE** | Moved under Work (`/work?tab=milestones`). |
| **CAP-21**: Dependencies | Work | **MOVE** | Moved under Work (`/work?tab=timeline`). |
| **CAP-22**: Kanban Task Board | Work | **MOVE** | Moved from standalone `/tasks` into `/work?tab=board`. |
| **CAP-23**: Work Breakdown Structure | Work | **MOVE** | Moved from standalone `/planning` into `/work?tab=wbs`. |
| **CAP-25**: PRD | PRD | **MOVE** | Extracted into dedicated `/prd` workspace powered by `GeneratedDocument`. |
| **CAP-29**: Inline Quick Add Member | Work Team & Capacity | **MERGE** | Duplicate team quick-add modal removed from Overview; unified inside Work Team & Capacity view. |
| **CAP-33**: Meetings | Communication | **MOVE** | Moved from standalone `/meetings` into `/communication?tab=meetings`. |
| **CAP-36**: Reports | Communication | **MOVE** | Moved from standalone `/reports` into `/communication?tab=reports`. |
| **CAP-37**: Documents / GeneratedDocument Surface | GeneratedDocument Domain | **MOVE / ORGANIZE** | `/documents` remains independent for structured documents; Resources is separate. `GeneratedDocument` is NOT converted into `ProjectResource`. |
| **CAP-38**: Handover | Delivery | **MOVE** | Live under `/projects/[id]/handover`. Consolidated `/delivery` deferred. |
| **CAP-39**: Completion Gate | Delivery | **MOVE** | Validates handover readiness and active blockers under `/projects/[id]/handover`. |

---

## 5. Final Architecture

The remodeled Project Details architecture is locked to **exactly eight primary pillars**:

```
Project Details
├── 1. Overview
├── 2. Discovery & Scope
├── 3. PRD
├── 4. Work
├── 5. Issues
├── 6. Communication
├── 7. Resources
└── 8. Delivery
```

### Pillar Specifications

#### 1. Overview
- **Question**: *How is the project doing?*
- **Responsibilities**: Project health, client identity, target completion dates, 7-stage lifecycle progression, and recent audit activity feed.
- **Canonical Route**: `/projects/[id]`
- **Key Entities**: `Project`, `ActivityEvent`.

#### 2. Discovery & Scope
- **Question**: *What are we building, and what is in or out of scope?*
- **Responsibilities**: Client briefing documents (Brief v1/v2/v3), clarification Q&A workflows, structured Requirements repository, Architecture Decision Records (ADR), Scope Baseline itemization, and formal Change Requests.
- **Sub-workspaces**: Brief & Discovery (`/discovery`), Requirements & ADR (`/requirements`), Scope Baseline (`/scope`).
- **Canonical Route**: `/projects/[id]/discovery`
- **Key Entities**: `ProjectBrief`, `DiscoveryQuestion`, `Requirement`, `Decision`, `ScopeItem`, `ScopeChange`.

#### 3. PRD (Product Requirement Document)
- **Question**: *What is the agreed working specification?*
- **Responsibilities**: Authoring and maintaining the formal PRD. Provides Markdown editor with live preview, lifecycle states (`DRAFT` → `UNDER_REVIEW` → `FINAL` → `SUPERSEDED`), immutable version snapshots, factual evidence citations, and Human-Gated AI generation.
- **Canonical Route**: `/projects/[id]/prd`
- **Key Entities**: `GeneratedDocument`, `DocumentEvidence`.

#### 4. Work
- **Question**: *What needs to be done, by whom, and when?*
- **Responsibilities**: Complete operational execution hub unifying Kanban task management, dependency timeline (Gantt), milestone tracking, hierarchical Work Breakdown Structure (Epics → Features → Tasks), and team capacity allocation.
- **Sub-workspaces**: Board (`?tab=board`), Timeline (`?tab=timeline`), Milestones (`?tab=milestones`), WBS (`?tab=wbs`), Team & Capacity (`?tab=team`).
- **Canonical Route**: `/projects/[id]/work`
- **Key Entities**: `Task`, `Epic`, `Feature`, `Milestone`, `ProjectMember`.

#### 5. Issues
- **Question**: *What is preventing or threatening progress?*
- **Responsibilities**: Central register for project impediments and threats: operational Issues, forward-looking Risks, critical Blockers, and overdue Client Dependencies.
- **Canonical Route**: `/projects/[id]/issues`
- **Key Entities**: `Issue`, `Risk`, `Blocker`, `ClientDependency`.

#### 6. Communication
- **Question**: *What has been discussed, decided, and reported?*
- **Responsibilities**: Official project record for internal and client communication: Meeting agendas, attendee logs, minutes of meeting (MoM), AI transcript analysis, action item extraction, and weekly/monthly executive Status Reports.
- **Sub-workspaces**: Notulensi Rapat (`?tab=meetings`), Laporan & Status (`?tab=reports`).
- **Canonical Route**: `/projects/[id]/communication`
- **Key Entities**: `Meeting`, `MeetingAttendee`, `MeetingActionItem`, `StatusReport`.

#### 7. Resources
- **Question**: *Where are the project files and reference links?*
- **Responsibilities**: A NEW, additive project file and link archive for client-provided briefing documents, signed contracts, design assets, Figma links, Git repositories, staging URLs, and exported deliverable packages. Non-DMS static organizer shell.
- **Sub-workspaces**: Berkas Proyek (`?tab=files`), Tautan Referensi (`?tab=links`), Arsip Deliverable (`?tab=deliverables`).
- **Canonical Route**: `/projects/[id]/resources`
- **Key Entities**: Read-only static frontend organizer shell. (Backend persistence deferred).

#### 8. Delivery
- **Question**: *Is the project ready to be handed over and closed?*
- **Responsibilities**: Final project delivery, contractual handover checklist, waiver justifications, sign-off workflow, and Completion Gate validation.
- **Sub-workspaces**: Handover Checklist (`/handover`).
- **Canonical Route**: `/projects/[id]/handover` *(Consolidated `/delivery` umbrella deferred)*.
- **Key Entities**: `Handover`, `HandoverItem`, `CompletionGate`.

---

## 6. Navigation Architecture

The workspace navigation is implemented in `apps/web/src/app/projects/[id]/layout.tsx` using a clean two-tier layout:

- **Tier 1 (Category Pillars)**: 8 primary pillar tabs rendered horizontally with icons, active highlight borders, and responsive mobile horizontal scrolling.
- **Tier 2 (Contextual Sub-tabs)**: Displayed directly below Tier 1 only when the active pillar contains sub-modules (Discovery & Scope, Work, Communication, Resources, Delivery).
- **Cross-Cutting Header**: Houses the project code, name, client badge, health indicator, target completion date, 7-stage lifecycle stepper, and the trigger button for the grounded AI Project Q&A drawer.

### Canonical Navigation Mapping

| Pillar ID | Display Name | Canonical Path | Subroutes / Query Tabs | Active Path Matcher |
|---|---|---|---|---|
| `overview` | Overview | `/projects/[id]` | *None* | Exact match `pathname === /projects/${id}` |
| `discovery-scope` | Discovery & Scope | `/projects/[id]/discovery` | `/discovery`, `/requirements`, `/scope` | Starts with `/discovery`, `/requirements`, or `/scope` |
| `prd` | PRD | `/projects/[id]/prd` | *None* | Starts with `/prd` |
| `work` | Work | `/projects/[id]/work` | `?tab=board`, `?tab=timeline`, `?tab=milestones`, `?tab=wbs`, `?tab=team` | Starts with `/work`, `/tasks`, `/timeline`, or `/planning` |
| `issues` | Issues | `/projects/[id]/issues` | *None* | Starts with `/issues` |
| `communication` | Communication | `/projects/[id]/communication` | `?tab=meetings`, `?tab=reports` | Starts with `/communication`, `/meetings`, or `/reports` |
| `resources` | Resources | `/projects/[id]/resources` | `?tab=files`, `?tab=links`, `?tab=deliverables` | Starts with `/resources` |
| `delivery` | Delivery | `/projects/[id]/handover` | `/handover` | Starts with `/handover` or `/delivery` |

---

## 7. Legacy Route Compatibility

To maintain compatibility and preserve existing deep links, browser bookmarks, client notifications, and operational workflows, legacy routes are retained as thin adapter wrappers:

```
Legacy Route               Canonical View Component                 File Location
─────────────────────────────────────────────────────────────────────────────────────────────
/projects/[id]/tasks     → WorkBoardView (Work > Board)             apps/web/.../tasks/page.tsx
/projects/[id]/planning  → WorkWBSView (Work > WBS)                 apps/web/.../planning/page.tsx
/projects/[id]/timeline  → WorkTimelineView / Milestones / Team     apps/web/.../timeline/page.tsx
/projects/[id]/meetings  → CommunicationMeetingsView (Meetings)     apps/web/.../meetings/page.tsx
/projects/[id]/reports   → CommunicationReportsView (Reports)       apps/web/.../reports/page.tsx
/projects/[id]/documents → Independent GeneratedDocument Surface   apps/web/.../documents/page.tsx
/projects/[id]/handover  → Canonical Delivery Entry Point           apps/web/.../handover/page.tsx
```

### Invariants:
1. Legacy routes **never duplicate domain logic**. They instantiate the exact same canonical view components used by the consolidated workspaces.
2. Visiting a legacy route activates the appropriate parent primary pillar in the top navigation bar.
3. Legacy routes are **compatibility adapters**, not separate primary pillars.

---

## 8. Domain Boundaries

Maintaining clear domain boundaries is essential to prevent architectural erosion:

```
                    ┌─────────────────────────────────────────┐
                    │          REQUIREMENTS (Anchor)          │
                    └────┬───────────────────────────────┬────┘
                         │ Traceability                  │ Evidence
                         ▼                               ▼
               ┌──────────────────┐            ┌──────────────────┐
               │       WORK       │            │       PRD        │
               │  (Epics, Tasks)  │            │(GeneratedDocument│
               └─────────┬────────┘            └──────────────────┘
                         │ Status Dual-Write
                         ▼
               ┌──────────────────┐
               │      ISSUES      │
               │    (Blockers)    │
               └─────────┬────────┘
                         │ Authoritative Gate
                         ▼
               ┌──────────────────┐            ┌──────────────────┐
               │     DELIVERY     │            │    RESOURCES     │
               │ (Completion Gate)│            │(Static Archive)  │
               └──────────────────┘            └──────────────────┘
```

### 1. Requirements as Traceability Anchor
`Requirement` is the single operational bridge between client expectations, specifications, and execution:
- Requirements are generated from client briefs and discovery questions.
- Requirements are referenced as factual citations in PRD documents.
- Requirements link to WBS Epics and Features, giving tasks measurable scope anchors.
- Requirements completion informs the Handover Completion Gate.

### 2. GeneratedDocument vs. ProjectResource
> **IMPORTANT ARCHITECTURAL BOUNDARY:**  
> `GeneratedDocument` MUST NOT be converted into `ProjectResource` merely because both appear under Project Details.

- **`GeneratedDocument`**:
  - The structured, editable Markdown document domain of ProjectHub.
  - Powers PRD, FSD, Technical Specs, and Status Reports.
  - Features version history, status lifecycle (`DRAFT` → `FINAL`), and factual evidence tracking (`DocumentEvidence`).
  - Integrates with Human-Gated AI generation.
  - Live at `/projects/[id]/prd` and independent surface `/projects/[id]/documents`.
- **`Resources`**:
  - A NEW capability gap: a file warehouse and reference directory for static artifacts: PDFs, DOCX, XLSX, client briefings, contracts, brand asset ZIPs, Figma links, Git repos, and deployment URLs.
  - Non-editable; does not generate Markdown; does not participate in document versioning or evidence chains.
  - Exporting a `GeneratedDocument` to PDF or saving it to Resources is strictly optional and never a lifecycle prerequisite.

### 3. Tasks vs. Blockers
- **Tasks** belong exclusively to the **Work** domain.
- **Blockers** belong exclusively to the **Issues** domain.
- When a task cannot proceed, it transitions to `BLOCKED` and records `blocker_reason`. The transactional dual-write mechanism propagates this impediment into the `Blocker` table.
- The **Delivery Completion Gate** queries the `Blocker` table directly to evaluate project health.

---

## 9. Blocker Architecture (Option A — Transactional Dual-Write)

Impediment synchronization between Tasks and Blockers is governed by **Option A — Transactional Dual-Write**, implemented centrally in `TaskService` (`apps/api/projectpilot/services/task_service.py`):

```
                                    POST /tasks/{id}/status
                                               │
                                               ▼
                              ┌────────────────────────────────┐
                              │ TaskService.update_task_status │
                              └────────────────┬───────────────┘
                                               │
                                 Lock Task (SELECT FOR UPDATE)
                                               │
                                               ▼
                                  Target == TaskStatus.BLOCKED?
                                      ├── YES ──► Lock Blocker (SELECT FOR UPDATE)
                                      │           Active blocker exists?
                                      │             ├─ YES: Update description in place
                                      │             └─ NO:  Create Blocker (key: BLK-XXX)
                                      │
                                      └── NO  ──► Leaving BLOCKED?
                                                    └─ YES: Lock & Resolve all active blockers
                                                            (status=RESOLVED, resolved_at=now)
                                               │
                                               ▼
                                   Record ActivityEvent
                                               │
                                               ▼
                                        await db.commit()
```

### Core Invariants:
1. **Atomic Transaction Boundary**: Mutating task status to/from `BLOCKED`, creating/resolving blockers, and logging activity events occur in the same database transaction.
2. **Deadlock-Free Locking Order**: Both entry points (`update_task_status` and `create_blocker`) acquire row-level locks in the strict unidirectional sequence:
   $$\text{Task} \longrightarrow \text{Blocker}$$
3. **Task → Blocker**:
   - Setting `task.status = BLOCKED` generates a conflict-free sequential key (`BLK-001`, `BLK-002`) and creates an active `Blocker` linked to `task_id`.
   - Transitioning a task out of `BLOCKED` (to `IN_PROGRESS` or `TODO`, or an appropriate non-BLOCKED state) marks all associated active/escalated blockers as `RESOLVED`, timestamps `resolved_at`, and appends auto-resolution notes.
4. **Blocker → Task**:
   - Creating a manual blocker with `task_id` automatically sets `Task.status = BLOCKED` and `Task.blocker_reason = "[KEY] Title"`.
   - **Decoupled Resolution**: Resolving a blocker directly from Issues marks the blocker `RESOLVED`, but **intentionally leaves the Task in `BLOCKED` status**. Unblocking a task requires explicit developer/PM action.
5. **Deduplication**: Repeated `BLOCKED` status updates on the same task update the existing active blocker description in place; duplicate active rows are never created.
6. **Historical Preservation**: Historical resolved blockers are preserved for audit and project history during subsequent blocked cycles.
7. **Standalone Blockers**: Project-level blockers with `task_id = NULL` operate independently without affecting tasks.
8. **Completion Gate Authority**: Handover Completion Gate checks the `Blocker` table directly. Active blockers immediately block project completion.

### Concurrency Test Limitation:
- In production, PostgreSQL enforces physical row-level exclusive locks via `SELECT ... FOR UPDATE`.
- In the CI/test suite, SQLite in-memory engine with a single shared session fixture (`tests/conftest.py`) cannot test parallel HTTP requests via `asyncio.gather` due to session commit closure constraints. Rapid sequential transitions and query synthesis are verified via automated tests.

---

## 10. AI Architecture

AI capabilities in Project Details follow strict architectural guardrails:

1. **Contextual Integration**: AI is not a standalone pillar. AI actions are contextual utilities embedded directly inside their respective domains (Discovery, Requirements, PRD, Meetings, Reports, and Layout).
2. **Human Approval Gates**: AI never commits destructive changes or direct database mutations autonomously. All AI suggestions (PRD draft generation, requirements extraction, meeting action item parsing, status reports) require human review, editing, and explicit acceptance.
3. **Grounded Project Q&A**: The Project Q&A drawer (`layout.tsx`) queries `/projects/{id}/qa`, retrieving verified project facts (Requirements, Decisions, Tasks, Blockers, Meetings) with explicit source citations.
4. **Model Standardization**: The active Gemini model across both backend configuration and frontend guidance is standardized to:
   $$\text{gemini-3.5-flash-lite}$$
   - Config: `apps/api/projectpilot/core/config.py` (`GEMINI_MODEL: str = "gemini-3.5-flash-lite"`)
   - Adapter: `apps/api/projectpilot/ai/gemini_adapter.py` (`DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite"`)
   - UI Guidance: `apps/web/src/components/prd/PRDWorkspaceView.tsx` (`gemini-3.5-flash-lite`)

---

## 11. Removed & Simplified Surfaces

To keep the Project Details page lean and focused, several legacy surfaces were intentionally removed or consolidated:

| Removed Surface | Previous Location | Rationale & Successor |
|---|---|---|
| **CAP-05 Active Blockers UI Surface** | Overview Page (`page.tsx`) | Overview blocker UI surface was removed to eliminate duplicate triage surfaces. The underlying `Blocker` domain remains active authoritatively in the **Issues** pillar. Overview focuses on high-level health and stage metrics. |
| **CAP-07 Epics Progress UI Surface** | Overview Page (`page.tsx`) | Overview epic progress UI surface was removed to eliminate duplicate planning widgets. The underlying Epic/Feature/WBS domain remains active authoritatively in **Work > WBS**. |
| **Dead Requirements AI Q&A Modal** | Requirements Page | Removed page-specific disconnected modal state. Replaced by the global, grounded **AI Project Q&A Drawer** in `layout.tsx`. |
| **CAP-29 Team Quick-Add Modal** | Overview Page | Removed redundant team modal from Overview. Consolidated into **Work > Team & Capacity** view. |

---

## 12. Functional Cross-Pillar Flows

| # | Conceptual Flow | Source → Target | Status | Verification Mechanism |
|:---:|---|---|:---:|---|
| 1 | **Brief → Requirements → PRD → Work** | Discovery → PRD → Work | **PASS** | Brief answers extract Requirements; Requirements cite factual evidence in PRD; PRD features break down into Work tasks. Verified in E2E acceptance suite. |
| 2 | **Requirements → Work Traceability** | Discovery → Work | **PASS** | Tasks link to Features and Epics rooted in Scope Baseline. Verified in `test_phase4_requirements_scope.py`. |
| 3 | **Work Task BLOCKED → Blocker → Completion Gate** | Work → Issues → Delivery | **PASS** | Task status changed to `BLOCKED` creates `Blocker`; Handover Gate checks `Blocker` table and denies completion. Verified in `test_blocker_dual_write.py`. |
| 4 | **Issues Blocker → Task BLOCKED** | Issues → Work | **PASS** | Creating task-linked Blocker sets `Task.status = BLOCKED`. Resolving Blocker does not unblock Task. Verified in `test_blocker_dual_write.py`. |
| 5 | **Meetings → Action Items → Work** | Communication → Work | **PASS** | Meeting action items convert directly into Work backlog tasks. Verified in `CommunicationMeetingsView.tsx`. |
| 6 | **Communication → Reports** | Communication | **PASS** | Status Reports synthesize completed tasks, risks, and milestones into formal reports. Verified in `CommunicationReportsView.tsx`. |
| 7 | **GeneratedDocument → Independent Surface** | PRD / Documents | **PASS** | `/documents` remains fully functional as independent document surface. Verified in `documents/page.tsx`. |
| 8 | **Resources → Project Archive** | Resources | **PASS (Shell)** | Resources operates as static archive shell. Backend storage deferred. |
| 9 | **Handover → Completion Gate → Closure** | Delivery | **PASS** | Completion Gate validates zero active blockers before permitting project completion. Verified in `test_handover.py`. |

---

## 13. Validation & Acceptance Baseline

The refactored codebase was verified against the full suite of automated tests and compilers on 2026-09-17:

- **Frontend TypeScript Check**:
  ```bash
  npx tsc --noEmit
  # Result: 0 errors
  ```
- **Next.js Production Build**:
  ```bash
  npm run build
  # Result: Compiled successfully. 14 static pages generated; all dynamic /projects/[id]/* routes verified.
  ```
- **Backend Full Regression Suite**:
  ```bash
  apps/api/.venv/bin/pytest -v
  # Result: 28 passed, 57 warnings in 13.97s
  ```
- **Dedicated Blocker Dual-Write Suite**:
  ```bash
  apps/api/.venv/bin/pytest apps/api/tests/test_blocker_dual_write.py -v
  # Result: 2 passed in 1.21s (13 core domain invariants verified)
  ```
- **Git Tree Cleanliness**:
  ```bash
  git diff --check
  # Result: 0 formatting or whitespace errors
  ```

---

## 14. Deferred Architecture Items

The following items are **intentionally deferred** and must not be treated as implementation defects:

### DEF-01: Consolidated Delivery Umbrella Route (`/projects/[id]/delivery`)
- **Current State**: The primary Delivery pillar routes directly to `/projects/[id]/handover`.
- **Rationale**: Handover and Completion Gate already provide complete delivery functionality. Constructing an additional wrapper page before sign-off metrics are required was deferred to avoid unnecessary abstraction.

### DEF-02: ProjectResource Backend Storage & Upload Pipeline
- **Current State**: Resources is a NEW capability gap implemented as an honest, fully styled frontend organizer shell with category filtering and clear non-DMS architecture callouts.
- **Rationale**: Adding binary object storage, S3/GCS drivers, virus scanning, and multipart uploads requires dedicated storage infrastructure that was outside the scope of page remodeling.

### DEF-03: Multi-Connection PostgreSQL Concurrency Test Harness
- **Current State**: Automated concurrency tests run rapid sequential transitions against an in-memory SQLite fixture.
- **Rationale**: Full multi-threaded connection contention tests require a running PostgreSQL container in CI.

---

## 15. Known Limitations

1. **Resources Shell-Only**: The Resources workspace currently does not persist uploaded files to cloud object storage. Upload buttons display "Segera Hadir" with informational modal explanations.
2. **Delivery Entry Point**: The canonical route for Delivery is currently `/projects/[id]/handover`.
3. **Manual Task Unblocking Required**: Resolving a blocker in Issues does not automatically unblock the corresponding task; developers must explicitly move the task back to `IN_PROGRESS` or `TODO` (or an appropriate non-BLOCKED state). (This is an intentional domain invariant).

---

## 16. Future Evolution Rules (Developer Guardrails)

Future contributors and maintainers **MUST NOT** violate the following architectural guardrails:

1. **Do NOT add a 9th primary pillar**: Project Details has exactly 8 pillars. Do not elevate sub-features (e.g. Team, Milestones, Reports) to primary tabs.
2. **Team & Capacity belongs under Work**: Never re-create Team & Capacity as a standalone top-level tab.
3. **Meetings and Reports belong under Communication**: Keep project communication and governance centralized.
4. **Handover and Completion Gate belong under Delivery**: Do not fragment delivery sign-off into separate pillars.
5. **`/documents` must remain independent from Resources**: Do not map `/documents` into Resources or Delivery.
6. **`GeneratedDocument` and `ProjectResource` must remain separate**: Never convert structured Markdown documents into generic file resources.
7. **Requirements must remain the traceability anchor**: All tasks, PRD citations, and handover checks must trace back to Requirements.
8. **Do NOT recreate CAP-05 or CAP-07 on Overview**: Keep the Overview page lean; do not resurrect duplicate blocker lists or epic progress bars on the overview dashboard.
9. **Do NOT reintroduce duplicate Team Quick Add**: Keep team management inside `Work > Team & Capacity`.
10. **Do NOT create duplicate Work implementations**: Always extend or reuse `WorkBoardView`, `WorkTimelineView`, `WorkMilestonesView`, `WorkWBSView`, and `WorkTeamView`.
11. **Do NOT bypass the Blocker dual-write transaction boundary**: Always use `TaskService` for task status mutations and blocker creation.
12. **Do NOT automatically unblock Tasks on Blocker resolution**: Preserving manual task unblocking ensures engineering awareness.
13. **Resources must NOT become an enterprise DMS**: Do not build document editors, version checkouts, or PDF markup tools inside Resources.
14. **Deferred items must not be implemented as side effects**: Build DEF-01 and DEF-02 only under dedicated, deliberate architectural milestones.
15. **AI must remain contextual**: Never add an "AI" primary navigation pillar. Keep AI features attached to their domain workspaces with mandatory Human Approval Gates.

---

## 17. Refactor Completion Statement

The Project Details remodeling is **officially completed and accepted**.

The 8-pillar navigation shell, canonical workspaces, legacy compatibility wrappers, and transactional blocker dual-write engine constitute the **permanent architectural baseline** for ProjectHub. All known limitations and deferred items are deliberate decisions.

Future feature enhancements and refactors must use this document as their authoritative baseline.
