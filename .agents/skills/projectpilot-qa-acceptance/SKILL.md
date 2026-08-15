---
name: projectpilot-qa-acceptance
description: >-
  Verification checklists, test levels, and acceptance gates for ProjectPilot releases and phases.
  Use when writing unit/integration tests, validating state transitions, checking cross-project data isolation,
  verifying mobile layouts, or auditing release gates before marking a phase complete.
---

# ProjectPilot QA & Acceptance Guide

## 1. Five Verification Levels
Before completing any implementation phase, the following test levels must be executed:

1. **Level 1 — Unit Verification**: Isolated business logic (State transition validators, health score calculations, derived date status, Pydantic schemas).
2. **Level 2 — Integration Verification**: Database queries, Alembic migrations, background job queue workers, activity audit event logging.
3. **Level 3 — UI & Functional Verification**: Kanban drag-and-drop, filter correctness, suggestion review modal (Accept/Edit/Reject), responsive layout at 375px mobile breakpoint.
4. **Level 4 — End-to-End Verification**: Complete lifecycle flow (`Lead` $\rightarrow$ `Project` $\rightarrow$ `Discovery` $\rightarrow$ `Requirements` $\rightarrow$ `Tasks` $\rightarrow$ `Reports` $\rightarrow$ `Handover`).
5. **Level 5 — Production Readiness**: Environment configuration, DB connection pooling, health checks (`/health` & `/health/ready`), private DB networking, backup & restore test.

---

## 2. Release Acceptance Statuses
- **`PASS`**: All automated and manual acceptance criteria are met 100%.
- **`PASS_WITH_NON_BLOCKING_LIMITATIONS`**: Core logic works, minor non-blocking UI/edge cases documented without data integrity risk.
- **`BLOCKED`**: Any failure in:
  - State machine violation (e.g., unauthorized transition to `DONE`).
  - Cross-project data leak (Project A accessing Project B data).
  - Direct AI mutation of authoritative data without PM approval.
  - Project completion without completing Handover gate.
  - Failure in database backup/restore.

---

## 3. Mandatory Gate Checklist per Module
- [ ] **State Machine Enforcement**: Invalid transitions return HTTP 422/400.
- [ ] **Data Isolation**: All queries filter strictly by `project_id` and tenant context.
- [ ] **Shared Task Consistency**: Updating a task on Kanban updates Timeline, Calendar, and List immediately.
- [ ] **Mobile Responsiveness**: Critical PM actions (Status update, Create blocker, Review AI suggestion) are tested and functional on mobile viewport.
- [ ] **Language Consistency**: Machine fields in English, all user-facing content & labels in Bahasa Indonesia.
