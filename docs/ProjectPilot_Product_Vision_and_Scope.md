# ProjectPilot — Product Vision & Scope

**Document Type:** Product Vision & Scope  
**Project:** ProjectPilot  
**Status:** Draft v1.0  
**Date:** 15 August 2026  
**Primary User:** Project Manager  

---

## 1. Purpose of This Document

This document defines the product vision, scope, core principles, target users, project lifecycle, and initial boundaries for ProjectPilot.

It serves as the top-level product reference for subsequent documents, including:

- Product Requirements Document (PRD)
- Workflow & State Specification
- Information Architecture & Data Model
- AI Functional Specification
- Technical Architecture
- UI/UX Product Specification
- Detailed Implementation Task Plan
- Verification & Acceptance Plan

If later documents introduce conflicting interpretations, the vision and principles defined here should be treated as the highest-level product reference unless they are explicitly revised and approved.

---

## 2. Product Name

**ProjectPilot**

### Product Positioning

**ProjectPilot is an AI-assisted Project Management Operating Hub that supports the complete project lifecycle from lead, discovery, requirements, planning, delivery, reporting, documentation, to handover.**

### Working Tagline

**From Lead to Handover.**

---


## 2.1 Language Policy

ProjectPilot uses a deliberate separation between **product-development language** and **operational project-content language**.

### ProjectPilot Development & Engineering Documentation

All documents used to design, specify, implement, test, and operate ProjectPilot itself must be written in **English**.

Examples include:

- Product Vision & Scope;
- Product Requirements Document;
- Workflow & State Specification;
- Information Architecture & Data Model;
- AI Functional Specification;
- Technical Architecture;
- UI/UX Product Specification;
- Detailed Implementation Task Plan;
- Verification & Acceptance Plan;
- implementation contracts, schemas, and engineering-oriented specifications.

The purpose of using English for these artifacts is to minimize ambiguity when the system is implemented or interpreted by AI-assisted development tools.

### Project Operational Content

Content created, entered, analyzed, summarized, or generated inside ProjectPilot for real client projects should default to **Bahasa Indonesia**.

This includes, where applicable:

- project briefs;
- AI brief analysis;
- discovery questions;
- client-answer summaries;
- requirements and requirement summaries;
- meeting summaries;
- decision summaries;
- scope-change analysis;
- AI-generated task breakdowns;
- risk and blocker explanations;
- weekly internal reports;
- weekly client reports;
- monthly internal reports;
- monthly client reports;
- Functional Specification Documents (FSD);
- User Guides;
- Admin Guides;
- Technical Documentation;
- User Documentation;
- Design Documentation;
- handover-related generated content;
- Project Q&A answers.

### Internal Machine Language

Canonical internal identifiers, enums, schemas, API fields, database field names, and implementation-facing contracts should remain in **English** unless a later technical decision explicitly states otherwise.

Example:

```text
Internal state:
IN_PROGRESS

User-facing Indonesian label:
Sedang Dikerjakan
```

This language separation is a core product requirement and must be preserved by downstream specifications and implementation.


## 3. Background

A Project Manager does significantly more than manage tasks.

In practice, the Project Manager becomes the central coordinator between clients, management, and the internal delivery team. Project information develops from the moment an opportunity is still a lead, then evolves through briefing, discovery, requirement clarification, planning, execution, reporting, documentation, and final handover.

This information is often fragmented across:

- chat conversations;
- email;
- meeting notes;
- spreadsheets;
- task managers;
- documents;
- timelines;
- attachments;
- weekly reports;
- monthly reports;
- decision notes.

As a result, Project Managers repeatedly perform administrative work such as:

- copying information between tools;
- reconstructing historical decisions;
- searching for current task status;
- identifying the cause of delays;
- tracking dependencies;
- preparing follow-up questions for clients;
- producing reports from scattered project data;
- creating final documentation from scratch.

ProjectPilot is designed to reduce this fragmentation by providing one integrated workspace for the complete project lifecycle.

---

## 4. Product Vision

ProjectPilot aims to become the **single operational hub** used by a Project Manager to manage a project from beginning to end.

ProjectPilot is not merely a task manager.

It must connect:

**Lead → Brief → Discovery → Requirements → Scope → Planning → Tasks → Timeline → Delivery → Reporting → Documentation → Handover**

Information entered during an earlier stage should be reusable in later stages.

Core principle:

> **Enter project information once, reuse it throughout the entire project lifecycle.**

Examples:

- an initial brief helps generate discovery questions;
- discovery answers become requirements;
- requirements become the basis for project scope;
- scope becomes the basis for tasks and timeline;
- task and timeline data become reporting evidence;
- requirements, decisions, tasks, and implementation history contribute to final project documentation.

---

## 5. Primary User

The primary user of ProjectPilot is:

### Project Manager

The Project Manager uses ProjectPilot to:

- manage leads;
- record project briefs;
- conduct discovery;
- manage requirements;
- track decisions;
- define scope;
- create tasks;
- build timelines;
- manage Kanban boards;
- monitor the team;
- monitor milestones;
- manage issues;
- manage risks;
- manage blockers;
- monitor client dependencies;
- record meetings;
- generate reports;
- prepare final project documentation;
- prepare project handover.

For the initial product, ProjectPilot is primarily designed as an **internal working tool for the Project Manager**.

Direct client access or direct team-member access may be considered later and is not an initial core requirement unless explicitly introduced in the PRD.

---

## 6. Supporting Actors

Although the Project Manager is the primary user, ProjectPilot will store information related to several other actors.

### Client

Client-related data may include:

- company;
- project;
- person in charge;
- stakeholder;
- client decision;
- client approval;
- client dependency;
- client request;
- client question;
- client response.

### Internal Team

Internal team members may include:

- developer;
- designer;
- QA;
- technical lead;
- business analyst;
- infrastructure/DevOps;
- other delivery roles as required by the project.

### Management

Management is mainly involved in:

- internal project reporting;
- escalation;
- project health;
- risks;
- blockers;
- delivery status;
- management decisions.

---

## 7. Project Lifecycle

The canonical ProjectPilot lifecycle is:

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

This lifecycle represents the primary project journey and does not yet define every technical application state.

Detailed state transitions will be defined in the **Workflow & State Specification**.

---

## 8. Product Goals

ProjectPilot has the following primary goals.

### 8.1 Centralize Project Knowledge

All important project information should be discoverable from one workspace.

### 8.2 Improve Discovery Quality

ProjectPilot should help the Project Manager identify missing information and generate relevant discovery questions based on the actual project context.

### 8.3 Maintain Requirement Traceability

Requirements should be traceable to:

- their source;
- related decisions;
- project scope;
- features;
- tasks;
- implementation results.

### 8.4 Reduce Repetitive Administrative Work

Project information that already exists should be reused for:

- planning;
- reporting;
- analysis;
- documentation.

### 8.5 Improve Delivery Visibility

The Project Manager should be able to quickly understand:

- what is currently in progress;
- what is overdue;
- what is blocked;
- what is waiting on the client;
- which milestones are at risk;
- which tasks require attention.

### 8.6 Improve Decision Traceability

Important project decisions should retain clear history and context.

### 8.7 Improve Reporting Efficiency

Weekly and monthly reports should be generated from actual project data without requiring the Project Manager to manually reconstruct the project status each time.

### 8.8 Improve Handover Quality

Final project documentation should be prepared from knowledge accumulated throughout the project lifecycle.

---

## 9. Core Product Modules

ProjectPilot is planned to contain the following major modules.

### 9.1 Lead Management

Manage prospective projects before they become active projects.

Primary capabilities:

- create lead;
- client information;
- person in charge;
- initial opportunity information;
- lead status;
- qualification;
- conversion to project;
- lost lead tracking.

### 9.2 Project Workspace

The main workspace for each project.

Includes:

- project overview;
- project status;
- project health;
- client;
- stakeholders;
- team;
- milestones;
- important dates;
- activity summary.

### 9.3 Brief & Discovery

Manage initial project information and the discovery process.

Includes:

- initial brief;
- meeting notes;
- brief summary;
- known information;
- unknown information;
- discovery questions;
- technical questions;
- non-technical questions;
- client answers;
- follow-up questions;
- requirement gaps.

### 9.4 Requirement Management

Store requirements in a structured form.

Categories may include:

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
- maintenance.

Every requirement should have a traceable source and status.

### 9.5 Decision Log

Store important project decisions.

Examples:

- client decisions;
- technical decisions;
- scope decisions;
- requirement changes;
- approvals;
- rejections.

### 9.6 Scope Management

Define:

- in scope;
- out of scope;
- baseline scope;
- potential scope changes;
- accepted scope changes;
- rejected scope changes.

### 9.7 Planning

Transform scope into a delivery structure.

Suggested hierarchy:

```text
Epic
  ↓
Feature
  ↓
Task
  ↓
Subtask
```

Planning also includes:

