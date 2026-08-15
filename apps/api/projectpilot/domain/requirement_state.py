from typing import Dict, Set, Tuple
from projectpilot.persistence.models.requirements_scope import RequirementStatus

ALLOWED_REQUIREMENT_TRANSITIONS: Dict[RequirementStatus, Set[RequirementStatus]] = {
    RequirementStatus.DRAFT: {
        RequirementStatus.NEEDS_CLARIFICATION,
        RequirementStatus.CONFIRMED,
        RequirementStatus.REJECTED,
    },
    RequirementStatus.NEEDS_CLARIFICATION: {
        RequirementStatus.DRAFT,
        RequirementStatus.CONFIRMED,
        RequirementStatus.REJECTED,
    },
    RequirementStatus.CONFIRMED: {
        RequirementStatus.APPROVED,
        RequirementStatus.NEEDS_CLARIFICATION,
        RequirementStatus.REJECTED,
    },
    RequirementStatus.APPROVED: {
        RequirementStatus.SUPERSEDED,
    },
    RequirementStatus.REJECTED: {
        RequirementStatus.DRAFT,
    },
    RequirementStatus.SUPERSEDED: set(),
}


def is_valid_requirement_transition(
    current_status: RequirementStatus, target_status: RequirementStatus
) -> Tuple[bool, str]:
    if current_status == target_status:
        return True, "No status change needed."

    allowed = ALLOWED_REQUIREMENT_TRANSITIONS.get(current_status, set())
    if target_status not in allowed:
        return (
            False,
            f"Invalid requirement transition from '{current_status.value}' to '{target_status.value}'. Allowed targets: {[s.value for s in allowed]}",
        )

    return True, "Requirement transition valid."
