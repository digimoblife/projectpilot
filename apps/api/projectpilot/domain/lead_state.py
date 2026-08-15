from typing import Dict, Set, Tuple
from projectpilot.persistence.models.lead import LeadStatus

ALLOWED_LEAD_TRANSITIONS: Dict[LeadStatus, Set[LeadStatus]] = {
    LeadStatus.NEW: {
        LeadStatus.CONTACTED,
        LeadStatus.NOT_QUALIFIED,
        LeadStatus.LOST,
    },
    LeadStatus.CONTACTED: {
        LeadStatus.BRIEF_SCHEDULED,
        LeadStatus.QUALIFIED,
        LeadStatus.NOT_QUALIFIED,
        LeadStatus.LOST,
    },
    LeadStatus.BRIEF_SCHEDULED: {
        LeadStatus.QUALIFIED,
        LeadStatus.NOT_QUALIFIED,
        LeadStatus.LOST,
    },
    LeadStatus.QUALIFIED: {
        LeadStatus.CONVERTED,
        LeadStatus.LOST,
    },
    LeadStatus.NOT_QUALIFIED: set(),
    LeadStatus.CONVERTED: set(),
    LeadStatus.LOST: set(),
}


def is_valid_lead_transition(
    current_status: LeadStatus, target_status: LeadStatus
) -> Tuple[bool, str]:
    if current_status == target_status:
        return True, "No status change needed."

    allowed = ALLOWED_LEAD_TRANSITIONS.get(current_status, set())
    if target_status not in allowed:
        return (
            False,
            f"Invalid lead transition from '{current_status.value}' to '{target_status.value}'. Allowed targets: {[s.value for s in allowed]}",
        )

    return True, "Lead transition valid."
