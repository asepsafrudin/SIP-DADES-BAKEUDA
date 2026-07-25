'use client';

import { useState, useEffect } from 'react';
import { databases } from '@/lib/appwrite';

interface ExtractedData {
  nama_desa: string;
  kegiatan: string;
  nominal: number;
  no_rekening: string;
}

export default function ScannerModule() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusText, setStatusText] = useState('Mulai Ekstrak');
  const [results, setResults] = useState<ExtractedData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [noSurat, setNoSurat] = useState<string>('');

  const [sumberDanaList, setSumberDanaList] = useState<{id: string, nama: string}[]>([]);
  const [selectedSumberDana, setSelectedSumberDana] = useState('');
  const [tahun, setTahun] = useState('2026');
  const [saveReport, setSaveReport] = useState<{saved: number, failed: number, errors: any[]} | null>(null);

  useEffect(() => {
    const fetchSumberDana = async () => {
      try {
        const res = await databases.listDocuments('sipdades_db', 'master_sumber_dana');
        setSumberDanaList(res.documents.map(d => ({ id: d.$id, nama: d.nama_sumber })));
        if (res.documents.length > 0) setSelectedSumberDana(res.documents[0].$id);
      } catch (e) {
        console.error("Gagal load sumber dana", e);
      }
    };
    fetchSumberDana();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const convertPdfToImages = async (pdfFile: File): Promise<string[]> => {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const images: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) continue;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      images.push(canvas.toDataURL('image/jpeg', 0.8));
    }
    return images;
  };

  const convertImageToBase64 = (imageFile: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(imageFile);
    });
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setSaveReport(null);

    try {
      let imagesToUpload: string[] = [];

      if (file.type === 'application/pdf') {
        setStatusText('Mengonversi PDF ke Gambar...');
        imagesToUpload = await convertPdfToImages(file);
      } else if (file.type.startsWith('image/')) {
        setStatusText('Memproses Gambar...');
        const base64 = await convertImageToBase64(file);
        imagesToUpload = [base64];
      } else {
        throw new Error('Tipe file tidak didukung. Harap unggah PDF atau Gambar.');
      }

      setStatusText('AI Sedang Membaca...');

      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: imagesToUpload }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal memproses dokumen');
      
      setResults(data.data);

      // Auto-Select Sumber Dana & Tahun dari Metadata AI
      if (data.metadata_tahun_anggaran) {
        setTahun(data.metadata_tahun_anggaran);
      }
      if (data.metadata_no_surat) {
        setNoSurat(data.metadata_no_surat);
      }
      if (data.metadata_sumber_dana) {
        // Coba cari kecocokan (Fuzzy Search ringan) dengan daftar Sumber Dana dari Appwrite
        const keyword = data.metadata_sumber_dana.toLowerCase();
        const matched = sumberDanaList.find(s => s.nama.toLowerCase().includes(keyword) || keyword.includes(s.nama.toLowerCase()));
        if (matched) {
          setSelectedSumberDana(matched.id);
        }
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setStatusText('Mulai Ekstrak');
    }
  };

  const handleSaveToAppwrite = async () => {
    if (!selectedSumberDana) {
      setError('Pilih Sumber Dana terlebih dahulu');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          data: results, 
          sumber_dana: selectedSumberDana, 
          tahun: tahun,
          no_surat: noSurat
        }),
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Gagal menyimpan ke database');
      
      setSaveReport(resData);
      
      // Partial Save Smart Filter:
      // Hanya sisakan data yang gagal di tabel agar bisa diperbaiki dan di-save ulang
      if (resData.errors && resData.errors.length > 0) {
        const failedNames = resData.errors.map((e: any) => e.nama_desa);
        setResults(prev => prev.filter(r => failedNames.includes(r.nama_desa)));
      } else {
        // Jika sukses semua, kosongkan tabel
        setResults([]);
      }
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditRow = (index: number, field: string, value: string) => {
    setResults(prev => {
      const newData = [...prev];
      newData[index] = { ...newData[index], [field]: value };
      return newData;
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl mt-8 border border-zinc-200 dark:border-zinc-800">
      <h2 className="text-2xl font-semibold mb-4 text-center">AI OCR Scanner (OpenAI Vision)</h2>
      
      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
        <input 
          type="file" 
          accept="application/pdf,image/*" 
          onChange={handleFileChange}
          className="mb-4 text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {file && <p className="text-sm font-medium mb-4 text-green-600">Dokumen terpilih: {file.name}</p>}
        
        <button
          onClick={handleUpload}
          disabled={!file || loading || saving}
          className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-full disabled:opacity-50 hover:opacity-80 transition-opacity"
        >
          {statusText}
        </button>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-100 text-red-800 rounded-lg text-sm font-medium text-center">
          {error}
        </div>
      )}

      {saveReport && (
        <div className="mt-6 p-4 bg-green-100 border border-green-300 text-green-900 rounded-lg">
          <h4 className="font-semibold mb-2">Laporan Penyimpanan Database</h4>
          <p>✅ Berhasil disimpan: {saveReport.saved} desa</p>
          <p>❌ Gagal disimpan: {saveReport.failed} desa</p>
          
          {saveReport.errors.length > 0 && (
            <div className="mt-2 text-sm">
              <p className="mb-2 font-medium text-red-800">Silakan koreksi ejaan desa di bawah ini langsung pada tabel, lalu tekan simpan kembali:</p>
              <ul className="text-xs text-red-700 list-disc list-inside bg-white/50 p-2 rounded">
                {saveReport.errors.map((err: any, i: number) => (
                  <li key={i}>{err.nama_desa}: {err.reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-8">
          <div className="flex flex-col md:flex-row gap-4 mb-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
            <div className="flex-1">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Pilih Sumber Dana</label>
              <select 
                value={selectedSumberDana} 
                onChange={e => setSelectedSumberDana(e.target.value)}
                className="w-full p-2 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 text-sm"
              >
                {sumberDanaList.map(s => (
                  <option key={s.id} value={s.id}>{s.nama}</option>
                ))}
              </select>
            </div>
            <div className="w-48">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Nomor Surat Pengantar</label>
              <input 
                type="text" 
                value={noSurat} 
                onChange={e => setNoSurat(e.target.value)}
                placeholder="Contoh: 900/123/2026"
                className="w-full p-2 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 text-sm"
              />
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Tahun Anggaran</label>
              <input 
                type="number" 
                value={tahun} 
                onChange={e => setTahun(e.target.value)}
                className="w-full p-2 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 text-sm"
              />
            </div>
          </div>

          <h3 className="text-lg font-semibold mb-4">Hasil Ekstraksi ({results.length} Desa)</h3>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700 mb-6">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700 text-sm text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Nama Desa</th>
                  <th className="px-4 py-3 font-medium">Kegiatan</th>
                  <th className="px-4 py-3 font-medium">Nominal</th>
                  <th className="px-4 py-3 font-medium">No Rekening</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700 bg-white dark:bg-zinc-900">
                {results.map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-2 py-2 font-medium">
                      <input 
                        type="text"
                        value={row.nama_desa}
                        onChange={(e) => handleEditRow(i, 'nama_desa', e.target.value)}
                        title="Klik untuk mengedit secara manual jika ada salah ketik"
                        className="w-full bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-blue-500 focus:outline-none focus:bg-white dark:focus:bg-zinc-800 px-2 py-1 transition-colors"
                      />
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{row.kegiatan}</td>
                    <td className="px-4 py-3 font-semibold text-green-600">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(row.nominal)}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 font-mono">{row.no_rekening}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button 
            onClick={handleSaveToAppwrite}
            disabled={saving || !selectedSumberDana}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Sedang Menyimpan ke Database...' : 'Konfirmasi & Simpan Transaksi ke Appwrite'}
          </button>
        </div>
      )}
    </div>
  );
}
