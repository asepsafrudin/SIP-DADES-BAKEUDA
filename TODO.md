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

---

## 🔴 Fase 6: Sprint 1 — FONDASI & KEAMANAN (Revisi ke-3) — ✅ COMPLETED
- [x] **Task 6.1: Fix Kill-Switch — FAIL CLOSED (Sprint 1, Hari 1)**
  - [x] Implementasi block AI path: return HTTP 503 jika `killSwitch.active === true` di `src/app/api/ocr/route.ts`
  - [x] Integrasikan error code `AI_KILLSWITCH_ACTIVE` di UI frontend untuk menampilkan form input manual
  - [x] Pastikan tidak ada panggilan ke RunPod atau Local OCR saat kill-switch aktif
- [x] **Task 6.2: Integrasi `recordAiUsage()` di OCR Pipeline (Sprint 1, Hari 1–2)**
  - [x] Panggil `recordAiUsage()` setelah polling RunPod sukses di `src/app/api/ocr/route.ts`
  - [x] Tampilkan akumulasi biaya pemakaian real-time pada dashboard billing
  - [x] Aktifkan kill-switch otomatis jika `monthlyUsageCostUsd >= monthlyBudgetLimitUsd`
- [x] **Task 6.3: Hapus Hardcode "PANICAN" — Ganti Validasi Data Nyata (Sprint 1, Hari 2–3)**
  - [x] Hapus string literal nama desa di `src/lib/validations/ruleEvaluator.ts`
  - [x] Ambil `status_pbb_lunas` dari `master_desa` untuk validasi BHPR Tahap II
  - [x] Terapkan fail-safe: tolak transaksi jika data status PBB tidak ditemukan
- [x] **Task 6.4: Fix Schema Drift — Satu Sumber Kebenaran (Sprint 1, Hari 3–5)**
  - [x] Standardisasi nama atribut: `status_verifikasi` (bukan `status`), `nominal_pencairan_net` (bukan `nominal_net`), `desa_id` (bukan `desa`)
  - [x] Buat dan jalankan script audit otomatis pre-commit atau CI check untuk mendeteksi alias terlarang
  - [x] Update seluruh referensi di `ruleEvaluator.ts`, `/api/transactions`, `/api/kuitansi`, `/api/add/rekap-spm`, setup scripts, dan komponen frontend
- [x] **Task 6.5: MCP Client — Env Variable & Resilience (Sprint 1, Hari 5–6)**
  - [x] Baca URL MCP dari `process.env.MCP_SERVER_URL` di `src/lib/mcpClient.ts`
  - [x] Implementasikan retry 3x dengan exponential backoff dan timeout 15 detik untuk panggilan tool MCP
- [x] **Task 6.6: Rate Limit — Distributed (Sprint 1, Hari 6–7)**
  - [x] Implementasikan distributed rate limit menggunakan Appwrite collection `rate_limit` di `src/utils/rateLimitDistributed.ts`
  - [x] Bersihkan entri request lama dan batasi request per window
  - [x] Pastikan system fail-open (tetap layani request) jika Appwrite rate limit error

---

## 🟡 Fase 7: Sprint 2 — AI AGENTIC & RAG (Revisi ke-3) — ✅ COMPLETED
- [x] **Task 7.1: RAG Pipeline Minimal — Ingest 3 Dokumen Kritis (Sprint 2, Hari 8–10)**
  - [x] Buat script ingestion `scripts/rag-ingest.ts` dan client `src/lib/ragClient.ts`
  - [x] Ingest 3 dokumen kritis ke PostgreSQL + pgvector (namespace `purbalingga_legal`)
- [x] **Task 7.2: AI Policy Compiler — Integrasi RAG Context (Sprint 2, Hari 10–12)**
  - [x] Ambil konteks dari RAG sebelum memanggil Gemini di `/api/regulasi/extract-rules`
  - [x] Pastikan fallback ke Gemini biasa tanpa konteks jika RAG offline
- [x] **Task 7.3: Human-in-the-Loop UI — Approval Dashboard (Sprint 2, Hari 12–14)**
  - [x] Buat halaman dashboard approval di `src/app/admin/regulasi-approval/page.tsx`
  - [x] Catat log persetujuan ke `AUDIT_LOG_REGULASI`
  - [x] Pastikan regulasi baru tidak aktif di production tanpa persetujuan eksplisit
- [x] **Task 7.4: Regression Test Suite — 1000+ Transaksi Historis (Sprint 2, Hari 13–14)**
  - [x] Buat unit test `tests/regression/transaction-rules.test.ts` dengan minimal 10 test case otomatis
  - [x] Integrasikan test ini ke CI pipeline
