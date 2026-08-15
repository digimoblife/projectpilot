# ProjectPilot — Product Requirements Document (PRD)

**Document Type:** Product Requirements Document  
**Project:** ProjectPilot  
**Status:** Draft v1.0  
**Date:** 15 August 2026  
**Primary User:** Project Manager  
**Primary AI Model:** Gemini 3.5 Flash-Lite  
**Parent Document:** ProjectPilot — Product Vision & Scope

---

# 1. Purpose

This Product Requirements Document defines the functional and behavioral requirements for ProjectPilot.

ProjectPilot is an AI-assisted Project Management Operating Hub designed to support the complete lifecycle of a project:

```text
LEAD
  ↓
DISCOVERY
  ↓
REQUIREMENT DEFINITION
  ↓
PLANNING
  ↓
CLIENT APPROVAL
  ↓
ACTIVE DELIVERY
  ↓
HANDOVER
  ↓
COMPLETED
```

This PRD translates the product vision into actionable product requirements.

It defines:

- product modules;
- core workflows;
- functional capabilities;
- business rules;
- AI responsibilities;
- source-of-truth rules;
- approval requirements;
- project tracking behavior;
- reporting behavior;
- documentation behavior;
- high-level acceptance direction.

Detailed state machines, entity schemas, architecture, UI behavior, and implementation sequencing will be defined in separate downstream documents.

---

# 2. Product Summary

ProjectPilot is designed to become the primary operational workspace used by a Project Manager from the earliest lead stage until project handover.

The product must help the Project Manager:

- capture lead information;
- record and analyze project briefs;
- perform structured project discovery;
- identify missing information;
- manage requirements;
- maintain decision history;
- define project scope;
- create delivery structures;
- manage tasks through Kanban and other views;
- manage project timelines and milestones;
- assign and monitor team work;
- track issues, risks, blockers, and client dependencies;
- capture meeting outcomes;
- generate internal and client reports;
- generate final project documentation;
- prepare structured project handover;
- query accumulated project knowledge.

ProjectPilot must reduce repeated administrative work by reusing information throughout the project lifecycle.

---

# 3. Product Principles

The following principles are mandatory.

## 3.1 One Project, One Knowledge Hub

Project information must be discoverable from one project workspace.

## 3.2 Enter Once, Reuse Everywhere

Information already captured in ProjectPilot should be reused wherever appropriate.

Examples:

```text
Brief
→ Discovery
→ Requirement
→ Scope
→ Task
→ Report
→ Documentation
```

## 3.3 Evidence Before AI

AI-generated output must be based on available project evidence.

## 3.4 AI Suggests, PM Decides

AI-generated changes that would affect authoritative project data must require Project Manager review.

## 3.5 Traceability Matters

Important project entities should be traceable to the information that caused them to exist or change.

## 3.6 Shared Operational Data

Kanban, List, Timeline, Calendar, and Milestone views must represent the same underlying task data.

## 3.7 Internal Before External

Client-facing reports must be prepared after internal reporting and review.

## 3.8 Human Accountability Remains

ProjectPilot assists the Project Manager and does not replace project ownership or decision-making.

---


# 3A. Language Requirements

ProjectPilot must maintain a strict distinction between engineering language and operational project-content language.

## 3A.1 Development Documentation

ProjectPilot's own product, technical, implementation, and verification documentation must be written in **English**.

## 3A.2 Operational Content Default

Project content handled by the application should default to **Bahasa Indonesia**.

This applies to user-facing and generated project content including:

- briefs;
- AI analyses;
- discovery questions;
- requirement descriptions;
- meeting outputs;
- decisions;
- scope-change explanations;
- task-breakdown suggestions;
- risk/blocker explanations;
- weekly and monthly reports;
- client-facing reports;
- FSD;
- User Guide;
- Admin Guide;
- Technical Documentation;
- User Documentation;
- Design Documentation;
- handover content;
- Project Q&A responses.

## 3A.3 Internal Identifiers

Internal system values remain in English.

Examples:

```text
IN_PROGRESS
NEEDS_CLARIFICATION
AWAITING_CLIENT_APPROVAL
BLOCKED
DONE
```

The UI may render localized Bahasa Indonesia labels without changing the canonical internal values.

## 3A.4 AI Language Behavior

Gemini 3.5 Flash-Lite must produce operational project content in Bahasa Indonesia by default unless the Project Manager explicitly requests another language for a specific artifact or project context.

The application must not automatically translate user-entered Bahasa Indonesia content into English merely because the internal schema or AI implementation prompt is English.


# 4. User Roles

## 4.1 Primary Role — Project Manager

The Project Manager is the primary user and operational authority in the initial product.

The Project Manager can:

- create and manage leads;
- create and manage projects;
- manage clients and stakeholders;
- capture briefs;
- create and manage discovery questions;
- approve AI suggestions;
- manage requirements;
- manage scope;
- create and manage tasks;
- manage Kanban;
- manage timelines;
- manage milestones;
- assign team members;
- track risks and issues;
- manage reports;
- generate documentation;
- manage handover.

