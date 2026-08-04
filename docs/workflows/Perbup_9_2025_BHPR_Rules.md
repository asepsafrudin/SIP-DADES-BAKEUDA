# Analisis & Logika Bisnis: Perbup No. 9 Tahun 2025 (Regulasi Induk BHPR)

**Peraturan Bupati Purbalingga Nomor 9 Tahun 2025**  
*Tentang Tata Cara Bagi Hasil Pajak Daerah dan Retribusi Daerah Kepada Desa di Kabupaten Purbalingga*  
*(Ditetapkan: 2 Januari 2025)*

---

## 1. Skema Pengalokasian (Lampiran Perbup 9/2025)

Pengalokasian Bagi Hasil Pajak dan Retribusi (BHPR) per Desa menggunakan formula:
$$\text{BHPR per Desa} = \text{Alokasi Dasar (AD)} + \text{Alokasi Proporsional (AP)}$$

### A. Alokasi Dasar (AD) — 60% (Merata)
*   Sebesar **60%** dari total Pagu BHPR Kabupaten dibagi secara **sama rata** kepada seluruh desa (224 desa).
*   $$\text{AD Pajak} = \frac{60\% \times \text{Pagu Bagi Hasil Pajak}}{224}$$
*   $$\text{AD Retribusi} = \frac{60\% \times \text{Pagu Bagi Hasil Retribusi}}{224}$$

### B. Alokasi Proporsional (AP) — 40% (Kinerja Kontribusi)
*   Sebesar **40%** dari total Pagu BHPR Kabupaten dibagi berdasarkan besarnya kontribusi realisasi pajak/retribusi dari desa tersebut.
*   $$\text{AP Pajak} = 40\% \times \text{Pagu Pajak} \times \frac{\text{Realisasi Pajak Desa}}{\text{Total Realisasi Pajak Kabupaten}}$$
*   **Batas Kesenjangan (Cap Limit):** Untuk mencegah ketimpangan ekstrem antar desa, kontribusi desa dibatasi maksimal **2%** (Pajak) dan maksimal **3%** (Retribusi).

---

## 2. Syarat & Tahapan Penyaluran (Pasal 8 & 9)

Penyaluran dana BHPR dilakukan dari RKUD ke RKD dalam 2 Tahap:

| Tahap | Persentase | Waktu Penyaluran | Syarat Mutlak Pencairan |
|---|---|---|---|
| **Tahap I** | **60%** | Paling cepat bulan **Mei** | Surat Permohonan Kades + Kuitansi Tahap I + Rekening Kas Desa |
| **Tahap II** | **40% (Sisa)** | Paling cepat **Agustus**, max **Desember M1** | **Setoran PBB-P2 Desa Wajib Lunas 100%** (Diverifikasi oleh Bakeuda) |

> [!WARNING]
> **Aturan Penundaan (Pasal 8 ayat 6):**
> Jika hingga batas akhir Tahap II setoran PBB-P2 desa **belum mencapai 100%**, maka penyaluran sisa dana BHPR 40% **DITUNDA** sampai PBB-P2 lunas.
> Jika tidak cair hingga akhir tahun anggaran akibat kelalaian desa, dana tetap di RKUD dan menjadi SiLPA Kabupaten.

---

## 3. Kewajiban Penggunaan di APB Desa (Pasal 7)

*   **Optimalisasi Pajak (Perbup 9/2025):** Minimal **10%** dari BHPR wajib dialokasikan di APB Desa untuk intensifikasi/ekstensifikasi pajak & retribusi (kegiatan sosialisasi, monitoring, evaluasi, dan bantuan transportasi pemungut).
*   *(Catatan Evolusi Regulasi: Pada Perbup No. 5 Tahun 2026, angka 10% ini dinaikkan menjadi **20%**).*
*   **Setoran Pajak Desa:** Pemerintah Desa wajib menyetorkan kewajiban pembayaran pajak yang menjadi tanggung jawab desa melalui bendahara desa.

---

## 4. Implikasi pada Workflow & UI Aplikasi SIP-DADES

1.  **Validasi Otomatis Tahap II (Bakeuda Dashboard):**
    *   Saat operator memproses pengajuan BHPR Tahap II (40%), sistem SIP-DADES wajib melakukan *query* ke data pelunasan PBB-P2.
    *   Jika status PBB-P2 `< 100%`, sistem otomatis mengunci status menjadi `DITUNDA_BHPR` dan menampilkan persentase pelunasan (misal: "Baru 87% Lunas — Pencairan Ditunda").
2.  **Kalkulator Otomatis AD & AP:**
    *   Sistem menyedot data realisasi PBB-P2 dari Bakeuda dan otomatis menghitung porsi 60% (AD) + 40% (AP) dengan batas cap 2% dan 3%.
