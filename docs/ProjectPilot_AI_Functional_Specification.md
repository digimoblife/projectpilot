# ProjectPilot — AI Functional Specification

**Document Type:** AI Functional Specification  
**Project:** ProjectPilot  
**Status:** Draft v1.0  
**Date:** 15 August 2026  
**Primary User:** Project Manager  
**AI Model:** Gemini 3.5 Flash-Lite  
**Parent Documents:**  
- ProjectPilot — Product Vision & Scope  
- ProjectPilot — Product Requirements Document (PRD)  
- ProjectPilot — Workflow & State Specification  
- ProjectPilot — Information Architecture & Data Model  

---

# 1. Purpose

This document defines the authoritative functional behavior of the AI layer in ProjectPilot.

It specifies:

- what Gemini 3.5 Flash-Lite is allowed to do;
- what Gemini is not allowed to do;
- which project evidence may be provided to the model;
- how AI-generated outputs are structured;
- which outputs require human review;
- how AI suggestions become authoritative project data;
- how ProjectPilot should behave when AI output is incomplete, invalid, or unavailable;
- how AI is used for discovery, requirements, meetings, scope changes, reports, documentation, and project Q&A.

This document defines AI product behavior, not the final API integration implementation.

---

# 2. Core AI Principle

ProjectPilot uses AI as an assistant, not as the source of truth.

Canonical rule:

> **AI may analyze, organize, summarize, extract, compare, and draft from project evidence, but it must not create authoritative project facts without explicit evidence and appropriate Project Manager approval.**

ProjectPilot must preserve a clear distinction between:

```text
PROJECT EVIDENCE
        ↓
       AI
        ↓
AI-DERIVED OUTPUT
        ↓
PM REVIEW
        ↓
AUTHORITATIVE PROJECT DATA
```

---

# 3. Approved AI Model

ProjectPilot uses one AI model:

**Gemini 3.5 Flash-Lite**

No other AI provider or fallback model is part of the current product scope.

All AI-related product behavior must be designed around this single-model decision unless the product direction is explicitly changed later.

---

# 4. AI Responsibilities

Gemini may support the following product capabilities:

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
DEPENDENCY_SUGGESTION
RISK_EXPLANATION
REPORT_DRAFTING
DOCUMENT_DRAFTING
PROJECT_QA
```

Additional AI capabilities may be added later, but they must follow the authority and evidence rules in this document.

---

# 5. AI Non-Responsibilities

Gemini must not independently:

- approve a requirement;
- reject a requirement;
- mark a requirement as confirmed;
- change project scope;
- approve a scope change;
- change a task status;
- change a milestone date;
- close an issue;
- close a blocker;
- decide project completion;
- mark handover complete;
- claim client approval;
- fabricate a client answer;
- fabricate a decision;
- fabricate project progress;
- invent a technical fact not present in evidence;
- send a report;
- finalize a report;
- finalize a project document;
- modify authoritative records directly.

---

# 6. AI Authority Boundary

AI-generated output falls into one of three categories.

## 6.1 Informational Output

Used only for explanation or summary.

Examples:

- project summary;
- health explanation;
- Q&A response;
- report narrative draft.

This output does not automatically modify project records.

## 6.2 Suggestion Output

Potential project data that requires review.

Examples:

- requirement candidate;
- decision candidate;
- scope change candidate;
- discovery question;
- task breakdown;
- risk candidate;
- action item.

Suggestion output should normally be stored as `AISuggestion`.

## 6.3 Generated Artifact Draft

A larger draft artifact generated from project evidence.

Examples:

- weekly report;
- monthly report;
- FSD;
- User Guide;
- Technical Documentation.

Generated artifact drafts remain in `DRAFT` status until reviewed.

---

# 7. Human Approval Gate

For AI output that may become authoritative project data, ProjectPilot must use the following pattern:

```text
Evidence
  ↓
Gemini
  ↓
AISuggestion = GENERATED
  ↓
PM Review
  ├─ ACCEPT
  ├─ EDIT
  └─ REJECT
```

## 7.1 ACCEPT

The suggestion is converted into the appropriate authoritative entity.

Example:

```text
AI Requirement Suggestion
        ↓ ACCEPT