## 4.2 Supporting Actor — Internal Team Member

In the initial product, internal team members may exist as assignable project entities even if they do not yet have direct application access.

A team member may have:

- name;
- role;
- function;
- contact/reference information;
- assigned tasks;
- active workload;
- project membership.

Direct team-member authentication is not required for the initial product unless added later.

## 4.3 Supporting Actor — Client

The client is represented as project data.

Client-related entities may include:

- client company;
- client PIC;
- stakeholder;
- request;
- approval;
- decision;
- question;
- response;
- dependency.

Direct client login is not required in the initial product.

## 4.4 Supporting Actor — Management

Management is represented primarily through internal reporting and escalation flows.

Direct management login is not an initial core requirement.

---

# 5. Core Product Navigation

The application should support a top-level structure similar to:

```text
Dashboard
Leads
Projects
My Work
Reports
Documents
```

A project workspace should support a structure similar to:

```text
Overview
Discovery
Requirements
Scope
Planning
Tasks
Timeline
Meetings
Issues & Risks
Reports
Documents
Handover
```

Final navigation design will be defined in the UI/UX Product Specification.

---

# 6. Module A — Lead Management

## 6.1 Objective

Allow the Project Manager to capture and manage potential projects before they become active project records.

## 6.2 Lead Data

A lead should support at minimum:

- lead name;
- company/client name;
- client PIC;
- contact information;
- opportunity description;
- project type;
- source;
- initial notes;
- lead owner;
- status;
- created date;
- updated date.

## 6.3 Lead Status

Detailed state transitions will be defined later, but the product should support statuses conceptually equivalent to:

```text
NEW
CONTACTED
BRIEF_SCHEDULED
QUALIFIED
NOT_QUALIFIED
CONVERTED
LOST
```

## 6.4 Lead Conversion

The Project Manager must be able to convert a qualified lead into a project.

When converted:

- relevant client information should be reused;
- contact information should be retained;
- initial opportunity information should be retained;
- briefing information should be carried forward where applicable;
- historical lead context must remain traceable.

The Project Manager must not need to re-enter the same information manually.

## 6.5 Lead Loss

A lead may be marked as lost.

Optional loss information may include:

- reason;
- notes;
- date;
- competitor or alternative solution if known.

---

# 7. Module B — Client & Stakeholder Management

## 7.1 Objective

Maintain structured information about the client organization and relevant project stakeholders.

## 7.2 Client Data

A client may contain:

- company name;
- company description;
- website;
- industry;
- primary contact;
- contact information;
- notes.

## 7.3 Stakeholder Data

A stakeholder may contain:

- name;
- organization;
- role;
- responsibility;
- decision authority;
- contact details;
- notes.

## 7.4 Project Relationship

A client may have multiple projects.

A project may have multiple client stakeholders.

---

# 8. Module C — Project Workspace

## 8.1 Objective

Provide one centralized workspace for the complete operational state and knowledge of a project.

## 8.2 Project Overview

The project overview should include:

- project name;
- client;
- current lifecycle stage;
- project status;
- project health;
- Project Manager;
- project team;
- start date;
- target completion date;
- important milestones;
- progress summary;
- current blockers;
- high risks;
- pending client items;
- recent project activity.

## 8.3 Project Health

Project health should be calculated from project evidence, not AI opinion alone.

Potential evidence includes:

- overdue tasks;
- blocked tasks;
- overdue milestones;
- unresolved critical issues;
- high-severity risks;
- long-running client dependencies;
- critical task dependency delays.

Project health may later be represented using categories such as:

```text
HEALTHY
WATCH
AT_RISK
CRITICAL
```

The exact rules will be defined separately.

## 8.4 Project Activity History

Important events should be traceable through an activity history.

Examples:

- requirement approved;
- task status changed;
- scope change accepted;
- milestone changed;
- blocker created;
- client approval recorded;
- report finalized;
- document generated.

---

# 9. Module D — Brief & Discovery

## 9.1 Objective

Help the Project Manager convert incomplete client information into a structured understanding of the project.

## 9.2 Initial Brief

The Project Manager must be able to record an initial brief manually.

The brief may include:

- project objective;
- business context;
- intended users;
- expected functionality;
- constraints;
- integrations;
- technical information;
- non-technical information;
- project expectations;
- source notes;
- attachments.

## 9.3 AI Brief Analysis

The Project Manager should be able to request AI analysis of an initial brief.

Gemini 3.5 Flash-Lite may produce:

- project summary;
- known requirements;
- known constraints;
- identified stakeholders;
- known integrations;
- assumptions detected in the brief;
- unknown information;
- potential risk areas;
- recommended discovery categories.

AI output remains non-authoritative until reviewed where it affects project records.

## 9.4 Discovery Question Generation

ProjectPilot should generate detailed discovery questions based on:

- project brief;
- project type;
- known requirements;
- unanswered topics;
- detected contradictions;
- previous client answers.

