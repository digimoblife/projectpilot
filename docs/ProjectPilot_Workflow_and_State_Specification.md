# ProjectPilot — Workflow & State Specification

**Document Type:** Workflow & State Specification  
**Project:** ProjectPilot  
**Status:** Draft v1.0  
**Date:** 15 August 2026  
**Primary User:** Project Manager  
**Primary AI Model:** Gemini 3.5 Flash-Lite  
**Parent Documents:**  
- ProjectPilot — Product Vision & Scope  
- ProjectPilot — Product Requirements Document (PRD)

---

# 1. Purpose

This document defines the authoritative workflow states, state meanings, transition rules, ownership boundaries, and completion conditions used throughout ProjectPilot.

The objective is to ensure that:

- UI and backend use the same state definitions;
- Kanban columns represent real task states;
- AI suggestions cannot silently mutate authoritative project data;
- project lifecycle transitions are explicit;
- historical state changes remain traceable;
- terminal states are clearly defined;
- reporting and handover depend on explicit project evidence rather than assumptions.

This specification is authoritative for lifecycle behavior unless explicitly revised.

---

# 2. State Design Principles

## 2.1 State Must Represent Operational Meaning

A state must represent a meaningful business condition, not only a UI label.

## 2.2 One Authoritative State per Entity

Each entity must have one current authoritative state.

Views may group or filter states differently, but they must not create independent operational states.

## 2.3 Transitions Must Be Explicit

State changes must occur through defined transitions.

## 2.4 Invalid Transitions Must Be Rejected

The system must not silently accept invalid state transitions.

## 2.5 AI Cannot Authoritatively Transition Core States

Gemini may recommend a transition, but authoritative transitions remain controlled by the Project Manager or deterministic application logic explicitly authorized in this specification.

## 2.6 History Must Be Preserved

Important state changes should record:

- previous state;
- new state;
- timestamp;
- actor;
- reason/context where relevant.

## 2.7 Terminal Does Not Always Mean Immutable

Some terminal business states may allow administrative correction, but reopening behavior must be explicitly defined.

## 2.8 UI Labels May Differ from Internal Enum Names

For example:

```text
IN_PROGRESS
```

may be displayed as:

```text
In Progress
```

The internal state remains authoritative.

---


# 2A. State Language and Localization Policy

All canonical state identifiers in this specification are implementation-facing values and must remain in **English**.

Examples:

```text
IN_PROGRESS
BLOCKED
NEEDS_CLARIFICATION
AWAITING_CLIENT_APPROVAL
COMPLETED
```

User-facing labels may be localized into Bahasa Indonesia.

Example:

```text
Canonical state: IN_PROGRESS
User-facing label: Sedang Dikerjakan
```

Localization must never create a second authoritative state field.

The backend, database, API contracts, state transition validation, and audit history must operate on the canonical English state identifiers.

Operational project content displayed alongside these states should default to Bahasa Indonesia in accordance with the ProjectPilot language policy.


# 3. Entity State Overview

ProjectPilot contains stateful entities including:

```text
Lead
Project
Discovery Question
Requirement
AI Suggestion
Scope Change
Task
Milestone
Issue
Risk
Blocker
Client Dependency
Meeting
Action Item
Report
Generated Document
Handover
```

Each state machine is defined below.

---

# 4. Lead Lifecycle

## 4.1 States

```text
NEW
CONTACTED
BRIEF_SCHEDULED
QUALIFIED
NOT_QUALIFIED
CONVERTED
LOST
```

## 4.2 State Meanings

### NEW

A potential project opportunity has been recorded but no meaningful client engagement has yet been confirmed.

### CONTACTED

Initial communication with the lead has occurred.

### BRIEF_SCHEDULED

A briefing or discovery conversation has been scheduled or is actively being prepared.

### QUALIFIED

The opportunity is considered sufficiently valid to continue toward project creation.

### NOT_QUALIFIED

The opportunity has been determined not to meet qualification criteria.

### CONVERTED

The lead has been converted into a ProjectPilot project.

### LOST

The opportunity was valid but did not become a project.

---

# 5. Lead Transition Rules

Allowed transitions:

```text
NEW
 ├─→ CONTACTED
 ├─→ NOT_QUALIFIED
 └─→ LOST

CONTACTED
 ├─→ BRIEF_SCHEDULED
 ├─→ QUALIFIED
 ├─→ NOT_QUALIFIED
 └─→ LOST

BRIEF_SCHEDULED
 ├─→ QUALIFIED
 ├─→ NOT_QUALIFIED
 └─→ LOST

QUALIFIED
 ├─→ CONVERTED
 └─→ LOST
```

## 5.1 Terminal Lead States

```text
NOT_QUALIFIED
CONVERTED
LOST
```

## 5.2 Conversion Rule

A lead can transition to `CONVERTED` only when a project record is successfully created.

Lead conversion and project creation must behave as one logical operation.

If project creation fails, the lead must remain `QUALIFIED`.

## 5.3 Lead Reopening

Reopening a terminal lead is not part of the default workflow.

