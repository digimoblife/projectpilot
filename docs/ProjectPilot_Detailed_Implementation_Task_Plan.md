# ProjectPilot — Detailed Implementation Task Plan

**Document Type:** Detailed Implementation Task Plan  
**Project:** ProjectPilot  
**Status:** Draft v1.0  
**Date:** 15 August 2026  
**Primary User:** Project Manager  
**Primary AI Model:** Gemini 3.5 Flash-Lite  
**Default Operational Content Language:** Bahasa Indonesia  

**Authoritative Parent Documents:**  
1. ProjectPilot — Product Vision & Scope  
2. ProjectPilot — Product Requirements Document (PRD)  
3. ProjectPilot — Workflow & State Specification  
4. ProjectPilot — Information Architecture & Data Model  
5. ProjectPilot — AI Functional Specification  
6. ProjectPilot — Technical Architecture  
7. ProjectPilot — UI/UX Product Specification  

---

# 1. Purpose

This document converts the approved ProjectPilot product specifications into an implementation sequence.

It defines:

- implementation phases;
- dependencies;
- module order;
- scope per phase;
- required deliverables;
- integration gates;
- verification expectations;
- explicit completion criteria;
- deferred work boundaries.

The purpose is to prevent implementation from:

- inventing new requirements;
- skipping prerequisite work;
- coupling AI features to unstable data models;
- building UI before workflow rules are enforced;
- duplicating task data between Kanban and Timeline;
- introducing infrastructure without demonstrated need.

This plan is authoritative for implementation sequencing unless explicitly revised.

---

# 2. Implementation Principles

## 2.1 Source Lock

Every implementation task must read the relevant authoritative documents before coding.

Implementation must not determine requirements from memory alone.

## 2.2 Scope Discipline

A task may clarify implementation details but must not expand product scope without an explicit product decision.

## 2.3 Foundation Before AI

AI-dependent features must not be built before their authoritative data entities and approval workflows exist.

## 2.4 Backend Authority Before Rich UI

Critical state transitions and integrity rules must exist server-side before UI interactions depend on them.

## 2.5 One Task Source of Truth

Kanban, List, Timeline, Calendar, Milestone, My Work, and reporting must use the same Task model.

## 2.6 Evidence Before Generated Artifacts

Reports and documents should only be implemented after the source project data required to generate them exists.

## 2.7 Incremental Vertical Slices

Each phase should produce usable end-to-end behavior where possible.

## 2.8 Verification at Every Gate

A phase is not complete merely because code exists.

Its functional and regression criteria must pass.

---

# 3. High-Level Implementation Roadmap

Recommended implementation order:

```text
PHASE 0  — Repository & Engineering Foundation
PHASE 1  — Authentication, App Shell, Client & Project Foundation
PHASE 2  — Lead Management & Lead Conversion
PHASE 3  — Discovery Foundation
PHASE 4  — Requirements, Decisions & Scope
PHASE 5  — Planning, Task Model & Kanban
PHASE 6  — Timeline, Milestones, Team & Dependencies
PHASE 7  — Issues, Risks, Blockers & Client Dependencies
PHASE 8  — AI Core Infrastructure
PHASE 9  — AI Discovery & Requirement Intelligence
PHASE 10 — Meetings & AI Meeting Intelligence
PHASE 11 — PM Control Center & Project Health
PHASE 12 — Weekly & Monthly Reporting
PHASE 13 — Documentation Generation
PHASE 14 — Handover & Project Completion
PHASE 15 — Project Q&A & Search Expansion
PHASE 16 — Mobile UX Completion & Accessibility
PHASE 17 — Production Hardening & Deployment
PHASE 18 — Final Verification Gate
```

---

# 4. Phase Dependency Map

```text
0 Foundation
   ↓
1 Auth + Client + Project
   ↓
2 Lead
   ↓
3 Discovery
   ↓
4 Requirement + Decision + Scope
   ↓
5 Planning + Task + Kanban
   ↓
6 Timeline + Milestone + Team + Dependencies
   ↓
7 Issues + Risks + Blockers + Client Dependencies
   ↓
8 AI Core
   ├─────────────┐
   ↓             ↓
9 AI Discovery   10 Meetings AI
   └──────┬──────┘
          ↓
11 PM Control Center / Health
          ↓
12 Reporting
          ↓
13 Documentation
          ↓
14 Handover
          ↓
15 Project Q&A
          ↓
16 Mobile / Accessibility
          ↓
17 Production Hardening
          ↓
18 Final Gate
```

Some work may overlap after dependencies are satisfied, but the source-of-truth order must remain intact.

---

# 5. PHASE 0 — Repository & Engineering Foundation

## Objective

Create the technical foundation required for safe feature development.

## Tasks

### 0.1 Repository Structure

Create repository structure consistent with Technical Architecture.

Example:

```text
apps/web
apps/api
docs
infra
scripts
tests
```

### 0.2 Frontend Bootstrap

Set up:

- Next.js;
- React;
- TypeScript;
- App Router;
- linting;
- formatting;
- testing foundation.