Discovery questions may be categorized as:

- business;
- functional;
- non-functional;
- technical;
- UX;
- data;
- integration;
- security;
- permission;
- reporting;
- deployment;
- maintenance;
- operational.

## 9.5 Question Status

A discovery question should be able to represent states such as:

```text
DRAFT
READY
SENT
ANSWERED
NEEDS_FOLLOW_UP
CLOSED
```

Final state definitions will be specified later.

## 9.6 Client Answers

The Project Manager must be able to record client answers.

Each answer should retain:

- related question;
- answer content;
- source;
- response date;
- respondent if known;
- attachment/reference if applicable.

## 9.7 Follow-up Questions

Client answers may generate new follow-up questions.

The AI may suggest follow-up questions, but the Project Manager controls whether those questions become active discovery items.

## 9.8 Requirement Gap Analysis

ProjectPilot should be able to identify:

- incomplete requirements;
- unresolved decisions;
- unanswered discovery areas;
- contradictory answers;
- missing technical details;
- missing workflow definitions;
- possible edge cases.

AI-generated gaps must be clearly labeled as suggestions or analysis.

---

# 10. Module E — Requirement Management

## 10.1 Objective

Maintain a structured, traceable registry of project requirements.

## 10.2 Requirement Categories

A requirement may be categorized as:

- business;
- functional;
- non-functional;
- technical;
- UX;
- security;
- integration;
- data;
- permission;
- reporting;
- deployment;
- maintenance;
- operational.

## 10.3 Requirement Data

A requirement should support:

- unique identifier;
- title;
- description;
- category;
- module/area;
- actor;
- business rule;
- priority;
- status;
- source;
- evidence/reference;
- related decision;
- related scope item;
- related feature;
- related task;
- created date;
- updated date.

## 10.4 Requirement Source

A requirement should be traceable to one or more sources where possible.

Sources may include:

- initial brief;
- discovery question;
- client answer;
- meeting;
- client email;
- decision;
- uploaded document;
- manual PM entry.

## 10.5 Requirement Status

The system should conceptually support:

```text
DRAFT
NEEDS_CLARIFICATION
CONFIRMED
APPROVED
REJECTED
SUPERSEDED
```

Final state behavior will be defined separately.

## 10.6 AI Requirement Extraction

AI may suggest requirements from:

- briefs;
- client answers;
- meeting notes;
- transcripts;
- uploaded documents.

Suggested requirements must not automatically become authoritative.

The Project Manager must be able to:

```text
ACCEPT
EDIT
REJECT
```

## 10.7 Requirement Contradiction Detection

ProjectPilot should identify potential contradictions.

Example:

```text
Requirement A:
Guest checkout is allowed.

Later client answer:
All users must log in before checkout.
```

The system should surface the conflict for PM review.

It must not silently overwrite previous information.

## 10.8 Requirement Traceability

A requirement should be traceable through delivery where applicable:

```text
Requirement
  ↓
Scope
  ↓
Feature
  ↓
Task
```

---

# 11. Module F — Decision Log

## 11.1 Objective

Maintain an auditable record of important project decisions.

## 11.2 Decision Data

A decision should support:

- title;
- topic;
- decision;
- date;
- source;
- requested by;
- decided by;
- rationale;
- impact;
- related requirement;
- related scope;
- related task;
- related meeting;
- notes.

## 11.3 Decision History

When a decision changes, previous decisions should remain visible.

ProjectPilot must not destroy relevant decision history through silent replacement.

## 11.4 AI Decision Extraction

AI may detect potential decisions from meeting notes or project communication.

Detected decisions must require Project Manager review before becoming authoritative.

---

# 12. Module G — Scope Management

## 12.1 Objective

Provide a clear and traceable definition of what is and is not included in the project.

## 12.2 Scope Categories

Project scope should distinguish:

- in scope;
- out of scope;
- undecided;
- potential change.

## 12.3 Scope Baseline

The Project Manager should be able to create a baseline scope before active delivery.

The baseline should retain history.

## 12.4 Scope Change Detection

ProjectPilot should compare new project information against the approved scope and identify potential scope changes.

Example:

```text
Original:
Email/password authentication.

New request:
Google OAuth login.
```

The AI may flag:

```text
POTENTIAL_SCOPE_CHANGE
```

## 12.5 Scope Change Review

The Project Manager should be able to classify a detected change as:

```text
ACCEPTED
REJECTED
NEEDS_CLARIFICATION
NOT_A_SCOPE_CHANGE
```

## 12.6 Scope Impact

A scope change may be related to:

- requirement impact;
- task impact;
- timeline impact;
- technical impact;
- design impact;
- testing impact;
- dependency impact.

ProjectPilot should not invent impact values without available evidence.

---

# 13. Module H — Planning Structure

## 13.1 Objective

Transform approved requirements and scope into an actionable delivery plan.

## 13.2 Planning Hierarchy

Initial hierarchy:

```text
Epic
  ↓
Feature
  ↓
Task
  ↓
Subtask
```

The exact hierarchy may allow optional levels where appropriate.

## 13.3 Epic

An Epic should represent a major delivery area.

Example:

```text
Booking Management
```

## 13.4 Feature

A Feature should represent a functional capability.

Example:

```text
Schedule Selection
```

## 13.5 Task

A Task should represent executable team work.

Example:

```text
Implement availability API
```

## 13.6 Subtask

A Subtask may represent smaller implementation work.

Example:

```text
Add availability endpoint validation
```

## 13.7 AI Task Breakdown Suggestion

AI may propose:

- epics;
- features;
- tasks;
- subtasks;
- potential dependencies;
- missing work categories.

AI-generated planning output must be reviewed before becoming authoritative.

---

# 14. Module I — Task Management

## 14.1 Objective

Provide complete operational task tracking for active project delivery.

## 14.2 Task Data

A task should support:

- unique identifier;
- title;
- description;
- project;
- epic;
- feature;
- parent task if applicable;
- assignee;
- team/function;
- priority;
- status;
- estimate;
- progress;
- start date;
- due date;
- milestone;
- dependency;
- blocker;
- labels;
- attachment;
- comments;
- activity history;
- related requirement;
- related scope item.

## 14.3 Priority

The system should support a clear priority model.

Initial example:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

## 14.4 Task Progress

Progress may be represented by:

- status;
- optional percentage;
- completion metadata.

The final model should avoid redundant progress definitions that can contradict each other.

## 14.5 Task History

Important task changes should be recorded.

Examples:

- status changes;
- due-date changes;
- assignee changes;
- blocker changes;
- priority changes.

## 14.6 Task Comments & Updates

The Project Manager should be able to add task notes, updates, and comments.

These updates may later contribute to reporting evidence.

---

# 15. Module J — Kanban Board

## 15.1 Objective

Provide a visual task-management experience for project delivery.

## 15.2 Initial Kanban Columns

Initial canonical workflow:

```text
BACKLOG
READY
IN_PROGRESS
IN_REVIEW
QA
BLOCKED
DONE
```

Final column names and transitions will be defined in Workflow & State Specification.

## 15.3 Drag-and-Drop

The Project Manager should be able to move tasks between valid Kanban states through an intuitive board interaction.

## 15.4 Shared Data

Kanban status changes must update the same underlying task record used by:

- List View;
- Timeline View;
- Calendar View;
- Milestone View;
- PM Control Center;
- Reports.

## 15.5 Blocked State

When moving a task to `BLOCKED`, ProjectPilot should support capturing:

- blocker reason;
- blocker owner;
- dependency type;
- impact;
- expected resolution date if known.

## 15.6 Kanban Filters

The Kanban should support filtering by:

- assignee;
- team;
- project;
- epic;
- feature;
- milestone;
- priority;
- status;
- due date;
- overdue status;
- blocked status;
- client dependency.

## 15.7 Project Board

Each project should have its own Kanban board.

## 15.8 Cross-Project Work View

ProjectPilot should support a cross-project work view that allows the Project Manager to inspect tasks across multiple projects.

Potential filters include:

- team member;
- priority;
- overdue;
- blocked;
- due soon;
- waiting dependency.

---

# 16. Module K — Timeline, Calendar & Milestones

## 16.1 Objective

Provide time-based visualization and milestone tracking based on the same project task data.

## 16.2 Timeline

Tasks with date ranges should be visible in a timeline.

The timeline should support:

- task start;
- task due date;
- dependencies;
- milestone relationship;
- overdue indication;
- schedule changes.

## 16.3 Calendar

Tasks and milestones with relevant dates should be available in calendar form.

## 16.4 Milestone

A milestone should support:

- name;
- description;
- target date;
- status;
- related tasks;
- completion state;
- risk state;
- notes.

## 16.5 Timeline Impact

When a critical task changes schedule, ProjectPilot should be able to identify affected dependencies and potentially affected milestones.

AI may explain the impact but must rely on actual task/dependency data.

---

# 17. Module L — Team & Workload

## 17.1 Objective

Help the Project Manager understand team assignments and delivery pressure.

## 17.2 Team Member

A team member may contain:

- name;
- role;
- function;
- project membership;
- current assignments.

## 17.3 Workload View

ProjectPilot should support visibility into:

- active tasks by person;
- overdue tasks by person;
- blocked tasks by person;
- upcoming tasks;
- due-soon workload.

## 17.4 Non-Goal

ProjectPilot is not intended to provide:

- payroll;
- employee appraisal;
- attendance;
- leave management;
- HR records.

---

# 18. Module M — Dependency Management

## 18.1 Objective

Track dependencies that may affect project delivery.

## 18.2 Task Dependencies

A task may depend on another task.

Example:

```text
Design Approval
      ↓
Frontend Implementation
      ↓
QA
```

## 18.3 External Dependencies

Dependencies may also relate to:

- client;
- vendor;
- external API;
- infrastructure;
- third-party approval.

