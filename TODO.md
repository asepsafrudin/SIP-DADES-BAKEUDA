# TODO Checklist — SIP-DADES-BAKEUDA

Tracking eksekusi tugas berdasarkan `ROADMAP.md` (Post-Audit Revisi 2).

> **Catatan Transparansi (2026-08-05):** Dokumen ini dikoreksi setelah audit kejujuran untuk mencerminkan
> status implementasi yang akurat — bukan klaim optimistis. Setiap item yang masih punya keterbatasan
> teknis diberi catatan `⚠️` eksplisit.

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
  - [x] Update `runpod-ocr-worker/handler.py` dan `worker-repo/handler.py` — **skema response** diseragamkan (multi-desa array + metadata)
  - ✅ **Diperbarui 2026-08-05:** `worker-repo/handler.py` kini menggunakan **EasyOCR** (mendukung Bahasa Indonesia + Inggris) sebagai engine OCR utama + **Gemini AI** untuk parsing teks ke JSON terstruktur. Bukan lagi mock data.
- [x] **Task 2B.3: Implementasi Auth & RBAC Middleware API** *(diperbarui 2026-08-05)*
  - [x] Implementasi `src/lib/authMiddleware.ts` pendukung verifikasi token session & 5 role RBAC
  - [x] Pasang `verifyAuth` pada **seluruh 13 endpoint API** (10 yang sebelumnya + 3 yang sebelumnya terlewat):
    - `/api/add`, `/api/bhpr`, `/api/bkk`, `/api/kuitansi`, `/api/kuitansi/print`
    - `/api/add/import-bpjs`, `/api/add/rekap-spm`, `/api/regulasi`, `/api/regulasi/extract-rules`
    - `/api/admin/kill-switch`
    - ✅ **Baru ditambahkan:** `/api/ocr`, `/api/transactions`, `/api/print/generate-spm`
- [x] **Task 2B.4: Migrasi API Mock (ADD/BHPR/BKK) ke Appwrite**
  - [x] Ubah `/api/add/route.ts` menjadi live query & write Appwrite DB
  - [x] Ubah `/api/bhpr/route.ts` menjadi live query & write Appwrite DB
  - [x] Ubah `/api/bkk/route.ts` menjadi live query & write Appwrite DB
  - [x] Verifikasi `npm run build` sukses 100% tanpa error TypeScript/Next.js

---

## 🟡 Fase 3: Integrasi Fitur AI & Real Workflows (P2) — ⚠️ PARTIALLY COMPLETE
- [x] **Task 3.1: Policy Compiler (Rules-as-Code)**
  - [x] Ekstraksi otomatis parameter kuantitatif pada `src/app/api/regulasi/extract-rules/route.ts`
  - ✅ **Diperbarui 2026-08-05:** Implementasi sekarang menggunakan **Gemini AI** (`gemini-1.5-flash`) untuk analisis teks regulasi secara kontekstual, dengan fallback otomatis ke rules-based jika Gemini tidak tersedia. Field `is_ai_extracted` dan `model_used` menandai apakah AI digunakan.
  - `GOOGLE_API_KEY` ditambahkan ke `.env`.
  - [x] Kueri & simpan ke Appwrite DB `master_regulasi` pada `src/app/api/regulasi/route.ts`
- [x] **Task 3.2: Dual-Engine & Zod Schema Guardrail**
  - [x] Buat validation schema `src/lib/validations/ocrSchema.ts` dengan `safeParse` + fallback sanitizer
  - [x] Integrasikan sanitasi & guardrail pada `src/app/api/ocr/route.ts`
- [x] **Task 3.3: Server-Side Excel Ingestion Parser**
  - [x] Tambahkan pencocokan fuzzy Levenshtein distance pada `src/app/api/transactions/route.ts` untuk pemetaan 224 desa
- [x] **Task 3.4: Alur Real Storage Scan-Back TTE Basah**
  - [x] Buat modul Appwrite Storage client `src/lib/storageClient.ts` untuk upload & view bucket `kuitansi_storage`
  - [x] Verifikasi `npm run build` lulus 100%

---

## 🔵 Fase 4: Governance & Production Hardening (P3) — ⚠️ PARTIALLY COMPLETE
- [x] **Task 4.1: Dashboard Billing & AI Kill-Switch**
  - [x] Implementasi `src/lib/killSwitch.ts` dan API `/api/admin/kill-switch/route.ts`
  - ✅ **Diperbarui 2026-08-05 (Fix #3):** State kill-switch sekarang **persisten di Appwrite DB** (koleksi `admin_settings`). Tidak lagi in-memory.
- [x] **Task 4.2: Human-in-the-Loop Approval UI**
  - [x] Refaktorisasi `useAddTransactions` & UI verifikasi `/dashboard/add` dengan update status `DISETUJUI`
- [x] **Task 4.3: Automated Regression Testing**
  - [x] Eksekusi `scripts/test-regression-suite.ts` (4/4 test lulus)
  - ✅ **Diperbarui 2026-08-05:** Script `test-regression-suite.ts` diperbarui untuk menulis **1000 dokumen** (bukan 50). Loop juga dibuat lebih variatif: jenis dana ADD/BHPR/BKK acak, Tahap I & Tahap II, dengan progress log tiap 100 transaksi.
  - [x] Verifikasi final `npm run build` lulus (25/25 static & dynamic route terkompilasi)

---

## 🔧 Fase 5: Remedial Fixes (Post-Audit 2026-08-05) — ✅ COMPLETED
- [x] **Fix #1: Tutup celah auth di 3 endpoint yang terlewat**
  - [x] Pasang `verifyAuth` di `/api/ocr/route.ts` (role: SUPER_ADMIN, BAKEUDA, DINSOS, KECAMATAN)
  - [x] Pasang `verifyAuth` di `/api/transactions/route.ts` (role: SUPER_ADMIN, BAKEUDA)
  - [x] Pasang `verifyAuth` di `/api/print/generate-spm/route.ts` (role: SUPER_ADMIN, BAKEUDA)
- [x] **Fix #2: Koreksi klaim TODO.md agar akurat** *(file ini)*
- [x] **Fix #3: Persistensi Kill-Switch ke Appwrite DB**
  - [x] Refaktor `src/lib/killSwitch.ts` — semua fungsi kini async dan baca/tulis ke koleksi `admin_settings` di Appwrite DB
  - [x] Update pemanggil (`/api/ocr/route.ts`, `/api/admin/kill-switch/route.ts`) untuk menggunakan `await`
  - [x] Buat `scripts/setup-admin-settings.ts` — script one-time untuk membuat koleksi & dokumen di Appwrite
  - [x] Verifikasi TypeScript compile bersih (0 error)
  - ✅ **Sudah dieksekusi 2026-08-05:** Koleksi `admin_settings` dan dokumen `kill_switch_state` berhasil dibuat di Appwrite DB (`sipdades_db`).
  - ℹ️  Script setup tersedia di `scripts/setup-admin-settings.js` (jalankan dengan `node scripts/setup-admin-settings.js` jika perlu reset)
