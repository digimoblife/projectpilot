from typing import Dict, Set, Tuple
from projectpilot.persistence.models.requirements_scope import ScopeChangeStatus

ALLOWED_SCOPE_CHANGE_TRANSITIONS: Dict[ScopeChangeStatus, Set[ScopeChangeStatus]] = {
    ScopeChangeStatus.IDENTIFIED: {
        ScopeChangeStatus.UNDER_EVALUATION,
        ScopeChangeStatus.CANCELLED,
    },
    ScopeChangeStatus.UNDER_EVALUATION: {
        ScopeChangeStatus.SUBMITTED,
        ScopeChangeStatus.CANCELLED,
    },
    ScopeChangeStatus.SUBMITTED: {
        ScopeChangeStatus.CLIENT_APPROVED,
        ScopeChangeStatus.REJECTED,
        ScopeChangeStatus.CANCELLED,
    },
    ScopeChangeStatus.CLIENT_APPROVED: {
        ScopeChangeStatus.IMPLEMENTED,
        ScopeChangeStatus.CANCELLED,
    },
    ScopeChangeStatus.REJECTED: {
        ScopeChangeStatus.UNDER_EVALUATION,
    },
    ScopeChangeStatus.IMPLEMENTED: set(),
    ScopeChangeStatus.CANCELLED: set(),
}


def is_valid_scope_change_transition(
    current_status: ScopeChangeStatus, target_status: ScopeChangeStatus
) -> Tuple[bool, str]:
    if current_status == target_status:
        return True, "No status change needed."

    allowed = ALLOWED_SCOPE_CHANGE_TRANSITIONS.get(current_status, set())
    if target_status not in allowed:
        return (
            False,
            f"Invalid scope change transition from '{current_status.value}' to '{target_status.value}'. Allowed targets: {[s.value for s in allowed]}",
        )

    return True, "Scope change transition valid."
