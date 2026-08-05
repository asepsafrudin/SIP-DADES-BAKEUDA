# Laporan Audit Menyeluruh — SIP-DADES BAKEUDA
### Bahan Update Roadmap (Konsolidasi Sesi Review)

**Sumber:** Repo `asepsafrudin/SIP-DADES-BAKEUDA` — README, `ROADMAP.md`, `docs/adr`, `docs/architecture`, `docs/workflows`, dan `storage/reports/audit_report_sip_dades_bakeuda.md` (audit kode internal, 4 Agustus 2026)
**Disusun:** 5 Agustus 2026

---

## 1. Ringkasan Eksekutif

SIP-DADES BAKEUDA adalah sistem digitalisasi pencairan dana desa (ADD, BHPR, BKK) untuk Bakeuda Kabupaten Purbalingga, dibangun di atas Next.js 16 + React 19 + Appwrite NoSQL, dengan OCR AI (EasyOCR di RunPod GPU serverless) dan rencana "AI-Native Governance Engine" (Rules-as-Code) untuk menerjemahkan Perbup menjadi aturan yang dapat dieksekusi mesin.

**Temuan kunci sesi ini:** ada jarak signifikan antara *desain arsitektur* (yang sangat matang dan terdokumentasi baik) dengan *realisasi kode* (yang menurut audit internal 4 Agustus 2026 masih banyak memakai mock data dan punya beberapa contract mismatch kritis). Roadmap perlu membedakan dua kategori pekerjaan: (a) menyambungkan apa yang sudah dirancang ke database sungguhan, dan (b) menyelesaikan risiko-risiko yang sudah diidentifikasi sendiri oleh tim di dokumen governance tapi belum ada mitigasi teknisnya di kode.

---

## 2. Arsitektur & Desain (Status: Terdokumentasi Baik)

| Lapisan | Teknologi | Fungsi |
|---|---|---|
| Frontend/Backend | Next.js 16, React 19, Tailwind v4 | SSR, form, dashboard multi-role |
| Database/Auth/Storage | Appwrite (NoSQL, Teams/RBAC) | `master_desa`, `pagu_alokasi`, `transaksi_pencairan`, `master_regulasi` |
| OCR | EasyOCR di RunPod GPU serverless | Baca kuitansi/dokumen scan → JSON |
| AI Policy Compiler | Gemini/OpenAI (rencana) | Ekstraksi Perbup PDF → JSON Logic/AST |
| Rule Evaluator | `json-rules-engine` (Node lokal) | Validasi transaksi real-time, 0 biaya API saat runtime |

**Keputusan arsitektur tercatat (ADR 0001):** skema ADD dan BKK yang sumbernya dua file Excel berbeda struktur (`ADD-2026.xls` bulanan vs `BKK 2026.xlsm` per-termin) disatukan jadi *unified schema* di Appwrite. Trade-off yang disadari sejak awal: Appwrite tidak punya `JOIN`/`GROUP BY` bawaan, sehingga agregasi rekapitulasi harus ditangani manual di backend.

---

## 3. Tiga Jalur Bisnis dengan Aturan Berbeda

| Jenis Dana | Siklus | Syarat Utama | Titik Rawan |
|---|---|---|---|
| **ADD** | Bulanan (maks 1/12 pagu) | Verifikasi berjenjang Desa→Camat (tgl 15-20)→Dinsos (tgl 25)→Bakeuda; potongan BPJS khusus Januari | Rantai persetujuan panjang, telat satu instansi = telat gaji perangkat desa |
| **BHPR** | Tahunan, 2 tahap (60%/40%) | Tahap II wajib PBB-P2 lunas 100%; ada reward/sanksi kecepatan setor pajak | Butuh sinkronisasi data pajak real-time; salah sinkron = salah blokir/cairkan |
| **BKK** | Per-termin/progres fisik | Verifikasi lapangan progres proyek | Validasi bukti fisik non-digital, rawan subjektivitas |

---

## 4. Risiko Governance AI yang Sudah Diidentifikasi Tim (Belum Tentu Termitigasi di Kode)

Dari `docs/architecture/AI_Governance_Risk_and_Feasibility.md`:

