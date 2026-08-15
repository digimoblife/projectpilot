from fastapi import APIRouter
from projectpilot.api.routes import (
    ai,
    auth,
    clients,
    control_center,
    discovery,
    documents,
    handover,
    health,
    issues_risks,
    leads,
    meetings,
    planning_tasks,
    projects,
    reports,
    requirements_scope,
    search,
    timeline_team,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(clients.router)
api_router.include_router(leads.router)
api_router.include_router(projects.router)
api_router.include_router(discovery.router)
api_router.include_router(requirements_scope.router)
api_router.include_router(planning_tasks.router)
api_router.include_router(timeline_team.router)
api_router.include_router(issues_risks.router)
api_router.include_router(ai.router)
api_router.include_router(meetings.router)
api_router.include_router(control_center.router)
api_router.include_router(reports.router)
api_router.include_router(documents.router)
api_router.include_router(handover.router)
api_router.include_router(search.router)
