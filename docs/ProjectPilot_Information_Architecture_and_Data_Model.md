# ProjectPilot — Information Architecture & Data Model

**Document Type:** Information Architecture & Data Model  
**Project:** ProjectPilot  
**Status:** Draft v1.0  
**Date:** 15 August 2026  
**Primary User:** Project Manager  
**Primary AI Model:** Gemini 3.5 Flash-Lite  
**Parent Documents:**  
- ProjectPilot — Product Vision & Scope  
- ProjectPilot — Product Requirements Document (PRD)  
- ProjectPilot — Workflow & State Specification  

---

# 1. Purpose

This document defines the conceptual information architecture and authoritative data model for ProjectPilot.

Its purpose is to ensure that:

- project information has clear ownership;
- entity relationships are explicit;
- Kanban, Timeline, Calendar, and List views share the same operational task data;
- requirement-to-delivery traceability is preserved;
- decisions and historical changes remain auditable;
- AI suggestions are stored separately from authoritative project data;
- reports and documents can be generated from structured project evidence;
- cross-project PM views can operate on consistent data;
- future backend implementation does not invent relationships independently.

This document defines the logical data model, not the final physical database schema.

Column types, indexes, database engine details, migration strategy, and implementation-specific constraints will be defined in Technical Architecture and implementation specifications.

---

# 2. Information Architecture Principles

## 2.1 Project-Centric Knowledge

Project is the primary operational container for delivery data.

Most delivery entities belong directly or indirectly to a Project.

## 2.2 Client and Project Are Separate Entities

A Client may have multiple Leads and multiple Projects.

A Project belongs to one primary Client in the initial model.

## 2.3 Authoritative Data and AI-Derived Data Must Be Separate

AI suggestions must not be stored as if they were approved requirements, decisions, tasks, or scope changes.

## 2.4 Shared Task Source of Truth

Kanban, Timeline, Calendar, List, Milestone, PM Control Center, and Reports must consume the same task records.

## 2.5 Traceability Is First-Class

ProjectPilot must be able to connect:

```text
Source Evidence
      ↓
Requirement
      ↓
Scope
      ↓
Feature
      ↓
Task
      ↓
Delivery Evidence
      ↓
Report / Documentation
```

## 2.6 Historical Records Must Not Be Silently Destroyed

Where project meaning changes materially, versioning, supersession, activity history, or explicit transition records should preserve the earlier state.

## 2.7 Avoid Redundant Facts

The same operational fact should not be duplicated across multiple entities unless there is a justified snapshot or historical reason.

---


# 2A. Language Representation in the Data Model

ProjectPilot distinguishes between **machine-facing identifiers** and **user-facing project content**.

## 2A.1 Machine-Facing Data

The following should remain in English:

- entity names;
- database field names;
- canonical enum values;
- API field names;
- structured AI contract keys;
- implementation-facing identifiers.

Example:

```text
status = IN_PROGRESS
category = FUNCTIONAL
evidence_quality = EXPLICIT
```

## 2A.2 User-Facing Project Content

Textual content created or generated for operational projects should default to Bahasa Indonesia.

Examples include:

```text
Task.title
Task.description
Requirement.title
Requirement.description
DiscoveryQuestion.question
Meeting.summary
Decision.decision
Report.content
GeneratedDocument.content
AISuggestion.human_summary
```

## 2A.3 Structured AI Payloads

Structured payload keys and enum values may remain in English while human-readable content values are Bahasa Indonesia.

Example:

```json
{
  "requirement_category": "FUNCTIONAL",
  "evidence_quality": "EXPLICIT",
  "title": "Pembatalan Pemesanan",
  "description": "Pengguna dapat membatalkan pemesanan sebelum batas waktu yang disepakati."
}
```

## 2A.4 Localization Must Not Duplicate Authoritative Data

Translated UI labels must not create duplicate state, category, or status fields.

Localization belongs to the presentation layer; canonical data remains singular.


# 3. Top-Level Information Architecture

The main information hierarchy is:

```text
Workspace / Account
│
├── Clients
│    ├── Stakeholders
│    ├── Leads
│    └── Projects
│
├── Leads
│
├── Projects
│    ├── Overview
│    ├── Brief & Discovery
│    ├── Requirements
│    ├── Decisions
│    ├── Scope
│    ├── Planning
│    ├── Tasks
│    ├── Timeline & Milestones
│    ├── Team
│    ├── Dependencies
│    ├── Issues / Risks / Blockers
│    ├── Meetings
│    ├── Reports
│    ├── Documents
│    └── Handover
│
├── My Work
│
├── Reports
│
└── Documents
```

The exact UI navigation may differ, but the data ownership model should follow this structure.

---

# 4. Core Entity Map

Primary entities:

```text
User
Client
Stakeholder
Lead
Project
ProjectMember

Brief
DiscoveryQuestion
ClientAnswer

Requirement
RequirementSource
Decision
ScopeItem
ScopeChange

Epic
Feature
Task
TaskDependency
Milestone

Issue
Risk
Blocker
ClientDependency

Meeting
MeetingParticipant
ActionItem

AISuggestion
AIRequest

Report
ReportEvidence

GeneratedDocument
DocumentEvidence

Handover
HandoverItem

Attachment
Comment
ActivityEvent
Approval
```

Supporting entities may be added during implementation where needed, but they must not contradict this model.

---

# 5. User

## 5.1 Purpose

Represents an authenticated ProjectPilot user.

For the initial product, the primary active user is the Project Manager.

## 5.2 Core Fields

Conceptual fields:

```text
id
name
email
role
status
created_at
updated_at
```