If an opportunity returns after `LOST` or `NOT_QUALIFIED`, the preferred behavior is to create a new lead while retaining a relationship to the previous opportunity if needed.

---

# 6. Project Lifecycle

## 6.1 States

```text
DISCOVERY
REQUIREMENT_DEFINITION
PLANNING
AWAITING_CLIENT_APPROVAL
ACTIVE_DELIVERY
HANDOVER
COMPLETED
CANCELLED
ON_HOLD
```

## 6.2 State Meanings

### DISCOVERY

The project exists, but requirements are still being explored and clarified.

### REQUIREMENT_DEFINITION

The project has sufficient context to formalize and confirm requirements.

### PLANNING

Requirements and scope are sufficiently mature to create delivery structure, tasks, milestones, and timeline.

### AWAITING_CLIENT_APPROVAL

The planned scope and delivery direction are awaiting client approval or formal confirmation.

### ACTIVE_DELIVERY

Approved project work is actively being executed.

### HANDOVER

Delivery work is substantially complete and the project is in documentation, acceptance, transfer, and closure preparation.

### COMPLETED

Required delivery and handover conditions have been satisfied.

### CANCELLED

The project has been terminated and will not proceed.

### ON_HOLD

The project is intentionally paused.

---

# 7. Project Transition Rules

Primary path:

```text
DISCOVERY
  ↓
REQUIREMENT_DEFINITION
  ↓
PLANNING
  ↓
AWAITING_CLIENT_APPROVAL
  ↓
ACTIVE_DELIVERY
  ↓
HANDOVER
  ↓
COMPLETED
```

Additional allowed transitions:

```text
DISCOVERY              → ON_HOLD
REQUIREMENT_DEFINITION → ON_HOLD
PLANNING               → ON_HOLD
AWAITING_CLIENT_APPROVAL → ON_HOLD
ACTIVE_DELIVERY        → ON_HOLD
HANDOVER               → ON_HOLD

ON_HOLD → previous active lifecycle state

DISCOVERY              → CANCELLED
REQUIREMENT_DEFINITION → CANCELLED
PLANNING               → CANCELLED
AWAITING_CLIENT_APPROVAL → CANCELLED
ACTIVE_DELIVERY        → CANCELLED
HANDOVER               → CANCELLED
```

## 7.1 Backward Transitions

Backward transitions should be allowed only when project reality genuinely requires rework.

Examples:

```text
AWAITING_CLIENT_APPROVAL → PLANNING
ACTIVE_DELIVERY → PLANNING
HANDOVER → ACTIVE_DELIVERY
```

These transitions should require a reason.

They must not erase previous history.

## 7.2 Project Completion Gate

A project may transition to `COMPLETED` only when:

- required handover items are completed or explicitly waived;
- required final documentation is completed or explicitly waived;
- final client acceptance or equivalent completion evidence is recorded where required;
- no unresolved mandatory handover blocker remains.

The exact checklist is project-configurable.

## 7.3 Completed Project Reopening

`COMPLETED` is terminal by default.

Administrative reopening may be supported later but is not part of the initial standard workflow.

---

# 8. Project ON_HOLD Behavior

When a project becomes `ON_HOLD`:

- previous lifecycle state must be retained;
- tasks must not be automatically closed;
- open issues, risks, blockers, and dependencies remain recorded;
- reporting history must remain intact;
- project dates are not automatically shifted unless the PM explicitly changes them.

Resume action returns the project to its previous active lifecycle state.

---

# 9. Discovery Question Lifecycle

## 9.1 States

```text
DRAFT
READY
SENT
ANSWERED
NEEDS_FOLLOW_UP
CLOSED
CANCELLED
```

## 9.2 State Meanings

### DRAFT

Question is being prepared.

### READY

Question has been reviewed and is ready to be communicated to the client.

### SENT

Question has been sent or communicated.

### ANSWERED

An answer has been recorded.

### NEEDS_FOLLOW_UP

The answer is incomplete, ambiguous, contradictory, or creates additional questions.

### CLOSED

The question has been sufficiently resolved.

### CANCELLED

The question is no longer relevant.

---

# 10. Discovery Question Transitions

```text
DRAFT
 ├─→ READY
 └─→ CANCELLED

READY
 ├─→ SENT
 ├─→ DRAFT
 └─→ CANCELLED

SENT
 ├─→ ANSWERED
 └─→ CANCELLED

ANSWERED
 ├─→ CLOSED
 └─→ NEEDS_FOLLOW_UP

NEEDS_FOLLOW_UP
 ├─→ SENT
 ├─→ ANSWERED
 └─→ CLOSED
```

AI may generate a draft question, but generated questions enter as `DRAFT`, not `READY`.

---

# 11. Requirement Lifecycle

## 11.1 States

```text
DRAFT
NEEDS_CLARIFICATION
CONFIRMED
APPROVED
REJECTED
SUPERSEDED
```

## 11.2 State Meanings

### DRAFT

Requirement exists but has not been sufficiently validated.

### NEEDS_CLARIFICATION

Additional information is required before the requirement can be confirmed.

### CONFIRMED

The requirement meaning is sufficiently understood and supported by evidence.