Requirement.status = DRAFT
```

## 7.2 EDIT

The PM modifies the suggestion before acceptance.

The resulting authoritative entity must store the edited content, not the original AI content.

The original AI suggestion remains available for traceability.

## 7.3 REJECT

The suggestion remains recorded as rejected and must not mutate authoritative data.

---

# 8. Evidence Contract

AI must only make project-specific claims using evidence supplied by ProjectPilot.

## 8.1 Evidence May Include

- Brief;
- DiscoveryQuestion;
- ClientAnswer;
- Requirement;
- RequirementSource;
- Decision;
- ScopeItem;
- ScopeChange;
- Epic;
- Feature;
- Task;
- Milestone;
- Issue;
- Risk;
- Blocker;
- ClientDependency;
- Meeting;
- ActionItem;
- Report;
- GeneratedDocument;
- Attachment-derived content;
- structured PM notes.

## 8.2 Evidence Must Be Project-Scoped

An AI request for Project A must not receive unrelated Project B data.

## 8.3 Evidence Metadata

Where practical, AI context should retain:

```text
entity_type
entity_id
title
date
status
source_reference
```

This enables traceability.

## 8.4 Evidence Gaps

If the evidence is insufficient, AI should indicate uncertainty or missing information instead of inventing a complete answer.

---

# 9. AI Request Lifecycle

Each AI operation should be represented by an `AIRequest`.

Technical lifecycle:

```text
PENDING
PROCESSING
SUCCEEDED
FAILED
CANCELLED
```

## 9.1 AIRequest Should Record

- operation type;
- project;
- requesting user;
- model;
- evidence context;
- start time;
- completion time;
- success/failure;
- error metadata.

## 9.2 Failure Rule

AI failure must not alter authoritative business data.

---

# 10. Structured Output Principle

Where AI output will participate in product workflows, structured output should be preferred over prose-only responses.

Example:

```json
{
  "summary": "...",
  "known_requirements": [],
  "unknowns": [],
  "risks": [],
  "suggested_questions": []
}
```

The exact schema will be defined during implementation.

Structured AI output must be validated before it is used.

---

# 11. Invalid AI Output

If Gemini returns:

- malformed structured output;
- missing mandatory fields;
- unexpected enum values;
- content that cannot be validated;

ProjectPilot must:

1. reject the invalid output for authoritative workflow use;
2. mark the AI request appropriately;
3. preserve authoritative project data unchanged;
4. provide a clear user-facing failure state;
5. allow retry where appropriate.

---

# 12. Prompting Principles

All AI prompts should follow these principles.

## 12.1 Define the Role

The model should understand that it assists a Project Manager.

## 12.2 Define the Task

Each AI operation should have one clear responsibility.

Avoid one universal mega-prompt that performs every project-management function.

## 12.3 Define Evidence Boundaries

The prompt should instruct the model to rely only on supplied project evidence.

## 12.4 Define Missing-Information Behavior

The model should identify missing evidence instead of filling gaps with assumptions.

## 12.5 Define Output Contract

The prompt should specify the required structure.

## 12.6 Define Authority Boundary

The prompt should state whether output is:

- informational;
- a suggestion;
- a draft artifact.

---

# 13. Capability A — Brief Analysis

## 13.1 Objective

Turn an initial client brief into a structured understanding of the project.

## 13.2 Input

Potential input:

- brief content;
- project type;
- known client information;
- attachments or extracted document content;
- PM notes.

## 13.3 Expected Output

Structured output may include:

- project summary;
- business objective;
- intended users;
- known functional requirements;
- known non-functional requirements;
- known technical information;
- known constraints;
- known integrations;
- known stakeholders;
- assumptions detected;
- unclear statements;
- missing information;
- potential project risks;
- suggested discovery areas.

## 13.4 Rules

AI must not treat inferred details as confirmed requirements.

Any inferred item should be labeled appropriately.

---

# 14. Capability B — Discovery Question Generation

## 14.1 Objective

Generate detailed questions that help the PM close project knowledge gaps.

## 14.2 Input

- initial brief;
- existing Requirements;
- existing DiscoveryQuestions;
- ClientAnswers;
- project type;
- unresolved gaps;
- detected contradictions.

## 14.3 Categories

Questions may be grouped into:

```text
BUSINESS
FUNCTIONAL
NON_FUNCTIONAL
TECHNICAL
UX
DATA
INTEGRATION
SECURITY
PERMISSION
REPORTING
DEPLOYMENT
MAINTENANCE
OPERATIONAL
```

## 14.4 Expected Output

Each suggested question should include:

- question;
- category;
- rationale;
- what uncertainty it resolves;
- related requirement or project area if applicable;
- priority or importance if useful.

## 14.5 Rules

The AI should avoid:

- repeating already answered questions;
- asking generic questions that are irrelevant to known project context;
- assuming a technology stack unless provided;
- converting the question into a requirement before the client answers.

---

# 15. Capability C — Requirement Extraction

## 15.1 Objective

Identify potential requirements from project evidence.

## 15.2 Input Sources

- Brief;
- ClientAnswer;
- Meeting;
- document content;
- PM notes;
- approved Decisions.

## 15.3 Expected Output

Each requirement candidate should include:

- title;
- description;
- category;
- actor if known;
- module/area if known;
- business rule if present;
- source evidence;
- confidence/clarity indicator;
- clarification-needed flag;
- ambiguity notes.

## 15.4 Authority

Output becomes `AISuggestion`.

It must not directly create an `APPROVED` Requirement.

---

# 16. Capability D — Requirement Normalization

## 16.1 Objective

Convert informal client language into clear structured requirement language.

Example input:

> Admin can see all orders and maybe edit them if needed.

Potential normalized output:

```text
Confirmed:
Admin can view all orders.

