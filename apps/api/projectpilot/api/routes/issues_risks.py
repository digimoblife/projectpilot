import uuid
from datetime import date, datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from projectpilot.api.deps import get_current_pm, get_db
from projectpilot.api.schemas.issues_risks import (
    BlockerCreate,
    BlockerResponse,
    BlockerStatusUpdate,
    ClientDependencyCreate,
    ClientDependencyResponse,
    ClientDependencyStatusUpdate,
    ClientDependencyUpdate,
    IssueCreate,
    IssueResponse,
    IssueStatusUpdate,
    IssueUpdate,
    RiskCreate,
    RiskResponse,
    RiskStatusUpdate,
    RiskUpdate,
)
from projectpilot.persistence.base import utc_now
from projectpilot.persistence.models.activity import ActivityEvent
from projectpilot.persistence.models.issues_risks import (
    Blocker,
    BlockerStatus,
    ClientDependency,
    ClientDependencyStatus,
    Issue,
    IssueStatus,
    Risk,
    RiskStatus,
)
from projectpilot.persistence.models.planning_tasks import Task, TaskStatus
from projectpilot.persistence.models.user import User
from projectpilot.services.task_service import TaskService

router = APIRouter(prefix="/projects/{project_id}", tags=["Issues, Risks & Blockers"])


