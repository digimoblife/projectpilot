import uuid
from typing import Dict, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from projectpilot.persistence.models.discovery import Brief, ClientAnswer, DiscoveryQuestion
from projectpilot.persistence.models.project import Project
from projectpilot.persistence.models.requirements_scope import Decision, Requirement, ScopeItem


async def build_discovery_context(project_id: uuid.UUID, db: AsyncSession) -> str:
    """Assembles all relevant project evidence for discovery analysis and question generation."""
    # 1. Project Info
    p_res = await db.execute(select(Project).where(Project.id == project_id))
    project = p_res.scalar_one_or_none()
    project_name = project.name if project else "Project"
    project_code = project.code if project else "CODE"

    # 2. Brief
    b_res = await db.execute(select(Brief).where(Brief.project_id == project_id))
    brief = b_res.scalar_one_or_none()
    if brief:
        brief_text = f"Tujuan: {brief.objective}\nKonten: {brief.raw_content or ''}\nKonteks Bisnis: {brief.business_context or ''}"
    else:
        brief_text = "No raw brief notes provided."

    # 3. Existing Discovery Questions and Answers
    q_res = await db.execute(
        select(DiscoveryQuestion)
        .where(DiscoveryQuestion.project_id == project_id)
        .order_by(DiscoveryQuestion.category.asc())
    )
    questions = q_res.scalars().all()

    qa_lines: List[str] = []
    for q in questions:
        # Check for client answers
        a_res = await db.execute(
            select(ClientAnswer).where(ClientAnswer.question_id == q.id)
        )
        answers = a_res.scalars().all()
        answer_text = (
            "; ".join([a.answer_text for a in answers]) if answers else "Belum dijawab klien"
        )
        qa_lines.append(f"- [{q.category.value}] Tanya: {q.question} | Jawab: {answer_text}")

    # 4. Decisions (ADR)
    d_res = await db.execute(select(Decision).where(Decision.project_id == project_id))
    decisions = d_res.scalars().all()
    dec_lines = [f"- {d.key}: {d.title} ({d.decision})" for d in decisions]

    context = f"""=== PROJECT METADATA ===
Project Code: {project_code}
Project Name: {project_name}

=== PROJECT BRIEF ===
{brief_text}

=== DISCOVERY QUESTIONS & CLIENT ANSWERS ===
{chr(10).join(qa_lines) if qa_lines else "Belum ada pertanyaan discovery."}

=== RECORDED DECISIONS ===
{chr(10).join(dec_lines) if dec_lines else "Belum ada keputusan formal."}
"""
    return context.strip()


async def build_requirements_context(project_id: uuid.UUID, db: AsyncSession) -> str:
    """Assembles confirmed discovery evidence, scope items, and brief notes for requirement extraction."""
    discovery_context = await build_discovery_context(project_id, db)

    s_res = await db.execute(select(ScopeItem).where(ScopeItem.project_id == project_id))
    scope_items = s_res.scalars().all()
    scope_lines = [f"- [{s.scope_type.value}] {s.title}: {s.description or ''}" for s in scope_items]

    # Also include existing requirements
    req_res = await db.execute(select(Requirement).where(Requirement.project_id == project_id))
    reqs = req_res.scalars().all()
    req_lines = [f"- [{r.key}] {r.title} ({r.category.value}) - Status: {r.status.value}" for r in reqs]

    return f"""{discovery_context}

=== BASELINE SCOPE ITEMS ===
{chr(10).join(scope_lines) if scope_lines else "Belum ada baseline scope."}

=== CURRENT REQUIREMENTS ===
{chr(10).join(req_lines) if req_lines else "Belum ada requirement terdaftar."}
""".strip()


async def build_planning_context(project_id: uuid.UUID, db: AsyncSession) -> str:
    """Assembles all requirements, discovery findings, and brief for epic/feature generation."""
    req_context = await build_requirements_context(project_id, db)
    return req_context


async def build_tasks_context(project_id: uuid.UUID, db: AsyncSession) -> str:
    """Assembles Epics, Features, and Requirements for breaking down into concrete Kanban tasks."""
    from projectpilot.persistence.models.planning_tasks import Epic, Feature

    # 1. Epics & Features
    e_res = await db.execute(select(Epic).where(Epic.project_id == project_id).order_by(Epic.key.asc()))
    epics = e_res.scalars().all()

    f_res = await db.execute(select(Feature).where(Feature.project_id == project_id).order_by(Feature.key.asc()))
    features = f_res.scalars().all()

    epic_lines: List[str] = []
    for e in epics:
        epic_feats = [f for f in features if f.epic_id == e.id]
        feat_desc = "\n".join([f"    * [{f.key}] {f.title}: {f.description or ''}" for f in epic_feats])
        epic_lines.append(f"- [{e.key}] {e.title}\n  Deskripsi: {e.description or ''}\n  Fitur-Fitur:\n{feat_desc if feat_desc else '    (Belum ada sub-fitur)'}")

    # 2. Requirements
    req_res = await db.execute(select(Requirement).where(Requirement.project_id == project_id))
    reqs = req_res.scalars().all()
    req_lines = [f"- [{r.key}] {r.title} ({r.category.value})" for r in reqs]

    return f"""=== EPICS & FEATURES HIERARCHY ===
{chr(10).join(epic_lines) if epic_lines else "Belum ada Epics terdaftar."}

=== ASSOCIATED REQUIREMENTS ===
{chr(10).join(req_lines) if req_lines else "Belum ada requirement."}
""".strip()

