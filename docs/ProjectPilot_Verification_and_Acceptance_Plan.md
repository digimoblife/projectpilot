# ProjectPilot — Verification & Acceptance Plan

**Document Type:** Verification & Acceptance Plan  
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
8. ProjectPilot — Detailed Implementation Task Plan  

---

# 1. Purpose

This document defines how ProjectPilot must be verified and accepted before a feature, phase, release, or production deployment can be considered complete.

It defines:

- verification strategy;
- functional acceptance;
- state-machine validation;
- data-integrity verification;
- project-isolation testing;
- AI authority validation;
- AI language validation;
- Kanban/List/Timeline consistency checks;
- reporting verification;
- documentation-generation verification;
- handover-completion verification;
- mobile usability acceptance;
- security checks;
- backup and recovery validation;
- production-readiness gates;
- final release status classification.

This plan is intended to prevent false completion claims based only on UI appearance or isolated happy-path testing.

---

# 2. Verification Principles

## 2.1 Evidence Over Assumption

Every acceptance claim must be supported by test results, observable behavior, or inspectable system state.

## 2.2 Backend Authority Must Be Tested

Frontend behavior is not sufficient proof for:

- valid state transitions;
- data isolation;
- authorization;
- completion gates;
- AI authority boundaries.

## 2.3 End-to-End Lifecycle Matters

ProjectPilot must be verified as a connected lifecycle:

```text
Lead
→ Project
→ Discovery
→ Requirement
→ Scope
→ Planning
→ Delivery
→ Reporting
→ Documentation
→ Handover
```

## 2.4 AI Must Be Verified as an Assistant

AI must be tested for:

- evidence grounding;
- structured output validation;
- non-authoritative behavior;
- Bahasa Indonesia output;
- failure isolation.

## 2.5 Historical Integrity Matters

Finalized, superseded, approved, and completed records must preserve historical meaning.

## 2.6 Mobile Is an Acceptance Requirement

Critical PM workflows must be verified on mobile-sized layouts.

## 2.7 Recovery Must Be Proven

Backup existence alone is insufficient.

At least one restore path must be tested before production-complete status.

---

# 3. Verification Levels

ProjectPilot verification is divided into five levels.

## Level 1 — Unit Verification

Tests isolated business rules.

Examples:

- state transition validators;
- project health rules;
- due-date derived flags;
- requirement supersession rules;
- AI schema validation.

## Level 2 — Integration Verification

Tests component interaction.

Examples:

- API + database;
- job queue + worker;
- task mutation + ActivityEvent;
- AIRequest + AISuggestion persistence;
- report finalization + evidence snapshot.

## Level 3 — UI / Functional Verification

Tests user-visible workflows.

Examples:

- Lead conversion;
- Kanban drag;
- mobile status change;
- AI suggestion review;
- report editing.

## Level 4 — End-to-End Verification

Tests complete business journeys.

Examples:

```text
Lead → Project → Discovery → Requirement
```

or:

```text
Task → Blocked → Client Dependency → Resume
```

## Level 5 — Production Verification

Tests deployed runtime behavior.

Examples:

- HTTPS;
- health/readiness;
- private PostgreSQL exposure;
- worker health;
- real Gemini smoke test;
- backup/restore readiness.

---

# 4. Acceptance Status

Every verification gate should result in one of:

```text
PASS
PASS_WITH_NON_BLOCKING_LIMITATIONS
BLOCKED
```

## 4.1 PASS

All acceptance criteria are satisfied.

## 4.2 PASS_WITH_NON_BLOCKING_LIMITATIONS

Core behavior is correct, but documented non-critical limitations remain.

Limitations must:

- not violate authoritative requirements;
- not create data-integrity risk;
- not bypass security;
- not break core PM workflows;
- be explicitly documented.

## 4.3 BLOCKED

Any core acceptance requirement fails.

Examples:

- invalid state accepted;
- cross-project data leak;
- AI directly mutates authoritative records;
- Project can complete without Handover gate;
- report invents unsupported project facts;
- backup cannot be restored.

---

# 5. Test Environment Matrix

At minimum, verification should cover:

```text
Local Development
Automated Test Environment
Production-like Docker Environment
Production VPS
```

For UI:

```text
Desktop Browser
Mobile-Sized Browser
At least one real smartphone test before final acceptance
```

Exact browser matrix may be chosen later.

---

# 6. Automated Test Categories

Recommended automated suites:

```text
Backend Unit
Backend Integration
API Contract
Frontend Unit
Frontend Component
Browser E2E
Migration Tests
AI Contract Tests
Security/Isolation Tests
```

---

# 7. Test Data Strategy

Use deterministic test fixtures.

Fixtures should include:

- multiple Clients;
- multiple Projects;
- Leads in different states;
- Requirements in different states;
- Tasks across all canonical Kanban states;
- Milestones;
- Blockers;
- Client Dependencies;
- Reports;
- Documents;
- Handover items;
- AI suggestions.

At least two Projects must exist in isolation tests.

---

# 8. Authentication Acceptance

Verify:

1. unauthenticated user cannot access protected ProjectPilot pages;
2. authenticated user can access authorized content;
3. logout invalidates session;
4. protected backend endpoints reject unauthenticated requests;
5. session handling is secure in production configuration.

BLOCKED if protected project data is accessible without authentication.

---

# 9. Authorization & Project Isolation Acceptance

This is a critical gate.

For every project-scoped entity, verify that Project A context cannot access Project B data improperly.

Entities include:

- Brief;
- DiscoveryQuestion;
- ClientAnswer;
- Requirement;
- Decision;
- Scope;
- Task;
- Milestone;
- Issue;
- Risk;
- Blocker;
- ClientDependency;
- Meeting;
- Report;
- GeneratedDocument;
- Handover;
- AISuggestion;
- AIRequest.

Test:

```text
Project A ID + Project B entity ID
→ must be rejected or not found
```

BLOCKED on any cross-project leakage.

---

# 10. Lead Lifecycle Acceptance

Test all valid transitions:

```text
NEW → CONTACTED
CONTACTED → BRIEF_SCHEDULED
BRIEF_SCHEDULED → QUALIFIED
QUALIFIED → CONVERTED
```

Also test:

```text
NOT_QUALIFIED
LOST
```

Invalid transitions must fail.

---

# 11. Lead Conversion Acceptance

End-to-end test:

```text
Create Lead
Add Client/Contact
Add Brief
Qualify
Convert
```

Verify:

- Project created;
- Lead becomes `CONVERTED`;
- Client data preserved;
- Brief traceability preserved;
- ActivityEvent created.

Failure injection test:

If Project creation fails:

```text
Lead must remain QUALIFIED
```

BLOCKED if partial conversion occurs.

---

# 12. Project Lifecycle Acceptance

Verify canonical progression:

```text
DISCOVERY
→ REQUIREMENT_DEFINITION
→ PLANNING
→ AWAITING_CLIENT_APPROVAL
→ ACTIVE_DELIVERY
→ HANDOVER
→ COMPLETED
```

Test valid:

- ON_HOLD;
- resume to previous state;
- cancellation;
- backward transitions requiring reason.

Invalid direct transitions must fail.

---

# 13. Project Completion Gate Acceptance

Attempt to move Project to `COMPLETED` while Handover is incomplete.

Expected:

```text
REJECTED
```

Then satisfy required Handover conditions.

Expected:

```text
Project → COMPLETED
```

BLOCKED if completion can bypass Handover.

---

# 14. Discovery Question State Acceptance

Verify:

```text
DRAFT
READY
SENT
ANSWERED
NEEDS_FOLLOW_UP
CLOSED
CANCELLED
```

AI-generated questions must initially remain suggestions or DRAFT after acceptance.

They must not automatically become `READY`.

---

# 15. Client Answer Acceptance

Verify that an Answer:

- references a DiscoveryQuestion;
- preserves respondent/source/date;
- can support Requirement evidence;
- does not silently close a Question unless a valid transition is performed.

---

# 16. Requirement Lifecycle Acceptance

Verify:

```text
DRAFT
NEEDS_CLARIFICATION
CONFIRMED
APPROVED
REJECTED
SUPERSEDED
```

Invalid transitions must fail.

---

# 17. Requirement Supersession Acceptance

Test:

```text
REQ-001 = APPROVED
```

Create materially revised Requirement.

Expected:

```text
REQ-001 → SUPERSEDED
REQ-002 → approved/new state
```

Verify:

- REQ-001 remains readable;
- relationship between versions exists;
- history is preserved.

BLOCKED if old approved meaning is overwritten silently.

---

# 18. Requirement Traceability Acceptance

For at least one Requirement, verify navigation/relationship:

```text
Source
→ Requirement
→ Scope
→ Feature
→ Task
```

Not every Requirement needs every link, but available traceability must be correct.

---

# 19. Decision Log Acceptance

Verify:

- Decision has source/date;
- related Requirement/Scope links work;
- superseded Decisions remain available;
- AI suggestion cannot directly create authoritative Decision without PM action.

---

# 20. Scope Baseline Acceptance

Verify:

- in-scope items;
- out-of-scope items;
- baseline version/context;
- historical changes remain traceable.

---

# 21. Scope Change Acceptance

Test:

```text
DETECTED
→ UNDER_REVIEW
→ ACCEPTED
→ IMPLEMENTED
```

Also:

```text
REJECTED
NOT_A_SCOPE_CHANGE
NEEDS_CLARIFICATION
```

AI must not transition Scope Change to `ACCEPTED`.

---

# 22. Task State Machine Acceptance

Verify all canonical Task states:

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

Test all allowed transitions.

Test invalid transitions.

Example invalid:

```text
BACKLOG → DONE
```

must fail.

---

# 23. DONE Reopen Acceptance

Test:

```text
DONE → IN_PROGRESS
```

Verify:

- previous completion history preserved;
- ActivityEvent exists;
- task appears correctly in all views.

---

# 24. Kanban Shared-State Acceptance

Create Task.

Move via Kanban:

```text
READY → IN_PROGRESS
```

Verify same Task shows:

```text
Board = In Progress
List = In Progress
Task Detail = In Progress
Timeline = same Task
My Work = same Task
```

BLOCKED if separate duplicated task state exists.

---

# 25. Kanban Drag Failure Acceptance

Simulate failed backend transition after optimistic UI move.

Expected:

- card returns to authoritative state;
- error is visible;
- no false persisted state remains.

---

# 26. Mobile Kanban Acceptance

On mobile-sized screen, verify Task status can be changed without drag-and-drop.

Required:

```text
Change Status
```

or equivalent explicit control.

BLOCKED if status change is drag-only.

---

# 27. Blocked Task Acceptance

Attempt:

```text
Task → BLOCKED
```

without blocker reason.

Expected:

```text
REJECTED
```

Then provide blocker context.

Expected:

```text
Task = BLOCKED
Blocker = OPEN
```

---

# 28. Blocker Resolution Acceptance

Resolve Blocker.

Verify:

- Blocker becomes `RESOLVED`;
- Task does not automatically change state;
- PM chooses correct Task transition.

---

# 29. Task Dependency Acceptance

Verify:

```text
Task A → Task B
```

dependency.

Reject:

```text
Task A → Task A
```

Reject circular chain.

Example:

```text
A → B
B → C
C → A
```

BLOCKED if cycle is accepted.

---

# 30. Milestone Acceptance

Verify:

```text
PLANNED
ACTIVE
AT_RISK
ACHIEVED
MISSED
CANCELLED
```

At-risk evidence must be inspectable.

---

# 31. Timeline Consistency Acceptance

Change Task due date.

Verify:

- Task Detail updates;
- Timeline updates;
- Calendar updates;
- reporting query uses new current date;
- no duplicate Timeline-owned date exists.

---

# 32. Team Assignment Acceptance

Verify:

- ProjectMember can be assigned;
- Task displays assignee;
- Team Workload reflects assignment;
- cross-project My Work behaves consistently.

---

# 33. Issue Lifecycle Acceptance

Verify:

```text
OPEN
IN_PROGRESS
RESOLVED
CLOSED
```

and reopening behavior.

---

# 34. Risk Lifecycle Acceptance

Verify:

```text
IDENTIFIED
MONITORING
MITIGATING
MATERIALIZED
CLOSED
```

When materialized:

- related Issue may be created;
- Risk history remains.

---

# 35. Client Dependency Acceptance

Verify:

```text
DRAFT
REQUESTED
WAITING
RECEIVED
ACCEPTED
NEEDS_FOLLOW_UP
```

Check waiting duration calculation.

Waiting duration must derive from timestamps, not manual text.

---

# 36. Client Dependency Attribution Acceptance

Verify that a Client Dependency can link to:

- Task;
- Milestone;
- Blocker.

UI should identify dependency without automatically assigning blame.

---

# 37. Activity History Acceptance

For critical mutation, verify ActivityEvent contains:

```text
entity
previous state/value
new state/value
actor
timestamp
```

Examples:

- Task state;
- Requirement approval;
- Scope acceptance;
- Project lifecycle;
- Report finalization.

---

# 38. AI Infrastructure Acceptance

Verify:

- `AIRequest` created;
- job queued;
- worker claims once;
- Gemini adapter invoked;
- response validated;
- result stored;
- request status updated.

---

