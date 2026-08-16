# ProjectPilot — Production Operations & Deployment Runbook

Panduan operasional resmi untuk deployment, pemeliharaan, backup/restore, dan penanganan insiden sistem **ProjectPilot** di lingkungan produksi.

---

## 1. Arsitektur Komponen & Isolasi Jaringan

ProjectPilot dioperasikan dalam arsitektur multi-container terisolasi menggunakan Docker Compose:

```
[ Internet (Public Users) ]
            │
      Port 80 / 443
            ▼
┌─────────────────────────────────────────────────────────┐
│  NGINX Reverse Proxy (projectpilot_prod_proxy)          │
│  - SSL/TLS Termination                                  │
│  - Hardened Security Headers (CSP, HSTS, X-Frame)       │
│  - Payload Limit 25MB & Gzip Compression                │
└──────────────┬──────────────────────────┬───────────────┘
               │ (Internal /)             │ (Internal /api/)
               ▼                          ▼
┌───────────────────────────┐  ┌───────────────────────────┐
│ Next.js Frontend          │  │ FastAPI Backend API       │
│ (projectpilot_prod_web)   │  │ (projectpilot_prod_api)   │
└───────────────────────────┘  └─────────────┬─────────────┘
                                             │
                          ┌──────────────────┴──────────────────┐
                          │ Internal Isolated Network (Private) │
                          ▼                                     ▼
            ┌───────────────────────────┐         ┌───────────────────────────┐
            │ PostgreSQL 16 DB          │         │ Async Background Worker   │
            │ (projectpilot_prod_postgres)        │ (projectpilot_prod_worker)│
            └───────────────────────────┘         └───────────────────────────┘
```

> [!IMPORTANT]
> **Zero Public DB Exposure**: Database PostgreSQL hanya berada di dalam Docker network internal (`internal_backend: internal: true`) dan **sama sekali tidak memiliki port yang dibuka ke publik**.

---

## 2. Prosedur Deployment Awal (Initial Production Setup)

### Langkah 1: Kloning Repositori ke Server
```bash
git clone https://github.com/digimoblife/projectpilot.git /opt/projectpilot
cd /opt/projectpilot
```

### Langkah 2: Konfigurasi Environment Produksi
Salin template `.env.production.example` menjadi `.env`:
```bash
cp .env.production.example .env
```

Edit file `.env` dan lengkapi:
1. `POSTGRES_PASSWORD`: Buat kata sandi database yang kuat.
2. `SECRET_KEY` & `JWT_SECRET_KEY`: Generate token acak (minimal 32 karakter):
   ```bash
   openssl rand -hex 32
   ```
3. `GEMINI_API_KEY`: Masukkan API Key Google Gemini AI resmi untuk produksi.
4. `CORS_ORIGINS`: Atur domain domain publik sistem Anda (contoh: `https://projectpilot.id`).

### Langkah 3: Build & Jalankan Kontainer Produksi
```bash
docker compose -f compose.prod.yml up -d --build
```

### Langkah 4: Verifikasi Kesiapan Sistem (*Readiness Check*)
```bash
curl -i http://localhost/api/v1/ready
```
Output yang diharapkan:
```json
{
  "status": "ready",
  "database": "connected",
  "ai_service": "configured",
  "environment": "production"
}
```

---

## 3. Prosedur Rilis & Pembaruan Versi Baru (*Rolling Update*)

Untuk memperbarui aplikasi ke versi terbaru tanpa downtime database:

```bash
# 1. Tarik pembaruan kode
git pull origin main

# 2. Rebuild dan restart kontainer API dan Frontend
docker compose -f compose.prod.yml up -d --build api web

# 3. Periksa status migrasi dan log container
docker compose -f compose.prod.yml logs -f api
```

Saat kontainer API booting, skrip `entrypoint.sh` secara otomatis menjalankan `alembic upgrade head` sebelum server menerima lalu lintas publik.

---

## 4. Prosedur Backup & Disaster Recovery (DR)

### Backup Manual / On-Demand
```bash
./scripts/backup_db.sh
```
File backup terkompresi akan disimpan di folder `./backups/projectpilot_backup_YYYYMMDD_HHMMSS.sql.gz`.

### Otomatisasi Backup Harian (Cron Job)
Tambahkan ke crontab server (`crontab -e`):
```cron
# Jalankan backup setiap hari pukul 02:00 pagi
0 2 * * * /opt/projectpilot/scripts/backup_db.sh >> /var/log/projectpilot_backup.log 2>&1
```

### Prosedur Pemulihan Database (*Restore*)
Jika terjadi insiden data corruption atau perpindahan server:
```bash
./scripts/restore_db.sh ./backups/projectpilot_backup_YYYYMMDD_HHMMSS.sql.gz
```

---

## 5. Prosedur Rotasi Secret & Kunci API

1. **Rotasi GEMINI_API_KEY**:
   - Perbarui nilai `GEMINI_API_KEY` di file `.env`.
   - Restart container API dan Worker:
     ```bash
     docker compose -f compose.prod.yml restart api worker
     ```
2. **Rotasi JWT_SECRET_KEY**:
   - Perbarui nilai `JWT_SECRET_KEY` di `.env`.
   - Restart container API. *(Catatan: Pengguna yang sedang login akan diminta login ulang).*

---

## 6. Penanganan Insiden (*Incident Troubleshooting*)

| Gejala | Penyebab Umum | Tindakan Perbaikan |
| :--- | :--- | :--- |
| Endpoint `/ready` return `503` | Database disconnected | Cek log DB: `docker logs projectpilot_prod_postgres` |
| AI Generation Error (`500`) | Kuota / API Key Gemini bermasalah | Periksa nilai `GEMINI_API_KEY` dan kuota Google Cloud Console |
| Error `413 Request Entity Too Large` | Ukuran upload dokumen melebihi batas | Batas upload NGINX adalah 25MB (`client_max_body_size 25M;`) |
| Gateway Timeout `504` | Task berat melebihi timeout | Periksa antrean worker dan log query database |
