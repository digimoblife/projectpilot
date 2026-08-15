# ProjectPilot — UI/UX Product Specification

**Document Type:** UI/UX Product Specification  
**Project:** ProjectPilot  
**Status:** Draft v1.0  
**Date:** 15 August 2026  
**Primary User:** Project Manager  
**Primary AI Model:** Gemini 3.5 Flash-Lite  
**Default Operational Content Language:** Bahasa Indonesia  
**Parent Documents:**  
- ProjectPilot — Product Vision & Scope  
- ProjectPilot — Product Requirements Document (PRD)  
- ProjectPilot — Workflow & State Specification  
- ProjectPilot — Information Architecture & Data Model  
- ProjectPilot — AI Functional Specification  
- ProjectPilot — Technical Architecture  

---

# 1. Purpose

This document defines the authoritative UI/UX product behavior for ProjectPilot.

It translates the approved product, workflow, data, AI, and technical architecture into an interaction model that is:

- clear;
- efficient;
- traceable;
- desktop-friendly;
- mobile-friendly;
- suitable for daily Project Manager use;
- consistent across the complete project lifecycle.

This specification defines:

- global navigation;
- page hierarchy;
- project workspace navigation;
- PM Control Center;
- Lead Management experience;
- Discovery experience;
- Requirement workspace;
- Scope and Planning;
- Task and Kanban experience;
- Timeline and Calendar;
- Team and workload views;
- Issue, Risk, Blocker, and Client Dependency management;
- Meeting Intelligence;
- AI suggestion review;
- Reporting workflows;
- document-generation workflows;
- handover experience;
- responsive/mobile behavior;
- information density;
- interaction patterns;
- accessibility;
- feedback and error behavior.

This document defines product UX behavior, not final visual branding.

---

# 2. UX Vision

ProjectPilot should feel like a **Project Manager operating system**, not a collection of unrelated CRUD screens.

The product should help the PM answer three questions quickly:

1. **What is happening?**
2. **What needs my attention?**
3. **What should happen next?**

The UI must prioritize operational clarity over decorative dashboards.

---

# 3. Core UX Principles

## 3.1 Attention Before Statistics

The first screen should prioritize actionable problems and upcoming responsibilities.

Examples:

- overdue tasks;
- blockers;
- pending client dependencies;
- pending approvals;
- requirements needing clarification;
- milestones at risk.

Charts and statistics are secondary.

---

## 3.2 Progressive Disclosure

ProjectPilot contains substantial information.

The UI should show:

```text
summary first
details second
history on demand
```

Do not display every field at once.

---

## 3.3 One Source, Multiple Views

A task displayed in Kanban, Timeline, Calendar, or List is the same Task.

The UI must not imply separate copies.

---

## 3.4 Traceability Should Be Easy to Inspect

Users should be able to navigate relationships such as:

```text
Requirement
→ Source
→ Decision
→ Feature
→ Task
```

without opening database-like screens.

---

## 3.5 AI Must Look Different From Approved Data

AI suggestions must be visually distinct from authoritative project data.

The interface should make it obvious whether content is:

```text
AI Suggestion
Draft
Approved / Authoritative
```

---

## 3.6 Mobile Is a Real Use Case

Mobile layouts must support meaningful PM work, not merely shrink desktop screens.

---

## 3.7 Editing Should Be Low-Friction

Frequent actions should require minimal navigation.

Examples:

- update task status;
- create blocker;
- record client dependency;
- approve AI suggestion;
- add project note.

---

# 4. Language Behavior

The ProjectPilot product specification and engineering documentation are written in English.

Operational UI content defaults to Bahasa Indonesia.

Example:

```text
Internal:
IN_PROGRESS

UI:
Sedang Dikerjakan
```

AI-generated project content also defaults to Bahasa Indonesia.

Technical enum values must never be exposed directly unless required for diagnostics.

---

# 5. Primary Application Navigation

Recommended desktop navigation:

```text
ProjectPilot

Dashboard
Leads
Projects
My Work
Reports
Documents
```

Utility area:

```text
Search
Notifications / Attention
Profile / Settings
```

Navigation should remain shallow.

Users should not need multiple nested menus to reach active work.

---

# 6. Mobile Global Navigation

Recommended mobile navigation prioritizes frequent operational areas.

Possible bottom navigation:

```text
Dashboard
Projects
My Work
More
```

`More` may contain:

```text
Leads
Reports
Documents
Settings
```

A global search action should remain quickly accessible.

The final form may differ, but navigation must remain reachable with one-handed use.

---

# 7. Dashboard / PM Control Center

## 7.1 Objective

Provide the PM with an actionable daily overview across active projects.

## 7.2 Primary Hierarchy

Recommended order:

```text
1. Needs Attention
2. Today / Upcoming
3. Active Projects
4. My Work
5. Recent Activity
```

