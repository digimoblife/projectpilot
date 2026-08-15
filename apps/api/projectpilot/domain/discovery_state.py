from typing import Dict, Set, Tuple
from projectpilot.persistence.models.discovery import DiscoveryQuestionStatus

ALLOWED_QUESTION_TRANSITIONS: Dict[DiscoveryQuestionStatus, Set[DiscoveryQuestionStatus]] = {
    DiscoveryQuestionStatus.DRAFT: {
        DiscoveryQuestionStatus.READY,
        DiscoveryQuestionStatus.CLOSED,
    },
    DiscoveryQuestionStatus.READY: {
        DiscoveryQuestionStatus.SENT,
        DiscoveryQuestionStatus.DRAFT,
        DiscoveryQuestionStatus.CLOSED,
    },
    DiscoveryQuestionStatus.SENT: {
        DiscoveryQuestionStatus.ANSWERED,
        DiscoveryQuestionStatus.CLOSED,
    },
    DiscoveryQuestionStatus.ANSWERED: {
        DiscoveryQuestionStatus.NEEDS_FOLLOW_UP,
        DiscoveryQuestionStatus.CLOSED,
    },
    DiscoveryQuestionStatus.NEEDS_FOLLOW_UP: {
        DiscoveryQuestionStatus.SENT,
        DiscoveryQuestionStatus.CLOSED,
    },
    DiscoveryQuestionStatus.CLOSED: {
        DiscoveryQuestionStatus.DRAFT,
        DiscoveryQuestionStatus.READY,
    },
}


def is_valid_question_transition(
    current_status: DiscoveryQuestionStatus, target_status: DiscoveryQuestionStatus
) -> Tuple[bool, str]:
    if current_status == target_status:
        return True, "No status change needed."

    allowed = ALLOWED_QUESTION_TRANSITIONS.get(current_status, set())
    if target_status not in allowed:
        return (
            False,
            f"Invalid question transition from '{current_status.value}' to '{target_status.value}'. Allowed targets: {[s.value for s in allowed]}",
        )

    return True, "Question transition valid."
