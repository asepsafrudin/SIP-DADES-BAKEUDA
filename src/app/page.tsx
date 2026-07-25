'use client';

import { useEffect, useState } from "react";
import { databases } from "@/lib/appwrite";
import ScannerModule from "@/components/ScannerModule";

export default function Home() {
  const [status, setStatus] = useState<string>("Connecting to Appwrite...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fungsi ini bertindak sebagai "client.ping()" untuk memvalidasi koneksi
    // Dengan mencoba mengambil daftar dokumen dari koleksi master_desa
    const pingAppwrite = async () => {
      try {
        await databases.listDocuments('sipdades_db', 'master_desa');
        setStatus("✅ Koneksi Appwrite Berhasil! Database & Koleksi Aktif.");
      } catch (err: any) {
        setError(err.message || "Gagal menghubungi Appwrite.");
        setStatus("❌ Koneksi Gagal.");
      }
    };

    pingAppwrite();
  }, []);

  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-zinc-50 font-sans dark:bg-black p-8">
      <main className="flex flex-col items-center gap-8 bg-white dark:bg-zinc-900 p-12 rounded-2xl shadow-xl">
        <h1 className="text-4xl font-bold tracking-tight text-center">
          SIP-DADES BAKEUDA
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 text-center max-w-md">
          Sistem Informasi Pengelolaan Dana Desa dan Bantuan Keuangan Kabupaten Purbalingga
        </p>

        <div className={`mt-8 p-4 rounded-lg w-full text-center font-medium ${
          error ? 'bg-red-100 text-red-800' : 
          status.includes('Berhasil') ? 'bg-green-100 text-green-800' : 
          'bg-blue-100 text-blue-800'
        }`}>
          {status}
        </div>

        {error && (
          <p className="text-sm text-red-600 mt-2">
            Detail: {error}
          </p>
        )}

        <div className="flex gap-4 mt-2">
          <a href="/kuitansi" className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow hover:bg-indigo-700 transition-colors">
            🖨️ Buka Modul Cetak Kuitansi
          </a>
        </div>

        {/* Modul Scanner AI OCR */}
        <ScannerModule />
      </main>
    </div>
  );
}
