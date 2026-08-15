---
name: projectpilot-ai-guardrails
description: >-
  Rules, prompt structure, and Human Approval Gate enforcement for Gemini AI integrations in ProjectPilot.
  Use when implementing or modifying AI features, brief analysis, question generation, requirement extraction,
  meeting analysis, report drafting, document generation, and project Q&A.
---

# ProjectPilot AI Guardrails & Integration Guide

## 1. Core AI Principles
1. **Single Model**: Use only **Gemini 3.5 Flash-Lite** (`gemini-3.5-flash-lite`). Multi-provider or fallback architectures are NOT permitted.
2. **AI Suggests, PM Decides**: AI must NEVER mutate authoritative project data directly.
3. **Strict Human Approval Gate**:
   $$\text{Project Evidence} \xrightarrow{\text{Gemini API}} \text{AISuggestion (GENERATED)} \xrightarrow{\text{PM Review}} \begin{cases} \text{ACCEPT} \rightarrow \text{Authoritative Entity} \\ \text{EDIT} \rightarrow \text{Authoritative Entity (Edited)} \\ \text{REJECT} \rightarrow \text{Recorded as Rejected} \end{cases}$$
4. **Evidence Grounding**: AI must only use project-scoped evidence (Brief, Meetings, Tasks, Decisions). If evidence is missing, AI must state it is unavailable instead of inventing facts.
5. **Language Rule**: AI must generate operational project text in **Bahasa Indonesia** by default. Structured payload keys/enums remain in **English**.

---

## 2. AI Capabilities & Payload Structure
Every AI request must produce a validated, typed Pydantic schema:

| Capability | Purpose | Output Entity / Target |
| :--- | :--- | :--- |
| `BRIEF_ANALYSIS` | Extracts summary, knowns, unknowns, constraints | `BriefAnalysisPayload` $\rightarrow$ `AISuggestion` |
| `DISCOVERY_QUESTION_GEN` | Generates categorized discovery questions | `DiscoveryQuestionPayload` $\rightarrow$ `AISuggestion` |
| `REQUIREMENT_EXTRACTION` | Extracts functional & non-functional requirements | `RequirementPayload` $\rightarrow$ `AISuggestion` |
| `CONTRADICTION_DETECTION` | Identifies conflicting statements across docs | `ConflictPayload` $\rightarrow$ `AISuggestion` |
| `MEETING_ANALYSIS` | Extracts notes, decisions, and action items | `MeetingAnalysisPayload` $\rightarrow$ `AISuggestion` |
| `SCOPE_CHANGE_DETECTION` | Flags potential scope creep against baseline | `ScopeChangePayload` $\rightarrow$ `AISuggestion` |
| `REPORT_DRAFTING` | Drafts weekly/monthly internal & client reports | `ReportDraftPayload` $\rightarrow$ `Report (DRAFT)` |
| `DOCUMENT_DRAFTING` | Drafts FSD, User Guide, Technical Docs | `DocumentDraftPayload` $\rightarrow$ `GeneratedDocument` |
| `PROJECT_QA` | Answers PM natural language questions with source links | `QAPayload` (Non-authoritative answer) |

---

## 3. Asynchronous & Failure Isolation Rules
1. **Non-blocking Execution**: AI analysis on large briefs, meeting transcripts, and report generation MUST run as durable background jobs (`Job` in PostgreSQL), not in synchronous HTTP requests.
2. **Fault Tolerance**: If Gemini API fails, times out, or returns invalid JSON:
   - Authoritative project records must remain completely intact.
   - The job/request is recorded as `FAILED` with retry option.
   - Informative error message is returned to the PM without UI crash.