### 0.3 Backend Bootstrap

Set up:

- Python application;
- FastAPI;
- SQLAlchemy;
- Alembic;
- configuration layer;
- dependency injection/use-case boundaries where appropriate;
- pytest.

### 0.4 PostgreSQL Development Environment

Create local database service and validated connection flow.

### 0.5 Database Migration Baseline

Create first Alembic baseline.

### 0.6 Configuration Management

Support environments:

```text
development
test
production
```

Required categories:

- database;
- session/auth;
- Gemini;
- storage;
- job worker;
- operational limits.

### 0.7 Structured Logging

Introduce request IDs and structured logs.

### 0.8 Health Endpoints

Implement:

```text
/health
/health/ready
```

### 0.9 Docker Development/Production Baseline

Create Compose structure for:

```text
frontend
backend
worker
postgres
```

Worker may initially idle until job infrastructure is implemented.

### 0.10 CI/Test Command Baseline

Establish repeatable commands for:

- backend tests;
- frontend tests;
- build;
- lint/type checks.

## Gate 0

PASS when:

- web app starts;
- API starts;
- PostgreSQL connects;
- migrations run;
- test suites execute;
- Compose stack starts;
- health/readiness work;
- no Gemini feature is required yet.

---

# 6. PHASE 1 — Authentication, App Shell, Client & Project Foundation

## Objective

Create the first usable authenticated ProjectPilot shell and authoritative project container.

## Tasks

### 1.1 Authentication

Implement secure initial authentication.

Must include:

- login;
- logout;
- protected routes;
- secure session handling;
- server-side auth checks.

### 1.2 User Model

Implement primary user entity.

### 1.3 Client Model

Implement Client CRUD.

### 1.4 Stakeholder Model

Implement:

- Stakeholder;
- project relationship;
- client PIC behavior.

### 1.5 Project Model

Implement Project entity and canonical lifecycle state.

### 1.6 Project State Validator

Implement valid Project transitions from Workflow & State Specification.

### 1.7 Activity Event Foundation

Implement reusable ActivityEvent recording.

### 1.8 Project Authorization Boundary

Every project-scoped endpoint must validate access.

### 1.9 Global App Shell

Implement:

```text
Dashboard
Leads
Projects
My Work
Reports
Documents
```

Links may initially be placeholders for future modules.

### 1.10 Project List

Desktop + mobile-responsive list.

### 1.11 Direct Project Creation

Allow direct Project creation beginning in `DISCOVERY`.

### 1.12 Project Workspace Shell

Create project-level navigation structure.

### 1.13 Project Overview Foundation

Display:

- client;
- PM;
- lifecycle state;
- dates;
- basic activity.

## Gate 1

PASS when:

- authenticated PM can create Client and Project;
- project access is protected;
- Project state validation works;
- invalid transitions are rejected server-side;
- Project workspace is navigable on desktop/mobile;
- important state changes write ActivityEvents.

---

# 7. PHASE 2 — Lead Management & Conversion

## Objective

Support the pre-project lifecycle.

## Tasks

### 2.1 Lead Entity

Implement fields and statuses from authoritative model.

### 2.2 Lead State Machine

Enforce canonical transitions.

### 2.3 Leads List

Desktop table and mobile cards.

### 2.4 Lead Detail

Support:

- opportunity details;
- client/contact;
- status;
- activity;
- notes.

### 2.5 Brief-at-Lead Support

Allow Brief records before conversion.

### 2.6 Lead Qualification Flow

Support:

```text
NEW
CONTACTED
BRIEF_SCHEDULED
QUALIFIED
NOT_QUALIFIED
LOST
```

### 2.7 Lead Conversion Transaction

Atomic operation:

```text
Create/link Client
Create Project
Carry Brief references
Mark Lead CONVERTED
ActivityEvent
Commit
```

### 2.8 Conversion Review UI

Prefill and review information before conversion.

### 2.9 Lost Lead

Allow reason capture.

## Gate 2

PASS when:

- Lead lifecycle is fully enforced;
- conversion preserves relevant information;
- conversion failure cannot leave Lead marked `CONVERTED`;
- lost/not-qualified Leads remain historically available.

---

# 8. PHASE 3 — Discovery Foundation

## Objective

Create structured non-AI discovery workflow before AI assistance.

## Tasks

### 3.1 Project Brief

Create/edit Brief inside Project.

### 3.2 Brief Attachments

Allow attachment metadata/linking.

Actual advanced parsing may wait.

### 3.3 Discovery Question Entity

Implement canonical states.

### 3.4 Discovery Question CRUD

Manual question creation.

### 3.5 Discovery Category Support

Support categories defined in PRD.

### 3.6 Client Answer Entity

Record:

- answer;
- respondent;
- source;
- date.

### 3.7 Follow-Up Workflow

Support `NEEDS_FOLLOW_UP`.

### 3.8 Discovery Workspace UI

Implement:

```text
Brief
Questions
Answers
Open Gaps
```

### 3.9 Discovery Filtering