## 18.4 Dependency Impact

If a dependency becomes delayed, affected tasks and milestones should be identifiable.

---

# 19. Module N — Issues, Risks & Blockers

## 19.1 Objective

Provide structured visibility into project delivery threats and active problems.

## 19.2 Issue

An Issue represents a problem that already exists.

Suggested fields:

- title;
- description;
- severity;
- impact;
- owner;
- detected date;
- target resolution;
- status;
- affected tasks;
- affected milestone;
- resolution.

## 19.3 Risk

A Risk represents a potential future problem.

Suggested fields:

- title;
- description;
- likelihood;
- impact;
- severity;
- mitigation;
- owner;
- status;
- related project area.

## 19.4 Blocker

A Blocker prevents one or more tasks from continuing.

Suggested fields:

- title;
- reason;
- owner;
- dependency;
- affected task;
- impact;
- expected resolution;
- status.

## 19.5 AI Assistance

AI may summarize and explain risks, issues, or blockers.

AI must not create authoritative risk severity or project impact without appropriate PM review unless the value is deterministically calculated by the system.

---

# 20. Module O — Client Dependency Tracker

## 20.1 Objective

Make client-side dependencies explicitly visible and traceable.

## 20.2 Client Dependency Types

Examples:

- approval;
- credential;
- API access;
- content;
- asset;
- document;
- decision;
- clarification;
- user list;
- infrastructure access.

## 20.3 Client Dependency Data

A client dependency should support:

- title;
- description;
- requested date;
- requested from;
- due/expected date;
- status;
- related task;
- related milestone;
- impact;
- reminder/follow-up note.

## 20.4 Delay Attribution

ProjectPilot should make it possible to distinguish:

```text
Internal Delivery Delay
vs
Client Dependency Delay
```

It should preserve evidence rather than assigning blame automatically.

---

# 21. Module P — Meeting Management

## 21.1 Objective

Capture meeting knowledge and convert useful meeting outcomes into structured project information.

## 21.2 Meeting Data

A meeting should support:

- title;
- project;
- date;
- participants;
- meeting type;
- notes;
- transcript;
- attachments;
- summary;
- decisions;
- action items;
- follow-up items.

## 21.3 AI Meeting Analysis

Gemini may generate:

- summary;
- key discussion points;
- decisions detected;
- action items;
- new requirement candidates;
- requirement changes;
- possible scope changes;
- risks;
- blockers;
- client dependencies;
- follow-up questions.

## 21.4 Approval Gate

AI-detected:

- requirements;
- decisions;
- scope changes;
- task changes;

must be presented as suggestions.

The Project Manager should be able to:

```text
ACCEPT
EDIT
REJECT
```

## 21.5 Action Item Conversion

An approved action item may be converted into:

- task;
- client dependency;
- follow-up item;
- issue;
- decision record.

---

# 22. Module Q — PM Control Center

## 22.1 Objective

Provide a daily operational view of what requires Project Manager attention.

## 22.2 Dashboard Priority

The control center should prioritize actionable items over decorative statistics.

## 22.3 Attention Items

Examples:

- overdue tasks;
- blocked tasks;
- overdue client dependencies;
- milestones at risk;
- unresolved high-severity issues;
- high risks;
- pending approvals;
- requirements needing clarification;
- project deadlines approaching;
- tasks with no recent progress where relevant.

## 22.4 Cross-Project View

The Project Manager should be able to review attention items across all active projects.

## 22.5 Project Health Summary

The dashboard may display project health but must link health status to underlying evidence.

---

# 23. Module R — Weekly Reporting

## 23.1 Objective

Reduce manual effort required to prepare weekly project reporting while maintaining evidence accuracy.

## 23.2 Weekly Internal Report

The system should generate an internal report draft using available project data.

Potential sections:

- executive summary;
- overall project health;
- progress this week;
- completed tasks;
- work in progress;
- delayed tasks;
- issues;
- risks;
- blockers;
- client dependencies;
- timeline impact;
- scope changes;
- decisions;
- management attention required;
- plan for next week.

## 23.3 Report Evidence

Internal reporting should use actual project evidence such as:

- task records;
- milestones;
- issues;
- risks;
- blockers;
- client dependencies;
- decisions;
- recent meeting outcomes.

AI must not invent project facts to fill missing sections.

## 23.4 Internal Review

The Project Manager must be able to edit and finalize the report.

## 23.5 Management Discussion

The workflow should allow the internal weekly report to be treated as reviewed/discussed before creating the client-facing version.

## 23.6 Weekly Client Report

The client weekly report should be produced from an approved reporting context after internal review.

Potential sections:

- project summary;
- progress this week;
- completed items;
- work in progress;
- milestone status;
- client dependencies/actions;
- next-week plan;
- notable decisions.

## 23.7 Confidentiality Boundary

Internal concerns must not automatically appear in the client report.

AI must not independently decide to expose internal-sensitive information.

The PM must review the client report before finalization.

---

