# Arsitektur AI-Native Governance Engine & Rules-as-Code (RaC)

Dokumen arsitektur ini mendeskripsikan bagaimana **AI secara native** bertindak sebagai pengawas dan pengatur logika bisnis dinamis pada aplikasi **SIP-DADES BAKEUDA Kabupaten Purbalingga**.

---

## 1. Konsep Dasar: Neuro-Symbolic Architecture

Aplikasi konvensional menggunakan *Hardcoded Logic* (di mana aturan ditanam mati di kode program). Sistem GovTech modern seperti SIP-DADES menggunakan **Arsitektur Neuro-Symbolic**:

```mermaid
flowchart TD
    A["Teks Regulasi Mentah (PDF Perbup / SK Bupati)"] -->|1. Neural Layer (LLM Compiler)| B["JSON Logic / AST Rule Schema"]
    B -->|2. Symbolic Layer (Deterministic Engine)| C["Middleware Validasi Transaksi"]
    C -->|3. Realtime Guardrail| D["Transaksi Desa (Submit ADD / BHPR / BKK)"]
    D -->|Lolos Validasi| E["RKUD / SPP / SPM (CAIR)"]
    D -->|Melanggar Aturan| F["Blokir & Peringatan Pasal"]
```

1. **Neural Layer (LLM Compiler):** Menggunakan AI Generatif (Gemini/OpenAI) untuk membaca naskah hukum Perbup yang dinamis dan menerjemahkannya menjadi aturan logis berstandar **JSON Logic / Abstract Syntax Tree (AST)**.
2. **Symbolic Layer (Deterministic Engine):** Menjalankan aturan JSON Logic tersebut secara deterministik (100% tepat, 0% halusinasi, kecepatan 1ms) di Backend Next.js saat transaksi diajukan.

---

## 2. Preseden Industri (GovTech & RegTech Global)

Konsep yang kita terapkan di SIP-DADES sejalan dengan gerakan global **Rules as Code (RaC)** dan arsitektur RegTech terkemuka:

### A. OECD & Government of New Zealand / UK (Rules as Code)
* **Kasus:** Pemerintah Selandia Baru dan OECD memelopori gerakan di mana peraturan perpajakan dan bantuan sosial tidak hanya diterbitkan sebagai dokumen teks, tetapi disertai **API Regulasi** agar dapat dieksekusi langsung oleh aplikasi pemerintah tanpa perantara pemrogram.

### B. Palantir Foundry (GovTech & Enterprise Security)
* **Kasus:** Palantir menggunakan *Ontology Engine*. Kebijakan dan batasan anggaran tidak dicoding manual, melainkan didefinisikan sebagai *Objects & Action Rules* yang secara otomatis memantau seluruh transaksi keuangan negara secara *real-time*.

### C. Harvey & TaxFix (LegalTech / FinTech)
* **Kasus:** Memisahkan membaca naskah hukum (*Document Understanding*) dengan mesin kalkulasi. LLM bertugas menyusun *Constraint Matrix*, sedangkan transaksi dievaluasi oleh mesin matematika murni.

---

## 3. Komponen Infrastruktur AI-Native SIP-DADES

Untuk menjadikan tombol **"🤖 Ekstrak & Terapkan Regulasi via AI"** di halaman `/dashboard/regulasi` sebagai pusat kendali otonom, infrastrukturnya dibagi menjadi 4 komponen utama:

### 1. Document Extraction Pipeline
* **Teknologi:** OpenDataLoader + EasyOCR RunPod GPU Serverless.
* **Fungsi:** Mengonversi PDF Perbup/SK Bupati menjadi Markdown terstruktur.

### 2. AI Policy Compiler
* **Teknologi:** Gemini API / OpenAI Prompt Engine (`/api/regulasi/extract-rules`).
* **Output:** Mengeluarkan skema JSON Logic yang memuat parameter (ADDM 70%, BHPR 20%, PBB 100%, cap 2%/3%).

### 3. Central Rule Repository (`master_regulasi`)
* **Teknologi:** Appwrite NoSQL Document Database.
* **Fungsi:** Menyimpan parameter aktif per `tahun_anggaran`.

### 4. Middleware Guardrail (`validateTransaction()`)
* **Teknologi:** Next.js API Middleware.
* **Fungsi:** Memeriksa setiap pengajuan kuitansi desa secara *real-time* sebelum masuk ke database transaksi. Jika ada selisih Rp 1 saja yang melanggar Perbup, transaksi ditolak dengan mereferensikan Pasal terkait.

---

## 4. Ingest Context Hukum Indonesia & Akses MCP Client (Advanced Layer 2)

Untuk memastikan **Layer 2 (AI Policy Compiler)** bekerja tanpa cacat, dua elemen canggih disuntikkan ke dalam model AI:

### A. Ingest Parameter Global Hukum & Keuangan Negara Indonesia
Model AI tidak hanya diberikan naskah Perbup secara terisolasi, tetapi diabekali **Sistem Konteks Hirarki Hukum Indonesia** (UU 6/2014 & UU 3/2024 tentang Desa, UU 1/2022 HKPD, Permendagri 20/2018, PMK Dana Desa):
* **Taksonomi Istilah:** AI secara *native* memahami akronim dan istilah lokal Keuangan Daerah Purbalingga (misal: *Siltap, ADDM, ADDP, RKUD, RKD, PBB-P2, BHPR, TMMD, BKK, SPTJM*).
* **Prinsip Lex Superior Derogat Legi Inferiori:** AI mengetahui hierarki bahwa Perbup tidak boleh bertentangan dengan PMK atau Undang-Undang di atasnya.

### B. AI Agent sebagai MCP Client (Tooling & Skills Access)
Dengan menjadikan Layer 2 sebagai **MCP Client**, AI Compiler memiliki kemampuan *Tool Call* ke layanan MCP ekosistem kita saat mengekstrak regulasi:
1. **Memanggil `knowledge_search` (Namespace: `shared_legal`):** Mengecek apakah pasal di Perbup 2026 ini merevisi atau menghapus pasal di Perbup 2025 (Cross-reference audit).
2. **Memanggil `query_db` (Simulasi Dampak Transaksi):** Sebelum menyetujui parameter baru, AI dapat menjalankan simulasi *dry-run* ke database transaksi desa untuk menghitung dampak finansial ("Jika ADDM dinaikkan dari 70% ke 75%, berapa desa yang akan mengalami defisit Siltap?").
3. **Memanggil `mcp-ltm-manager`:** Menyimpan *learnings* & histori ekstraksi regulasi ke Long Term Memory (LTM).

