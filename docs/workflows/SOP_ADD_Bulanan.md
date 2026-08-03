# SOP Workflow Pencairan Alokasi Dana Desa (ADD) Bulanan

**Tujuan:** Mengatur tata cara dan alur pencairan ADD secara rutin (setiap bulan) untuk membiayai penyelenggaraan pemerintahan desa dan penghasilan tetap (Siltap).
**Aktor yang Terlibat:** Staf Desa (Pemohon), Pihak Kecamatan (Camat/Verifikator), DINSOSPERMASDESP3A, BAKEUDA.

## 1. Persyaratan Dokumen (Upload ke Sistem)
Setiap bulan, Desa wajib mengunggah:
- **Januari:** Surat Pengantar, Perdes APBDesa, SPTJM, Kuitansi, Surat Kuasa Pemotongan BPJS Kesehatan.
- **Februari:** Surat Pengantar, Kuitansi bulan sebelumnya, Laporan Penggunaan ADD (Okt-Nov tahun lalu).
- **Maret - Des:** Surat Pengantar, Kuitansi bulan sebelumnya, Laporan Realisasi/Penggunaan ADD (2 bulan sebelumnya).

## 2. Alur Proses (Workflow)

```mermaid
sequenceDiagram
    autonumber
    actor D as Staf Desa
    actor C as Pihak Kecamatan
    actor P as DINSOSPERMASDES
    actor B as BAKEUDA / Sistem

    D->>D: Menyusun Dokumen Persyaratan
    D->>C: Mengajukan Permohonan (via Sistem SIP-DADES)
    Note over D, C: Maksimal tanggal 15 setiap bulan
    
    C->>C: Verifikasi Kelengkapan (Surat, Kuitansi, Laporan)
    alt Dokumen Tidak Lengkap
        C-->>D: Tolak & Kembalikan (Revisi)
    else Dokumen Lengkap
        C->>P: Terbitkan Rekomendasi & Teruskan ke Dinsos (Maks tgl 20)
    end
    
    P->>P: Review Tingkat Kabupaten
    P->>B: Terbitkan Rekomendasi ke BAKEUDA (Maks tgl 25)
    
    B->>B: Proses Pencairan (Max 1/12 dari Pagu ADD)
    Note over B: KHUSUS JANUARI: Sistem otomatis<br/>memotong premi BPJS Kades & Perangkat.
    
    B-->>D: Notifikasi: Dana Ditransfer ke RKUD -> RKD
```

## 3. Ketentuan Sistem SIP-DADES
- **Modul Kuitansi:** Sistem (OCR) akan membaca *field* nominal, tanda tangan, dan bulan dari Kuitansi yang diunggah.
- **State/Status Dokumen:** `DRAFT_DESA` ➔ `REVIEW_KECAMATAN` ➔ `REVIEW_DINSOS` ➔ `PROSES_BAKEUDA` ➔ `CAIR`.