Filter by:

- status;
- category;
- unanswered;
- follow-up.

## Gate 3

PASS when a PM can run discovery manually without AI:

```text
Brief
→ Question
→ Sent
→ Answer
→ Follow-up / Closed
```

and all state transitions are valid and traceable.

---

# 9. PHASE 4 — Requirements, Decisions & Scope

## Objective

Create the authoritative project-definition layer.

## Tasks

### 4.1 Requirement Entity

Implement:

- key;
- category;
- status;
- priority;
- source relationships.

### 4.2 Requirement State Machine

Enforce:

```text
DRAFT
NEEDS_CLARIFICATION
CONFIRMED
APPROVED
REJECTED
SUPERSEDED
```

### 4.3 Requirement Source

Implement source links to:

- Brief;
- Discovery Question;
- Client Answer;
- Meeting placeholder/future link;
- manual PM source.

### 4.4 Requirement List & Detail

Desktop/mobile behavior.

### 4.5 Requirement Traceability UI

Show sources and relationships.

### 4.6 Requirement Supersession

Preserve old approved requirement.

### 4.7 Decision Entity

Implement structured Decision Log.

### 4.8 Decision Supersession

Preserve change history.

### 4.9 Approval Entity

Implement initial structured approval records.

### 4.10 Scope Item Entity

Implement:

```text
IN_SCOPE
OUT_OF_SCOPE
UNDECIDED
```

### 4.11 Scope Baseline

Support baseline version/context.

### 4.12 Scope Change Entity

Implement full state workflow.

### 4.13 Scope Workspace

UI for:

- baseline;
- in/out scope;
- potential changes;
- change history.

## Gate 4

PASS when:

- requirements can be traced to discovery evidence;
- approved requirement changes preserve supersession history;
- Decisions are structured;
- baseline Scope exists;
- Scope Changes follow explicit review states;
- no AI is needed to use these workflows.

---

# 10. PHASE 5 — Planning, Task Model & Kanban

## Objective

Create ProjectPilot's operational delivery core.

## Tasks

### 5.1 Epic Entity

Implement project Epics.

### 5.2 Feature Entity

Implement Feature hierarchy.

### 5.3 Requirement-to-Feature Links

Support many-to-many traceability.

### 5.4 Task Entity

Implement canonical Task model.

### 5.5 Task State Machine

Enforce:

```text
BACKLOG
READY
IN_PROGRESS
IN_REVIEW
QA
BLOCKED
DONE
CANCELLED
```

### 5.6 Task Keys

Generate stable project-level display keys.

### 5.7 Task Relationships

Support:

- Epic;
- Feature;
- Requirement;
- Scope;
- parent Task;
- assignee placeholder.

### 5.8 Task Activity History

Record status/date/assignee changes.

### 5.9 Task List View

Desktop table + mobile card behavior.

### 5.10 Kanban Board

Implement canonical columns.

### 5.11 Kanban Drag-and-Drop

Desktop interaction with backend transition validation.

### 5.12 Kanban Mobile Status Change

Explicit status action independent of drag-and-drop.

### 5.13 Kanban Filters

Support core filters.

### 5.14 Quick Task Create

Minimal creation flow.

### 5.15 Full Task Detail

Implement structured task page/drawer.

### 5.16 Task Reopen

Support `DONE → IN_PROGRESS` with preserved history.

## Gate 5

PASS when:

- Task status is authoritative;
- Board and List show the same records;
- invalid transitions fail server-side;
- mobile status updates work without drag;
- Task traceability to Requirement and Scope works;
- `BLOCKED` cannot be entered without blocker context once blocker module integration is completed in Phase 7.

Temporary guarded handling may be used before Phase 7 but must not violate final acceptance.

---

# 11. PHASE 6 — Timeline, Milestones, Team & Dependencies

## Objective

Extend Task data into schedule and delivery structure without duplication.

## Tasks

### 6.1 ProjectMember

Implement assignable internal team records.

### 6.2 Task Assignee

Connect Tasks to ProjectMembers.

### 6.3 Team View

Show active/overdue/blocked work.

### 6.4 Milestone Entity

Implement canonical states.

### 6.5 Task-to-Milestone Relationship

### 6.6 TaskDependency

Implement at minimum finish-to-start dependency.

### 6.7 Circular Dependency Validation

Reject invalid cycles.

### 6.8 Timeline View

Render Task start/due dates.

### 6.9 Milestone Markers

Display milestones on Timeline.

### 6.10 Calendar View

Show task/milestone dates.

### 6.11 Mobile Timeline Alternative

Provide mobile-readable schedule view.

### 6.12 My Work Foundation

Cross-project task view.

## Gate 6

PASS when:

- one Task record powers Board/List/Timeline/Calendar;
- dependency changes do not duplicate dates;
- circular dependencies are rejected;
- Milestones connect to Tasks;
- team workload can be inspected.

---

# 12. PHASE 7 — Issues, Risks, Blockers & Client Dependencies

## Objective

Create structured operational risk and dependency management.