Needs clarification:
Whether Admin may modify an existing order.
```

## 16.2 Rule

Normalization must preserve meaning.

AI must not add behavior merely to make the requirement sound complete.

---

# 17. Capability E — Requirement Gap Analysis

## 17.1 Objective

Identify gaps in project understanding.

## 17.2 Input

- project Brief;
- all current Requirements;
- DiscoveryQuestions;
- ClientAnswers;
- Decisions;
- project type/context.

## 17.3 Output

Potential sections:

- well-defined areas;
- incomplete requirements;
- missing workflows;
- missing actor permissions;
- missing validation rules;
- missing error behavior;
- missing integration behavior;
- unresolved decisions;
- potential edge cases;
- recommended discovery questions.

## 17.4 Rule

A gap is an analysis result, not an authoritative requirement.

---

# 18. Capability F — Contradiction Detection

## 18.1 Objective

Detect conflicting project information.

## 18.2 Example

Evidence A:

```text
Guest checkout is allowed.
```

Evidence B:

```text
All customers must sign in before checkout.
```

Output should identify:

- conflict topic;
- evidence A;
- evidence B;
- why they conflict;
- recommended clarification question.

## 18.3 Rule

AI must not decide which statement is correct unless authoritative later evidence explicitly resolves it.

---

# 19. Capability G — Meeting Analysis

## 19.1 Objective

Transform meeting notes or transcripts into structured project intelligence.

## 19.2 Input

- meeting notes;
- transcript;
- participant information;
- existing project context where needed.

## 19.3 Output

Potential output:

- summary;
- discussion topics;
- decisions detected;
- action items;
- client dependencies;
- requirement candidates;
- requirement changes;
- scope-change candidates;
- blockers;
- risks;
- follow-up questions.

## 19.4 Authority

The following remain suggestions:

- decision candidates;
- requirements;
- task changes;
- scope changes;
- risks.

The meeting summary may be informational.

---

# 20. Capability H — Action Item Extraction

## 20.1 Objective

Identify explicit commitments and follow-up work from meetings.

## 20.2 Output

Each action item may contain:

- action;
- owner;
- due date if explicitly stated;
- source evidence;
- recommended target entity type.

Recommended target types:

```text
TASK
CLIENT_DEPENDENCY
ISSUE
FOLLOW_UP
```

## 20.3 Rule

AI must not invent due dates.

If none is provided:

```text
due_date = null
```

---

# 21. Capability I — Decision Extraction

## 21.1 Objective

Identify statements that may constitute a project decision.

## 21.2 Output

Potential fields:

- topic;
- decision;
- decision maker if known;
- date/source;
- rationale if explicit;
- affected requirements;
- affected scope;
- ambiguity.

## 21.3 Rule

A statement such as:

> "Maybe we can use Google Login."

must not be treated as a confirmed decision.

AI should distinguish:

- proposal;
- discussion;
- recommendation;
- confirmed decision.

---

# 22. Capability J — Scope Change Detection

## 22.1 Objective

Detect possible deviation from approved baseline scope.

## 22.2 Input

- approved ScopeItems;
- approved Requirements;
- new meeting information;
- new ClientAnswers;
- new requests;
- Decisions.

## 22.3 Output

Potential fields:

- detected change;
- original scope evidence;
- new evidence;
- why it may be a scope change;
- affected project areas;
- potential impact categories;
- clarification requirement.

## 22.4 Impact Categories

Examples:

```text
FUNCTIONAL
BACKEND
FRONTEND
DESIGN
QA
SECURITY
INTEGRATION
TIMELINE
DOCUMENTATION
```

## 22.5 Rule

AI must not invent effort or schedule impact.

Example of allowed output:

```text
Potential timeline impact: Yes
Exact duration: Unknown
```

Not:

```text
This will delay the project by 4 days.
```

unless deterministic project evidence supports that number.

---

# 23. Capability K — Task Breakdown Suggestion

## 23.1 Objective

Help transform approved scope into actionable delivery work.

## 23.2 Input

- approved Requirements;
- ScopeItems;
- project type;
- Epics/Features already defined;
- relevant Decisions.

## 23.3 Output

Potential structure:

```text
Epic
  Feature
    Task
      Subtask