1. **Ambiguitas teks hukum** — klausa diskresi (mis. "kondisi darurat mendesak") tidak bisa diputuskan AI tanpa dokumen pendukung resmi. Mitigasi rencana: *Conditional Override Flag*.
2. **Risiko halusinasi desimal** — salah baca 70% jadi 7% bisa berakibat kesalahan penyaluran miliaran rupiah. Mitigasi rencana: validasi skema ketat (Zod) + verifikasi dua model AI.
3. **Akuntabilitas hukum** — BPK/Inspektorat tidak menerima "AI yang salah hitung"; wajib Human-in-the-Loop, AI hanya *drafting assistant*.
4. **Kontrol biaya operasional** — dashboard billing dengan kill-switch darurat untuk OCR/API AI belum ada realisasinya di kode (baru status roadmap).

> **Catatan penting:** Audit kode 4 Agustus 2026 menemukan `/api/regulasi/extract-rules` **belum benar-benar memanggil LLM** — masih mengembalikan JSON statis walau library Gemini/OpenAI sudah terpasang. Artinya seluruh lapisan mitigasi risiko di atas (poin 1–3) **belum punya implementasi nyata untuk diuji**, baru desain di atas kertas.

---

## 5. Temuan Audit Kode Kritis (4 Agustus 2026)

### 5.1 Matriks Status Endpoint

| Endpoint | Status | Catatan |
|---|---|---|
| `POST /api/transactions` | 🟢 Live DB, tapi ada bug atribut | Fuzzy matching nama desa (Levenshtein) sudah jalan |
| `POST /api/ocr` | 🟡 Hybrid, contract mismatch | Skema RunPod ≠ skema yang diharapkan Next.js |
| `POST /api/add/import-bpjs` | 🟢 Terintegrasi | — |
| `GET /api/add/rekap-spm` | 🟢 Terintegrasi | Generate PDF dinamis |
| `/api/kuitansi` & print | 🟢 Production-ready | Workflow paling matang di repo |
| `GET/POST /api/add` | 🔴 Mock data | 3 desa hardcoded, POST tidak simpan ke DB |
| `GET/POST /api/bhpr` | 🔴 Mock data | 11 desa hardcoded, OCR palsu |
| `GET/POST /api/bkk` | 🔴 Mock data | 4 desa hardcoded, OCR palsu |
| `GET/POST /api/regulasi` | 🔴 Mock data | Statis, tidak tersambung DB |
| `POST /api/regulasi/extract-rules` | 🔴 Mock data | **Klaim AI extractor tapi tidak panggil LLM sama sekali** |
| `GET /api/print/generate-spm` | 🟡 Statis | Rumus potongan `nominal * 0.04` hardcoded, tidak baca DB |

### 5.2 Tiga Temuan Kritis

1. **Schema drift Appwrite** — nama atribut tidak konsisten antar script setup, dokumen skema, dan kode API:
   - `desa_id` (script) vs `desa` (query di `transactions/route.ts`)
   - `status` (script) vs `status_verifikasi` (kode)
   - `nominal_net` (script) vs `nominal_pencairan_net` (kode)
   **Dampak:** penyimpanan transaksi berpotensi gagal atau data tidak terbaca lintas endpoint.

2. **Contract mismatch OCR RunPod ↔ Next.js** — worker Python (`handler.py`) mengembalikan objek kuitansi tunggal, sementara `api/ocr/route.ts` mengharapkan struktur array multi-desa dengan metadata (`metadata_sumber_dana`, `metadata_no_surat`, array `data`). **Dampak:** OCR yang berhasil di RunPod tetap gagal diproses di Next.js (`Format data dari AI tidak valid`).

3. **Rules-as-Code engine baru prototipe visual** — arsitektur Neuro-Symbolic yang didokumentasikan lengkap di `AI_Native_GovTech_Engine.md` belum punya implementasi nyata; endpoint ekstraksi Perbup masih hardcoded.

### 5.3 Status Workflow Bisnis

| Workflow | Status |
|---|---|
| TTE Basah (print & scan-back) | 🟡 Simulasi (`setTimeout`), belum upload nyata ke Storage |
| Data Ingestion (Maker-Checker) | 🟡 UI simulator, state dummy lokal, belum ada parser Excel server-side sungguhan |
| Cetak Kuitansi Kolektif | 🟢 Fully functional — paling matang di repo |
| Import BPJS 4%/1% | 🟢 Functional |

### 5.4 Keamanan
Seluruh endpoint `src/app/api/*` **tidak punya pengecekan session/token Appwrite atau middleware RBAC** — siapa pun yang menemukan URL endpoint bisa memutasi data jika terekspos publik. Ini gap keamanan paling mendesak untuk sistem yang menangani dana pemerintah.

