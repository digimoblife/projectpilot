import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from projectpilot.ai.gemini_adapter import gemini_adapter
from projectpilot.ai.prompt_registry import SYSTEM_LANGUAGE_INSTRUCTION, get_prompt
from projectpilot.api.deps import get_current_pm, get_current_user, get_db
from projectpilot.api.schemas.ai import AISuggestionResponse
from projectpilot.api.schemas.meeting import (
    ActionItemConvertRequest,
    ActionItemCreate,
    ActionItemResponse,
    ActionItemUpdate,
    MeetingCreate,
    MeetingParticipantCreate,
    MeetingParticipantResponse,
    MeetingResponse,
    MeetingUpdate,
)
from datetime import date
from projectpilot.persistence.base import utc_now
from projectpilot.persistence.models.activity import ActivityEvent
from projectpilot.persistence.models.ai import AISuggestion, AISuggestionStatus
from projectpilot.persistence.models.issues_risks import (
    ClientDependency,
    ClientDependencyStatus,
    Issue,
    IssueStatus,
)
from projectpilot.persistence.models.meeting import (
    ActionItem,
    ActionItemStatus,
    ConvertedEntityType,
    Meeting,
    MeetingParticipant,
    MeetingStatus,
)
from projectpilot.persistence.models.planning_tasks import Task, TaskStatus
from projectpilot.persistence.models.requirements_scope import Decision, DecisionStatus
from projectpilot.persistence.models.user import User

router = APIRouter(prefix="/projects/{project_id}/meetings", tags=["Meetings & AI Meeting Intelligence"])