```

Each proposed item may include:

- title;
- description;
- rationale;
- related requirement;
- suggested role/function;
- dependency candidate;
- acceptance direction.

## 23.4 Rule

AI-generated tasks must remain suggestions until reviewed.

---

# 24. Capability L — Dependency Suggestion

## 24.1 Objective

Suggest likely task relationships based on delivery sequence.

Example:

```text
Design approval
→ Frontend implementation
→ QA
```

## 24.2 Rule

Dependencies become authoritative only after PM approval.

The AI must not create cyclic dependencies.

The backend must still validate dependency integrity.

---

# 25. Capability M — Risk Explanation and Risk Suggestion

## 25.1 Objective

Help PM identify and explain risks from project evidence.

## 25.2 AI May

- suggest potential risks;
- summarize current risk evidence;
- explain project-health risk signals;
- suggest mitigation ideas.

## 25.3 AI Must Not

- fabricate probability;
- fabricate impact;
- assign severity as authoritative without review;
- claim a risk has materialized without evidence.

---

# 26. Capability N — PM Control Center Summary

## 26.1 Objective

Convert deterministic operational signals into a concise PM-focused summary.

## 26.2 Input

Examples:

```text
Overdue tasks
Blocked tasks
Client dependencies
Milestones at risk
High-severity issues
Pending approvals
Requirements needing clarification
```

## 26.3 Output

AI may produce:

- top priorities;
- concise explanation;
- suggested PM attention order;
- relevant project context.

## 26.4 Rule

The underlying facts must be computed by ProjectPilot before AI summarization.

---

# 27. Capability O — Weekly Internal Report Drafting

## 27.1 Objective

Generate an internal weekly project report draft from structured delivery evidence.

## 27.2 Input Evidence

Potential inputs:

- reporting period;
- task completion;
- tasks in progress;
- overdue tasks;
- milestone status;
- issues;
- risks;
- blockers;
- client dependencies;
- scope changes;
- decisions;
- meeting outcomes;
- PM notes.

## 27.3 Suggested Sections

```text
Executive Summary
Project Health
Progress This Week
Completed Work
Work in Progress
Delayed Work
Issues & Blockers
Risks
Client Dependencies
Scope / Requirement Changes
Timeline Impact
Management Attention Required
Next Week Plan
```

## 27.4 Rules

AI must:

- avoid inventing progress;
- avoid inventing causes;
- avoid hiding negative evidence;
- clearly indicate missing evidence;
- preserve internal detail where relevant.

The report remains `DRAFT`.

---

# 28. Capability P — Weekly Client Report Drafting

## 28.1 Objective

Generate a client-appropriate weekly report after internal review.

## 28.2 Input

Client report generation should use an explicitly prepared reporting context.

It should not simply receive all internal data without filtering.

Potential input:

- finalized/reviewed internal reporting context;
- approved client-visible progress;
- milestones;
- approved client dependencies;
- approved decisions;
- next steps.

## 28.3 Suggested Sections

```text
Project Summary
Progress This Week
Completed Items
Work in Progress
Milestone Status
Client Actions / Dependencies
Key Decisions
Next Week Plan
```

## 28.4 Confidentiality Rule

The AI must not decide alone what confidential internal information should be disclosed.

Client-visible context should be controlled by ProjectPilot and the PM.

---

# 29. Capability Q — Monthly Internal Report Drafting

## 29.1 Objective

Produce a month-level management report.

## 29.2 Input

- monthly task trend;
- milestones;
- weekly reports;
- issues;
- risks;
- blockers;
- scope changes;
- client dependencies;
- project health trend;
- PM notes.

## 29.3 Output

The report should synthesize the month rather than concatenate weekly reports.

---

# 30. Capability R — Monthly Client Report Drafting

## 30.1 Objective

Create a concise client-facing monthly summary.

AI should focus on:

- achievements;
- milestone progress;
- major approved changes;
- relevant dependencies;
- next-month plan.

Internal-only concerns remain outside the client context unless PM explicitly includes them.

---

# 31. Capability S — FSD Drafting

## 31.1 Objective

Generate a Functional Specification Document draft from approved project evidence.

## 31.2 Preferred Evidence

- approved Requirements;
- Decisions;
- ScopeItems;
- user roles/actors;
- business rules;
- workflows;
- permissions;
- integrations;
- relevant design/technical context.

## 31.3 Rule

The FSD must reflect approved functionality, not speculative AI recommendations.

---

# 32. Capability T — User Guide Drafting

## 32.1 Objective

Generate end-user guidance based on implemented and approved functionality.

## 32.2 Evidence

Potential evidence:

- final Features;
- relevant Tasks;
- finalized Requirements;
- screenshots/design references;
- workflows;
- user roles.

## 32.3 Rule

The guide must not document functionality that is only planned but not actually part of final delivery.

---

# 33. Capability U — Admin Guide Drafting

## 33.1 Objective

Generate operational guidance for administrative users where applicable.

If the project has no admin role or admin functionality, the PM may mark the document as `NOT_REQUIRED`.

AI cannot make that decision independently.

---

# 34. Capability V — Technical Documentation Drafting

## 34.1 Objective

Generate technical documentation from available technical evidence.

Potential evidence:

- architecture notes;
- API documentation;
- integrations;
- deployment notes;
- database references;
- technical decisions;
- infrastructure information.

## 34.2 Rule

If technical evidence is incomplete, the document should explicitly identify missing sections rather than fabricate implementation details.

---

# 35. Capability W — User Documentation Drafting

## 35.1 Objective

Generate broader user-facing functional documentation as required by the project.

The exact distinction between User Guide and User Documentation may vary by project.

ProjectPilot should allow document configuration.

---

# 36. Capability X — Design Documentation Drafting

## 36.1 Objective

Generate design documentation from available design evidence.

Potential evidence:

- design decisions;
- user flows;
- interface references;
- screenshots;
- linked design artifacts;
- approved UX decisions.

AI must not invent design rationale if no evidence exists.

---

# 37. Capability Y — Project Q&A

## 37.1 Objective

Allow the Project Manager to ask questions about accumulated project knowledge.

## 37.2 Example Queries

```text
What are we still waiting for from the client?
Why was Google Login added?
Which requirements are still unresolved?
What is blocking the current milestone?
What was decided in the last meeting?
Which tasks are overdue?
```

## 37.3 Retrieval Requirement

ProjectPilot must first retrieve relevant project-scoped evidence.

Gemini answers from that evidence.

## 37.4 Citation / Source Behavior

Where practical, the response should identify the supporting entity.

Examples:

```text
Requirement REQ-018
Meeting MTG-012
Decision DEC-006
Task TASK-044
Client Dependency CD-007
```

## 37.5 Missing Evidence

If evidence is unavailable:

```text
No supporting project evidence was found.
```

The model must not infer a false answer.

---

# 38. Project Q&A Answer Categories

Answers may be classified as:

```text
DIRECT_EVIDENCE
SYNTHESIS
MISSING_EVIDENCE
CONFLICTING_EVIDENCE
```

## 38.1 DIRECT_EVIDENCE

The answer is explicitly stated in a source.

## 38.2 SYNTHESIS

The answer combines multiple sources.

## 38.3 MISSING_EVIDENCE

The system lacks sufficient evidence.

## 38.4 CONFLICTING_EVIDENCE

Sources conflict and require PM review.

This classification is optional but recommended.

---

# 39. Hallucination Prevention Rules

Gemini must be instructed to:

- avoid inventing project facts;
- avoid inventing dates;
- avoid inventing owners;
- avoid inventing approvals;
- avoid inventing progress;
- avoid inventing effort estimates;
- avoid inventing technical architecture;
- avoid inventing client intent;
- avoid presenting assumptions as facts.

When uncertain, it should use language equivalent to:

```text
Unknown
Not provided
Needs clarification
Insufficient evidence
```

---

# 40. Assumption Handling

AI may identify an assumption but must label it.

Example:

```text
Potential assumption:
The client expects users to authenticate before booking.

