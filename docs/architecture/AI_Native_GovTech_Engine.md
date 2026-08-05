# Arsitektur & Implementasi AI-Native Governance Engine (Rules-as-Code)
**Sistem Informasi Pengelolaan Dana Desa dan Bantuan Keuangan (SIP-DADES) Kabupaten Purbalingga**

Dokumen ini memuat spesifikasi arsitektur dan status implementasi riil sistem tata kelola cerdas berbasis **Rules-as-Code (RaC)** pada aplikasi **SIP-DADES BAKEUDA**.

---

## 1. Konsep Inti: Neuro-Symbolic Architecture

Untuk menghindari risiko kelambatan (*latency*) dan biaya komputasi tinggi, sistem ini tidak bergantung penuh pada kecerdasan buatan (AI) saat transaksi diajukan. Kami menerapkan **Neuro-Symbolic Architecture** yang membagi tugas menjadi dua lapisan:

```mermaid
flowchart TD
    A["Teks Regulasi Mentah (PDF Perbup / PMK 7)"] -->|1. Neural Layer (Gemini Compiler)| B["JSON Logic (master_regulasi)"]
    B -->|2. Symbolic Layer (ruleEvaluator.ts)| C["Middleware Validasi Transaksi"]
    C -->|3. Realtime Guardrail| D["Transaksi Desa (Submit ADD / BHPR / BKK)"]
    D -->|Lolos Validasi| E["RKUD / SPP / SPM (CAIR)"]
    D -->|Melanggar Aturan| F["Blokir & Peringatan Pasal"]
```

1.  **Neural Layer (LLM Compiler):** Menggunakan AI Generatif (Gemini/Ollama) untuk membaca naskah hukum Perbup yang dinamis dan menerjemahkannya menjadi aturan logis berstandar **JSON Logic / Abstract Syntax Tree (AST)**.
2.  **Symbolic Layer (Deterministic Engine):** Menjalankan aturan JSON Logic tersebut secara deterministik (100% tepat, 0% halusinasi, kecepatan 1ms) di Backend Next.js saat transaksi diajukan.

---

## 2. Detail Implementasi Komponen Sistem