## Tasks

### 7.1 Issue Entity + Workflow

### 7.2 Risk Entity + Workflow

### 7.3 Risk Materialization to Issue

### 7.4 Blocker Entity + Workflow

### 7.5 Task-to-Blocker Relationship

### 7.6 Enforce Task → BLOCKED Context

A Blocker reason becomes mandatory.

### 7.7 ClientDependency Entity

Implement full lifecycle.

### 7.8 Client Dependency Relationships

Link to:

- Task;
- Milestone;
- Blocker.

### 7.9 Waiting Duration

Derived calculation.

### 7.10 Issues & Risks Workspace

Tabs:

```text
Issues
Risks
Blockers
Client Dependencies
```

### 7.11 Attention Indicators

Add derived:

- overdue dependency;
- old blocker;
- unresolved issue.

## Gate 7

PASS when:

- a Task cannot remain meaningfully blocked without Blocker evidence;
- client dependencies are distinct from internal issues;
- waiting duration is derived from timestamps;
- Risk may materialize into Issue without deleting history;
- related Tasks/Milestones are visible.

---

# 13. PHASE 8 — AI Core Infrastructure

## Objective

Build AI infrastructure only after authoritative project entities exist.

## Tasks

### 8.1 Gemini Configuration

Configuration-driven:

```text
GEMINI_MODEL=gemini-3.5-flash-lite
```

### 8.2 Gemini Adapter

Encapsulate provider API.

### 8.3 AIRequest Entity

Implement technical request lifecycle.

### 8.4 AISuggestion Entity

Implement suggestion lifecycle.

### 8.5 PostgreSQL Job Queue

Create durable job model.

### 8.6 Worker Claiming

Concurrency-safe job claiming.

### 8.7 Worker Heartbeat

Observable worker health.

### 8.8 Prompt Registry

Versioned operation-specific prompts.

### 8.9 Structured Output Validation

Schema + domain validation.

### 8.10 AI Context Builder Framework

Capability-specific context builders.

### 8.11 Language Contract

Ensure:

```text
engineering instruction = English
human-readable output = Bahasa Indonesia
machine enums/keys = English
```

### 8.12 AI Failure Handling

Failures must preserve authoritative data.

### 8.13 Retry & Idempotency

Bounded technical retries.

### 8.14 AI Suggestion Review Component

Reusable UI:

```text
Accept
Edit
Reject
Evidence
```

### 8.15 Controlled Real-Gemini Smoke Test

Verify real provider compatibility without making real-AI tests normal CI dependencies.

## Gate 8

PASS when:

- job queue survives process restarts;
- workers cannot double-claim the same job;
- invalid AI output is rejected;
- AI output remains non-authoritative;
- Bahasa Indonesia generation contract works;
- Gemini failure does not affect normal project operations.

---

# 14. PHASE 9 — AI Discovery & Requirement Intelligence

## Objective

Add AI assistance to existing manual Discovery/Requirement workflows.

## Tasks

### 9.1 Brief Analysis

Structured output.

### 9.2 Discovery Question Generation

Create `AISuggestion` records.

### 9.3 Discovery Batch Review

### 9.4 Requirement Extraction

From:

- Brief;
- Client Answer;
- supported project evidence.

### 9.5 Requirement Normalization

### 9.6 Requirement Gap Analysis

### 9.7 Contradiction Detection

### 9.8 Evidence Quality Labels

Support conceptual labels:

```text
EXPLICIT
INFERRED
AMBIGUOUS
MISSING
CONFLICTING
```

### 9.9 Suggestion-to-Requirement Acceptance

Transactional controlled mutation.

## Gate 9

PASS when:

- AI can improve Discovery without bypassing PM;
- duplicate questions are minimized;
- AI Requirements remain suggestions;
- accepted suggestion creates DRAFT Requirement;
- missing evidence is surfaced instead of invented.

---

# 15. PHASE 10 — Meetings & AI Meeting Intelligence

## Objective

Turn meetings into structured project knowledge.

## Tasks

### 10.1 Meeting Entity

### 10.2 Meeting Participant

### 10.3 Meeting Quick Capture

### 10.4 Transcript/Attachment Link

### 10.5 Meeting AI Analysis

Generate:

- summary;
- decisions;
- actions;
- requirement candidates;
- scope-change candidates;
- risks/blockers;
- follow-ups.

### 10.6 ActionItem Entity

### 10.7 ActionItem Conversion

To:

- Task;
- ClientDependency;
- Issue.

### 10.8 Decision Suggestion Acceptance

### 10.9 Scope Change Suggestion Acceptance

### 10.10 Meeting Review/Finalization

## Gate 10

PASS when:

- Meeting can be captured without AI;
- AI summary is informational;
- authoritative candidates are individually reviewable;
- due dates are not invented;
- Meeting remains traceable as source evidence.

---

# 16. PHASE 11 — PM Control Center & Project Health

## Objective

Create daily operational intelligence from deterministic project data.

## Tasks

### 11.1 Attention Query Layer