Evidence:
Not explicitly stated.

Recommended action:
Ask a discovery question.
```

An assumption must not become a Requirement without PM review and evidence.

---

# 41. Confidence Handling

A numeric AI confidence score is not required for MVP.

If confidence is used later, it must not be treated as factual certainty.

Prefer explicit evidence-quality labels such as:

```text
EXPLICIT
INFERRED
AMBIGUOUS
MISSING
CONFLICTING
```

---

# 42. AI Evidence Quality Labels

Recommended conceptual labels:

## EXPLICIT

Directly stated by project evidence.

## INFERRED

Reasonably inferred but not directly confirmed.

## AMBIGUOUS

Evidence is unclear.

## MISSING

No relevant evidence exists.

## CONFLICTING

Multiple sources disagree.

These labels may be included in AI output contracts.

---

# 43. Source Precedence

ProjectPilot should not rely on AI alone to choose truth among conflicting sources.

However, evidence context may contain authority metadata.

Potential precedence concept:

```text
Approved Decision
Approved Requirement
Explicit Client Approval
Finalized Meeting Decision
Confirmed Client Answer
Initial Brief
AI Inference
```

The exact precedence model may be formalized later.

If conflict remains unresolved, the AI should surface it.

---

# 44. AI and Project State

AI may explain or recommend project lifecycle progression.

It must not automatically transition:

```text
DISCOVERY
→ REQUIREMENT_DEFINITION
→ PLANNING
→ ACTIVE_DELIVERY
```

Project state remains PM-controlled.

---

# 45. AI and Task State

AI may suggest:

```text
Task appears ready for QA.
```

But must not automatically change:

```text
IN_PROGRESS → QA
```

If AI extracts a task update from meeting evidence, it should create an `AISuggestion`.

---

# 46. AI and Client Dependencies

AI may detect:

> Client will provide API credentials by Friday.

It may suggest a ClientDependency with:

```text
title
owner
expected date
source
```

The PM must accept it before it becomes authoritative.

AI must not invent a due date if not explicitly provided.

---

# 47. AI and Reports

AI generates narrative from structured project data.

The report process should be:

```text
Project Data
   ↓