# 39. Durable Job Acceptance

Critical test:

1. enqueue job;
2. stop worker;
3. restart worker;
4. verify pending job still processes.

BLOCKED if jobs disappear with worker restart.

---

# 40. Double-Claim Acceptance

Run multiple workers against same queue.

Verify one job is processed by one worker only.

BLOCKED on duplicate simultaneous processing.

---

# 41. AI Failure Isolation Acceptance

Simulate Gemini timeout/failure.

Verify:

- AI operation fails cleanly;
- authoritative Project data unchanged;
- PM can continue non-AI workflows;
- retry is available where appropriate.

---

# 42. AI Invalid Output Acceptance

Provide malformed/invalid AI response in contract test.

Expected:

```text
AI result rejected
authoritative data unchanged
```

---

# 43. AI Authority Acceptance

For every AI suggestion type, verify that Gemini cannot directly mutate authoritative entity.

Test at least:

- Requirement;
- Decision;
- Scope Change;
- Task;
- Risk;
- Client Dependency.

BLOCKED if worker writes accepted business data without PM action.

---

# 44. AI Suggestion Review Acceptance

Verify:

```text
GENERATED
→ ACCEPTED / EDITED / REJECTED
```

For ACCEPT:

- authoritative entity created;
- accepted entity reference stored.

For EDIT:

- edited value becomes authoritative;
- original suggestion remains traceable.

For REJECT:

- no authoritative entity created.

---

# 45. AI Language Acceptance

This is a mandatory contract.

For operational AI output, verify Bahasa Indonesia for:

- Brief Analysis;
- Discovery Questions;
- Requirement text;
- Meeting Summary;
- Scope Change Analysis;
- Task Breakdown;
- Report Draft;
- Documentation Draft;
- Project Q&A.

Structured keys/enums may remain English.

Example accepted output:

```json
{
  "category": "FUNCTIONAL",
  "title": "Pembatalan Pemesanan"
}
```

BLOCKED if default user-facing AI output unexpectedly becomes English without explicit override.

---

# 46. AI Missing Evidence Acceptance

Ask/generate from insufficient evidence.

Expected behavior includes:

```text
Unknown
Needs clarification
Insufficient evidence
```

AI must not fill missing facts.

---

# 47. AI Contradiction Acceptance

Provide conflicting evidence.

Expected:

- conflict identified;
- both sources preserved;
- AI does not choose a winner without authoritative resolution.

---

# 48. Brief Analysis Acceptance

Input a representative Bahasa Indonesia Brief.

Verify output contains:

- summary;
- known information;
- unknown information;
- assumptions;
- discovery areas.

Verify inferred items are not presented as confirmed Requirements.

---

# 49. Discovery Question Generation Acceptance

Verify:

- questions are project-relevant;
- answered questions are not unnecessarily duplicated;
- unknown workflow areas are surfaced;
- output is Bahasa Indonesia;
- suggestions require PM review.

---

# 50. Requirement Extraction Acceptance

Provide Brief/ClientAnswer evidence.

Verify:

- Requirement candidates reference evidence;
- ambiguous statement is marked appropriately;
- accepted candidate becomes `DRAFT`;
- not `APPROVED`.

---

# 51. Meeting Analysis Acceptance

Input meeting notes/transcript.

Verify Gemini produces applicable:

- summary;
- decisions;
- action items;
- requirement candidates;
- scope changes;
- risks;
- follow-ups.

Verify all authoritative candidates remain reviewable suggestions.

---

# 52. Action Item Due-Date Acceptance

If meeting states no date:

Expected:

```text
due_date = null
```

BLOCKED if AI invents a date.

---

# 53. Scope Change Detection Acceptance

Provide:

```text
Approved Scope:
Email/password login

New Meeting:
Add Google Login
```

Verify:

- potential Scope Change generated;
- original/new evidence shown;
- impact categories may be suggested;
- exact schedule impact is not invented.

---

# 54. Task Breakdown Acceptance

Generate planning suggestions from approved Scope.

Verify:

- Tasks relate to approved scope;
- unrelated common features are not added;
- individual suggestions can be accepted/rejected.

---

# 55. Project Health Acceptance

Verify health can be computed while Gemini is disabled.

Test deterministic signals.

Example:

```text
2 critical overdue Tasks
1 open high-impact Blocker
```

Expected health according to rules version.

AI explanation is optional.

---

# 56. Project Health Evidence Acceptance

Every displayed health status should allow PM to inspect why.

BLOCKED if health is unexplained AI-only output.

---