Compute:

- overdue Tasks;
- Blocked Tasks;
- pending Client Dependencies;
- unresolved high Issues;
- Risks;
- pending approvals;
- Requirement clarifications.

### 11.2 Project Health Rules v1

Implement deterministic rules.

### 11.3 Rules Versioning

Record rules version.

### 11.4 Project Health Evidence

Expose why status exists.

### 11.5 PM Dashboard

Implement priority hierarchy.

### 11.6 Project Cards

Show concise operational health.

### 11.7 AI PM Summary

Gemini summarizes deterministic signals.

### 11.8 Mobile PM Dashboard

Optimize for quick attention review.

## Gate 11

PASS when:

- Project health can be computed without Gemini;
- PM can inspect evidence;
- AI explanation never contradicts source metrics;
- cross-project attention items are actionable.

---

# 17. PHASE 12 — Weekly & Monthly Reporting

## Objective

Generate evidence-based internal and client reporting.

## Tasks

### 12.1 Report Entity

### 12.2 Report Versioning

### 12.3 ReportEvidence

### 12.4 Reporting Period Selection

### 12.5 Internal Weekly Evidence Resolver

### 12.6 Internal Weekly Gemini Draft

### 12.7 Report Editor

### 12.8 Internal Review/Finalization

### 12.9 Client-Visible Context Builder

### 12.10 Weekly Client Draft

### 12.11 Client Preview

### 12.12 Monthly Internal Evidence Resolver

### 12.13 Monthly Internal Draft

### 12.14 Monthly Client Draft

### 12.15 Final Report Historical Integrity

## Gate 12

PASS when:

- reports are generated from evidence;
- finalized reports preserve historical snapshots;
- client report cannot finalize before required internal review condition;
- internal-sensitive items are not automatically sent into client context;
- PM can edit every draft.

---

# 18. PHASE 13 — Documentation Generation

## Objective

Generate end-of-project documentation from accumulated evidence.

## Tasks

### 13.1 GeneratedDocument Entity

### 13.2 DocumentEvidence

### 13.3 Markdown Document Editor

### 13.4 Evidence Coverage Checker

### 13.5 FSD Generator

### 13.6 User Guide Generator

### 13.7 Admin Guide Generator

### 13.8 Technical Documentation Generator

### 13.9 User Documentation Generator

### 13.10 Design Documentation Generator

### 13.11 Section-Aware Generation

For long artifacts.

### 13.12 Document Versioning

### 13.13 Finalization

### 13.14 Export Foundation

At least one usable export path should be selected during implementation.

## Gate 13

PASS when:

- documents use actual project evidence;
- missing evidence is visible;
- AI does not fabricate unsupported implementation details;
- final artifacts are editable before finalization;
- revised final documents preserve previous versions.

---

# 19. PHASE 14 — Handover & Project Completion

## Objective

Complete the lifecycle.

## Tasks

### 14.1 Handover Entity

### 14.2 HandoverItem

### 14.3 Default Checklist

Based on applicable documents and delivery needs.

### 14.4 Required / Optional / N/A Behavior

### 14.5 Waiver Flow

Requires reason.

### 14.6 Handover Status Workflow

### 14.7 Client Acceptance Record

### 14.8 Handover Workspace

### 14.9 Project Completion Gate

Backend validates:

```text
Handover = COMPLETED
required items resolved
```

### 14.10 Completed Project UX

Historical records remain accessible.

## Gate 14

PASS when:

- project cannot complete merely because development Tasks are DONE;
- unresolved mandatory Handover items block completion;
- waived/not-applicable items are explicit;
- final Project transition is auditable.

---

# 20. PHASE 15 — Project Q&A & Search Expansion

## Objective

Make accumulated project knowledge conversationally queryable.

## Tasks

### 15.1 PostgreSQL Full-Text Search

Implement indexed search.

### 15.2 Global Search

Support major entities.

### 15.3 Project-Scoped Search

### 15.4 Q&A Query Classification

Identify when answer can be deterministic.

### 15.5 Structured Retrieval

Prefer SQL for factual queries.

### 15.6 Evidence Package Builder

### 15.7 Gemini Q&A

Bahasa Indonesia answer.

### 15.8 Evidence References

Return supporting records.

### 15.9 Missing Evidence

Explicit missing state.

### 15.10 Conflicting Evidence

Surface conflict.

### 15.11 Semantic Retrieval Evaluation

Evaluate whether full-text/structured retrieval is insufficient.

Vector search remains deferred unless evidence supports the need.

## Gate 15

PASS when:

- Q&A never crosses Project boundaries;
- deterministic questions use deterministic data;
- AI cites/identifies evidence;
- missing evidence is not fabricated.

---

# 21. PHASE 16 — Mobile UX Completion & Accessibility

## Objective

Perform full mobile and accessibility completion after all major workflows exist.

This is not the first time mobile is considered; every earlier phase must already be responsive.

This phase is a systematic end-to-end audit and completion gate.

## Tasks

### 16.1 Dashboard Mobile Audit