## 5.3 Relationships

```text
User
 ├── owns Leads
 ├── manages Projects
 ├── performs state transitions
 ├── approves AI suggestions
 ├── creates/edits Reports
 └── creates ActivityEvents
```

Future multi-user authorization may expand this model.

---

# 6. Client

## 6.1 Purpose

Represents a client organization.

## 6.2 Core Fields

```text
id
name
description
industry
website
primary_contact_reference
notes
created_at
updated_at
```

## 6.3 Relationships

```text
Client 1 ─── * Stakeholder
Client 1 ─── * Lead
Client 1 ─── * Project
```

A lead may initially have incomplete client data. Conversion may create or link a Client record.

---

# 7. Stakeholder

## 7.1 Purpose

Represents a client-side or external stakeholder relevant to one or more projects.

## 7.2 Core Fields

```text
id
client_id
name
role
organization
email
phone
decision_authority
notes
created_at
updated_at
```

## 7.3 Project Relationship

A stakeholder may participate in multiple projects.

Recommended relationship:

```text
Stakeholder * ─── * Project
```

through a join entity such as `ProjectStakeholder`.

Potential join metadata:

```text
project_role
is_primary_pic
responsibility
notes
```

---

# 8. Lead

## 8.1 Purpose

Represents a potential project opportunity before project conversion.

## 8.2 Core Fields

```text
id
client_id nullable
name
company_name_snapshot
primary_contact_snapshot
project_type
source
opportunity_description
initial_notes
owner_user_id
status
lost_reason nullable
created_at
updated_at
converted_at nullable
converted_project_id nullable
```

Snapshots allow initial lead information to remain historically intact even if Client data changes later.

## 8.3 Relationships

```text
Lead → Client optional
Lead → Brief optional/multiple
Lead → Project at most one converted project
```

---

# 9. Project

## 9.1 Purpose

Primary operational container for a delivery engagement.

## 9.2 Core Fields

```text
id
client_id
name
description
project_type
project_manager_user_id
lifecycle_state
previous_lifecycle_state nullable
health_status derived/reference
start_date nullable
target_completion_date nullable
actual_completion_date nullable
on_hold_reason nullable
cancelled_reason nullable
created_from_lead_id nullable
created_at
updated_at
```

## 9.3 Relationships

A Project may have:

```text
many ProjectMembers
many ProjectStakeholders
many Briefs
many DiscoveryQuestions
many Requirements
many Decisions
many ScopeItems
many ScopeChanges
many Epics
many Features
many Tasks
many Milestones
many Issues
many Risks
many Blockers
many ClientDependencies
many Meetings
many Reports
many GeneratedDocuments
one Handover record
many Attachments
many ActivityEvents
many Approvals
many AIRequests
many AISuggestions
```

---

# 10. ProjectMember

## 10.1 Purpose

Represents internal team membership in a project.

The initial version may use these records without requiring each team member to have an authenticated user account.

## 10.2 Core Fields

```text
id
project_id
user_id nullable
name
role
function
email nullable
active
joined_at nullable
left_at nullable
notes
```

## 10.3 Relationships

A ProjectMember may be assigned to multiple Tasks.

---

# 11. Brief

## 11.1 Purpose

Stores briefing information captured during lead or project discovery.

## 11.2 Core Fields

```text
id
lead_id nullable
project_id nullable
title
content
source_type
source_reference nullable
captured_at
captured_by_user_id
created_at
updated_at
```

## 11.3 Rule

A Brief must belong to either a Lead or Project context.

When a Lead is converted, relevant Brief records should be linked or copied by reference into the Project context without losing original lead traceability.

---

# 12. DiscoveryQuestion

## 12.1 Purpose

Represents a question used to clarify project requirements.

## 12.2 Core Fields

```text
id
project_id
category
question
rationale nullable
status
source_type
ai_suggestion_id nullable
created_by_user_id nullable
created_at
updated_at
sent_at nullable
closed_at nullable
```

## 12.3 Relationships

```text
DiscoveryQuestion 1 ─── * ClientAnswer
DiscoveryQuestion → Requirement(s) optional
```

---

# 13. ClientAnswer

## 13.1 Purpose

Stores client responses to discovery questions.

## 13.2 Core Fields

```text
id
project_id
discovery_question_id
answer
respondent_stakeholder_id nullable
source_type
source_reference nullable
answered_at
recorded_by_user_id
created_at
updated_at
```

## 13.3 Traceability

A ClientAnswer may support one or more Requirements.

This relationship should be explicit rather than embedded only in free text.

---

# 14. Requirement

## 14.1 Purpose

Stores an authoritative or in-progress project requirement.

## 14.2 Core Fields

```text
id
project_id
requirement_key
title
description
category
module_area nullable
actor nullable
business_rule nullable
priority
status
supersedes_requirement_id nullable
superseded_by_requirement_id nullable
created_by_user_id
approved_by_user_id nullable
approved_at nullable
created_at
updated_at
```

## 14.3 Requirement Key

A human-readable unique key within the project is recommended.

Example:

```text
REQ-001
REQ-002
```

## 14.4 Relationships

```text
Requirement * ─── * RequirementSource
Requirement * ─── * Decision
Requirement * ─── * ScopeItem
Requirement * ─── * Feature
Requirement * ─── * Task
Requirement → Requirement supersession chain
```

---

# 15. RequirementSource

## 15.1 Purpose

Provides explicit evidence for a Requirement.

## 15.2 Source Types

Examples:

```text
BRIEF
DISCOVERY_QUESTION
CLIENT_ANSWER
MEETING
DECISION
DOCUMENT
EMAIL_REFERENCE
MANUAL_PM_ENTRY
OTHER
```