# 57. PM Control Center Acceptance

Verify Dashboard surfaces:

- overdue;
- blocked;
- client dependencies;
- milestones at risk;
- pending approvals;
- clarification needs.

Each attention item must navigate to relevant record/filter.

---

# 58. Weekly Internal Report Acceptance

Select reporting period.

Verify evidence resolver includes relevant:

- Task;
- Milestone;
- Issue;
- Risk;
- Blocker;
- Client Dependency;
- Scope Change;
- Decision.

Generate draft.

Verify:

- Bahasa Indonesia;
- no invented progress;
- negative evidence not silently removed;
- draft is editable.

---

# 59. Internal Report Finalization Acceptance

Verify:

```text
DRAFT
→ UNDER_REVIEW
→ FINAL
```

After FINAL:

- historical content remains;
- later Project changes do not rewrite finalized report.

---

# 60. Client Report Gate Acceptance

Attempt to finalize client report before required internal-review condition.

Expected:

```text
REJECTED
```

Then complete internal review.

Expected:

```text
Client Report can proceed
```

---

# 61. Client-Visible Context Acceptance

Verify PM can explicitly include/exclude internal evidence before generating client report.

Test that excluded sensitive/internal evidence does not appear in generated client report.

---

# 62. Monthly Report Acceptance

Verify monthly report synthesizes period rather than merely concatenating weekly narratives.

It should use monthly evidence and finalized weekly context where applicable.

---

# 63. Report Supersession Acceptance

Finalize Report v1.

Create corrected Report v2.

Verify:

```text
v1 = SUPERSEDED
v2 = FINAL
```

v1 remains readable.

---

# 64. Documentation Evidence Coverage Acceptance

Before generation, verify evidence coverage is shown.

Example:

```text
Approved Requirements: present
Scope: present
Permission Matrix: missing
```

---

# 65. FSD Generation Acceptance

Generate FSD.

Verify:

- only approved/authoritative features included;
- unsupported feature is not invented;
- missing evidence is visible;
- Bahasa Indonesia output;
- draft is editable.

---

# 66. User Guide Acceptance

Verify User Guide reflects implemented/final functionality.

Planned-but-not-delivered functionality must not be documented as available.

---

# 67. Admin Guide Acceptance

If Admin Guide is not applicable:

PM may mark:

```text
NOT_REQUIRED
```

AI cannot make this decision independently.

---

# 68. Technical Documentation Acceptance

Provide incomplete technical evidence.

Verify AI marks missing technical sections rather than inventing architecture/API details.

---

# 69. Generated Document Finalization Acceptance

Verify:

```text
DRAFT
→ UNDER_REVIEW
→ FINAL
```

Later revision must preserve prior FINAL through supersession/versioning.

---

# 70. Handover Checklist Acceptance

Verify checklist item states:

```text
PENDING
IN_PROGRESS
COMPLETED
WAIVED
NOT_APPLICABLE
BLOCKED
```

---

# 71. Handover Waiver Acceptance

Attempt `WAIVED` without reason.

Expected:

```text
REJECTED
```

With reason and PM confirmation:

Expected:

```text
WAIVED
```

---

# 72. Handover Completion Acceptance

Verify all required items are:

```text
COMPLETED
WAIVED
NOT_APPLICABLE
```

Only then may Handover become `COMPLETED`.

---

# 73. Project Q&A Deterministic Query Acceptance

Ask:

```text
Which tasks are overdue?
```

Expected retrieval:

```text
SQL / deterministic Task query
```

Gemini may summarize but must not independently calculate due state.

---

# 74. Project Q&A Evidence Acceptance

Ask a historical project question.

Verify answer includes supporting records when available.

Examples:

```text
REQ-018
MTG-012
DEC-006
TASK-044
```

---

# 75. Project Q&A Missing Evidence Acceptance

Ask question with no supporting evidence.

Expected:

```text
Saya belum menemukan bukti project yang cukup...
```

BLOCKED if AI fabricates an answer.

---

# 76. Project Q&A Conflicting Evidence Acceptance

Provide conflicting records.

Expected:

- conflict surfaced;
- sources identified;
- PM advised that evidence is unresolved.

---

# 77. Search Acceptance

Global search should find major entities.

Verify:

- Bahasa Indonesia terms searchable;
- result includes Project context;
- archived/history visibility follows UI rules;
- no cross-project unauthorized results.

---

# 78. File Upload Acceptance

Verify:

- allowed file uploads succeed;
- invalid type rejected;
- oversized file rejected;
- filename sanitized;
- project access validated;
- binary stored outside PostgreSQL.

---

# 79. Attachment Traceability Acceptance

Uploaded Attachment must remain linked to source entity.

Example:

```text
Meeting
→ Attachment
```

AI-derived parsed content must not replace original file identity.

---

# 80. Parse Failure Acceptance

Simulate attachment parser failure.

Verify:

- original Attachment remains;
- parse status fails clearly;
- Project data remains usable.

---

# 81. Mobile Dashboard Acceptance

Verify smartphone layout allows:

- view Needs Attention;
- open active Project;
- inspect health;
- open overdue/blocked items.

No horizontal scrolling required for core content.

---

# 82. Mobile Task Acceptance

Verify:

- open Task;
- change status;
- create blocker;
- update due date;
- add comment.

No desktop mode required.

---

# 83. Mobile Discovery Acceptance

Verify:

- read Brief;
- review Questions;
- record Client Answer;
- review AI suggestion.

---

# 84. Mobile AI Suggestion Acceptance

Accept/Edit/Reject must remain fully usable on mobile.

No action may be hidden behind hover-only behavior.

---

# 85. Mobile Reports Acceptance

Verify:

- read report;
- inspect sections;
- perform basic editing/review;
- finalize where appropriate.

Heavy editing may be more comfortable on desktop but must remain functionally accessible.

---

# 86. Mobile Handover Acceptance

Verify:

- inspect checklist;
- update item;
- record waiver reason;
- inspect unresolved blockers.

---

# 87. Accessibility Acceptance

Verify critical flows for:

- keyboard navigation;
- visible focus;
- form labels;
- modal/drawer focus;
- non-color status communication;
- contrast.

---

# 88. Status Consistency Acceptance

The same state must use consistent user-facing wording across:

- Kanban;
- List;
- detail;
- Timeline;
- Reports.

Example:

```text
IN_PROGRESS
→ Sedang Dikerjakan
```

No conflicting localization.

---

# 89. Error Message Acceptance

Errors must state:

- what failed;
- whether data was saved;
- next action.

Example:

```text
Analisis AI gagal, tetapi catatan meeting sudah tersimpan.
```

---

# 90. AI Processing UX Acceptance

Long-running AI jobs must show status.

Example:

```text
Queued
Analyzing
Completed
Failed
```

The rest of the Project UI remains usable.

---

# 91. Concurrency Acceptance

Where relevant, test concurrent mutation.

Examples:

- two Task updates;
- two job workers;
- two AI suggestion acceptance attempts.

The system must avoid silent data corruption.

---

# 92. Database Migration Acceptance

For every migration:

- upgrade test;
- application starts after migration;
- existing fixture data remains valid;
- migration is repeatable in clean environment.

Production migration must not assume empty database.

---

# 93. Database Constraint Acceptance

Verify key constraints.

Examples:

- no self Task dependency;
- no Requirement supersession cycle;
- no unrelated cross-Project relationship;
- one active Handover per Project.

---

# 94. Health Endpoint Acceptance

Verify:

```text
/health
/health/ready
```

Expected:

- health reflects process;
- readiness reflects database/config dependencies.

Gemini temporary outage should not necessarily fail core application readiness.

---

# 95. Worker Health Acceptance

Verify worker heartbeat or equivalent.

Operator must be able to determine:

- worker alive;
- last heartbeat;
- queue state;
- recent job failure.

---

# 96. Logging Acceptance

Verify structured logs contain useful correlation fields.

Do not log secrets.

Sensitive project content should not be logged unnecessarily.

---

# 97. Request Correlation Acceptance

Verify linkage between:

```text
HTTP request
→ background job
→ AIRequest
```

where applicable.

---

# 98. Security Acceptance

At minimum verify:

- HTTPS;
- secure authentication;
- project authorization;
- upload limits;
- no public PostgreSQL;
- secrets not committed;
- safe error responses.

---

# 99. Public Network Exposure Acceptance

Production host check must confirm:

Publicly exposed:

```text
80/443 or equivalent reverse-proxy ports
```

Not publicly exposed:

```text
PostgreSQL
backend internal port
worker
```

according to deployment topology.

---

# 100. Secret Management Acceptance

Verify production secrets are external to source control.

Repository scan should not reveal:

- Gemini key;
- database credentials;
- session secrets;
- storage secrets.

---

# 101. Backup Acceptance

Verify automated PostgreSQL backup.

Evidence should include:

- backup created;
- timestamp;
- retention location;
- off-host/durable storage.