### APPROVED

The requirement is accepted as part of the authoritative project definition.

### REJECTED

The requirement has been explicitly rejected.

### SUPERSEDED

The requirement was previously valid but has been replaced by a newer authoritative requirement or decision.

---

# 12. Requirement Transition Rules

```text
DRAFT
 ├─→ NEEDS_CLARIFICATION
 ├─→ CONFIRMED
 └─→ REJECTED

NEEDS_CLARIFICATION
 ├─→ DRAFT
 ├─→ CONFIRMED
 └─→ REJECTED

CONFIRMED
 ├─→ APPROVED
 ├─→ NEEDS_CLARIFICATION
 └─→ REJECTED

APPROVED
 └─→ SUPERSEDED
```

## 12.1 AI Requirement Rule

AI-extracted requirements must not enter directly as `CONFIRMED` or `APPROVED`.

They must first exist as an AI suggestion.

After PM acceptance, the requirement enters:

```text
DRAFT
```

unless the PM explicitly records sufficient authoritative evidence to choose another permitted state.

## 12.2 Approved Requirement Editing

Material changes to an `APPROVED` requirement should not silently modify historical meaning.

Preferred behavior:

```text
Old Requirement → SUPERSEDED
New Requirement → DRAFT / CONFIRMED / APPROVED
```

with a relationship between both records.

---

# 13. AI Suggestion Lifecycle

## 13.1 States

```text
GENERATED
ACCEPTED
EDITED
REJECTED
EXPIRED
```

## 13.2 Meaning

### GENERATED

AI output is available for PM review.

### ACCEPTED

PM accepted the suggestion without material modification.

### EDITED

PM accepted the underlying suggestion after modifying it.

### REJECTED

PM rejected the suggestion.

### EXPIRED

The suggestion is no longer useful because related project context materially changed.

## 13.3 AI Suggestion Rule

AI suggestions are non-authoritative until accepted or edited.

Acceptance should create or modify the relevant authoritative entity through a controlled application action.

---

# 14. Scope Change Lifecycle

## 14.1 States

```text
DETECTED
NEEDS_CLARIFICATION
UNDER_REVIEW
ACCEPTED
REJECTED
NOT_A_SCOPE_CHANGE
IMPLEMENTED
```

## 14.2 Meaning

### DETECTED

A possible deviation from baseline scope has been identified.

### NEEDS_CLARIFICATION

More context is needed to determine whether a real scope change exists.

### UNDER_REVIEW

The PM is evaluating impact and decision.

### ACCEPTED

The change has been accepted into project scope.

### REJECTED

The proposed change will not be added.

### NOT_A_SCOPE_CHANGE

The item was reviewed and determined to already be covered by existing scope or otherwise not constitute a scope change.

### IMPLEMENTED

An accepted scope change has been reflected in authoritative requirements/planning and completed as required.

---

# 15. Scope Change Transitions

```text
DETECTED
 ├─→ NEEDS_CLARIFICATION
 ├─→ UNDER_REVIEW
 └─→ NOT_A_SCOPE_CHANGE

NEEDS_CLARIFICATION
 ├─→ UNDER_REVIEW
 ├─→ REJECTED
 └─→ NOT_A_SCOPE_CHANGE

UNDER_REVIEW
 ├─→ ACCEPTED
 ├─→ REJECTED
 ├─→ NEEDS_CLARIFICATION
 └─→ NOT_A_SCOPE_CHANGE

ACCEPTED
 └─→ IMPLEMENTED
```

AI-detected changes enter `DETECTED`.

AI cannot transition a scope change to `ACCEPTED`.

---

# 16. Task Lifecycle / Kanban States

## 16.1 Canonical States

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

These states form the authoritative task workflow and Kanban board.

## 16.2 State Meanings

### BACKLOG

Task exists but is not yet ready to be worked on.

### READY

Task is sufficiently defined and can be started when capacity is available.

### IN_PROGRESS

Active work is being performed.

### IN_REVIEW

Primary execution work is complete and awaiting review, peer review, or functional review.

### QA

Task is undergoing verification, testing, or acceptance activity.

### BLOCKED

Progress cannot continue because of an unresolved dependency or blocker.

### DONE

The task satisfies its completion criteria.

### CANCELLED

The task will not be completed and has been intentionally removed from active delivery.

---

# 17. Task Transition Rules

Normal flow:

```text
BACKLOG
  ↓
READY
  ↓
IN_PROGRESS
  ↓
IN_REVIEW
  ↓
QA
  ↓
DONE
```

Allowed alternate transitions:

```text
BACKLOG → CANCELLED
READY → BACKLOG
READY → CANCELLED

IN_PROGRESS → READY
IN_PROGRESS → BLOCKED
IN_PROGRESS → CANCELLED

IN_REVIEW → IN_PROGRESS
IN_REVIEW → BLOCKED
IN_REVIEW → QA
IN_REVIEW → CANCELLED

QA → IN_PROGRESS
QA → IN_REVIEW
QA → BLOCKED
QA → DONE
QA → CANCELLED

BLOCKED → READY
BLOCKED → IN_PROGRESS
BLOCKED → IN_REVIEW
BLOCKED → QA
BLOCKED → CANCELLED

DONE → IN_PROGRESS
```