- estimates;
- dependencies;
- milestones;
- start dates;
- due dates;
- priorities.

### 9.8 Task Management & Kanban

Task management is a core component of ProjectPilot.

The same task database should support multiple views:

- Kanban Board;
- List View;
- Timeline View;
- Calendar View;
- Milestone View.

Initial canonical Kanban workflow:

```text
BACKLOG
READY
IN_PROGRESS
IN_REVIEW
QA
BLOCKED
DONE
```

Final states will be defined in the Workflow & State Specification.

A task may store:

- title;
- description;
- project;
- epic;
- feature;
- assignee;
- team;
- status;
- priority;
- estimate;
- start date;
- due date;
- dependencies;
- blocker;
- progress;
- attachments;
- comments;
- activity history.

### 9.9 Team & Workload

Help the Project Manager understand:

- team members;
- assignments;
- roles;
- active tasks;
- workload;
- overdue tasks;
- blocked tasks.

ProjectPilot is not intended to become an HR management system.

### 9.10 Timeline & Milestones

Timeline and Kanban must operate on the same underlying task data.

Kanban and Timeline must not maintain separate operational sources of truth.

Task date changes should immediately be reflected in the timeline and relevant milestones.

### 9.11 Issue, Risk & Blocker Management

ProjectPilot should support tracking:

- issues;
- risks;
- blockers;
- severity;
- impact;
- owner;
- mitigation;
- resolution;
- affected milestones;
- affected tasks.

### 9.12 Client Dependency Tracker

ProjectPilot should explicitly track items that are waiting on the client.

Examples:

- approval;
- credentials;
- API access;
- assets;
- content;
- decisions;
- clarification;
- documents.

This is important for distinguishing internal delivery delays from client-side dependencies.

### 9.13 Meeting Management

A meeting record may contain:

- meeting title;
- date;
- participants;
- notes;
- transcript;
- summary;
- decisions;
- action items;
- requirement updates;
- follow-ups;
- attachments.

### 9.14 Reporting

ProjectPilot should support the following reporting flows.

#### Weekly Internal Report

A detailed internal report may include:

- completed work;
- work in progress;
- delayed tasks;
- blockers;
- risks;
- issues;
- team concerns;
- client dependencies;
- timeline impact;
- escalation items;
- management decisions required;
- next-week plan.

#### Weekly Client Report

Prepared after internal review and limited to information appropriate for client communication.

#### Monthly Internal Report

Provides a monthly overview of progress, trends, milestones, risks, issues, and concerns.

#### Monthly Client Report

Provides a client-appropriate monthly progress summary.

Reports must not be sent automatically without Project Manager review.

### 9.15 Documentation

ProjectPilot should assist in preparing drafts of final project documentation, including:

- Functional Specification Document (FSD);
- User Guide;
- Admin Guide when applicable;
- Technical Documentation;
- User Documentation;
- Design Documentation.

### 9.16 Handover

ProjectPilot should help the Project Manager ensure that all required handover items are ready.

Examples:

- final deployment;
- approvals;
- documentation;
- credentials;
- source code;
- operational information;
- training/support information;
- handover checklist.

### 9.17 PM Control Center

The main Project Manager dashboard should emphasize information requiring attention, not merely display statistics.

Examples:

- overdue tasks;
- blocked tasks;
- milestones at risk;
- client dependencies;
- pending approvals;
- unresolved issues;
- high risks;
- upcoming deadlines.

### 9.18 Project Memory / Project Q&A

The Project Manager should be able to ask questions about a project based on available project knowledge.

Examples:

- What are we still waiting for from the client?
- Why was the payment integration changed?
- Which requirements are still unconfirmed?
- Which task is causing the milestone delay?
- What was the latest decision regarding authentication?

Answers must come from project evidence rather than AI assumptions.

---

## 10. AI Strategy

ProjectPilot uses a single AI model:

**Gemini 3.5 Flash-Lite**

The model will be used for all approved AI capabilities in ProjectPilot.

Multi-provider AI architecture and fallback AI providers are not part of the initial scope.

---

## 11. AI Responsibilities

AI may assist with tasks such as:

- brief analysis;
- briefing summarization;
- discovery question generation;
- requirement extraction;
- requirement normalization;
- requirement gap analysis;
- contradiction detection;
- meeting analysis;
- action item extraction;
- potential scope change detection;
- task breakdown suggestions;
- risk explanation;
- weekly report drafting;
- monthly report drafting;
- documentation drafting;
- project knowledge Q&A.

---

