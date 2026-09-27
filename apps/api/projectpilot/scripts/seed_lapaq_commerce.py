"""
Dedicated Seeding Script for Lapaq Multi-Store Commerce Platform (PRJ-005)
==========================================================================
Seeds a comprehensive, realistic multi-store commerce project specifically
designed to validate the ProjectHub document generation pipeline, especially the
FSD evidence resolver and FSD prompt contracts.

Follows the real project lifecycle from Discovery through Delivery with a mixture of:
- Authoritative (CONFIRMED/APPROVED) and excluded (DRAFT/REJECTED/SUPERSEDED) requirements
- Mapped and intentionally unmapped Features
- Qualifying DONE tasks and non-qualifying/unlinked/archived tasks
- Accepted and non-accepted Decisions
- Approved, implemented, and pending/rejected ScopeChanges
- Real issues, risks, blockers, client dependencies, meetings, and delivery milestones.
"""

import asyncio
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from projectpilot.persistence.database import async_session_factory
from projectpilot.persistence.models import (
    ActionItem,
    ActionItemStatus,
    ActivityEvent,
    Blocker,
    BlockerStatus,
    Brief,
    Client,
    ClientAnswer,
    ClientDependency,
    ClientDependencyStatus,
    Decision,
    DecisionStatus,
    DeliverableStatus,
    DiscoveryCategory,
    DiscoveryQuestion,
    DiscoveryQuestionStatus,
    Epic,
    Feature,
    Issue,
    IssueStatus,
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
    ProjectResource,
    Requirement,
    RequirementSourceType,
    RequirementStatus,
    ResourceStatus,
    ResourceType,
    Risk,
    RiskStatus,
    ScopeChange,
    ScopeChangeStatus,
    ScopeItem,
    ScopeType,
    Stakeholder,
    Task,
    TaskStatus,
    User,
    UserRole,
)


async def seed_lapaq_commerce_project(session: Optional[AsyncSession] = None) -> None:
    if session is None:
        async with async_session_factory() as new_session:
            await _run_seed_lapaq(new_session)
    else:
        await _run_seed_lapaq(session)