## 17.1 DONE Reopening

A completed task may be reopened to `IN_PROGRESS` if a real defect, incomplete acceptance condition, or required rework is discovered.

Reopening must preserve completion history.

## 17.2 BLOCKED Transition Rule

When moving a task to `BLOCKED`, a blocker reason is required.

Recommended additional fields:

- blocker owner;
- blocker type;
- expected resolution;
- impact.

## 17.3 READY Rule

A task should only be `READY` when it is sufficiently actionable.

The system should not automatically enforce a universal readiness checklist in the initial version, but future configurable readiness criteria may be added.

## 17.4 DONE Rule

A task may move to `DONE` only through a valid transition.

Direct `IN_PROGRESS → DONE` is intentionally not part of the canonical default workflow.

If project types later require simplified workflows, configurability can be introduced through a controlled design revision.

---

# 18. Kanban Column Mapping

Canonical board:

```text
BACKLOG | READY | IN_PROGRESS | IN_REVIEW | QA | BLOCKED | DONE
```

`CANCELLED` tasks are normally excluded from the main active board and available through filters/history.

Kanban is a view of task state.

Changing a card's column changes the underlying task state.

No separate Kanban status field is permitted.

---

# 19. Subtask Behavior

Subtasks use the same task state model unless a future simplified subtask state model is explicitly introduced.

Parent task completion must not automatically imply every subtask is done unless the product later introduces a deterministic completion rule.

A parent task with incomplete mandatory subtasks should normally not be marked `DONE`.

---

# 20. Milestone Lifecycle

## 20.1 States

```text
PLANNED
ACTIVE
AT_RISK
ACHIEVED
MISSED
CANCELLED
```

## 20.2 Meaning

### PLANNED

Milestone exists but its delivery window has not yet become active.

### ACTIVE

Work toward the milestone is underway.

### AT_RISK

Evidence indicates the milestone may not be achieved by its target.

### ACHIEVED

Milestone acceptance conditions are satisfied.

### MISSED

The target date or milestone conditions were not achieved as planned.

### CANCELLED

Milestone is no longer applicable.

## 20.3 Determination

Where possible, `AT_RISK` should be based on deterministic delivery evidence rather than AI opinion.

AI may explain why the milestone is at risk.

---

# 21. Issue Lifecycle

## 21.1 States

```text
OPEN
IN_PROGRESS
RESOLVED
CLOSED
CANCELLED
```

## 21.2 Transitions

```text
OPEN
 ├─→ IN_PROGRESS
 ├─→ RESOLVED
 └─→ CANCELLED

IN_PROGRESS
 ├─→ RESOLVED
 └─→ CANCELLED

RESOLVED
 ├─→ CLOSED
 └─→ IN_PROGRESS

CLOSED
 └─→ IN_PROGRESS
```

`CLOSED → IN_PROGRESS` represents issue reopening.

---

# 22. Risk Lifecycle

## 22.1 States

```text
IDENTIFIED
MONITORING
MITIGATING
MATERIALIZED
CLOSED
CANCELLED
```

## 22.2 Meaning

### IDENTIFIED

A potential future problem has been recorded.

### MONITORING

The risk is actively observed.

### MITIGATING

Mitigation action is actively being performed.

### MATERIALIZED

The risk has become an actual issue.

### CLOSED

The risk no longer requires active monitoring.

### CANCELLED

The risk record is no longer applicable.

## 22.3 Risk-to-Issue Rule

When a risk becomes `MATERIALIZED`, ProjectPilot should support creating a related Issue.

The Risk record remains for historical traceability.

---

# 23. Blocker Lifecycle

## 23.1 States

```text
OPEN
IN_PROGRESS
RESOLVED
CANCELLED
```

## 23.2 Transitions

```text
OPEN
 ├─→ IN_PROGRESS
 ├─→ RESOLVED
 └─→ CANCELLED

IN_PROGRESS
 ├─→ RESOLVED
 └─→ CANCELLED

RESOLVED
 └─→ OPEN
```

## 23.3 Task Relationship

A task in `BLOCKED` should reference one or more active blockers where applicable.

Resolving the blocker must not automatically decide the task's next state.

The PM chooses the appropriate task transition.

---

# 24. Client Dependency Lifecycle

## 24.1 States

```text
DRAFT
REQUESTED
WAITING
RECEIVED
ACCEPTED
NEEDS_FOLLOW_UP
CANCELLED
```

## 24.2 Meaning

### DRAFT

Dependency is being prepared but has not been formally requested.

### REQUESTED

The client has been asked to provide the required item.

### WAITING

The request is active and ProjectPilot is waiting for the client response/item.

### RECEIVED

The requested information or asset has been received but not yet verified as sufficient.

### ACCEPTED

The dependency has been satisfactorily fulfilled.

### NEEDS_FOLLOW_UP

The received item is incomplete, invalid, or requires further client action.

### CANCELLED

The dependency is no longer required.

---

# 25. Client Dependency Transitions

