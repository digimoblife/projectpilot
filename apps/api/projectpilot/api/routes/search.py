import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from projectpilot.api.deps import get_current_user, get_db
from projectpilot.api.schemas.search import (
    GlobalSearchResponse,
    ProjectQARequest,
    ProjectQAResponse,
    ProjectSearchResponse,
    SearchResultItem,
)
from projectpilot.persistence.models.user import User
from projectpilot.services.project_qa_service import answer_project_question
from projectpilot.services.search_service import global_search, project_scoped_search

router = APIRouter(tags=["Project Q&A & Search Expansion"])


# =========================================================================
# 1. GLOBAL MULTI-ENTITY SEARCH
# =========================================================================
@router.get("/search", response_model=GlobalSearchResponse)
async def search_global(
    q: str = Query(..., min_length=1, description="Search keyword"),
    limit: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    results = await global_search(query_str=q, db=db, limit=limit)
    items = [SearchResultItem(**r) for r in results]
    return GlobalSearchResponse(
        query=q,
        total_count=len(items),
        results=items,
    )


# =========================================================================
# 2. PROJECT-SCOPED SEARCH
# =========================================================================
@router.get("/projects/{project_id}/search", response_model=ProjectSearchResponse)
async def search_project_scoped(
    project_id: uuid.UUID,
    q: str = Query(..., min_length=1, description="Search keyword"),
    limit: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    results = await project_scoped_search(project_id=project_id, query_str=q, db=db, limit=limit)
    items = [SearchResultItem(**r) for r in results]
    return ProjectSearchResponse(
        project_id=project_id,
        query=q,
        total_count=len(items),
        results=items,
    )


# =========================================================================
# 3. GROUNDED PROJECT Q&A
# =========================================================================
@router.post("/projects/{project_id}/qa", response_model=ProjectQAResponse)
async def ask_project_question(
    project_id: uuid.UUID,
    req: ProjectQARequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        res = await answer_project_question(project_id=project_id, question=req.question, db=db)
        return ProjectQAResponse(
            project_id=project_id,
            question=req.question,
            answer=res["answer"],
            citations=res["citations"],
            evidence_count=res["evidence_count"],
        )
    except ValueError:
        raise HTTPException(status_code=404, detail="Project not found.")
