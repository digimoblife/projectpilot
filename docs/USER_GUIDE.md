# 📘 Buku Panduan Pengguna: ProjectPilot
> **Panduan Lengkap Manajemen Proyek & Presales untuk Pemula**  
> *Ditulis dengan bahasa yang mudah dipahami, langkah demi langkah, dari awal hingga proyek selesai.*

---

## 🌟 Daftar Isi
1. [Pengenalan Singkat: Apa itu ProjectPilot?](#1-pengenalan-singkat-apa-itu-projectpilot)
2. [Alur Besar (Big Picture) di ProjectPilot](#2-alur-besar-big-picture-di-projectpilot)
3. [Langkah 1: Masuk ke Sistem (Login) & Dashboard](#3-langkah-1-masuk-ke-sistem-login--dashboard)
4. [Langkah 2: Mengelola Peluang Klien (Leads Pipeline)](#4-langkah-2-mengelola-peluang-klien-leads-pipeline)
   - [Membuat Lead Baru & Referensi Klien](#41-membuat-lead-baru--melampirkan-referensi-klien)
   - [Halaman Detail Lead & Alur Aksi Terpandu](#42-halaman-detail-lead--alur-aksi-terpandu)
   - [Melihat Riwayat Alur Proses](#43-memahami-section-riwayat-alur-proses)
   - [Mengonversi Lead Menjadi Proyek Resmi](#44-mengonversi-lead-menjadi-proyek-resmi)
5. [Langkah 3: Menjalankan Proyek (Project Workspace)](#5-langkah-3-menjalankan-proyek-project-workspace)
   - [Mengenal 7 Tahap Hidup Proyek (Project Lifecycle)](#51-mengenal-7-tahap-hidup-proyek-project-lifecycle)
   - [Mengelola Tugas di Kanban Board (Papan Tugas)](#52-mengelola-tugas-di-kanban-board-papan-tugas)
   - [Melihat Jadwal di Timeline (Gantt Chart)](#53-melihat-jadwal-di-timeline-gantt-chart)
   - [Menyimpan Dokumen & File Proyek](#54-menyimpan-dokumen--file-proyek)
6. [Langkah 4: Halaman Tugas Saya (My Work)](#6-langkah-4-halaman-tugas-saya-my-work)
7. [Tips Praktis untuk Pemula (Best Practices)](#7-tips-praktis-untuk-pemula-best-practices)

---

## 1. Pengenalan Singkat: Apa itu ProjectPilot?

Bayangkan Anda menjalankan sebuah kantor konsultan atau software house:
- Ada calon klien yang datang menanyakan pembuatan website/aplikasi (*Lead/Presales*).
- Setelah sepakat, pekerjaan tersebut resmi menjadi proyek tim (*Project*).
- Tim bekerja membagi tugas, menentukan deadline, membuat desain, coding, uji coba, hingga serah terima ke klien.

**ProjectPilot** adalah aplikasi yang membantu Anda mencatat, memantau, dan mengontrol semua proses tersebut di satu tempat agar **tidak ada janji ke klien yang terlupakan** dan **tim bekerja dengan target yang jelas**.

---

## 2. Alur Besar (*Big Picture*) di ProjectPilot

Secara garis besar, perjalanan sebuah pekerjaan di ProjectPilot terbagi menjadi **2 Fase Utama**:

```text
┌────────────────────────────────────────────────────────┐
│  FASE 1: PRESALES & LEADS (Mencari Kesepakatan)        │
│  1. Baru ➔ 2. Dihubungi ➔ 3. Brief ➔ 4. Terkualifikasi │
└──────────────────────────┬─────────────────────────────┘
                           │ ✨ Klik "Konversi ke Proyek"
                           ▼
┌────────────────────────────────────────────────────────┐
│  FASE 2: WORKSPACE PROYEK (Pengerjaan Nyata oleh Tim)  │
│  Discovery ➔ Planning ➔ Design ➔ Dev ➔ Test ➔ Done     │
└────────────────────────────────────────────────────────┘
```

---

## 3. Langkah 1: Masuk ke Sistem (Login) & Dashboard

### Cara Login:
1. Buka browser dan akses alamat: `http://localhost:3000`.
2. Masukkan akun Anda (contoh akun admin: `admin@projectpilot.id` / password: `Password123!`).
3. Klik tombol **"Masuk ke ProjectPilot"**.

### Memahami Halaman Dashboard (`/dashboard`):
Dashboard adalah ruang kemudi utama Anda. Di sini Anda langsung melihat:
- **Total Lead Aktif**: Berapa banyak calon proyek yang sedang dijajaki.
- **Proyek Berjalan**: Berapa banyak proyek resmi yang sedang dikerjakan tim.
- **Deadline Terdekat**: Tugas-tugas yang batas waktunya sudah dekat.
- **Beban Kerja Tim**: Siapa saja anggota tim yang sedang memegang tugas.

---

## 4. Langkah 2: Mengelola Peluang Klien (Leads Pipeline)

Halaman ini dapat diakses melalui menu navigasi samping: **"Leads"** (`/leads`).

### 4.1. Membuat Lead Baru & Melampirkan Referensi Klien
Ketika ada calon klien menghubungi kantor Anda:
1. Buka halaman **Leads**, lalu klik tombol **`+ Tambah Lead Baru`** di pojok kanan atas.
2. Isi formulir yang muncul:
   - **Nama Lead / Peluang**: Contoh: *"Pengembangan Aplikasi Kasir POS & Loyalty"*.
   - **Nama Perusahaan Klien**: Contoh: *"PT Retail Nusantara"*.
   - **Nama & Kontak PIC Klien**: Nama orang yang bisa dihubungi, nomor WhatsApp, dan emailnya.
   - **Tipe Proyek & Sumber Lead**: Misalnya *"Web App"*, sumber *"Referral"*.
   - **Deskripsi Kebutuhan**: Jelaskan secara singkat apa yang klien inginkan.
3. **Melampirkan Referensi dari Klien**:
   Klien seringkali memberikan contoh acuan. Anda bisa melampirkan lebih dari satu:
   - **🔗 Tautan URL**: Masukkan link Figma, link Google Drive, atau website referensi kompetitor.
   - **📝 Catatan Teks**: Masukkan catatan tertulis seperti *"Wajib support printer bluetooth thermal"*.
   - **🖼️ Upload Gambar**: Pilih gambar screenshot mockup, alur coretan tangan, atau foto papan tulis.
4. Klik tombol **"Simpan Lead Baru"**.

---

### 4.2. Halaman Detail Lead & Alur Aksi Terpandu
Untuk melihat detail lengkap sebuah lead, **klik nama lead** atau tombol **`Detail & Alur ➔`** pada kartu.

Di dalam halaman detail (`/leads/[id]`), Anda tidak perlu bingung apa yang harus dilakukan selanjutnya, karena sistem sudah menyediakan **Tombol Aksi Terpandu** di pojok kanan atas:

```text
[ 1. Baru ] ──► [ 2. Dihubungi ] ──► [ 3. Brief ] ──► [ 4. Terkualifikasi ] ──► [ 5. Proyek Aktif ]
```

#### Tahap Aksi Berurutan:
1. **Saat status masih "Baru (NEW)"**:
   - Klik tombol **`[ 📞 Catat Kontak Pertama ]`**.
   - Masukkan tanggal kontak, media yang digunakan (WhatsApp/Telepon/Email), dan ringkasan hasil obrolan.
   - Klik **Simpan** ➔ Status otomatis maju menjadi **Dihubungi (CONTACTED)**.

2. **Saat status "Dihubungi (CONTACTED)"**:
   - Klik tombol **`[ 📅 Jadwalkan Discovery Brief ]`**.
   - Masukkan tanggal meeting, jam (WIB), tautan Google Meet/Zoom atau alamat kantor, dan agenda pertemuan.
   - Klik **Simpan** ➔ Status otomatis maju menjadi **Brief Terjadwal (BRIEF_SCHEDULED)**.

3. **Saat status "Brief Terjadwal (BRIEF_SCHEDULED)"**:
   - Setelah meeting dengan klien selesai, klik tombol **`[ 📋 Kualifikasi Scope Kebutuhan ]`**.
   - Masukkan kesimpulan: Ruang lingkup apa saja yang disepakati, estimasi waktu pengerjaan, dan kesiapan tim teknis.
   - Klik **Simpan** ➔ Status otomatis maju menjadi **Terkualifikasi (QUALIFIED)**.

4. **Saat status "Terkualifikasi (QUALIFIED)"**:
   - Peluang sudah matang! Klik tombol **`[ ✨ Konversi ke Proyek Resmi ]`**.
   - Masukkan **Kode Proyek** (contoh: `POS-2026`) dan **Nama Proyek**.
   - Klik **Konversi** ➔ Sistem otomatis membuat ruang kerja proyek (*Project Workspace*) resmi!

---

### 4.3. Memahami Section "Riwayat Alur Proses"
Pada halaman detail lead, terdapat kotak **"Riwayat Alur Proses"**. 
Section ini sangat berguna jika Anda ingin mengecek kembali:
- *Kapan klien pertama kali dihubungi dan apa hasilnya?*
- *Kapan jadwal meeting brief-nya dan di link mana?*
- *Apa saja poin teknis yang disepakati saat kualifikasi?*

Semua form input yang pernah Anda simpan di pop-up aksi otomatis tersusun rapi dari Tahap 1 hingga Tahap 5 dengan badge status hijau (Selesai).

---

## 5. Langkah 3: Menjalankan Proyek (Project Workspace)

Setelah lead dikonversi, Anda akan langsung diarahkan ke halaman **Workspace Proyek** (`/projects/[id]`).

### 5.1. Mengenal 7 Tahap Hidup Proyek (*Lifecycle*)
ProjectPilot memandu tim melalui 7 tahap baku agar pengerjaan rapi:
1. **DISCOVERY**: Membedah detail kebutuhan klien.
2. **PLANNING**: Menyusun daftar tugas (*breakdown* tugas), jadwal, dan pembagian personil.
3. **DESIGN**: Mengerjakan desain wireframe, UI/UX, dan prototype visual.
4. **DEVELOPMENT**: Pemrograman backend, frontend, database, dan integrasi API.
5. **TESTING (QA)**: Uji coba aplikasi, pengecekan bug, dan User Acceptance Testing (UAT) bersama klien.
6. **DEPLOYMENT**: Peluncuran aplikasi ke server production / rilis ke publik.
7. **CLOSING**: Serah terima berkas (BAST), pelatihan user, dan penutupan proyek resmi.

---

### 5.2. Mengelola Tugas di Kanban Board (Papan Tugas)
Masuk ke tab **"Tasks"** di halaman proyek:
- Anda akan melihat kolom papan tugas:
  - **TODO (Belum Dikerjakan)**: Daftar tugas yang sudah direncanakan.
  - **IN PROGRESS (Sedang Dikerjakan)**: Tugas yang sedang digarap oleh programmer/desainer.
  - **IN REVIEW (Sedang Ditinjau)**: Tugas yang sudah selesai dikerjakan dan sedang dicek oleh QA / PM.
  - **DONE (Selesai)**: Tugas yang sudah lulus uji dan tuntas.
- **Cara Menggeser Tugas**: Cukup klik dan tarik (*drag-and-drop*) kartu tugas dari satu kolom ke kolom berikutnya.
- **Cara Menambah Tugas Baru**: Klik tombol `+ Tambah Task`, beri judul tugas, tentukan siapa yang mengerjakan (*Assignee*), prioritas (*Urgent/High/Medium/Low*), dan tanggal deadline-nya.

---

### 5.3. Melihat Jadwal di Timeline (Gantt Chart)
Masuk ke tab **"Timeline"**:
- Anda dapat melihat diagram batang waktu horisontal.
- Fitur ini membantu Anda menjawab pertanyaan klien: *"Tugas A selesai kapan, dan kapan kita mulai tugas B?"*.

---

### 5.4. Menyimpan Dokumen & File Proyek
Masuk ke tab **"Documents"**:
- Unggah file penting seperti Kerangka Acuan Kerja (TOR), Berita Acara, Kontrak, atau panduan instalasi.
- Dokumen proyek tersimpan rapi di satu tempat sehingga tim tidak perlu mencari-cari file di grup chat.

---

## 6. Langkah 4: Halaman Tugas Saya (My Work)

Jika Anda atau anggota tim Anda login:
1. Klik menu **"My Work"** (`/my-work`) di navigasi sebelah kiri.
2. Halaman ini khusus menyaring **hanya tugas-tugas yang ditugaskan kepada akun Anda** dari semua proyek yang ada.
3. Setiap staf dapat fokus menyelesaikan pekerjaannya hari ini tanpa perlu membuka proyek satu per satu.

---

## 7. Tips Praktis untuk Pemula (Best Practices)

1. 🎯 **Jangan Biarkan Lead Menggantung**: 
   Setiap kali ada prospek masuk, langsung catat di menu *Leads*, dan lakukan kontak dalam waktu 1x24 jam.
2. 📎 **Selalu Lampirkan Acuan Klien**: 
   Gunakan fitur *Referensi Klien* untuk menaruh link Figma atau foto coretan dari klien agar programmer dan desainer tidak salah paham.
3. 📝 **Manfaatkan Pop-up Aksi Terpandu**: 
   Ikuti tombol alur warna biru/ungu/hijau di pojok kanan atas detail lead agar riwayat tercatat otomatis.
4. ⏰ **Cek Dashboard Setiap Pagi**: 
   Luangkan waktu 5 menit setiap pagi untuk melihat kartu *Deadline Terdekat* di Dashboard.

---

*Selamat mengelola proyek dengan rapi, terstruktur, dan sukses bersama ProjectPilot!* 🚀