```text
DRAFT
 ├─→ REQUESTED
 └─→ CANCELLED

REQUESTED
 ├─→ WAITING
 ├─→ RECEIVED
 └─→ CANCELLED

WAITING
 ├─→ RECEIVED
 └─→ CANCELLED

RECEIVED
 ├─→ ACCEPTED
 ├─→ NEEDS_FOLLOW_UP
 └─→ CANCELLED

NEEDS_FOLLOW_UP
 ├─→ REQUESTED
 ├─→ WAITING
 ├─→ RECEIVED
 └─→ CANCELLED
```

ProjectPilot may calculate waiting duration from `REQUESTED`/`WAITING` evidence.

---

# 26. Meeting Lifecycle

## 26.1 States

```text
DRAFT
RECORDED
ANALYZED
REVIEWED
FINALIZED
CANCELLED
```

## 26.2 Meaning

### DRAFT

Meeting record is being prepared.

### RECORDED

Notes, transcript, or meeting content has been captured.

### ANALYZED

AI analysis has been generated.

### REVIEWED

The PM has reviewed the meeting analysis and relevant suggestions.

### FINALIZED

Meeting notes and accepted outcomes are considered complete.

### CANCELLED

The meeting record is not applicable.

## 26.3 AI Rule

AI analysis may move the processing status to `ANALYZED`, but it must not automatically accept extracted requirements, decisions, scope changes, or task changes.

---

# 27. Action Item Lifecycle

## 27.1 States

```text
OPEN
CONVERTED
COMPLETED
CANCELLED
```

## 27.2 Meaning

### OPEN

Action item requires follow-up.

### CONVERTED

Action item has been converted into another tracked entity such as:

- task;
- client dependency;
- issue.

### COMPLETED

The action item was completed directly without needing conversion.

### CANCELLED

The action item is no longer relevant.

---

# 28. Report Lifecycle

## 28.1 Report Types

```text
WEEKLY_INTERNAL
WEEKLY_CLIENT
MONTHLY_INTERNAL
MONTHLY_CLIENT
```

## 28.2 States

```text
DRAFT
UNDER_REVIEW
FINAL
SUPERSEDED
```

## 28.3 Meaning

### DRAFT

Report is being generated or edited.

### UNDER_REVIEW

Report is actively being reviewed before finalization.

### FINAL

Report has been approved as the official report for that reporting period/type.

### SUPERSEDED

A previously final report has been explicitly replaced by a corrected final version.

---

# 29. Report Transition Rules

```text
DRAFT
 └─→ UNDER_REVIEW

UNDER_REVIEW
 ├─→ DRAFT
 └─→ FINAL

FINAL
 └─→ SUPERSEDED
```

A new corrected report is created when a `FINAL` report is superseded.

The previous final report remains preserved.

## 29.1 Internal-before-Client Gate

A client report for a given reporting period should not become `FINAL` unless the corresponding internal reporting process for that period has been completed sufficiently for PM review.

This does not mean the client report must copy the internal report.

It means the internal review step precedes client finalization.

## 29.2 AI Rule

AI may create `DRAFT` report content.

AI cannot mark reports `FINAL`.

---

# 30. Generated Document Lifecycle

## 30.1 Document Types

Examples:

```text
FSD
USER_GUIDE
ADMIN_GUIDE
TECHNICAL_DOCUMENTATION
USER_DOCUMENTATION
DESIGN_DOCUMENTATION
```

## 30.2 States

```text
DRAFT
UNDER_REVIEW
FINAL
SUPERSEDED
NOT_REQUIRED
```

## 30.3 Meaning

### DRAFT

Document exists but is not final.

### UNDER_REVIEW

Document is being reviewed.

### FINAL

Approved version for handover/use.

### SUPERSEDED

A newer final version replaced this version.

### NOT_REQUIRED

The project explicitly does not require this document.

---

# 31. Generated Document Transitions

```text
DRAFT
 ├─→ UNDER_REVIEW
 └─→ NOT_REQUIRED

UNDER_REVIEW
 ├─→ DRAFT
 └─→ FINAL

FINAL
 └─→ SUPERSEDED
```

`NOT_REQUIRED` requires an explicit PM decision.

AI cannot decide that a required project document is unnecessary.

---

# 32. Handover Lifecycle

## 32.1 States

```text
NOT_STARTED
IN_PREPARATION
READY_FOR_REVIEW
AWAITING_CLIENT_ACCEPTANCE
COMPLETED
BLOCKED
CANCELLED
```

## 32.2 Meaning

### NOT_STARTED

Handover activities have not started.

### IN_PREPARATION

Documents, deployment evidence, credentials, acceptance materials, and other handover items are being prepared.

### READY_FOR_REVIEW

Internal handover preparation is complete enough for review.

### AWAITING_CLIENT_ACCEPTANCE

Handover material has been presented or is awaiting client acceptance/confirmation.

### COMPLETED

Required handover items and acceptance conditions have been satisfied.

### BLOCKED

Handover cannot progress because of an unresolved blocker.

### CANCELLED

Handover is no longer applicable due to project cancellation or equivalent condition.