# =========================================================================
# 1. MEETINGS CRUD
# =========================================================================
@router.post("", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
async def create_meeting(
    project_id: uuid.UUID,
    meeting_in: MeetingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    # Generate meeting key
    count_res = await db.execute(select(Meeting).where(Meeting.project_id == project_id))
    existing_count = len(count_res.scalars().all())
    meeting_key = f"MTG-{(existing_count + 1):03d}"

    meeting = Meeting(
        project_id=project_id,
        meeting_key=meeting_key,
        title=meeting_in.title,
        meeting_type=meeting_in.meeting_type,
        scheduled_at=meeting_in.scheduled_at,
        occurred_at=meeting_in.occurred_at or utc_now(),
        status=MeetingStatus.COMPLETED,
        notes=meeting_in.notes,
        transcript=meeting_in.transcript,
        created_by_user_id=current_user.id,
    )
    db.add(meeting)
    await db.flush()

    if meeting_in.participants:
        for p in meeting_in.participants:
            part = MeetingParticipant(
                meeting_id=meeting.id,
                participant_type=p.participant_type,
                user_id=p.user_id,
                display_name_snapshot=p.display_name_snapshot,
                role_snapshot=p.role_snapshot,
            )
            db.add(part)

    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="MEETING_CREATED",
        description=f"Notulen rapat '{meeting.title}' ({meeting.meeting_key}) dicatat.",
    )
    db.add(activity)

    await db.commit()

    # Re-fetch with relationships
    query = (
        select(Meeting)
        .where(Meeting.id == meeting.id)
        .options(selectinload(Meeting.participants), selectinload(Meeting.action_items))
    )
    res = await db.execute(query)
    return res.scalar_one()


@router.get("", response_model=List[MeetingResponse])
async def list_meetings(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(Meeting)
        .where(Meeting.project_id == project_id)
        .options(selectinload(Meeting.participants), selectinload(Meeting.action_items))
        .order_by(Meeting.occurred_at.desc())
    )
    res = await db.execute(query)
    return res.scalars().all()


@router.get("/{meeting_id}", response_model=MeetingResponse)
async def get_meeting(
    project_id: uuid.UUID,
    meeting_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(Meeting)
        .where(Meeting.id == meeting_id, Meeting.project_id == project_id)
        .options(selectinload(Meeting.participants), selectinload(Meeting.action_items))
    )
    res = await db.execute(query)
    meeting = res.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found.")
    return meeting


@router.put("/{meeting_id}", response_model=MeetingResponse)
async def update_meeting(
    project_id: uuid.UUID,
    meeting_id: uuid.UUID,
    meeting_in: MeetingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(Meeting)
        .where(Meeting.id == meeting_id, Meeting.project_id == project_id)
        .options(selectinload(Meeting.participants), selectinload(Meeting.action_items))
    )
    res = await db.execute(query)
    meeting = res.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found.")

    for field, val in meeting_in.model_dump(exclude_unset=True).items():
        setattr(meeting, field, val)

    await db.commit()
    await db.refresh(meeting)
    return meeting


@router.post("/{meeting_id}/finalize", response_model=MeetingResponse)
async def finalize_meeting(
    project_id: uuid.UUID,
    meeting_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(Meeting)
        .where(Meeting.id == meeting_id, Meeting.project_id == project_id)
        .options(selectinload(Meeting.participants), selectinload(Meeting.action_items))
    )
    res = await db.execute(query)
    meeting = res.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found.")

    meeting.status = MeetingStatus.FINALIZED
    meeting.finalized_at = utc_now()

    activity = ActivityEvent(
        project_id=project_id,
        actor_id=current_user.id,
        event_type="MEETING_FINALIZED",
        description=f"Notulen rapat '{meeting.title}' telah difinalisasi.",
    )
    db.add(activity)

    await db.commit()
    await db.refresh(meeting)
    return meeting


# =========================================================================
# 2. AI MEETING ANALYSIS
# =========================================================================
@router.post("/{meeting_id}/analyze-ai", response_model=AISuggestionResponse)
async def analyze_meeting_ai(
    project_id: uuid.UUID,
    meeting_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = (
        select(Meeting)
        .where(Meeting.id == meeting_id, Meeting.project_id == project_id)
        .options(selectinload(Meeting.participants))
    )
    res = await db.execute(query)
    meeting = res.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found.")

    attendees_str = ", ".join([f"{p.display_name_snapshot} ({p.participant_type.value})" for p in meeting.participants])
    evidence_text = f"""=== MEETING METADATA ===
Meeting Key: {meeting.meeting_key}
Title: {meeting.title}
Meeting Type: {meeting.meeting_type.value}
Attendees: {attendees_str or 'Internal Team'}

=== MEETING NOTES ===
{meeting.notes or 'No written notes provided.'}

=== MEETING TRANSCRIPT ===
{meeting.transcript or 'No audio transcript provided.'}
"""

    prompt = get_prompt("MEETING_ANALYSIS", evidence=evidence_text)
    result_data = await gemini_adapter.generate_structured(
        prompt=prompt,
        system_instruction=SYSTEM_LANGUAGE_INSTRUCTION,
        capability="MEETING_ANALYSIS",
    )

    # Save summary directly on meeting record
    if "summary" in result_data and isinstance(result_data["summary"], str):
        meeting.summary = result_data["summary"]

    suggestion = AISuggestion(
        project_id=project_id,
        capability="MEETING_ANALYSIS",
        title=f"AI Ekstraksi Notulen: {meeting.title}",
        suggested_data=result_data,
        evidence_sources={"meeting_id": str(meeting.id), "meeting_key": meeting.meeting_key},
        status=AISuggestionStatus.GENERATED,
    )
    db.add(suggestion)

    await db.commit()
    await db.refresh(suggestion)
    return suggestion


# =========================================================================
# 3. ACTION ITEMS & CONVERSION WORKFLOW
# =========================================================================
@router.post("/{meeting_id}/action-items", response_model=ActionItemResponse, status_code=status.HTTP_201_CREATED)
async def create_action_item(
    project_id: uuid.UUID,
    meeting_id: uuid.UUID,
    item_in: ActionItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    action_item = ActionItem(
        project_id=project_id,
        meeting_id=meeting_id,
        title=item_in.title,
        description=item_in.description,
        status=item_in.status,
        owner_name=item_in.owner_name,
        owner_user_id=item_in.owner_user_id,
        due_date=item_in.due_date,
    )
    db.add(action_item)
    await db.commit()
    await db.refresh(action_item)
    return action_item


@router.post(
    "/{meeting_id}/action-items/{action_item_id}/convert",
    response_model=ActionItemResponse,
)
async def convert_action_item(
    project_id: uuid.UUID,
    meeting_id: uuid.UUID,
    action_item_id: uuid.UUID,
    convert_in: ActionItemConvertRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_pm),
):
    query = select(ActionItem).where(
        ActionItem.id == action_item_id,
        ActionItem.meeting_id == meeting_id,
        ActionItem.project_id == project_id,
    )
    res = await db.execute(query)
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Action item not found.")

    if convert_in.target_entity == ConvertedEntityType.TASK:
        # Check feature or default feature
        feature_id = convert_in.feature_id
        if not feature_id:
            # Look up or require feature
            raise HTTPException(status_code=400, detail="feature_id is required to convert action item to Task.")

        task_count_res = await db.execute(select(Task).where(Task.project_id == project_id))
        task_count = len(task_count_res.scalars().all())
        task_key = f"TSK-{(task_count + 1):03d}"

        new_task = Task(
            project_id=project_id,
            feature_id=feature_id,
            key=task_key,
            title=item.title,
            description=item.description or f"Tindak lanjut dari rapat (Action Item ID: {item.id})",
            priority="MEDIUM",
            status=TaskStatus.BACKLOG,
            due_date=item.due_date.date() if item.due_date else None,
        )
        db.add(new_task)
        await db.flush()

        item.converted_entity_type = ConvertedEntityType.TASK
        item.converted_entity_id = new_task.id
        item.status = ActionItemStatus.CONVERTED

    elif convert_in.target_entity == ConvertedEntityType.CLIENT_DEPENDENCY:
        dep_count_res = await db.execute(select(ClientDependency).where(ClientDependency.project_id == project_id))
        dep_count = len(dep_count_res.scalars().all())
        dep_key = f"DEP-{(dep_count + 1):03d}"

        new_dep = ClientDependency(
            project_id=project_id,
            key=dep_key,
            title=item.title,
            description=item.description or "Ketergantungan klien dari notulen rapat.",
            dependency_type="CREDENTIALS",
            requested_date=date.today(),
            expected_date=item.due_date.date() if item.due_date else date.today(),
            status=ClientDependencyStatus.REQUESTED,
        )
        db.add(new_dep)
        await db.flush()

        item.converted_entity_type = ConvertedEntityType.CLIENT_DEPENDENCY
        item.converted_entity_id = new_dep.id
        item.status = ActionItemStatus.CONVERTED

    elif convert_in.target_entity == ConvertedEntityType.ISSUE:
        issue_count_res = await db.execute(select(Issue).where(Issue.project_id == project_id))
        issue_count = len(issue_count_res.scalars().all())
        issue_key = f"ISS-{(issue_count + 1):03d}"

        new_issue = Issue(
            project_id=project_id,
            key=issue_key,
            title=item.title,
            description=item.description or "Isu operasional dari rapat.",
            severity="MEDIUM",
            priority="MEDIUM",
            status=IssueStatus.OPEN,
        )
        db.add(new_issue)
        await db.flush()

        item.converted_entity_type = ConvertedEntityType.ISSUE
        item.converted_entity_id = new_issue.id
        item.status = ActionItemStatus.CONVERTED

    await db.commit()
    await db.refresh(item)
    return item
