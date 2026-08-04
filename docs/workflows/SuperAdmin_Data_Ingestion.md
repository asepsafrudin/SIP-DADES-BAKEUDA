# Mekanisme Input Data Profesional (Data Ingestion Workflow)

Dokumen ini menjelaskan alur kerja (workflow) untuk mengunggah dan memvalidasi Master Data setiap kali pergantian tahun anggaran atau terbitnya regulasi baru. Alur ini dirancang khusus untuk memisahkan beban kerja antar petugas (*Operator Bakeuda*) dan mendelegasikan wewenang persetujuan akhir (*Approval*) kepada **Super Admin**.

---

## 1. Pemisahan Template Berdasarkan Jenis Dana
Untuk mengakomodasi beberapa petugas yang bekerja secara paralel, sistem menyediakan unduhan *template* Excel yang **terpisah per jenis dana**.

*   **Template ADD.xlsx:** Khusus untuk operator yang menangani Alokasi Dana Desa. Memuat kolom `pagu_dasar_addm` dan `pagu_proporsional_addp`.
*   **Template BHPR.xlsx:** Khusus untuk operator yang menangani Bagi Hasil Pajak. Memuat kolom `pagu_pbb_p2`.
*   **Template BKK.xlsx:** Khusus untuk operator Bantuan Keuangan Khusus.
*   **Template BPJS.xlsx:** Khusus untuk operator/bagian kepegawaian yang mengunggah rincian tagihan 1% dan 4%.

> [!TIP]
> Semua template secara otomatis akan di-generate oleh sistem (dari database `master_desa`) sehingga kolom Kode Desa dan Nama Desa sudah terisi (terkunci). Operator hanya berfokus melakukan *copy-paste* pada kolom nominal rupiah.

---

## 2. Hierarki Akses (RBAC) dalam Data Ingestion

Proses *ingestion* ini dipecah menjadi dua lapisan keamanan (Maker-Checker):

### A. Operator Bakeuda (Peran: MAKER / Uploader)
Petugas/Operator di dinas Bakeuda memiliki hak untuk mengunggah data Excel yang sudah mereka isi.
1. Operator masuk ke menu **"Upload Pagu Tahunan"**.
2. Operator memilih jenis dana (Misal: ADD) dan mengunggah file `Template ADD_2027.xlsx`.
3. Sistem membawa Operator ke layar **Staging Area** (Pratinjau).
4. Di layar ini, sistem memvalidasi logika finansial. Jika ada sel yang *error* (merah), operator bisa memperbaikinya langsung di tabel tersebut secara *inline* atau mengunggah ulang file yang sudah diperbaiki.
5. Setelah 100% valid (hijau), Operator menekan tombol **"Ajukan Draf ke Super Admin"**. (Data belum masuk ke database utama).

### B. Super Admin (Peran: CHECKER / Approver)
Super Admin berfungsi sebagai palang pintu terakhir untuk mencegah kerusuhan data massal.
1. Super Admin menerima notifikasi draf *ingestion* dari Operator.
2. Super Admin membuka menu **"Approval Master Data"** dan melihat ringkasan draf (Contoh: "Total Pagu ADD 2027: Rp 80 Miliar").
3. Super Admin memverifikasi apakah total tersebut *match* dengan SK Bupati.
4. Jika sesuai, Super Admin menekan **"Approve & Sinkronisasi"**. Saat inilah data secara permanen menimpa/menambah koleksi `PAGU_ALOKASI` di database utama.
5. Jika ada keraguan, Super Admin menekan **"Reject (Tolak)"** disertai catatan revisi, dan draf dikembalikan ke Operator.

---

## 3. Spesifikasi Layar Staging Area (Pre-flight Validation)

Layar ini adalah komponen kunci dari profesionalisme aplikasi. Sebelum data ditanam (Inject) ke database, layar ini akan bekerja sebagai *Business Rule Engine Sandbox*:

*   **Row-Level Validation:** 
    Memeriksa setiap desa (baris). Jika nilai ADDM yang di-upload kurang dari 70% total Pagu ADD desa tersebut, baris tersebut ditandai **Error Merah** dengan peringatan: *"Nilai ADDM tidak mencapai 70% margin regulasi"*.
*   **Missing Entry Detection:**
    Sistem mengecek silang dengan total 224 desa di Purbalingga. Jika di Excel hanya ada 220 baris, sistem akan menandai desa mana yang belum dimasukkan.
*   **Audit Trail Logs:**
    Setelah *Approve*, sistem mencatat: `Data ADD 2027 diunggah oleh (Operator B), disetujui oleh (SuperAdmin A) pada (Timestamp).`