Deterministic Reporting Context
   ↓
Gemini
   ↓
Report Draft
   ↓
PM Review
   ↓
Final Report
```

The AI must not directly query arbitrary unrelated project data without the application controlling context.

---

# 48. AI and Final Documentation

Project documentation generation should use a defined evidence package.

Example:

```text
Document Type = FSD

Evidence Package:
- Approved Requirements
- Approved Scope
- Decisions
- User Roles
- Business Rules
- Workflow
```

AI output is then reviewed.

This is preferable to:

```text
"Write the FSD for this project"
```

with unrestricted context.

---

# 49. Long Document Generation

Large artifacts should be generated through section-aware workflows if needed.

Conceptual approach:

```text
Evidence Preparation
      ↓
Document Outline
      ↓
Section Generation
      ↓
Consistency Review
      ↓
Draft Artifact
```

The exact orchestration is deferred to Technical Architecture.

---

# 50. AI Context Minimization

AI requests should include only the context needed for the requested operation.

Benefits:

- reduces irrelevant information;
- improves accuracy;
- reduces token usage;
- reduces cross-topic contamination;
- improves auditability.

Example:

Requirement gap analysis should receive requirement-related evidence rather than the entire raw project history unless needed.

---

# 51. Context Freshness

When current project state matters, AI context must be assembled from current authoritative records.

Historical snapshots should only be used when the task explicitly concerns historical reporting or prior state.

---

# 52. AI Privacy Boundary

ProjectPilot must not intentionally send unrelated project data to Gemini.

Sensitive project information should be minimized to what the operation requires.

Detailed security and data-processing controls will be defined in Technical Architecture.

---

# 53. AI Observability

ProjectPilot should support diagnostics for AI operations.

Relevant metadata may include:

- AIRequest ID;
- operation type;
- model;
- timestamp;
- duration;
- status;
- output validation status;
- error category;
- suggestion count.

Raw prompt/response retention should be determined later based on privacy, debugging, and storage considerations.

---

# 54. AI Error Categories

Conceptual error categories may include:

```text
MODEL_UNAVAILABLE
TIMEOUT
INVALID_OUTPUT
VALIDATION_FAILED
CONTEXT_TOO_LARGE
UNSUPPORTED_INPUT
RATE_LIMITED
UNKNOWN_ERROR
```

Exact provider error mapping is deferred.

---

# 55. Retry Behavior

Retry may be allowed when failure is technical.

Examples:

- timeout;
- temporary provider error;
- malformed response.

Retry must not duplicate authoritative mutations because authoritative mutation happens only after validated output and PM action.

---

# 56. Idempotency

AI workflow design should prevent duplicate accepted entities from accidental retries.

Example:

If the same AIRequest is retried, ProjectPilot should not automatically create duplicate Requirements.

The acceptance action should be traceable to the specific AISuggestion.

---

# 57. AI Suggestion Deduplication

ProjectPilot may warn when a new suggestion appears similar to an existing authoritative entity.

Example:

```text
Suggested Requirement:
User can reset password.

