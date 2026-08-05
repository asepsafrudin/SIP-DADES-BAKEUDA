# ADR 0002: Isolated Standalone RAG Deployment for Bakeuda Purbalingga

**Date:** 2026-08-05
**Status:** Accepted

## Context
Sistem **SIP-DADES-BAKEUDA** direncanakan untuk di-deploy secara mandiri (*standalone deployment*). Sistem ini membutuhkan basis pengetahuan hukum (*RAG knowledge base*) sendiri yang terisolasi penuh dari dinas atau wilayah lain. 

Cakupan pengetahuan (*knowledge scope*) yang disajikan harus dibatasi secara ketat hanya pada:
1.  Dokumen internal dan prosedur kerja **Bakeuda**.
2.  Data administratif dan tata kelola **Kabupaten Purbalingga**.
3.  Seluruh regulasi daerah (Perda/Perbup Purbalingga) dan regulasi nasional (UU/PMK) yang berkaitan langsung dengan pengelolaan keuangan desa di Kabupaten Purbalingga.

Kita membutuhkan panduan arsitektur untuk memastikan integrasi MCP Client Next.js yang telah kita bangun dapat dialihkan dengan mudah ke mode terisolasi ini tanpa merombak kode program utama.

## Decision
Kami memutuskan untuk menerapkan **Isolated Standalone RAG Architecture** dengan langkah-langkah implementasi sebagai berikut:

```mermaid
flowchart TD
    A["Next.js App (Bakeuda Server)"] -->|1. SSE Client| B["Local MCP Server (Port 8000)"]
    B -->|2. Query (Namespace: purbalingga_legal)| C["Local PostgreSQL + pgvector DB"]
    C -->|3. Vector Search| D["Purbalingga RAG Data Store"]
    E["Purbalingga ETL Ingestion pipeline"] -->|4. Indexing (nomic-embed-text)| C
```

1.  **Isolasi Database & Vector Store:**
    *   Membangun instansi PostgreSQL + `pgvector` mandiri di infrastruktur server Bakeuda Purbalingga.
    *   Memisahkan data memori jangka panjang (LTM) dan data hukum RAG ke dalam satu database terdedikasi `mcp_purbalingga`.
2.  **Standardisasi Penamaan Namespace Terisolasi:**
    *   **`purbalingga_legal`**: Namespace khusus untuk menampung Peraturan Bupati Purbalingga tentang ADD, BHPR, BKK, serta Peraturan Daerah terkait.
    *   **`purbalingga_adm`**: Namespace untuk profil desa, data administratif kecamatan, dan setoran PBB-P2 18 kecamatan di Purbalingga.
    *   **`bakeuda_internal`**: Namespace untuk petunjuk teknis (Juknis), SOP verifikasi berkas, dan dokumen kerja internal Bakeuda.
3.  **Konfigurasi Variabel Lingkungan (.env):**
    *   Next.js API akan menggunakan variabel `.env` dinamis untuk mengarahkan MCP Client ke server internal Purbalingga:
        ```env
        NEXT_PUBLIC_APPWRITE_ENDPOINT="https://[ip-appwrite-lokal]/v1"
        MCP_SERVER_URL="http://localhost:8000"
        RAG_NAMESPACE="purbalingga_legal"
        ```
4.  **Resilient Fallback Local Registry:**
    *   Menjaga fungsi *automatic fallback* yang telah kita buat di kompilator regulasi. Jika koneksi ke server MCP lokal mengalami gangguan, sistem secara otomatis beralih ke aturan *rule-based* bawaan (lokal *compiled rules*) sehingga tidak menghentikan layanan dashboard keuangan desa.

## Consequences
*   **Keuntungan (Pros):**
    *   **Kepatuhan Hukum & Privasi:** Menghindari risiko kebocoran data sensitif daerah Purbalingga ke pihak luar atau sebaliknya.
    *   **Akurasi Tinggi:** AI Gemini/Local Model akan menerima konteks hukum yang 100% relevan dengan regulasi Purbalingga tanpa gangguan (*noise*) dari daerah lain.
    *   **Kemudahan Deploy:** Seluruh sistem menjadi *self-contained* (aplikasi, database, dan AI pipeline dapat berjalan di balik jaringan intranet Pemda Purbalingga).
*   **Kekurangan (Cons):**
    *   **Overhead Maintenance:** Tim IT Bakeuda Purbalingga harus mengelola instansi PostgreSQL dan server persistent MCP mereka sendiri.
    *   **Ingestion Pipeline:** Proses kurasi dan unggah dokumen Perbup Purbalingga yang baru wajib dilakukan secara berkala melalui pipeline ETL internal.