## 15.3 Core Fields

```text
id
requirement_id
source_type
source_entity_id nullable
source_reference nullable
evidence_excerpt nullable
created_at
```

## 15.4 Rule

RequirementSource should support multiple evidence sources per Requirement.

---

# 16. Decision

## 16.1 Purpose

Stores an important project decision.

## 16.2 Core Fields

```text
id
project_id
decision_key
title
topic
decision
rationale nullable
decision_date
requested_by_stakeholder_id nullable
decided_by_stakeholder_id nullable
decided_by_user_id nullable
source_type
source_entity_id nullable
supersedes_decision_id nullable
superseded_by_decision_id nullable
created_at
updated_at
```

## 16.3 Relationships

```text
Decision * ─── * Requirement
Decision * ─── * ScopeItem
Decision * ─── * ScopeChange
Decision * ─── * Task optional
Decision * ─── * Meeting
```

---

# 17. ScopeItem

## 17.1 Purpose

Represents the authoritative project scope baseline or current scope.

## 17.2 Core Fields

```text
id
project_id
scope_key
title
description
classification
status
baseline_version
created_from_requirement_id nullable
created_at
updated_at
```

## 17.3 Classification

```text
IN_SCOPE
OUT_OF_SCOPE
UNDECIDED
```

Potential changes should normally be represented through `ScopeChange` rather than directly changing baseline scope.

## 17.4 Relationships

```text
ScopeItem * ─── * Requirement
ScopeItem * ─── * Feature
ScopeItem * ─── * Task
ScopeItem → ScopeChange history
```

---

# 18. ScopeChange

## 18.1 Purpose

Represents a proposed or detected deviation from approved scope.

## 18.2 Core Fields

```text
id
project_id
scope_change_key
title
description
status
detected_from_type
detected_from_entity_id nullable
original_scope_summary
proposed_change_summary
impact_summary nullable
decision_id nullable
ai_suggestion_id nullable
created_at
updated_at
accepted_at nullable
implemented_at nullable
```

## 18.3 Relationships

A ScopeChange may affect:

```text
many Requirements
many ScopeItems
many Features
many Tasks
many Milestones
```

Use explicit join tables where multiple relationships are needed.

---

# 19. Epic

## 19.1 Purpose

Represents a major delivery area.

## 19.2 Core Fields

```text
id
project_id
epic_key
title
description
priority
status_optional
sort_order
created_at
updated_at
```

## 19.3 Relationships

```text
Epic 1 ─── * Feature
Epic 1 ─── * Task optionally
```

Task direct-to-Epic support may be allowed when a Feature level is unnecessary.

---

# 20. Feature

## 20.1 Purpose

Represents a functional or delivery capability within an Epic.

## 20.2 Core Fields

```text
id
project_id
epic_id nullable
feature_key
title
description
priority
status_optional
created_at
updated_at
```

## 20.3 Relationships

```text
Feature * ─── * Requirement
Feature * ─── * ScopeItem
Feature 1 ─── * Task
```

---

# 21. Task

## 21.1 Purpose

Represents the authoritative unit of operational work.

## 21.2 Core Fields

```text
id
project_id
task_key
parent_task_id nullable
epic_id nullable
feature_id nullable
title
description
status
priority
assignee_project_member_id nullable
team_function nullable
estimate_value nullable
estimate_unit nullable
progress_percent nullable
start_date nullable
due_date nullable
completed_at nullable
milestone_id nullable
created_by_user_id
cancelled_reason nullable
created_at
updated_at
```

## 21.3 Important Principle

Task status is the authoritative workflow field.

No separate Kanban status should exist.

## 21.4 Relationships

```text
Task → Project
Task → Epic optional
Task → Feature optional
Task → parent Task optional
Task → ProjectMember optional
Task → Milestone optional
Task * ─── * Requirement
Task * ─── * ScopeItem
Task * ─── * Blocker
Task * ─── * ClientDependency
Task * ─── * Issue
Task * ─── * TaskDependency
```

---

# 22. Task Progress

## 22.1 Principle

Task status and progress percentage must not contradict each other.

Recommended initial behavior:

- `progress_percent` is optional;
- task status remains authoritative;
- `DONE` implies 100%;
- `BACKLOG` does not require 0%;
- the system should avoid automatically inferring precise progress percentage from status.

This field may be omitted from MVP if it creates unnecessary ambiguity.

---

# 23. TaskDependency

## 23.1 Purpose

Represents dependency relationships between tasks.

## 23.2 Core Fields

```text
id
project_id
predecessor_task_id
successor_task_id
dependency_type
lag_value nullable
lag_unit nullable
created_at
```

## 23.3 Initial Dependency Types

Potential types:

```text
FINISH_TO_START
START_TO_START
FINISH_TO_FINISH
```

MVP may begin with `FINISH_TO_START` only if desired.

## 23.4 Constraint

A task must not depend on itself.

Circular dependency detection should be considered in implementation.

---

# 24. Milestone

## 24.1 Purpose

Represents an important project delivery checkpoint.

## 24.2 Core Fields

```text
id
project_id
milestone_key
name
description
target_date
actual_date nullable
status
priority nullable
created_at
updated_at
```

## 24.3 Relationships

```text
Milestone 1 ─── * Task
Milestone * ─── * ScopeChange optional
Milestone * ─── * Issue/Risk optional
```

## 24.4 Health

Milestone risk indicators may be derived from:

- delayed predecessor tasks;
- overdue required tasks;
- blockers;
- dependency impact.

---

# 25. Issue

