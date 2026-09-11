"""
ProjectPilot Database Seeding Script
====================================
Idempotent script to populate rich, realistic corporate demo data for development and testing.
Can be executed repeatedly without generating duplicates or errors.
"""

import asyncio
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from projectpilot.core.security import get_password_hash
from projectpilot.persistence.database import async_session_factory
from projectpilot.persistence.models import (
    ActionItem,
    ActionItemStatus,
    ActivityEvent,
    Brief,
    Client,
    ClientAnswer,
    Decision,
    DecisionStatus,
    DiscoveryCategory,
    DiscoveryQuestion,
    DiscoveryQuestionStatus,
    DocumentStatus,
    DocumentType,
    Epic,
    Feature,
    GeneratedDocument,
    Lead,
    LeadStatus,
    Meeting,
    MeetingParticipant,
    MeetingStatus,
    MeetingType,
    Milestone,
    MilestoneStatus,
    MoMDocument,
    ParticipantType,
    Project,
    ProjectHealth,
    ProjectLifecycleStage,
    ProjectMember,
    Report,
    ReportStatus,
    ReportType,
    Requirement,
    RequirementSourceType,
    RequirementStatus,
    ScopeItem,
    ScopeType,
    Stakeholder,
    Task,
    TaskDependency,
    TaskStatus,
    User,
    UserRole,
)


