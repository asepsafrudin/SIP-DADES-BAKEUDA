# ROADMAP: SIP-DADES-BAKEUDA

Sistem Informasi Pengelolaan Dana Desa dan Bantuan Keuangan (SIP-DADES) Badan Keuangan Daerah (Bakeuda) Kabupaten Purbalingga.
Proyek ini mengkonversi proses manual Excel (`ADD-2026.xls` & `BKK 2026.xlsm`) menjadi aplikasi web terpadu dengan integrasi AI.

## Milestone Proyek

```mermaid
gantt
    title Peta Jalan Pengembangan SIP-DADES-BAKEUDA
    dateFormat  YYYY-MM-DD
    section Fase 1: Setup
    Inisialisasi Next.js & Git     :done, phase1_1, 2026-07-25, 1d
    Instalasi Appwrite & Konfigurasi:done, phase1_2, 2026-07-25, 1d
    
    section Fase 2: Database
    Desain Unified Schema (ADD+BKK):active, phase2_1, 2026-07-25, 1d
    Pembuatan Koleksi Appwrite     :         phase2_2, after phase2_1, 1d
    Setup Role & Akses (Keamanan)  :         phase2_3, after phase2_2, 1d
    
    section Fase 3: Integrasi AI
    Setup AI OCR Scanner           :done, phase3_1, 2026-07-25, 2d
    Deploy RunPod Serverless Worker:done, phase3_2, 2026-08-03, 1d
    Integrasi API OCR di Next.js   :done, phase3_3, 2026-08-03, 1d
    
    section Fase 4: Frontend UI
    Dashboard Kuitansi & Transaksi :active, phase4_1, after phase3_3, 3d
    Modul Input Transaksi (Draft)  :         phase4_2, after phase4_1, 2d
    Modul Cetak Kuitansi Terbilang :         phase4_3, after phase4_2, 2d
```

## Proses Bisnis Utama (Berdasarkan SOP PDT)

Aplikasi akan mengotomatisasi alur kerja berikut:

```mermaid
flowchart TD
    A["Dinsospermasdes / Camat"] -->|Kirim Rekomendasi Fisik| B("Staf Pelaksana")
    B -->|Scan menggunakan AI OCR| C{"Sistem SIP-DADES"}
    C -->|Auto-fill Draft| D["Tabel Penyaluran Rinci"]
    D --> E["Proses Pemeriksaan (Ka. Sub. Bid PDT & Ka. Bid APDT)"]
    E -->|Ditolak| B
    E -->|Disetujui| F["Dokumen SPP & Kuitansi Bakeuda"]
    F --> G["Bendahara (SPM)"]
```

## Arsitektur Infrastruktur & Efisiensi Biaya

Sebagai bentuk penghematan anggaran publik dan menjaga privasi data instansi, sistem memisahkan beban komputasi AI/OCR ke *Self-hosted Serverless GPU*:

1. **Frontend & Backend (Next.js)**: Menyajikan antarmuka pengguna dan memproses alur kerja dokumen.
2. **Database (Appwrite)**: Pusat penyimpanan data (Draft SPP, Kuitansi, Pagu Alokasi) dan sistem manajemen autentikasi / RLS keamanan.
3. **AI/OCR (RunPod Serverless)**: *Worker* Python mandiri berbasis GPU yang menggunakan **EasyOCR**. GPU ini berstatus *sleep* secara *default* dan hanya "bangun" saat ada permintaan *scan* dokumen rekomendasi dari staf Bakeuda, sehingga menekan biaya *compute* menjadi sekecil mungkin (*pay-per-second*). Dilengkapi dengan sistem persistent volume cache untuk mempercepat waktu *cold start*.

## Status Terkini
- **Setup Infrastruktur (Selesai):** Proyek Next.js berhasil diinisialisasi dan tersambung dengan Appwrite & GitHub.
- **Integrasi AI OCR (Selesai):** Pembuatan dan *deployment* OCR Engine (EasyOCR) ke RunPod Serverless GPU telah sukses. API OCR di Next.js telah dihubungkan dan sudah melalui proses *timeout tuning*.
- **Langkah Selanjutnya:** Melanjutkan pengembangan Frontend UI untuk *Dashboard Kuitansi* dan manajemen data dari Appwrite.