async def _run_seed_lapaq(session: AsyncSession) -> None:
    print("[Seed Lapaq] Starting seeding of PRJ-005 (Lapaq Multi-Store Commerce Platform)...")
    now = datetime.now(timezone.utc)
    today = date.today()

    # -------------------------------------------------------------------------
    # 1. FETCH OR CREATE REQUIRED USERS
    # -------------------------------------------------------------------------
    stmt_user = select(User).where(User.email == "pm@projectpilot.io")
    pm_user = (await session.execute(stmt_user)).scalar_one_or_none()
    if not pm_user:
        stmt_user = select(User).where(User.role.in_([UserRole.PROJECT_MANAGER, UserRole.ADMIN]))
        pm_user = (await session.execute(stmt_user)).scalars().first()
        if not pm_user:
            raise RuntimeError("No Project Manager user found in database. Run main seed.py first.")

    stmt_dev = select(User).where(User.email == "dev@projectpilot.io")
    dev_user = (await session.execute(stmt_dev)).scalar_one_or_none()
    stmt_des = select(User).where(User.email == "designer@projectpilot.io")
    designer_user = (await session.execute(stmt_des)).scalar_one_or_none()

    # -------------------------------------------------------------------------
    # 2. CLIENT & STAKEHOLDERS
    # -------------------------------------------------------------------------
    client_name = "PT Lapaq Digital Niaga"
    stmt_client = select(Client).where(Client.company_name == client_name)
    client_obj = (await session.execute(stmt_client)).scalar_one_or_none()

    if not client_obj:
        client_obj = Client(
            name="Lapaq Digital Niaga",
            company_name=client_name,
            industry="E-Commerce & Retail Technology",
            website="https://lapaq.id",
            primary_contact_name="Bambang Sudiro",
            primary_contact_email="bambang.sudiro@lapaq.id",
            primary_contact_phone="+62 812-8899-0011",
            notes="Platform multi-store commerce mandiri bagi merchant UMKM dan brand lokal untuk mengelola katalog, inventaris, dan checkout mandiri.",
        )
        session.add(client_obj)
        await session.flush()

        sh1 = Stakeholder(
            client_id=client_obj.id,
            name="Bambang Sudiro",
            role="Managing Director",
            email="bambang.sudiro@lapaq.id",
            phone="+62 812-8899-0011",
            decision_authority="Sponsor Eksekutif & Pemilik Anggaran",
        )
        sh2 = Stakeholder(
            client_id=client_obj.id,
            name="Dewi Lestari",
            role="Head of Product & Merchant Experience",
            email="dewi.lestari@lapaq.id",
            phone="+62 813-7766-5544",
            decision_authority="Product Owner & Sign-off Kebutuhan Fungsional (FSD)",
        )
        sh3 = Stakeholder(
            client_id=client_obj.id,
            name="Ahmad Fadillah",
            role="Lead Solutions Architect",
            email="ahmad.f@lapaq.id",
            phone="+62 811-3322-1100",
            decision_authority="Reviewer Arsitektur & Keamanan Pembayaran",
        )
        session.add_all([sh1, sh2, sh3])
        print(f"  [+] Created client & stakeholders: {client_name}")
    else:
        print(f"  [*] Existing client found: {client_name}")

    # -------------------------------------------------------------------------
    # 3. PROJECT (PRJ-005)
    # -------------------------------------------------------------------------
    project_code = "PRJ-005"
    stmt_proj = select(Project).where(Project.code == project_code)
    project = (await session.execute(stmt_proj)).scalar_one_or_none()

    if not project:
        project = Project(
            code=project_code,
            name="Lapaq Multi-Store Commerce Platform",
            description="Pengembangan platform e-commerce multi-store komprehensif yang memfasilitasi multi-merchant untuk mengelola toko, katalog produk, varian, inventaris multi-lokasi, keranjang belanja, checkout terintegrasi payment gateway, pengiriman kurir lokal, dan analitik penjualan dalam satu ekosistem terpadu.",
            client_id=client_obj.id,
            owner_id=pm_user.id,
            lifecycle_stage=ProjectLifecycleStage.ACTIVE_DELIVERY,
            health=ProjectHealth.WATCH,
            start_date=today - timedelta(days=45),
            target_completion_date=today + timedelta(days=45),
        )
        session.add(project)
        await session.flush()

        event = ActivityEvent(
            project_id=project.id,
            actor_id=pm_user.id,
            event_type="PROJECT_CREATED",
            description=f"Inisiasi proyek {project.code} ({project.name}) berhasil didaftarkan.",
            event_metadata={"initial_stage": project.lifecycle_stage.value},
        )
        session.add(event)
        print(f"  [+] Created project: {project.code} - {project.name}")
    else:
        print(f"  [*] Existing project found: {project.code}")

    # -------------------------------------------------------------------------
    # 4. PROJECT MEMBERS
    # -------------------------------------------------------------------------
    members_data = [
        {"name": "Cahyo PM", "email": "pm@projectpilot.io", "role": "Lead Project Manager", "user_id": pm_user.id},
        {"name": "Budi Engineer", "email": "dev@projectpilot.io", "role": "Backend Lead Engineer", "user_id": dev_user.id if dev_user else None},
        {"name": "Sinta Designer", "email": "designer@projectpilot.io", "role": "UI/UX Specialist", "user_id": designer_user.id if designer_user else None},
        {"name": "Rizky QA", "email": "rizky.qa@projectpilot.io", "role": "QA Automation Engineer", "user_id": None},
        {"name": "Doni Fullstack", "email": "doni.eng@projectpilot.io", "role": "Frontend & Storefront Specialist", "user_id": None},
    ]
    for m in members_data:
        stmt = select(ProjectMember).where(
            (ProjectMember.project_id == project.id) & (ProjectMember.name == m["name"])
        )
        if not (await session.execute(stmt)).scalar_one_or_none():
            member = ProjectMember(
                project_id=project.id,
                user_id=m["user_id"],
                name=m["name"],
                email=m["email"],
                role=m["role"],
                capacity_hours_per_week=40.0,
            )
            session.add(member)

    # -------------------------------------------------------------------------
    # 5. BRIEF (DISCOVERY)
    # -------------------------------------------------------------------------
    stmt_brief = select(Brief).where(Brief.project_id == project.id)
    if not (await session.execute(stmt_brief)).scalar_one_or_none():
        brief = Brief(
            project_id=project.id,
            objective="Membangun platform multi-store e-commerce modern, scalable, dan multi-tenant untuk merchant ritel Indonesia.",
            business_context="Pasar UMKM dan brand lokal membutuhkan solusi toko online mandiri (D2C) yang memiliki kontrol inventaris, varian produk, serta integrasi logistik dan pembayaran otomatis tanpa biaya komisi marketplace yang tinggi.",
            intended_users="Merchant Owner, Store Staff/Admin, Pembeli (Shoppers/Customers), dan Super Administrator Platform.",
            expected_functionality="Manajemen multi-store, katalog produk dan varian, kontrol stok inventaris, keranjang belanja, checkout aman, pembayaran gateway QRIS/VA, kalkulasi ongkos kirim real-time, promosi kupon/diskon, dan dashboard analitik merchant.",
            constraints="SLA respon checkout < 1 detik, database multi-tenant data isolation, kepatuhan PCI-DSS untuk gateway pembayaran, dan export/import CSV hingga 10.000 SKU.",
            known_integrations="Midtrans Payment Gateway, RajaOngkir Shipping API, Redis Caching, S3 Object Storage untuk media gambar produk.",
            raw_content="Dokumen brief pengadaan sistem Lapaq Multi-Store Commerce Platform v1.0.",
        )
        session.add(brief)
        print("  [+] Created Discovery Brief")

    # -------------------------------------------------------------------------
    # 6. DISCOVERY QUESTIONS & CLIENT ANSWERS
    # -------------------------------------------------------------------------
    discovery_data = [
        {
            "category": DiscoveryCategory.BUSINESS,
            "question": "Bagaimana model kepemilikan data antar toko (store isolation) diterapkan pada level merchant?",
            "rationale": "Menentukan batas akses keamanan multi-tenant antar merchant.",
            "answer": "Setiap merchant hanya boleh melihat dan mengelola katalog, order, dan pelanggan dari toko miliknya sendiri. Super Admin memiliki dashboard lintas toko.",
            "respondent": "Bambang Sudiro",
            "role": "Managing Director",
        },
        {
            "category": DiscoveryCategory.FUNCTIONAL,
            "question": "Apakah inventaris dikelola pada level produk induk atau level varian spesifik (SKU)?",
            "rationale": "Kritis untuk perancangan data model stok dan pencegahan overselling.",
            "answer": "Inventaris wajib dikelola pada level varian (SKU) jika produk memiliki varian (seperti ukuran dan warna). Jika tanpa varian, inventaris melekat pada produk induk.",
            "respondent": "Dewi Lestari",
            "role": "Head of Product",
        },
        {
            "category": DiscoveryCategory.TECHNICAL,
            "question": "Bagaimana penanganan keranjang belanja jika pembeli memilih produk dari dua toko yang berbeda?",
            "rationale": "Menentukan kompleksitas pemisahan pesanan (order splitting) dan kalkulasi ongkos kirim.",
            "answer": "Pada rilis MVP ini, checkout dibatasi per store (single-store checkout per transaksi) untuk menyederhanakan perhitungan ongkir dan settlement pembayaran.",
            "respondent": "Dewi Lestari",
            "role": "Head of Product",
        },
        {
            "category": DiscoveryCategory.INTEGRATION,
            "question": "Metode pembayaran apa saja yang wajib didukung pada rilis awal?",
            "rationale": "Menetapkan scope integrasi gateway pembayaran Midtrans.",
            "answer": "QRIS Dinamis dan Virtual Account (BCA, Mandiri, BNI, BRI) melalui payment gateway terintegrasi webhook callback real-time.",
            "respondent": "Ahmad Fadillah",
            "role": "Lead Solutions Architect",
        },
        {
            "category": DiscoveryCategory.SECURITY,
            "question": "Apakah sistem memerlukan proteksi khusus terhadap lonjakan checkout produk flash-sale?",
            "rationale": "Pencegahan race condition pengurangan kuantitas stok.",
            "answer": "Wajib ada proteksi race condition pada pengurangan stok agar tidak terjadi overselling saat checkout bersamaan.",
            "respondent": "Ahmad Fadillah",
            "role": "Lead Solutions Architect",
        },
    ]

    for idx, dq in enumerate(discovery_data):
        stmt = select(DiscoveryQuestion).where(
            (DiscoveryQuestion.project_id == project.id) & (DiscoveryQuestion.question == dq["question"])
        )
        existing_q = (await session.execute(stmt)).scalar_one_or_none()
        if not existing_q:
            q_obj = DiscoveryQuestion(
                project_id=project.id,
                category=dq["category"],
                question=dq["question"],
                rationale=dq["rationale"],
                status=DiscoveryQuestionStatus.ANSWERED,
                priority="HIGH",
                order_index=idx + 1,
            )
            session.add(q_obj)
            await session.flush()

            ans = ClientAnswer(
                question_id=q_obj.id,
                answer_text=dq["answer"],
                respondent_name=dq["respondent"],
                respondent_role=dq["role"],
                source="Discovery Interview Session",
            )
            session.add(ans)

    # -------------------------------------------------------------------------
    # 7. SCOPE ITEMS (IN_SCOPE & OUT_OF_SCOPE)
    # -------------------------------------------------------------------------
    scope_data = [
        # IN_SCOPE (16 items)
        ("SCP-01", "Manajemen Toko & Konfigurasi Profil Merchant", ScopeType.IN_SCOPE, "Pengaturan profil toko, jam operasional, dan logo."),
        ("SCP-02", "Katalog Produk & Pengelolaan SKU", ScopeType.IN_SCOPE, "Pembuatan produk dasar dengan atribut SKU, kategori, dan deskripsi."),
        ("SCP-03", "Manajemen Varian Produk (Ukuran, Warna, Material)", ScopeType.IN_SCOPE, "Kombinasi multi-dimensi atribut varian dengan SKU anak."),
        ("SCP-04", "Manajemen Stok Inventaris & Penyesuaian Manual", ScopeType.IN_SCOPE, "Pencatatan mutasi stok masuk dan keluar secara realtime."),
        ("SCP-05", "Manajemen Pelanggan & Riwayat Transaksi Toko", ScopeType.IN_SCOPE, "Daftar pembeli terdaftar per merchant toko."),
        ("SCP-06", "Keranjang Belanja Pembeli (Shopping Cart)", ScopeType.IN_SCOPE, "Simulasi penambahan item, kalkulasi subtotal, dan validasi stok."),
        ("SCP-07", "Alur Checkout & Validasi Alamat Pengiriman", ScopeType.IN_SCOPE, "Pengisian data penerima dan validasi formulir checkout."),
        ("SCP-08", "Manajemen Pesanan (Order Processing & Status)", ScopeType.IN_SCOPE, "Siklus hidup pesanan: pending, processing, shipped, completed, cancelled."),
        ("SCP-09", "Integrasi Pembayaran QRIS & Virtual Account", ScopeType.IN_SCOPE, "Integrasi gateway Midtrans dengan webhook notification."),
        ("SCP-10", "Konfigurasi Ekspedisi & Tarif Ongkos Kirim Toko", ScopeType.IN_SCOPE, "Konfigurasi kurir dan kalkulasi ongkir berbasis berat."),
        ("SCP-11", "Manajemen Kupon Promosi & Aturan Diskon Toko", ScopeType.IN_SCOPE, "Kupon diskon persentase dan nominal dengan kuota pemakaian."),
        ("SCP-12", "Dashboard Analitik Penjualan & Performa Toko", ScopeType.IN_SCOPE, "Grafik omset harian, produk terlaris, dan rata-rata order."),
        ("SCP-13", "Platform Administration & Pengawasan Merchant", ScopeType.IN_SCOPE, "Dashboard internal Super Admin untuk verifikasi merchant."),
        ("SCP-14", "Bulk Import & Export Katalog Produk via CSV", ScopeType.IN_SCOPE, "Import massal data produk dan varian via format file CSV."),
        ("SCP-15", "Monitoring & Notifikasi Produk Low-Stock", ScopeType.IN_SCOPE, "Indikator visual dan notifikasi ketika stok di bawah ambang batas."),
        ("SCP-16", "Manajemen Notifikasi Email Transaksional Pembeli", ScopeType.IN_SCOPE, "Kirim invoice dan tracking number ke email pembeli."),

        # OUT_OF_SCOPE (6 items)
        ("SCP-OUT-01", "Marketplace Automated Multi-Vendor Escrow & Split Payout", ScopeType.OUT_OF_SCOPE, "Sistem escrow otomatis antar bank lintas merchant ditunda ke Fase 2."),
        ("SCP-OUT-02", "AI-Powered Recommendation Engine & Predictive Search", ScopeType.OUT_OF_SCOPE, "Rekomendasi berbasis machine learning berada di luar ruang lingkup MVP."),
        ("SCP-OUT-03", "AI Generative Product Copywriting & Image Enhancer", ScopeType.OUT_OF_SCOPE, "Pembuatan deskripsi otomatis dengan AI tidak didukung pada rilis awal."),
        ("SCP-OUT-04", "International Multi-Currency & Cross-Border Tax Engine", ScopeType.OUT_OF_SCOPE, "Transaksi valuta asing dan perpajakan internasional dikecualikan."),
        ("SCP-OUT-05", "Multi-Country Global Warehouse Fulfillment Automation", ScopeType.OUT_OF_SCOPE, "Fulfillment gudang global multi-negara di luar arsitektur rilis ini."),
        ("SCP-OUT-06", "Native iOS / Android Shopper Application", ScopeType.OUT_OF_SCOPE, "Aplikasi native mobile ditunda ke Fase 2; fokus MVP adalah Responsive Web PWA."),
    ]

    for code, title, stype, rationale in scope_data:
        stmt = select(ScopeItem).where(
            (ScopeItem.project_id == project.id) & (ScopeItem.title == title)
        )
        if not (await session.execute(stmt)).scalar_one_or_none():
            s_obj = ScopeItem(
                project_id=project.id,
                title=title,
                description=f"Ruang lingkup {stype.value}: {title}.",
                scope_type=stype,
                rationale=rationale,
            )
            session.add(s_obj)

    # -------------------------------------------------------------------------
    # 8. REQUIREMENTS (23 items: 16 CONFIRMED/APPROVED, 3 DRAFT, 2 REJECTED, 2 SUPERSEDED)
    # -------------------------------------------------------------------------
    reqs_data = [
        # --- Authoritative: APPROVED / CONFIRMED (16 items) ---
        {
            "key": "REQ-STORE-001",
            "title": "Merchant Store Creation & Configuration",
            "description": "Merchant dapat mendaftarkan toko baru, mengatur profil toko, mengunggah logo, menentukan jam operasional, dan mengatur kebijakan pengembalian barang.",
            "category": DiscoveryCategory.FUNCTIONAL,
            "priority": "HIGH",
            "status": RequirementStatus.APPROVED,
            "acceptance_criteria": "1. Merchant dapat mengisi nama toko, subdomain unik, dan alamat operasional.\n2. Nama toko tidak boleh duplikat dengan toko yang sudah aktif.\n3. Logo toko terunggah dalam format JPG/PNG dengan ukuran maksimal 2MB.",
        },
        {
            "key": "REQ-PROD-001",
            "title": "Product Catalog & Basic Info Management",
            "description": "Merchant dapat membuat, memperbarui, menampilkan, dan mengarsipkan produk dengan atribut judul, SKU induk, kategori, deskripsi rich text, dan gambar galeri.",
            "category": DiscoveryCategory.FUNCTIONAL,
            "priority": "CRITICAL",
            "status": RequirementStatus.APPROVED,
            "acceptance_criteria": "1. Produk wajib memiliki judul, minimal 1 gambar, dan SKU yang unik dalam lingkup toko merchant.\n2. Produk berstatus DRAFT tidak tampil pada katalog publik pembeli.\n3. Merchant dapat mengarsipkan produk tanpa menghapus riwayat order lampau.",
        },
        {
            "key": "REQ-PROD-002",
            "title": "Product Variant Definition & Pricing",
            "description": "Merchant dapat mendefinisikan atribut varian (seperti Ukuran, Warna) yang secara otomatis menghasilkan kombinasi SKU turunan dengan harga dan berat spesifik.",
            "category": DiscoveryCategory.FUNCTIONAL,
            "priority": "CRITICAL",
            "status": RequirementStatus.APPROVED,
            "acceptance_criteria": "1. Sistem mendukung hingga 3 dimensi atribut varian per produk.\n2. Setiap varian menghasilkan SKU unik dan dapat memiliki harga berbeda dari produk induk.\n3. Penonaktifan varian menyembunyikan opsi tersebut pada halaman produk pembeli.",
        },
        {
            "key": "REQ-INV-001",
            "title": "Variant-Level Inventory Tracking & Deduction",
            "description": "Sistem wajib melacak kuantitas stok pada level varian SKU dan melakukan pengurangan stok secara atomik saat checkout pesanan berhasil dibuat.",
            "category": DiscoveryCategory.TECHNICAL,
            "priority": "CRITICAL",
            "status": RequirementStatus.APPROVED,
            "acceptance_criteria": "1. Kuantitas stok varian tidak boleh bernilai negatif melalui transaksi normal.\n2. Pengurangan stok menggunakan row-level lock untuk mencegah race condition pada pembelian bersamaan.\n3. Jika stok varian bernilai 0, sistem menandai varian sebagai Habis (Out of Stock).",
        },
        {
            "key": "REQ-INV-002",
            "title": "Low-Stock Alerts & Notification Thresholds",
            "description": "Sistem menyediakan pemantauan stok menipis berdasarkan ambang batas minimum yang dapat dikonfigurasi oleh merchant pada tiap varian.",
            "category": DiscoveryCategory.FUNCTIONAL,
            "priority": "MEDIUM",
            "status": RequirementStatus.CONFIRMED,
            "acceptance_criteria": "1. Merchant dapat mengatur ambang batas low-stock (default: 5 unit).\n2. Varian dengan stok <= ambang batas muncul pada tab peringatan Stok Menipis di dashboard.\n3. Indikator visual kuning/merah ditampilkan pada daftar inventaris produk.",
        },
        {
            "key": "REQ-CART-001",
            "title": "Customer Shopping Cart Management",
            "description": "Pembeli dapat menambahkan produk yang tersedia ke keranjang belanja, memperbarui jumlah, menghapus item, dan melihat subtotal belanja realtime.",
            "category": DiscoveryCategory.FUNCTIONAL,
            "priority": "HIGH",
            "status": RequirementStatus.APPROVED,
            "acceptance_criteria": "1. Pembeli tidak dapat menambahkan item melebihi kuantitas stok yang tersedia.\n2. Keranjang belanja mempertahankan session hingga 7 hari bagi pengguna tamu (guest).\n3. Keranjang hanya memuat produk dari satu merchant toko yang sama pada satu waktu checkout.",
        },
        {
            "key": "REQ-CHK-001",
            "title": "Single-Store Checkout Validation",
            "description": "Sistem memvalidasi kelengkapan data pengiriman, opsi kurir, dan kalkulasi total belanja sebelum membuat pesanan resmi.",
            "category": DiscoveryCategory.FUNCTIONAL,
            "priority": "CRITICAL",
            "status": RequirementStatus.APPROVED,
            "acceptance_criteria": "1. Formulir checkout mewajibkan nama penerima, nomor telepon valid, alamat lengkap, dan kode pos.\n2. Pesanan tidak dapat dibuat jika salah satu item di keranjang mengalami kehabisan stok saat tombol bayar ditekan.\n3. Total pembayaran memuat rincian subtotal produk, biaya kirim, dan potongan diskon kupon.",
        },
        {
            "key": "REQ-ORD-001",
            "title": "Merchant Order Lifecycle Management",
            "description": "Merchant dapat melihat pesanan toko, memproses status pesanan dari PENDING_PAYMENT, CONFIRMED, PROCESSING, SHIPPED, hingga COMPLETED.",
            "category": DiscoveryCategory.FUNCTIONAL,
            "priority": "CRITICAL",
            "status": RequirementStatus.APPROVED,
            "acceptance_criteria": "1. Merchant hanya dapat melihat dan memperbarui pesanan yang ditujukan ke toko miliknya.\n2. Perubahan status ke SHIPPED mewajibkan penginputan nomor resi pengiriman kurir.\n3. Pesanan berstatus CANCELLED secara otomatis mengembalikan kuantitas stok ke inventaris toko.",
        },
        {
            "key": "REQ-PAY-001",
            "title": "Midtrans Payment Gateway Integration (QRIS & VA)",
            "description": "Sistem menghasilkan token transaksi Midtrans Snap untuk pembayaran QRIS Dinamis dan Virtual Account bank serta menangani webhook callback.",
            "category": DiscoveryCategory.INTEGRATION,
            "priority": "CRITICAL",
            "status": RequirementStatus.APPROVED,
            "acceptance_criteria": "1. Token pembayaran dibuat dengan batas kedaluwarsa sesuai konfigurasi (contoh: 24 jam untuk VA, 15 menit untuk QRIS).\n2. Callback webhook dari Midtrans diverifikasi menggunakan signature key sebelum merubah status pembayaran pesanan menjadi PAID.\n3. Pembayaran yang kedaluwarsa secara otomatis mengubah status pesanan menjadi EXPIRED.",
        },
        {
            "key": "REQ-SHIP-001",
            "title": "Store Shipping Rate Configuration",
            "description": "Merchant dapat mengonfigurasi layanan ekspedisi yang didukung (JNE, SiCepat, J&T) dengan tarif flat per kota atau tarif berjenjang berbasis berat.",
            "category": DiscoveryCategory.FUNCTIONAL,
            "priority": "HIGH",
            "status": RequirementStatus.CONFIRMED,
            "acceptance_criteria": "1. Merchant dapat mengaktifkan atau menonaktifkan kurir tertentu pada pengaturan toko.\n2. Sistem mengalkulasi total berat seluruh varian dalam pesanan untuk menentukan biaya pengiriman akhir.\n3. Opsi pengiriman yang tidak aktif pada toko tidak akan muncul pada formulir checkout pembeli.",
        },
        {
            "key": "REQ-PRM-001",
            "title": "Store Coupon & Promotional Discount Engine",
            "description": "Merchant dapat menerbitkan kode kupon promosi dengan aturan diskon persentase atau potongan nominal serta syarat minimum nilai belanja.",
            "category": DiscoveryCategory.FUNCTIONAL,
            "priority": "HIGH",
            "status": RequirementStatus.CONFIRMED,
            "acceptance_criteria": "1. Kupon dapat dibatasi berdasarkan periode tanggal berlaku dan kuota maksimal penggunaan.\n2. Kupon diskon ditolak pada checkout jika total belanja kurang dari batas minimum pembelian.\n3. Setiap kupon hanya berlaku untuk produk pada toko penerbit kupon.",
        },
        {
            "key": "REQ-ANL-001",
            "title": "Merchant Sales Analytics & Revenue Dashboard",
            "description": "Sistem menyajikan dashboard analitik performa toko meliputi total omset penjualan, jumlah pesanan sukses, rata-rata nilai order, dan produk terlaris.",
            "category": DiscoveryCategory.REPORTING,
            "priority": "MEDIUM",
            "status": RequirementStatus.APPROVED,
            "acceptance_criteria": "1. Grafik penjualan dapat difilter berdasarkan rentang waktu 7 hari, 30 hari, dan kustom tanggal.\n2. Data agregat hanya mencakup pesanan berstatus PAID atau COMPLETED.\n3. Daftar 5 produk terlaris dihitung berdasarkan kuantitas unit varian yang terjual.",
        },
        {
            "key": "REQ-IMP-001",
            "title": "Bulk Product Import via CSV",
            "description": "Merchant dapat mengunggah file CSV untuk membuat atau memperbarui katalog produk beserta varian secara massal hingga 1.000 baris per file.",
            "category": DiscoveryCategory.DATA,
            "priority": "HIGH",
            "status": RequirementStatus.CONFIRMED,
            "acceptance_criteria": "1. Format file CSV divalidasi terhadap header standar yang disediakan sistem template.\n2. Baris data yang tidak valid (contoh: harga bukan angka atau SKU duplikat) dilaporkan dalam ringkasan error tanpa menggagalkan baris valid lainnya.\n3. Sistem menyajikan laporan sukses dan daftar baris gagal beserta nomor baris dan alasan error.",
        },
        {
            "key": "REQ-CUST-001",
            "title": "Customer Profile & Order History",
            "description": "Pembeli dapat mengelola profil akun, menyimpan alamat pengiriman default, serta melihat riwayat seluruh pesanan dan mengunduh invoice digital.",
            "category": DiscoveryCategory.FUNCTIONAL,
            "priority": "MEDIUM",
            "status": RequirementStatus.APPROVED,
            "acceptance_criteria": "1. Pembeli dapat menyimpan hingga 5 alamat pengiriman dengan satu alamat default.\n2. Halaman riwayat order menampilkan status tracking terkini dan tombol unduh invoice PDF.\n3. Pembeli hanya dapat mengakses data pesanan yang dibuat oleh akun pembeli bersangkutan.",
        },
        {
            "key": "REQ-ADM-001",
            "title": "Platform Multi-Tenant Merchant Isolation",
            "description": "Arsitektur sistem menjamin isolasi data ketat antar merchant toko pada tingkat query basis data dan session otorisasi pengguna.",
            "category": DiscoveryCategory.SECURITY,
            "priority": "CRITICAL",
            "status": RequirementStatus.APPROVED,
            "acceptance_criteria": "1. Setiap query mutasi atau baca data toko mewajibkan filter merchant store_id terverifikasi.\n2. Upaya akses data toko lain menggunakan ID manipulatif mengembalikan respon HTTP 403 Forbidden.\n3. Audit log mencatat setiap pelanggaran otorisasi akses data lintas merchant.",
        },
        {
            "key": "REQ-SEC-001",
            "title": "Payment Webhook Signature Verification",
            "description": "Sistem wajib memvalidasi keaslian signature cryptographic pada setiap callback webhook notifikasi pembayaran sebelum memproses data transaksi.",
            "category": DiscoveryCategory.SECURITY,
            "priority": "CRITICAL",
            "status": RequirementStatus.APPROVED,
            "acceptance_criteria": "1. Sistem menghitung hash HMAC-SHA512 dari order_id, status_code, gross_amount, dan server key Midtrans.\n2. Jika hash yang dihitung tidak cocok dengan signature_key pada payload, request ditolak dengan HTTP 401.\n3. Request webhook yang valid diproses secara idempoten untuk mencegah double settlement.",
        },

        # --- Excluded: DRAFT & NEEDS_CLARIFICATION (3 items) ---
        {
            "key": "REQ-DRF-001",
            "title": "Social Media Storefront Embed Widget",
            "description": "Fitur pembuatan widget interaktif yang dapat ditempelkan pada situs blog atau media sosial eksternal untuk pembelian langsung.",
            "category": DiscoveryCategory.FUNCTIONAL,
            "priority": "LOW",
            "status": RequirementStatus.DRAFT,
            "acceptance_criteria": "Belum ada kriteria penerimaan spesifik yang disepakati.",
        },
        {
            "key": "REQ-DRF-002",
            "title": "Store Loyalty Tier & Points Redemptions",
            "description": "Sistem poin loyalitas pembeli di mana setiap transaksi menghasilkan poin yang dapat ditukar dengan voucher belanja toko.",
            "category": DiscoveryCategory.FUNCTIONAL,
            "priority": "LOW",
            "status": RequirementStatus.NEEDS_CLARIFICATION,
            "acceptance_criteria": "Menunggu konfirmasi klien mengenai rasio konversi poin dan beban finansial diskon.",
        },
        {
            "key": "REQ-DRF-003",
            "title": "Third-Party WhatsApp Notification Bot",
            "description": "Kirim notifikasi otomatis pembaruan resi dan konfirmasi pembayaran ke WhatsApp pembeli menggunakan BSP API.",
            "category": DiscoveryCategory.INTEGRATION,
            "priority": "MEDIUM",
            "status": RequirementStatus.NEEDS_CLARIFICATION,
            "acceptance_criteria": "Menunggu keputusan pemilihan vendor WhatsApp Business API dan persetujuan biaya operasional.",
        },

        # --- Excluded: REJECTED (2 items) ---
        {
            "key": "REQ-REJ-001",
            "title": "Cryptocurrency Payment Settlement",
            "description": "Pembayaran pesanan menggunakan aset kripto Bitcoin dan USDT dengan konversi instan ke Rupiah.",
            "category": DiscoveryCategory.FUNCTIONAL,
            "priority": "LOW",
            "status": RequirementStatus.REJECTED,
            "acceptance_criteria": "Ditolak karena tidak sesuai regulasi Bank Indonesia terkait alat pembayaran yang sah.",
        },
        {
            "key": "REQ-REJ-002",
            "title": "Multi-Store Mixed Cart Single-Click Checkout",
            "description": "Pembeli dapat menggabungkan produk dari 5 merchant berbeda ke dalam satu keranjang dan melakukan pembayaran tunggal.",
            "category": DiscoveryCategory.FUNCTIONAL,
            "priority": "LOW",
            "status": RequirementStatus.REJECTED,
            "acceptance_criteria": "Ditolak untuk rilis MVP guna menghindari kompleksitas split billing, escrow, dan multi-pickup kurir.",
        },

        # --- Excluded: SUPERSEDED (2 items) ---
        {
            "key": "REQ-SUP-001",
            "title": "Legacy Flat-Rate Shipping Calculation",
            "description": "Tarif flat ongkos kirim Rp 10.000 untuk seluruh pengiriman domestik tanpa memperhitungkan berat atau lokasi.",
            "category": DiscoveryCategory.FUNCTIONAL,
            "priority": "LOW",
            "status": RequirementStatus.SUPERSEDED,
            "acceptance_criteria": "Digantikan oleh REQ-SHIP-001 dengan kalkulasi berbasis kurir dan berat aktual.",
        },
        {
            "key": "REQ-SUP-002",
            "title": "Single Unstructured Product Description",
            "description": "Deskripsi produk hanya berupa satu kotak teks polos tanpa dukungan spesifikasi teknis atau varian.",
            "category": DiscoveryCategory.FUNCTIONAL,
            "priority": "LOW",
            "status": RequirementStatus.SUPERSEDED,
            "acceptance_criteria": "Digantikan oleh REQ-PROD-001 dan REQ-PROD-002 dengan spesifikasi terstruktur.",
        },
    ]

    reqs_map = {}
    for r in reqs_data:
        stmt = select(Requirement).where(
            (Requirement.project_id == project.id) & (Requirement.key == r["key"])
        )
        existing_r = (await session.execute(stmt)).scalar_one_or_none()
        if not existing_r:
            req_obj = Requirement(
                project_id=project.id,
                key=r["key"],
                title=r["title"],
                description=r["description"],
                category=r["category"],
                priority=r["priority"],
                status=r["status"],
                acceptance_criteria=r["acceptance_criteria"],
                source_type=RequirementSourceType.MANUAL_PM,
            )
            session.add(req_obj)
            await session.flush()
            reqs_map[r["key"]] = req_obj
        else:
            reqs_map[r["key"]] = existing_r

    # Update superseded links
    if "REQ-SUP-001" in reqs_map and "REQ-SHIP-001" in reqs_map:
        reqs_map["REQ-SUP-001"].superseded_by_id = reqs_map["REQ-SHIP-001"].id
    if "REQ-SUP-002" in reqs_map and "REQ-PROD-001" in reqs_map:
        reqs_map["REQ-SUP-002"].superseded_by_id = reqs_map["REQ-PROD-001"].id

    print(f"  [+] Seeded {len(reqs_data)} requirements (16 Authoritative, 7 Excluded)")

    # -------------------------------------------------------------------------
    # 9. EPICS (13 items)
    # -------------------------------------------------------------------------
    epics_data = [
        ("EPIC-STORE", "Manajemen Toko & Pengaturan Merchant", "Konfigurasi profil toko, domain, dan aturan operasional merchant."),
        ("EPIC-CATALOG", "Katalog Produk & Varian SKU", "Pengelolaan produk induk, galeri gambar, dan konfigurasi multi-varian."),
        ("EPIC-INVENTORY", "Manajemen Stok & Kontrol Inventaris", "Pelacakan stok per varian, mutasi gudang, dan notifikasi low-stock."),
        ("EPIC-CUSTOMER", "Manajemen Akun & Profil Pelanggan", "Registrasi, buku alamat pengiriman, dan riwayat pesanan pembeli."),
        ("EPIC-CART", "Keranjang Belanja Pembeli", "Penyimpanan keranjang belanja, kalkulasi subtotal, dan session persistensi."),
        ("EPIC-CHECKOUT", "Alur Checkout & Validasi Transaksi", "Formulir checkout terintegrasi validasi kurir dan pencegahan overselling."),
        ("EPIC-ORDER", "Pemrosesan & Pemenuhan Pesanan", "Alur pemrosesan pesanan toko dari pembayaran hingga penginputan resi."),
        ("EPIC-PAYMENT", "Integrasi Payment Gateway & Settlement", "Konektivitas API Midtrans Snap, QRIS dinamis, dan verifikasi webhook."),
        ("EPIC-SHIPPING", "Ekspedisi & Logistik Pengiriman", "Konfigurasi tarif pengiriman dan kalkulasi ongkos kirim berbasis berat."),
        ("EPIC-PROMOTION", "Promosi, Kupon & Diskon", "Pembuatan dan validasi kupon diskon persentase dan potongan nominal."),
        ("EPIC-ANALYTICS", "Dashboard & Analitik Penjualan", "Visualisasi performa omset, tren transaksi, dan produk terlaris toko."),
        ("EPIC-IMPORT", "Bulk Data Import & Export", "Pemrosesan file batch CSV untuk katalog produk dan penyesuaian stok massal."),
        ("EPIC-ADMIN", "Platform Administration & Multi-Tenant Security", "Isolasi data antar merchant dan pengawasan operasional oleh Super Admin."),
    ]

    epics_map = {}
    for key, title, desc in epics_data:
        stmt = select(Epic).where((Epic.project_id == project.id) & (Epic.key == key))
        existing_ep = (await session.execute(stmt)).scalar_one_or_none()
        if not existing_ep:
            ep_obj = Epic(
                project_id=project.id,
                key=key,
                title=title,
                description=desc,
                status="IN_PROGRESS",
            )
            session.add(ep_obj)
            await session.flush()
            epics_map[key] = ep_obj
        else:
            epics_map[key] = existing_ep

    # -------------------------------------------------------------------------
    # 10. FEATURES (32 items: 29 mapped to approved REQs, 3 intentionally unmapped)
    # -------------------------------------------------------------------------
    features_data = [
        # Store Management (REQ-STORE-001)
        ("FEAT-STORE-01", "Pendaftaran & Onboarding Profil Toko", "EPIC-STORE", "REQ-STORE-001", "DONE"),
        ("FEAT-STORE-02", "Konfigurasi Domain & Jam Buka Toko", "EPIC-STORE", "REQ-STORE-001", "DONE"),
        # Unmapped Store Feature (Emergent functionality without direct REQ)
        ("FEAT-STORE-03", "Merchant Storefront Live Preview Mode", "EPIC-STORE", None, "DONE"),

        # Product Catalog (REQ-PROD-001)
        ("FEAT-CAT-01", "Formulir Pembuatan Produk & Media Uploader", "EPIC-CATALOG", "REQ-PROD-001", "DONE"),
        ("FEAT-CAT-02", "Katalog Grid & Manajemen Status Arsip", "EPIC-CATALOG", "REQ-PROD-001", "DONE"),
        ("FEAT-CAT-03", "Kategori & Tagging Produk Hierarkis", "EPIC-CATALOG", "REQ-PROD-001", "DONE"),
        # Unmapped Catalog Feature (Recently viewed items carousel)
        ("FEAT-CAT-04", "Recently Viewed Products Carousel", "EPIC-CATALOG", None, "DONE"),

        # Variants (REQ-PROD-002)
        ("FEAT-VAR-01", "Generator Matrix Varian Otomatis", "EPIC-CATALOG", "REQ-PROD-002", "DONE"),
        ("FEAT-VAR-02", "Override Harga & Berat per Varian SKU", "EPIC-CATALOG", "REQ-PROD-002", "DONE"),

        # Inventory (REQ-INV-001, REQ-INV-002)
        ("FEAT-INV-01", "Pengurangan Stok Otomatis saat Checkout", "EPIC-INVENTORY", "REQ-INV-001", "DONE"),
        ("FEAT-INV-02", "Penyesuaian Manual & Audit Mutasi Stok", "EPIC-INVENTORY", "REQ-INV-001", "DONE"),
        ("FEAT-INV-03", "Tabel Monitoring & Alert Produk Low-Stock", "EPIC-INVENTORY", "REQ-INV-002", "DONE"),

        # Cart (REQ-CART-001)
        ("FEAT-CART-01", "Drawer Keranjang Belanja & Validasi Stok Realtime", "EPIC-CART", "REQ-CART-001", "DONE"),
        ("FEAT-CART-02", "Persistensi Keranjang Belanja Multi-Perangkat", "EPIC-CART", "REQ-CART-001", "DONE"),

        # Checkout (REQ-CHK-001)
        ("FEAT-CHK-01", "Halaman Single-Store Checkout Responsive", "EPIC-CHECKOUT", "REQ-CHK-001", "DONE"),
        ("FEAT-CHK-02", "Validasi Alamat Penerima & Autocomplete Kota", "EPIC-CHECKOUT", "REQ-CHK-001", "DONE"),

        # Orders (REQ-ORD-001)
        ("FEAT-ORD-01", "Daftar Pesanan Merchant & Filter Status", "EPIC-ORDER", "REQ-ORD-001", "DONE"),
        ("FEAT-ORD-02", "Penginputan Nomor Resi & Status Shipped", "EPIC-ORDER", "REQ-ORD-001", "DONE"),
        ("FEAT-ORD-03", "Auto-Restock pada Pembatalan Pesanan", "EPIC-ORDER", "REQ-ORD-001", "DONE"),
        # Unmapped Order Feature (Internal order tagging)
        ("FEAT-ORD-04", "Internal Staff Order Tagging & Notes", "EPIC-ORDER", None, "DONE"),

        # Payment (REQ-PAY-001, REQ-SEC-001)
        ("FEAT-PAY-01", "Integrasi Midtrans Snap QRIS & Virtual Account", "EPIC-PAYMENT", "REQ-PAY-001", "DONE"),
        ("FEAT-PAY-02", "Webhook Handler & Verifikasi Signature SHA512", "EPIC-PAYMENT", "REQ-SEC-001", "DONE"),
        ("FEAT-PAY-03", "Otomasi Status Expired pada Pembayaran Kedaluwarsa", "EPIC-PAYMENT", "REQ-PAY-001", "DONE"),

        # Shipping (REQ-SHIP-001)
        ("FEAT-SHIP-01", "Konfigurasi Kurir Pengiriman Toko", "EPIC-SHIPPING", "REQ-SHIP-001", "DONE"),
        ("FEAT-SHIP-02", "Kalkulasi Ongkos Kirim Berbasis Berat Total", "EPIC-SHIPPING", "REQ-SHIP-001", "DONE"),

        # Promotion (REQ-PRM-001)
        ("FEAT-PRM-01", "Manajemen Kode Kupon Diskon Merchant", "EPIC-PROMOTION", "REQ-PRM-001", "DONE"),
        ("FEAT-PRM-02", "Validasi Kuota & Syarat Belanja Minimum Kupon", "EPIC-PROMOTION", "REQ-PRM-001", "DONE"),

        # Analytics (REQ-ANL-001)
        ("FEAT-ANL-01", "Grafik Omset Harian & Ringkasan Penjualan", "EPIC-ANALYTICS", "REQ-ANL-001", "IN_PROGRESS"),
        ("FEAT-ANL-02", "Laporan 5 Produk Terlaris per Toko", "EPIC-ANALYTICS", "REQ-ANL-001", "READY"),

        # Bulk Import (REQ-IMP-001)
        ("FEAT-IMP-01", "Parser & Validator File CSV Produk", "EPIC-IMPORT", "REQ-IMP-001", "DONE"),
        ("FEAT-IMP-02", "Laporan Ringkasan Hasil Import & Log Error", "EPIC-IMPORT", "REQ-IMP-001", "DONE"),

        # Customer & Admin (REQ-CUST-001, REQ-ADM-001)
        ("FEAT-CUST-01", "Buku Alamat Pembeli & Riwayat Pesanan", "EPIC-CUSTOMER", "REQ-CUST-001", "DONE"),
        ("FEAT-ADM-01", "Store-Level Multi-Tenant Query Isolation", "EPIC-ADMIN", "REQ-ADM-001", "DONE"),
    ]

    features_map = {}
    for f_key, f_title, ep_key, r_key, f_status in features_data:
        stmt = select(Feature).where((Feature.project_id == project.id) & (Feature.key == f_key))
        existing_f = (await session.execute(stmt)).scalar_one_or_none()
        if not existing_f:
            ep_obj = epics_map[ep_key]
            r_obj = reqs_map.get(r_key) if r_key else None
            feat_obj = Feature(
                project_id=project.id,
                epic_id=ep_obj.id,
                requirement_id=r_obj.id if r_obj else None,
                key=f_key,
                title=f_title,
                description=f"Spesifikasi fungsional fitur {f_title} di bawah modul {ep_obj.title}.",
                status=f_status,
            )
            session.add(feat_obj)
            await session.flush()
            features_map[f_key] = feat_obj
        else:
            features_map[f_key] = existing_f

    print(f"  [+] Seeded {len(features_data)} features (29 mapped, 3 unmapped)")

    # -------------------------------------------------------------------------
    # 11. TASKS (79 items: 38 DONE [32 mapped, 3 unmapped, 3 unlinked], 6 QA, 10 IN_PROGRESS, 6 READY, 5 IN_REVIEW, 8 BACKLOG, 2 BLOCKED, 2 CANCELLED, 2 ARCHIVED)
    # -------------------------------------------------------------------------
    tasks_spec = [
        # --- A. DONE + Feature-linked (Eligible for FSD Verification - 32 items) ---
        ("TSK-ST-01", "Implementasi formulir profil merchant & upload logo", "FEAT-STORE-01", TaskStatus.DONE, "HIGH", 16.0),
        ("TSK-ST-02", "Validasi keunikan subdomain toko pada saat registrasi", "FEAT-STORE-01", TaskStatus.DONE, "HIGH", 8.0),
        ("TSK-ST-03", "Konfigurasi jam operasional dan status buka/tutup toko", "FEAT-STORE-02", TaskStatus.DONE, "MEDIUM", 8.0),

        ("TSK-CAT-01", "Slicing UI formulir katalog produk & media uploader S3", "FEAT-CAT-01", TaskStatus.DONE, "HIGH", 16.0),
        ("TSK-CAT-02", "Backend API CRUD produk dasar dan validasi SKU unik", "FEAT-CAT-01", TaskStatus.DONE, "HIGH", 16.0),
        ("TSK-CAT-03", "Implementasi katalog grid & aksi arsip produk", "FEAT-CAT-02", TaskStatus.DONE, "MEDIUM", 12.0),
        ("TSK-CAT-04", "Manajemen kategori dan hirarki produk bertingkat", "FEAT-CAT-03", TaskStatus.DONE, "MEDIUM", 10.0),

        ("TSK-VAR-01", "Generator matrix varian multi-atribut (ukuran x warna)", "FEAT-VAR-01", TaskStatus.DONE, "HIGH", 20.0),
        ("TSK-VAR-02", "Override harga dan berat kustom pada child SKU varian", "FEAT-VAR-02", TaskStatus.DONE, "HIGH", 12.0),

        ("TSK-INV-01", "Implementasi atomic stock decrement saat pembuatan pesanan", "FEAT-INV-01", TaskStatus.DONE, "CRITICAL", 24.0),
        ("TSK-INV-02", "Formulir penyesuaian manual stok inventaris dan logging mutasi", "FEAT-INV-02", TaskStatus.DONE, "MEDIUM", 12.0),
        ("TSK-INV-03", "Filter dan badge peringatan produk low-stock pada dashboard", "FEAT-INV-03", TaskStatus.DONE, "MEDIUM", 8.0),

        ("TSK-CRT-01", "Drawer UI keranjang belanja dengan validasi stok realtime", "FEAT-CART-01", TaskStatus.DONE, "HIGH", 16.0),
        ("TSK-CRT-02", "Session handler keranjang belanja guest dan sinkronisasi login", "FEAT-CART-02", TaskStatus.DONE, "MEDIUM", 12.0),

        ("TSK-CHK-01", "Slicing formulir checkout dan kalkulator ringkasan order", "FEAT-CHK-01", TaskStatus.DONE, "HIGH", 18.0),
        ("TSK-CHK-02", "Validasi kelengkapan alamat pengiriman dan format nomor HP", "FEAT-CHK-02", TaskStatus.DONE, "HIGH", 8.0),

        ("TSK-ORD-01", "Tabel daftar pesanan merchant dengan filter status dan tanggal", "FEAT-ORD-01", TaskStatus.DONE, "HIGH", 14.0),
        ("TSK-ORD-02", "Modal input nomor resi kurir dan trigger status SHIPPED", "FEAT-ORD-02", TaskStatus.DONE, "HIGH", 10.0),
        ("TSK-ORD-03", "Logika auto-restock inventaris saat pesanan dibatalkan", "FEAT-ORD-03", TaskStatus.DONE, "HIGH", 12.0),

        ("TSK-PAY-01", "Integrasi Midtrans Snap API untuk QRIS Dinamis dan VA", "FEAT-PAY-01", TaskStatus.DONE, "CRITICAL", 24.0),
        ("TSK-PAY-02", "Webhook listener Midtrans dengan verifikasi signature HMAC-SHA512", "FEAT-PAY-02", TaskStatus.DONE, "CRITICAL", 20.0),
        ("TSK-PAY-03", "Cron job pembatalan pesanan otomatis saat batas waktu bayar expired", "FEAT-PAY-03", TaskStatus.DONE, "HIGH", 10.0),

        ("TSK-SHP-01", "Formulir pemilihan ekspedisi aktif (JNE, SiCepat, J&T)", "FEAT-SHIP-01", TaskStatus.DONE, "MEDIUM", 8.0),
        ("TSK-SHP-02", "Kalkulator ongkir berbasis total berat akumulatif varian", "FEAT-SHIP-02", TaskStatus.DONE, "HIGH", 14.0),

        ("TSK-PRM-01", "Manajemen kode kupon diskon persentase dan nominal toko", "FEAT-PRM-01", TaskStatus.DONE, "HIGH", 16.0),
        ("TSK-PRM-02", "Validator batas minimum belanja dan kuota pemakaian kupon", "FEAT-PRM-02", TaskStatus.DONE, "HIGH", 12.0),

        ("TSK-IMP-01", "Parser streaming file CSV untuk upload bulk produk", "FEAT-IMP-01", TaskStatus.DONE, "HIGH", 20.0),
        ("TSK-IMP-02", "Generator laporan hasil import sukses dan daftar baris gagal", "FEAT-IMP-02", TaskStatus.DONE, "HIGH", 14.0),

        ("TSK-CST-01", "Halaman buku alamat pembeli dan riwayat invoice pesanan", "FEAT-CUST-01", TaskStatus.DONE, "MEDIUM", 12.0),
        ("TSK-ADM-01", "Middleware store isolation multi-tenant pada seluruh endpoint merchant", "FEAT-ADM-01", TaskStatus.DONE, "CRITICAL", 20.0),
        ("TSK-ADM-02", "Audit trail log untuk akses data merchant dan penolakan 403", "FEAT-ADM-01", TaskStatus.DONE, "HIGH", 10.0),
        ("TSK-PAY-04", "Simulasi pembayaran sandbox Midtrans untuk payment settlement", "FEAT-PAY-01", TaskStatus.DONE, "HIGH", 12.0),

        # --- B. DONE + Feature-linked to Unmapped Features (Emergent - 3 items) ---
        ("TSK-UNM-01", "Implementasi carousel recently viewed products berbasis local storage", "FEAT-CAT-04", TaskStatus.DONE, "LOW", 8.0),
        ("TSK-UNM-02", "Storefront live preview iframe toggle pada admin merchant", "FEAT-STORE-03", TaskStatus.DONE, "LOW", 8.0),
        ("TSK-UNM-03", "Input custom internal tag pada detail pesanan merchant", "FEAT-ORD-04", TaskStatus.DONE, "LOW", 6.0),

        # --- C. DONE + Unlinked Tasks (Internal/Non-Functional, NO Feature - 3 items) ---
        ("TSK-ENG-01", "Setup Redis connection pool dan shared cache helper", None, TaskStatus.DONE, "HIGH", 16.0),
        ("TSK-ENG-02", "Optimasi composite index pada database order dan SKU", None, TaskStatus.DONE, "HIGH", 12.0),
        ("TSK-ENG-03", "Setup GitHub Actions workflow untuk automated unit tests", None, TaskStatus.DONE, "MEDIUM", 8.0),

        # --- D. QA Tasks (Feature-linked, Under Verification - 6 items) ---
        ("TSK-QA-01", "QA Testing: Validasi edge case varian produk tanpa harga override", "FEAT-VAR-01", TaskStatus.QA, "HIGH", 8.0),
        ("TSK-QA-02", "QA Testing: Simulasi webhook replay attack Midtrans", "FEAT-PAY-02", TaskStatus.QA, "CRITICAL", 12.0),
        ("TSK-QA-03", "QA Testing: Uji kalkulasi kupon diskon dengan item gratis ongkir", "FEAT-PRM-02", TaskStatus.QA, "MEDIUM", 8.0),
        ("TSK-QA-04", "QA Testing: Import CSV dengan 1.000 baris data campuran valid/invalid", "FEAT-IMP-01", TaskStatus.QA, "HIGH", 10.0),
        ("TSK-QA-05", "QA Testing: Skenario checkout saat stok tersisa tepat 1 unit", "FEAT-INV-01", TaskStatus.QA, "CRITICAL", 8.0),
        ("TSK-QA-06", "QA Testing: Cross-store direct URL access security testing", "FEAT-ADM-01", TaskStatus.QA, "CRITICAL", 10.0),

        # --- E. IN_PROGRESS Tasks (10 items) ---
        ("TSK-PRG-01", "Implementasi query agregasi omset penjualan 30 hari", "FEAT-ANL-01", TaskStatus.IN_PROGRESS, "HIGH", 16.0),
        ("TSK-PRG-02", "Slicing UI chart pendapatan dan kartu metric penjualan", "FEAT-ANL-01", TaskStatus.IN_PROGRESS, "HIGH", 14.0),
        ("TSK-PRG-03", "Integrasi email transaksional notifikasi pesanan baru merchant", "FEAT-ORD-01", TaskStatus.IN_PROGRESS, "MEDIUM", 12.0),
        ("TSK-PRG-04", "Penyempurnaan handling rate limit API ekspedisi kurir", "FEAT-SHIP-02", TaskStatus.IN_PROGRESS, "HIGH", 10.0),
        ("TSK-PRG-05", "Optimasi lazy loading gambar galeri produk", "FEAT-CAT-01", TaskStatus.IN_PROGRESS, "MEDIUM", 8.0),
        ("TSK-PRG-06", "Refactoring modul lock stok inventaris dengan Redis Redlock", "FEAT-INV-01", TaskStatus.IN_PROGRESS, "CRITICAL", 16.0),
        ("TSK-PRG-07", "Pengembangan filter kategori bertingkat pada halaman katalog", "FEAT-CAT-03", TaskStatus.IN_PROGRESS, "MEDIUM", 8.0),
        ("TSK-PRG-08", "Fitur cetak label pengiriman thermal dengan barcode resi", "FEAT-ORD-02", TaskStatus.IN_PROGRESS, "MEDIUM", 10.0),
        ("TSK-PRG-09", "Pembuatan export CSV daftar pesanan terfilter", "FEAT-ORD-01", TaskStatus.IN_PROGRESS, "MEDIUM", 8.0),
        ("TSK-PRG-10", "Dukungan upload logo format SVG dengan sanitasi XML", "FEAT-STORE-01", TaskStatus.IN_PROGRESS, "LOW", 6.0),

        # --- F. IN_REVIEW Tasks (5 items) ---
        ("TSK-REV-01", "Code review: Validasi format nomor telepon Indonesia regex E.164", "FEAT-CHK-02", TaskStatus.IN_REVIEW, "MEDIUM", 4.0),
        ("TSK-REV-02", "Code review: Idempotency key implementation on Midtrans webhook", "FEAT-PAY-02", TaskStatus.IN_REVIEW, "HIGH", 6.0),
        ("TSK-REV-03", "Code review: Sanitasi input deskripsi produk rich-text HTML", "FEAT-CAT-01", TaskStatus.IN_REVIEW, "HIGH", 6.0),
        ("TSK-REV-04", "Code review: Perhitungan pembulatan berat kurir (treshold 1.3 kg)", "FEAT-SHIP-02", TaskStatus.IN_REVIEW, "MEDIUM", 4.0),
        ("TSK-REV-05", "Code review: Pembatasan session keranjang belanja per IP", "FEAT-CART-02", TaskStatus.IN_REVIEW, "LOW", 4.0),

        # --- G. READY Tasks (6 items) ---
        ("TSK-RDY-01", "Backend endpoint query top 5 produk terlaris berdasarkan kuantitas", "FEAT-ANL-02", TaskStatus.READY, "MEDIUM", 8.0),
        ("TSK-RDY-02", "UI widget ranking produk terlaris pada dashboard analitik", "FEAT-ANL-02", TaskStatus.READY, "MEDIUM", 6.0),
        ("TSK-RDY-03", "Pengaturan kupon diskon khusus produk kategori tertentu", "FEAT-PRM-01", TaskStatus.READY, "MEDIUM", 8.0),
        ("TSK-RDY-04", "Export data pelanggan toko ke format Excel/CSV", "FEAT-CUST-01", TaskStatus.READY, "LOW", 6.0),
        ("TSK-RDY-05", "Integrasi webhook notifikasi pesanan ke URL kustom merchant", "FEAT-ORD-01", TaskStatus.READY, "LOW", 8.0),
        ("TSK-RDY-06", "Batas maksimal pemesanan per pelanggan untuk produk terbatas", "FEAT-CHK-01", TaskStatus.READY, "MEDIUM", 8.0),

        # --- H. BACKLOG Tasks (8 items) ---
        ("TSK-BCK-01", "Fitur pre-order untuk produk dengan waktu pembuatan khusus", "FEAT-CAT-01", TaskStatus.BACKLOG, "LOW", 20.0),
        ("TSK-BCK-02", "Notifikasi SMS OTP saat pembeli mengubah alamat pengiriman default", "FEAT-CUST-01", TaskStatus.BACKLOG, "LOW", 16.0),
        ("TSK-BCK-03", "Dukungan custom kurir internal milik toko (armada sendiri)", "FEAT-SHIP-01", TaskStatus.BACKLOG, "LOW", 14.0),
        ("TSK-BCK-04", "Integrasi Google Tag Manager dan Facebook Pixel pada storefront toko", "FEAT-STORE-02", TaskStatus.BACKLOG, "LOW", 12.0),
        ("TSK-BCK-05", "Fitur export laporan mutasi inventaris bulanan format PDF", "FEAT-INV-02", TaskStatus.BACKLOG, "LOW", 10.0),
        ("TSK-BCK-06", "Kupon diskon bertingkat (Beli 2 Diskon 10%, Beli 3 Diskon 15%)", "FEAT-PRM-01", TaskStatus.BACKLOG, "LOW", 16.0),
        ("TSK-BCK-07", "Dukungan multi-lokasi gudang pengiriman per merchant", "FEAT-INV-01", TaskStatus.BACKLOG, "LOW", 24.0),
        ("TSK-BCK-08", "Fitur bundling paket produk (Product Bundles)", "FEAT-CAT-01", TaskStatus.BACKLOG, "LOW", 18.0),

        # --- I. BLOCKED Tasks (2 items with blocker reasons) ---
        ("TSK-BLK-01", "Pengujian transaksi live production Midtrans QRIS di staging", "FEAT-PAY-01", TaskStatus.BLOCKED, "CRITICAL", 16.0),
        ("TSK-BLK-02", "Sinkronisasi tarif kurir resmi real-time dengan API RajaOngkir Pro", "FEAT-SHIP-02", TaskStatus.BLOCKED, "HIGH", 12.0),

        # --- J. CANCELLED Tasks (2 items) ---
        ("TSK-CNC-01", "Implementasi preview 3D interaktif produk menggunakan WebGL", "FEAT-CAT-01", TaskStatus.CANCELLED, "LOW", 24.0),
        ("TSK-CNC-02", "Integrasi gateway pembayaran kripto Bitcoin Lightning Network", None, TaskStatus.CANCELLED, "LOW", 30.0),

        # --- K. ARCHIVED Tasks (2 items) ---
        ("TSK-ARC-01", "Prototype eksperimen keranjang belanja bersama multi-merchant (Legacy)", None, TaskStatus.DONE, "LOW", 16.0),
        ("TSK-ARC-02", "Eksperimen migrasi database MongoDB untuk inventaris katalog (Legacy)", None, TaskStatus.DONE, "LOW", 20.0),
    ]

    for t_key, t_title, f_key, t_status, t_prio, t_est in tasks_spec:
        stmt = select(Task).where((Task.project_id == project.id) & (Task.key == t_key))
        existing_t = (await session.execute(stmt)).scalar_one_or_none()
        if not existing_t:
            f_obj = features_map.get(f_key) if f_key else None
            is_arc = t_key.startswith("TSK-ARC-")
            arc_at = now - timedelta(days=20) if is_arc else None
            block_reason = None
            if t_key == "TSK-BLK-01":
                block_reason = "Menunggu kredensial production Midtrans dan pembukaan IP whitelist dari tim keamanan klien."
            elif t_key == "TSK-BLK-02":
                block_reason = "Menunggu persetujuan upgrade akun API RajaOngkir Pro untuk kuota tarif kurir nasional."

            t_obj = Task(
                project_id=project.id,
                epic_id=f_obj.epic_id if f_obj else None,
                feature_id=f_obj.id if f_obj else None,
                requirement_id=f_obj.requirement_id if f_obj else None,
                key=t_key,
                title=t_title,
                description=f"Pengerjaan teknis: {t_title}.",
                status=t_status,
                priority=t_prio,
                estimated_hours=t_est,
                assignee_name="Budi Engineer" if "Backend" in t_title or "API" in t_title or "Query" in t_title else "Doni Fullstack",
                blocker_reason=block_reason,
                due_date=today + timedelta(days=10),
                is_archived=is_arc,
                archived_at=arc_at,
            )
            session.add(t_obj)

    print(f"  [+] Seeded {len(tasks_spec)} tasks across all statuses")

    # -------------------------------------------------------------------------
    # 12. DECISIONS / ADR (10 items: 7 ACCEPTED, 1 PROPOSED, 1 REVOKED, 1 SUPERSEDED)
    # -------------------------------------------------------------------------
    decisions_data = [
        # ACCEPTED (7 items - Authoritative supporting evidence for FSD)
        {
            "key": "ADR-001",
            "title": "Isolasi Data Multi-Tenant pada Level Toko (Store-Level Multi-Tenancy)",
            "context": "Merchant membutuhkan kepastian bahwa data katalog, pesanan, dan keuangan toko tidak dapat diakses oleh toko lain dalam satu database bersama.",
            "decision": "Menerapkan logical data isolation di mana setiap query baca dan tulis wajib menyertakan filter merchant store_id terverifikasi pada level middleware dan ORM.",
            "rationale": "Memberikan pemisahan data yang aman dan hemat biaya tanpa memerlukan database terpisah untuk setiap toko pada tahap MVP.",
            "implications": "Seluruh endpoint mutasi dan baca wajib melewati decorator verifikasi kepemilikan store_id.",
            "status": DecisionStatus.ACCEPTED,
        },
        {
            "key": "ADR-002",
            "title": "Pengelolaan Inventaris & Stok pada Level Varian SKU",
            "context": "Produk pakaian dan retail memiliki variasi ukuran dan warna dengan ketersediaan fisik yang berbeda.",
            "decision": "Stok barang tidak dicatat pada produk induk jika produk memiliki varian, melainkan wajib dicatat dan dipotong pada level varian SKU spesifik.",
            "rationale": "Menghindari ketidakcocokan inventaris fisik dan mencegah pembelian ukuran yang sebenarnya sudah habis.",
            "implications": "Stok produk induk merupakan hasil kalkulasi akumulasi stok seluruh varian aktif miliknya.",
            "status": DecisionStatus.ACCEPTED,
        },
        {
            "key": "ADR-003",
            "title": "Single-Store Checkout per Transaksi untuk Rilis MVP",
            "context": "Pembelian multi-store dalam satu transaksi membutuhkan sistem pemisahan pembayaran (split payout) dan ongkir multi-asal yang kompleks.",
            "decision": "Satu transaksi checkout hanya boleh memproses item dari satu merchant toko yang sama. Pembeli yang memilih produk toko berbeda dipandu menyelesaikan checkout toko pertama terlebih dahulu.",
            "rationale": "Menjaga kejelasan akuntansi merchant, menyederhanakan tracking resi kurir, dan meminimalisir risiko sengketa pesanan.",
            "implications": "UI keranjang belanja mengelompokkan item per toko dan memberikan tombol checkout terpisah.",
            "status": DecisionStatus.ACCEPTED,
        },
        {
            "key": "ADR-004",
            "title": "Format SKU Unik Diskop pada Toko Merchant",
            "context": "Dua merchant berbeda mungkin menggunakan kode SKU barang yang sama (misal: BJU-HITAM-L).",
            "decision": "Keunikan kode SKU diverifikasi secara komposit: unik per pasangan (store_id, sku), bukan global unik antar seluruh merchant platform.",
            "rationale": "Memberikan kebebasan bagi merchant menggunakan sistem penamaan SKU internal toko mereka.",
            "implications": "Database index keunikan SKU dibuat dengan composite unique constraint (store_id, sku).",
            "status": DecisionStatus.ACCEPTED,
        },
        {
            "key": "ADR-005",
            "title": "Verifikasi Webhook Midtrans Menggunakan HMAC-SHA512",
            "context": "Notifikasi pembayaran dari gateway publik rentan terhadap pemalsuan request (spoofing) jika tidak diverifikasi.",
            "decision": "Sistem wajib memvalidasi cryptographic signature HMAC-SHA512 dari Midtrans sebelum melakukan update status transaksi menjadi PAID.",
            "rationale": "Menjamin hanya notifikasi resmi dan valid dari payment gateway yang dapat mengonfirmasi pelunasan pesanan.",
            "implications": "Key secret Midtrans disimpan pada environment vault aman dan tidak boleh terekspos ke frontend.",
            "status": DecisionStatus.ACCEPTED,
        },
        {
            "key": "ADR-006",
            "title": "Mesin State Lifecycle Pesanan yang Deterministik",
            "context": "Perubahan status pesanan yang acak dapat menyebabkan ketidakkonsistenan stok dan status pembayaran.",
            "decision": "Status pesanan hanya dapat berpindah sesuai alur resmi: PENDING_PAYMENT -> CONFIRMED -> PROCESSING -> SHIPPED -> COMPLETED, atau CANCELLED.",
            "rationale": "Mencegah pesanan yang belum dibayar langsung dikirimkan oleh merchant.",
            "implications": "State machine guard memblokir transisi status yang tidak valid dan mencatat audit trail.",
            "status": DecisionStatus.ACCEPTED,
        },
        {
            "key": "ADR-007",
            "title": "Penyimpanan Media Produk Menggunakan S3-Compatible Object Storage",
            "context": "Gambar produk resolusi tinggi membutuhkan bandwidth besar dan penyimpanan yang dapat diskalakan.",
            "decision": "Semua berkas media gambar produk disimpan pada S3 Object Storage dengan CDN distribution dan URL yang dihasilkan secara presigned/publik.",
            "rationale": "Mengurangi beban I/O server aplikasi utama dan mempercepat loading gambar di sisi pembeli.",
            "implications": "Server aplikasi hanya menyimpan metadata URL dan storage key gambar.",
            "status": DecisionStatus.ACCEPTED,
        },

        # PROPOSED (1 item)
        {
            "key": "ADR-008",
            "title": "Penerapan Elasticsearch untuk Pencarian Produk Lanjutan",
            "context": "Pencarian full-text search SQL LIKE mulai lambat saat katalog produk bertambah di atas 50.000 SKU.",
            "decision": "Mengusulkan integrasi cluster Elasticsearch untuk pencarian fuzzy search dan autocomplete toko.",
            "rationale": "Meningkatkan kecepatan respon pencarian produk di bawah 50 milidetik.",
            "implications": "Memerlukan infrastruktur server tambahan dan mekanisme sinkronisasi data CDC.",
            "status": DecisionStatus.PROPOSED,
        },

        # REVOKED (1 item)
        {
            "key": "ADR-009",
            "title": "Shared Shopping Cart Lintas Merchant dengan Split Settlement",
            "context": "Diusulkan agar pembeli dapat membayar sekaligus berbagai barang dari berbagai toko.",
            "decision": "Membatalkan arsitektur shared cart multi-store karena regulasi perpajakan dan biaya fee transaksi perbankan yang tidak efisien.",
            "rationale": "Digantikan oleh ADR-003 (Single-store checkout per transaksi).",
            "implications": "Arsitektur split billing dibatalkan.",
            "status": DecisionStatus.REVOKED,
        },

        # SUPERSEDED (1 item)
        {
            "key": "ADR-010",
            "title": "Flat Shipping Rate Rp 10.000 Nasional Tanpa Tiering",
            "context": "Keputusan awal untuk menerapkan tarif ongkir tetap Rp 10.000 ke seluruh Indonesia.",
            "decision": "Digantikan oleh sistem tarif berjenjang berbasis berat aktual dan kurir resmi.",
            "rationale": "Merugikan merchant yang menjual barang berat atau mengirim ke luar pulau Jawa.",
            "implications": "Digantikan oleh kalkulator ongkir dinamis kurir.",
            "status": DecisionStatus.SUPERSEDED,
        },
    ]

    for dec in decisions_data:
        stmt = select(Decision).where(
            (Decision.project_id == project.id) & (Decision.key == dec["key"])
        )
        if not (await session.execute(stmt)).scalar_one_or_none():
            dec_obj = Decision(
                project_id=project.id,
                key=dec["key"],
                title=dec["title"],
                context=dec["context"],
                decision=dec["decision"],
                rationale=dec["rationale"],
                implications=dec["implications"],
                status=dec["status"],
                decided_by="Ahmad Fadillah / Cahyo PM",
            )
            session.add(dec_obj)

    print(f"  [+] Seeded {len(decisions_data)} decisions (7 Accepted, 1 Proposed, 1 Revoked, 1 Superseded)")

    # -------------------------------------------------------------------------
    # 13. SCOPE CHANGES (4 items: 1 CLIENT_APPROVED, 1 IMPLEMENTED, 1 UNDER_EVALUATION, 1 REJECTED)
    # -------------------------------------------------------------------------
    scope_changes_data = [
        {
            "key": "SC-001",
            "title": "Penambahan Fitur Bulk Import & Export Produk via CSV ke Fase 1",
            "description": "Merchant besar memiliki ribuan SKU yang tidak memungkinkan diinput satu per satu secara manual. Diperlukan modul bulk import/export CSV.",
            "reason": "Permintaan resmi dari calon merchant utama Lapaq saat sesi demo awal.",
            "impact_summary": "Menambah 1 sprint kerja (2 minggu) pada modul katalog dan penambahan endpoint validasi streaming CSV.",
            "status": ScopeChangeStatus.CLIENT_APPROVED,
            "requested_by": "Dewi Lestari (Head of Product)",
            "approved_by": "Bambang Sudiro (Managing Director)",
        },
        {
            "key": "SC-002",
            "title": "Penambahan Notifikasi & Indikator Produk Low-Stock pada Dashboard Merchant",
            "description": "Menambahkan visual badge dan email alert ketika kuantitas stok varian berada di bawah ambang batas minimum toko.",
            "reason": "Pencegahan kekosongan stok yang tidak disadari merchant pada produk fast-moving.",
            "impact_summary": "Penambahan 1 Feature dan 2 Task pada modul inventaris; tidak menambah timeline rilis MVP.",
            "status": ScopeChangeStatus.IMPLEMENTED,
            "requested_by": "Dewi Lestari (Head of Product)",
            "approved_by": "Bambang Sudiro (Managing Director)",
        },
        {
            "key": "SC-003",
            "title": "Penambahan Otomasi Copywriting Deskripsi Produk dengan AI",
            "description": "Integrasi model AI LLM untuk menghasilkan deskripsi produk otomatis dari foto dan kata kunci yang dimasukkan merchant.",
            "reason": "Inisiatif inovasi fitur dari tim marketing merchant acquisition.",
            "impact_summary": "Membutuhkan integrasi AI API eksternal dan biaya token berkelanjutan; dievaluasi untuk rilis Fase 2.",
            "status": ScopeChangeStatus.UNDER_EVALUATION,
            "requested_by": "Tim Marketing Lapaq",
            "approved_by": None,
        },
        {
            "key": "SC-004",
            "title": "Integrasi Pembayaran Kripto & Settlement Otomatis",
            "description": "Dukungan pembayaran menggunakan stablecoin USDT dan Bitcoin.",
            "reason": "Usulan dari stakeholder eksternal.",
            "impact_summary": "Ditolak karena tidak sesuai dengan regulasi mata uang Rupiah dan lisensi Bank Indonesia.",
            "status": ScopeChangeStatus.REJECTED,
            "requested_by": "Stakeholder Eksternal",
            "approved_by": "Bambang Sudiro (Managing Director)",
        },
    ]

    for sc in scope_changes_data:
        stmt = select(ScopeChange).where(
            (ScopeChange.project_id == project.id) & (ScopeChange.key == sc["key"])
        )
        if not (await session.execute(stmt)).scalar_one_or_none():
            sc_obj = ScopeChange(
                project_id=project.id,
                key=sc["key"],
                title=sc["title"],
                description=sc["description"],
                reason=sc["reason"],
                impact_summary=sc["impact_summary"],
                status=sc["status"],
                requested_by=sc["requested_by"],
                approved_by=sc["approved_by"],
                approved_at=now - timedelta(days=15) if sc["approved_by"] else None,
            )
            session.add(sc_obj)

    print(f"  [+] Seeded {len(scope_changes_data)} scope changes (1 Approved, 1 Implemented, 1 Under Evaluation, 1 Rejected)")

    # -------------------------------------------------------------------------
    # 14. MEETINGS & MINUTES OF MEETING (4 meetings + 1 MoMDocument)
    # -------------------------------------------------------------------------
    meetings_data = [
        {
            "key": "MTG-LPQ-01",
            "title": "Kickoff & Discovery Platform Lapaq Multi-Store",
            "type": MeetingType.DISCOVERY,
            "status": MeetingStatus.FINALIZED,
            "occurred_at": now - timedelta(days=40),
            "summary": "Pembahasan ruang lingkup platform multi-store, pembagian peran stakeholder, dan konfirmasi target rilis MVP 90 hari.",
            "action_items": [
                ("Finalisasi brief arsitektur multi-tenant", "Cahyo PM"),
                ("Pengiriman dokumentasi API Sandbox Midtrans", "Ahmad Fadillah"),
            ],
        },
        {
            "key": "MTG-LPQ-02",
            "title": "Review Ruang Lingkup & Kebutuhan Fungsional Varian Produk",
            "type": MeetingType.CLIENT_REVIEW,
            "status": MeetingStatus.FINALIZED,
            "occurred_at": now - timedelta(days=28),
            "summary": "Menyepakati spesifikasi varian multi-dimensi (ukuran x warna) dan penegasan bahwa stok dicatat pada level SKU anak.",
            "action_items": [
                ("Detailkan acceptance criteria varian pada FSD", "Cahyo PM"),
                ("Selesaikan prototype UI matrix varian", "Sinta Designer"),
            ],
        },
        {
            "key": "MTG-LPQ-03",
            "title": "Sprint Planning: Cart, Checkout & Midtrans Integration",
            "type": MeetingType.SPRINT_PLANNING,
            "status": MeetingStatus.COMPLETED,
            "occurred_at": now - timedelta(days=14),
            "summary": "Perencanaan sprint implementasi keranjang belanja, checkout single-store, dan integrasi webhook callback Midtrans Snap.",
            "action_items": [
                ("Setup endpoint webhook listener HMAC-SHA512", "Budi Engineer"),
                ("Slicing UI checkout responsif", "Doni Fullstack"),
            ],
        },
        {
            "key": "MTG-LPQ-04",
            "title": "Sprint Checkpoint & Evaluasi Race Condition Stok",
            "type": MeetingType.WEEKLY_SYNC,
            "status": MeetingStatus.COMPLETED,
            "occurred_at": now - timedelta(days=3),
            "summary": "Review hasil pengujian QA: ditemukan potensi race condition stok saat checkout simultan. Tim memutuskan implementasi atomic row-lock.",
            "action_items": [
                ("Implementasi row-level lock pada checkout query", "Budi Engineer"),
                ("Uji beban simulasi 50 checkout concurrent", "Rizky QA"),
            ],
        },
    ]

    for m_item in meetings_data:
        stmt = select(Meeting).where(
            (Meeting.project_id == project.id) & (Meeting.meeting_key == m_item["key"])
        )
        existing_m = (await session.execute(stmt)).scalar_one_or_none()
        if not existing_m:
            m_obj = Meeting(
                project_id=project.id,
                meeting_key=m_item["key"],
                title=m_item["title"],
                meeting_type=m_item["type"],
                status=m_item["status"],
                occurred_at=m_item["occurred_at"],
                summary=m_item["summary"],
                notes=f"Notula rapat {m_item['title']}. Pembahasan berjalan lancar.",
                created_by_user_id=pm_user.id,
            )
            session.add(m_obj)
            await session.flush()

            # Add participants
            p1 = MeetingParticipant(
                meeting_id=m_obj.id,
                participant_type=ParticipantType.INTERNAL,
                display_name_snapshot="Cahyo PM",
                role_snapshot="Lead Project Manager",
                user_id=pm_user.id,
            )
            p2 = MeetingParticipant(
                meeting_id=m_obj.id,
                participant_type=ParticipantType.CLIENT,
                display_name_snapshot="Dewi Lestari",
                role_snapshot="Head of Product",
            )
            session.add_all([p1, p2])

            for ai_title, ai_owner in m_item["action_items"]:
                act = ActionItem(
                    project_id=project.id,
                    meeting_id=m_obj.id,
                    title=ai_title,
                    owner_name=ai_owner,
                    status=ActionItemStatus.DONE if "Finalisasi" in ai_title or "Pengiriman" in ai_title else ActionItemStatus.IN_PROGRESS,
                    due_date=now + timedelta(days=5),
                )
                session.add(act)

    # MoMDocument
    stmt_mom = select(MoMDocument).where(MoMDocument.mom_key == "MOM-LPQ-001")
    if not (await session.execute(stmt_mom)).scalars().first():
        mom = MoMDocument(
            mom_key="MOM-LPQ-001",
            title="Notula Rapat Koordinasi Arsitektur Multi-Store & Checkout Lapaq",
            meeting_date=now - timedelta(days=28),
            project_id=project.id,
            project_name=project.name,
            raw_text="Rapat koordinasi teknis menyepakati model isolasi multi-tenant pada level toko dan single-store checkout.",
            content_md="""# Minutes of Meeting: Koordinasi Arsitektur Multi-Store & Checkout
- Tanggal: 28 hari lalu
- Peserta: Cahyo PM, Dewi Lestari, Ahmad Fadillah, Budi Engineer
- Agenda: Finalisasi model store-isolation dan arsitektur checkout

## 1. Ringkasan Diskusi & Keputusan
- **Isolasi Data Toko:** Disepakati penggunaan composite query filtering store_id pada setiap akses database.
- **Kebijakan Keranjang Belanja:** Checkout dibatasi per satu toko dalam satu transaksi.

## 2. Tindak Lanjut
1. Budi Engineer: Pasang composite index (store_id, sku) pada database produk.
2. Cahyo PM: Update spesifikasi fungsional FSD untuk aturan checkout single-store.
""",
            summary="Rapat menyepakati composite query filtering store-isolation dan single-store checkout.",
            attendees=["Cahyo PM", "Dewi Lestari", "Ahmad Fadillah", "Budi Engineer"],
            decisions=[
                "Composite query filtering store_id wajib pada seluruh mutasi data.",
                "Checkout dibatasi per satu toko dalam satu waktu transaksi.",
            ],
            created_by_user_id=pm_user.id,
        )
        session.add(mom)

    # -------------------------------------------------------------------------
    # 15. ISSUES, RISKS, BLOCKERS & CLIENT DEPENDENCIES
    # -------------------------------------------------------------------------
    # Issues (4 items)
    issues_data = [
        ("ISS-LPQ-01", "SKU uniqueness constraint failed on concurrent bulk variant creation", "RESOLVED", "CRITICAL", "Terselesaikan dengan penerapan database transaction lock dan composite unique index (store_id, sku)."),
        ("ISS-LPQ-02", "Checkout inventory decrement race condition under peak load", "OPEN", "HIGH", "Sedang dalam proses perbaikan menggunakan atomic UPDATE ... WHERE stock >= quantity lock."),
        ("ISS-LPQ-03", "Webhook signature verification intermittent failure on sandbox", "IN_INVESTIGATION", "MEDIUM", "Ditemukan perbedaan newline escaping pada payload sandbox Midtrans tertentu."),
        ("ISS-LPQ-04", "Store slug collision on uppercase/lowercase merchant names", "CLOSED", "LOW", "Slug toko kini dinormalisasi secara otomatis menjadi lowercase alphanumeric dengan validator regex."),
    ]
    for i_key, i_title, i_status, i_sev, i_notes in issues_data:
        stmt = select(Issue).where((Issue.project_id == project.id) & (Issue.key == i_key))
        if not (await session.execute(stmt)).scalar_one_or_none():
            iss = Issue(
                project_id=project.id,
                key=i_key,
                title=i_title,
                description=f"Detail isu operasional: {i_title}.",
                severity=i_sev,
                status=IssueStatus(i_status),
                resolution_notes=i_notes,
                resolved_at=now - timedelta(days=10) if i_status in ["RESOLVED", "CLOSED"] else None,
            )
            session.add(iss)

    # Risks (2 items)
    risks_data = [
        ("RSK-LPQ-01", "Third-party payment gateway sandbox latency spike during UAT", "MITIGATED", "HIGH", "HIGH", "Terapkan webhook retry mechanism dengan exponential backoff dan fallback polling status pembayaran."),
        ("RSK-LPQ-02", "Third-party shipping API rate limit on courier rate inquiries", "IDENTIFIED", "MEDIUM", "HIGH", "Siapkan Redis caching tarif ongkos kirim berdasarkan pasangan kota asal-tujuan selama 24 jam."),
    ]
    for r_key, r_title, r_status, r_prob, r_imp, r_plan in risks_data:
        stmt = select(Risk).where((Risk.project_id == project.id) & (Risk.key == r_key))
        if not (await session.execute(stmt)).scalar_one_or_none():
            rsk = Risk(
                project_id=project.id,
                key=r_key,
                title=r_title,
                description=f"Analisis risiko teknis: {r_title}.",
                probability=r_prob,
                impact=r_imp,
                mitigation_plan=r_plan,
                status=RiskStatus(r_status),
            )
            session.add(rsk)

    # Blockers (1 item)
    stmt_blk = select(Blocker).where((Blocker.project_id == project.id) & (Blocker.key == "BLK-LPQ-01"))
    if not (await session.execute(stmt_blk)).scalar_one_or_none():
        blk = Blocker(
            project_id=project.id,
            key="BLK-LPQ-01",
            title="Menunggu kredensial production Midtrans dan whitelist IP server staging",
            description="Tim belum dapat melakukan end-to-end payment test di environment live production sebelum IP server staging di-whitelist oleh tim operasional perbankan.",
            blocker_type="INTEGRATION",
            status=BlockerStatus.ACTIVE,
        )
        session.add(blk)

    # Client Dependencies (2 items)
    deps_data = [
        ("DEP-LPQ-01", "Dokumen API Sandbox Midtrans & Merchant ID", "CREDENTIALS", ClientDependencyStatus.PROVIDED, today - timedelta(days=35), today - timedelta(days=30), today - timedelta(days=32)),
        ("DEP-LPQ-02", "Master Data Kode Pos & Tarif Resmi Ekspedisi JNE/SiCepat", "DATA", ClientDependencyStatus.REQUESTED, today - timedelta(days=10), today + timedelta(days=5), None),
    ]
    for d_key, d_title, d_type, d_status, req_date, exp_date, prov_date in deps_data:
        stmt = select(ClientDependency).where((ClientDependency.project_id == project.id) & (ClientDependency.key == d_key))
        if not (await session.execute(stmt)).scalar_one_or_none():
            cd = ClientDependency(
                project_id=project.id,
                key=d_key,
                title=d_title,
                description=f"Ketergantungan terhadap stakeholder klien: {d_title}.",
                dependency_type=d_type,
                status=d_status,
                requested_date=req_date,
                expected_date=exp_date,
                provided_date=prov_date,
            )
            session.add(cd)

    # -------------------------------------------------------------------------
    # 16. DELIVERY EVIDENCE (Milestones & Project Resources)
    # -------------------------------------------------------------------------
    milestones_data = [
        ("MLS-01", "Milestone 1: Multi-Store & Catalog Management MVP", today - timedelta(days=25), MilestoneStatus.ACHIEVED),
        ("MLS-02", "Milestone 2: Cart, Checkout & Payment Gateway Integration", today - timedelta(days=5), MilestoneStatus.ACHIEVED),
        ("MLS-03", "Milestone 3: Shipping, Promotions & Inventory Controls", today + timedelta(days=20), MilestoneStatus.PLANNED),
        ("MLS-04", "Milestone 4: UAT, Penetration Testing & Production Handover", today + timedelta(days=45), MilestoneStatus.PLANNED),
    ]
    for m_key, m_title, m_date, m_status in milestones_data:
        stmt = select(Milestone).where((Milestone.project_id == project.id) & (Milestone.key == m_key))
        if not (await session.execute(stmt)).scalar_one_or_none():
            ml = Milestone(
                project_id=project.id,
                key=m_key,
                title=m_title,
                target_date=m_date,
                status=m_status,
            )
            session.add(ml)

    resources_data = [
        ("RES-01", "Dokumen Arsitektur & Spesifikasi Fungsional MVP v1.0", ResourceType.DELIVERABLE, DeliverableStatus.ACCEPTED, "v1.0", today - timedelta(days=15)),
        ("RES-02", "Payment Gateway Midtrans Integration Test Suite Report", ResourceType.DELIVERABLE, DeliverableStatus.ACCEPTED, "v1.0", today - timedelta(days=10)),
        ("RES-03", "Merchant Onboarding & Catalog Slicing UI Artifacts", ResourceType.DELIVERABLE, DeliverableStatus.SUBMITTED, "v0.9", today - timedelta(days=3)),
        ("RES-04", "Security Penetration & Data Isolation Audit Report", ResourceType.DELIVERABLE, DeliverableStatus.DRAFT, "v0.5", None),
    ]
    for r_code, r_name, r_type, d_status, d_ver, d_date in resources_data:
        stmt = select(ProjectResource).where(
            (ProjectResource.project_id == project.id) & (ProjectResource.name == r_name)
        )
        if not (await session.execute(stmt)).scalar_one_or_none():
            res_obj = ProjectResource(
                project_id=project.id,
                name=r_name,
                description=f"Deliverable bukti pengiriman proyek: {r_name}.",
                resource_type=r_type,
                status=ResourceStatus.ACTIVE,
                deliverable_status=d_status,
                deliverable_version=d_ver,
                delivery_date=d_date,
            )
            session.add(res_obj)

    await session.commit()
    print("[Seed Lapaq] Seeding for PRJ-005 completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed_lapaq_commerce_project())
