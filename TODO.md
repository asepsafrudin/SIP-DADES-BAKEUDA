# TODO Checklist — SIP-DADES-BAKEUDA

Tracking eksekusi tugas berdasarkan `ROADMAP.md` (Post-Audit Revisi 2).

---

## 🟣 Fase 2A: Persiapan Aman (Prasyarat Keselamatan Data) — ✅ COMPLETED
- [x] Claim Task (`CLAIMED_BY_AGENT.md`)
- [x] **Task 2A.1: Backup & Snapshot Appwrite DB Produksi**
  - [x] Buat script `scripts/backup-appwrite-db.ts`
  - [x] Eksekusi backup untuk seluruh koleksi (`master_desa`, `pagu_alokasi`, `transaksi_pencairan`, `potongan_bpjs_bulanan`, `master_sumber_dana`, dll.)
  - [x] Verifikasi file snapshot tersimpan di `storage/backups/sipdades_db_snapshot_2026-08-05T01-20-53-582Z.json`
- [x] **Task 2A.2: Setup Staging Environment Appwrite**
  - [x] Buat script `scripts/setup-appwrite-staging.ts` untuk menginisialisasi lingkungan staging
  - [x] Impor data snapshot ke koleksi staging (`staging_master_desa`: 224, `staging_pagu_alokasi`: 492, `staging_master_sumber_dana`: 5)
  - [x] Verifikasi environment staging terpisah dan siap dipakai uji Fase 2B

---

## 🔴 Fase 2B: Fix Blocker & Security (P1 - Paralel) — ✅ COMPLETED
- [x] **Task 2B.1: Sinkronisasi Skema Atribut Appwrite DB**
  - [x] Audit nama atribut di seluruh repo (`status_verifikasi`, `nominal_pencairan_net`, `desa_id`, `pagu`)
  - [x] Update `scripts/setup-appwrite-add.ts` dan `scripts/setup-appwrite-staging.ts` dengan atribut standar dan alias
  - [x] Harmonikkan kueri di `api/transactions`, `api/kuitansi`, `api/add/rekap-spm`
- [x] **Task 2B.2: Fix Kontrak Data OCR + Worker RunPod**
  - [x] Update `runpod-ocr-worker/handler.py` dan `worker-repo/handler.py` mengembalikan objek array multi-desa + metadata (`metadata_sumber_dana`, `metadata_no_surat`, array `data`)
- [x] **Task 2B.3: Implementasi Auth & RBAC Middleware API**
  - [x] Implementasi `src/lib/authMiddleware.ts` pendukung verifikasi token session & 5 role RBAC
  - [x] Pasang `verifyAuth` pada seluruh endpoint `/api/add`, `/api/bhpr`, `/api/bkk`, `/api/kuitansi`, `/api/kuitansi/print`, `/api/add/import-bpjs`, `/api/add/rekap-spm`
- [x] **Task 2B.4: Migrasi API Mock (ADD/BHPR/BKK) ke Appwrite**
  - [x] Ubah `/api/add/route.ts` menjadi live query & write Appwrite DB
  - [x] Ubah `/api/bhpr/route.ts` menjadi live query & write Appwrite DB
  - [x] Ubah `/api/bkk/route.ts` menjadi live query & write Appwrite DB
  - [x] Verifikasi `npm run build` sukses 100% tanpa error TypeScript/Next.js

---

## 🟡 Fase 3: Integrasi Fitur AI & Real Workflows (P2) — ✅ COMPLETED
- [x] **Task 3.1: AI Policy Compiler Real (Rules-as-Code)**
  - [x] Ekstraksi otomatis parameter kuantitatif (70% ADDM, 30% ADDP, 20% Min Pajak BHPR, 4% BPJS Pemda) pada `src/app/api/regulasi/extract-rules/route.ts`
  - [x] Kueri & simpan ke Appwrite DB `master_regulasi` pada `src/app/api/regulasi/route.ts`
- [x] **Task 3.2: Dual-Engine & Zod Schema Guardrail**
  - [x] Buat validation schema `src/lib/validations/ocrSchema.ts`
  - [x] Integrasikan sanitasi & guardrail pada `src/app/api/ocr/route.ts`
- [x] **Task 3.3: Server-Side Excel Ingestion Parser**
  - [x] Tambahkan pencocokan fuzzy Levenshtein distance pada `src/app/api/add/import-bpjs/route.ts` untuk pemetaan 224 desa
- [x] **Task 3.4: Alur Real Storage Scan-Back TTE Basah**
  - [x] Buat modul Appwrite Storage client `src/lib/storageClient.ts` untuk upload & view bucket `kuitansi_storage`
  - [x] Verifikasi `npm run build` lulus 100%

---

## 🔵 Fase 4: Governance & Production Hardening (P3) — IN PROGRESS
- [ ] **Task 4.1: Dashboard Billing & AI Kill-Switch**
- [ ] **Task 4.2: Human-in-the-Loop Approval UI**
- [ ] **Task 4.3: Automated Regression Testing (1000+ Transaksi)**
