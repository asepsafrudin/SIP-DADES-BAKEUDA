# Rencana Pengalaman Pengguna (UX) & RBAC
**Sistem Informasi Pengelolaan Dana Desa dan Bantuan Keuangan (SIP-DADES) BAKEUDA**

Dokumen ini memetakan *Role-Based Access Control* (RBAC) dan rancangan perjalanan pengguna (*User Journey*) di dalam aplikasi SIP-DADES. Karena sistem ini melibatkan alur kerja lintas instansi (Desa, Kecamatan, Dinsos, dan Bakeuda), keamanan akses data (Multi-Tenant) menjadi sangat krusial.

---

## 1. Definisi Role (RBAC) & Matriks Hak Akses

Sistem akan menggunakan fitur **Teams** atau **Labels/Permissions** pada Appwrite untuk membedakan otorisasi setiap pengguna. Terdapat 5 Role utama:

| Role / Aktor | Lingkup Data (Scope) | Izin Operasi (Permissions) | Keterangan |
| :--- | :--- | :--- | :--- |
| **Super Admin / IT** | Global (Semua Data) | `Create, Read, Update, Delete` (CRUD) | **(Approver/Checker)** Manajemen Akun User dan Persetujuan akhir (*Approval*) Ingestion Master Data. |
| **Staf Pemdes (Desa)** | Spesifik (Data desanya saja) | `Read` (Pagu), `Create` (Draft Transaksi) | Pengguna di tingkat desa yang menginput dokumen syarat pencairan (Kuitansi, Pengantar). |
| **Verifikator Kecamatan** | Regional (Desa di kecamatannya) | `Read`, `Update` (Status) | Melakukan verifikasi tingkat 1 dan merubah status draft desa menjadi `REVIEW_KECAMATAN`. |
| **Tim Dinsospermasdes** | Global (Seluruh Kabupaten) | `Read`, `Update` (Status & Rekomendasi) | Memeriksa dokumen, mengunggah rekomendasi, dan meneruskan ke Bakeuda. |
| **Bakeuda (Operator/Uploader)** | Global (Seluruh Kabupaten) | `Read`, `Update`, Eksekusi OCR, `Create` (Draf Master) | **(Maker/Uploader)** Mengunggah draf Master Data per jenis dana, verifikasi OCR, memotong BPJS, memproses SPP hingga `CAIR`. |

---

## 2. User Journey (Alur Pengalaman Pengguna)

### A. Tampilan Dashboard Desa (Staf Pemdes)
*   **Fokus:** Transparansi sisa anggaran dan kemudahan pengajuan.
*   **Informasi Utama:** 
    *   Grafik pie chart persentase pencairan ADD/BKK tahun berjalan.
    *   Nominal Sisa Pagu (ADDM, ADDP).
*   **Aksi:** Tombol **"Ajukan Pencairan Baru"**.
*   **Status Pengajuan:** Tabel *tracking* dokumen (Contoh: "Menunggu Verifikasi Camat", "Sedang Diproses Bakeuda", "Sudah Cair").

### B. Tampilan Dashboard Kecamatan & Dinsos
*   **Fokus:** Kemudahan verifikasi tumpukan dokumen (Inbox Approval).
*   **Informasi Utama:** 
    *   Daftar antrean desa yang menunggu verifikasi (Tabel dengan fitur filter & sort).
    *   *Preview* langsung dokumen PDF (Surat Pengantar, SPJ) tanpa harus mengunduhnya.
*   **Aksi:** Tombol **"Setujui (Approve)"** atau **"Tolak (Kembalikan ke Desa)"** beserta catatan revisi.

### C. Tampilan Dashboard BAKEUDA
*   **Fokus:** Efisiensi pemrosesan dan automasi data.
*   **Informasi Utama:**
    *   Statistik Dokumen: Berapa banyak SPP yang harus dicetak hari ini.
    *   Peringatan (Alert): Desa yang belum membayar BPJS atau Desa dengan porsi BHPR kurang dari 20%.
*   **Aksi Inti (AI OCR):** 
    *   Ketika Bakeuda membuka dokumen kuitansi dari Dinsos, terdapat tombol **"Pindai Kuitansi (AI OCR)"**.
    *   Sistem memanggil RunPod, mengekstrak nominal bruto, tanggal, dan nama kades, lalu melakukan *auto-fill* pada form pembuatan Kuitansi Baku.
    *   Fitur **"Cetak Kuitansi Terbilang"** untuk mencetak *hardcopy* ke PDF.
    *   **Workflow Tanda Tangan Basah (Print & Scan-back):** Mengingat autentikasi pejabat masih menggunakan tanda tangan basah (kertas), sistem akan menghasilkan PDF baku (dilengkapi *barcode/QR tracking* dan blok tanda tangan). Dokumen fisik ini kemudian ditandatangani oleh pejabat, dan lembar akhirnya dipindai (Scan) lalu diunggah kembali (Ingest) ke dalam sistem untuk mengubah status dari `MENUNGGU_TTE` menjadi `CAIR`.
---

## 3. Strategi Implementasi Keamanan (Appwrite RLS)

Mengingat saat ini RBAC hanya diisi oleh *"Single User (Super Admin)"*, berikut adalah strategi transisi menuju Multi-Tenant:

1. **Memanfaatkan Appwrite Teams:** 
   * Buat Team ID berdasarkan Kecamatan (misal: `kec_purbalingga`, `kec_kaligondang`).
   * Setiap staf desa dimasukkan ke dalam Team kecamatannya, namun dengan Label spesifik `desa_id` (misal: `desa_kembaran`).
2. **Document Level Security (Permission Array):**
   * Saat `transaksi_pencairan` dibuat oleh Desa A, pada setting otorisasi (Permissions) dokumen tersebut diisi dengan:
     * `read("team:kec_purbalingga")`
     * `read("team:dinsos")`
     * `read("team:bakeuda")`
     * `update("team:bakeuda")`
   * Hal ini memastikan secara matematis sistem Appwrite akan memblokir (HTTP 403 Forbidden) jika Staf Desa B mencoba membaca kuitansi Desa A melalui API.
3. **Pendaftaran User:**
   * Registrasi tidak dibuka untuk umum (No public sign-up). Akun Desa dibuatkan dan didistribusikan secara terpusat oleh Super Admin Bakeuda untuk mencegah pembuatan akun palsu.
