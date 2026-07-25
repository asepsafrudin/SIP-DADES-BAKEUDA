# ADR 0001: Unified Database Schema for ADD & BKK

**Date:** 2026-07-25  
**Status:** Accepted

## Context
Aplikasi SIP-DADES-BAKEUDA ditugaskan untuk memigrasikan proses manual yang berbasis pada dua file Excel yang memiliki arsitektur berbeda:
1. `ADD-2026.xls`: Menggunakan tahapan penyaluran bulanan.
2. `BKK 2026.xlsm`: Menggunakan tahapan per-termin (Tahap 1, Tahap 2) dan memiliki kategori spesifik seperti Sarana Prasarana (Sarpras).

Kita membutuhkan arsitektur database Supabase yang bisa memfasilitasi kedua alur kerja tersebut tanpa harus membuat tabel *hard-code* terpisah untuk setiap jenis dana.

## Decision
Kita memutuskan untuk menggunakan **Unified Relational Schema** (Skema Modular Terpadu), di mana:
- Kita memisahkan jenis dana ke dalam tabel *lookup* `master_sumber_dana`.
- Proses pencairan disatukan dalam tabel `transaksi_pencairan`, yang menampung flag `tahap_ke` (Tahap 1, Tahap 2, atau Bulanan).
- Tabel `transaksi_pencairan` akan memiliki kolom `status_verifikasi` untuk mereplikasi *Approval Workflow* dari SOP (Draft, Kasubbid, Kabid, SPP).

## Consequences
- **Keuntungan:** Sistem sangat fleksibel. Jika tahun depan ada sumber dana baru (misal: Bantuan Provinsi), kita cukup menambahkan baris di tabel `master_sumber_dana` tanpa perlu mengubah skema database.
- **Kekurangan:** Menulis query SQL untuk *dashboard rekapitulasi* akan sedikit lebih kompleks karena harus menggunakan `GROUP BY sumber_dana_id`.