Existing Requirement:
REQ-024 — Password Reset.
```

AI or deterministic comparison may identify possible duplication.

The system must not merge records automatically without PM review.

---

# 58. AI Output Language

ProjectPilot uses a mandatory language separation.

## 58.1 Development and Engineering Language

ProjectPilot's own product, architecture, implementation, prompt-contract, schema, and verification documentation is written in **English**.

AI implementation prompts may also be written in English when this improves instruction precision.

## 58.2 Default Operational Content Language

AI-generated operational project content must default to **Bahasa Indonesia**.

This includes:

- brief analysis;
- discovery questions;
- requirement titles and descriptions;
- requirement-gap explanations;
- contradiction explanations;
- meeting summaries;
- action-item descriptions;
- decision summaries;
- scope-change analysis;
- task-breakdown suggestions;
- dependency explanations;
- risk and blocker explanations;
- PM Control Center summaries;
- weekly internal reports;
- weekly client reports;
- monthly internal reports;
- monthly client reports;
- FSD drafts;
- User Guide drafts;
- Admin Guide drafts;
- Technical Documentation drafts;
- User Documentation drafts;
- Design Documentation drafts;
- handover-related generated content;
- Project Q&A answers.

## 58.3 Preserve User Language

If the Project Manager enters a brief, meeting note, or other project content in Bahasa Indonesia, Gemini must not translate it into English unless explicitly requested.

## 58.4 Explicit Language Override

A specific artifact or project may use another language only when the Project Manager explicitly requests it.

Such an override applies only to the relevant context and does not change the ProjectPilot default language policy.

## 58.5 Structured Output Language

Structured output keys and enum values may remain in English for implementation stability.

Human-readable fields must default to Bahasa Indonesia.

Example:

```json
{
  "requirement_category": "FUNCTIONAL",
  "evidence_quality": "EXPLICIT",
  "needs_clarification": true,
  "title": "Pembatalan Pemesanan",
  "description": "Pengguna dapat membatalkan pemesanan sebelum batas waktu tertentu."
}
```

## 58.6 Internal State Labels

Canonical machine values remain English, for example:

```text
IN_PROGRESS
BLOCKED
NEEDS_CLARIFICATION
```

The UI may display:

```text
Sedang Dikerjakan
Terhambat
Perlu Klarifikasi
```

This localization must not alter AI authority or data semantics.

---

# 59. AI Draft Editing

Generated reports and documents must remain editable by the PM.

The PM must be able to:

- add content;
- remove content;
- change wording;
- correct AI interpretation;
- finalize only after review.

---

# 60. AI Regeneration

The PM should be able to regenerate an AI draft.

Regeneration should not overwrite a finalized artifact.

For draft artifacts, ProjectPilot should preserve enough history to avoid accidental loss where practical.

---

# 61. AI Evidence Display

Where useful, the UI should allow the PM to inspect why AI produced a suggestion.

Example:

```text
Suggested Requirement:
Users can cancel bookings.

Based on:
- Meeting MTG-012
- Client Answer CA-034
```

Evidence display increases trust and review quality.

---

# 62. AI Suggestion Batch Review

Some operations may produce many suggestions.

Examples:

- meeting analysis;
- requirement extraction;
- task breakdown.

ProjectPilot should support efficient batch review while preserving item-level control.

Possible actions:

```text
Accept
Edit
Reject
```

per suggestion.

Bulk acceptance may be considered only if each item remains inspectable.

---

# 63. AI Task Planning Constraint

AI-generated task breakdown must be grounded in approved scope.

It should not expand the product simply because a practice is common.

Example:

If analytics are not in scope, AI must not automatically add:

```text
Implement analytics dashboard
```

without evidence.

---

# 64. AI Technical Recommendation Boundary

Gemini may suggest technical questions or options during discovery.

However, ProjectPilot should distinguish:

```text
CLIENT REQUIREMENT
vs
TECHNICAL RECOMMENDATION
```

Technical recommendations must not silently become client requirements.

---

# 65. AI Project-Type Knowledge

Gemini may use general project-management and software-delivery knowledge to identify useful discovery areas.

However, it must clearly separate:

- general best-practice suggestions;
- actual project evidence.

Example:

```text
Suggested question based on common booking-system needs:
How should booking cancellation work?

