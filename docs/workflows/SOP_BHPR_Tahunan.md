# SOP Workflow Bagi Hasil Pajak & Retribusi (BHPR) Tahunan

**Tujuan:** Mengatur tata cara pembagian dan optimalisasi Dana BHPR bagi pemerintah desa yang berkontribusi dalam pemungutan pajak (PBB-P2) dan retribusi daerah.
**Aktor yang Terlibat:** Pemerintah Desa (Kades, Petugas Pemungut PBB-P2), BAKEUDA (Bidang Pendapatan & Perbendaharaan).

## 1. Kebijakan Utama
- Desa wajib menganggarkan **minimal 20%** dari total BHPR untuk biaya operasional/intensifikasi pemungutan pajak (Sosialisasi, Transportasi).
- Terdapat **sistem Reward** (Penghargaan 10% dari pagu yang menjadi tanggung jawabnya) bagi Petugas Desa yang melakukan setoran lunas tercepat sebelum jatuh tempo.
- Terdapat **sistem Sanksi** (Penundaan pencairan BHPR) apabila kewajiban pajak desa tidak dipenuhi / tidak disetorkan.

## 2. Alur Proses (Workflow)

```mermaid
sequenceDiagram
    autonumber
    actor D as Pemerintah Desa (Petugas PBB-P2)
    actor B as BAKEUDA (Bidang Pendapatan)
    actor K as BAKEUDA (Bidang Perbendaharaan)

    D->>D: Melakukan Pemungutan Pajak ke Warga
    D->>B: Menyetorkan Pajak/Retribusi (Bisa dicicil / lunas awal)
    
    B->>B: Rekonsiliasi Penerimaan Pajak Daerah
    
    alt Desa Lunas Tercepat (Sebelum Jatuh Tempo)
        B->>K: Masukkan ke Daftar Penerima Reward (Alokasi tambahan)
    else Desa Belum Menyetorkan Kewajiban
        B->>K: Masukkan ke Daftar Blacklist / Penundaan
    end
    
    Note over D, K: Saat Siklus Penyaluran Dana BHPR Tiba
    
    D->>K: Permohonan Pencairan BHPR
    K->>K: Sistem SIP-DADES mengecek Status Kewajiban Pajak Desa
    
    alt Status = TERTUNDA / BLOCK
        K-->>D: Pencairan Ditunda (Peringatan Setor Pajak)
    else Status = CLEAR
        K->>K: Hitung & Proses Pencairan (Termasuk Reward jika ada)
        K-->>D: Dana BHPR Ditransfer
    end
```

## 3. Ketentuan Sistem SIP-DADES
- **Integrasi Status:** SIP-DADES harus memiliki modul (bisa manual toggle atau API) yang menunjukkan status lunas/tidaknya kewajiban PBB-P2 suatu desa.
- **Blokir Sistem:** Jika status desa ditandai merah, sistem secara otomatis melarang (`disable`) tombol pengajuan pencairan dana BHPR.
