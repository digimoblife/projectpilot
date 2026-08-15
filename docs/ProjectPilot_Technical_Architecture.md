# ProjectPilot — Technical Architecture

**Document Type:** Technical Architecture  
**Project:** ProjectPilot  
**Status:** Draft v1.0  
**Date:** 15 August 2026  
**Primary User:** Project Manager  
**Primary AI Model:** Gemini 3.5 Flash-Lite  
**Parent Documents:**  
- ProjectPilot — Product Vision & Scope  
- ProjectPilot — Product Requirements Document (PRD)  
- ProjectPilot — Workflow & State Specification  
- ProjectPilot — Information Architecture & Data Model  
- ProjectPilot — AI Functional Specification  

---

# 1. Purpose

This document defines the technical architecture for ProjectPilot.

It translates the approved product, workflow, data, and AI requirements into a coherent implementation architecture.

This document defines:

- application boundaries;
- recommended technology stack;
- frontend architecture;
- backend/API architecture;
- relational data architecture;
- background processing;
- Gemini integration;
- document and file processing;
- search and Project Q&A architecture;
- authentication and authorization;
- task/Kanban/timeline implementation principles;
- reporting and document-generation pipelines;
- observability;
- security;
- backup and recovery;
- deployment topology;
- failure isolation;
- scalability direction;
- implementation constraints.

This is an architecture baseline, not an exact dependency-version lock.

Unless explicitly marked as locked, runtime and framework versions should be selected at implementation time from maintained compatible releases.

---

# 2. Architectural Goals

ProjectPilot architecture must prioritize:

1. **data integrity over AI convenience;**
2. **one authoritative source of truth for project data;**
3. **clear separation between synchronous user actions and long-running work;**
4. **simple initial operations suitable for a single-owner internal application;**
5. **safe future growth toward multiple users and integrations;**
6. **mobile-friendly API and frontend behavior;**
7. **traceability from project evidence to generated outputs;**
8. **AI failure isolation;**
9. **recoverable and observable background workflows;**
10. **minimal unnecessary infrastructure.**

---

# 3. Architecture Principles

## 3.1 Modular Monolith First

ProjectPilot should begin as a **modular monolith**, not a microservice system.

The domain is broad, but most modules share:

- the same project data;
- the same authorization boundary;
- the same transaction requirements;
- the same audit history;
- the same reporting context.

Premature microservices would create unnecessary:

- network boundaries;
- distributed transactions;
- duplicated contracts;
- deployment complexity;
- operational overhead.

The application should still maintain clean internal module boundaries so services can be separated later if justified.

---

## 3.2 PostgreSQL as the Authoritative Data Store

Operational project state should live in one relational database.

Examples:

- leads;
- projects;
- requirements;
- tasks;
- decisions;
- scope;
- meetings;
- blockers;
- reports;
- handover.

AI output must not become a competing source of truth.

---

## 3.3 Async for Long-Running Work

Operations such as:

- AI document analysis;
- meeting transcript analysis;
- large report generation;
- FSD generation;
- attachment parsing;
- Project Q&A indexing/re-indexing;

should not block normal HTTP request/response cycles.

They should use durable background jobs.

---

## 3.4 Provider-Specific AI Code Is Isolated

Although ProjectPilot uses only Gemini 3.5 Flash-Lite, Gemini SDK/API behavior should remain isolated behind a dedicated application adapter.

This is not a multi-provider abstraction requirement.

Its purpose is to keep provider-specific concerns out of domain logic.

---

## 3.5 Deterministic Logic Before AI

The application calculates factual operational conditions.

Examples:

```text
overdue
due soon
open blocker count
waiting duration
milestone variance
task completion counts
```

Gemini may explain those facts, but does not calculate authoritative project status from unstructured intuition.

---

# 4. Recommended Technology Stack

The recommended baseline stack is:

```text
Frontend:
Next.js + React + TypeScript

Backend:
Python + FastAPI

Database:
PostgreSQL

ORM / Persistence:
SQLAlchemy 2.x style + Alembic migrations

Background Processing:
PostgreSQL-backed durable job queue + dedicated Python worker

File Storage:
S3-compatible object storage

AI:
Gemini API
Model: gemini-3.5-flash-lite

Search:
PostgreSQL Full-Text Search initially
Optional vector/RAG expansion later if validated

Reverse Proxy / TLS:
Caddy or equivalent production reverse proxy

Deployment:
Docker Compose on VPS for initial production

Observability:
Structured application logs + health/readiness endpoints

Testing:
Pytest for backend
TypeScript/frontend unit/component testing
Browser-level E2E testing for critical workflows
```

Exact versions are intentionally not pinned here.

---

# 5. Technology Rationale

## 5.1 Next.js

Next.js is recommended for the web application because ProjectPilot requires:

- complex application routing;
- reusable layouts;
- interactive Kanban behavior;
- responsive desktop/mobile screens;
- server/client rendering flexibility;
- strong TypeScript ecosystem.

The App Router should be the preferred application structure.

---

## 5.2 FastAPI

FastAPI is recommended for the backend because ProjectPilot contains substantial:

- domain logic;
- AI orchestration;
- structured validation;
- background-job integration;
- document-processing logic;
- Python-native data/AI workflows.

The backend should expose explicit API contracts rather than placing core project logic in frontend server actions.

