# Unified Database Schema (SIP-DADES-BAKEUDA)

Skema database terpadu ini menggabungkan struktur data berbasis dokumen (NoSQL) di **Appwrite**. Skema ini dirancang berdasarkan logika pencairan dan validasi finansial yang ketat sesuai regulasi:
1. **Perbup ADD No 1 Tahun 2026**: Validasi 1/12 pencairan bulanan, alokasi 70% (ADDM) & 30% (ADDP).
2. **SK Bupati BHPR No 5 Tahun 2026**: Validasi alokasi 20% (kegiatan pajak) & 10% (reward petugas).
3. **Surat Tagihan BPJS**: Potongan otomatis premi JKN-KIS (1% Pribadi, 4% Pemda) setiap Januari.

Karena berbasis dokumen, relasi antar tabel (Foreign Key) disimulasikan dengan menyimpan ID referensi (string).

## ER Diagram (Mermaid)

```mermaid
erDiagram
    MASTER_DESA {
        string _id PK
        string nama_desa
        string kecamatan
        string no_rekening
        string nama_kepala_desa
        float pagu_pbb_p2 "Dasar perhitungan reward BHPR 10%"
    }
    
    PAGU_ALOKASI {
        string _id PK
        string desa_id FK "ID Dokumen master_desa"
        integer tahun_anggaran
        string jenis_dana "Enum: 'ADD', 'BKK_SARPRAS', 'BHPR', 'DD'"
        float pagu_total "Total anggaran disetujui"
        
        %% Kalkulasi Khusus ADD
        float pagu_dasar_addm "70% dari Total ADD Kabupaten (Merata)"
        float pagu_proporsional_addp "30% dari Total ADD (Proporsional)"
        float pagu_siltap_jaminan "Kebutuhan Siltap + Jaminan Sosial"
        
        %% Kalkulasi Khusus BHPR
        float min_alokasi_pajak "Minimal 20% dari Pagu BHPR"
        float max_reward_petugas "Maksimal 10% dari Pagu PBB P2"
        
        float realisasi_kumulatif "Akumulasi dana cair"
        float sisa_pagu "pagu_total - realisasi_kumulatif"
    }
    
    TRANSAKSI_PENCAIRAN {
        string _id PK
        string desa_id FK "ID Dokumen master_desa"
        string pagu_id FK "ID Dokumen pagu_alokasi"
        string jenis_dana "ADD, BKK, BHPR"
        string bulan_penyaluran "Khusus ADD (Jan-Des)"
        string tahap_ke "Khusus BKK/DD (Termin 1,2,3)"
        
        %% Logika Finansial (Bruto - Potongan = Netto)
        float nominal_pengajuan "Nominal Kuitansi Bruto"
        float limit_maksimal "Batas validasi (Cth: 1/12 Pagu ADD)"
        float potongan_bpjs "Otomatis diisi sistem pada bulan Januari"
        float nominal_net "Yang ditransfer ke RKD"
        
        string status "Enum: 'DRAFT_DESA', 'REVIEW_KECAMATAN', 'PROSES_BAKEUDA', 'CAIR', 'DITUNDA_BHPR'"
        string file_kuitansi_id "ID File Bukti OCR"
        string hasil_ocr "JSON Raw Ekstraksi RunPod"
    }
    
    POTONGAN_BPJS_BULANAN {
        string _id PK
        string desa_id FK "ID Dokumen master_desa"
        string bulan_tagihan "ex: 'Juli 2026'"
        float total_iuran_4_persen "Kewajiban Pemda/ADD"
        float total_iuran_1_persen "Kewajiban Pribadi"
        float total_potongan
    }

    MASTER_DESA ||--o{ PAGU_ALOKASI : "menerima pagu"
    PAGU_ALOKASI ||--o{ TRANSAKSI_PENCAIRAN : "memiliki riwayat pencairan"
    MASTER_DESA ||--o{ POTONGAN_BPJS_BULANAN : "memiliki tagihan bpjs"
    POTONGAN_BPJS_BULANAN ||--o| TRANSAKSI_PENCAIRAN : "dipotong pada transaksi ADD Januari"
```

## Validasi Bisnis di Level Aplikasi (API / Next.js)

Skema di atas dirancang untuk mengakomodasi fungsi *backend* (API) yang akan melakukan validasi berikut secara otomatis:

1. **Validasi Plafon ADD Bulanan (Pasal 21 Perbup ADD 1/2026):**
   *   Saat staf desa mengajukan pencairan ADD bulanan, sistem akan mengecek apakah `nominal_pengajuan` melebihi `1/12 * pagu_total`. Jika melebihi, sistem akan menolak (kecuali ada flag darurat/tambahan yang diizinkan hingga 70% dari pagu Januari).
2. **Validasi Alokasi BHPR (Pasal 7 Perbup BHPR 5/2026):**
   *   Sistem akan melacak bahwa pengajuan BHPR harus memiliki rincian minimal 20% untuk kegiatan intensifikasi pajak. 
   *   Jika terdapat pengajuan `reward_petugas`, sistem akan memvalidasi agar tidak melebihi 10% dari `pagu_pbb_p2` yang ada di `MASTER_DESA`.
   *   Terdapat status `DITUNDA_BHPR` jika Bakeuda mendapati desa belum menyetorkan kewajiban pajaknya.
3. **Automasi Pemotongan BPJS:**
   *   Khusus pada transaksi ADD bulan **Januari**, sistem otomatis menarik nilai `total_potongan` dari koleksi `POTONGAN_BPJS_BULANAN` dan menguranginya dari `nominal_pengajuan` sehingga menghasilkan `nominal_net` yang akurat.