## 25.1 Purpose

Represents an active problem.

## 25.2 Core Fields

```text
id
project_id
issue_key
title
description
severity
impact
status
owner_project_member_id nullable
detected_at
target_resolution_date nullable
resolved_at nullable
resolution nullable
created_at
updated_at
```

## 25.3 Relationships

```text
Issue * ─── * Task
Issue * ─── * Milestone
Issue * ─── * Meeting
Issue → Risk optional origin
```

---

# 26. Risk

## 26.1 Purpose

Represents a potential future project problem.

## 26.2 Core Fields

```text
id
project_id
risk_key
title
description
likelihood
impact
severity
status
owner_project_member_id nullable
mitigation
identified_at
closed_at nullable
created_at
updated_at
```

## 26.3 Materialization

A Risk that becomes `MATERIALIZED` may create a related Issue.

Recommended link:

```text
materialized_issue_id nullable
```

The Risk should remain preserved.

---

# 27. Blocker

## 27.1 Purpose

Represents a condition preventing active work.

## 27.2 Core Fields

```text
id
project_id
blocker_key
title
reason
status
owner_type
owner_reference_id nullable
impact nullable
expected_resolution_date nullable
resolved_at nullable
resolution nullable
created_at
updated_at
```

## 27.3 Relationships

```text
Blocker * ─── * Task
Blocker * ─── * ClientDependency optional
Blocker * ─── * Issue optional
```

A task entering `BLOCKED` should normally be linked to an active Blocker.

---

# 28. ClientDependency

## 28.1 Purpose

Represents information, approval, asset, access, or action required from the client.

## 28.2 Core Fields

```text
id
project_id
dependency_key
type
title
description
status
requested_from_stakeholder_id nullable
requested_at nullable
expected_at nullable
received_at nullable
accepted_at nullable
impact nullable
created_at
updated_at
```

## 28.3 Relationships

```text
ClientDependency * ─── * Task
ClientDependency * ─── * Milestone
ClientDependency * ─── * Blocker
ClientDependency * ─── * Meeting
```

## 28.4 Derived Fields

Do not store duplicative waiting duration if it can be calculated from timestamps.

Example:

```text
waiting_duration = now - requested_at
```

---

# 29. Meeting

## 29.1 Purpose

Stores project meeting records and source evidence.

## 29.2 Core Fields

```text
id
project_id
meeting_key
title
meeting_type
scheduled_at nullable
occurred_at
status
notes nullable
transcript nullable
summary nullable
created_by_user_id
created_at
updated_at
finalized_at nullable
```

## 29.3 Relationships

```text
Meeting * ─── * MeetingParticipant
Meeting 1 ─── * ActionItem
Meeting 1 ─── * AISuggestion
Meeting * ─── * Decision
Meeting * ─── * RequirementSource
Meeting * ─── * Issue/Risk/Blocker
```

---

# 30. MeetingParticipant

## 30.1 Purpose

Represents meeting participation.

## 30.2 Core Fields

```text
id
meeting_id
participant_type
user_id nullable
stakeholder_id nullable
project_member_id nullable
display_name_snapshot
role_snapshot nullable
```

Participant type may distinguish:

```text
INTERNAL
CLIENT
EXTERNAL
```

---

# 31. ActionItem

## 31.1 Purpose

Stores an action identified from meetings or manual PM entry.

## 31.2 Core Fields

```text
id
project_id
meeting_id nullable
title
description
status
owner_type
owner_reference_id nullable
due_date nullable
converted_entity_type nullable
converted_entity_id nullable
created_at
updated_at
completed_at nullable
```

## 31.3 Conversion

An ActionItem may be converted into:

```text
Task
ClientDependency
Issue
Follow-up record
```

The original ActionItem remains traceable.

---

# 32. AISuggestion

## 32.1 Purpose

Stores non-authoritative AI output requiring PM review.

## 32.2 Core Fields

```text
id
project_id
ai_request_id
suggestion_type
status
title nullable
structured_payload
human_summary nullable
source_context_reference
reviewed_by_user_id nullable
reviewed_at nullable
accepted_entity_type nullable
accepted_entity_id nullable
created_at
updated_at
```

## 32.3 Suggestion Types

Examples:

```text
DISCOVERY_QUESTION
REQUIREMENT
REQUIREMENT_GAP
CONTRADICTION
DECISION
SCOPE_CHANGE
ACTION_ITEM
TASK_BREAKDOWN
RISK
REPORT_CONTENT
DOCUMENT_CONTENT
```

## 32.4 Rule

`structured_payload` is not authoritative project data.

Only controlled acceptance creates or updates authoritative entities.

---

# 33. AIRequest

## 33.1 Purpose

Stores technical AI operation metadata separately from business suggestions.

## 33.2 Core Fields

```text
id
project_id
operation_type
model
status
requested_by_user_id
input_context_reference
started_at nullable
completed_at nullable
error_code nullable
error_message nullable
created_at
```

## 33.3 Model

For ProjectPilot:

```text
Gemini 3.5 Flash-Lite
```

is the only approved AI model unless product direction is explicitly revised.

## 33.4 Separation

Example:

```text
AIRequest.status = SUCCEEDED
AISuggestion.status = GENERATED
```

These represent different concerns.

---

# 34. Report

## 34.1 Purpose

Stores project reporting artifacts.

## 34.2 Core Fields

```text
id
project_id
report_type
reporting_period_start
reporting_period_end
status
version
title
content
created_by_user_id
finalized_by_user_id nullable
finalized_at nullable
supersedes_report_id nullable
created_at
updated_at
```

## 34.3 Report Types

