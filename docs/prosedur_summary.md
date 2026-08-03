# Rangkuman Prosedur Pengelolaan Dana (ADD & BKK) 2026

Berdasarkan dokumen Peraturan Bupati (Perbup) dan Surat Keputusan (SK) Bupati Kabupaten Purbalingga Tahun 2026, berikut adalah intisari prosedur pencairan dan pengelolaan dana desa yang akan diotomatisasi dalam **SIP-DADES-BAKEUDA**:

## 1. Alokasi Dana Desa (ADD)
**Dasar:** Perbup ADD No 1 Tahun 2026

* **Struktur Pembagian:** Terdiri dari Alokasi Dasar Minimal (ADDM = 70%) dan Proporsional (ADDP = 30%) berdasarkan penduduk, kemiskinan, luas wilayah, dan IKG.
* **Mekanisme Penyaluran:**
  * Penyaluran dilakukan **setiap bulan** (paling tinggi 1/12 dari pagu tahun berjalan).
  * **Alur Persetujuan:** Kepala Desa ➔ Verifikasi Camat ➔ Rekomendasi DINSOSPERMASDESP3A ➔ Pencairan oleh BAKEUDA (dari Rekening Kas Daerah / RKUD ke Rekening Kas Desa / RKD).
  * **Potongan Langsung:** Premi BPJS Kesehatan untuk Kepala Desa dan Perangkat Desa dipotong otomatis oleh BAKEUDA saat penyaluran (biasanya di bulan Januari).
* **Dokumen Syarat Penyaluran (Target OCR / Verifikasi):**
  * Surat Pengantar & Surat Pernyataan Tanggung Jawab Mutlak (SPTJM).
  * Kuitansi Pembayaran bulan sebelumnya.
  * Rekomendasi Camat & Daftar Rekapitulasi Permohonan.
  * Laporan Realisasi/Penggunaan ADD.

## 2. Bantuan Keuangan Khusus (BKK)
**Dasar:** SK Bupati No 900/113 Tahun 2026

* **Kategori Penyaluran:** 
  1. **Sarana & Prasarana Desa** (Pembangunan jalan, balai desa, LPJU, dll) dengan nominal bervariasi per desa.
  2. **Bantuan Penyelenggaraan PILKADES** (Total Rp 6,65 M).
  3. **TMMD (TNI Manunggal Membangun Desa)** (Total Rp 2,18 M).
* **Workflow Integrasi:** Pencairan BKK bersifat *"termin"* (Tahap 1, Tahap 2, dst) sesuai spesifikasi proyek di desa, bukan bulanan seperti ADD. Hal ini membenarkan keputusan skema database kita (Atribut `jenis_dana` & `tahap_ke` di tabel `transaksi_pencairan`).

## 3. Bagi Hasil Pajak & Retribusi (BHPR)
**Dasar:** Perbup No 5 Tahun 2026 (Perubahan Perbup No 9/2025)

* **Kewajiban Desa:** Minimal 20% dari dana BHPR wajib dianggarkan untuk kegiatan optimalisasi penerimaan pajak (sosialisasi, operasional, dll).
* **Reward/Penghargaan:** Tersedia insentif (uang/barang senilai 10% dari Pagu PBB P2) untuk Petugas Pemungut Tingkat Desa yang paling cepat melunasi pajak sebelum jatuh tempo.
* **Sanksi Penundaan:** BAKEUDA berhak melakukan **penundaan pencairan BHPR** jika pemerintah desa tidak menyetorkan kewajiban pajaknya.

## 4. Implikasi pada Sistem SIP-DADES-BAKEUDA
1. **Validasi Kuitansi (Modul Kuitansi):** Nominal kuitansi ADD bulan Januari harus bisa mengakomodasi "Potongan BPJS Kesehatan".
2. **Kategorisasi BKK (Modul Pagu):** Pagu BKK harus di- *mapping* secara detil apakah itu BKK Sarpras, BKK Pilkades, atau BKK TMMD (sesuai dokumen SK Bupati).
3. **Syarat Dokumen (Modul OCR):** File PDF yang diunggah staf pelaksana (yang akan dibaca RunPod/EasyOCR) harus divalidasi keutuhannya, memastikan dokumen seperti Surat Pengantar, Rekomendasi Camat, dan SPTJM terlampir dan terbaca datanya.