## 7.3 Needs Attention

Examples:

```text
3 overdue tasks
2 blocked tasks
1 milestone at risk
2 client dependencies overdue
4 requirements need clarification
1 client approval pending
```

Each item should lead directly to the relevant filtered data.

---

# 8. Project Health Card

Each active project card may show:

```text
Project Name
Client
Lifecycle Stage
Health
Progress Summary
Current Milestone
Overdue Count
Blocked Count
Pending Client Items
Next Important Date
```

Avoid excessive metrics.

Health must link to evidence.

Example:

```text
AT RISK
Why?

- 2 critical tasks overdue
- Client API credential waiting 6 days
```

---

# 9. Dashboard Mobile Experience

Mobile should use vertically stacked cards.

Priority information:

```text
Needs Attention
Active Projects
Today's Work
Upcoming Milestones
```

Charts should not consume the top of the screen.

---

# 10. Leads List

## 10.1 Desktop

Recommended table/list fields:

```text
Lead
Client
Project Type
Status
Owner
Last Activity
Next Action
```

Filters:

```text
Status
Project Type
Owner
Source
```

## 10.2 Mobile

Use cards instead of wide tables.

Each card should show:

```text
Lead Name
Client
Status
Next Action
Last Activity
```

---

# 11. Lead Detail

Recommended sections:

```text
Overview
Client / Contact
Opportunity
Brief
Activity
```

Primary actions:

```text
Update Status
Add Brief
Schedule / Record Brief
Qualify
Mark Lost
Convert to Project
```

Conversion should be prominent when Lead is `QUALIFIED`.

---

# 12. Convert Lead to Project

Conversion should use a review step.

The PM should see:

```text
Project Name
Client
PIC
Project Type
Initial Brief
Initial Notes
```

The system should prefill data from the Lead.

The PM reviews rather than re-enters information.

---

# 13. Project Workspace Navigation

Recommended project-level navigation:

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

On smaller screens, these may live in:

- horizontal tab scroller;
- project menu drawer;
- compact section selector.

All sections must remain reachable.

---

# 14. Project Header

A persistent project context header should show:

```text
Project Name
Client
Lifecycle State
Project Health
```

Useful quick actions may include:

```text
Add Task
Record Meeting
Add Issue
Add Client Dependency
Ask ProjectPilot
```

Do not overload the header with every possible action.

---

# 15. Project Overview

Recommended sections:

## Project Summary

```text
Client
PM
Team
Start
Target Completion
Current Lifecycle Stage
```

## Health & Attention

```text
Health
Overdue
Blocked
Client Dependencies
Open Risks
```

## Milestones

Show current and upcoming milestones.

## Recent Decisions

Display latest important decisions.

## Recent Activity

Provide concise project history.

---

# 16. Discovery Workspace

The Discovery page should help the PM progress from incomplete knowledge to sufficiently defined requirements.

Recommended sections:

```text
Brief
AI Analysis
Questions
Client Answers
Open Gaps
```

---

# 17. Brief Experience

The Brief section should support:

- structured title;
- rich/Markdown text entry;
- attachments;
- source/date;
- AI analysis action.

Primary AI action:

```text
Analisis Brief
```

Generated analysis should not replace the original brief.

---

# 18. Brief AI Analysis Display

Recommended layout:

```text
AI Analysis
────────────────

Ringkasan Project

Yang Sudah Diketahui

Informasi yang Belum Jelas

Asumsi yang Terdeteksi

Area Risiko

Rekomendasi Area Discovery
```

Each inferred item should show evidence-quality indicators where useful.

---

# 19. Discovery Question Workspace

Questions should support list/grouped views by category.

Example categories:

```text
Business
Functional
Technical
UX
Security
Integration
Data
Operational
```

Each item shows:

```text
Question
Status
Category
Related Area
Answer State
```

---

# 20. AI Discovery Question Review

AI-generated questions should enter a review panel.

Example:

```text
AI Suggestion

"Apakah pengguna dapat melakukan pembatalan setelah booking dikonfirmasi?"

Reason:
Alur pembatalan belum dijelaskan pada brief.

Related Area:
Booking

[Accept] [Edit] [Reject]
```

Batch review may be available.

---

# 21. Client Answer Experience

Each discovery question should allow the PM to record:

```text
Answer
Respondent
Date
Source
Attachment
```

After saving, ProjectPilot may suggest:

```text
Generate follow-up question
Extract requirement
```

These remain explicit PM-triggered or reviewable actions.

---

# 22. Discovery Gap View

The page should clearly distinguish:

```text
Resolved
Needs Clarification
Unanswered
Conflicting
```

The PM should quickly understand what prevents discovery from progressing.

---

# 23. Requirements Workspace

Recommended layout:

```text
Requirement List
Filters
Requirement Detail
Traceability Panel
AI Suggestions
```