## 12. AI Authority Boundary

AI is not the source of truth for ProjectPilot.

Canonical principle:

> **AI may analyze project information, but AI must not create authoritative project facts without appropriate evidence and approval.**

AI may:

- suggest;
- summarize;
- classify;
- extract;
- analyze;
- identify possible gaps;
- identify possible contradictions;
- draft;
- recommend.

AI must not independently:

- approve requirements;
- change project scope;
- claim client approval;
- invent project progress;
- invent task status;
- mark a project completed;
- fabricate decisions;
- fabricate meeting outcomes;
- fabricate blockers;
- fabricate timeline changes.

---

## 13. Human Approval Gate

For changes that affect the source of truth, AI should first produce a suggestion.

Canonical pattern:

```text
Project Evidence
      ↓
Gemini
      ↓
AI Suggestion
      ↓
PM Review
  ┌────┼────┐
Accept Edit Reject
      ↓
Authoritative Project Data
```

Example:

If AI analyzes a meeting and detects a possible new requirement, it should present:

- suggested requirement;
- category;
- source;
- supporting evidence;
- potential impact.

The requirement becomes authoritative only after the Project Manager accepts or edits it.

---

## 14. Source of Truth Principles

ProjectPilot must distinguish between:

### Authoritative Project Data

Data explicitly recorded or approved, such as:

- client information;
- requirements;
- decisions;
- scope;
- tasks;
- status;
- milestones;
- issues;
- blockers;
- risks;
- client dependencies;
- approvals.

### AI-Derived Data

Data produced by AI, such as:

- summaries;
- drafts;
- suggestions;
- explanations;
- potential gaps;
- potential scope changes;
- generated report drafts.

AI-derived data does not automatically become authoritative.

---

## 15. Evidence & Traceability Principle

Important information should be traceable to its source whenever possible.

Example:

```text
Meeting
   ↓
Decision
   ↓
Requirement
   ↓
Feature
   ↓
Task
```

or:

```text
Client Answer
   ↓
Requirement
   ↓
Scope
   ↓
Task
```

The purpose of traceability is to allow the Project Manager to answer:

- Why does this task exist?
- Which requirement caused it?
- Who requested the change?
- When was the decision made?
- What was the impact?
- What was the original source?

---

## 16. Reporting Principle

Reports must use project data as evidence.

AI should only transform that data into a readable report.

Example:

```text
Tasks
Milestones
Issues
Risks
Blockers
Dependencies
Decisions
      ↓
Reporting Data Layer
      ↓
Gemini
      ↓
Report Draft
      ↓
PM Review
      ↓
Final Report
```

Client reports must not be generated from unrestricted internal information without review.

---

## 17. Task & Timeline Principle

Kanban, task list, timeline, calendar, and milestone views must use one shared task data model.

There must not be duplicated operational data merely because the information is displayed in a different view.

Example:

```text
TASK DATABASE
     │
     ├── Kanban
     ├── List
     ├── Timeline
     ├── Calendar
     └── Milestone
```

---

## 18. Project Health Principle

Project health must not be based only on AI opinion.

Project health should be calculated from available evidence such as:

- overdue tasks;
- blocked tasks;
- milestone variance;
- unresolved critical issues;
- high risks;
- client dependency duration;
- task dependency impact.

AI may explain the reasons behind project health, but it must not fabricate supporting evidence.

---

## 19. Product Scope

### In Scope

ProjectPilot includes:

- lead tracking;
- client/project information;
- briefing;
- discovery;
- requirements;
- question tracking;
- decision log;
- scope;
- task breakdown;
- Kanban;
- timeline;
- milestones;
- team assignment;
- task tracking;
- issues;
- risks;
- blockers;
- client dependencies;
- meetings;
- AI-assisted analysis;
- weekly reporting;
- monthly reporting;
- documentation;
- handover;
- PM Control Center;
- project knowledge search/Q&A.

### Out of Scope — Initial Product

ProjectPilot is not initially focused on:

- project budgeting;
- accounting;
- invoicing;
- payroll;
- procurement;
- employee HR management;
- full sales CRM functionality;
- automatic project execution;
- autonomous AI project management;
- automatic client communication without PM approval;
- automatic task status changes based solely on AI inference;
- source-code project management;
- replacing every specialized development tool.

External integrations may be considered later.

---

## 20. Budget Management Boundary

Budget management is not part of ProjectPilot's core responsibility in the initial product.

ProjectPilot may store budget-related notes or references if they are useful as project context, but it is not intended to provide:

- financial planning;
- profit calculations;
- invoicing;
- cost control;
- billing;
- accounting.

Financial management remains outside core scope unless the product scope is explicitly revised later.

---

## 21. Product UX Principles

ProjectPilot should be:

- user friendly;
- mobile friendly;
- fast to operate;
- designed to avoid repeated entry of the same information;
- based on progressive disclosure for complex workspaces;
- focused on surfacing items that require attention;
- traceable without making the interface unnecessarily heavy;
- easy to navigate between overview and detail.

The primary interface should work well on desktop, while important actions must remain practical and comfortable on a smartphone.

---

## 22. Key Product Differentiation

ProjectPilot is not designed to compete only on task creation.

Its primary differentiation is lifecycle integration.

Example:

```text
Brief
 ↓
Discovery
 ↓
Requirements
 ↓
Scope
 ↓
Tasks
 ↓
Delivery Evidence
 ↓
Reports
 ↓
Documentation
 ↓
Handover
```

Task management is important, but it is only one part of the product.

---

## 23. Success Criteria

ProjectPilot delivers value if it helps the Project Manager:

1. find project information faster;
2. reduce context loss from meetings and communication;
3. improve discovery quality;
4. maintain requirement and decision history;
5. create tasks and timelines more systematically;
6. identify project risks and blockers earlier;
7. reduce manual reporting work;
8. reduce duplicate data entry;
9. generate final documentation from accumulated project history;
10. prepare project handover more consistently.

---

## 24. Non-Goals

ProjectPilot does not aim to:

- replace the Project Manager;
- make every project decision automatically;
- become an autonomous project agent;
- make decisions on behalf of the client;
- make decisions on behalf of management;
- take over human accountability;
- treat AI output as project fact;
- eliminate human review for important reports or documentation.

---

## 25. Guiding Principles

All ProjectPilot design and implementation decisions should follow these principles.

### Principle 1 — One Project, One Knowledge Hub

Project information must have a clear authoritative location.

### Principle 2 — Enter Once, Reuse Everywhere

Existing information should be reused throughout the lifecycle.

### Principle 3 — Evidence Before AI

AI analysis should be grounded in project evidence.

### Principle 4 — AI Suggests, PM Decides

Authoritative changes remain under Project Manager control.

### Principle 5 — Traceability Matters

Requirements, decisions, scope, and tasks should be traceable to each other.

### Principle 6 — Operational Views Share the Same Data

Kanban, timeline, calendar, and list views represent the same underlying task data.

### Principle 7 — Reporting Comes From Delivery Data

Reports do not create new facts; they represent project data.

### Principle 8 — Internal Before External

Client reporting follows internal review and discussion.

### Principle 9 — Project Knowledge Accumulates

Every stage should add knowledge that can be reused in later stages.

### Principle 10 — Human Accountability Remains

ProjectPilot assists the Project Manager rather than replacing their responsibility.

---

## 26. Product Lifecycle Summary

```text
LEAD
│
├─ Lead Information
├─ Client
├─ PIC
└─ Qualification
     │
     ▼
DISCOVERY
│
├─ Initial Brief
├─ Meeting
├─ AI Brief Analysis
├─ Discovery Questions
└─ Client Answers
     │
     ▼
REQUIREMENT
│
├─ Requirement Registry
├─ Gap Analysis
├─ Decisions
└─ Scope Definition
     │
     ▼
PLANNING
│
├─ Epic
├─ Feature
├─ Task
├─ Dependency
├─ Milestone
└─ Timeline
     │
     ▼
CLIENT APPROVAL
     │
     ▼
ACTIVE DELIVERY
│
├─ Kanban
├─ Team
├─ Timeline
├─ Issues
├─ Risks
├─ Blockers
├─ Client Dependencies
├─ Meetings
└─ Project Health
     │
     ▼
REPORTING
│
├─ Weekly Internal
├─ Weekly Client
├─ Monthly Internal
└─ Monthly Client
     │
     ▼
HANDOVER
│
├─ FSD
├─ User Guide
├─ Admin Guide
├─ Technical Documentation
├─ User Documentation
├─ Design Documentation
└─ Handover Checklist
     │
     ▼
COMPLETED
```

---

## 27. Next Authoritative Document

After this Product Vision & Scope is approved, the next document should be:

**ProjectPilot Product Requirements Document (PRD)**

The PRD will translate the product vision and scope above into detailed product requirements, including module capabilities, user flows, business rules, data requirements, functional requirements, and acceptance direction.