---

# 102. Restore Acceptance

Restore backup into controlled environment.

Verify:

- database starts;
- migrations compatible;
- representative Project loads;
- Tasks/Requirements/Reports intact.

BLOCKED if restore has not been proven.

---

# 103. Attachment Recovery Acceptance

Verify attachment/object-storage recovery strategy.

At minimum confirm that stored files remain accessible after application redeployment.

---

# 104. Production Smoke Test

After deployment verify:

```text
Login
Dashboard
Open Project
Create/update Task
Kanban state change
Create Client Dependency
Record Meeting
AI smoke test
Read Report
Health
Worker
```

Do not use destructive tests against production data.

---

# 105. Real Gemini Smoke Test

Use a controlled small Project context.

Verify:

- model configured correctly;
- request succeeds;
- structured response validates;
- Bahasa Indonesia user-facing output;
- no unauthorized mutation.

---

# 106. Performance Acceptance

Core non-AI workflows should feel responsive.

At minimum verify:

- Project navigation;
- Task List;
- Kanban;
- Requirement list;
- Dashboard.

Long AI/document operations may take longer but must remain asynchronous.

---

# 107. Pagination Acceptance

Large collections must not require loading all history at once.

Verify pagination/incremental loading where implemented.

---

# 108. Archive / Historical Visibility Acceptance

Verify terminal/historical records remain accessible.

Examples:

- Lost Lead;
- Cancelled Task;
- Superseded Requirement;
- Superseded Report;
- Completed Project.

Archive must not alter lifecycle history.

---

# 109. Language Policy Acceptance

Global acceptance check:

## Engineering

- specifications;
- schemas;
- enums;
- API contracts;

remain English.

## Operational

- AI outputs;
- reports;
- documents;
- user-facing generated content;

default to Bahasa Indonesia.

---

# 110. Internal-before-External Reporting Acceptance

Verify sequence:

```text
Internal Report
→ Review
→ Client-Visible Context
→ Client Report
```

Client report must not bypass internal review flow.

---

# 111. Evidence-before-AI Acceptance

For every major AI operation, verify source context exists and is inspectable.

No operation should depend solely on generic model memory for project-specific claims.

---

# 112. Enter-Once-Reuse-Everywhere Acceptance

This is a product-level validation.

Choose representative project information introduced early.

Example:

```text
Client requires booking cancellation.
```

Verify it can flow through:

```text
Client Answer
→ Requirement
→ Scope
→ Feature
→ Task
→ Report
→ FSD/User Guide
```

without repeated manual recreation of the same fact.

---

# 113. End-to-End Scenario A — Lead to Delivery

Test:

```text
Create Lead
Add Brief
Qualify
Convert to Project
Create Discovery Questions
Record Client Answers
Create Requirements
Approve Requirements
Define Scope
Create Feature
Create Tasks
Start Kanban Delivery
```

Expected all traceability preserved.

---

# 114. End-to-End Scenario B — Blocked Delivery

Test:

```text
Task IN_PROGRESS
→ Client credential missing
→ Client Dependency WAITING
→ Blocker OPEN
→ Task BLOCKED
→ Client responds
→ Dependency ACCEPTED
→ Blocker RESOLVED
→ Task IN_PROGRESS
```

Verify history throughout.

---

# 115. End-to-End Scenario C — Meeting Scope Change

Test:

```text
Meeting recorded
→ Gemini analysis
→ Scope Change suggestion
→ PM accepts
→ ScopeChange DETECTED
→ UNDER_REVIEW
→ ACCEPTED
→ Requirement updated
→ Task created
```

Verify no AI bypass.

---

# 116. End-to-End Scenario D — Weekly Reporting

Test:

```text
Delivery data exists
→ Generate Internal Report
→ PM edits
→ Finalize
→ Review client-visible context
→ Generate Client Report
→ Finalize
```

Verify confidentiality boundary.

---

# 117. End-to-End Scenario E — Project Closure

Test:

```text
Delivery complete
→ Project HANDOVER
→ Generate Documents
→ Finalize required artifacts
→ Complete checklist
→ Record acceptance
→ Handover COMPLETED
→ Project COMPLETED
```

---

# 118. End-to-End Scenario F — Project Q&A

Ask:

```text
Why was Google Login added?
```

Expected response uses:

```text
Meeting
Decision
Requirement
Scope Change
```

and returns Bahasa Indonesia explanation.

---

# 119. Regression Gate

Before each release:

- all prior phase tests pass;
- migrations pass;
- no critical authorization regression;
- no Kanban/Timeline divergence;
- no AI authority regression;
- language contract remains valid.

---

# 120. Critical Blockers

The following always produce `BLOCKED` final status:

1. unauthorized cross-Project data access;
2. invalid state transition accepted;
3. AI mutates authoritative data without PM approval;
4. Task state differs between Kanban and List/Timeline;
5. Project can complete without Handover gate;
6. finalized Report silently changes;
7. generated documentation fabricates unsupported core functionality in acceptance test;
8. client report leaks explicitly excluded internal context;
9. backup restore fails;
10. PostgreSQL exposed publicly in production;
11. production secrets committed to repository;
12. default AI operational output violates Bahasa Indonesia contract.

---

# 121. Non-Blocking Limitation Examples

Possible `PASS_WITH_NON_BLOCKING_LIMITATIONS` examples:

- Timeline editing is form-based rather than drag-based;
- advanced keyboard shortcuts deferred;
- vector semantic search not yet implemented because full-text retrieval is sufficient;
- some document export formats deferred;
- mobile document authoring less comfortable than desktop but functionally usable.

These are examples only and must not contradict current authoritative scope.

---

# 122. Verification Evidence Format

Each implementation gate should record:

```text
Gate
Status
Scope Verified
Tests Run
Results
Manual Verification
Known Limitations
Blockers
Relevant Commit/Build
Environment
Date
```

---

# 123. Suggested Verification Report Template

Example:

```text
ProjectPilot Phase 5 Verification

Status:
PASS

Scope:
Task Model & Kanban

Automated:
- 84 backend tests passed
- 21 frontend tests passed
- 7 E2E tests passed

Manual:
- Desktop Kanban PASS
- Mobile status change PASS
- Invalid transition PASS
- Optimistic rollback PASS

Limitations:
None

Gate:
READY_FOR_PHASE_6
```

---

# 124. Production Acceptance Evidence

Final production verification should include:

- deployed commit/version;
- migration state;
- container/service health;
- API health;
- worker health;
- database connectivity;
- storage connectivity;
- Gemini smoke result;
- backup status;
- restore evidence;
- functional smoke result.

---

# 125. Final Acceptance Decision

ProjectPilot v1 can be accepted only when:

- agreed implementation phases are complete;
- all critical blockers are resolved;
- final regression passes;
- production verification passes;
- backup/restore passes;
- authoritative documentation and implementation are aligned.

---

# 126. Final Product Acceptance Checklist

The final checklist must confirm:

- [ ] Authentication works
- [ ] Project isolation works
- [ ] Lead conversion is atomic
- [ ] Project lifecycle is enforced
- [ ] Discovery workflow works
- [ ] Requirements are traceable
- [ ] Requirement supersession preserves history
- [ ] Scope Changes require review
- [ ] Kanban uses authoritative Task state
- [ ] Mobile Task status updates work
- [ ] Timeline uses same Task data
- [ ] Dependencies reject cycles
- [ ] Blockers are explicit
- [ ] Client Dependencies are traceable
- [ ] Meetings can be recorded without AI
- [ ] AI analysis remains non-authoritative
- [ ] AI outputs default to Bahasa Indonesia
- [ ] Project Health is deterministic
- [ ] PM Control Center shows actionable evidence
- [ ] Weekly Internal Reporting works
- [ ] Client Reporting follows internal review
- [ ] Monthly Reporting works
- [ ] Generated Documents use evidence
- [ ] Handover Completion Gate works
- [ ] Project Q&A uses project-scoped evidence
- [ ] Search respects Project isolation
- [ ] Mobile critical workflows are usable
- [ ] Accessibility basics pass
- [ ] Production uses HTTPS
- [ ] PostgreSQL is private
- [ ] Secrets are external
- [ ] Worker health is observable
- [ ] Backups are automated
- [ ] Restore has been tested
- [ ] Final regression passes

---

# 127. Documentation Completion Status

After approval of this document, the core pre-implementation documentation set is complete:

```text
1. Product Vision & Scope
2. Product Requirements Document
3. Workflow & State Specification
4. Information Architecture & Data Model
5. AI Functional Specification
6. Technical Architecture
7. UI/UX Product Specification
8. Detailed Implementation Task Plan
9. Verification & Acceptance Plan
```

The next artifact required later, closer to production deployment, is:

**ProjectPilot — Deployment & Operations Runbook**

That document is intentionally not part of the pre-implementation foundation because it should reflect the actual production implementation and deployment environment.