Filters:

```text
Status
Category
Module
Priority
Source
Needs Clarification
```

---

# 24. Requirement List

Desktop table may show:

```text
Key
Requirement
Category
Status
Priority
Source
Related Feature
```

Mobile card:

```text
REQ-018
Pembatalan Pemesanan

Functional
Needs Clarification
High
```

---

# 25. Requirement Detail

Recommended sections:

```text
Description
Business Rule
Actor
Status
Priority
Sources
Related Decisions
Scope
Features
Tasks
History
```

Traceability should be clickable.

---

# 26. Requirement Source UX

Evidence should be visible in human-friendly form.

Example:

```text
Sources

Meeting MTG-012
15 Aug 2026

Client Answer
DQ-022
```

Clicking opens contextual source detail.

---

# 27. Requirement Supersession UX

When changing an approved requirement materially:

The UI should warn:

```text
This requirement has already been approved.

Create a revised requirement and supersede the existing one?
```

The old version remains accessible.

---

# 28. Decision Log UX

Recommended list fields:

```text
Decision
Topic
Date
Decision Maker
Impact
Related Area
```

Decision detail should show:

```text
Decision
Rationale
Source
Related Requirements
Related Scope
Related Tasks
History
```

---

# 29. Scope Workspace

Recommended sections:

```text
Baseline Scope
In Scope
Out of Scope
Potential Changes
Change History
```

Scope items should be concise and traceable to Requirements.

---

# 30. Scope Change Review

AI- or PM-detected changes should have a dedicated review experience.

Example:

```text
Potential Scope Change

Original Scope:
Login with email/password.

New Request:
Login with Google.

Potential Impact:
Frontend
Backend
Security
QA
Timeline impact unknown.

Evidence:
Meeting MTG-014

[Needs Clarification]
[Accept]
[Reject]
[Not a Scope Change]
```

---

# 31. Planning Workspace

Planning should connect approved scope to delivery structure.

Recommended left-to-right hierarchy:

```text
Epic
→ Feature
→ Task
```

Desktop may use:

- hierarchical tree;
- outline;
- split pane.

Mobile should use drill-down screens.

---

# 32. AI Task Breakdown Review

Generated planning suggestions should be reviewed before insertion.

The PM should be able to:

```text
Accept selected items
Edit item
Reject item
```

Do not require acceptance of the whole generated hierarchy.

---

# 33. Task Module Views

Task module should offer:

```text
Board
List
Timeline
Calendar
```

Views operate on the same Task records.

The active filters should persist when reasonable.

---

# 34. Kanban Desktop Layout

Canonical columns:

```text
Backlog
Ready
In Progress
In Review
QA
Blocked
Done
```

Recommended interaction:

- horizontal board;
- sticky column headers;
- column task count;
- filters above board;
- card quick actions;
- drag-and-drop;
- optional compact/comfortable density.

---

# 35. Kanban Card Content

A card should not attempt to show every task field.

Recommended visible content:

```text
TASK-044
Implement Availability API

Assignee
Priority
Due Date
Milestone
Blocker indicator
Requirement link indicator
```

Optional compact labels may show:

```text
Overdue
Client Dependency
Critical
```

---

# 36. Kanban Quick Actions

From a card or card menu:

```text
Open
Change Status
Assign
Change Due Date
Add Blocker
Add Comment
```

Avoid excessive inline controls.

---

# 37. Kanban Mobile Experience

Mobile must not rely entirely on horizontal drag-and-drop.

Recommended mobile experience:

```text
Status selector
+
status-grouped task list
```

Potential pattern:

```text
[In Progress ▼]

TASK-044
TASK-051
TASK-063
```

The user can switch status group.

Task detail provides:

```text
Change Status
```

Drag-and-drop may exist but is optional on mobile.

---

# 38. Blocked Task UX

When moving a task to `BLOCKED`, immediately request:

```text
Blocker Reason *
Owner
Type
Impact
Expected Resolution
```

Do not allow a blank blocker state.

The resulting blocker should be visible from both task detail and Issues & Risks.

---

# 39. Task Detail

Recommended sections:

```text
Title / Description
Status
Assignee
Priority
Dates
Milestone
Dependencies
Related Requirement
Related Scope
Blockers
Client Dependencies
Comments
Attachments
Activity
```

Frequent fields should remain near the top.

---

# 40. Task Status Change UX

The UI should only show valid next states where practical.

Backend remains authoritative.

When reopening `DONE`, show:

```text
Reason for reopening
```

if configured/required.

---

# 41. List View

List view supports dense task management.

Recommended columns:

```text
Task
Status
Assignee
Priority
Start
Due
Milestone
Epic / Feature
```

Allow column configuration later, but avoid making this a blocker for MVP.

---

# 42. Timeline View

Timeline should show:

- Task bars;
- milestones;
- dependencies;
- overdue state;
- critical attention markers.

Changing dates may eventually be possible via drag interaction, but direct form editing is sufficient initially.

---

# 43. Timeline Mobile

Do not force a desktop Gantt into a phone viewport.

Mobile may provide:

```text
milestone-oriented schedule
date-grouped task list
compact horizontal timeline
```

Functional timeline information matters more than preserving desktop geometry.

---

# 44. Calendar View

Calendar may show:

- task starts/due dates;
- milestones;
- client dependencies;
- meetings.

Events should be visually distinguishable by type without relying solely on color.

---

# 45. My Work

My Work is a cross-project operational view.

Recommended sections:

```text
Today
Overdue
In Progress
Blocked
Upcoming
```

Filters:

```text
Project
Assignee
Priority
Status
```

For the PM-first product, My Work may also surface PM-owned follow-ups and approvals.

---

# 46. Team & Workload UX

Within a Project, team view may show:

```text
Team Member
Role
Active Tasks
Overdue
Blocked
Upcoming
```

This is workload visibility, not HR performance scoring.

---

# 47. Milestone UX

Milestone detail should show:

```text
Target Date
Status
Related Tasks
Completion
Risk Evidence
Blockers
Dependencies
```

If milestone is `AT_RISK`, the PM should be able to inspect why.

---

# 48. Issues & Risks Workspace

Recommended top-level tabs:

```text
Issues
Risks
Blockers
Client Dependencies
```

This keeps related delivery threats together while preserving entity differences.

---

# 49. Issue UX

List fields:

```text
Issue
Severity
Status
Owner
Affected Milestone
Target Resolution
```

Detail:

```text
Description
Impact
Owner
Affected Tasks
Resolution
Activity
```

---

# 50. Risk UX

List:

```text
Risk
Likelihood
Impact
Severity
Status
Owner
```

Detail:

```text
Description
Evidence
Mitigation
Affected Area
Related Issue if materialized
```

---

# 51. Blocker UX

Blockers should emphasize what cannot continue.

Recommended summary:

```text
Blocker
Affected Tasks
Owner
Age
Expected Resolution
Status
```

Old unresolved blockers should be visually prominent.

---

# 52. Client Dependency UX

This is a high-priority PM workflow.

List fields:

```text
Dependency
Requested From
Requested Date
Expected Date
Status
Affected Task/Milestone
Waiting Duration
```

Quick filters:

```text
Waiting
Overdue
Needs Follow-up
Received
```

---

# 53. Client Dependency Detail

Recommended sections:

```text
Request
Client Contact
Timeline
Impact
Affected Tasks
Affected Milestones
Follow-up Notes
Evidence
```

The UI must avoid blame-oriented language.

Prefer:

```text
Waiting for client dependency
```

rather than:

```text
Client caused delay
```

unless the report wording is explicitly authored that way.

---

# 54. Meeting List

Recommended fields:

```text
Meeting
Date
Type
Participants
Status
AI Analysis Status
```

Primary action:

```text
Record Meeting
```

---

# 55. Meeting Detail

Recommended layout:

```text
Meeting Information
Notes / Transcript
Attachments
AI Summary
Suggestions
Action Items
Decisions
Follow-ups
```

---

# 56. Meeting AI Analysis UX

After analysis:

```text
Ringkasan
Key Discussion
Detected Decisions
Suggested Requirements
Suggested Action Items
Potential Scope Changes
Risks / Blockers
Follow-up Questions
```

Each authoritative candidate must be reviewable.

---

# 57. AI Suggestion Component

All AI suggestions should use a consistent UI component.

Required visual elements:

```text
AI-generated indicator
Suggestion type
Suggested content
Evidence
Why suggested
[Accept] [Edit] [Reject]
```

Optional:

```text
Evidence quality
Related entity
```

---

# 58. AI Suggestion Visual Hierarchy

AI content must not look identical to approved project data.

Recommended styling distinction:

- AI badge/icon;
- separate card background or border;
- clear review actions;
- status label.

Do not use alarming visual treatment unless the content itself is risky.

---

# 59. AI Batch Review

For multiple suggestions, provide:

```text
Review individually
Accept selected
Reject selected
```

Bulk actions must show selection clearly.

Do not provide blind "Accept All" without visibility into the items.

---

# 60. AI Failure UX

If an AI operation fails:

Show:

```text
Analysis could not be completed.

Your project data has not been changed.

[Retry]
```

Do not expose raw provider errors in the main UI.

Diagnostics may be available separately.

---

# 61. AI Processing UX

Long-running jobs should have states such as:

```text
Queued
Analyzing
Completed
Failed
```

The UI should remain usable while analysis runs.

Do not block the whole project page.

---

# 62. Ask ProjectPilot / Project Q&A

Each project should offer a conversational query entry point.

Example:

```text
Ask about this project...
```