---

## 5.3 PostgreSQL

PostgreSQL is recommended because ProjectPilot is strongly relational.

The system requires reliable relationships among:

```text
Project
Requirement
Decision
Scope
Feature
Task
Meeting
Report
Document
```

PostgreSQL also supports useful capabilities such as:

- JSONB for validated semi-structured AI payloads;
- full-text search;
- transactional integrity;
- indexes;
- constraints;
- mature backup tooling.

JSONB should complement the relational model, not replace it.

---

# 6. High-Level System Architecture

```text
                         USER
                          │
                          ▼
                  ┌───────────────┐
                  │   Next.js UI  │
                  │ Web / Mobile  │
                  └───────┬───────┘
                          │ HTTPS
                          ▼
                  ┌───────────────┐
                  │ FastAPI API   │
                  │ Application   │
                  └───────┬───────┘
                          │
          ┌───────────────┼────────────────┐
          │               │                │
          ▼               ▼                ▼
   ┌────────────┐   ┌───────────┐   ┌─────────────┐
   │ PostgreSQL │   │ Object    │   │ Job Queue   │
   │            │   │ Storage   │   │ in Postgres │
   └────────────┘   └───────────┘   └──────┬──────┘
                                           │
                                           ▼
                                  ┌─────────────────┐
                                  │ Python Worker   │
                                  └────────┬────────┘
                                           │
                          ┌────────────────┼───────────────┐
                          │                │               │
                          ▼                ▼               ▼
                    Gemini API      File Parsing     Generation
                  3.5 Flash-Lite                    Pipelines
```

---

# 7. Repository Structure

Recommended high-level repository layout:

```text
projectpilot/
│
├── apps/
│   ├── web/
│   └── api/
│
├── docs/
│
├── infra/
│
├── scripts/
│
├── tests/
│
└── compose.yml
```

A more explicit backend structure may be:

```text
apps/api/
│
├── projectpilot/
│   ├── api/
│   ├── application/
│   ├── domain/
│   ├── persistence/
│   ├── ai/
│   ├── documents/
│   ├── search/
│   ├── jobs/
│   ├── security/
│   └── observability/
│
└── migrations/
```

---

# 8. Backend Module Boundaries

The backend should use explicit domain modules.

Recommended modules:

```text
auth
clients
leads
projects
discovery
requirements
decisions
scope
planning
tasks
milestones
team
issues
risks
blockers
client_dependencies
meetings
reports
documents
handover
ai
search
attachments
audit
jobs
```

These are code boundaries, not separate deployed services.

---

# 9. Layering

Recommended backend layers:

```text
API Layer
    ↓
Application / Use Case Layer
    ↓
Domain Rules
    ↓
Repositories / Persistence
    ↓
PostgreSQL
```

External systems are accessed through adapters:

```text
Application
    ↓
Ports / Interfaces
    ↓
Gemini Adapter
Object Storage Adapter
File Parser
```

---

# 10. API Architecture

The API should use versioned HTTP endpoints.

Example:

```text
/api/v1/projects
/api/v1/projects/{project_id}
/api/v1/projects/{project_id}/requirements
/api/v1/projects/{project_id}/tasks
```

The exact path structure is deferred to implementation design.

## 10.1 API Responsibilities

The API is responsible for:

- authentication validation;
- authorization;
- input validation;
- state-transition validation;
- transaction boundaries;
- use-case execution;
- returning stable structured responses.

## 10.2 API Must Not

The API layer must not:

- contain large amounts of domain logic;
- directly invoke Gemini from route handlers for long tasks;
- rely on frontend validation for state safety.

---

# 11. Transaction Boundaries

Business mutations should use explicit database transactions.

Examples:

### Lead Conversion

```text
Create Project
Link Client
Link Brief
Mark Lead CONVERTED
Commit
```

If project creation fails, the lead must not become `CONVERTED`.

### AI Suggestion Acceptance

```text
Validate AISuggestion
Create authoritative entity
Update AISuggestion status
Create ActivityEvent
Commit
```

These steps should succeed or fail together.

---

# 12. Unit of Work Pattern

A Unit of Work or equivalent transaction-management pattern is recommended for multi-entity mutations.

This is especially useful for:

- lead conversion;
- requirement supersession;
- scope-change acceptance;
- task state transitions;
- AI suggestion acceptance;
- report finalization;
- document finalization;
- handover completion.

---

# 13. Database Design

The database should use normalized relational tables for authoritative entities.

JSONB is appropriate for:

- validated AI structured payloads;
- evidence snapshots;
- extensible metadata;
- provider response metadata.

JSONB should not replace tables for:

- Tasks;
- Requirements;
- Decisions;
- Scope;
- Reports;
- Projects;
- Handover.

---

# 14. Database Constraints

Critical integrity rules should exist at database and/or domain level.

Examples:

- project IDs must match across relationships;
- task cannot depend on itself;
- one project has at most one active handover;
- requirement cannot supersede itself;
- valid state values only;
- accepted AI suggestion references resulting entity;
- finalized report version lineage remains valid.

Where feasible, database constraints should reinforce application rules.

---

# 15. Migration Strategy

Database schema changes must use migrations.

Recommended:

```text
Alembic
```

Rules:

- production schema must not be changed manually;
- migrations are committed with code;
- migrations should support repeatable deployment;
- destructive changes require explicit review;
- backward-incompatible migrations should be carefully staged.

