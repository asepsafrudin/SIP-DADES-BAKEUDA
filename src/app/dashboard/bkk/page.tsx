'use client';

import React, { useState, useEffect } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';

interface BkkRow {
  id: string;
  desa: string;
  kegiatan: string;
  nominal_rekomendasi: number;
  status_verifikasi: string;
}

export default function BkkPage() {
  const [data, setData] = useState<BkkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [scanResult, setScanResult] = useState<any | null>(null);

  const fetchBkkData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bkk');
      const json = await res.json();
      if (json.status === 'success') {
        setData(json.data);
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBkkData();
  }, []);

  const handleUploadScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    try {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/bkk', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();

      if (json.status === 'success') {
        setScanResult(json.metadata);
        setData(json.data);
        alert(`✅ ${json.message}`);
      }
    } catch {
      alert('❌ Gagal memproses file BKK Sarpras.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const totalNominal = data.reduce((s, r) => s + r.nominal_rekomendasi, 0);

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              BKK Sarpras
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Bantuan Keuangan Khusus Sarana & Prasarana — Perbup No. 2/2026 & SK Bupati No. 900/113
            </p>
          </div>

          <label className="cursor-pointer px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 inline-flex items-center gap-2">
            {isUploading ? '📤 Menganalisis Dokumen Scan...' : '📄 Scan Rekomendasi BKK Dinsos (OCR)'}
            <input
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={handleUploadScan}
              disabled={isUploading}
            />
          </label>
        </div>

        {/* Scan Metadata Result Alert */}
        {scanResult && (
          <div className="card p-5 border-l-4 border-l-emerald-500 bg-emerald-50/50 animate-slide-up">
            <div className="flex justify-between items-start">
              <div>
                <span className="badge badge-success mb-1">OCR Ekstraksi Sukses</span>
                <h3 className="font-bold text-base text-[var(--text-primary)]">
                  {scanResult.perihal}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Surat Dinsos No. <code className="font-mono">{scanResult.nomor_surat}</code> • Tanggal: {scanResult.tanggal_surat} • Pengirim: <strong>{scanResult.pengirim}</strong>
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-[var(--text-muted)]">Total 13 Kegiatan</span>
                <p className="text-lg font-bold text-emerald-700">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(scanResult.total_nominal)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* BKK Table */}
        <div className="card overflow-hidden">
          <div className="px-6 py-5 border-b border-[var(--surface-3)] flex justify-between items-center">
            <div>
              <h2 className="font-bold text-base text-[var(--text-primary)]">
                Daftar Pengajuan BKK Sarpras ({data.length} Kegiatan)
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Rekomendasi Penyaluran Dinsospermasdes • TA 2026
              </p>
            </div>
            <span className="font-bold text-sm text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
              Total Nominal: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalNominal)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-premium">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Desa</th>
                  <th>Jenis Kegiatan Sarpras</th>
                  <th>Nominal Rekomendasi (Rp)</th>
                  <th>Status</th>
                  <th className="text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-[var(--text-muted)]">
                      Memuat data BKK...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-[var(--text-muted)]">
                      Belum ada data pengajuan BKK. Klik "Scan Rekomendasi BKK Dinsos (OCR)" untuk mengunggah PDF scan Dinsos.
                    </td>
                  </tr>
                ) : (
                  data.map((row, idx) => (
                    <tr key={row.id}>
                      <td className="font-mono text-xs">{idx + 1}</td>
                      <td className="font-semibold text-[var(--text-primary)]">{row.desa}</td>
                      <td className="text-xs text-[var(--text-secondary)]">{row.kegiatan}</td>
                      <td className="font-semibold text-emerald-600">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(row.nominal_rekomendasi)}
                      </td>
                      <td><span className="badge badge-success">{row.status_verifikasi}</span></td>
                      <td className="text-center">
                        <button
                          onClick={() => window.open(`/api/print/generate-spm?desa=${encodeURIComponent(row.desa)}&bulan=BKK+Sarpras+2026&nominal=${row.nominal_rekomendasi}`, '_blank')}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-semibold text-xs rounded-lg transition-colors"
                        >
                          🖨️ Cetak SPP
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