Suggested prompts:

```text
Apa yang masih menunggu dari klien?
Apa blocker terbesar saat ini?
Requirement mana yang belum selesai?
Apa keputusan terakhir terkait login?
```

---

# 63. Project Q&A Answer UX

Answer should contain:

```text
Answer
Evidence / Sources
Related Records
```

Example:

```text
Saat ini terdapat dua item yang masih menunggu dari klien...

Sources:
CD-007 — API Credential
Meeting MTG-014
```

---

# 64. Q&A Missing Evidence UX

If no evidence exists:

```text
Saya belum menemukan bukti project yang cukup untuk menjawab pertanyaan ini.
```

Optionally suggest:

```text
Record missing information
Create discovery question
```

---

# 65. Reporting Workspace

Project-level Reports page should show:

```text
Weekly Internal
Weekly Client
Monthly Internal
Monthly Client
```

Recommended list fields:

```text
Period
Type
Status
Version
Last Updated
```

---

# 66. Weekly Internal Report Flow

Recommended UX:

```text
Select Reporting Period
      ↓
Preview Evidence
      ↓
Generate Draft
      ↓
Edit
      ↓
Review
      ↓
Finalize
```

The evidence preview is important.

The PM should understand what data is being summarized.

---

# 67. Internal Report Editor

Recommended sections can be prestructured:

```text
Executive Summary
Project Health
Progress
Completed Work
In Progress
Delayed Work
Issues & Blockers
Risks
Client Dependencies
Scope Changes
Management Attention
Next Week
```

The PM can edit any generated text.

---

# 68. Client Report Flow

The client report flow should begin only after internal review.

Recommended:

```text
Internal Report Reviewed
      ↓
Select Client-Visible Context
      ↓
Generate Client Draft
      ↓
Edit
      ↓
Finalize
```

---

# 69. Client-Visible Context Review

Before generation, allow the PM to include/exclude source items.

Example:

```text
Include:
✓ Completed milestones
✓ Client dependency CD-007
✓ Next-week plan

Exclude:
✗ Internal staffing concern
✗ Internal estimation issue
```

This should be controlled by the PM, not AI.

---

# 70. Monthly Report UX

Monthly reports should show trends.

Possible visual elements:

```text
Milestone progress
Task completion trend
Issue/risk trend
Scope changes
```

Narrative remains primary.

Avoid turning the monthly report into a BI dashboard.

---

# 71. Reports Global View

Top-level Reports may show reports across all projects.

Filters:

```text
Project
Type
Period
Status
```

---

# 72. Documents Workspace

Project Documents should group:

```text
FSD
User Guide
Admin Guide
Technical Documentation
User Documentation
Design Documentation
Other Attachments
```

Each generated document should show:

```text
Status
Version
Last Updated
Evidence Coverage
```

---

# 73. Document Generation Flow

Recommended:

```text
Select Document Type
      ↓
Review Evidence Package
      ↓
Generate Draft
      ↓
Edit
      ↓
Review
      ↓
Finalize
      ↓
Export
```

---

# 74. Evidence Coverage UX

Before generating a document, ProjectPilot should indicate whether sufficient evidence exists.

Example:

```text
FSD Evidence

Approved Requirements: 32
Scope Items: 18
Decisions: 9
Missing:
- Permission matrix incomplete
```

This helps avoid low-quality generated artifacts.

---

# 75. Document Editor

The document editor should support:

- structured headings;
- Markdown/rich-text editing;
- autosave;
- revision history;
- evidence references where useful.

The PM should never be forced to accept AI wording.

---

# 76. Document Finalization

Finalization should be explicit.

After `FINAL`, editing should create a revision or new version rather than silently modifying the final artifact.

---

# 77. Export UX

Export options should be available after sufficient content exists.

Formats are defined later.

The UI should distinguish:

```text
Editable ProjectPilot Content
vs
Exported File
```

---

# 78. Handover Workspace

Recommended sections:

```text
Handover Status
Checklist
Documentation
Acceptance
Credentials / Assets
Notes
```

---

# 79. Handover Checklist UX

Checklist item shows:

```text
Title
Required
Status
Owner
Related Document / Attachment
```

Statuses:

```text
Pending
In Progress
Completed
Waived
Not Applicable
Blocked
```

---

# 80. Handover Waiver UX

`Waived` requires:

```text
Reason
PM confirmation
```

The interface should make waived items visibly distinct from completed items.

---

# 81. Project Completion UX

When the PM attempts:

```text
Mark Project Completed
```

the system should run the completion gate.

If blocked:

```text
Project cannot be completed yet.

Required items:
- Technical Documentation is still Draft
- Client Acceptance is Pending
```

The PM should receive direct navigation to unresolved items.

---

# 82. Global Search UX

Search should locate:

```text
Projects
Leads
Requirements
Tasks
Decisions
Meetings
Issues
Reports
Documents
```

Results should be grouped by entity type.

Each result should show enough project context to avoid ambiguity.

---

# 83. Global Quick Create

A global create action may support:

```text
New Lead
New Project
New Task
Record Meeting
```

Context-sensitive actions are preferred.

If currently inside a Project, `New Task` should automatically use that Project context.

---

# 84. Notifications / Attention Center

If implemented, the attention center should prioritize actionable signals:

```text
Task overdue
Task blocked
Client dependency overdue
Pending approval
AI analysis completed
Report ready for review
```

Avoid low-value notification spam.

---

# 85. Empty States

Every major module should have meaningful empty-state guidance.

Example:

```text
No discovery questions yet.

Add questions manually or generate suggestions from the project brief.
```

Empty states should teach the workflow.

---

# 86. Loading States

For normal CRUD, use lightweight skeleton/loading states.

For background AI work, show explicit job status rather than indefinite spinners.

---

# 87. Error States

Errors should communicate:

```text
What failed
Whether data was saved
What the user can do next
```

Example:

```text
The AI analysis failed, but your meeting notes were saved successfully.

[Retry Analysis]
```

---

# 88. Confirmation Dialogs

Use confirmation dialogs only for meaningful or destructive actions.

Examples:

- Cancel Project;
- Reject Scope Change;
- Supersede Requirement;
- Finalize Report;
- Mark Document Not Required;
- Complete Handover.

Do not confirm every routine task update.

---

# 89. Undo Behavior

Where technically safe, provide undo for lightweight reversible actions.

Example:

```text
Task moved to In Review.
Undo
```

Backend transition rules still apply.

Do not use undo as a substitute for explicit confirmation on high-impact actions.

---

# 90. Information Density

ProjectPilot is an operational tool, so desktop screens may be moderately dense.

However:

- avoid tiny text;
- avoid hidden critical status;
- maintain clear grouping;
- use whitespace strategically;
- keep primary actions visible.

Mobile density should be lower.

---

# 91. Tables

Desktop tables are appropriate for:

- Requirements;
- Tasks;
- Issues;
- Reports;
- Documents;
- Leads.

Tables should support:

- sorting;
- filtering;
- pagination/infinite loading where appropriate;
- row detail access.

---

# 92. Mobile Table Transformation

Wide tables should transform into:

- cards;
- stacked rows;
- summary + detail screens.

Do not force horizontal scrolling for primary workflows.

Some complex comparison views may allow controlled horizontal scrolling if unavoidable, but this should be exceptional.

---

# 93. Drawers vs Modals

Use drawers for contextual detail that benefits from retaining the underlying screen.

Examples:

- Task quick detail;
- Requirement quick detail;
- AI suggestion review.

Use modals for short focused actions:

- change status;
- add blocker;
- confirm finalization.

Use full pages for complex editing.

---

# 94. Desktop Split-View Patterns

Useful candidates:

- Requirements list + detail;
- Planning tree + detail;
- AI suggestion list + evidence;
- Documents list + preview.

Split view should collapse cleanly on mobile.

---

# 95. Form Design

Forms should:

- group related fields;
- distinguish required and optional fields;
- use meaningful defaults;
- avoid excessively long single-page forms;
- support save draft where needed.

---

# 96. Date Handling UX

Dates should be displayed using a consistent user-friendly format.

Operational date and time should follow the configured user timezone.

Avoid ambiguous formats such as:

```text
08/09/26
```

Prefer clear localized formats.

---

# 97. Status Labels

Status labels should be consistent across the application.

The same Task state should look and read the same in:

- Kanban;
- List;
- Task detail;
- Timeline;
- Reports.

Do not invent module-specific synonyms for the same state.

---

# 98. Color Usage

Color may reinforce status, but status must not depend on color alone.

Use:

- text labels;
- icons;
- shapes/badges;
- accessible contrast.

---

# 99. Accessibility

ProjectPilot should target practical accessibility.

Requirements include:

- keyboard-accessible controls;
- meaningful focus states;
- form labels;
- sufficient contrast;
- screen-reader-friendly interactive labels;
- no color-only state communication;
- accessible modal/drawer focus handling.

---

# 100. Keyboard Productivity

Desktop PM workflows benefit from keyboard support.

Potential shortcuts may later include:

```text
Search
New Task
Quick Create
Close Drawer
Navigate Board
```

Keyboard shortcuts are desirable but not MVP-blocking.

---

# 101. Responsive Breakpoint Philosophy

Do not design only for fixed device widths.

Layouts should adapt based on available space.

Conceptual modes:

```text
Mobile
Tablet / Compact Desktop
Desktop
Wide Desktop
```

The final breakpoint values belong to implementation.

---

# 102. Mobile Priority Matrix

The following workflows are **high priority** on mobile:

```text
View Project Health
View Attention Items
View My Work
Update Task Status
Open Task
Create Blocker
Record Client Dependency
Record Quick Meeting Notes
Review AI Suggestion
Read Report
Approve/Edit/Reject Suggestion
```

Medium priority:

```text
Edit Requirements
Review Timeline
Create Reports
```

Heavy document authoring may remain more comfortable on desktop, but must still be readable and minimally editable on mobile.

---

# 103. Desktop Priority Matrix

Desktop is optimized for:

```text
Discovery
Requirement management
Planning
Kanban
Timeline
Bulk task management
Report editing
Document editing
Traceability analysis
```

---

# 104. AI Trust UX

ProjectPilot should build trust through:

- evidence display;
- clear suggestion labeling;
- no hidden automatic mutations;
- visible failure behavior;
- editability;
- traceable accepted suggestions.

Avoid presenting AI with human-like authority.

---

# 105. Audit History UX

Activity history should be accessible from relevant entity details.

Example:

```text
15 Aug
Status changed:
In Progress → Blocked
by Cahyo

Reason:
Waiting for API credential
```

History should be readable, not raw JSON.

---

# 106. Archived / Historical Records

Archived or terminal records should remain discoverable without cluttering active views.

Examples:

- completed projects;
- lost leads;
- cancelled tasks;
- superseded reports.

Archive is a visibility concern, not a state replacement.

---

# 107. First-Time Use

Initial onboarding should remain lightweight.

Potential first-run flow:

```text
Welcome
      ↓
Create First Client / Lead
      ↓
Create or Convert Project
```

Do not require lengthy setup before the PM can use the product.

---

# 108. Settings

Potential settings:

```text
Profile
Default Timezone
Default Operational Language
AI Configuration Status
File Storage Status
Project Defaults
```

The default operational language should initially be Bahasa Indonesia.

---

# 109. Destructive Actions

Hard deletion should not be prominent for historical project records.

Prefer workflow states such as:

```text
Cancelled
Rejected
Superseded
Archived
```

If hard deletion exists for drafts, clearly communicate irreversibility.

---

# 110. Client-Facing Content Preview

Before finalizing a client report or handover artifact, the PM should be able to preview the exact client-facing content.

Internal notes must not appear accidentally.

---

# 111. AI-Generated Content Indicators in Final Artifacts

Final reports/documents do not need to expose an "AI-generated" label to the client unless product policy later requires it.

Within ProjectPilot, generation history should remain traceable.

---

# 112. Cross-Project Context Safety

When navigating from Dashboard or My Work into an entity, the target Project context must be obvious.

Task cards should display project name in cross-project views.

---

# 113. Navigation Breadcrumbs

Breadcrumbs may be used for deeper pages.

Example:

```text
Projects
/ Booking Platform
/ Requirements
/ REQ-018
```

On mobile, use compact back navigation.

---

# 114. Project Lifecycle UX

The current lifecycle stage should be visible on Project Overview.

Possible presentation:

```text
Discovery
→ Requirements
→ Planning
→ Approval
→ Active Delivery
→ Handover
→ Completed
```

Do not treat this as a clickable wizard that bypasses transition rules.

State changes require valid actions.

---

# 115. Lifecycle Transition UX

When changing Project stage, show relevant readiness information.

Example:

```text
Move to Planning?

Current unresolved:
- 3 requirements need clarification
- 1 discovery question unanswered

You may still proceed if appropriate.

[Cancel] [Continue]
```

Only hard product gates should prevent progression.

Soft warnings should not become arbitrary blockers.

---

# 116. Approval UX

Structured approvals should show:

```text
Approval Type
Target
Approved By
Date
Evidence
```

Where client approval is recorded manually, the PM should be able to attach or reference evidence.

---

# 117. Project Creation UX

A project may originate from:

```text
Converted Lead
or
Direct Project Creation
```

Direct creation should remain available for work that bypasses a formal Lead phase.

This must not break lifecycle integrity.

A directly created Project starts at an appropriate initial lifecycle state, normally `DISCOVERY`.

---

# 118. Task Creation UX

Task creation should support two modes:

## Quick Create

Minimal fields:

```text
Title
Status
Assignee
Due Date
```

## Full Create

Full task metadata.

This reduces friction for daily work.

---

# 119. Meeting Quick Capture

The PM should be able to record rough meeting notes quickly.

Suggested flow:

```text
Record Meeting
→ Title
→ Date
→ Participants
→ Notes
→ Save
```

AI analysis can be triggered after saving.

Do not require structured decisions before the meeting can be recorded.

---

# 120. Quick Notes

A lightweight Project note feature may be useful for capturing temporary operational information.

However, Quick Notes must not become a substitute for:

- Requirements;
- Decisions;
- Tasks;
- Client Dependencies.

Important notes should later be converted or linked when needed.