---

# 33. Handover Transition Rules

```text
NOT_STARTED
 └─→ IN_PREPARATION

IN_PREPARATION
 ├─→ READY_FOR_REVIEW
 ├─→ BLOCKED
 └─→ CANCELLED

READY_FOR_REVIEW
 ├─→ IN_PREPARATION
 ├─→ AWAITING_CLIENT_ACCEPTANCE
 ├─→ COMPLETED
 └─→ BLOCKED

AWAITING_CLIENT_ACCEPTANCE
 ├─→ COMPLETED
 ├─→ IN_PREPARATION
 └─→ BLOCKED

BLOCKED
 ├─→ IN_PREPARATION
 ├─→ READY_FOR_REVIEW
 ├─→ AWAITING_CLIENT_ACCEPTANCE
 └─→ CANCELLED
```

Direct `READY_FOR_REVIEW → COMPLETED` is allowed for projects where formal client acceptance is not required.

---

# 34. Handover Completion Conditions

Handover may transition to `COMPLETED` only if every required handover item is one of:

```text
COMPLETED
WAIVED
NOT_APPLICABLE
```

A required unresolved item prevents handover completion.

Potential handover checklist items include:

- production deployment;
- UAT/acceptance;
- credentials;
- source code;
- User Guide;
- Admin Guide;
- Technical Documentation;
- User Documentation;
- Design Documentation;
- FSD;
- backup/recovery information;
- training;
- support contact/process.

---

# 35. Handover Checklist Item States

Each checklist item should support:

```text
PENDING
IN_PROGRESS
COMPLETED
WAIVED
NOT_APPLICABLE
BLOCKED
```

`WAIVED` should require:

- reason;
- PM confirmation.

`NOT_APPLICABLE` should require explicit classification.

---

# 36. Project Completion Relationship

Canonical closure relationship:

```text
ACTIVE_DELIVERY
      ↓
HANDOVER
      ↓
Handover Lifecycle = COMPLETED
      ↓
Project = COMPLETED
```

Completing development tasks alone is not sufficient to complete the project.

---

# 37. Approval Records

Approvals are not represented only as free-text comments.

Where approval materially affects project lifecycle, ProjectPilot should retain:

- approval type;
- approved item;
- approved by;
- date;
- evidence/source;
- notes.

Examples:

```text
SCOPE_APPROVAL
REQUIREMENT_APPROVAL
DELIVERY_APPROVAL
UAT_APPROVAL
HANDOVER_ACCEPTANCE
```

---

# 38. State Changes Triggered by Deterministic Logic

ProjectPilot may automatically derive or suggest states only where rules are deterministic.

Examples:

- mark a task as overdue based on due date without changing task state;
- calculate client waiting duration;
- identify milestone date variance;
- calculate health signals;
- mark an AI processing request as failed.

Deterministic indicators must remain separate from authoritative business states unless this specification explicitly permits automatic transition.

For example:

```text
Task status = IN_PROGRESS
Due date passed = OVERDUE indicator
```

The system must not automatically change the task state to `BLOCKED` merely because it is overdue.

---

# 39. Derived Flags vs States

ProjectPilot should use derived flags for conditions that do not represent lifecycle state.

Examples:

```text
OVERDUE
DUE_SOON
STALE
NEEDS_ATTENTION
CLIENT_DELAY
MILESTONE_RISK
```

These are not task or project lifecycle states.

Example:

```text
Task State: IN_PROGRESS
Derived Flag: OVERDUE
```

This separation prevents state explosion.

---

# 40. Project Health

Project health is a derived project indicator, not a project lifecycle state.

Initial health categories:

```text
HEALTHY
WATCH
AT_RISK
CRITICAL
```

Health may be calculated from deterministic signals such as:

- critical overdue tasks;
- number/duration of blockers;
- milestone risk;
- unresolved high-severity issues;
- high-impact risks;
- client dependency duration;
- dependency chain impact.

Exact formula will be defined in a later specification or architecture decision.

Gemini may explain health evidence but does not authoritatively assign the health state unless the result is generated through deterministic application rules.

---

# 41. Archive Behavior

ProjectPilot may later support archived views for records that are no longer part of normal active workflows.

Archiving is not equivalent to lifecycle completion.

Examples:

```text
COMPLETED Project → may be archived
LOST Lead → may be archived
DONE Task → may be hidden from active view
```

Archive behavior is a presentation/retention concern and must not replace lifecycle state.

---

# 42. Deletion Principles

Operational records with meaningful history should generally not be hard-deleted through normal product workflows.

Preferred alternatives:

- `CANCELLED`;
- `REJECTED`;
- `SUPERSEDED`;
- archive;
- soft deletion where technically required.

Examples of records where historical integrity matters:

- requirements;
- decisions;
- scope changes;
- tasks;
- reports;
- generated documents.

Exact deletion policy will be defined in the Data Model / Technical Architecture.

---

# 43. Cross-State Constraints

## 43.1 Project and Task

A project in `COMPLETED` should not accept new active delivery tasks under normal workflow.

## 43.2 Project and Reporting