```text
WEEKLY_INTERNAL
WEEKLY_CLIENT
MONTHLY_INTERNAL
MONTHLY_CLIENT
```

## 34.4 Versioning

A corrected report should create a new version.

Previous `FINAL` reports remain available.

---

# 35. ReportEvidence

## 35.1 Purpose

Records evidence used to generate or substantiate a Report.

## 35.2 Core Fields

```text
id
report_id
evidence_type
evidence_entity_id
evidence_snapshot nullable
created_at
```

## 35.3 Evidence Types

Examples:

```text
TASK
MILESTONE
ISSUE
RISK
BLOCKER
CLIENT_DEPENDENCY
DECISION
MEETING
SCOPE_CHANGE
```

## 35.4 Snapshot Principle

A lightweight snapshot may be stored if required to preserve what the report knew at generation/finalization time.

This is a justified historical duplication.

---

# 36. GeneratedDocument

## 36.1 Purpose

Stores project documentation drafts and final versions.

## 36.2 Core Fields

```text
id
project_id
document_type
title
status
version
content
created_by_user_id
finalized_by_user_id nullable
finalized_at nullable
supersedes_document_id nullable
created_at
updated_at
```

## 36.3 Document Types

```text
FSD
USER_GUIDE
ADMIN_GUIDE
TECHNICAL_DOCUMENTATION
USER_DOCUMENTATION
DESIGN_DOCUMENTATION
```

---

# 37. DocumentEvidence

## 37.1 Purpose

Tracks sources used to generate a project document.

## 37.2 Core Fields

```text
id
generated_document_id
evidence_type
evidence_entity_id
evidence_snapshot nullable
created_at
```

Potential evidence sources:

- Requirement;
- Decision;
- ScopeItem;
- Feature;
- Task;
- Meeting;
- Attachment;
- technical note.

---

# 38. Handover

## 38.1 Purpose

Represents the project handover process.

## 38.2 Core Fields

```text
id
project_id
status
started_at nullable
ready_for_review_at nullable
submitted_at nullable
completed_at nullable
notes
created_at
updated_at
```

## 38.3 Relationship

```text
Project 1 ─── 1 Handover
Handover 1 ─── * HandoverItem
```

A Handover record may be created when a Project is created or lazily when handover begins.

---

# 39. HandoverItem

## 39.1 Purpose

Represents one handover checklist item.

## 39.2 Core Fields

```text
id
handover_id
item_type
title
description
required
status
related_document_id nullable
related_attachment_id nullable
waiver_reason nullable
completed_at nullable
completed_by_user_id nullable
sort_order
created_at
updated_at
```

## 39.3 Item Types

Examples:

```text
PRODUCTION_DEPLOYMENT
UAT_APPROVAL
CLIENT_ACCEPTANCE
SOURCE_CODE
CREDENTIALS
FSD
USER_GUIDE
ADMIN_GUIDE
TECHNICAL_DOCUMENTATION
USER_DOCUMENTATION
DESIGN_DOCUMENTATION
BACKUP_RECOVERY
TRAINING
SUPPORT_INFORMATION
CUSTOM
```

---

# 40. Approval

## 40.1 Purpose

Represents material project approvals in structured form.

## 40.2 Core Fields

```text
id
project_id
approval_type
target_entity_type
target_entity_id
status
approved_by_type
approved_by_reference_id nullable
approved_by_name_snapshot nullable
approved_at nullable
evidence_type nullable
evidence_entity_id nullable
notes nullable
created_at
updated_at
```

## 40.3 Approval Types

Examples:

```text
REQUIREMENT_APPROVAL
SCOPE_APPROVAL
DESIGN_APPROVAL
DELIVERY_APPROVAL
UAT_APPROVAL
REPORT_APPROVAL
HANDOVER_ACCEPTANCE
CUSTOM
```

## 40.4 Rule

Important approvals should not exist only as free-text meeting notes.

---

# 41. Attachment

## 41.1 Purpose

Provides a generic relationship between files and project entities.

## 41.2 Core Fields

```text
id
project_id nullable
file_name
storage_reference
mime_type
size_bytes
uploaded_by_user_id
uploaded_at
description nullable
```

## 41.3 AttachmentLink

A generic join entity is recommended:

```text
AttachmentLink
- attachment_id
- entity_type
- entity_id
```

This avoids creating a separate attachment table for every module.

## 41.4 Potential Linked Entities

Attachments may relate to:

- Lead;
- Project;
- Brief;
- ClientAnswer;
- Requirement;
- Meeting;
- Task;
- Issue;
- Risk;
- Report;
- GeneratedDocument;
- HandoverItem.

---

# 42. Comment

## 42.1 Purpose

Stores contextual discussion or progress notes.

## 42.2 Core Fields

```text
id
project_id
entity_type
entity_id
author_user_id
content
created_at
updated_at
```

Comments are not substitutes for structured authoritative fields.

Example:

A client approval should not exist only as a comment if it materially changes scope or lifecycle.

---

# 43. ActivityEvent

## 43.1 Purpose

Provides audit history for meaningful operational changes.

## 43.2 Core Fields

```text
id
project_id nullable
entity_type
entity_id
event_type
actor_user_id nullable
previous_value nullable
new_value nullable
reason nullable
source_reference nullable
occurred_at
```

## 43.3 Examples

```text
TASK_STATUS_CHANGED
REQUIREMENT_APPROVED
SCOPE_CHANGE_ACCEPTED
MILESTONE_DATE_CHANGED
PROJECT_STATE_CHANGED
REPORT_FINALIZED
DOCUMENT_FINALIZED
HANDOVER_COMPLETED
```