This capability is optional for initial implementation.

---

# 121. Success UX Metrics

ProjectPilot UX should aim to reduce the time required to:

- locate current project status;
- identify overdue work;
- identify client dependencies;
- update task status;
- review AI suggestions;
- prepare weekly reports;
- trace a requirement to implementation;
- prepare handover documentation.

Exact analytics instrumentation is deferred.

---

# 122. UX Acceptance Criteria

The UI/UX implementation is acceptable when:

1. the PM can reach any active Project in a small number of actions;
2. Dashboard surfaces actionable attention items before decorative metrics;
3. every Project exposes the complete lifecycle workspace;
4. Kanban uses authoritative Task states;
5. mobile users can update Task status without relying on drag-and-drop;
6. moving a Task to Blocked requires blocker context;
7. Requirements expose source evidence and delivery traceability;
8. AI suggestions are visually distinct from authoritative data;
9. AI suggestions support Accept, Edit, and Reject;
10. AI failures clearly state that authoritative data was not changed;
11. client dependencies are easy to identify and follow up;
12. Meeting analysis suggestions are individually reviewable;
13. Internal Reports precede Client Report finalization;
14. Client Report generation uses a PM-controlled client-visible context;
15. generated Documents remain editable before finalization;
16. Handover prevents Project completion when mandatory items remain unresolved;
17. wide desktop tables transform into usable mobile layouts;
18. operational content is shown in Bahasa Indonesia by default;
19. internal enum values are not exposed as raw machine labels in normal UX;
20. Project Q&A displays supporting evidence or explicitly states insufficient evidence;
21. all critical status information remains understandable without color alone;
22. historical/superseded records remain accessible;
23. task state is consistent across Board, List, Timeline, Calendar, and detail views;
24. critical mobile monitoring workflows do not require desktop mode or horizontal scrolling;
25. PM can preview client-facing content before finalization.

---

# 123. Deferred UI/UX Decisions

The following remain intentionally deferred:

- final visual identity;
- color palette;
- typography;
- exact icon set;
- final component library;
- exact navigation styling;
- exact mobile bottom-navigation composition;
- exact breakpoint values;
- drag-and-drop library;
- chart library;
- rich-text/Markdown editor;
- exact table library;
- animation/motion system;
- keyboard shortcut set;
- customizable dashboards;
- user-configurable Kanban workflows;
- advanced dashboard widgets;
- direct client portal UX;
- direct team-member portal UX;
- notification channel settings.

These decisions must preserve the behavior defined in this specification.

---

# 124. Recommended Screen Inventory

Initial screen inventory:

```text
Authentication
Dashboard

Leads
Lead Detail
Lead Conversion

Projects
Project Overview

Project Discovery
Brief Detail
Discovery Questions
Client Answer Detail

Requirements
Requirement Detail
Decision Log
Scope
Scope Change Review

Planning
Tasks — Board
Tasks — List
Timeline
Calendar
Task Detail

Team / Workload

Issues
Risks
Blockers
Client Dependencies

Meetings
Meeting Detail
AI Suggestion Review

Reports
Report Detail / Editor

Documents
Document Detail / Editor

Handover

Project Q&A

Global Search
Settings
```

Some details may use drawers instead of dedicated routes.

---

# 125. Recommended Project Workspace Hierarchy

```text
Project
│
├── Overview
│
├── Discovery
│   ├── Brief
│   ├── Questions
│   ├── Answers
│   └── Gaps
│
├── Requirements
│   ├── Requirements
│   └── Decisions
│
├── Scope
│
├── Planning
│
├── Tasks
│   ├── Board
│   └── List
│
├── Timeline
│   └── Calendar
│
├── Meetings
│
├── Issues & Risks
│   ├── Issues
│   ├── Risks
│   ├── Blockers
│   └── Client Dependencies
│
├── Reports
│
├── Documents
│
└── Handover
```

---

# 126. Recommended Design Sequence

When visual design begins, design should proceed in this order:

```text
1. Global App Shell
2. Dashboard / PM Control Center
3. Project Workspace Shell
4. Tasks + Kanban
5. Task Detail
6. Discovery
7. Requirements
8. Issues / Risks / Client Dependencies
9. Meetings + AI Review
10. Reports
11. Documents
12. Handover
13. Leads
14. Remaining utility screens
15. Full mobile audit
```

This order prioritizes the highest-frequency operational workflows.

---

# 127. Next Authoritative Document

The next document should be:

**ProjectPilot — Detailed Implementation Task Plan**

That document will convert documents 1–7 into a phased implementation sequence with:

- foundations;
- dependencies;
- module order;
- implementation tasks;
- integration gates;
- testing requirements;
- AI integration timing;
- deployment readiness;
- explicit completion criteria.

The implementation plan must not reduce or reinterpret the product scope defined in the authoritative documents.
