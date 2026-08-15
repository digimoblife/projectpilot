import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from projectpilot.ai.gemini_adapter import gemini_adapter
from projectpilot.ai.prompt_registry import SYSTEM_LANGUAGE_INSTRUCTION, get_prompt
from projectpilot.api.deps import get_current_user, get_db
from projectpilot.api.schemas.health import (
    AIPMSummaryResponse,
    AttentionItemResponse,
    DashboardOverviewResponse,
    ProjectHealthResponse,
)
from projectpilot.persistence.models.project import Project
from projectpilot.persistence.models.user import User
from projectpilot.services.health_engine import (
    HEALTH_RULES_VERSION,
    compute_project_health,
    get_cross_project_attention_items,
)

router = APIRouter(tags=["PM Control Center & Project Health"])


@router.get("/dashboard/overview", response_model=DashboardOverviewResponse)
async def get_dashboard_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Fetch user's projects
    p_res = await db.execute(select(Project).order_by(Project.created_at.desc()))
    projects = p_res.scalars().all()

    health_cards: List[ProjectHealthResponse] = []
    for p in projects:
        try:
            h = await compute_project_health(p.id, db)
            health_cards.append(ProjectHealthResponse(**h))
        except Exception:
            continue

    attention_raw = await get_cross_project_attention_items(db)
    attention_items = [AttentionItemResponse(**a) for a in attention_raw]

    overdue_count = sum(1 for a in attention_items if a.category == "OVERDUE_TASK")
    blocker_count = sum(1 for a in attention_items if a.category == "ACTIVE_BLOCKER")
    dep_count = sum(1 for a in attention_items if a.category == "CLIENT_DEPENDENCY")
    high_issues_count = sum(1 for a in attention_items if a.category == "HIGH_ISSUE")

    return DashboardOverviewResponse(
        total_projects=len(projects),
        overdue_tasks_count=overdue_count,
        active_blockers_count=blocker_count,
        pending_dependencies_count=dep_count,
        unresolved_high_issues_count=high_issues_count,
        attention_items=attention_items,
        project_health_cards=health_cards,
        rules_version=HEALTH_RULES_VERSION,
    )


@router.get("/projects/{project_id}/health", response_model=ProjectHealthResponse)
async def get_project_health(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        health_data = await compute_project_health(project_id, db)
        return ProjectHealthResponse(**health_data)
    except ValueError:
        raise HTTPException(status_code=404, detail="Project not found.")


@router.post("/projects/{project_id}/health/ai-summary", response_model=AIPMSummaryResponse)
async def generate_project_pm_summary(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        health_data = await compute_project_health(project_id, db)
    except ValueError:
        raise HTTPException(status_code=404, detail="Project not found.")

    evidence_text = f"""=== PROJECT OPERATIONAL EVIDENCE ===
Project: {health_data['project_name']} ({health_data['project_code']})
Health Status: {health_data['health_status']} (Score: {health_data['health_score']}/100)
Progress: {health_data['progress_percentage']}%
Metrics:
- Total Tasks: {health_data['metrics']['total_tasks']} (Completed: {health_data['metrics']['completed_tasks']})
- Overdue Tasks: {health_data['metrics']['overdue_tasks']}
- Blocked Tasks: {health_data['metrics']['blocked_tasks']}
- Active Blockers: {health_data['metrics']['active_blockers']}
- Pending Client Dependencies: {health_data['metrics']['pending_client_dependencies']} (Overdue: {health_data['metrics']['overdue_client_dependencies']})
- Unresolved Issues: {health_data['metrics']['unresolved_issues']} (High/Critical: {health_data['metrics']['high_issues'] + health_data['metrics']['critical_issues']})

Health Evidence Reasons:
{chr(10).join(['- ' + e for e in health_data['health_evidence']])}
"""

    prompt = get_prompt("PM_DAILY_SUMMARY", evidence=evidence_text)
    result_data = await gemini_adapter.generate_structured(
        prompt=prompt,
        system_instruction=SYSTEM_LANGUAGE_INSTRUCTION,
        capability="PM_DAILY_SUMMARY",
    )

    return AIPMSummaryResponse(
        summary_data=result_data,
        capability="PM_DAILY_SUMMARY",
        grounded_evidence_count=len(health_data["health_evidence"]),
    )


@router.post("/dashboard/ai-summary", response_model=AIPMSummaryResponse)
async def generate_portfolio_pm_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p_res = await db.execute(select(Project))
    projects = p_res.scalars().all()

    health_summaries = []
    for p in projects:
        try:
            h = await compute_project_health(p.id, db)
            health_summaries.append(
                f"- {h['project_name']} ({h['project_code']}): Status {h['health_status']}, Score {h['health_score']}, Overdue: {h['metrics']['overdue_tasks']}, Blockers: {h['metrics']['active_blockers']}"
            )
        except Exception:
            continue

    attention_raw = await get_cross_project_attention_items(db)

    evidence_text = f"""=== PORTFOLIO OPERATIONAL EVIDENCE ===
Total Projects: {len(projects)}
Project Summaries:
{chr(10).join(health_summaries) if health_summaries else "Belum ada proyek aktif."}

Urgent Attention Items ({len(attention_raw)} items):
{chr(10).join(['- ' + a['title'] + ' [' + a['severity'] + ']' for a in attention_raw[:10]]) if attention_raw else "Tidak ada attention item mendesak."}
"""

    prompt = get_prompt("PORTFOLIO_PM_SUMMARY", evidence=evidence_text)
    result_data = await gemini_adapter.generate_structured(
        prompt=prompt,
        system_instruction=SYSTEM_LANGUAGE_INSTRUCTION,
        capability="PORTFOLIO_PM_SUMMARY",
    )

    return AIPMSummaryResponse(
        summary_data=result_data,
        capability="PORTFOLIO_PM_SUMMARY",
        grounded_evidence_count=len(attention_raw),
    )
