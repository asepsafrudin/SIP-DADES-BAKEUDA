# Unified Database Schema (SIP-DADES-BAKEUDA)

Skema database terpadu ini menggabungkan struktur dari file `ADD-2026.xls` dan `BKK 2026.xlsm` untuk diimplementasikan di **Appwrite**. Berbeda dengan RDBMS tradisional, Appwrite merupakan sistem berbasis dokumen (NoSQL). Kita menggunakan simulasi *Foreign Key* dengan menyimpan ID string dokumen terkait.

## ER Diagram (Mermaid)

```mermaid
erDiagram
    MASTER_DESA {
        string _id PK
        string nama_desa
        string kecamatan
        string no_rekening "opsional"
        string nama_kepala_desa "opsional"
    }
    
    PAGU_ALOKASI {
        string _id PK
        string desa FK "ID Dokumen master_desa"
        integer tahun_anggaran
        string jenis_dana "Enum: 'ADD', 'BKK'"
        float pagu_total
    }
    
    TRANSAKSI_PENCAIRAN {
        string _id PK
        string pagu FK "ID Dokumen pagu_alokasi"
        string keterangan "ex: Pencairan Tahap 1, Pencairan BKK"
        float nominal_pencairan_net
        string no_rekomendasi
        string status_verifikasi "Enum: 'DRAFT', 'DIPROSES', 'DISETUJUI', 'DITOLAK'"
        string hasil_ocr "Menyimpan JSON raw dari RunPod OCR"
    }

    MASTER_DESA ||--o{ PAGU_ALOKASI : "menerima alokasi"
    PAGU_ALOKASI ||--o{ TRANSAKSI_PENCAIRAN : "memiliki riwayat pencairan"
```

## Deskripsi Koleksi (Appwrite Collections)
1. **`master_desa`**: Koleksi referensi utama untuk data geografis dan rekening desa.
2. **`pagu_alokasi`**: Tempat total anggaran tahunan dialokasikan per desa. Menyelesaikan masalah pemisahan file Excel (ADD vs BKK) menjadi satu koleksi terpadu dengan atribut filter/flag `jenis_dana`.
3. **`transaksi_pencairan`**: Koleksi utama (*Jantung Aplikasi*). Menggantikan *sheet* `Pengajuan`, `Tahap 1`, dan `Tahap 2` di Excel. Menyimpan *workflow state* (`status_verifikasi`) sesuai SOP dan menampung hasil ekstrak otomatis OCR dari RunPod Serverless GPU.
