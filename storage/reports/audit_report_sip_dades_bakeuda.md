# Laporan Audit Kode, Fungsi, dan Implementasi Workflow
## SIP-DADES BAKEUDA (Kabupaten Purbalingga TA 2026)

> **Tanggal Audit:** 4 Agustus 2026  
> **Workspace:** `/home/aseps/MCP/workspace/SIP-DADES-BAKEUDA`  
> **Fokus Audit:** Fungsi backend/frontend, Kualitas Kode, Sinkronisasi Skema Database, Kontrak AI OCR, dan Realisasi Workflow Bisnis.

---

## Executive Summary

**SIP-DADES BAKEUDA** adalah sistem berbasis Next.js 16 (App Router) + React 19 + Appwrite NoSQL yang dirancang untuk mengelola penyaluran Dana Desa (ADD, BHPR, BKK Sarpras, BPJS, dan DD) di Kabupaten Purbalingga. 

Secara umum, fondasi UI/UX, desain layout dashboard, serta integrasi beberapa fitur inti (seperti pencetakan kuitansi kolektif, pemrosesan PDF SPM dengan `pdfmake`, serta kalkulasi Levenshtein fuzzy matching untuk nama desa) sudah terbangun dengan sangat baik. 

Namun, hasil audit menemukan **beberapa ketidakcocokan kritis (critical mismatches)** antara skema database, handler AI OCR, serta beberapa endpoint API yang masih menggunakan *mock data* (data buatan) sehingga workflow belum sepenuhnya berjalan otonom dari ujung ke ujung.

---

## 1. Matrix Status Fungsi & API Endpoint

| Endpoint API / Modul | Status Implementasi | Sumber Data | Catatan & Temuan Audit |
| :--- | :--- | :--- | :--- |
| `POST /api/transactions` | 🟢 Production-ready (Logic) | Live Appwrite (`sipdades_db`) | Memiliki Levenshtein fuzzy matching (toleransi typo desa <= 3) & pencegahan duplikasi DRAFT. **Memerlukan koreksi nama atribut database.** |
| `POST /api/ocr` | 🟡 Hybrid (Native PDF + RunPod) | RunPod Serverless / `pdf-parse` | Integrasi polling RunPod jalan, namun **terdapat perbedaan skema data (contract mismatch)** dengan `handler.py` di server RunPod. |
| `POST /api/add/import-bpjs` | 🟢 Terintegrasi | Upload Excel (`xlsx`) | Berhasil membaca sheet Excel, memetakan ke `master_desa`, dan menyimpan ke `potongan_bpjs_bulanan`. |
| `GET /api/add/rekap-spm` | 🟢 Terintegrasi | Live Appwrite + `pdfmake` | Menghasilkan dokumen PDF rekap SPM landscape secara dinamik. |
| `GET/POST /api/kuitansi` & `print` | 🟢 Production-ready | Live Appwrite | Membaca transaksi DRAFT dan memperbarui status menjadi `DICETAK`. |
| `GET/POST /api/add` | 🔴 Mock Data | Hardcoded JSON | Masih mengembalikan `sampleAddTransactions` (3 desa). Request `POST` tidak menyimpan ke DB. |
| `GET/POST /api/bhpr` | 🔴 Mock Data | Hardcoded JSON | Masih mengembalikan `sampleBhprTransactions` (11 desa Kertanegara). `POST` mengembalikan OCR palsu. |
| `GET/POST /api/bkk` | 🔴 Mock Data | Hardcoded JSON | Masih mengembalikan `sampleBkkTransactions` (4 desa). `POST` mengembalikan OCR palsu. |
| `GET/POST /api/regulasi` | 🔴 Mock Data | Hardcoded JSON | Mengembalikan objek regulasi statis. `POST` hanya menduplikasi JSON lokal. |
| `POST /api/regulasi/extract-rules` | 🔴 Mock Data | Hardcoded JSON | Klaim AI Extractor, tetapi mengembalikan objek static `extractedRules` tanpa memanggil LLM (Gemini/OpenAI). |
| `GET /api/print/generate-spm` | 🟡 Template HTML Statis | Parameter Query URL | Menghasilkan lembar HTML SPM dengan rumus potongan statis `nominal * 0.04` tanpa membaca DB. |

---

## 2. Temuan Audit Kode Kritis (Critical Technical Findings)

### 🔴 Temuan 1: Inkonsistensi Skema Atribut Appwrite Database (Schema Drift)
Terdapat ketidakcocokan (*mismatch*) antara nama field di script inisialisasi database (`scripts/setup-appwrite-add.ts`), dokumen skema (`docs/schemas/unified_database_schema.md`), dan endpoint API:

