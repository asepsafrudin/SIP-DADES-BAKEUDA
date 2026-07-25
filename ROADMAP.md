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
    Instalasi Supabase SSR & JS    :done, phase1_2, 2026-07-25, 1d
    
    section Fase 2: Database
    Desain Unified Schema (ADD+BKK):active, phase2_1, 2026-07-25, 1d
    Pembuatan Tabel Supabase       :         phase2_2, after phase2_1, 1d
    Setup RLS (Keamanan Data)      :         phase2_3, after phase2_2, 1d
    
    section Fase 3: Integrasi AI
    Setup AI OCR Scanner           :         phase3_1, after phase2_3, 2d
    Testing Upload SOP & Rekomendasi:        phase3_2, after phase3_1, 1d
    
    section Fase 4: Frontend UI
    Dashboard & Autentikasi        :         phase4_1, after phase3_2, 3d
    Modul Input Transaksi (Draft)  :         phase4_2, after phase4_1, 2d
    Modul Cetak Kuitansi Terbilang :         phase4_3, after phase4_2, 2d
```

## Proses Bisnis Utama (Berdasarkan SOP PDT)

Aplikasi akan mengotomatisasi alur kerja berikut:

```mermaid
flowchart TD
    A[Dinsospermasdes / Camat] -->|Kirim Rekomendasi Fisik| B(Staf Pelaksana)
    B -->|Scan menggunakan AI OCR| C{Sistem SIP-DADES}
    C -->|Auto-fill Draft| D[Tabel Penyaluran Rinci]
    D --> E[Proses Pemeriksaan (Ka. Sub. Bid PDT & Ka. Bid APDT)]
    E -->|Ditolak| B
    E -->|Disetujui| F[Dokumen SPP & Kuitansi Bakeuda]
    F --> G[Bendahara (SPM)]
```

## Status Terkini
- **Setup Infrastruktur (Selesai):** Proyek Next.js berhasil diinisialisasi dan tersambung dengan GitHub.
- **Analisis Kebutuhan (Selesai):** Pemahaman mendalam terhadap SOP Pengelolaan Dana Transfer serta arsitektur `ADD-2026.xls` dan `BKK 2026.xlsm`.
- **Langkah Selanjutnya:** Mendesain *database schema* terpadu di Supabase.