## 43.4 Rule

ActivityEvent is an audit record, not the primary source of current state.

---

# 44. Requirement Traceability Model

Canonical traceability:

```text
Brief / Client Answer / Meeting / Document
                 ↓
         RequirementSource
                 ↓
            Requirement
                 ↓
            ScopeItem
                 ↓
              Feature
                 ↓
               Task
                 ↓
            Milestone
```

Not every relationship is mandatory.

The system should permit meaningful partial traceability.

---

# 45. Decision Traceability Model

```text
Meeting / Client Communication
            ↓
         Decision
        /    |    \
       ↓     ↓     ↓
Requirement Scope Task
```

A Decision may also supersede another Decision.

---

# 46. Scope Change Traceability Model

```text
New Information
     ↓
AISuggestion optional
     ↓
ScopeChange
     ↓
Decision
     ↓
Requirement Update
     ↓
ScopeItem Update
     ↓
Feature / Task / Milestone Impact
```

Scope change history must remain available after implementation.

---

# 47. Task Operational Model

The same `Task` entity powers:

```text
Kanban Board
List View
Timeline View
Calendar View
Milestone View
My Work
PM Control Center
Reports
Project Q&A
```

No view-specific task record should be created.

Derived view information may be calculated.

Examples:

```text
is_overdue
is_due_soon
has_open_blocker
has_client_dependency
```

---

# 48. Kanban Data Model

Kanban columns map directly to:

```text
Task.status
```

Canonical values:

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

The Kanban board may exclude `CANCELLED` by default.

Ordering within a column may require an operational field such as:

```text
board_position
```

or a separate ordering mechanism.

This field affects presentation order only, not workflow status.

---

# 49. Cross-Project My Work Model

`My Work` should query Tasks across Projects.

Primary relationships:

```text
Task.assignee_project_member_id
ProjectMember.user_id
```

If team members do not yet have application accounts, My Work may initially be PM-centric or filter by named ProjectMember.

---

# 50. PM Control Center Data Model

The PM Control Center should primarily use derived queries over authoritative entities.

Examples:

```text
Overdue Task
= Task.due_date < today
AND Task.status NOT IN (DONE, CANCELLED)

Blocked Task
= Task.status = BLOCKED

Pending Client Dependency
= ClientDependency.status IN (REQUESTED, WAITING, NEEDS_FOLLOW_UP)

Pending Requirement Clarification
= Requirement.status = NEEDS_CLARIFICATION

Milestone Risk
= derived from milestone/task evidence
```

Do not duplicate these records into a separate dashboard facts table unless later required for performance caching.

---

# 51. Project Health Data Model

Project health should be derived, not independently edited as an arbitrary status.

Potential persisted structure if auditability is needed:

```text
ProjectHealthSnapshot
- id
- project_id
- health_status
- calculated_at
- evidence_summary
- rules_version
```

This is optional.

The current health displayed in the UI should be based on deterministic project evidence.

---

# 52. Reporting Data Flow

```text
Authoritative Project Data
          ↓
   Reporting Query Layer
          ↓
   Report Evidence Set
          ↓
 Gemini Draft Generation
          ↓
      Report.DRAFT
          ↓
       PM Review
          ↓
      Report.FINAL
```

The Report content is a historical artifact.

The source entities remain authoritative operational data.

---

# 53. Documentation Data Flow

```text
Approved Requirements
Decisions
Scope
Features
Tasks
Meetings
Attachments
Technical Notes
        ↓
 Document Evidence Set
        ↓
 Gemini Draft Generation
        ↓
 GeneratedDocument.DRAFT
        ↓
 PM Review
        ↓
 GeneratedDocument.FINAL
```

---

# 54. Project Q&A Retrieval Model

Project Q&A should retrieve from relevant project entities.

Potential evidence sources:

```text
Requirement
Decision
ScopeItem
ScopeChange
Task
Milestone
Issue
Risk
Blocker
ClientDependency
Meeting
Report
GeneratedDocument
Attachment-derived text
```

AI must receive project-scoped evidence only.

Cross-project leakage must be prevented.

---

# 55. Source Evidence Reference Model

Where multiple entity types need to reference evidence, ProjectPilot may use one of two implementation strategies:

## Option A — Typed Polymorphic Reference

```text
source_type
source_entity_id
```

## Option B — Explicit Join Tables

Example:

```text
RequirementMeetingSource
RequirementClientAnswerSource
RequirementBriefSource
```

The final technical design should balance referential integrity against complexity.

Regardless of implementation, conceptual traceability defined in this document is required.

---

# 56. Data Ownership Summary

| Entity | Primary Parent |
|---|---|
| Client | Workspace |
| Stakeholder | Client |
| Lead | Workspace / Client |
| Project | Client |
| ProjectMember | Project |
| Brief | Lead or Project |
| DiscoveryQuestion | Project |
| ClientAnswer | Project / DiscoveryQuestion |
| Requirement | Project |
| Decision | Project |
| ScopeItem | Project |
| ScopeChange | Project |
| Epic | Project |
| Feature | Project |
| Task | Project |
| TaskDependency | Project |
| Milestone | Project |
| Issue | Project |
| Risk | Project |
| Blocker | Project |
| ClientDependency | Project |
| Meeting | Project |
| ActionItem | Project |
| AISuggestion | Project |
| AIRequest | Project |
| Report | Project |
| GeneratedDocument | Project |
| Handover | Project |
| HandoverItem | Handover |
| Approval | Project |
| Attachment | Workspace/Project |
| Comment | Project entity |
| ActivityEvent | Project entity |

---

