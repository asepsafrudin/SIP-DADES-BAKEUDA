# Rencana Implementasi *Rule Engine* Regulasi & Transisi Tahunan
**Sistem Informasi Pengelolaan Dana Desa dan Bantuan Keuangan (SIP-DADES) BAKEUDA**

Dokumen ini mendeskripsikan bagaimana logika hukum (Peraturan Menteri Keuangan, Peraturan Bupati, SK Bupati) diterjemahkan menjadi alur sistem (*workflow*) yang transparan bagi pengguna sesuai hak aksesnya (RBAC), serta skenario migrasi tahunan.

---

## 1. Arsitektur *Business Rule Engine* (Menghindari *Hardcode*)

Mengingat regulasi memiliki sifat **periodik (tahunan)**, aturan matematis seperti (70% ADDM, 1/12 pagu bulanan, 20% kewajiban BHPR) **TIDAK BOLEH** di-*hardcode* (ditanam mati) di dalam kode program Frontend maupun Backend. 

**Solusi:** Kita membuat koleksi baru di Appwrite bernama `master_regulasi`.
*   Setiap parameter akan disimpan sebagai *key-value pair* yang terikat pada `tahun_anggaran`.
*   **Struktur Koleksi `master_regulasi`:**
    *   `tahun_anggaran`: 2026
    *   `nama_peraturan`: "Perbup ADD No 1 Tahun 2026"
    *   `limit_pencairan_bulanan`: 0.0833 (1/12)
    *   `persentase_addm`: 0.70
    *   `kewajiban_bhpr_pajak`: 0.20
    *   `reward_bhpr_maks`: 0.10

### Skenario Transisi Akhir Tahun (Desember - Januari)
1. Super Admin mengakses menu **"Manajemen Regulasi Tahunan"**.
2. Sistem menduplikasi pengaturan 2026 untuk tahun 2027.
3. Super Admin memperbarui angka parameter jika ada Perbup atau PMK baru di tahun 2027. 
4. Semua transaksi yang diinput pada kalender 2027 secara otomatis akan mematuhi *logic* dan perhitungan matematika dari regulasi tahun 2027, sedangkan arsip 2026 tetap mengacu pada *rule* lama.

---

## 2. Visibilitas Regulasi pada UI/UX Berdasarkan RBAC

Logika hukum yang kaku harus diterjemahkan ke dalam panduan visual (UI) yang mudah dipahami (tidak membingungkan pengguna). Berikut skema implementasinya di antarmuka (Frontend):

### A. Tampilan Staf Pemdes (Desa) - *Role: Pemohon*
*   **Prinsip UX:** Membantu menghindari kesalahan input.
*   **Implementasi:** 
    *   Saat Staf Desa memasukkan angka pada kolom "Nominal Pengajuan", akan ada teks peringatan (Tooltip) otomatis di bawah kolom: *"Maksimal pengajuan Anda bulan ini adalah Rp 10.000.000 (1/12 dari Pagu, Sesuai Pasal 21 Perbup ADD No.1/2026)."*
    *   Sistem **memblokir tombol "Kirim (Submit)"** jika angka yang diisi melebihi batas regulasi tahunan, sehingga berkas yang salah tidak sempat naik ke Kecamatan.

### B. Tampilan Camat & Dinsos - *Role: Verifikator*
*   **Prinsip UX:** Menyajikan *checklist* (daftar centang) kepatuhan dokumen hukum.
*   **Implementasi:** 
    *   Bukan sekadar tombol "Setuju/Tolak", antarmuka menampilkan kotak centang validasi:
        *   `[ ]` Kuitansi nominal tidak melebihi 1/12 batas ADD.
        *   `[ ]` Lampiran SPTJM tersedia (Syarat mutlak PMK).
        *   `[ ]` Laporan penggunaan bulan lalu lengkap.
    *   Sistem memberi peringatan warna **kuning/merah** jika hasil pindai (OCR) mendeteksi ada dokumen lampiran yang kurang.

### C. Tampilan BAKEUDA (Operator) - *Role: Eksekutor*
*   **Prinsip UX:** Otomatisasi angka dan kepastian *compliance* (kepatuhan).
*   **Implementasi:**
    *   Sistem menampilkan perbandingan ganda (*Side-by-side view*). Kiri: Dokumen Kuitansi Fisik dari OCR. Kanan: Tabel Kalkulasi Regulasi (Pagu Bruto - 4% BPJS = Netto).
    *   Bakeuda dapat melihat histori *"Audit Trail"*: Siapa saja yang sudah memverifikasi dokumen ini di tingkat bawah.

---

## 3. Pusat Bantuan Hukum Terintegrasi (*Knowledge Base Module*)
*   Pada *sidebar* navigasi semua *role*, ditambahkan menu **"Pusat Regulasi (RegDB)"**.
*   Menu ini menampilkan rincian SK Bupati, Perbup, dan PMK dalam format teks digital (seperti file *markdown* yang kita temukan) yang memiliki fitur "Cari Pasal". 
*   Ketika Staf Desa bingung mengapa pengajuannya ditolak sistem, mereka bisa mengklik tautan error yang langsung mengarahkan ke pasal terkait di menu Pusat Regulasi.