* **Koleksi `pagu_alokasi`:**
  * Script inisialisasi membuat atribut `desa_id` (string).
  * `src/app/api/transactions/route.ts` melakukan kueri `Query.equal('desa', desaId)` (menggunakan `desa` bukan `desa_id`).
* **Koleksi `transaksi_pencairan`:**
  * Script inisialisasi membuat atribut: `status`, `nominal_net`, `desa_id`.
  * `transactions/route.ts` menyimpan dokumen dengan atribut: `status_verifikasi: "DRAFT"`, `nominal_pencairan_net`, `pagu`.
  * `kuitansi/route.ts` membaca `doc.pagu` dan `paguDoc.desa`.
  * `rekap-spm/route.ts` melakukan kueri `Query.equal('status', 'DISETUJUI')` dan membaca `trx.nominal_net`.

> **Dampak:** Penyimpanan transaksi dari scanner via `/api/transactions` akan gagal di Appwrite jika atribut `status_verifikasi` atau `nominal_pencairan_net` belum terdaftar di Appwrite, atau data tidak akan terbaca oleh endpoint kuitansi/rekap.

---

### 🔴 Temuan 2: Mismatch Kontrak Data AI OCR (RunPod Worker vs API Next.js)
Terdapat kontradiksi antara output yang dihasilkan worker Python di RunPod dengan parser di backend Next.js:

* **File Worker (`runpod-ocr-worker/handler.py`):**
  Mengembalikan objek tunggal mock kuitansi:
  ```json
  {
    "status": "success",
    "data": {
      "nomor_kuitansi": "B-001/BAK/2026",
      "tanggal": "2026-07-28",
      "nominal": 15000000,
      "penerima": "Desa Karanganyar"
    }
  }
  ```
* **File Backend Next.js (`src/app/api/ocr/route.ts`):**
  Mengekspektasikan `result.output.data` berupa struktur array multi-desa (format TMMD/Kecamatan):
  ```json
  {
    "metadata_sumber_dana": "ADD",
    "metadata_tahun_anggaran": "2026",
    "metadata_no_surat": "900/123",
    "data": [
      { "nama_desa": "PANICAN", "kegiatan": "...", "nominal": 10000000, "no_rekening": "..." }
    ]
  }
  ```

> **Dampak:** Ketika RunPod berhasil memproses dokumen dan mengembalikan data, API `/api/ocr` akan melempar error `Format data dari AI tidak valid` atau `tmmdData.data is undefined`.

---

### 🟡 Temuan 3: AI Rules-as-Code (RaC) Engine Masih Berstatus Prototipe Visual
Dalam dokumen arsitektur `docs/architecture/AI_Native_GovTech_Engine.md`, sistem didesain menggunakan **Neuro-Symbolic Architecture** di mana AI mengekstrak Perbup menjadi skema JSON Logic yang divalidasi oleh middleware.

Namun pada kenyataannya:
* Halaman `/dashboard/regulasi` memanggil `/api/regulasi/extract-rules`.
* Endpoint `/api/regulasi/extract-rules/route.ts` mengembalikan JSON statis yang di-hardcode tanpa benar-benar memproses teks Perbup menggunakan `@google/generative-ai` atau `openai` (meskipun kedua library sudah terpasang di `package.json`).

---

## 3. Audit Implementasi Workflow Bisnis

### A. Workflow 1: Alur TTE Basah (Print & Scan-Back)
* **Komponen:** `src/components/PrintScanWorkflow.tsx` & `src/app/api/print/generate-spm`
* **Status:** 🟡 **Partially Implemented (Simulated Upload)**
* **Evaluasi:**
  1. **Cetak Fisik SPM (Step 1):** Berhasil membuka window `/api/print/generate-spm` dan mencetak dokumen HTML SPM.
  2. **Unggah Scan-Back (Step 2):** Fungsi `handleScanBackUpload` menggunakan `setTimeout(..., 2000)` simulasi. Belum ada kode yang mengunggah file hasil scan ke Appwrite Storage atau memverifikasi QR Code / OCR stempel basah.

### B. Workflow 2: Ingest Master Data (Maker-Checker Area)
* **Komponen:** `src/app/admin/data-ingestion/page.tsx`
* **Status:** 🟡 **UI Simulator Only**
* **Evaluasi:**
  * Tampilan UI 4-step (Template, Upload Dropzone, Staging Area, Submission) sangat responsif dan estetis.
  * Namun seluruh alur (validasi 224 baris, tombol Ajukan draf) menggunakan state dummy lokal tanpa memanggil parser Excel server-side atau membuat draft batch di Appwrite.