---

# 16. Task and Kanban Architecture

The Kanban board must operate on the authoritative `Task` record.

Canonical field:

```text
Task.status
```

No separate Kanban state exists.

Frontend drag-and-drop flow:

```text
Drag Card
   ↓
Frontend validates UX-level transition
   ↓
PATCH task transition request
   ↓
Backend validates canonical transition
   ↓
Backend writes Task.status
   ↓
ActivityEvent written
   ↓
Response returned
   ↓
All views reflect new state
```

---

# 17. Optimistic UI for Kanban

The frontend may use optimistic interaction for responsive drag-and-drop.

However:

- backend remains authoritative;
- invalid transition must revert the UI;
- failed requests must not leave the card visually in the wrong state;
- conflict handling should refresh authoritative task state.

---

# 18. Task Ordering

Kanban card order may use a presentation field such as:

```text
board_position
```

or an ordering key.

This is independent of workflow state.

The implementation should avoid renumbering every card on every drag when possible.

Exact algorithm is deferred.

---

# 19. Timeline Architecture

Timeline is a projection of task data.

Primary fields:

```text
Task.start_date
Task.due_date
TaskDependency
Milestone.target_date
```

Timeline must not store duplicate dates separately.

---

# 20. Calendar Architecture

Calendar is another projection.

Sources include:

- task due dates;
- task start dates where useful;
- milestone dates;
- client dependency expected dates;
- meetings.

The Calendar does not own these dates.

---

# 21. PM Control Center Architecture

The PM Control Center should use query/read models over authoritative data.

Examples:

```text
overdue tasks
blocked tasks
pending client dependencies
pending approvals
high-risk issues
milestone risk
```

The initial architecture does not require a dedicated analytics warehouse.

Complex dashboard queries may later be optimized using:

- materialized views;
- cached aggregates;
- health snapshots.

---

# 22. Project Health Engine

Project health should be produced by a deterministic rules engine.

Architecture:

```text
Project Data
   ↓
Health Signal Calculator
   ↓
Health Rules
   ↓
HEALTHY / WATCH / AT_RISK / CRITICAL
   ↓
Evidence Set
   ↓
Gemini optional explanation
```

The rules engine should be versioned.

Example:

```text
health_rules_version = "v1"
```

This allows future rule changes without obscuring historical interpretation.

---

# 23. Background Job Architecture

ProjectPilot needs durable asynchronous processing.

Recommended initial approach:

**PostgreSQL-backed job queue with a dedicated worker process.**

This avoids introducing Redis before there is a proven need.

## 23.1 Job Table Concept

A job record may contain:

```text
id
job_type
project_id
status
payload
attempt_count
max_attempts
available_at
claimed_at
claimed_by
completed_at
error_code
error_message
created_at
updated_at
```

## 23.2 Job States

```text
PENDING
RUNNING
SUCCEEDED
FAILED
CANCELLED
```

---

# 24. Worker Claiming

Worker claiming should be concurrency-safe.

A PostgreSQL pattern such as row locking with skip-locked semantics may be used.

Conceptually:

```text
Worker
  ↓
Claim one eligible job atomically
  ↓
Commit claim
  ↓
Execute
  ↓
Persist result
```

Multiple workers should not process the same job simultaneously.

---

# 25. Job Types

Potential job types:

```text
AI_BRIEF_ANALYSIS
AI_DISCOVERY_GENERATION
AI_REQUIREMENT_EXTRACTION
AI_MEETING_ANALYSIS
AI_SCOPE_CHANGE_ANALYSIS
AI_TASK_BREAKDOWN
AI_REPORT_GENERATION
AI_DOCUMENT_GENERATION
ATTACHMENT_PARSE
SEARCH_INDEX_UPDATE
PROJECT_QA
```

---

# 26. Retry Policy

Only retry technical failures that are potentially transient.

Examples:

- Gemini timeout;
- provider temporary error;
- object storage temporary failure.

Do not blindly retry:

- validation failures;
- unsupported file;
- invalid business input.

Retries must be bounded.

Exact retry count is operational configuration, not hard-coded product logic.

---

# 27. Idempotency

Long-running workflows must be idempotent where possible.

Example:

AI meeting analysis should not create authoritative Requirements during job execution.

It creates:

```text
AIRequest
AISuggestions
```

Therefore retrying analysis does not duplicate approved Requirements.

---

# 28. AI Integration Architecture

Gemini should be accessed from a dedicated adapter.

Conceptual interface:

```text
GeminiClient
├── generate_structured(...)
├── generate_text(...)
├── analyze_document(...)
└── health/check capability as applicable
```

This adapter handles:

- API authentication;
- request formatting;
- structured output configuration;
- provider errors;
- timeouts;
- response normalization.

Domain logic must not depend on raw provider response shapes.

---

# 29. Gemini Model Configuration

Canonical model identifier:

```text
gemini-3.5-flash-lite
```

The model name should be configuration-driven rather than scattered throughout code.

Example:

```text
GEMINI_MODEL=gemini-3.5-flash-lite
```

This does not permit automatic switching to another model.

Changing the model is an explicit product/configuration decision.

---

# 30. Gemini API Surface

The implementation should use the current supported Gemini API path appropriate at implementation time.

