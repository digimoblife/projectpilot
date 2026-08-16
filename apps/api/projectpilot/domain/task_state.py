from typing import Dict, Optional, Set, Tuple
from projectpilot.persistence.models.planning_tasks import TaskStatus

ALLOWED_TASK_TRANSITIONS: Dict[TaskStatus, Set[TaskStatus]] = {
    TaskStatus.BACKLOG: {
        TaskStatus.IN_PROGRESS,
        TaskStatus.READY,
        TaskStatus.BLOCKED,
        TaskStatus.CANCELLED,
    },
    TaskStatus.READY: {
        TaskStatus.IN_PROGRESS,
        TaskStatus.BACKLOG,
        TaskStatus.BLOCKED,
        TaskStatus.CANCELLED,
    },
    TaskStatus.IN_PROGRESS: {
        TaskStatus.IN_REVIEW,
        TaskStatus.DONE,
        TaskStatus.QA,
        TaskStatus.BLOCKED,
        TaskStatus.BACKLOG,
        TaskStatus.READY,
        TaskStatus.CANCELLED,
    },
    TaskStatus.IN_REVIEW: {
        TaskStatus.DONE,
        TaskStatus.QA,
        TaskStatus.IN_PROGRESS,
        TaskStatus.BLOCKED,
        TaskStatus.BACKLOG,
        TaskStatus.CANCELLED,
    },
    TaskStatus.QA: {
        TaskStatus.DONE,
        TaskStatus.IN_PROGRESS,
        TaskStatus.IN_REVIEW,
        TaskStatus.BLOCKED,
        TaskStatus.CANCELLED,
    },
    TaskStatus.BLOCKED: {
        TaskStatus.IN_PROGRESS,
        TaskStatus.IN_REVIEW,
        TaskStatus.BACKLOG,
        TaskStatus.READY,
        TaskStatus.DONE,
        TaskStatus.CANCELLED,
    },
    TaskStatus.DONE: {
        TaskStatus.IN_PROGRESS,
        TaskStatus.BACKLOG,
    },
    TaskStatus.CANCELLED: {
        TaskStatus.BACKLOG,
        TaskStatus.READY,
        TaskStatus.IN_PROGRESS,
    },
}


def is_valid_task_transition(
    current_status: TaskStatus,
    target_status: TaskStatus,
    blocker_reason: Optional[str] = None,
) -> Tuple[bool, str]:
    if current_status == target_status:
        return True, "No status change needed."

    allowed = ALLOWED_TASK_TRANSITIONS.get(current_status, set())
    if target_status not in allowed:
        return (
            False,
            f"Invalid task transition from '{current_status.value}' to '{target_status.value}'. Allowed targets: {[s.value for s in allowed]}",
        )

    if target_status == TaskStatus.BLOCKED and (not blocker_reason or not blocker_reason.strip()):
        return False, "Cannot set task to BLOCKED without providing a blocker reason."

    return True, "Task transition valid."