### 16.2 Lead Mobile Audit

### 16.3 Discovery Mobile Audit

### 16.4 Requirement Mobile Audit

### 16.5 Kanban Mobile Audit

### 16.6 Timeline Mobile Alternative Audit

### 16.7 Issues/Dependencies Mobile Audit

### 16.8 Meeting Mobile Audit

### 16.9 AI Review Mobile Audit

### 16.10 Reports Mobile Audit

### 16.11 Documents Mobile Reading/Edit Audit

### 16.12 Handover Mobile Audit

### 16.13 Keyboard Accessibility

### 16.14 Focus Management

### 16.15 Contrast/Non-Color Status

### 16.16 Form Accessibility

## Gate 16

PASS when core PM workflows work without:

- desktop mode;
- repeated zooming;
- excessive horizontal scrolling;
- inaccessible drag-only operations.

---

# 22. PHASE 17 — Production Hardening & Deployment

## Objective

Prepare safe production operation.

## Tasks

### 17.1 Production Compose

Finalize:

```text
frontend
backend
worker
postgres
```

### 17.2 Reverse Proxy/TLS

### 17.3 Production Environment Configuration

### 17.4 Secret Management

### 17.5 Database Migration Deployment Flow

### 17.6 Object Storage Production Configuration

### 17.7 Upload Security Limits

### 17.8 Production Logging

### 17.9 Worker Health Monitoring

### 17.10 Queue Diagnostics

### 17.11 AI Request Diagnostics

### 17.12 Backup Automation

PostgreSQL + file storage consideration.

### 17.13 Restore Verification

### 17.14 Security Verification

### 17.15 Production Smoke Tests

### 17.16 Operational Runbook Draft

Prepare the later Deployment & Operations Runbook.

## Gate 17

PASS when:

- only intended services are publicly exposed;
- HTTPS works;
- PostgreSQL is private;
- backup exists;
- restore has been tested;
- health/readiness work;
- worker health is visible;
- production AI config is valid;
- core workflows pass smoke testing.

---

# 23. PHASE 18 — Final Verification Gate

## Objective

Verify complete end-to-end alignment with authoritative documents.

## Verification Areas

### 18.1 Product Scope

Confirm all required modules exist.

### 18.2 Workflow

Validate canonical states and transitions.

### 18.3 Data Integrity

Validate traceability and Project isolation.

### 18.4 AI Authority

Confirm no hidden authoritative mutations.

### 18.5 Language Policy

Verify operational output defaults to Bahasa Indonesia.

### 18.6 Kanban / Timeline Parity

Confirm shared Task source.

### 18.7 Reporting

Verify internal-before-client workflow.

### 18.8 Documentation

Verify evidence-based generation.

### 18.9 Handover

Verify Project Completion Gate.

### 18.10 Mobile

Perform end-to-end smartphone testing.

### 18.11 Backup & Recovery

Confirm recovery procedure.

### 18.12 Regression Suite

All automated suites pass.

## Gate 18

Final status can be:

```text
PASS
PASS_WITH_NON_BLOCKING_LIMITATIONS
BLOCKED
```

No production-complete claim should be made if core authoritative acceptance fails.

---

# 24. Implementation Workstreams

The phases can be grouped into workstreams.

## Workstream A — Product Core

```text
Phase 0
Phase 1
Phase 2
```

## Workstream B — Project Definition

```text
Phase 3
Phase 4
```

## Workstream C — Delivery Management

```text
Phase 5
Phase 6
Phase 7
```

## Workstream D — AI Intelligence

```text
Phase 8
Phase 9
Phase 10
```

## Workstream E — PM Operations

```text
Phase 11
Phase 12
```

## Workstream F — Closure & Knowledge

```text
Phase 13
Phase 14
Phase 15
```

## Workstream G — Quality & Production

```text
Phase 16
Phase 17
Phase 18
```

---

# 25. Recommended Implementation Milestones

Suggested milestones:

```text
M0 — Engineering Ready
M1 — Project Foundation Ready
M2 — Discovery & Requirement Ready
M3 — Delivery Core Ready
M4 — AI Assistance Ready
M5 — PM Operations Ready
M6 — Reporting Ready
M7 — Documentation & Handover Ready
M8 — Knowledge/Q&A Ready
M9 — Production Ready
```

---

# 26. MVP Definition

ProjectPilot's product vision is broad.

For implementation control, the first genuinely useful MVP should include:

```text
Authentication
Client
Lead
Project
Brief
Discovery Questions
Client Answers
Requirements
Decisions
Scope
Epic
Feature
Task
Kanban
Timeline
Milestones
Team Assignments
Blockers
Client Dependencies
Basic PM Control Center
```

And at least the following AI features:

```text
Brief Analysis
Discovery Question Generation
Requirement Extraction
Meeting Analysis
```

A usable Weekly Internal Report draft is highly desirable for MVP, but may be delivered immediately after delivery core if schedule requires.

---

# 27. MVP Exit Criteria

MVP is not achieved by task tracking alone.