The architecture should support:

- structured outputs;
- multimodal/document input;
- explicit model configuration;
- controlled request timeout;
- request diagnostics.

Provider API choice must remain encapsulated within the Gemini adapter.

---

# 31. Structured AI Output

AI operations that feed workflows should use schema-constrained structured output.

Conceptual flow:

```text
Application Context
   ↓
Prompt + Schema
   ↓
Gemini
   ↓
JSON / Structured Response
   ↓
Schema Validation
   ↓
Domain Validation
   ↓
AISuggestion
```

Two validation layers are required:

1. **syntactic/schema validation**;
2. **business/domain validation**.

A structurally valid response may still be invalid project data.

---

# 32. AI Prompt Organization

Prompts should be stored as versioned application resources.

Recommended organization:

```text
ai/prompts/
├── brief_analysis/
├── discovery_questions/
├── requirement_extraction/
├── meeting_analysis/
├── scope_change/
├── reporting/
├── documentation/
└── project_qa/
```

Each operation should have its own contract.

---

# 33. Prompt Versioning

Every AI request should be traceable to a prompt version.

Conceptual fields:

```text
operation_type
prompt_version
model
```

This allows debugging and future evaluation.

---

# 34. AI Context Builder

The application should build AI context explicitly.

Do not give Gemini unrestricted access to the entire project database.

Example:

```text
Requirement Gap Analysis
        ↓
Context Builder
        ↓
Brief
Current Requirements
Discovery Questions
Client Answers
Decisions
        ↓
Gemini
```

Context builders are capability-specific.

---

# 35. Context Language Policy

Engineering prompts may be English.

Operational content remains Bahasa Indonesia by default.

Example prompt structure:

```text
System / developer instructions:
English

Evidence:
Bahasa Indonesia

Required human-readable output:
Bahasa Indonesia

Structured enum values:
English
```

This preserves implementation precision without changing operational language.

---

# 36. File Storage Architecture

Binary uploads should not be stored directly in PostgreSQL.

Use S3-compatible object storage.

Examples of compatible deployment options include:

- managed S3-compatible storage;
- self-hosted S3-compatible object storage if operationally justified.

The database stores metadata and storage references.

---

# 37. Attachment Upload Flow

```text
Browser
   ↓
API validates request
   ↓
Object Storage
   ↓
Attachment metadata in PostgreSQL
   ↓
Optional parse job queued
```

The exact direct-upload versus backend-proxy upload pattern may be chosen later.

---

# 38. File Safety

Upload handling should include:

- file-size limits;
- MIME/type validation;
- extension validation;
- sanitized filenames;
- random storage keys;
- project-level authorization;
- no execution of uploaded files;
- antivirus/malware scanning if deployment context requires it.

---

# 39. Document Parsing Architecture

Original files remain immutable source artifacts.

Parsed content is derived.

Conceptual model:

```text
Attachment
     ↓
Parse Job
     ↓
ParsedArtifact
     ↓
Normalized Text / Metadata
     ↓
Search / AI Context
```

A parse failure must not destroy or invalidate the original attachment.

---

# 40. Parsed Artifact

A derived parsed artifact may store:

```text
attachment_id
parser_version
content_type
text_content
page/section metadata
status
created_at
```

Exact schema is deferred.

---

# 41. PDF and Multimodal Processing

Where Gemini can directly understand the uploaded format and that is appropriate for the task, the application may provide file/document content to Gemini.

However:

- the file must still remain linked to project evidence;
- Gemini output remains derived;
- large files should not be resent unnecessarily;
- provider file references/caching may be used where supported and safe.

---

# 42. Search Architecture — Phase 1

Initial search should use PostgreSQL capabilities where practical.

Searchable content includes:

- project names;
- requirement text;
- task text;
- decision text;
- meeting notes;
- report text;
- document text;
- parsed attachment text.

PostgreSQL full-text search is sufficient for the initial keyword-oriented search layer.

---

# 43. Semantic Search / RAG

Vector search is **not mandatory for the initial implementation**.

Project Q&A should first be implemented using:

- explicit relational filters;
- project-scoped retrieval;
- keyword/full-text search;
- targeted entity selection.

If evaluation shows that semantic retrieval is materially needed, a vector layer may be added later.

Potential approaches include:

- PostgreSQL vector extension;
- Gemini-supported retrieval/File Search;
- another managed retrieval layer.

No choice is locked in this document.

---

# 44. Project Q&A Architecture

Project Q&A should use Retrieval-Augmented Generation behavior.

Conceptual flow:

```text
User Question
    ↓
Project Scope Validation
    ↓
Query Interpretation
    ↓
Retrieve Relevant Authoritative Evidence
    ↓
Evidence Ranking / Filtering
    ↓
Gemini 3.5 Flash-Lite
    ↓
Bahasa Indonesia Answer
    ↓
Evidence References
```

Gemini must not answer from unrestricted model memory when project facts are requested.

---

# 45. Q&A Retrieval Priority

Structured data should be preferred when it directly answers the question.

Example:

Question:

```text
Which tasks are overdue?
```

Correct flow:

```text
SQL query
→ authoritative task list
→ optional Gemini summarization
```

Not:

```text
send all project notes to Gemini
→ ask model to guess overdue tasks
```

---

# 46. Reporting Architecture

