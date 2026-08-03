# ADR 0001: Unified Database Schema for ADD & BKK

**Date:** 2026-07-25 (Updated 2026-08-03)
**Status:** Accepted

## Context
Aplikasi SIP-DADES-BAKEUDA ditugaskan untuk memigrasikan proses manual yang berbasis pada dua file Excel yang memiliki arsitektur berbeda:
1. `ADD-2026.xls`: Menggunakan tahapan penyaluran bulanan.
2. `BKK 2026.xlsm`: Menggunakan tahapan per-termin (Tahap 1, Tahap 2) dan memiliki kategori spesifik seperti Sarana Prasarana (Sarpras).

Kita membutuhkan arsitektur database (menggunakan **Appwrite**) yang bisa memfasilitasi kedua alur kerja tersebut tanpa harus membuat koleksi *hard-code* terpisah untuk setiap jenis dana.

## Decision
Kita memutuskan untuk menggunakan **Unified Relational Schema** (Skema Modular Terpadu), di mana:
- Pagu anggaran disatukan dalam koleksi `pagu_alokasi` yang menampung flag/enum `jenis_dana` (ADD atau BKK).
- Proses pencairan disatukan dalam koleksi `transaksi_pencairan`, yang menampung keterangan pencairan dan menyimpan ID dari dokumen `pagu_alokasi`.
- Koleksi `transaksi_pencairan` akan memiliki atribut `status_verifikasi` untuk mereplikasi *Approval Workflow* dari SOP (Draft, Kasubbid, Kabid, SPP).

## Consequences
- **Keuntungan:** Sistem sangat fleksibel. Jika tahun depan ada sumber dana baru (misal: Bantuan Provinsi), kita cukup menambahkan data dengan flag jenis dana baru di `pagu_alokasi` tanpa perlu mengubah skema database secara masif.
- **Kekurangan:** Menulis query atau melakukan agregasi (seperti *dashboard rekapitulasi*) di Appwrite akan sedikit lebih kompleks karena sifat NoSQL/Document-based yang dimilikinya dan tidak adanya fitur `JOIN` atau `GROUP BY` bawaan layaknya RDBMS tradisional. Proses agregasi data akan diserahkan pada level backend (Next.js API).