async def seed_data() -> None:
    async with async_session_factory() as session:
        print("[Seed] Starting ProjectPilot idempotent database seeding...")

        # ---------------------------------------------------------------------
        # 1. USERS
        # ---------------------------------------------------------------------
        users_map = {}
        users_data = [
            {
                "email": "admin@projectpilot.io",
                "full_name": "Administrator Lead",
                "role": UserRole.ADMIN,
                "password": "Admin123!",
            },
            {
                "email": "pm@projectpilot.io",
                "full_name": "Cahyo PM",
                "role": UserRole.PROJECT_MANAGER,
                "password": "Pilot123!",
            },
            {
                "email": "dev@projectpilot.io",
                "full_name": "Budi Engineer",
                "role": UserRole.TEAM_MEMBER,
                "password": "Dev123!",
            },
            {
                "email": "designer@projectpilot.io",
                "full_name": "Sinta Designer",
                "role": UserRole.TEAM_MEMBER,
                "password": "Design123!",
            },
        ]

        for u in users_data:
            stmt = select(User).where(User.email == u["email"])
            existing = (await session.execute(stmt)).scalar_one_or_none()
            if not existing:
                user_obj = User(
                    email=u["email"],
                    full_name=u["full_name"],
                    role=u["role"],
                    password_hash=get_password_hash(u["password"]),
                    is_active=True,
                )
                session.add(user_obj)
                await session.flush()
                users_map[u["email"]] = user_obj
                print(f"  [+] Created user: {u['email']}")
            else:
                users_map[u["email"]] = existing
                print(f"  [*] Existing user found: {u['email']}")

        pm_user = users_map["pm@projectpilot.io"]

        # ---------------------------------------------------------------------
        # 2. CLIENTS & STAKEHOLDERS
        # ---------------------------------------------------------------------
        clients_map = {}
        clients_data = [
            {
                "name": "PT Retail Sukses Mandiri",
                "company_name": "PT Retail Sukses Mandiri",
                "industry": "Retail & E-Commerce",
                "website": "https://retailsukses.com",
                "primary_contact_name": "Hendra Pratama",
                "primary_contact_email": "hendra@retailsukses.com",
                "primary_contact_phone": "+62 812-3456-7890",
                "notes": "Klien ritel dengan jaringan 120 cabang toko offline di seluruh Indonesia.",
                "stakeholders": [
                    {
                        "name": "Hendra Pratama",
                        "role": "VP of Technology",
                        "email": "hendra@retailsukses.com",
                        "phone": "+62 812-3456-7890",
                        "decision_authority": "Budget & Arsitektur Utama",
                    },
                    {
                        "name": "Ratna Dewi",
                        "role": "Head of Retail Operations",
                        "email": "ratna@retailsukses.com",
                        "phone": "+62 813-9876-5432",
                        "decision_authority": "User Acceptance & Validasi Workflow",
                    },
                ],
            },
            {
                "name": "PT Nusantara Finansial Global",
                "company_name": "PT Nusantara Finansial Global",
                "industry": "Banking & Fintech",
                "website": "https://nusantarafin.com",
                "primary_contact_name": "Maya Anggraini",
                "primary_contact_email": "maya@nusantarafin.com",
                "primary_contact_phone": "+62 811-2233-4455",
                "notes": "Institusi keuangan yang sedang melakukan modernisasi core banking ke microservices.",
                "stakeholders": [
                    {
                        "name": "Maya Anggraini",
                        "role": "Chief Digital Officer",
                        "email": "maya@nusantarafin.com",
                        "phone": "+62 811-2233-4455",
                        "decision_authority": "Sponsor Eksekutif",
                    }
                ],
            },
            {
                "name": "PT Logistik Digital Asia",
                "company_name": "PT Logistik Digital Asia",
                "industry": "Supply Chain & IoT",
                "website": "https://logistikasia.com",
                "primary_contact_name": "Joko Santoso",
                "primary_contact_email": "joko@logistikasia.com",
                "primary_contact_phone": "+62 817-6655-4433",
                "notes": "Penyedia solusi tracking logistik kargo intermoda.",
                "stakeholders": [
                    {
                        "name": "Joko Santoso",
                        "role": "Head of Supply Chain Solution",
                        "email": "joko@logistikasia.com",
                        "phone": "+62 817-6655-4433",
                        "decision_authority": "Product Owner",
                    }
                ],
            },
        ]

        for c in clients_data:
            stmt = select(Client).where(Client.company_name == c["company_name"])
            existing_client = (await session.execute(stmt)).scalar_one_or_none()
            if not existing_client:
                client_obj = Client(
                    name=c["name"],
                    company_name=c["company_name"],
                    industry=c["industry"],
                    website=c["website"],
                    primary_contact_name=c["primary_contact_name"],
                    primary_contact_email=c["primary_contact_email"],
                    primary_contact_phone=c["primary_contact_phone"],
                    notes=c["notes"],
                )
                session.add(client_obj)
                await session.flush()
                clients_map[c["company_name"]] = client_obj

                for st in c.get("stakeholders", []):
                    stakeholder_obj = Stakeholder(
                        client_id=client_obj.id,
                        name=st["name"],
                        role=st["role"],
                        email=st["email"],
                        phone=st["phone"],
                        decision_authority=st["decision_authority"],
                    )
                    session.add(stakeholder_obj)
                print(f"  [+] Created client: {c['company_name']}")
            else:
                clients_map[c["company_name"]] = existing_client
                print(f"  [*] Existing client found: {c['company_name']}")

        # ---------------------------------------------------------------------
        # 3. PROJECTS
        # ---------------------------------------------------------------------
        projects_map = {}
        now = datetime.now(timezone.utc)
        today = now.date()

        projects_data = [
            {
                "code": "PRJ-001",
                "name": "Omnichannel POS & CRM Integration",
                "description": "Pengembangan sistem kasir POS modern berbasis offline-first yang terintegrasi dengan CRM loyalty program dan payment gateway perbankan.",
                "client_name": "PT Retail Sukses Mandiri",
                "lifecycle_stage": ProjectLifecycleStage.ACTIVE_DELIVERY,
                "health": ProjectHealth.HEALTHY,
                "start_date": today - timedelta(days=30),
                "target_completion_date": today + timedelta(days=60),
            },
            {
                "code": "PRJ-002",
                "name": "Digital Core Banking Microservices",
                "description": "Modernisasi sistem transaksi perbankan dengan arsitektur microservices berkecepatan tinggi dan SLA ketersediaan 99.99%.",
                "client_name": "PT Nusantara Finansial Global",
                "lifecycle_stage": ProjectLifecycleStage.PLANNING,
                "health": ProjectHealth.WATCH,
                "start_date": today - timedelta(days=15),
                "target_completion_date": today + timedelta(days=90),
            },
            {
                "code": "PRJ-003",
                "name": "Smart Warehouse Tracking & IoT",
                "description": "Implementasi sensor IoT dan dashboard pemantauan inventaris gudang secara real-time lintas pulau.",
                "client_name": "PT Logistik Digital Asia",
                "lifecycle_stage": ProjectLifecycleStage.DISCOVERY,
                "health": ProjectHealth.HEALTHY,
                "start_date": today - timedelta(days=5),
                "target_completion_date": today + timedelta(days=45),
            },
        ]

        for p in projects_data:
            stmt = select(Project).where(Project.code == p["code"])
            existing_proj = (await session.execute(stmt)).scalar_one_or_none()
            if not existing_proj:
                client_obj = clients_map[p["client_name"]]
                proj_obj = Project(
                    code=p["code"],
                    name=p["name"],
                    description=p["description"],
                    client_id=client_obj.id,
                    owner_id=pm_user.id,
                    lifecycle_stage=p["lifecycle_stage"],
                    health=p["health"],
                    start_date=p["start_date"],
                    target_completion_date=p["target_completion_date"],
                )
                session.add(proj_obj)
                await session.flush()
                projects_map[p["code"]] = proj_obj

                # Create Activity Event
                event = ActivityEvent(
                    project_id=proj_obj.id,
                    actor_id=pm_user.id,
                    event_type="PROJECT_CREATED",
                    description=f"Inisiasi proyek {proj_obj.code} ({proj_obj.name}) berhasil dibuat oleh Project Manager.",
                    event_metadata={"initial_stage": proj_obj.lifecycle_stage.value},
                )
                session.add(event)
                print(f"  [+] Created project: {p['code']} ({p['name']})")
            else:
                projects_map[p["code"]] = existing_proj
                print(f"  [*] Existing project found: {p['code']}")

        main_project = projects_map["PRJ-001"]

        # ---------------------------------------------------------------------
        # 4. CRM LEADS
        # ---------------------------------------------------------------------
        leads_data = [
            {
                "name": "Enterprise HRIS & Payroll Mobile App",
                "company_name": "PT Mega Solusi Mandiri",
                "status": LeadStatus.QUALIFIED,
                "client_pic_name": "Rian Wicaksono",
                "client_pic_email": "rian@megasolusi.com",
                "client_pic_phone": "+62 813-1122-3344",
                "project_type": "Mobile Application & Cloud Backend",
                "source": "Direct Inbound",
                "opportunity_description": "Kebutuhan aplikasi absensi GPS, claim reimbursement, dan slip gaji digital untuk 2.500 karyawan.",
                "brief_notes": "Prioritas integrasi dengan sistem biometric fingerprint yang sudah terpasang di kantor cabang.",
                "client_references": [
                    {"id": "ref-1", "type": "LINK", "title": "Wireframe Alur Klaim", "content": "https://figma.com/file/demo-hris-flow"}
                ],
            },
            {
                "name": "AI Customer Service Chatbot",
                "company_name": "PT Telemedia Pintar",
                "status": LeadStatus.BRIEF_SCHEDULED,
                "client_pic_name": "Dina Astuti",
                "client_pic_email": "dina@telemedia.com",
                "client_pic_phone": "+62 818-7788-9900",
                "project_type": "AI NLP & WhatsApp Business API",
                "source": "Referral",
                "opportunity_description": "Automasi penanganan tiket komplain pelanggan menggunakan LLM dengan grounding knowledge base perusahaan.",
                "brief_notes": "SLA respon pesan harus di bawah 3 detik.",
                "client_references": [],
            },
            {
                "name": "Omnichannel POS & CRM",
                "company_name": "PT Retail Sukses Mandiri",
                "status": LeadStatus.CONVERTED,
                "client_id": clients_map["PT Retail Sukses Mandiri"].id,
                "converted_project_id": main_project.id,
                "client_pic_name": "Hendra Pratama",
                "client_pic_email": "hendra@retailsukses.com",
                "client_pic_phone": "+62 812-3456-7890",
                "project_type": "Web & Desktop POS",
                "source": "Existing Client Expansion",
                "opportunity_description": "Upgrade sistem kasir tradisional menjadi omnichannel retail platform.",
                "brief_notes": "Telah dikonversi menjadi workspace proyek PRJ-001.",
                "client_references": [],
            },
        ]

        for ld in leads_data:
            stmt = select(Lead).where(Lead.name == ld["name"])
            existing_lead = (await session.execute(stmt)).scalar_one_or_none()
            if not existing_lead:
                lead_obj = Lead(
                    name=ld["name"],
                    company_name=ld["company_name"],
                    status=ld["status"],
                    owner_id=pm_user.id,
                    client_id=ld.get("client_id"),
                    converted_project_id=ld.get("converted_project_id"),
                    client_pic_name=ld.get("client_pic_name"),
                    client_pic_email=ld.get("client_pic_email"),
                    client_pic_phone=ld.get("client_pic_phone"),
                    project_type=ld.get("project_type"),
                    source=ld.get("source"),
                    opportunity_description=ld.get("opportunity_description"),
                    brief_notes=ld.get("brief_notes"),
                    client_references=ld.get("client_references", []),
                )
                session.add(lead_obj)
                print(f"  [+] Created CRM lead: {ld['name']}")

        # ---------------------------------------------------------------------
        # 5. PROJECT MEMBERS (PRJ-001)
        # ---------------------------------------------------------------------
        members_map = {}
        members_data = [
            {"name": "Cahyo PM", "email": "pm@projectpilot.io", "role": "Lead Project Manager", "user_id": users_map["pm@projectpilot.io"].id},
            {"name": "Budi Engineer", "email": "dev@projectpilot.io", "role": "Backend Lead Engineer", "user_id": users_map["dev@projectpilot.io"].id},
            {"name": "Sinta Designer", "email": "designer@projectpilot.io", "role": "UI/UX Specialist", "user_id": users_map["designer@projectpilot.io"].id},
            {"name": "Rizky QA", "email": "rizky.qa@projectpilot.io", "role": "QA Automation Engineer", "user_id": None},
        ]

        for m in members_data:
            stmt = select(ProjectMember).where(
                (ProjectMember.project_id == main_project.id) & (ProjectMember.name == m["name"])
            )
            existing_member = (await session.execute(stmt)).scalar_one_or_none()
            if not existing_member:
                member_obj = ProjectMember(
                    project_id=main_project.id,
                    user_id=m["user_id"],
                    name=m["name"],
                    email=m["email"],
                    role=m["role"],
                    capacity_hours_per_week=40.0,
                )
                session.add(member_obj)
                await session.flush()
                members_map[m["name"]] = member_obj
                print(f"  [+] Added project member: {m['name']} to PRJ-001")
            else:
                members_map[m["name"]] = existing_member

        # ---------------------------------------------------------------------
        # 6. EPICS & FEATURES (PRJ-001)
        # ---------------------------------------------------------------------
        epics_map = {}
        epics_data = [
            {"key": "ARC-01", "title": "Core System Architecture & Microservices", "description": "Fondasi arsitektur cloud, database, API gateway, dan security auth."},
            {"key": "PAY-01", "title": "Payment Gateway & Multi-Channel Billing", "description": "Modul integrasi pembayaran QRIS, Virtual Account, Kartu Kredit, dan EDC."},
            {"key": "POS-01", "title": "Cashier Terminal & Offline Sync Engine", "description": "Aplikasi front-office kasir dengan kapabilitas transaksi tanpa koneksi internet."},
        ]

        for ep in epics_data:
            stmt = select(Epic).where((Epic.project_id == main_project.id) & (Epic.key == ep["key"]))
            existing_epic = (await session.execute(stmt)).scalar_one_or_none()
            if not existing_epic:
                epic_obj = Epic(
                    project_id=main_project.id,
                    key=ep["key"],
                    title=ep["title"],
                    description=ep["description"],
                    status="IN_PROGRESS",
                )
                session.add(epic_obj)
                await session.flush()
                epics_map[ep["key"]] = epic_obj
                print(f"  [+] Created epic: {ep['key']} - {ep['title']}")
            else:
                epics_map[ep["key"]] = existing_epic

        # ---------------------------------------------------------------------
        # 7. MILESTONES (PRJ-001)
        # ---------------------------------------------------------------------
        milestones_map = {}
        milestones_data = [
            {"key": "MLS-01", "title": "Kickoff & Architecture Blueprint Signoff", "target_date": today - timedelta(days=20), "status": MilestoneStatus.ACHIEVED},
            {"key": "MLS-02", "title": "Core Backend API & Database MVP", "target_date": today - timedelta(days=5), "status": MilestoneStatus.ACHIEVED},
            {"key": "MLS-03", "title": "Payment Gateway Integration & UAT", "target_date": today + timedelta(days=20), "status": MilestoneStatus.PLANNED},
            {"key": "MLS-04", "title": "Final Production Release & Handover", "target_date": today + timedelta(days=50), "status": MilestoneStatus.PLANNED},
        ]

        for ml in milestones_data:
            stmt = select(Milestone).where((Milestone.project_id == main_project.id) & (Milestone.key == ml["key"]))
            existing_ml = (await session.execute(stmt)).scalar_one_or_none()
            if not existing_ml:
                ml_obj = Milestone(
                    project_id=main_project.id,
                    key=ml["key"],
                    title=ml["title"],
                    target_date=ml["target_date"],
                    status=ml["status"],
                )
                session.add(ml_obj)
                await session.flush()
                milestones_map[ml["key"]] = ml_obj
                print(f"  [+] Created milestone: {ml['key']} - {ml['title']}")
            else:
                milestones_map[ml["key"]] = existing_ml

        # ---------------------------------------------------------------------
        # 8. REQUIREMENTS & DECISIONS (PRJ-001)
        # ---------------------------------------------------------------------
        requirements_data = [
            {
                "key": "REQ-001",
                "title": "Multi-Tenant Terminal Authentication",
                "description": "Setiap terminal POS harus terautentikasi dengan sertifikat unik dan token JWT dengan batas kedaluwarsa 24 jam.",
                "category": DiscoveryCategory.TECHNICAL,
                "status": RequirementStatus.APPROVED,
            },
            {
                "key": "REQ-002",
                "title": "Offline-First Local Storage Engine",
                "description": "Kasir harus tetap dapat memproses checkout transaksi saat internet terputus menggunakan local storage encrypted SQLite.",
                "category": DiscoveryCategory.TECHNICAL,
                "status": RequirementStatus.CONFIRMED,
            },
            {
                "key": "REQ-003",
                "title": "Dynamic QRIS & Payment Settlement API",
                "description": "Sistem wajib mendukung pembuatan QRIS dinamis secara real-time dengan status webhook otomatis dari payment provider.",
                "category": DiscoveryCategory.FUNCTIONAL,
                "status": RequirementStatus.APPROVED,
            },
        ]

        for req in requirements_data:
            stmt = select(Requirement).where((Requirement.project_id == main_project.id) & (Requirement.key == req["key"]))
            existing_req = (await session.execute(stmt)).scalar_one_or_none()
            if not existing_req:
                req_obj = Requirement(
                    project_id=main_project.id,
                    key=req["key"],
                    title=req["title"],
                    description=req["description"],
                    category=req["category"],
                    status=req["status"],
                    source_type=RequirementSourceType.MANUAL_PM,
                )
                session.add(req_obj)
                print(f"  [+] Created requirement: {req['key']}")

        decisions_data = [
            {
                "key": "DEC-001",
                "title": "Adopsi Arsitektur Microservices & Event Queue",
                "context": "Sistem monolithic lama mengalami bottleneck performa saat peak hours promo diskon.",
                "decision": "Menggunakan arsitektur FastAPI dengan asynchronous background worker dan event queue.",
                "status": DecisionStatus.ACCEPTED,
                "decided_by": "Cahyo PM",
            },
            {
                "key": "DEC-002",
                "title": "Pemilihan Provider Payment Gateway",
                "context": "Dibutuhkan payment aggregator yang mendukung multi-bank Virtual Account dan QRIS nasional.",
                "decision": "Menetapkan integrasi utama menggunakan REST webhook berkecepatan tinggi dengan fallback provider.",
                "status": DecisionStatus.ACCEPTED,
                "decided_by": "Cahyo PM",
            },
        ]

        for dec in decisions_data:
            stmt = select(Decision).where((Decision.project_id == main_project.id) & (Decision.key == dec["key"]))
            existing_dec = (await session.execute(stmt)).scalar_one_or_none()
            if not existing_dec:
                dec_obj = Decision(
                    project_id=main_project.id,
                    key=dec["key"],
                    title=dec["title"],
                    context=dec["context"],
                    decision=dec["decision"],
                    status=dec["status"],
                    decided_by=dec["decided_by"],
                )
                session.add(dec_obj)
                print(f"  [+] Created decision: {dec['key']}")

        # ---------------------------------------------------------------------
        # 9. TASKS (KANBAN & CROSS-PROJECT MY WORK)
        # ---------------------------------------------------------------------
        tasks_data = [
            {
                "key": "TSK-101",
                "title": "Setup Base Repository & CI/CD Pipeline Docker",
                "epic_key": "ARC-01",
                "status": TaskStatus.DONE,
                "priority": "HIGH",
                "estimated_hours": 16.0,
                "assignee_name": "Budi Engineer",
                "due_date": today - timedelta(days=18),
            },
            {
                "key": "TSK-102",
                "title": "Design Database Schema & Migration Scripts",
                "epic_key": "ARC-01",
                "status": TaskStatus.DONE,
                "priority": "HIGH",
                "estimated_hours": 24.0,
                "assignee_name": "Budi Engineer",
                "due_date": today - timedelta(days=12),
            },
            {
                "key": "TSK-103",
                "title": "Develop OAuth2 JWT & Role-Based Access Control",
                "epic_key": "ARC-01",
                "status": TaskStatus.DONE,
                "priority": "MEDIUM",
                "estimated_hours": 20.0,
                "assignee_name": "Budi Engineer",
                "due_date": today - timedelta(days=6),
            },
            {
                "key": "TSK-104",
                "title": "Integrasi Dynamic QRIS & Virtual Account Webhooks",
                "epic_key": "PAY-01",
                "status": TaskStatus.IN_PROGRESS,
                "priority": "CRITICAL",
                "estimated_hours": 32.0,
                "assignee_name": "Budi Engineer",
                "due_date": today + timedelta(days=5),
            },
            {
                "key": "TSK-105",
                "title": "Perancangan UI/UX Kasir Terminal Mobile & Tablet",
                "epic_key": "POS-01",
                "status": TaskStatus.IN_PROGRESS,
                "priority": "HIGH",
                "estimated_hours": 24.0,
                "assignee_name": "Sinta Designer",
                "due_date": today + timedelta(days=8),
            },
            {
                "key": "TSK-106",
                "title": "Implementasi SQLite Encrypted Local Offline Storage",
                "epic_key": "POS-01",
                "status": TaskStatus.BLOCKED,
                "priority": "HIGH",
                "estimated_hours": 40.0,
                "assignee_name": "Budi Engineer",
                "blocker_reason": "Menunggu konfirmasi arsitektur enkripsi data offline dari tim Information Security klien.",
                "due_date": today + timedelta(days=12),
            },
            {
                "key": "TSK-107",
                "title": "Driver Printer Thermal Bluetooth & Cetak Struk",
                "epic_key": "POS-01",
                "status": TaskStatus.READY,
                "priority": "MEDIUM",
                "estimated_hours": 16.0,
                "assignee_name": "Budi Engineer",
                "due_date": today + timedelta(days=15),
            },
            {
                "key": "TSK-108",
                "title": "End-to-End Automated Testing & Penetration Test",
                "epic_key": "ARC-01",
                "status": TaskStatus.BACKLOG,
                "priority": "MEDIUM",
                "estimated_hours": 30.0,
                "assignee_name": "Rizky QA",
                "due_date": today + timedelta(days=25),
            },
        ]

        for tk in tasks_data:
            stmt = select(Task).where((Task.project_id == main_project.id) & (Task.key == tk["key"]))
            existing_tk = (await session.execute(stmt)).scalar_one_or_none()
            if not existing_tk:
                epic_obj = epics_map[tk["epic_key"]]
                task_obj = Task(
                    project_id=main_project.id,
                    epic_id=epic_obj.id,
                    key=tk["key"],
                    title=tk["title"],
                    status=tk["status"],
                    priority=tk["priority"],
                    estimated_hours=tk["estimated_hours"],
                    assignee_name=tk["assignee_name"],
                    blocker_reason=tk.get("blocker_reason"),
                    due_date=tk["due_date"],
                )
                session.add(task_obj)
                print(f"  [+] Created task: {tk['key']} [{tk['status'].value}]")

        # ---------------------------------------------------------------------
        # 10. MINUTES OF MEETING (MoM)
        # ---------------------------------------------------------------------
        mom_sample_content = f"""# Minutes of Meeting (MoM): Rapat Koordinasi Teknis dan Desain (Internal)

**Tanggal:** {today.strftime('%d %B %Y')}  
**Waktu:** 14:00 - 15:30 WIB  
**Peserta:** Cahyo (PM), Budi (Backend Lead), Sinta (UI Designer), Rizky (QA)  
**Proyek:** [{main_project.code}] {main_project.name}

---

## 1. Ringkasan Eksekutif
Rapat koordinasi teknis mingguan membahas kemajuan modul integrasi Payment Gateway, review rancangan antarmuka POS mobile, dan evaluasi kendala keamanan enkripsi offline storage.

## 2. Poin Pembahasan Kunci
- **Modul Payment Gateway:** Integrasi API Dynamic QRIS telah mencapai progres 75%. Pengujian webhook staging dijadwalkan besok.
- **Desain UI/UX Kasir:** Sinta mempresentasikan alur pemindaian barcode cepat dan integrasi promo voucher diskon bertingkat.
- **Kendala Offline Storage:** Teridentifikasi kendala kebijakan security key token dari pihak klien. PM akan mengirimkan surat eskalasi resmi.

## 3. Tindak Lanjut (Action Items)
| No | Tindak Lanjut | PIC | Tenggat Waktu | Status |
|:---|:---|:---|:---|:---|
| 1 | Kirim spesifikasi enkripsi ke tim Infosec klien | Cahyo PM | {(today + timedelta(days=2)).strftime('%d %b %Y')} | In Progress |
| 2 | Selesaikan endpoint simulasi payment webhook | Budi Engineer | {(today + timedelta(days=4)).strftime('%d %b %Y')} | Open |
| 3 | Finalisasi high-fidelity prototype mobile POS | Sinta Designer | {(today + timedelta(days=5)).strftime('%d %b %Y')} | Open |

## 4. Keputusan yang Disepakati
1. Format receipt cetak thermal distandardisasi menggunakan lebar kertas 58mm dan 80mm.
2. Endpoint API public wajib menerapkan token rate-limiting maksimal 100 request/menit per IP terminal kasir.
"""

        stmt = select(MoMDocument).where(MoMDocument.mom_key == "MOM-2026-001")
        existing_mom = (await session.execute(stmt)).scalar_one_or_none()
        if not existing_mom:
            mom_obj = MoMDocument(
                mom_key="MOM-2026-001",
                title="Rapat Koordinasi Teknis dan Desain Lapangan",
                meeting_date=now,
                project_id=main_project.id,
                project_name=main_project.name,
                raw_text="Diskusi progres sprint payment gateway dan kendala offline storage bersama tim.",
                content_md=mom_sample_content,
                summary="Rapat koordinasi teknis mingguan menyepakati standardisasi printer thermal dan eskalasi security offline storage.",
                attendees=["Cahyo PM", "Budi Engineer", "Sinta Designer", "Rizky QA"],
                action_items=[
                    {"task": "Kirim spesifikasi enkripsi ke Infosec klien", "assignee": "Cahyo PM", "due_date": str(today + timedelta(days=2))},
                    {"task": "Selesaikan endpoint webhook payment", "assignee": "Budi Engineer", "due_date": str(today + timedelta(days=4))},
                ],
                decisions=[
                    "Format receipt cetak thermal distandardisasi 58mm dan 80mm.",
                    "Rate limiting 100 req/min diterapkan pada endpoint API POS.",
                ],
                created_by_user_id=pm_user.id,
            )
            session.add(mom_obj)
            print("  [+] Created MoM document: MOM-2026-001")

        # ---------------------------------------------------------------------
        # 11. REPORTS & FINAL DOCUMENTATION
        # ---------------------------------------------------------------------
        stmt = select(Report).where((Report.project_id == main_project.id) & (Report.report_key == "REP-001"))
        existing_rep = (await session.execute(stmt)).scalar_one_or_none()
        if not existing_rep:
            rep_obj = Report(
                project_id=main_project.id,
                report_key="REP-001",
                report_type=ReportType.WEEKLY_INTERNAL,
                reporting_period_start=today - timedelta(days=7),
                reporting_period_end=today,
                status=ReportStatus.FINAL,
                version=1,
                title="Laporan Mingguan Perkembangan Sprint W36",
                content=f"""# Laporan Mingguan Perkembangan Sprint W36

**Proyek:** {main_project.name} ({main_project.code})  
**Periode:** {(today - timedelta(days=7)).strftime('%d %B %Y')} s.d. {today.strftime('%d %B %Y')}  
**Status Kesehatan:** HEALTHY  

## 1. Sorotan Pengiriman
- 3 Task arsitektur inti selesai dikerjakan (`TSK-101`, `TSK-102`, `TSK-103`).
- Milestone `MLS-01` dan `MLS-02` telah tercapai tepat waktu.

## 2. Rencana Kerja Minggu Depan
- Menyelesaikan integrasi payment webhook QRIS.
- Melanjutkan perancangan UI/UX kasir POS terminal.
""",
                summary="Progres pengiriman sprint berjalan sesuai jadwal dengan 3 task arsitektur rampung.",
                created_by_user_id=pm_user.id,
                finalized_by_user_id=pm_user.id,
                finalized_at=now,
            )
            session.add(rep_obj)
            print("  [+] Created report: REP-001")

        stmt = select(GeneratedDocument).where(
            (GeneratedDocument.project_id == main_project.id) & (GeneratedDocument.document_key == "DOC-001")
        )
        existing_doc = (await session.execute(stmt)).scalar_one_or_none()
        if not existing_doc:
            doc_obj = GeneratedDocument(
                project_id=main_project.id,
                document_key="DOC-001",
                document_type=DocumentType.FSD,
                title="Functional Specification Document (FSD) - POS Omnichannel v1.0",
                status=DocumentStatus.FINAL,
                version=1,
                content=f"""# Functional Specification Document (FSD)
## Omnichannel POS & CRM Integration Platform

**Versi Dokumen:** 1.0 (Resmi)  
**Tanggal Pengesahan:** {today.strftime('%d %B %Y')}  
**Penyusun:** ProjectPilot System Architect Team  

---

### 1. Ruang Lingkup Sistem
Platform mencakup aplikasi Point-of-Sale (POS) untuk terminal kasir toko fisik dan backend terdistribusi yang mengelola katalog produk, stok inventaris, serta settlement transaksi keuangan.

### 2. Spesifikasi Fungsional Modul Kasir
1. **Otentikasi Kasir:** Kasir login menggunakan PIN 6-digit dengan penguncian otomatis setelah 5 menit inaktif.
2. **Katalog & Pemindaian Barcode:** Mendukung barcode 1D (EAN-13) dan QR Code 2D dengan waktu respon pembacaan < 200 milidetik.
3. **Multi-Payment Gateway:** Pemrosesan pembayaran tunai, QRIS dinamis, Debit/Kredit EDC, dan saldo loyalty point pelanggan.
4. **Offline Synchronization:** Sinkronisasi batch otomatis saat jaringan internet kembali stabil.

### 3. Kebutuhan Non-Fungsional
- **Availability:** 99.9% uptime selama jam operasional toko (07:00 - 23:00).
- **Security:** Seluruh data transaksi dienkripsi saat transit (TLS 1.3) dan saat tersimpan di database lokal (AES-256).
""",
                summary="Dokumen spesifikasi fungsional resmi platform kasir POS omnichannel dan integrasi perbankan.",
                created_by_user_id=pm_user.id,
                finalized_by_user_id=pm_user.id,
                finalized_at=now,
            )
            session.add(doc_obj)
            print("  [+] Created document: DOC-001 (FSD)")

        # Commit all transactions
        await session.commit()
        print("[Seed] Seeding completed successfully! All demo data is populated and persistent.")


if __name__ == "__main__":
    asyncio.run(seed_data())