Reporting is a multi-stage pipeline.

```text
Reporting Period
      ↓
Deterministic Evidence Query
      ↓
Reporting Context
      ↓
Evidence Snapshot
      ↓
Gemini Draft
      ↓
Report DRAFT
      ↓
PM Edit / Review
      ↓
FINAL
```

Finalized reports preserve historical context.

---

# 47. Internal and Client Reporting Separation

Client reports should not be generated from unrestricted internal context.

Architecture:

```text
Internal Evidence
      ↓
Internal Report / Management Review
      ↓
Client-Visible Reporting Context
      ↓
Gemini
      ↓
Client Report Draft
```

The client-visible context is a deliberate application boundary.

---

# 48. Document Generation Architecture

Large project documents should use an orchestration pipeline.

Example:

```text
Document Request
      ↓
Evidence Resolver
      ↓
Evidence Package
      ↓
Outline Generator
      ↓
Section Generation
      ↓
Consistency Pass
      ↓
GeneratedDocument DRAFT
      ↓
PM Review
```

Long-running generation occurs in the worker.

---

# 49. Generated File Export

ProjectPilot should separate:

```text
Document Content
```

from:

```text
Exported File
```

The authoritative editable content may live in ProjectPilot.

Export may later produce:

- PDF;
- DOCX;
- Markdown;
- other client-required formats.

Exact export formats are deferred to product/UI implementation decisions.

---

# 50. Authentication Architecture

Initial production requires authenticated access.

Recommended baseline:

- email/password authentication or a secure identity provider;
- secure session cookies for browser access;
- server-side authorization checks;
- CSRF-safe mutation patterns where applicable;
- password hashing using a modern password hashing algorithm if passwords are stored.

The final authentication provider is intentionally not locked here.

---

# 51. Authorization Architecture

Initial scope is PM-first, but authorization should not be hard-coded as "every authenticated user can access everything."

At minimum, every project access should pass through an authorization boundary.

This prepares for future:

- multiple PMs;
- team access;
- management access;
- client access.

---

# 52. Project Data Isolation

Every project-scoped query must explicitly constrain the project.

Examples:

```text
GET /projects/{project_id}/tasks
```

must validate that the authenticated user may access `{project_id}`.

AI context builders must enforce the same boundary.

---

# 53. Secrets Management

Secrets must never be committed to source control.

Examples:

```text
DATABASE_URL
GEMINI_API_KEY
OBJECT_STORAGE_SECRET
SESSION_SECRET
```

Production secrets should be provided through deployment environment configuration or a secret manager.

---

# 54. API Security

Baseline protections should include:

- authenticated endpoints;
- authorization;
- request validation;
- rate limits for sensitive/high-cost operations where appropriate;
- maximum upload limits;
- safe error responses;
- secure cookies;
- TLS in production.

---

# 55. AI Cost and Abuse Controls

Even with a single internal user, AI operations should have operational controls.

Potential controls:

- maximum attachment size;
- maximum AI context size;
- one active identical generation per artifact where appropriate;
- request logging;
- bounded retries;
- explicit user-triggered expensive generation.

No autonomous infinite AI loops are permitted.

---

# 56. Frontend Architecture

The web frontend should use:

```text
Next.js
React
TypeScript
```

Recommended structure:

```text
app/
├── dashboard/
├── leads/
├── projects/
│   └── [projectId]/
├── reports/
└── documents/
```

Shared UI should be organized by domain and reusable components.

---

# 57. Frontend State

Server state should not be unnecessarily duplicated into global client state.

The frontend may use a query/cache library where beneficial for:

- task lists;
- Kanban mutation;
- dashboard data;
- project records.

Local UI state should handle:

- open drawer;
- selected card;
- filter values;
- unsaved draft inputs.

---

# 58. Forms

Forms should provide:

- client-side usability validation;
- server-side authoritative validation;
- clear field-level errors;
- draft preservation where valuable;
- mobile-friendly controls.

The backend remains authoritative.

---

# 59. Responsive Design Architecture

Responsive behavior must be designed at the component level.

Critical mobile areas include:

- PM dashboard;
- Kanban;
- task detail;
- discovery review;
- AI suggestion review;
- client dependencies;
- meeting results;
- report reading/editing.

Desktop tables may transform into cards, drawers, stacked layouts, or detail screens on mobile.

Functional parity must be preserved.

---

# 60. Kanban Mobile Behavior

Mobile Kanban should not depend exclusively on precise drag-and-drop.

A mobile user should also have an explicit action such as:

```text
Change Status
```

This ensures accessibility and reliable touch interaction.

---

# 61. Real-Time Updates

Real-time WebSocket infrastructure is not required initially.

For a primarily single-user PM tool, standard request refresh, query invalidation, and optional polling are sufficient.

Real-time collaboration may be added later if multi-user behavior requires it.

---

# 62. Caching

Caching should be conservative.

Do not cache mutable project state in ways that risk stale operational decisions.

Safe caching candidates may include:

- static reference data;
- rendered immutable finalized artifacts;
- expensive derived dashboard aggregates with short TTL;
- parsed attachment metadata.

PostgreSQL remains authoritative.

---

# 63. Audit Architecture

Important mutations should write `ActivityEvent` records.

Audit creation should occur in the same logical transaction as the mutation where practical.

Example:

```text
Task.status:
IN_PROGRESS → BLOCKED

same transaction:
ActivityEvent = TASK_STATUS_CHANGED
```

---

# 64. Observability

The application should produce structured logs.

Recommended common fields:

```text
timestamp
service
environment
request_id
user_id
project_id
operation
entity_type
entity_id
job_id
ai_request_id
level
message
error_type
```

Sensitive project content should not be unnecessarily logged.

---

# 65. Request Correlation

Each HTTP request should have a request/correlation ID.

Background jobs should preserve relevant linkage.

Example:

```text
request_id
→ job_id
→ ai_request_id
```

This improves debugging.

---

# 66. Health Endpoints

Recommended endpoints:

```text
/health
/health/ready
```

Potential readiness checks:

- application process alive;
- database reachable;
- migrations/schema compatible;
- required configuration present.

External Gemini availability should generally not make the whole application "not ready" because ProjectPilot core data must remain usable when AI is unavailable.

---

# 67. Worker Health

Worker health should be observable.

Possible mechanisms:

- heartbeat table;
- latest processed job timestamp;
- worker status endpoint exposed through API;
- queue depth metrics.

---

# 68. Error Handling

Errors should distinguish:

```text
VALIDATION_ERROR
NOT_FOUND
CONFLICT
INVALID_TRANSITION
AUTHENTICATION_ERROR
AUTHORIZATION_ERROR
AI_ERROR
STORAGE_ERROR
INTERNAL_ERROR
```

User-facing messages should be understandable.

Internal diagnostics may be more detailed.

---

# 69. AI Failure Isolation

If Gemini is unavailable:

ProjectPilot should still allow the PM to:

- view projects;
- edit tasks;
- use Kanban;
- edit requirements;
- manage blockers;
- manage client dependencies;
- write meeting notes;
- review historical reports.

Only AI-dependent operations should fail.

---

# 70. Object Storage Failure Isolation

If object storage is temporarily unavailable:

- existing relational project data remains usable;
- attachment operations may fail;
- task updates must not be blocked unless the task mutation itself requires the attachment.

---

# 71. Database Failure

PostgreSQL is critical infrastructure.

If the database is unavailable:

- API readiness should fail;
- mutations must stop;
- the application must not attempt to continue using stale cached authoritative data.

---

# 72. Deployment Architecture

Initial production should use a VPS and Docker Compose.

Recommended topology:

```text
Internet
   ↓
Reverse Proxy / TLS
   ↓
┌────────────────────────────┐
│ ProjectPilot Docker Stack  │
│                            │
│ frontend                   │
│ backend                    │
│ worker                     │
│ postgres                   │
└────────────────────────────┘
           │
           ▼
External Object Storage
           │
           ▼
Gemini API
```

Object storage may also be self-hosted later if justified, but external durable storage is preferred for operational simplicity.

---

# 73. Container Responsibilities

## frontend

Runs the Next.js production application.

## backend

Runs FastAPI HTTP API.

## worker

Runs durable background job processor.

## postgres

Runs PostgreSQL.

## gateway/reverse proxy

May run on host or in Compose depending on deployment choice.

---

# 74. Network Exposure

Only the reverse proxy should normally be publicly exposed.

Recommended:

```text
Public:
80/443 → reverse proxy

Private/internal:
frontend
backend
postgres
worker
```

PostgreSQL must not be publicly exposed.

---

# 75. TLS

Production access must use HTTPS.

TLS certificates should be automatically renewable where possible.

---

# 76. Environment Configuration

Recommended separation:

```text
development
test
production
```

Configuration should be environment-driven.

Do not hard-code:

- domain;
- database URL;
- AI key;
- object storage credentials;
- upload limits;
- timeout settings.

---

# 77. Backup Architecture

At minimum, production backup must cover:

1. PostgreSQL;
2. uploaded project attachments;
3. relevant deployment configuration that is not secret.

---

# 78. PostgreSQL Backup

Recommended baseline:

- automated scheduled logical or physical backup;
- retention policy;
- off-host copy;
- periodic restore test.

A backup that has never been restore-tested should not be considered fully trusted.

---

# 79. Object Storage Backup

Attachment retention depends on the selected storage provider.

The architecture should ensure:

- durable storage;
- accidental deletion protection where available;
- clear recovery process.

---

# 80. Disaster Recovery

A minimum recovery plan should document:

```text
Provision replacement VPS
Restore repository/application
Restore environment configuration
Restore PostgreSQL
Reconnect object storage
Start services
Run readiness verification
```

Detailed operational procedures will be written later in the Deployment & Operations Runbook.

---

# 81. Testing Architecture

Testing should exist at multiple layers.

## Unit Tests

For:

- state transitions;
- health rules;
- requirement logic;
- task dependency logic;
- reporting evidence selection;
- AI output validation.

## Integration Tests

For:

- database repositories;
- API + database;
- job claiming;
- AI adapter contract with mocked provider;
- attachment metadata flows.

## End-to-End Tests

For critical workflows:

```text
Lead → Project
Discovery → Requirement
Task → Kanban
Blocked Task
Meeting → AI Suggestions
Weekly Report
Handover → Completed
```

---

# 82. AI Contract Tests

Every structured AI operation should have tests for:

- valid response;
- missing field;
- invalid enum;
- malformed output;
- empty response;
- unsupported evidence;
- retry behavior.

