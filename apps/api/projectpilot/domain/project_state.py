from typing import Dict, List, Set, Tuple
from projectpilot.persistence.models.project import ProjectLifecycleStage

# Allowed forward transitions
ALLOWED_TRANSITIONS: Dict[ProjectLifecycleStage, Set[ProjectLifecycleStage]] = {
    ProjectLifecycleStage.DISCOVERY: {
        ProjectLifecycleStage.REQUIREMENT_DEFINITION,
        ProjectLifecycleStage.ON_HOLD,
        ProjectLifecycleStage.CANCELLED,
    },
    ProjectLifecycleStage.REQUIREMENT_DEFINITION: {
        ProjectLifecycleStage.PLANNING,
        ProjectLifecycleStage.ON_HOLD,
        ProjectLifecycleStage.CANCELLED,
    },
    ProjectLifecycleStage.PLANNING: {
        ProjectLifecycleStage.AWAITING_CLIENT_APPROVAL,
        ProjectLifecycleStage.ON_HOLD,
        ProjectLifecycleStage.CANCELLED,
    },
    ProjectLifecycleStage.AWAITING_CLIENT_APPROVAL: {
        ProjectLifecycleStage.ACTIVE_DELIVERY,
        ProjectLifecycleStage.PLANNING,  # Rework
        ProjectLifecycleStage.ON_HOLD,
        ProjectLifecycleStage.CANCELLED,
    },
    ProjectLifecycleStage.ACTIVE_DELIVERY: {
        ProjectLifecycleStage.HANDOVER,
        ProjectLifecycleStage.PLANNING,  # Major replan
        ProjectLifecycleStage.ON_HOLD,
        ProjectLifecycleStage.CANCELLED,
    },
    ProjectLifecycleStage.HANDOVER: {
        ProjectLifecycleStage.COMPLETED,
        ProjectLifecycleStage.ACTIVE_DELIVERY,  # Rework handover issues
        ProjectLifecycleStage.ON_HOLD,
        ProjectLifecycleStage.CANCELLED,
    },
    ProjectLifecycleStage.ON_HOLD: {
        ProjectLifecycleStage.DISCOVERY,
        ProjectLifecycleStage.REQUIREMENT_DEFINITION,
        ProjectLifecycleStage.PLANNING,
        ProjectLifecycleStage.AWAITING_CLIENT_APPROVAL,
        ProjectLifecycleStage.ACTIVE_DELIVERY,
        ProjectLifecycleStage.HANDOVER,
        ProjectLifecycleStage.CANCELLED,
    },
    ProjectLifecycleStage.COMPLETED: set(),  # Terminal by default
    ProjectLifecycleStage.CANCELLED: set(),  # Terminal by default
}


def is_valid_project_transition(
    current_stage: ProjectLifecycleStage, target_stage: ProjectLifecycleStage
) -> Tuple[bool, str]:
    if current_stage == target_stage:
        return True, "No transition needed."

    allowed = ALLOWED_TRANSITIONS.get(current_stage, set())
    if target_stage not in allowed:
        return (
            False,
            f"Invalid transition from '{current_stage.value}' to '{target_stage.value}'. Allowed targets: {[s.value for s in allowed]}",
        )

    return True, "Transition valid."