Reports remain historically accessible after project completion.

## 43.3 Project and Requirements

New authoritative requirements should normally not be added after `COMPLETED`.

If post-completion work is required, it should preferably be treated as a new project/change initiative rather than silently modifying the completed project.

## 43.4 Project and Handover

Project cannot become `COMPLETED` before handover is complete.

## 43.5 Cancelled Project

When project state becomes `CANCELLED`:

- existing records remain available;
- open tasks are not silently deleted;
- the PM may explicitly cancel open operational items;
- historical reports and evidence remain preserved.

---

# 44. AI Processing State

AI requests may use a separate technical processing lifecycle:

```text
PENDING
PROCESSING
SUCCEEDED
FAILED
CANCELLED
```

This technical state is separate from AI Suggestion state.

Example:

```text
AI Request = SUCCEEDED
AI Suggestion = GENERATED
```

An AI request failure must not change authoritative business states.

---

# 45. Example — Brief to Requirement

```text
Initial Brief
      ↓
Gemini Analysis
      ↓
AI Suggestion = GENERATED
      ↓
PM ACCEPTS
      ↓
Requirement = DRAFT
      ↓
Client Clarification Needed
      ↓
Requirement = NEEDS_CLARIFICATION
      ↓
Client Answer
      ↓
Requirement = CONFIRMED
      ↓
PM Approval
      ↓
Requirement = APPROVED
```

---

# 46. Example — Meeting to Scope Change

```text
Meeting = RECORDED
      ↓
Gemini Analysis
      ↓
Meeting = ANALYZED

AI detects:
"Add Google Login"

      ↓
AI Suggestion = GENERATED
      ↓
PM ACCEPTS
      ↓
Scope Change = DETECTED
      ↓
UNDER_REVIEW
      ↓
ACCEPTED
      ↓
Requirement / Planning Updated
      ↓
IMPLEMENTED
```

---

# 47. Example — Task Blocker

```text
Task = IN_PROGRESS
      ↓
External API unavailable
      ↓
Blocker = OPEN
      ↓
Task = BLOCKED
      ↓
Client Dependency = REQUESTED / WAITING
      ↓
Credential received
      ↓
Client Dependency = RECEIVED
      ↓
Client Dependency = ACCEPTED
      ↓
Blocker = RESOLVED
      ↓
PM transitions Task = IN_PROGRESS
```

No automatic task resume is required.

---

# 48. Example — Weekly Reporting

```text
Project Delivery Data
      ↓
Gemini Draft
      ↓
Internal Report = DRAFT
      ↓
UNDER_REVIEW
      ↓
FINAL
      ↓
Management Discussion
      ↓
Client Report = DRAFT
      ↓
PM Review
      ↓
FINAL
```

---

# 49. Example — Project Completion

```text
Active Tasks
      ↓
Required Tasks = DONE

Project = ACTIVE_DELIVERY
      ↓
Project = HANDOVER

Handover = IN_PREPARATION
      ↓
Documents = FINAL
Checklist = COMPLETED / WAIVED / NOT_APPLICABLE
Client Acceptance = Recorded if required
      ↓
Handover = COMPLETED
      ↓
Project = COMPLETED
```

---

# 50. State Ownership Summary

| Entity | Primary Authority | AI May Suggest | Automatic Deterministic Transition |
|---|---|---:|---:|
| Lead | PM | Yes | Limited |
| Project | PM | Yes | No |
| Discovery Question | PM | Yes | No |
| Requirement | PM | Yes | No |
| AI Suggestion | System + PM | N/A | Yes for generation state |
| Scope Change | PM | Yes | No |
| Task | PM | Yes | No |
| Milestone | PM/System | Yes | Limited |
| Issue | PM | Yes | No |
| Risk | PM | Yes | No |
| Blocker | PM | Yes | No |
| Client Dependency | PM | Yes | Limited derived timing only |
| Meeting | PM/System | Yes | AI processing may set ANALYZED |
| Action Item | PM | Yes | No |
| Report | PM | Yes | No |
| Generated Document | PM | Yes | No |
| Handover | PM | Yes | No |
| AI Processing Request | System | No | Yes |

---

# 51. State Validation Requirements

The backend must validate state transitions.

The frontend should prevent obviously invalid transitions, but frontend validation is not sufficient.

The backend remains authoritative.

For every transition that requires additional information, the backend should validate required fields.

Examples:

### Task → BLOCKED

Requires:

```text
blocker reason
```

### Document → NOT_REQUIRED

Requires:

```text
explicit PM classification
```

### Handover checklist → WAIVED

Requires:

```text
waiver reason
```

### Project → COMPLETED

Requires:

```text
handover completion gate satisfied
```

---

# 52. Activity Logging Requirements

State transitions considered operationally meaningful should be logged.

At minimum:

```text
entity type
entity id
previous state
new state
actor
timestamp
optional reason
optional source/reference
```

Examples:

```text
Task:
IN_PROGRESS → BLOCKED

Requirement:
CONFIRMED → APPROVED

Project:
ACTIVE_DELIVERY → HANDOVER
```

---

# 53. State-Related Notifications