# 24. Module S — Monthly Reporting

## 24.1 Objective

Provide a higher-level monthly view that is not simply a concatenation of weekly reports.

## 24.2 Monthly Internal Report

Potential sections:

- monthly executive summary;
- overall completion trend;
- milestone progress;
- major achievements;
- significant delays;
- issues and blockers;
- risk trend;
- scope changes;
- client dependencies;
- management concerns;
- plan for next month.

## 24.3 Monthly Client Report

Potential sections:

- monthly progress summary;
- major completed work;
- milestone status;
- project progress;
- agreed changes;
- dependencies requiring client action;
- next-month plan.

## 24.4 Data Source

Monthly reports should use project data and finalized weekly reporting history where useful.

---

# 25. Module T — Project Reports Repository

## 25.1 Objective

Maintain historical project reports inside the project workspace.

## 25.2 Report Types

The repository should distinguish:

```text
WEEKLY_INTERNAL
WEEKLY_CLIENT
MONTHLY_INTERNAL
MONTHLY_CLIENT
```

## 25.3 Report Status

A report may conceptually support:

```text
DRAFT
UNDER_REVIEW
FINAL
```

## 25.4 Historical Integrity

Finalized reports should retain their historical version.

Subsequent project changes must not silently rewrite a previously finalized report.

---

# 26. Module U — Documentation Generator

## 26.1 Objective

Use accumulated project knowledge to reduce effort required for final project documentation.

## 26.2 Supported Documents

ProjectPilot should support generation of drafts for:

- Functional Specification Document (FSD);
- User Guide;
- Admin Guide when applicable;
- Technical Documentation;
- User Documentation;
- Design Documentation.

## 26.3 Documentation Sources

Documentation may use:

- approved requirements;
- approved scope;
- project decisions;
- final task state;
- final feature structure;
- meeting decisions;
- design references;
- technical notes;
- uploaded project files;
- implementation records;
- PM-provided context.

## 26.4 Evidence Constraint

Generated documentation must not invent features that are not supported by project evidence.

## 26.5 Human Review

Generated documents are drafts until reviewed and finalized by the Project Manager.

## 26.6 Document History

ProjectPilot should preserve document generation and revision history where practical.

---

# 27. Module V — Handover Management

## 27.1 Objective

Help the Project Manager prepare and verify all required project handover items.

## 27.2 Handover Checklist

A project should support a configurable handover checklist.

Potential items:

- final production deployment complete;
- UAT approved;
- client acceptance recorded;
- source code prepared;
- credentials prepared;
- User Guide completed;
- Admin Guide completed if required;
- Technical Documentation completed;
- User Documentation completed;
- Design Documentation completed;
- FSD completed;
- backup/recovery information prepared;
- support information prepared;
- training completed if required.

## 27.3 Completion Gate

Project completion should be distinct from merely finishing development tasks.

The Project Manager should be able to verify required handover items before marking the project completed.

---

# 28. Module W — Project Memory & Q&A

## 28.1 Objective

Allow the Project Manager to query accumulated project knowledge conversationally.

## 28.2 Example Questions

The system should support questions such as:

- What are we waiting for from the client?
- Why was a feature changed?
- Which requirements are not yet approved?
- Which task is delaying the current milestone?
- What decisions were made about authentication?
- What blockers are still unresolved?
- What changed during the last meeting?

## 28.3 Evidence Requirement

Answers must be grounded in actual project evidence.

Where possible, the answer should identify its source, such as:

- requirement;
- meeting;
- decision;
- task;
- client dependency;
- report.

## 28.4 Missing Evidence

If the system cannot find supporting information, it should say that evidence is unavailable rather than fabricate an answer.

---

# 29. Module X — AI Functional Layer

## 29.1 AI Model

ProjectPilot uses:

**Gemini 3.5 Flash-Lite**

as the single AI model.

## 29.2 Initial AI Capabilities

The AI layer should support capabilities such as:

```text
BRIEF_ANALYSIS
DISCOVERY_QUESTION_GENERATION
REQUIREMENT_EXTRACTION
REQUIREMENT_NORMALIZATION
REQUIREMENT_GAP_ANALYSIS
CONTRADICTION_DETECTION
MEETING_ANALYSIS
ACTION_ITEM_EXTRACTION
DECISION_EXTRACTION
SCOPE_CHANGE_DETECTION
TASK_BREAKDOWN_SUGGESTION
RISK_EXPLANATION
WEEKLY_REPORT_DRAFTING
MONTHLY_REPORT_DRAFTING
DOCUMENT_DRAFTING
PROJECT_QA
```

## 29.3 AI Output Structure

Where appropriate, AI responses should use structured output rather than unstructured prose.

Structured output should support reliable validation before it enters application workflows.

## 29.4 AI Suggestion Status

AI suggestions should be distinguishable from authoritative data.

Potential suggestion lifecycle:

```text
GENERATED
REVIEWED
ACCEPTED
EDITED
REJECTED
```