---

## 6. Sintesis: Kesenjangan Desain vs Realisasi

| Area | Desain (docs/architecture, docs/workflows) | Realisasi (audit kode) | Gap |
|---|---|---|---|
| AI Policy Compiler | Ekstrak Perbup → JSON Logic, dual-engine verification | Hardcoded JSON, tidak panggil LLM | **Besar** — fitur inti governance belum ada |
| OCR kuitansi | Worker RunPod → auto-fill form | Contract mismatch, gagal parse | **Sedang** — perlu selaraskan skema |
| Skema database | Unified schema (ADR 0001) terdokumentasi rapi | Nama atribut tidak konsisten antar file | **Sedang** — perbaikan cepat tapi krusial |
| RBAC 5-role | Matriks lengkap (Super Admin, Desa, Kecamatan, Dinsos, Bakeuda) | Tidak ada middleware auth di API | **Besar** — risiko keamanan aktif |
| Kuitansi kolektif & BPJS | Dirancang & dijelaskan di SOP | Fully functional | **Tidak ada gap** — ini benchmark kualitas untuk modul lain |
| Billing/kill-switch AI | Direncanakan di roadmap | Belum ada realisasi | **Belum mulai** |

---

## 7. Rekomendasi untuk Update Roadmap

**Prioritas 1 — Perbaikan fondasi (blocker produksi):**
1. Satukan penamaan atribut Appwrite di seluruh kode (`status_verifikasi`, `nominal_pencairan_net`, `desa_id`) — sinkronkan script setup, dokumen skema, dan semua route API.
2. Perbaiki kontrak data `handler.py` (RunPod) agar cocok dengan skema yang diharapkan `/api/ocr`.
3. Ganti mock data di `/api/add`, `/api/bhpr`, `/api/bkk`, `/api/regulasi` dengan query Appwrite sungguhan.
4. **Tambahkan middleware autentikasi/RBAC di semua endpoint API** — ini risiko keamanan aktif, bukan sekadar utang teknis.

**Prioritas 2 — Aktivasi fitur AI yang sudah didesain tapi belum dibangun:**
1. Sambungkan `/api/regulasi/extract-rules` ke Gemini/OpenAI sungguhan, sesuai desain Neuro-Symbolic di `AI_Native_GovTech_Engine.md`.
2. Implementasikan dual-engine verification & Zod validation untuk mencegah risiko halusinasi desimal — ini prasyarat sebelum fitur AI regulasi dianggap aman dipakai untuk keputusan finansial nyata.
3. Bangun parser Excel server-side sungguhan untuk halaman Data Ingestion (logic sudah ada contohnya di `import-bpjs`, tinggal digeneralisasi).
4. Sambungkan upload scan-back TTE basah ke Appwrite Storage + verifikasi status transaksi otomatis.

**Prioritas 3 — Governance & keberlanjutan operasional:**
1. Bangun dashboard billing (usage monitor + kill-switch) sebelum fitur AI OCR/regulasi dipakai skala penuh — mencegah biaya API tak terkontrol.
2. Terapkan Human-in-the-Loop secara eksplisit di UI: setiap output AI Policy Compiler wajib direview & ditandatangani digital oleh Kabid/Super Admin sebelum aktif — sesuai prinsip akuntabilitas hukum yang sudah dicatat tim sendiri.
3. Jalankan regression test terhadap 1.000+ data transaksi historis setiap kali ada perubahan parameter regulasi (sudah direncanakan di `AI_Governance_Risk_and_Feasibility.md`, pastikan masuk CI/CD sebelum fitur regulasi tahunan dipakai produksi).

---

## 8. Catatan Penutup

Kekuatan proyek ini ada di kualitas *pemikiran desain* — dokumentasi governance, ADR, dan SOP-nya termasuk sangat matang untuk ukuran proyek GovTech skala kabupaten, bahkan mengacu ke preseden seperti OECD Rules-as-Code dan Palantir Foundry. Tantangan terbesar ke depan bukan lagi "apa yang harus dibangun" (itu sudah jelas dan terdokumentasi), melainkan **menutup jarak antara dokumen arsitektur dan kode yang benar-benar berjalan** — terutama di tiga titik: autentikasi API, kontrak data OCR, dan aktivasi nyata AI Policy Compiler. Modul kuitansi kolektif yang sudah *production-ready* bisa dijadikan acuan kualitas untuk menyelesaikan modul-modul lain yang masih mock data.
