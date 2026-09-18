"""
Dedicated Seeding Script for Discovery & Scope Project (PRJ-004)
===============================================================
Seeds a realistic, high-quality project populated strictly up to
Discovery & Scope (Brief, Questions & Answers, Requirements, ADR Decisions, Scope Baseline).
No PRD, no Epics/Tasks, no Milestones, no MoM, no Reports are created.
"""

import asyncio
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from projectpilot.persistence.database import async_session_factory
from projectpilot.persistence.models import (
    ActivityEvent,
    Brief,
    Client,
    ClientAnswer,
    Decision,
    DecisionStatus,
    DiscoveryCategory,
    DiscoveryQuestion,
    DiscoveryQuestionStatus,
    Project,
    ProjectHealth,
    ProjectLifecycleStage,
    ProjectMember,
    Requirement,
    RequirementSourceType,
    RequirementStatus,
    ScopeItem,
    ScopeType,
    Stakeholder,
    User,
)


async def seed_discovery_project() -> None:
    async with async_session_factory() as session:
        print("[Seed Discovery] Starting seeding of PRJ-004 (Discovery & Scope only)...")

        # 1. Fetch PM user
        stmt_user = select(User).where(User.email == "pm@projectpilot.io")
        pm_user = (await session.execute(stmt_user)).scalar_one_or_none()
        if not pm_user:
            stmt_user = select(User).where(User.role.in_(["PROJECT_MANAGER", "ADMIN"]))
            pm_user = (await session.execute(stmt_user)).scalars().first()
            if not pm_user:
                raise RuntimeError("No Project Manager user found in database. Run main seed.py first.")

        stmt_dev = select(User).where(User.email == "dev@projectpilot.io")
        dev_user = (await session.execute(stmt_dev)).scalar_one_or_none()
        stmt_des = select(User).where(User.email == "designer@projectpilot.io")
        designer_user = (await session.execute(stmt_des)).scalar_one_or_none()

        # 2. Client & Stakeholders
        client_name = "PT Medika Digital Nusantara"
        stmt_client = select(Client).where(Client.company_name == client_name)
        client_obj = (await session.execute(stmt_client)).scalar_one_or_none()

        if not client_obj:
            client_obj = Client(
                name=client_name,
                company_name=client_name,
                industry="Healthcare & Healthtech",
                website="https://medikanusantara.id",
                primary_contact_name="dr. Farhan Gunawan, M.Kes",
                primary_contact_email="farhan@medikanusantara.id",
                primary_contact_phone="+62 811-9876-5432",
                notes="Jaringan klinik dan layanan kesehatan swasta yang meluncurkan platform telemedisin komprehensif terintegrasi SatuSehat Kemenkes dan e-Prescription farmasi rekanan.",
            )
            session.add(client_obj)
            await session.flush()

            sh1 = Stakeholder(
                client_id=client_obj.id,
                name="dr. Farhan Gunawan, M.Kes",
                role="Chief Medical Officer",
                email="farhan@medikanusantara.id",
                phone="+62 811-9876-5432",
                decision_authority="Sponsor Klinis & Regulasi Kemenkes",
            )
            sh2 = Stakeholder(
                client_id=client_obj.id,
                name="Indra Kusuma",
                role="VP of Digital Health Product",
                email="indra.k@medikanusantara.id",
                phone="+62 812-4455-6677",
                decision_authority="Product Owner & Sign-off PRD",
            )
            session.add_all([sh1, sh2])
            print(f"  [+] Created client: {client_name}")
        else:
            print(f"  [*] Existing client found: {client_name}")

        # 3. Project PRJ-004
        project_code = "PRJ-004"
        stmt_proj = select(Project).where(Project.code == project_code)
        proj_obj = (await session.execute(stmt_proj)).scalar_one_or_none()

        now = datetime.now(timezone.utc)
        today = now.date()

        if not proj_obj:
            proj_obj = Project(
                code=project_code,
                name="Telemedicine & Electronic Prescription Platform",
                description="Pengembangan platform konsultasi medis daring terenkripsi, integrasi resep elektronik dengan apotek rekanan, serta bridging data rekam medis ke SatuSehat Kemenkes.",
                client_id=client_obj.id,
                owner_id=pm_user.id,
                lifecycle_stage=ProjectLifecycleStage.DISCOVERY,
                health=ProjectHealth.HEALTHY,
                start_date=today - timedelta(days=7),
                target_completion_date=today + timedelta(days=75),
            )
            session.add(proj_obj)
            await session.flush()

            event = ActivityEvent(
                project_id=proj_obj.id,
                actor_id=pm_user.id,
                event_type="PROJECT_CREATED",
                description=f"Inisiasi proyek {proj_obj.code} ({proj_obj.name}) dibuat dan masuk tahap Discovery & Scope.",
                event_metadata={"initial_stage": proj_obj.lifecycle_stage.value},
            )
            session.add(event)
            print(f"  [+] Created project: {project_code} ({proj_obj.name})")
        else:
            print(f"  [*] Existing project found: {project_code}")

        # 4. Project Members
        members_data = [
            {"name": "Cahyo PM", "email": "pm@projectpilot.io", "role": "Lead Project Manager", "user_id": pm_user.id},
            {"name": "Budi Engineer", "email": "dev@projectpilot.io", "role": "Backend & Cloud Architect", "user_id": dev_user.id if dev_user else None},
            {"name": "Sinta Designer", "email": "designer@projectpilot.io", "role": "UI/UX Specialist", "user_id": designer_user.id if designer_user else None},
            {"name": "dr. Farhan Gunawan", "email": "farhan@medikanusantara.id", "role": "Medical & Clinical Advisor", "user_id": None},
        ]

        for m in members_data:
            stmt_mem = select(ProjectMember).where(
                (ProjectMember.project_id == proj_obj.id) & (ProjectMember.name == m["name"])
            )
            existing_mem = (await session.execute(stmt_mem)).scalar_one_or_none()
            if not existing_mem:
                mem_obj = ProjectMember(
                    project_id=proj_obj.id,
                    user_id=m["user_id"],
                    name=m["name"],
                    email=m["email"],
                    role=m["role"],
                    capacity_hours_per_week=40.0,
                )
                session.add(mem_obj)
                print(f"  [+] Added member: {m['name']}")

        # 5. Brief
        stmt_brief = select(Brief).where(Brief.project_id == proj_obj.id)
        existing_brief = (await session.execute(stmt_brief)).scalar_one_or_none()

        if not existing_brief:
            brief_obj = Brief(
                project_id=proj_obj.id,
                objective="Membangun platform telemedisin komprehensif bagi pasien untuk berkonsultasi dengan dokter spesialis secara real-time melalui video call WebRTC terenkripsi, penerbitan resep obat digital (e-Prescription) bertanda tangan elektronik, dan pengiriman obat langsung dari apotek mitra dalam waktu 2 jam.",
                business_context="Klien ingin memperluas jangkauan layanan kesehatan di luar jam operasional poliklinik fisik dan memenuhi mandat integrasi rekam medis elektronik SatuSehat Kemenkes RI sesuai Permenkes No. 24 Tahun 2022. Target awal adalah 10.000 konsultasi per bulan dengan 50 dokter spesialis terverifikasi.",
                intended_users="1. Pasien umum (mobile-first responsive web).\n2. Dokter spesialis ber-SIP aktif (web portal konsultasi & pencatatan RME).\n3. Apoteker instalasi farmasi rekanan (order fulfillment & verifikasi resep).\n4. Admin operasional klinik (manajemen jadwal dokter, tarif, dan rekonsiliasi pembayaran).",
                expected_functionality="- Pendaftaran akun & verifikasi identitas (KYC) dengan NIK Dukcapil.\n- Booking jadwal konsultasi & pembayaran multi-channel terintegrasi (VA, QRIS, Kartu Kredit, e-Wallet).\n- Ruang konsultasi virtual aman berbasis WebRTC dengan fitur chat, upload hasil lab PDF/gambar, dan video call HD.\n- Modul e-Prescription dengan pencarian obat otomatis, dosis template standar Kemenkes, dan digital signature QR dokter.\n- Sistem dispatch order obat ke jaringan apotek rekanan terdekat dengan integrasi kurir instan API.\n- Integrasi bridging rekam medis elektronik (RME) format HL7 FHIR JSON ke platform SatuSehat Kemenkes.",
                constraints="- Wajib mematuhi regulasi privasi data medis (UU PDP No. 27/2022) dan standar enkripsi data at rest (AES-256) serta in transit (TLS 1.3).\n- Layanan video call harus tetap stabil pada bandwidth minimum jaringan seluler 3G/4G (300 kbps).\n- Tenggat waktu MVP adalah 3 bulan untuk peluncuran pilot project di area Jabodetabek.",
                known_integrations="- SatuSehat Kemenkes (HL7 FHIR REST API)\n- Payment Gateway (Midtrans / Xendit)\n- Kurir Pengiriman Instan (GrabExpress / GoSend API)\n- Digital Signature Provider (BSrE / PrivyID)\n- Video Signaling Server (LiveKit SFU Engine)",
                raw_content="Catatan Diskusi Awal Client Briefing:\nPain point utama pasien saat ini adalah antrean obat di apotek setelah konsultasi yang memakan waktu hingga 90 menit. Solusi telemedisin ini harus memotong proses tersebut menjadi otomatis: dokter meresepkan -> apotek meracik -> kurir menjemput -> pasien menerima obat di rumah tanpa perlu keluar rumah.",
            )
            session.add(brief_obj)
            print(f"  [+] Created Brief for {project_code}")

        # 6. Discovery Questions & Client Answers
        questions_data = [
            {
                "category": DiscoveryCategory.BUSINESS,
                "question": "Berapa target volume konsultasi harian pada fase pilot MVP dan bagaimana model bagi hasil (fee sharing) antara dokter dan platform?",
                "rationale": "Menentukan kapasitas server telemedisin dan struktur modul billing serta perhitungan pajak otomatis.",
                "priority": "HIGH",
                "order_index": 1,
                "answer": "Target awal adalah 250-300 konsultasi/hari selama 3 bulan pertama di wilayah Jabodetabek. Skema revenue sharing adalah 80% untuk dokter dan 20% biaya platform (platform fee). Sistem harus otomatis menghitung pemotongan pajak PPh 21.",
                "respondent_name": "Indra Kusuma",
                "respondent_role": "VP of Digital Health Product",
            },
            {
                "category": DiscoveryCategory.TECHNICAL,
                "question": "Apakah bridging dengan rekam medis SatuSehat Kemenkes bersifat synchronous real-time atau background asynchronous queue?",
                "rationale": "Mencegah terjadinya blocking UI atau response timeout pada portal dokter jika server Kemenkes sedang mengalami beban tinggi.",
                "priority": "HIGH",
                "order_index": 2,
                "answer": "Gunakan asynchronous message queue (Redis worker). Saat konsultasi selesai dan rekam medis ditutup, sistem melakukan push FHIR payload ke Kemenkes secara background dengan mekanisme automatic retry hingga 3x jika server Kemenkes timeout.",
                "respondent_name": "Indra Kusuma",
                "respondent_role": "VP of Digital Health Product",
            },
            {
                "category": DiscoveryCategory.FUNCTIONAL,
                "question": "Bagaimana alur validasi jika obat yang diresepkan dokter ternyata stoknya habis di apotek mitra pertama yang ditunjuk?",
                "rationale": "Menentukan alur fallback dispatch resep dan notifikasi perubahan obat ke pasien dan dokter.",
                "priority": "HIGH",
                "order_index": 3,
                "answer": "Sistem wajib memiliki fallback routing otomatis ke apotek mitra terdekat berikutnya dalam radius 5 km. Jika seluruh apotek terdekat kehabisan stok, dokter dan pasien menerima notifikasi alternatif obat sejenis (substitusi generik) yang memerlukan konfirmasi ulang dokter.",
                "respondent_name": "dr. Farhan Gunawan, M.Kes",
                "respondent_role": "Chief Medical Officer",
            },
            {
                "category": DiscoveryCategory.SECURITY,
                "question": "Bagaimana kebijakan penyimpanan rekaman video sesi konsultasi dan perlindungan berkas rekam medis pasien?",
                "rationale": "Memenuhi kepatuhan UU Perlindungan Data Pribadi (UU PDP) dan etika kerahasiaan medis kedokteran.",
                "priority": "HIGH",
                "order_index": 4,
                "answer": "Sesuai regulasi UU PDP dan standar medis, video konsultasi TIDAK direkam demi menjaga privasi pasien (hanya log durasi dan status koneksi). Berkas PDF lab dan foto penunjang dienkripsi menggunakan AES-256 dengan signed URL sementara (TTL maksimal 15 menit).",
                "respondent_name": "dr. Farhan Gunawan, M.Kes",
                "respondent_role": "Chief Medical Officer",
            },
            {
                "category": DiscoveryCategory.UX,
                "question": "Apakah dokter membutuhkan template resep cepat untuk penyakit-penyakit yang umum ditemui di layanan primer?",
                "rationale": "Mempercepat waktu penulisan resep oleh dokter agar konsultasi selesai dalam batas waktu yang efektif.",
                "priority": "MEDIUM",
                "order_index": 5,
                "answer": "Ya, ini sangat krusial agar dokter bisa meresepkan dalam waktu kurang dari 30 detik. Buat fitur 'Paket Obat Favorit' dan 'Template Dosis Cepat' berdasarkan spesialisasi masing-masing dokter.",
                "respondent_name": "dr. Farhan Gunawan, M.Kes",
                "respondent_role": "Chief Medical Officer",
            },
            {
                "category": DiscoveryCategory.INTEGRATION,
                "question": "Mekanisme legal digital signature seperti apa yang disepakati untuk validitas lembar resep elektronik?",
                "rationale": "Menjamin legalitas resep digital di mata apotek dan mematuhi standar BPOM.",
                "priority": "HIGH",
                "order_index": 6,
                "answer": "Kami menyepakati implementasi QR code verifikasi keaslian dokumen pada lembar resep PDF yang tertaut ke hash sertifikat elektronik BSrE / PrivyID dokter.",
                "respondent_name": "Indra Kusuma",
                "respondent_role": "VP of Digital Health Product",
            },
        ]

        for q_data in questions_data:
            stmt_q = select(DiscoveryQuestion).where(
                (DiscoveryQuestion.project_id == proj_obj.id) & (DiscoveryQuestion.question == q_data["question"])
            )
            existing_q = (await session.execute(stmt_q)).scalar_one_or_none()
            if not existing_q:
                q_obj = DiscoveryQuestion(
                    project_id=proj_obj.id,
                    category=q_data["category"],
                    question=q_data["question"],
                    rationale=q_data["rationale"],
                    priority=q_data["priority"],
                    status=DiscoveryQuestionStatus.ANSWERED,
                    order_index=q_data["order_index"],
                )
                session.add(q_obj)
                await session.flush()

                ans_obj = ClientAnswer(
                    question_id=q_obj.id,
                    answer_text=q_data["answer"],
                    respondent_name=q_data["respondent_name"],
                    respondent_role=q_data["respondent_role"],
                    source="Discovery Workshop & Written Questionnaire",
                    answered_at=now - timedelta(days=2),
                )
                session.add(ans_obj)
                print(f"  [+] Created question ({q_data['category'].value}) with client answer")

        # 7. Requirements
        requirements_data = [
            {
                "key": "REQ-001",
                "title": "Otentikasi Pasien & Verifikasi NIK SatuSehat",
                "description": "Sistem wajib menyediakan registrasi dan login pasien dengan OTP WhatsApp/SMS serta verifikasi nomor NIK melalui API Kemenkes/Dukcapil.",
                "category": DiscoveryCategory.FUNCTIONAL,
                "priority": "HIGH",
                "status": RequirementStatus.APPROVED,
                "source_type": RequirementSourceType.MANUAL_PM,
                "acceptance_criteria": "Pasien berhasil login, profil terhubung dengan Patient ID SatuSehat, dan data identitas terenkripsi.",
            },
            {
                "key": "REQ-002",
                "title": "Virtual Consultation Room via WebRTC Audio/Video",
                "description": "Ruang konsultasi telemedisin real-time dengan WebRTC SFU yang mendukung video call HD, end-to-end encryption DTLS-SRTP, dan automatic fallback ke audio-only saat koneksi buruk.",
                "category": DiscoveryCategory.FUNCTIONAL,
                "priority": "HIGH",
                "status": RequirementStatus.APPROVED,
                "source_type": RequirementSourceType.MANUAL_PM,
                "acceptance_criteria": "Latency video < 400ms, packet loss concealment aktif, dan status koneksi ditampilkan secara transparan kepada dokter dan pasien.",
            },
            {
                "key": "REQ-003",
                "title": "E-Prescription Builder & Dosis Catalog Kemenkes",
                "description": "Modul penyusunan resep digital oleh dokter dengan pencarian obat berbasis formularium Kemenkes, template dosis favorit, dan QR code digital signature.",
                "category": DiscoveryCategory.FUNCTIONAL,
                "priority": "HIGH",
                "status": RequirementStatus.APPROVED,
                "source_type": RequirementSourceType.CLIENT_ANSWER,
                "acceptance_criteria": "Dokter dapat membuat resep dalam < 30 detik, terbit PDF resep dengan QR hash verifikasi legal yang dapat divalidasi apotek.",
            },
            {
                "key": "REQ-004",
                "title": "Auto-Routing Order Resep ke Apotek Mitra Terdekat",
                "description": "Sistem mencocokkan ketersediaan obat dengan apotek mitra dalam radius 5 km, mengunci stok obat (stock reservation), dan menerbitkan dispatch order kurir instan.",
                "category": DiscoveryCategory.FUNCTIONAL,
                "priority": "HIGH",
                "status": RequirementStatus.APPROVED,
                "source_type": RequirementSourceType.CLIENT_ANSWER,
                "acceptance_criteria": "Apotek terdekat menerima order dalam waktu < 10 detik setelah pembayaran lunas; jika stok kosong otomatis fallback ke apotek berikutnya.",
            },
            {
                "key": "REQ-005",
                "title": "Bridging HL7 FHIR Rekam Medis ke SatuSehat",
                "description": "Integrasi backend asynchronous untuk mengirimkan data ringkasan konsultasi (Encounter, Condition, MedicationRequest) ke gateway SatuSehat Kemenkes menggunakan standar HL7 FHIR.",
                "category": DiscoveryCategory.TECHNICAL,
                "priority": "HIGH",
                "status": RequirementStatus.APPROVED,
                "source_type": RequirementSourceType.CLIENT_ANSWER,
                "acceptance_criteria": "Background queue mengirim payload FHIR dengan retry mechanism 3x; respon sukses Kemenkes tersimpan di audit log.",
            },
            {
                "key": "REQ-006",
                "title": "Enkripsi Berkas Medis AES-256 & Expiring Signed URL",
                "description": "Semua berkas penunjang medis (hasil lab PDF, foto radiologi) disimpan dengan enkripsi server-side AES-256 dan hanya dapat diakses melalui signed URL bertempo 15 menit.",
                "category": DiscoveryCategory.SECURITY,
                "priority": "HIGH",
                "status": RequirementStatus.APPROVED,
                "source_type": RequirementSourceType.CLIENT_ANSWER,
                "acceptance_criteria": "URL berkas tidak dapat diakses publik secara langsung dan kedaluwarsa setelah 15 menit.",
            },
            {
                "key": "REQ-007",
                "title": "Rekonsiliasi Pembayaran & Split Fee Otomatis",
                "description": "Modul keuangan yang memproses pembayaran konsultasi dan obat, kemudian memisahkan pembagian fee dokter 80% dan platform fee 20% dikurangi potongan pajak PPh 21.",
                "category": DiscoveryCategory.FUNCTIONAL,
                "priority": "MEDIUM",
                "status": RequirementStatus.CONFIRMED,
                "source_type": RequirementSourceType.CLIENT_ANSWER,
                "acceptance_criteria": "Laporan rekonsiliasi harian terbit otomatis dan saldo wallet dokter ter-update setelah sesi konsultasi selesai.",
            },
        ]

        for req in requirements_data:
            stmt_req = select(Requirement).where(
                (Requirement.project_id == proj_obj.id) & (Requirement.key == req["key"])
            )
            existing_req = (await session.execute(stmt_req)).scalar_one_or_none()
            if not existing_req:
                req_obj = Requirement(
                    project_id=proj_obj.id,
                    key=req["key"],
                    title=req["title"],
                    description=req["description"],
                    category=req["category"],
                    priority=req["priority"],
                    status=req["status"],
                    source_type=req["source_type"],
                    acceptance_criteria=req["acceptance_criteria"],
                )
                session.add(req_obj)
                print(f"  [+] Created requirement: {req['key']} - {req['title']}")

        # 8. Decisions (ADR)
        decisions_data = [
            {
                "key": "DEC-001",
                "title": "Adopsi LiveKit SFU Engine untuk WebRTC Audio/Video",
                "context": "Konsultasi medis daring membutuhkan latensi audio/video yang sangat rendah (< 400ms) dengan stabilitas tinggi pada koneksi internet seluler Indonesia.",
                "decision": "Menggunakan LiveKit SFU (Selective Forwarding Unit) dengan enkripsi DTLS-SRTP, adaptive bitrate, dan automatic fallback ke audio-only saat bandwidth turun di bawah 150 kbps.",
                "rationale": "LiveKit memiliki performa tinggi, SDK open source yang lengkap untuk web/mobile, serta mendukung self-hosted deployment demi kepatuhan kedaulatan data kesehatan.",
                "implications": "Tim engineering perlu menyiapkan server signaling dan media node dengan bandwidth unmetered.",
                "status": DecisionStatus.ACCEPTED,
                "decided_by": "Cahyo PM",
            },
            {
                "key": "DEC-002",
                "title": "Arsitektur Asynchronous Message Queue untuk Bridging SatuSehat",
                "context": "API Gateway SatuSehat Kemenkes berpotensi mengalami latency spike atau downtime berkala, sehingga pemanggilan langsung (synchronous HTTP) dapat membekukan portal dokter.",
                "decision": "Menerapkan Redis background task worker dengan mekanisme exponential backoff retry (maksimal 3 kali percobaan) saat mengirimkan dokumen rekam medis FHIR ke Kemenkes.",
                "rationale": "Menjamin user experience dokter tetap lancar tanpa terganggu keterlambatan respon dari pihak eksternal pemerintah.",
                "implications": "Diperlukan tabel audit log untuk memantau status antrean bridging yang tertunda (pending / failed retry).",
                "status": DecisionStatus.ACCEPTED,
                "decided_by": "Cahyo PM",
            },
            {
                "key": "DEC-003",
                "title": "Kebijakan Privasi Zero Video Recording",
                "context": "Kepatuhan terhadap UU Perlindungan Data Pribadi (UU PDP No. 27/2022) dan etika kerahasiaan medis dokter-pasien.",
                "decision": "Sistem secara arsitektural tidak menyediakan fasilitas penyimpanan rekaman video; hanya metadata sesi (durasi, timestamp, ID dokter & pasien) yang disimpan untuk kebutuhan audit trail medikolegal.",
                "rationale": "Menghilangkan risiko kebocoran rekaman video medis sensitif pasien dan menekan biaya storage cloud secara signifikan.",
                "implications": "Fitur playback konsultasi tidak tersedia; dokter wajib menuliskan resume konsultasi secara tertulis pada lembar rekam medis elektronik.",
                "status": DecisionStatus.ACCEPTED,
                "decided_by": "Cahyo PM",
            },
        ]

        for dec in decisions_data:
            stmt_dec = select(Decision).where(
                (Decision.project_id == proj_obj.id) & (Decision.key == dec["key"])
            )
            existing_dec = (await session.execute(stmt_dec)).scalar_one_or_none()
            if not existing_dec:
                dec_obj = Decision(
                    project_id=proj_obj.id,
                    key=dec["key"],
                    title=dec["title"],
                    context=dec["context"],
                    decision=dec["decision"],
                    rationale=dec["rationale"],
                    implications=dec["implications"],
                    status=dec["status"],
                    decided_by=dec["decided_by"],
                    decided_at=now - timedelta(days=1),
                )
                session.add(dec_obj)
                print(f"  [+] Created decision: {dec['key']} - {dec['title']}")

        # 9. Scope Items (In Scope & Out of Scope)
        scope_items_data = [
            {
                "title": "Aplikasi Web Portal Pasien & Dokter Spesialis (Responsive Mobile-First)",
                "description": "Antarmuka berbasis web responsif untuk registrasi, penjadwalan, pembayaran, dan konsultasi interaktif.",
                "scope_type": ScopeType.IN_SCOPE,
                "rationale": "Fondasi utama interaksi pengguna tanpa mewajibkan download aplikasi di awal bagi pasien.",
            },
            {
                "title": "Modul Konsultasi Video & Chat Real-Time Berbasis WebRTC",
                "description": "Ruang virtual aman dengan enkripsi data, penyesuaian resolusi adaptif, dan fitur kirim berkas hasil lab.",
                "scope_type": ScopeType.IN_SCOPE,
                "rationale": "Fitur inti telemedisin yang harus dapat diandalkan pada koneksi internet seluler.",
            },
            {
                "title": "Generator Resep Elektronik (e-Prescription) dengan Digital Signature QR",
                "description": "Pembuatan resep obat terstandarisasi dengan template cepat dan QR code verifikasi legal.",
                "scope_type": ScopeType.IN_SCOPE,
                "rationale": "Kebutuhan utama dokter untuk meresepkan obat secara legal dan cepat.",
            },
            {
                "title": "Integrasi Dispatch Pengiriman Obat Apotek Mitra via Instant Courier API",
                "description": "Sistem reservasi stok di apotek rekanan terdekat (radius 5 km) dan dispatch kurir instan otomatis.",
                "scope_type": ScopeType.IN_SCOPE,
                "rationale": "Menyelesaikan pain point antrean obat pasien dengan pengantaran langsung ke alamat rumah.",
            },
            {
                "title": "Bridging HL7 FHIR Rekam Medis Elektronik ke SatuSehat Kemenkes",
                "description": "Konektor backend asynchronous untuk mengirim ringkasan encounter konsultasi ke SatuSehat.",
                "scope_type": ScopeType.IN_SCOPE,
                "rationale": "Mandat regulasi Kemenkes RI yang wajib dipenuhi oleh seluruh fasilitas kesehatan.",
            },
            {
                "title": "Payment Gateway Multi-Channel (Virtual Account, QRIS, E-Wallet)",
                "description": "Pemrosesan pembayaran biaya konsultasi dan pembelian obat melalui payment gateway terintegrasi.",
                "scope_type": ScopeType.IN_SCOPE,
                "rationale": "Memudahkan transaksi pasien secara instan dengan verifikasi otomatis.",
            },
            {
                "title": "Penyimpanan dan Streaming Rekaman Video Konsultasi (Zero Video Recording)",
                "description": "Perekaman visual dan audio selama sesi konsultasi berlangsung.",
                "scope_type": ScopeType.OUT_OF_SCOPE,
                "rationale": "Dikecualikan demi kepatuhan privasi pasien UU PDP dan pencegahan kebocoran data sensitif.",
            },
            {
                "title": "Integrasi Klaim Asuransi BPJS Kesehatan Fase 1",
                "description": "Bridging klaim BPJS Kesehatan VClaim / P-Care.",
                "scope_type": ScopeType.OUT_OF_SCOPE,
                "rationale": "Akan dikembangkan pada ekspansi Fase 2 setelah MVP layanan pasien umum mandiri stabil.",
            },
            {
                "title": "Modul Rawat Inap & Manajemen Bed Rumah Sakit Fisik",
                "description": "Pengelolaan kamar inap dan jadwal operasi fisik di gedung rumah sakit.",
                "scope_type": ScopeType.OUT_OF_SCOPE,
                "rationale": "Fokus MVP murni pada layanan konsultasi rawat jalan jarak jauh (outpatient telemedicine).",
            },
            {
                "title": "Pengiriman Obat Rantai Dingin (Cold-Chain / Vaksin) Antar Pulau",
                "description": "Logistik khusus suhu terkontrol untuk vaksin dan produk biologis.",
                "scope_type": ScopeType.OUT_OF_SCOPE,
                "rationale": "Fase 1 dibatasi pada obat-obatan sediaan umum oral/topikal dalam area jangkauan kurir instan kota.",
            },
        ]

        for sc in scope_items_data:
            stmt_sc = select(ScopeItem).where(
                (ScopeItem.project_id == proj_obj.id) & (ScopeItem.title == sc["title"])
            )
            existing_sc = (await session.execute(stmt_sc)).scalar_one_or_none()
            if not existing_sc:
                sc_obj = ScopeItem(
                    project_id=proj_obj.id,
                    title=sc["title"],
                    description=sc["description"],
                    scope_type=sc["scope_type"],
                    rationale=sc["rationale"],
                )
                session.add(sc_obj)
                print(f"  [+] Created scope item: [{sc['scope_type'].value}] {sc['title']}")

        # Commit all changes
        await session.commit()
        print(f"\n[Seed Discovery] Successfully seeded project '{project_code}' ({proj_obj.name})!")
        print("  Lifecycle Stage : DISCOVERY")
        print("  Discovery Data  : Brief, 6 Questions with Answers, 7 Requirements, 3 ADR Decisions, 10 Scope Items")
        print("  PRD Document    : ZERO (Ready to test PRD generation)")
        print("  Work/Tasks      : ZERO (Clean slate for post-PRD testing)")


if __name__ == "__main__":
    asyncio.run(seed_discovery_project())
