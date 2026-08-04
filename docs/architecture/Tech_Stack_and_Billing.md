# Tech Stack & Billing Management Dashboard
**Sistem Informasi Pengelolaan Dana Desa dan Bantuan Keuangan (SIP-DADES) BAKEUDA**

Dokumen ini memuat spesifikasi teknis (Tech Stack) yang digunakan dalam pengembangan aplikasi SIP-DADES agar dapat dipertanggungjawabkan secara *enterprise*. Dokumen ini juga memuat *roadmap* fitur kontrol biaya (Billing Dashboard) khusus untuk Super Admin.

---

## 1. Spesifikasi Tumpukan Teknologi (Tech Stack)

Aplikasi dibangun menggunakan arsitektur modern berbasis Javascript/Typescript dengan pendekatan *Serverless/BaaS* untuk memastikan skalabilitas dan keamanan tinggi.

### A. Frontend & Core Framework
*   **Framework:** Next.js 16 (React 19) - *Digunakan untuk Server-Side Rendering (SSR) yang cepat dan aman.*
*   **Styling:** Tailwind CSS v4 - *Untuk antarmuka yang responsif dan konsisten.*
*   **Data Processing:** `xlsx` - *Untuk parsing file Excel saat Bulk Data Ingestion (Master Regulasi).*

### B. Backend & Database (BaaS)
*   **Platform:** Appwrite (`appwrite` & `node-appwrite` SDK)
*   **Database:** Appwrite NoSQL Document Database - *Digunakan untuk menyimpan Master Desa, Pagu Alokasi, dan Transaksi.*
*   **Storage & Auth:** Appwrite Storage (untuk menyimpan kuitansi & PDF) dan Appwrite Authentication dengan mekanisme *Teams* (RBAC RLS).

### C. AI & Pemrosesan PDF (Engine)
Mengingat adanya fitur OCR Kuitansi dan *Workflow Tanda Tangan Basah*, aplikasi mengandalkan beberapa modul pihak ketiga:
*   **Modul PDF:** `pdfmake`, `pdf-parse`, `pdf2json`, `pdfjs-dist` (Men-generate dan membaca *layout* PDF tanda tangan basah & Barcode).
*   **AI OCR Engine:** Google Generative AI (`@google/generative-ai`), OpenAI SDK, dan integrasi API eksternal (RunPod) untuk ekstraksi teks gambar presisi tinggi.

---

## 2. Roadmap: Dashboard Kontrol Biaya (Billing & Usage Control)

Penggunaan layanan pihak ketiga (Appwrite Cloud, RunPod GPU, OpenAI/Gemini API) akan memakan biaya operasional (OPEX) yang fluktuatif. Oleh karena itu, kita akan membangun **Billing Dashboard** eksklusif untuk **Super Admin / IT**.

### Fitur Utama Dashboard Billing:
1.  **AI & OCR Usage Monitor:**
    *   Melacak berapa kali API RunPod / Gemini / OpenAI dipanggil dalam sebulan.
    *   Estimasi biaya *Pay-as-you-go* secara *real-time* (Misal: "Bulan ini telah menghabiskan $15 untuk 5.000 scan kuitansi").
    *   **Fitur Kill-Switch:** Tombol darurat untuk mematikan fitur OCR jika mendeteksi anomali penggunaan/serangan *spam* dari *user* tingkat bawah, memaksa operator menggunakan input manual sementara waktu.

2.  **Appwrite Resource Quota:**
    *   Memantau metrik *Bandwidth* (GB/bulan) dan ruang penyimpanan (*Storage*) untuk arsip PDF kuitansi.
    *   Menampilkan peringatan (Alert) merah muda jika sisa kuota penyimpanan *Free-tier* atau paket langganan saat ini tersisa < 20%.

3.  **Laporan Keuangan Ekspor (Accountability & Invoice Report):**
    *   Mengingat aplikasi ini merupakan inisiatif independen yang membutuhkan pembiayaan operasional (OPEX) berjalan dari klien internal Bakeuda, dasbor ini dilengkapi fitur **Eskpor Rekap Biaya (Invoice)**.
    *   Super Admin / DevOps dapat mengekspor laporan pengeluaran IT bulanan (dalam format PDF/Excel) yang profesional dan transparan. Laporan ini dapat diserahkan langsung kepada klien (sponsor internal) sebagai bukti valid rincian biaya *server*, *storage*, dan *API AI* yang telah terpakai untuk mempertahankan operasional aplikasi.

### Rencana Implementasi:
*   **Tahap 1:** Membuat halaman rute khusus `/admin/billing` yang dijaga dengan otorisasi ketat (Hanya role `Super Admin`).
*   **Tahap 2:** Menarik data metrik *usage* secara langsung atau dari *webhook* untuk ditampilkan sebagai *Dashboard Chart* interaktif yang elegan, sehingga klien bisa melihat langsung kemana dana operasional mereka mengalir.
*   **Tahap 3:** Menerapkan limitasi otomatis (*auto-throttle*) di level Backend Next.js agar sistem tidak pernah melewati batas anggaran dana yang diberikan klien tiap bulannya.