State changes may later generate attention items or notifications.

Examples:

- task enters `BLOCKED`;
- milestone becomes `AT_RISK`;
- client dependency remains `WAITING` beyond expected date;
- scope change becomes `UNDER_REVIEW`;
- project enters `HANDOVER`.

Notification channels are intentionally deferred.

---

# 54. Mobile State Operations

Important state operations should remain usable on mobile.

Priority mobile actions include:

- move task between valid states;
- create blocker;
- resolve blocker;
- review AI suggestion;
- accept/edit/reject suggestion;
- update client dependency;
- finalize quick meeting review;
- review reporting state.

Mobile UI must not expose invalid transitions merely because of simplified layout.

---

# 55. Deferred Workflow Decisions

The following remain intentionally deferred:

- whether Kanban workflows become configurable per project type;
- whether team members receive direct accounts in the first release;
- automatic notification behavior;
- configurable project lifecycle templates;
- SLA-based client dependency escalation;
- customizable milestone health rules;
- automatic archival rules;
- post-completion project reopening;
- approval workflows involving multiple approvers;
- external tool synchronization;
- external task status mapping.

Implementation must not assume these capabilities until specified.

---

# 56. Canonical State Summary

## Lead

```text
NEW
CONTACTED
BRIEF_SCHEDULED
QUALIFIED
NOT_QUALIFIED
CONVERTED
LOST
```

## Project

```text
DISCOVERY
REQUIREMENT_DEFINITION
PLANNING
AWAITING_CLIENT_APPROVAL
ACTIVE_DELIVERY
HANDOVER
COMPLETED
CANCELLED
ON_HOLD
```

## Discovery Question

```text
DRAFT
READY
SENT
ANSWERED
NEEDS_FOLLOW_UP
CLOSED
CANCELLED
```

## Requirement

```text
DRAFT
NEEDS_CLARIFICATION
CONFIRMED
APPROVED
REJECTED
SUPERSEDED
```

## AI Suggestion

```text
GENERATED
ACCEPTED
EDITED
REJECTED
EXPIRED
```

## Scope Change

```text
DETECTED
NEEDS_CLARIFICATION
UNDER_REVIEW
ACCEPTED
REJECTED
NOT_A_SCOPE_CHANGE
IMPLEMENTED
```

## Task

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

## Milestone

```text
PLANNED
ACTIVE
AT_RISK
ACHIEVED
MISSED
CANCELLED
```

## Issue

```text
OPEN
IN_PROGRESS
RESOLVED
CLOSED
CANCELLED
```

## Risk

```text
IDENTIFIED
MONITORING
MITIGATING
MATERIALIZED
CLOSED
CANCELLED
```

## Blocker

```text
OPEN
IN_PROGRESS
RESOLVED
CANCELLED
```

## Client Dependency

```text
DRAFT
REQUESTED
WAITING
RECEIVED
ACCEPTED
NEEDS_FOLLOW_UP
CANCELLED
```

## Meeting

```text
DRAFT
RECORDED
ANALYZED
REVIEWED
FINALIZED
CANCELLED
```

## Action Item

```text
OPEN
CONVERTED
COMPLETED
CANCELLED
```

## Report

```text
DRAFT
UNDER_REVIEW
FINAL
SUPERSEDED
```

## Generated Document

```text
DRAFT
UNDER_REVIEW
FINAL
SUPERSEDED
NOT_REQUIRED
```

## Handover

```text
NOT_STARTED
IN_PREPARATION
READY_FOR_REVIEW
AWAITING_CLIENT_ACCEPTANCE
COMPLETED
BLOCKED
CANCELLED
```

## Handover Checklist Item

```text
PENDING
IN_PROGRESS
COMPLETED
WAIVED
NOT_APPLICABLE
BLOCKED
```

## AI Processing

```text
PENDING
PROCESSING
SUCCEEDED
FAILED
CANCELLED
```

---

# 57. Acceptance Direction

This specification is considered correctly implemented when:

1. every stateful entity uses one authoritative current state;
2. invalid transitions are rejected by the backend;
3. Kanban columns map directly to task states;
4. task state changes are reflected in every task view;
5. AI suggestions remain non-authoritative until PM review;
6. AI failures do not alter authoritative project data;
7. blocked tasks require blocker context;
8. approved requirement history is preserved when superseded;
9. final reports are not silently overwritten;
10. project completion requires handover completion;
11. derived conditions such as overdue remain separate from lifecycle state;
12. important transitions are traceable in activity history;
13. project ON_HOLD preserves previous lifecycle context;
14. client dependency waiting time is traceable;
15. completed tasks may be reopened without losing history.

---

# 58. Next Authoritative Document

The next document should be:

**ProjectPilot — Information Architecture & Data Model**

That document will translate the workflows and state machines defined here into:

- entities;
- relationships;
- ownership;
- cardinality;
- core fields;
- traceability links;
- historical records;
- attachment relationships;
- shared task model;
- AI suggestion storage;
- reporting/document structures;
- data integrity constraints.

The data model must follow the state behavior defined in this document rather than inventing independent lifecycle behavior.