This behavior is not yet stated in project evidence.
```

---

# 66. AI Acceptance Direction by Capability

| Capability | Output Type | PM Approval Required |
|---|---|---:|
| Brief Analysis | Informational | No, unless converted to records |
| Discovery Questions | Suggestion | Yes |
| Requirement Extraction | Suggestion | Yes |
| Requirement Normalization | Suggestion/Edit Aid | Yes if authoritative |
| Gap Analysis | Informational/Suggestion | No for analysis, Yes for records |
| Contradiction Detection | Informational | No |
| Meeting Summary | Informational | No |
| Decision Extraction | Suggestion | Yes |
| Action Item Extraction | Suggestion | Yes |
| Scope Change Detection | Suggestion | Yes |
| Task Breakdown | Suggestion | Yes |
| Dependency Suggestion | Suggestion | Yes |
| Risk Suggestion | Suggestion | Yes |
| PM Control Summary | Informational | No |
| Weekly Internal Report | Draft Artifact | Finalization required |
| Weekly Client Report | Draft Artifact | Finalization required |
| Monthly Internal Report | Draft Artifact | Finalization required |
| Monthly Client Report | Draft Artifact | Finalization required |
| FSD | Draft Artifact | Finalization required |
| User Guide | Draft Artifact | Finalization required |
| Admin Guide | Draft Artifact | Finalization required |
| Technical Documentation | Draft Artifact | Finalization required |
| User Documentation | Draft Artifact | Finalization required |
| Design Documentation | Draft Artifact | Finalization required |
| Project Q&A | Informational | No |

---

# 67. Acceptance Requirements

The AI layer is correctly implemented when:

1. Gemini 3.5 Flash-Lite is the only configured AI model;
2. AI output cannot directly mutate authoritative project data;
3. AI requests are project-scoped;
4. structured outputs are validated before workflow use;
5. invalid output does not alter authoritative state;
6. requirements extracted by AI enter as suggestions;
7. AI does not invent missing client answers;
8. AI does not invent task dates;
9. AI does not invent project progress;
10. meeting analysis keeps decisions and scope changes as suggestions;
11. report generation uses deterministic project evidence;
12. client report context is explicitly controlled;
13. final reports require PM review;
14. generated documentation reflects supported project evidence;
15. Project Q&A returns missing/conflicting evidence states when necessary;
16. AI failure is visible and retryable without corrupting project data;
17. accepted suggestions remain traceable to their source AI request;
18. rejected suggestions do not create authoritative records;
19. PM can inspect supporting evidence for important suggestions;
20. AI cannot mark Project, Handover, Report, Requirement, or Task authoritative states on its own.

---

# 68. Deferred AI Decisions

The following are intentionally deferred:

- exact Gemini API configuration;
- token limits;
- temperature;
- retry count;
- timeout values;
- prompt templates;
- JSON schemas;
- multimodal upload limits;
- context-window management;
- embedding model;
- vector database;
- RAG implementation;
- prompt versioning mechanism;
- raw prompt retention;
- raw model-response retention;
- AI cost monitoring;
- rate-limit handling;
- automatic suggestion expiration rules;
- AI evaluation benchmark;
- explicit per-artifact or per-project language override UI;
- streaming responses;
- batch job implementation.

These belong in Technical Architecture or later AI implementation specifications.

---

# 69. Next Authoritative Document

The next document should be:

**ProjectPilot — Technical Architecture**

That document will define:

- application architecture;
- frontend and backend boundaries;
- database technology;
- background worker model;
- AI integration architecture;
- file and document processing;
- authentication;
- storage;
- search;
- deployment model;
- observability;
- security;
- backup and recovery;
- API boundaries;
- async workflows;
- implementation constraints.

The Technical Architecture must preserve the authority, evidence, and workflow boundaries defined in all preceding documents.