# 57. Cardinality Summary

Key cardinalities:

```text
Client 1 ─── * Project
Client 1 ─── * Lead
Client 1 ─── * Stakeholder

Project 1 ─── * ProjectMember
Project 1 ─── * Requirement
Project 1 ─── * Task
Project 1 ─── * Meeting
Project 1 ─── * Report
Project 1 ─── * GeneratedDocument
Project 1 ─── 1 Handover

Epic 1 ─── * Feature
Feature 1 ─── * Task
Task 1 ─── * Subtask

DiscoveryQuestion 1 ─── * ClientAnswer
Meeting 1 ─── * ActionItem
Handover 1 ─── * HandoverItem

Requirement * ─── * Feature
Requirement * ─── * Task
Requirement * ─── * Decision

Task * ─── * Blocker
Task * ─── * ClientDependency
```

---

# 58. Entity Identifier Strategy

All primary entities should use stable internal identifiers.

Human-readable keys should be separate where useful.

Examples:

```text
Project internal id: UUID/internal ID
Project display code: PRJ-2026-001

Requirement:
REQ-001

Task:
TASK-001

Issue:
ISS-001

Risk:
RSK-001

Scope Change:
SCR-001
```

Exact key generation strategy is deferred to Technical Architecture.

---

# 59. Timestamps

Operational entities should generally support:

```text
created_at
updated_at
```

Additional semantic timestamps should be used where meaningful.

Examples:

```text
approved_at
completed_at
requested_at
received_at
resolved_at
finalized_at
```

Semantic timestamps should not be inferred solely from `updated_at`.

---

# 60. Soft Deletion and Historical Integrity

Entities with project history should generally not be hard-deleted through normal workflows.

Potential technical pattern:

```text
archived_at nullable
deleted_at nullable
```

However, lifecycle status remains separate.

Example:

```text
Task.status = DONE
Task.archived_at = timestamp
```

Archive is not a workflow state.

Exact retention strategy is deferred.

---

# 61. Supersession Model

For authoritative content that materially changes over time, the model should preserve supersession chains.

Applicable entities:

- Requirement;
- Decision;
- Report;
- GeneratedDocument.

Pattern:

```text
Version A
  ↓ superseded by
Version B
```

Do not silently overwrite historical final meaning.

---

# 62. Snapshot vs Live Reference

ProjectPilot should distinguish between:

## Live Reference

Used when the system should show current authoritative information.

Example:

```text
Task → current Requirement
```

## Historical Snapshot

Used when preserving what was known at a point in time.

Examples:

- finalized report evidence;
- finalized document evidence;
- lead contact snapshot;
- meeting participant display name.

This avoids historical artifacts changing unexpectedly when source data later changes.

---

# 63. AI Data Boundary

AI-generated structured output should be stored separately until reviewed.

Forbidden pattern:

```text
Gemini response
→ directly UPDATE requirements
```

Required pattern:

```text
Gemini response
→ AISuggestion
→ PM review
→ controlled entity mutation
```

Exceptions may exist only for non-authoritative generated text such as temporary summaries.

---

# 64. AI Input Context

AI requests should be scoped to explicit project data.

An AIRequest should know which evidence was supplied.

Potential implementation:

```text
AIRequestContext
- ai_request_id
- entity_type
- entity_id
- snapshot/reference
```

This improves auditability and future debugging.

---

# 65. Attachments and Parsed Content

File storage and extracted text should be treated separately.

Conceptually:

```text
Attachment
   ↓
ParsedArtifact / ExtractedContent optional
   ↓
AI Context / Project Search
```

The original file remains the source artifact.

Parsed text is derived content.

Exact parsing architecture is deferred to Technical Architecture.

---

# 66. Search Architecture Requirements

Search should be able to locate:

- Client;
- Lead;
- Project;
- Requirement;
- Decision;
- Task;
- Meeting;
- Issue;
- Risk;
- Report;
- GeneratedDocument.

Search indexing must not become a second source of truth.

Search results point back to authoritative entities.

---

# 67. Data Integrity Constraints

The logical model requires at least the following constraints.

## 67.1 Project Isolation

A relationship must not accidentally connect entities from different Projects unless explicitly allowed.

Example:

A Task in Project A must not be linked to a Requirement in Project B.

## 67.2 Client Consistency

A ProjectStakeholder linked to a Project should normally belong to that Project's Client unless explicitly marked external.

## 67.3 Task Dependency Integrity

A task dependency should normally remain within the same Project.

Cross-project dependencies are deferred.

## 67.4 Requirement Supersession Integrity

A Requirement must not supersede itself.

Supersession cycles must be prevented.

## 67.5 Report Version Integrity

Only one current non-superseded `FINAL` report should normally exist for the same project, report type, reporting period, and version lineage.

## 67.6 Handover Uniqueness

A Project should have at most one active Handover process.

## 67.7 AI Suggestion Acceptance

An accepted suggestion should record the resulting authoritative entity where applicable.

---

# 68. Derived Data

Derived data should be calculated where possible instead of manually maintained.

Examples:

```text
Task overdue flag
Client waiting duration
Project task completion counts
Open blocker count
Upcoming milestone count
Project attention count
```

Derived values may be cached for performance, but the underlying source remains authoritative.

---

# 69. Reporting Period Model

Reports should define explicit date ranges.

Example:

```text
reporting_period_start
reporting_period_end
```

Do not rely only on labels such as "Week 32" because date ranges are more explicit and portable.

---

# 70. Document Requirement Configuration

Different projects may require different handover documents.

The HandoverItem model should allow:

```text
required = true/false
status = NOT_APPLICABLE
status = WAIVED
```