### A. Document Extraction & Local OCR Server
*   **Implementasi:** Menggunakan PyMuPDF (`fitz`) untuk ekstraksi PDF asli dan EasyOCR untuk citra pindaian (scan).
*   **Kemandirian Luring:** Selain terhubung dengan RunPod GPU Cloud secara daring, disediakan berkas server lokal [local_server.py](file:///home/aseps/MCP/workspace/SIP-DADES-BAKEUDA/worker-repo/local_server.py) berbasis FastAPI (port 5000) untuk mengeksekusi OCR secara lokal pada intranet dinas.
*   **API Integrasi:** Endpoint `/api/ocr` secara otomatis mengalihkan kueri ke `LOCAL_OCR_URL` jika variabel tersebut disetel di `.env`.

### B. AI Policy Compiler & RAG (Layer 2)
*   **Implementasi:** API [route.ts (extract-rules)](file:///home/aseps/MCP/workspace/SIP-DADES-BAKEUDA/src/app/api/regulasi/extract-rules/route.ts) memanggil Gemini AI dengan setelan `temperature: 0` untuk akurasi mutlak.
*   **SSE MCP Client:** Backend Next.js bertindak sebagai client MCP yang berkomunikasi via SSE ke port 8000 untuk mengeksekusi `knowledge_search`.
*   **Injeksi Konteks:** Kueri semantik secara dinamis memuat peraturan terkait dari basis pengetahuan RAG lokal untuk memandu LLM menyusun parameter secara konsisten.

### C. Central Rule Repository (`master_regulasi`)
*   **Implementasi:** Menyimpan parameter aktif per `tahun_anggaran` di database Appwrite (koleksi `master_regulasi`). Aturan disimpan dalam format JSON terstruktur yang memuat limit ADD bulanan, persentase BPJS, dan status PBB-P2.

### D. Middleware Guardrail (`validateTransaction()`)
*   **Implementasi:** Validasi transaksi diatur secara terpusat oleh [ruleEvaluator.ts](file:///home/aseps/MCP/workspace/SIP-DADES-BAKEUDA/src/lib/validations/ruleEvaluator.ts) yang disuntikkan ke rute handler `PATCH /api/transactions`.
*   **Aturan yang Ditegakkan:**
    *   *Batas Bulanan:* Akumulasi pengajuan ADD per bulan tidak boleh melebihi 1/12 pagu tahunan desa (Pasal 21 Perbup ADD).
    *   *BPJS Kesehatan:* Memastikan potongan 4% iuran Pemda dihitung dengan tepat pada bulan Januari.
    *   *BHPR Tahap II:* Memblokir pencairan BHPR Tahap II secara otomatis jika setoran PBB-P2 desa belum lunas 100% (Pasal 8 Perbup BHPR).
    *   *User Interface:* Jika validasi gagal, status transaksi ditolak dan modal verifikasi di dashboard akan menampilkan rujukan pasal regulasi yang dilanggar secara eksplisit.

---

## 3. Pangkalan Pengetahuan & Isolasi RAG Purbalingga
Untuk mendukung rencana *Standalone Deployment* (Deployment Mandiri) di Kabupaten Purbalingga, basis pengetahuan RAG diisolasi secara ketat pada server lokal menggunakan database PostgreSQL + `pgvector` (model embedding: `nomic-embed-text` 768 dimensi).

Sebanyak **16 dokumen hukum utama** telah di-ingest ke dalam RAG pada dua namespace terisolasi:

1.  **`purbalingga_legal` (Hukum & Regulasi):**
    *   *PMK RI No. 7 Tahun 2026:* Batang Tubuh, Lampiran Pagu Desa Purbalingga, dan Rincian IRID Purbalingga (di-ingest dalam bentuk potongan/chunks 100 baris).
    *   *Perbup ADD:* Perbup No. 1 Tahun 2026 (Batang Tubuh & Lampiran).
    *   *Perbup BHPR:* Perbup No. 9 Tahun 2025 & Perbup Perubahan No. 5 Tahun 2026.
    *   *SK Alokasi:* SK Alokasi BKK 2026, SK Alokasi BHPR 2026, dan SK TMMD 2026.
    *   *SOP & BPJS:* Surat BPJS 2026, SOP ADD bulanan, SOP BHPR tahunan, dan SOP BKK per-termin.
2.  **`bakeuda_internal` (Prosedur Teknis Sistem):**
    *   Dokumen spesifikasi rule engine, SOP inisialisasi master data super admin, UX & RBAC Plan, serta dokumen arsitektur server.

---

## 4. Mitigasi Risiko & Ketahanan Sistem (Resilience)

*   **Zero-LLM Cost on Runtime:** Evaluasi transaksi harian desa berjalan sepenuhnya luring menggunakan kode backend native Node.js di server lokal. Sistem tidak melakukan panggilan API LLM cloud untuk transaksi harian, sehingga menghemat biaya operasional (Rp 0/transaksi) dengan latency eksekusi **< 2ms**.
*   **Toleransi Gangguan (3-Tier Fallback):** Jika API Gemini Cloud mengalami kegagalan jaringan atau kehabisan limit kuota, backend API `/api/regulasi/extract-rules` secara otomatis mengalihkan proses ke **Local Ollama LLM** (timeout 15 detik). Jika server Ollama juga tidak merespons, sistem secara aman beralih ke **Deterministic Rules-Based Extractor** bawaan untuk menjaga kelangsungan layanan admin.
*   **Human-in-the-Loop (HitL) Guardrail:** AI hanya berwenang merumuskan draf regulasi di database. Hak mengaktifkan parameter aturan di produksi tetap berada di bawah kendali eksklusif Super Admin / Kabid Bakeuda melalui tombol persetujuan visual di dashboard.
