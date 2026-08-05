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

## 🔴 Fase 2B: Fix Blocker & Security (P1 - Paralel) — IN PROGRESS
- [ ] **Task 2B.1: Sinkronisasi Skema Atribut Appwrite DB**
- [ ] **Task 2B.2: Fix Kontrak Data OCR + Redeploy Worker RunPod**
- [ ] **Task 2B.3: Implementasi Auth & RBAC Middleware API**
- [ ] **Task 2B.4: Migrasi API Mock (ADD/BHPR/BKK) ke Appwrite**

---

## 🟡 Fase 3: Integrasi Fitur AI & Real Workflows (P2) — PENDING
- [ ] **Task 3.1: AI Policy Compiler Real (Rules-as-Code)**
- [ ] **Task 3.2: Dual-Engine & Zod Schema Guardrail**
- [ ] **Task 3.3: Server-Side Excel Ingestion Parser**
- [ ] **Task 3.4: Alur Real Storage Scan-Back TTE Basah**

---

## 🔵 Fase 4: Governance & Production Hardening (P3) — PENDING
- [ ] **Task 4.1: Dashboard Billing & AI Kill-Switch**
- [ ] **Task 4.2: Human-in-the-Loop Approval UI**
- [ ] **Task 4.3: Automated Regression Testing (1000+ Transaksi)**