Minimum workflow should function:

```text
Lead
→ Project
→ Brief
→ Discovery
→ Requirement
→ Scope
→ Planning
→ Task
→ Kanban
→ Delivery Monitoring
```

with at least one meaningful AI-assisted flow.

---

# 28. Post-MVP Priority

After MVP:

```text
Reporting
→ Documentation
→ Handover
→ Project Q&A
```

These features are high-value but depend on accumulated project data.

---

# 29. Testing Requirements by Phase

Every phase should include:

## Unit Tests

Business rules and state logic.

## Integration Tests

Persistence and API behavior.

## UI Tests

Key interactions.

## Regression Tests

Previously completed workflows.

## Real Gemini Verification

Only for AI phases and only as controlled tests.

---

# 30. State Machine Test Requirement

Every stateful entity implemented must have tests for:

- allowed transition;
- invalid transition;
- terminal behavior;
- required metadata;
- reopening behavior where applicable.

---

# 31. Project Isolation Test Requirement

Every project-scoped module must include tests proving:

```text
Project A user context
cannot read/update
Project B data
```

according to the current authorization model.

---

# 32. Audit Event Test Requirement

Critical mutations must verify ActivityEvent creation.

Examples:

- Task status change;
- Requirement approval;
- Scope Change acceptance;
- Project lifecycle transition;
- Report finalization;
- Handover completion.

---

# 33. AI Contract Test Requirement

For every structured AI capability:

```text
valid output
malformed output
missing field
invalid enum
missing evidence
provider failure
retry
```

must be covered.

---

# 34. Language Regression Requirement

AI tests must verify that human-readable generated operational content defaults to Bahasa Indonesia.

Machine-facing values may remain English.

Example expected:

```json
{
  "category": "FUNCTIONAL",
  "title": "Pembatalan Pemesanan"
}
```

---

# 35. Kanban Regression Requirement

Whenever Task model changes, verify:

```text
Board
List
Timeline
Calendar
Task Detail
My Work
```

remain consistent.

---

# 36. Report Regression Requirement

Report changes must verify:

- evidence package;
- historical snapshot;
- finalization;
- supersession;
- client context isolation.

---

# 37. Document Regression Requirement

Document changes must verify:

- evidence links;
- generated draft;
- editability;
- finalization;
- supersession.

---

# 38. Handover Regression Requirement

Handover tests must verify:

- required item blocking;
- waiver reason;
- not-applicable handling;
- final Project completion gate.

---

# 39. Implementation Prompt Discipline

If AI coding agents are used, prompts should be scoped to one coherent implementation objective.

Every implementation prompt should include:

```text
Source Lock
Scope
Out of Scope
Files/Modules to inspect
Acceptance Criteria
Verification
```

Agents must not infer the next task from memory.

They should read the Detailed Implementation Task Plan and relevant authoritative specs.

---

# 40. Maximum Prompt Size Principle

Avoid one massive prompt that attempts to implement an entire phase if the phase contains several independent risks.

A phase may be split into multiple implementation tasks/prompts.

However, each prompt should preserve the parent phase goal and gate.

---

# 41. Documentation Update Rule

If implementation reveals a genuine product contradiction:

1. do not silently patch behavior;
2. identify the conflicting authoritative documents;
3. resolve the product decision;
4. update documentation;
5. then implement.

Code must not become the accidental source of truth.

---

# 42. Dependency Version Policy

Technology versions in ProjectPilot documents are architecture baselines unless explicitly locked.

A newer maintained version may be used if:

- compatible;
- behavior/contracts remain valid;
- tests pass;
- no authoritative requirement depends on an older exact version.

Version differences alone are not blockers.

---

# 43. Deferred Integrations

Do not implement during the primary roadmap unless explicitly approved:

- Jira sync;
- ClickUp sync;
- Trello sync;
- Linear sync;
- Slack integration;
- email sending;
- calendar synchronization;
- client portal;
- team portal;
- financial/budget module;
- payroll;
- procurement.

---

# 44. Deferred Infrastructure

Do not introduce without demonstrated need:

- Redis;
- Kafka;
- RabbitMQ;
- Kubernetes;
- Elasticsearch;
- dedicated vector database;
- microservices;
- event sourcing.

The initial architecture is intentionally simpler.

---

# 45. Data Migration Safety

Every schema change must consider:

- existing records;
- defaults;
- nullability;
- rollback/recovery;
- production migration behavior.

Migrations should not assume an empty database after the first production deployment.

---

# 46. Production Data Safety

Never use destructive development reset commands against production data.

Production verification must use non-destructive diagnostics.

---

# 47. Security Gate Before Production

Before production readiness:

- auth must be enabled;
- access checks must exist;
- secrets must be external;
- PostgreSQL must be private;
- uploads must be validated;
- HTTPS must be active;
- project isolation must be tested.

---

# 48. AI Security Gate

Before enabling production AI:

- Gemini key stored securely;
- requests project-scoped;
- upload/context size bounded;
- no unrelated Project data included;
- errors do not leak secrets;
- AI logs avoid unnecessary sensitive content.