## 29.5 AI Must Not Automatically Change Authoritative Data

AI must not independently:

- change requirement status;
- change scope;
- approve decisions;
- change task status;
- change timeline;
- change milestone dates;
- close issues;
- close risks;
- mark project completion;
- send reports.

## 29.6 AI Failure Handling

If Gemini is unavailable or returns invalid output:

- authoritative project data must remain unchanged;
- the user should receive a clear error;
- the AI operation should be retryable where appropriate;
- no partial authoritative mutation should occur.

---

# 30. File & Attachment Support

## 30.1 Objective

Allow project records to reference supporting files.

## 30.2 Potential Attachment Areas

Attachments may be associated with:

- lead;
- brief;
- discovery;
- client answer;
- requirement;
- meeting;
- task;
- issue;
- risk;
- report;
- documentation;
- handover.

## 30.3 Supported Content

Detailed supported formats will be defined in Technical Architecture.

The product should be designed with future support for:

- text documents;
- PDFs;
- images;
- spreadsheets;
- presentation files;
- meeting transcripts.

---

# 31. Search

## 31.1 Global Search

ProjectPilot should support finding relevant records across the workspace.

Potential searchable entities:

- project;
- lead;
- requirement;
- task;
- meeting;
- decision;
- issue;
- risk;
- report;
- document.

## 31.2 Project Search

Within a project, the Project Manager should be able to quickly locate project-specific information.

---

# 32. Notifications & Attention

## 32.1 Objective

Help the Project Manager avoid missing important events.

## 32.2 Potential Attention Conditions

Examples:

- task overdue;
- milestone approaching;
- client dependency overdue;
- blocker unresolved;
- approval pending;
- requirement awaiting clarification;
- high-risk item unresolved.

## 32.3 Notification Design

Detailed delivery channels are not locked in this PRD.

The initial product may prioritize in-app attention indicators before adding external notifications.

---

# 33. Reporting and Export

## 33.1 Exportability

Important reports and final project documents should be exportable in formats appropriate for client delivery.

Detailed formats will be defined later.

## 33.2 Data Portability

Project data should not be unnecessarily locked into UI-only representations.

---

# 34. Mobile Usability

## 34.1 Principle

ProjectPilot must be usable on both desktop and mobile.

## 34.2 Mobile Priority Actions

Important mobile workflows should include:

- view project health;
- inspect overdue tasks;
- inspect blocked tasks;
- move Kanban task status where appropriate;
- add/update task;
- record quick project note;
- review AI suggestion;
- approve/edit/reject AI suggestion;
- review client dependency;
- review recent meeting result;
- read report draft.

## 34.3 No Desktop Dependency

Core monitoring workflows should not require desktop mode, excessive zoom, or horizontal scrolling.

Detailed responsive behavior will be defined in UI/UX Product Specification.

---

# 35. Auditability & History

## 35.1 Requirement

Important operational changes should maintain sufficient history.

Examples:

- requirement changes;
- decision changes;
- scope changes;
- task state changes;
- due-date changes;
- milestone changes;
- report finalization;
- document generation.

## 35.2 Purpose

History exists to help answer:

- what changed;
- when;
- why;
- based on what information.

---

# 36. Data Integrity Requirements

ProjectPilot must avoid silent data loss or silent AI overwrite.

The system should prioritize:

- explicit updates;
- traceable changes;
- preserved history where important;
- clear distinction between suggestion and approved data;
- single source of truth for shared operational entities.

---

# 37. Product Boundaries

The initial product does not need to become:

- a full CRM;
- a financial management system;
- an accounting system;
- a procurement system;
- an HR platform;
- a payroll system;
- a source-code management platform;
- a CI/CD platform;
- an autonomous project-management agent.

Budget management remains outside core scope.

---

# 38. Initial Non-Functional Requirements

## 38.1 Reliability

Core project data must remain available and consistent even if AI functionality is temporarily unavailable.

## 38.2 Performance

Normal project navigation and task operations should not depend on AI response time.

## 38.3 Security

Project information should require authenticated access.

Detailed authentication and authorization design will be defined later.

## 38.4 Data Separation

Project records should maintain clear entity relationships and avoid accidental cross-project data mixing.

## 38.5 Responsiveness

The application must support desktop and mobile layouts.

## 38.6 Observability

The system should support logging and diagnostics for:

- application errors;
- background jobs;
- AI requests;
- document generation;
- relevant state transitions.

## 38.7 Recoverability

Project data should be designed for database backup and recovery.

Detailed operational requirements will be defined in Technical Architecture and Deployment & Operations documentation.

---

# 39. High-Level User Journey

A representative ProjectPilot workflow is:

```text
1. Create Lead
      ↓
2. Capture Initial Brief
      ↓
3. Convert Lead to Project
      ↓
4. Run AI Brief Analysis
      ↓
5. Generate Discovery Questions
      ↓
6. Record Client Answers
      ↓
7. Build Requirement Registry
      ↓
8. Resolve Clarifications
      ↓
9. Define Scope
      ↓
10. Create Epics / Features / Tasks
      ↓
11. Build Timeline & Milestones
      ↓
12. Prepare Client Approval
      ↓
13. Start Active Delivery
      ↓
14. Track Work in Kanban
      ↓
15. Monitor Risks / Issues / Dependencies
      ↓
16. Capture Meetings
      ↓
17. Produce Weekly Reports
      ↓
18. Produce Monthly Reports
      ↓
19. Complete Delivery
      ↓
20. Generate Final Documentation
      ↓
21. Complete Handover Checklist
      ↓
22. Mark Project Completed
```

---

# 40. Core Cross-Module Traceability

ProjectPilot should support relationships such as:

```text
Lead
 ↓
Project
 ↓
Brief
 ↓
Discovery Question
 ↓
Client Answer
 ↓
Requirement
 ↓
Decision
 ↓
Scope
 ↓
Feature
 ↓
Task
 ↓
Milestone
 ↓
Report
 ↓
Documentation
 ↓
Handover
```

Not every entity must always have every relationship, but the system should preserve meaningful traceability where it exists.

---

# 41. Core Acceptance Direction

The following are product-level acceptance expectations.

## 41.1 Lead to Project

A qualified lead can be converted to a project without re-entering the same client and brief information.

## 41.2 Discovery

A Project Manager can create discovery questions manually and generate AI-assisted questions from actual project context.

## 41.3 Requirement Authority

AI-extracted requirements remain suggestions until reviewed.

## 41.4 Scope

The Project Manager can define baseline scope and identify later potential scope changes.

## 41.5 Planning

Approved requirements can be translated into epics, features, tasks, dependencies, milestones, and timeline data.

## 41.6 Kanban

Tasks can be tracked visually through Kanban, and the same status is reflected everywhere else.

## 41.7 Timeline

Task-date changes are reflected in the timeline without duplicate manual updates.

## 41.8 Blocker Tracking

A blocked task can capture blocker evidence and becomes visible in PM attention views.

## 41.9 Client Dependency

Client-side dependencies can be tracked separately from internal delivery issues.

## 41.10 Meeting Intelligence

AI can analyze meeting content and suggest decisions, action items, requirements, and scope changes without directly mutating authoritative data.

## 41.11 Internal Reporting

Weekly internal reports are generated from actual project data.

## 41.12 Client Reporting

Client reports are created only after the internal reporting workflow and remain PM-reviewed before finalization.

## 41.13 Documentation

Final project documentation can reuse accumulated project knowledge rather than requiring complete manual reconstruction.

## 41.14 Project Q&A

Project questions are answered from available project evidence; missing evidence must not be fabricated.

## 41.15 AI Failure

AI failure must not corrupt or alter authoritative project records.

---

# 42. Deferred Decisions

The following decisions are intentionally not finalized in this PRD and will be resolved in downstream specifications:

- exact task state transition rules;
- exact lead lifecycle rules;
- exact requirement state transition rules;
- exact project lifecycle state transitions;
- project health calculation formula;
- final database schema;
- final technical stack;
- authentication implementation;
- role-based access model beyond initial PM use;
- file storage technology;
- report export formats;
- document export formats;
- notification channels;
- external integrations;
- direct client access;
- direct team-member access;
- integration with Jira, Linear, ClickUp, Trello, Slack, email, calendar, or other external tools;
- automated reminders;
- advanced analytics;
- multi-tenant behavior.

These must not be assumed during implementation until they are explicitly defined.

---

# 43. MVP Definition Direction

The product should eventually support the full lifecycle defined in this PRD.

However, implementation should be phased.

The Detailed Implementation Task Plan will determine the actual sequence.

A likely early foundation is:

```text
Foundation
  ↓
Lead & Project Workspace
  ↓
Discovery
  ↓
Requirement Management
  ↓
Scope
  ↓
Planning
  ↓
Task Management & Kanban
  ↓
Timeline
  ↓
Delivery Monitoring
```

Reporting, documentation, and advanced AI capabilities can then build on the structured data created by those modules.

The MVP must avoid building AI-heavy features before the underlying authoritative project data model is stable.

---

# 44. Product Completion Definition

ProjectPilot should not be considered complete merely because individual screens exist.

The product vision is fulfilled when project information can move coherently through the lifecycle:

```text
Lead
→ Discovery
→ Requirement
→ Scope
→ Planning
→ Delivery
→ Reporting
→ Documentation
→ Handover
```

without requiring the Project Manager to repeatedly reconstruct the same information in disconnected systems.

---

# 45. Next Authoritative Document

The next document should be:

**ProjectPilot — Workflow & State Specification**

That document will define:

- lifecycle states;
- allowed transitions;
- state ownership;
- terminal states;
- approval transitions;
- task workflow;
- Kanban states;
- requirement states;
- lead states;
- report states;
- issue/risk/blocker states;
- handover completion conditions.

It should resolve state behavior before the data model and technical architecture are finalized.