# =========================================================================
# 1. ISSUES ENDPOINTS
# =========================================================================
@router.get("/issues", response_model=List[IssueResponse])
async def list_issues(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(Issue)
        .where(Issue.project_id == project_id)
        .order_by(Issue.created_at.desc())
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/issues", response_model=IssueResponse, status_code=status.HTTP_201_CREATED)
async def create_issue(
    project_id: uuid.UUID,
    issue_in: IssueCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    issue = Issue(
        project_id=project_id,
        source_risk_id=issue_in.source_risk_id,
        key=issue_in.key,
        title=issue_in.title,
        description=issue_in.description,
        severity=issue_in.severity or "MEDIUM",
        status=IssueStatus.OPEN,
    )
    db.add(issue)

    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="ISSUE_CREATED",
        description=f"Issue '{issue.key}: {issue.title}' dilaporkan dengan severity {issue.severity}.",
        event_metadata={"key": issue.key, "severity": issue.severity},
    )
    db.add(activity)

    await db.commit()
    await db.refresh(issue)
    return issue


@router.put("/issues/{issue_id}", response_model=IssueResponse)
async def update_issue(
    project_id: uuid.UUID,
    issue_id: uuid.UUID,
    issue_in: IssueUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(Issue).where(Issue.id == issue_id, Issue.project_id == project_id)
    res = await db.execute(query)
    issue = res.scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found.")

    update_data = issue_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(issue, field, value)

    await db.commit()
    await db.refresh(issue)
    return issue


@router.post("/issues/{issue_id}/status", response_model=IssueResponse)
async def update_issue_status(
    project_id: uuid.UUID,
    issue_id: uuid.UUID,
    status_in: IssueStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(Issue).where(Issue.id == issue_id, Issue.project_id == project_id)
    res = await db.execute(query)
    issue = res.scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found.")

    issue.status = status_in.target_status
    if status_in.resolution_notes:
        issue.resolution_notes = status_in.resolution_notes

    if status_in.target_status in [IssueStatus.RESOLVED, IssueStatus.CLOSED]:
        issue.resolved_at = utc_now()

    await db.commit()
    await db.refresh(issue)
    return issue


# =========================================================================
# 2. RISKS ENDPOINTS & MATERIALIZATION
# =========================================================================
@router.get("/risks", response_model=List[RiskResponse])
async def list_risks(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(Risk)
        .where(Risk.project_id == project_id)
        .order_by(Risk.created_at.desc())
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/risks", response_model=RiskResponse, status_code=status.HTTP_201_CREATED)
async def create_risk(
    project_id: uuid.UUID,
    risk_in: RiskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    risk = Risk(
        project_id=project_id,
        key=risk_in.key,
        title=risk_in.title,
        description=risk_in.description,
        probability=risk_in.probability or "MEDIUM",
        impact=risk_in.impact or "MEDIUM",
        mitigation_plan=risk_in.mitigation_plan,
        status=RiskStatus.IDENTIFIED,
    )
    db.add(risk)

    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="RISK_CREATED",
        description=f"Risk '{risk.key}: {risk.title}' diidentifikasi (Probabilitas: {risk.probability}, Dampak: {risk.impact}).",
        event_metadata={"key": risk.key},
    )
    db.add(activity)

    await db.commit()
    await db.refresh(risk)
    return risk


@router.put("/risks/{risk_id}", response_model=RiskResponse)
async def update_risk(
    project_id: uuid.UUID,
    risk_id: uuid.UUID,
    risk_in: RiskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(Risk).where(Risk.id == risk_id, Risk.project_id == project_id)
    res = await db.execute(query)
    risk = res.scalar_one_or_none()
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found.")

    update_data = risk_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(risk, field, value)

    await db.commit()
    await db.refresh(risk)
    return risk


@router.post("/risks/{risk_id}/status", response_model=RiskResponse)
async def update_risk_status(
    project_id: uuid.UUID,
    risk_id: uuid.UUID,
    status_in: RiskStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(Risk).where(Risk.id == risk_id, Risk.project_id == project_id)
    res = await db.execute(query)
    risk = res.scalar_one_or_none()
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found.")

    risk.status = status_in.target_status
    await db.commit()
    await db.refresh(risk)
    return risk


@router.post("/risks/{risk_id}/materialize", response_model=IssueResponse)
async def materialize_risk_to_issue(
    project_id: uuid.UUID,
    risk_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(Risk).where(Risk.id == risk_id, Risk.project_id == project_id)
    res = await db.execute(query)
    risk = res.scalar_one_or_none()
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found.")

    if risk.status == RiskStatus.MATERIALIZED:
        raise HTTPException(status_code=400, detail="Risk has already materialized into an issue.")

    # Calculate severity based on Risk impact
    severity_map = {"HIGH": "CRITICAL", "MEDIUM": "HIGH", "LOW": "MEDIUM"}
    issue_severity = severity_map.get(risk.impact, "HIGH")

    # Fetch total issues to generate key
    issues_query = select(Issue).where(Issue.project_id == project_id)
    issues_res = await db.execute(issues_query)
    issues_count = len(issues_res.scalars().all())
    issue_key = f"ISS-{issues_count + 1}".rjust(7, "0")

    # Create Materialized Issue
    issue = Issue(
        project_id=project_id,
        source_risk_id=risk.id,
        key=issue_key,
        title=f"[Materialized] {risk.title}",
        description=f"Materialized dari Risk {risk.key}.\n\nDeskripsi Awal:\n{risk.description or 'N/A'}\n\nRencana Mitigasi Awal:\n{risk.mitigation_plan or 'N/A'}",
        severity=issue_severity,
        status=IssueStatus.OPEN,
    )
    db.add(issue)
    await db.flush()

    # Update Risk Status & Link
    risk.status = RiskStatus.MATERIALIZED
    risk.materialized_issue_id = issue.id

    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="RISK_MATERIALIZED",
        description=f"Risk '{risk.key}' telah termaterialisasi menjadi Issue '{issue.key}'.",
        event_metadata={"risk_key": risk.key, "issue_key": issue.key},
    )
    db.add(activity)

    await db.commit()
    await db.refresh(issue)
    return issue


# =========================================================================
# 3. BLOCKERS ENDPOINTS
# =========================================================================
@router.get("/blockers", response_model=List[BlockerResponse])
async def list_blockers(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(Blocker)
        .where(Blocker.project_id == project_id)
        .order_by(Blocker.created_at.desc())
    )
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/blockers", response_model=BlockerResponse, status_code=status.HTTP_201_CREATED)
async def create_blocker(
    project_id: uuid.UUID,
    blocker_in: BlockerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    return await TaskService.create_blocker(
        project_id=project_id,
        blocker_in=blocker_in,
        db=db,
        current_user_id=current_user.id,
    )


@router.post("/blockers/{blocker_id}/status", response_model=BlockerResponse)
async def update_blocker_status(
    project_id: uuid.UUID,
    blocker_id: uuid.UUID,
    status_in: BlockerStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(Blocker).where(Blocker.id == blocker_id, Blocker.project_id == project_id)
    res = await db.execute(query)
    blocker = res.scalar_one_or_none()
    if not blocker:
        raise HTTPException(status_code=404, detail="Blocker not found.")

    blocker.status = status_in.target_status
    if status_in.resolution_notes:
        blocker.resolution_notes = status_in.resolution_notes

    if status_in.target_status == BlockerStatus.RESOLVED:
        blocker.resolved_at = utc_now()

    await db.commit()
    await db.refresh(blocker)
    return blocker


# =========================================================================
# 4. CLIENT DEPENDENCIES ENDPOINTS (WAITING MATRIX)
# =========================================================================
@router.get("/client-dependencies", response_model=List[ClientDependencyResponse])
async def list_client_dependencies(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(ClientDependency)
        .where(ClientDependency.project_id == project_id)
        .order_by(ClientDependency.requested_date.asc())
    )
    result = await db.execute(query)
    deps = result.scalars().all()

    today = date.today()
    response_list = []
    for d in deps:
        # Calculate derived waiting days
        end_date = d.provided_date or today
        waiting_days = max(0, (end_date - d.requested_date).days)
        is_overdue = d.status not in [ClientDependencyStatus.PROVIDED, ClientDependencyStatus.CANCELLED] and today > d.expected_date

        res_item = ClientDependencyResponse(
            id=d.id,
            project_id=d.project_id,
            task_id=d.task_id,
            milestone_id=d.milestone_id,
            blocker_id=d.blocker_id,
            key=d.key,
            title=d.title,
            description=d.description,
            dependency_type=d.dependency_type,
            status=d.status,
            requested_date=d.requested_date,
            expected_date=d.expected_date,
            provided_date=d.provided_date,
            provided_data=d.provided_data,
            receipt_notes=d.receipt_notes,
            impact_summary=d.impact_summary,
            waiting_days=waiting_days,
            is_overdue=is_overdue,
            created_at=d.created_at,
            updated_at=d.updated_at,
        )
        response_list.append(res_item)

    return response_list


@router.post(
    "/client-dependencies",
    response_model=ClientDependencyResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_client_dependency(
    project_id: uuid.UUID,
    dep_in: ClientDependencyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    dependency = ClientDependency(
        project_id=project_id,
        task_id=dep_in.task_id,
        milestone_id=dep_in.milestone_id,
        blocker_id=dep_in.blocker_id,
        key=dep_in.key,
        title=dep_in.title,
        description=dep_in.description,
        dependency_type=dep_in.dependency_type or "CREDENTIALS",
        requested_date=dep_in.requested_date,
        expected_date=dep_in.expected_date,
        impact_summary=dep_in.impact_summary,
        provided_data=dep_in.provided_data,
        receipt_notes=dep_in.receipt_notes,
        status=ClientDependencyStatus.REQUESTED,
    )
    db.add(dependency)

    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="CLIENT_DEPENDENCY_REQUESTED",
        description=f"Dependensi Klien '{dependency.key}: {dependency.title}' diajukan dengan target {dependency.expected_date}.",
        event_metadata={"key": dependency.key},
    )
    db.add(activity)

    await db.commit()
    await db.refresh(dependency)

    today = date.today()
    waiting_days = max(0, (today - dependency.requested_date).days)
    is_overdue = today > dependency.expected_date

    return ClientDependencyResponse(
        id=dependency.id,
        project_id=dependency.project_id,
        task_id=dependency.task_id,
        milestone_id=dependency.milestone_id,
        blocker_id=dependency.blocker_id,
        key=dependency.key,
        title=dependency.title,
        description=dependency.description,
        dependency_type=dependency.dependency_type,
        status=dependency.status,
        requested_date=dependency.requested_date,
        expected_date=dependency.expected_date,
        provided_date=dependency.provided_date,
        provided_data=dependency.provided_data,
        receipt_notes=dependency.receipt_notes,
        impact_summary=dependency.impact_summary,
        waiting_days=waiting_days,
        is_overdue=is_overdue,
        created_at=dependency.created_at,
        updated_at=dependency.updated_at,
    )


@router.put(
    "/client-dependencies/{dep_id}",
    response_model=ClientDependencyResponse,
)
async def update_client_dependency(
    project_id: uuid.UUID,
    dep_id: uuid.UUID,
    dep_in: ClientDependencyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(ClientDependency).where(
        ClientDependency.id == dep_id, ClientDependency.project_id == project_id
    )
    res = await db.execute(query)
    dependency = res.scalar_one_or_none()
    if not dependency:
        raise HTTPException(status_code=404, detail="Client dependency not found.")

    if dep_in.title is not None:
        dependency.title = dep_in.title
    if dep_in.description is not None:
        dependency.description = dep_in.description
    if dep_in.dependency_type is not None:
        dependency.dependency_type = dep_in.dependency_type
    if dep_in.expected_date is not None:
        dependency.expected_date = dep_in.expected_date
    if dep_in.impact_summary is not None:
        dependency.impact_summary = dep_in.impact_summary
    if dep_in.provided_data is not None:
        dependency.provided_data = dep_in.provided_data
    if dep_in.receipt_notes is not None:
        dependency.receipt_notes = dep_in.receipt_notes
    if dep_in.provided_date is not None:
        dependency.provided_date = dep_in.provided_date

    await db.commit()
    await db.refresh(dependency)

    today = date.today()
    end_date = dependency.provided_date or today
    waiting_days = max(0, (end_date - dependency.requested_date).days)
    is_overdue = (
        dependency.status not in [ClientDependencyStatus.PROVIDED, ClientDependencyStatus.CANCELLED]
        and today > dependency.expected_date
    )

    return ClientDependencyResponse(
        id=dependency.id,
        project_id=dependency.project_id,
        task_id=dependency.task_id,
        milestone_id=dependency.milestone_id,
        blocker_id=dependency.blocker_id,
        key=dependency.key,
        title=dependency.title,
        description=dependency.description,
        dependency_type=dependency.dependency_type,
        status=dependency.status,
        requested_date=dependency.requested_date,
        expected_date=dependency.expected_date,
        provided_date=dependency.provided_date,
        provided_data=dependency.provided_data,
        receipt_notes=dependency.receipt_notes,
        impact_summary=dependency.impact_summary,
        waiting_days=waiting_days,
        is_overdue=is_overdue,
        created_at=dependency.created_at,
        updated_at=dependency.updated_at,
    )


@router.post(
    "/client-dependencies/{dep_id}/status",
    response_model=ClientDependencyResponse,
)
async def update_client_dependency_status(
    project_id: uuid.UUID,
    dep_id: uuid.UUID,
    status_in: ClientDependencyStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(ClientDependency).where(
        ClientDependency.id == dep_id, ClientDependency.project_id == project_id
    )
    res = await db.execute(query)
    dependency = res.scalar_one_or_none()
    if not dependency:
        raise HTTPException(status_code=404, detail="Client dependency not found.")

    dependency.status = status_in.target_status
    if status_in.target_status == ClientDependencyStatus.PROVIDED:
        dependency.provided_date = status_in.provided_date or date.today()
    if status_in.provided_data is not None:
        dependency.provided_data = status_in.provided_data
    if status_in.receipt_notes is not None:
        dependency.receipt_notes = status_in.receipt_notes

    await db.commit()
    await db.refresh(dependency)

    today = date.today()
    end_date = dependency.provided_date or today
    waiting_days = max(0, (end_date - dependency.requested_date).days)
    is_overdue = (
        dependency.status not in [ClientDependencyStatus.PROVIDED, ClientDependencyStatus.CANCELLED]
        and today > dependency.expected_date
    )

    return ClientDependencyResponse(
        id=dependency.id,
        project_id=dependency.project_id,
        task_id=dependency.task_id,
        milestone_id=dependency.milestone_id,
        blocker_id=dependency.blocker_id,
        key=dependency.key,
        title=dependency.title,
        description=dependency.description,
        dependency_type=dependency.dependency_type,
        status=dependency.status,
        requested_date=dependency.requested_date,
        expected_date=dependency.expected_date,
        provided_date=dependency.provided_date,
        provided_data=dependency.provided_data,
        receipt_notes=dependency.receipt_notes,
        impact_summary=dependency.impact_summary,
        waiting_days=waiting_days,
        is_overdue=is_overdue,
        created_at=dependency.created_at,
        updated_at=dependency.updated_at,
    )
