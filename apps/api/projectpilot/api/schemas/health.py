import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class ProjectHealthMetrics(BaseModel):
    total_tasks: int = 0
    completed_tasks: int = 0
    overdue_tasks: int = 0
    blocked_tasks: int = 0
    active_blockers: int = 0
    pending_client_dependencies: int = 0
    overdue_client_dependencies: int = 0
    unresolved_issues: int = 0
    critical_issues: int = 0
    high_issues: int = 0
    pending_discovery_questions: int = 0
    pending_action_items: int = 0


class ProjectHealthResponse(BaseModel):
    project_id: uuid.UUID
    project_name: str
    project_code: str
    health_status: str  # HEALTHY, WATCH, AT_RISK, CRITICAL
    health_score: int  # 0 - 100
    progress_percentage: int
    metrics: ProjectHealthMetrics
    health_evidence: List[str]
    rules_version: str
    evaluated_at: str


class AttentionItemResponse(BaseModel):
    id: str
    project_id: str
    project_name: str
    project_code: str
    category: str  # OVERDUE_TASK, ACTIVE_BLOCKER, CLIENT_DEPENDENCY, HIGH_ISSUE
    title: str
    severity: str  # CRITICAL, HIGH, MEDIUM
    due_date: Optional[str] = None
    target_url: str


class DashboardOverviewResponse(BaseModel):
    total_projects: int
    overdue_tasks_count: int
    active_blockers_count: int
    pending_dependencies_count: int
    unresolved_high_issues_count: int
    attention_items: List[AttentionItemResponse]
    project_health_cards: List[ProjectHealthResponse]
    rules_version: str


class AIPMSummaryResponse(BaseModel):
    summary_data: Dict[str, Any]
    capability: str
    grounded_evidence_count: int
