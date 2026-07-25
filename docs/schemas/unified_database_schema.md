# Unified Database Schema (SIP-DADES-BAKEUDA)

Skema database terpadu ini menggabungkan struktur dari file `ADD-2026.xls` dan `BKK 2026.xlsm` untuk diimplementasikan di **Supabase**.

## ER Diagram (Mermaid)

```mermaid
erDiagram
    MASTER_DESA {
        uuid id PK
        string kode_desa UK "Format ex: 01.02"
        string nama_desa
        string kecamatan
    }
    
    MASTER_SUMBER_DANA {
        uuid id PK
        string kode_sumber "ex: ADD, BKK_SARPRAS, DD_REGULER, DD_INSENTIF"
        string nama_sumber
        string dasar_hukum "ex: PMK (Peraturan Menteri Keuangan)"
    }
    
    PAGU_ALOKASI {
        uuid id PK
        uuid desa_id FK
        uuid sumber_dana_id FK
        integer tahun_anggaran
        float total_pagu_bruto
    }
    
    TRANSAKSI_PENCAIRAN {
        uuid id PK
        uuid pagu_id FK
        string tahap_ke "ex: Tahap 1, Tahap 2, Bulanan"
        float nominal_potongan_bpjs
        float nominal_pencairan_net
        string status_verifikasi "DRAFT, REVIEW_KASUBBID, REVIEW_KABID, SPP_ISSUED"
        string no_rekomendasi
        date tanggal_rekomendasi
    }
    
    KWITANSI_CETAK {
        uuid id PK
        uuid transaksi_id FK
        string no_kwitansi UK
        string terbilang_rupiah
    }

    MASTER_DESA ||--o{ PAGU_ALOKASI : "menerima alokasi"
    MASTER_SUMBER_DANA ||--o{ PAGU_ALOKASI : "diklasifikasikan dalam"
    PAGU_ALOKASI ||--o{ TRANSAKSI_PENCAIRAN : "memiliki riwayat"
    TRANSAKSI_PENCAIRAN ||--|| KWITANSI_CETAK : "menerbitkan"
```

## Deskripsi Tabel
1. **`master_desa`**: Tabel sentral untuk data geografis pemerintahan desa.
2. **`master_sumber_dana`**: Menyelesaikan masalah perbedaan file Excel (ADD vs BKK) menjadi satu tabel *lookup* terpadu.
3. **`pagu_alokasi`**: Tempat total anggaran tahunan dialokasikan per desa dan sumber dana.
4. **`transaksi_pencairan`**: Jantung dari aplikasi. Menggantikan *sheet* `Pengajuan`, `Tahap 1`, dan `Tahap 2`. Memiliki *workflow state* (`status_verifikasi`) sesuai SOP.
5. **`kwitansi_cetak`**: Tabel arsip untuk kuitansi yang telah diproses.
