# SIP-DADES-BAKEUDA

Sistem Informasi Pengelolaan Dana Desa dan Bantuan Keuangan (SIP-DADES) untuk Badan Keuangan Daerah (Bakeuda) Kabupaten Purbalingga. 

Aplikasi web ini dibangun untuk mengotomatisasi dan mendigitalkan proses pencairan Alokasi Dana Desa (ADD) dan Bantuan Keuangan Khusus (BKK) yang sebelumnya dilakukan secara manual menggunakan Excel, kini terintegrasi dengan kecerdasan buatan (AI) untuk ekstraksi dokumen.

## Arsitektur Sistem

Sistem ini dirancang dengan pendekatan modern dan efisien biaya:

- **Frontend & Backend**: [Next.js 14](https://nextjs.org/) (App Router) + Tailwind CSS
- **Database & Autentikasi**: [Appwrite](https://appwrite.io/) (Backend-as-a-Service)
- **AI OCR Engine**: GPU Serverless di [RunPod](https://runpod.io/) menjalankan **EasyOCR** untuk membaca hasil scan rekomendasi fisik (PDF/Gambar) dari Dinsospermasdes.

## Persyaratan Lingkungan (Environment)

Buat file `.env` di *root* proyek dan pastikan memuat kredensial berikut:

```env
# Konfigurasi Appwrite
NEXT_PUBLIC_APPWRITE_ENDPOINT="https://sgp.cloud.appwrite.io/v1"
NEXT_PUBLIC_APPWRITE_PROJECT_ID="your_project_id"
NEXT_PUBLIC_APPWRITE_PROJECT_NAME="SIP-DADES-BAKEUDA"
APPWRITE_API_KEY="your_secret_api_key"

# Konfigurasi OCR RunPod Serverless
RUNPOD_API_KEY="your_runpod_api_key"
RUNPOD_ENDPOINT_ID="your_endpoint_id"
```

## Memulai Aplikasi (Local Development)

Pastikan Node.js sudah terinstal, lalu jalankan perintah berikut:

```bash
# Instalasi dependensi
npm install

# Jalankan development server (berjalan di port 3005)
npm run dev -- -p 3005
```

Buka [http://localhost:3005](http://localhost:3005) pada browser Anda untuk mengakses aplikasi.

## Struktur Direktori Utama

- `/src/app` - Komponen Frontend UI (React) dan routing aplikasi.
- `/src/app/api` - Next.js Route Handlers (Backend API) untuk komunikasi dengan Appwrite & OCR.
- `/scripts` - Skrip utilitas (seperti inisialisasi/setup skema database Appwrite).
- `ROADMAP.md` - Peta jalan (*roadmap*) pengembangan proyek dan SOP alur kerja.

## Alur Kerja Utama (Workflow)

1. Staf pelaksana menerima dokumen fisik Rekomendasi Pencairan.
2. Staf memindai (scan) dokumen dan mengunggahnya ke aplikasi.
3. Mesin AI OCR (*RunPod*) secara otomatis membaca teks (Nama Desa, Kegiatan, Nominal) dan memformatnya menjadi JSON terstruktur (TMMD Format).
4. Aplikasi akan melakukan *auto-fill* form Draft Transaksi pencairan.
5. Proses verifikasi oleh Kepala Sub. Bidang & Kepala Bidang.
6. Pencetakan SPP dan Kuitansi otomatis dengan nominal *terbilang*.