This is preferable to assuming every project always needs every document.

---

# 71. Potential Project Template Model

Project templates are not required in the initial scope, but the data model should not make them impossible.

Future template domains could define:

- discovery question sets;
- requirement categories;
- Kanban workflow;
- handover checklist;
- documentation requirements;
- project type metadata.

No Template entity is authoritative in this version.

---

# 72. Budget Boundary

No dedicated financial model is required for the initial ProjectPilot scope.

Do not introduce:

- invoice;
- cost;
- margin;
- project budget;
- billing;
- expense;

as core entities unless product scope changes.

A generic note/reference may be used where budget context is operationally relevant.

---

# 73. External Integration Boundary

The conceptual model should remain compatible with future external references.

Potential future fields:

```text
external_system
external_id
external_url
sync_status
```

These are not required for the initial implementation.

Do not design ProjectPilot around Jira, ClickUp, Trello, or another external task model.

---

# 74. Example Project Data Graph

```text
Client: ABC Company
│
├── Stakeholder: Sarah — Product Owner
│
└── Project: Booking Platform
    │
    ├── Brief: Initial Client Brief
    │
    ├── Discovery Question: DQ-012
    │     └── Client Answer
    │
    ├── Requirement: REQ-018
    │     ├── Source: DQ-012 Answer
    │     └── Decision: DEC-006
    │
    ├── Scope Item: SCP-011
    │
    ├── Epic: Booking
    │     └── Feature: Availability
    │           └── Task: TASK-044
    │                 ├── Assignee: Backend Developer
    │                 ├── Milestone: Beta
    │                 └── Blocker: BLK-003
    │                       └── Client Dependency: CD-007
    │
    ├── Meeting: Weekly Review
    │     └── Action Item
    │
    ├── Weekly Internal Report
    ├── Weekly Client Report
    │
    ├── FSD
    └── Handover
          └── Handover Items
```

---

# 75. Example AI Suggestion Flow

```text
Meeting Transcript
      ↓
AIRequest
      ↓
Gemini 3.5 Flash-Lite
      ↓
AISuggestion
type = REQUIREMENT
status = GENERATED
      ↓
PM reviews
      ↓
ACCEPTED
      ↓
Requirement created
status = DRAFT
      ↓
AISuggestion.accepted_entity_id = Requirement.id
```

This flow maintains clear separation between AI analysis and project authority.

---

# 76. Example Kanban / Timeline Synchronization

```text
Task:
TASK-044

status = IN_PROGRESS
start_date = 2026-08-17
due_date = 2026-08-21
milestone_id = BETA
```

The same Task appears as:

```text
Kanban:
IN_PROGRESS column

Timeline:
17 Aug → 21 Aug bar

Calendar:
21 Aug due date

Milestone:
Beta related task

PM Control Center:
shown if overdue/blocked
```

No duplication of task state is required.

---

# 77. Example Report Evidence Snapshot

At finalization:

```text
Weekly Internal Report
Reporting Period: 17–21 Aug
```

ReportEvidence may reference:

```text
TASK-044 = IN_PROGRESS
TASK-052 = DONE
BLK-003 = OPEN
CD-007 = WAITING
MS-002 = AT_RISK
```

If those entities change next week, the finalized report must still represent what was reported for 17–21 Aug.

---

# 78. Data Model Acceptance Direction

The data model is correctly implemented when:

1. one Client can own multiple Projects;
2. a converted Lead retains traceability to its Project;
3. Brief and discovery evidence can support Requirements;
4. Requirements can trace to Scope, Feature, and Task;
5. Decision history can be preserved;
6. accepted scope changes remain traceable to affected delivery entities;
7. one Task record powers Kanban, List, Timeline, Calendar, and Milestone views;
8. Task dependencies are explicit;
9. blockers and client dependencies can be linked to affected tasks;
10. meeting-derived AI output remains non-authoritative until reviewed;
11. AI requests and AI suggestions are stored separately;
12. finalized reports preserve historical evidence;
13. generated documents can record their source evidence;
14. handover contains configurable checklist items;
15. approvals are structured records;
16. meaningful state transitions can be audited;
17. project data cannot accidentally link across unrelated Projects;
18. derived dashboard data does not become a separate operational source of truth;
19. archive behavior remains separate from lifecycle state;
20. budget entities are not introduced into initial core scope.

---

# 79. Deferred Data Model Decisions

The following remain intentionally deferred:

- physical database technology;
- UUID versus another primary-key format;
- exact enum implementation;
- exact schema/table names;
- ORM choice;
- database normalization level;
- full-text search engine;
- vector search architecture;
- attachment storage provider;
- parsed document storage;
- polymorphic reference implementation;
- history table strategy;
- event sourcing versus conventional auditing;
- task ordering implementation;
- project code generation;
- tenant/workspace model;
- external integration mapping;
- direct team-member accounts;
- permission granularity;
- custom fields;
- configurable Kanban workflows;
- custom project templates.

These should be resolved in Technical Architecture or later derived specifications.

---

# 80. Next Authoritative Document

The next document should be:

**ProjectPilot — AI Functional Specification**

That document will define:

- exact AI capabilities;
- AI input boundaries;
- structured output contracts;
- evidence requirements;
- human approval gates;
- prompt responsibility;
- hallucination prevention rules;
- AI failure behavior;
- Project Q&A behavior;
- report-generation rules;
- document-generation rules;
- meeting analysis rules;
- requirement and scope-change suggestion rules;
- Gemini 3.5 Flash-Lite usage boundaries.

The AI specification must follow the authority separation and data model defined in this document.