---

# 49. Backup Gate

Production-ready status requires:

- automatic backup;
- defined retention;
- off-host/durable storage;
- restore procedure;
- at least one successful restore test.

---

# 50. Observability Gate

Production-ready status requires the PM/operator to be able to inspect:

```text
backend logs
worker logs
job failures
AI failures
health
readiness
queue state
```

---

# 51. UX Gate

No implementation phase should knowingly leave critical workflow unusable on mobile.

Phase 16 performs the comprehensive final audit, but mobile usability is an ongoing requirement.

---

# 52. Definition of Done — Individual Task

An implementation task is complete when:

1. scoped behavior is implemented;
2. backend/domain rules are enforced;
3. UI behavior is integrated where applicable;
4. migrations are present where needed;
5. tests exist;
6. regression suite passes;
7. relevant authoritative requirements are satisfied;
8. no unrelated scope is introduced;
9. known limitations are documented.

---

# 53. Definition of Done — Phase

A phase is complete only when its Gate passes.

Partial implementation may be recorded as:

```text
IN_PROGRESS
BLOCKED
PARTIAL
```

but must not be reported as complete.

---

# 54. Definition of Done — ProjectPilot v1

ProjectPilot v1 is complete when:

- phases required for the agreed v1 scope pass;
- final verification passes;
- production deployment is healthy;
- core lifecycle works end-to-end;
- AI authority boundary is respected;
- reports/documents use evidence;
- mobile operational workflows are usable;
- backups/recovery are verified.

---

# 55. Risk Register for Implementation

Key implementation risks include:

## 55.1 Scope Size

ProjectPilot is broad.

Mitigation:

- phased delivery;
- strict gates;
- avoid premature integrations.

## 55.2 AI Overreach

Mitigation:

- AISuggestion boundary;
- PM approval;
- structured validation.

## 55.3 Data Model Complexity

Mitigation:

- relational model;
- incremental schema;
- explicit traceability.

## 55.4 Mobile Kanban Complexity

Mitigation:

- explicit Change Status action;
- do not require drag-only behavior.

## 55.5 Report/Data Mismatch

Mitigation:

- deterministic evidence resolver;
- snapshots.

## 55.6 Long Document Quality

Mitigation:

- evidence coverage;
- section-aware generation;
- PM review.

## 55.7 Infrastructure Overengineering

Mitigation:

- modular monolith;
- PostgreSQL queue;
- defer extra services.

---

# 56. Recommended First Development Sequence

Once implementation begins, the first concrete sequence should be:

```text
1. Repository/bootstrap
2. PostgreSQL + migrations
3. Authentication
4. Client
5. Project
6. Project state transitions
7. App shell
8. Project workspace
9. Lead
10. Lead conversion
11. Brief
12. Discovery Questions
13. Client Answers
14. Requirements
15. Decisions
16. Scope
17. Epic / Feature
18. Task
19. Kanban
20. Timeline
```

Do not begin Gemini integration before this foundation is sufficiently stable.

---

# 57. Recommended AI Development Sequence

After AI infrastructure is ready:

```text
1. Brief Analysis
2. Discovery Question Generation
3. Requirement Extraction
4. Requirement Gap Analysis
5. Meeting Analysis
6. Scope Change Detection
7. Task Breakdown
8. PM Control Summary
9. Weekly Report
10. Monthly Report
11. Documentation
12. Project Q&A
```

This order follows dependency and value.

---

# 58. Recommended Release Strategy

Prefer incremental releases.

Example:

```text
Release A:
Foundation + Leads + Projects

Release B:
Discovery + Requirements + Scope

Release C:
Tasks + Kanban + Timeline

Release D:
Delivery Monitoring + AI Discovery

Release E:
Meetings + PM Control Center

Release F:
Reporting

Release G:
Documentation + Handover

Release H:
Project Q&A + final UX hardening
```

The exact number of releases is not locked.

---

# 59. Change Control

Any change that affects:

- product lifecycle;
- AI authority;
- Task state model;
- report workflow;
- language policy;
- Project Completion Gate;
- core data relationships;

requires authoritative document review before implementation.

---

# 60. Final Implementation Principle

ProjectPilot must be built as one coherent project-management knowledge and delivery system.

It must not degrade into disconnected modules such as:

```text
separate Lead app
separate Kanban app
separate reporting app
separate AI chatbot
```

The implementation must preserve the central product promise:

> **Enter project information once, reuse it throughout the entire project lifecycle.**

---

# 61. Next Authoritative Document

The next document should be:

**ProjectPilot — Verification & Acceptance Plan**

That document will define the formal end-to-end verification strategy for:

- functional acceptance;
- state-machine validation;
- data integrity;
- project isolation;
- AI authority;
- AI language behavior;
- Kanban/Timeline consistency;
- reporting evidence;
- documentation evidence;
- handover completion;
- mobile usability;
- security;
- backup/recovery;
- production readiness.

After that document, the core pre-implementation documentation set is complete.