These tests should not require real Gemini calls for normal CI.

---

# 83. Controlled Real-AI Verification

A small controlled verification suite may be run manually or in a protected environment against Gemini.

Its purpose is to verify:

- current API compatibility;
- structured output behavior;
- Bahasa Indonesia output;
- prompt quality;
- latency;
- context behavior.

It should not replace deterministic automated tests.

---

# 84. Search Tests

Search should be tested for:

- project isolation;
- correct ranking basics;
- no cross-project leakage;
- deleted/archived visibility rules;
- Bahasa Indonesia text search behavior.

---

# 85. Security Testing

At minimum:

- authorization tests;
- project isolation tests;
- upload validation tests;
- invalid state mutation tests;
- unauthenticated access tests;
- AI project-context isolation tests.

---

# 86. Performance Direction

The initial application does not require distributed infrastructure.

Performance goals should prioritize:

- fast normal CRUD/navigation;
- responsive Kanban;
- indexed project queries;
- async AI/document work;
- paginated large collections.

The application should not wait for Gemini during normal task-management navigation.

---

# 87. Pagination

Large collections should support pagination or incremental loading.

Potential candidates:

- tasks;
- activity history;
- reports;
- documents;
- meetings;
- AI suggestions.

Kanban may load board-relevant tasks differently from historical list screens.

---

# 88. Indexing Strategy

Indexes should be added based on query patterns.

Likely indexed fields:

```text
project_id
status
due_date
assignee
created_at
updated_at
reporting period
foreign keys
```

Full-text search indexes should be introduced for searchable content where required.

---

# 89. Time and Time Zone

All persisted timestamps should use timezone-aware values.

Recommended database convention:

```text
UTC
```

The UI should display times in the configured user/project timezone.

For the initial product, the application should support a default user timezone configuration.

---

# 90. Language and Encoding

All application layers must support UTF-8.

Bahasa Indonesia operational content must be preserved exactly.

The system must not apply automatic English translation when storing or retrieving user content.

---

# 91. Localization

Canonical internal strings remain English.

User-facing labels may use a localization dictionary.

Example:

```text
IN_PROGRESS → Sedang Dikerjakan
BLOCKED → Terhambat
DONE → Selesai
```

Do not persist translated state labels as authoritative state values.

---

# 92. Generated Content Storage

Generated reports and documents should be stored as editable content in the application database or a document-content store backed by the database.

Binary exports should be separate attachments/artifacts.

The application should retain:

- artifact type;
- version;
- status;
- content;
- evidence links;
- generation metadata.

---

# 93. Markdown as Internal Generated-Content Format

For the initial implementation, Markdown is recommended as the normalized internal format for long generated text artifacts.

Examples:

- reports;
- FSD drafts;
- guides;
- technical documentation.

Advantages:

- editable;
- diff-friendly;
- easy to render;
- easy to export later;
- simple AI generation format.

This does not mean clients must receive Markdown files.

---

# 94. Rich Text Editing

The UI may render/edit Markdown through a rich editor or structured editor.

The stored canonical format should remain predictable.

Avoid proprietary opaque editor formats unless required.

---

# 95. External Communication

Automatic email or messaging delivery is not part of the initial architecture.

Reports are generated and finalized in ProjectPilot.

Future email/communication integrations should be added through explicit adapters and permission boundaries.

---

# 96. External Task Integrations

Jira, ClickUp, Linear, Trello, or similar synchronization is not part of the initial architecture.

ProjectPilot's own task model remains authoritative.

Any future integration must define:

- source-of-truth direction;
- conflict handling;
- state mapping;
- sync failures;
- ownership.

---

# 97. Multi-Tenancy

The initial architecture may operate as a single workspace for the primary user.

However, entity ownership should not prevent future workspace/tenant separation.

A future `workspace_id` may become an explicit top-level boundary.

Multi-tenancy is deferred and must not be partially implemented without a security review.

---

# 98. Scalability Path

If ProjectPilot grows, scaling can happen incrementally.

Potential progression:

```text
Single VPS
   ↓
Larger VPS
   ↓
Separate database
   ↓
Multiple backend workers
   ↓
Multiple job workers
   ↓
Managed PostgreSQL / Object Storage
```

Microservices are not automatically required.

---

# 99. Architecture Decisions Locked by This Document

The following are architecture-level decisions:

1. modular monolith;
2. separate Next.js frontend and Python/FastAPI backend;
3. PostgreSQL as authoritative operational database;
4. durable background worker architecture;
5. PostgreSQL-backed queue initially;
6. Gemini 3.5 Flash-Lite as the only AI model;
7. AI requests routed through a dedicated Gemini adapter;
8. S3-compatible object storage for binary files;
9. authoritative tasks shared by Kanban/List/Timeline/Calendar;
10. deterministic health and attention signals before AI explanation;
11. project-scoped retrieval for Project Q&A;
12. PostgreSQL full-text search as initial search foundation;
13. vector/RAG infrastructure deferred until evidence shows it is needed;
14. Docker Compose VPS deployment as initial production topology;
15. Markdown as recommended normalized format for long generated text content;
16. English machine contracts with Bahasa Indonesia operational content.

---

# 100. Architecture Decisions Intentionally Not Locked

The following remain implementation decisions:

- exact framework versions;
- exact Node.js version;
- exact Python version;
- exact PostgreSQL major version;
- exact authentication provider;
- exact object storage provider;
- exact reverse proxy;
- exact frontend component library;
- exact query/cache library;
- exact rich-text/Markdown editor;
- exact test libraries;
- exact job polling interval;
- exact retry limits;
- exact Gemini timeout;
- exact upload size limits;
- exact search ranking implementation;
- exact deployment CI/CD mechanism;
- exact monitoring platform;
- exact vector-search solution if later required.

These should be chosen from maintained compatible options at implementation time.

---

# 101. Reference Implementation Flow — Discovery

```text
PM submits Brief
      ↓
FastAPI stores Brief
      ↓
PM requests AI analysis
      ↓
AIRequest created
Job queued
      ↓
Worker claims job
      ↓
Context Builder loads project evidence
      ↓
Gemini Adapter
      ↓
Structured response validation
      ↓
AISuggestions / analysis stored
      ↓
Frontend displays results
      ↓
PM Accept / Edit / Reject
      ↓
Controlled authoritative mutation
```

---

# 102. Reference Implementation Flow — Meeting

```text
Meeting notes/transcript uploaded
      ↓
Meeting = RECORDED
      ↓
Optional Attachment parse
      ↓
AI_MEETING_ANALYSIS job
      ↓
Gemini analysis
      ↓
Meeting summary
+
AISuggestions:
- Decisions
- Requirements
- Action Items
- Scope Changes
- Risks
      ↓
PM Review
```

---

# 103. Reference Implementation Flow — Weekly Report

```text
PM selects reporting period
      ↓
Backend gathers deterministic evidence
      ↓
Evidence snapshot created
      ↓
AI_REPORT_GENERATION job
      ↓
Gemini generates Bahasa Indonesia draft
      ↓
Report = DRAFT
      ↓
PM edits
      ↓
UNDER_REVIEW
      ↓
FINAL
```

Client report:

```text
Internal review complete
      ↓
Client-visible context selected
      ↓
Gemini client report draft
      ↓
PM review
      ↓
FINAL
```

---

# 104. Reference Implementation Flow — Project Q&A

```text
PM:
"Why is the current milestone delayed?"
      ↓
Backend identifies project
      ↓
Structured queries:
- milestone
- related tasks
- blockers
- dependencies
      ↓
Search additional relevant decisions/meetings
      ↓
Evidence package
      ↓
Gemini
      ↓
Bahasa Indonesia answer
with evidence references
```

---

# 105. Reference Implementation Flow — Handover

```text
Project = ACTIVE_DELIVERY
      ↓
PM enters HANDOVER
      ↓
Handover checklist loaded
      ↓
Generate/Finalize required documents
      ↓
Track acceptance items
      ↓
All required items:
COMPLETED / WAIVED / NOT_APPLICABLE
      ↓
Handover = COMPLETED
      ↓
Backend validates completion gate
      ↓
Project = COMPLETED
```

---

# 106. Architecture Acceptance Criteria

This architecture is correctly implemented when:

1. ProjectPilot can operate core project CRUD while Gemini is unavailable;
2. all authoritative operational data is persisted in PostgreSQL;
3. Kanban and Timeline use the same Task data;
4. invalid state transitions are rejected server-side;
5. long AI/document operations execute through durable background jobs;
6. AI request failure cannot mutate authoritative project records;
7. AI output is validated before becoming a suggestion;
8. suggestion acceptance uses explicit transactional mutation;
9. file binaries are stored outside PostgreSQL;
10. uploaded files remain traceable to project entities;
11. Project Q&A retrieves project-scoped evidence before generation;
12. client report generation uses an explicit client-visible context boundary;
13. activity history records important changes;
14. PostgreSQL is not exposed publicly;
15. production traffic uses HTTPS;
16. secrets are external to source code;
17. database backups are automated;
18. restore procedures can be tested;
19. worker health is observable;
20. operational content remains Bahasa Indonesia while machine contracts remain English.

---

# 107. Official Technology References

The implementation team should verify maintained releases and current API behavior against official documentation at implementation time.

Architecture choices in this document are aligned with the following official capabilities:

- Next.js App Router for modern Next.js application routing and layouts.
- FastAPI for Python API development and explicit deployment patterns.
- PostgreSQL relational storage, JSON/JSONB, indexing, and full-text search capabilities.
- Gemini 3.5 Flash-Lite (`gemini-3.5-flash-lite`) for low-latency multimodal/document-oriented AI workloads.
- Gemini structured outputs for schema-constrained AI responses.

No external documentation overrides ProjectPilot's product authority rules.

---

# 108. Next Authoritative Document

The next document should be:

**ProjectPilot — UI/UX Product Specification**

That document will define:

- application navigation;
- dashboard hierarchy;
- desktop and mobile behavior;
- project workspace layout;
- Lead screens;
- Discovery screens;
- Requirement workspace;
- Kanban interaction;
- task detail experience;
- Timeline and Calendar;
- issue/risk/blocker workflows;
- AI suggestion review UX;
- Meeting Intelligence UX;
- reporting workflow;
- document generation/review UX;
- handover experience;
- responsive design principles;
- accessibility and interaction requirements.

The UI/UX specification must preserve the authoritative workflow, data, AI, and technical boundaries defined by documents 1–6.