### C. Workflow 3: Cetak Kuitansi Kolektif (Global Printing)
* **Komponen:** `src/app/kuitansi/page.tsx` & `src/components/PrintableKuitansiGlobal.tsx`
* **Status:** 🟢 **Fully Functional (Production-Ready)**
* **Evaluasi:**
  * Workflow paling matang dalam repositori. Berhasil mengambil data DRAFT riil dari Appwrite, mendukung muti-select batching, penyesuaian parameter pejabat (PA, PPTK, Bendahara) secara real-time, cetak CSS print-only setengah folio + lampiran tabel, serta memperbarui status dokumen di database menjadi `DICETAK`.

### D. Workflow 4: Import Tagihan BPJS 4% & 1% Bulanan
* **Komponen:** `src/app/api/add/import-bpjs/route.ts`
* **Status:** 🟢 **Functional**
* **Evaluasi:**
  * Berhasil membaca file Excel per kolom, menjumlahkan akumulasi per desa, dan menyimpan data ke koleksi `potongan_bpjs_bulanan`.

---

## 4. Keamanan, Autentikasi & Standardisasi Workspace

1. **Autentikasi API Routes:**
   Seluruh endpoint di bawah `src/app/api/*` saat ini **tidak memiliki pengecekan session/token Appwrite** atau RBAC middleware. Siapa pun yang mengakses endpoint API dapat melakukan mutasi data jika endpoint terekspos.
2. **Kepatuhan Workspace (§1.5 AGENTS.md):**
   * Workspace dimiliki oleh user `aseps:aseps`.
   * Seluruh perintah runtime dan dependency berjalan menggunakan `.venv` lokal dan `npm` tanpa `sudo`.
   * Kebersihan root terjaga baik.

---

## 5. Rekomendasi Rencana Aksi (Actionable Roadmap)

Untuk membawa **SIP-DADES BAKEUDA** ke tingkat *production-ready* 100%, berikut tahapan rekomendasi perbaikan:

### Prioritas 1 (High Priority - Perbaikan Core & Contract Mismatch)
1. **Sinkronisasi Skema Appwrite:**
   * Samakan nama atribut di `scripts/setup-appwrite-add.ts` dan seluruh API route. Sepakati penggunaan nama field:
     * `status_verifikasi` vs `status`
     * `nominal_pencairan_net` vs `nominal_net`
     * `desa_id` vs `desa` (referensi string)
2. **Perbaiki Handler OCR RunPod (`runpod-ocr-worker/handler.py`):**
   * Perbarui `handler.py` agar mengembalikan skema data JSON yang sesuai dengan yang diharapkan oleh `/api/ocr/route.ts` (termasuk `metadata_sumber_dana`, `metadata_no_surat`, dan array `data`).
3. **Hubungkan Endpoint API Real ke Database:**
   * Ganti *mock data* di `src/app/api/add/route.ts`, `src/app/api/bhpr/route.ts`, dan `src/app/api/bkk/route.ts` dengan kueri Appwrite sungguhan.

### Prioritas 2 (Medium Priority - Automasi & Real Workflows)
1. **Aktifkan Real AI Rule Extractor:**
   * Integrasikan `@google/generative-ai` (Gemini 2.0 Flash / Pro) pada `src/app/api/regulasi/extract-rules/route.ts` untuk benar-being mengekstrak parameter angka dari dokumen Perbup PDF.
2. **Hubungkan Data Ingestion Excel Parser:**
   * Aktifkan pemrosesan file Excel sungguhan di `/admin/data-ingestion` menggunakan logika parser yang sudah ada di `import-bpjs`.
3. **Implementasi Real Scan-Back Storage Upload:**
   * Pada `PrintScanWorkflow.tsx`, hubungkan file input ke Appwrite Storage bucket dan perbarui status transaksi di database setelah file terunggah.

### Prioritas 3 (Low Priority - Hardening & Security)
1. **Tambahkan Middleware Autentikasi Appwrite:**
   * Tambahkan pengecekan session cookie/token Appwrite pada endpoint API yang sensitif.
2. **Dynamic Signature Configuration di SPM Generator:**
   * Ambil data pejabat penandatangan dari database/konfigurasi sistem pada `/api/print/generate-spm`.

---
*Laporan Audit ini dibuat secara otomatis untuk memastikan kualitas dan integritas sistem SIP-DADES BAKEUDA.*
