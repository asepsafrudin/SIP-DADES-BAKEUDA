'use client';

import React, { useState, useEffect } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';

interface BhprRow {
  id: string;
  desa: string;
  kecamatan: string;
  no_rek: string;
  pagu_total: number;
  nominal_tahap_1: number;
  status_verifikasi: string;
}

export default function BhprPage() {
  const [data, setData] = useState<BhprRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [scanResult, setScanResult] = useState<any | null>(null);

  const fetchBhprData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bhpr');
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
    fetchBhprData();
  }, []);

  const handleUploadScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    try {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/bhpr', {
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
      alert('❌ Gagal memproses file BHPR.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const totalNominalTahap1 = data.reduce((s, r) => s + r.nominal_tahap_1, 0);

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Bagi Hasil Pajak & Retribusi (BHPR)
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Penyaluran BHPR Tahap I (60%) & Tahap II (40%) — Perbup No. 5/2026 jo Perbup No. 9/2025
            </p>
          </div>

          <label className="cursor-pointer px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-semibold shadow-lg shadow-amber-500/20 transition-all hover:-translate-y-0.5 inline-flex items-center gap-2">
            {isUploading ? '📤 Menganalisis Dokumen Scan...' : '📄 Scan Surat Permohonan BHPR (OCR)'}
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
          <div className="card p-5 border-l-4 border-l-amber-500 bg-amber-50/50 animate-slide-up">
            <div className="flex justify-between items-start">
              <div>
                <span className="badge badge-warning mb-1">OCR Ekstraksi Sukses</span>
                <h3 className="font-bold text-base text-[var(--text-primary)]">
                  {scanResult.perihal}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Surat Camat No. <code className="font-mono">{scanResult.nomor_surat}</code> • Tanggal: {scanResult.tanggal_surat} • Kecamatan: <strong>{scanResult.kecamatan}</strong>
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-[var(--text-muted)]">Total Pengajuan Tahap I</span>
                <p className="text-lg font-bold text-amber-700">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(scanResult.total_nominal)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Regulation Rule Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="card p-6 border-l-4 border-l-amber-500">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">Penyaluran Tahap I (60%)</p>
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">60% Pagu</h3>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Disalurkan paling cepat bulan Mei berdasarkan Surat Permohonan Camat + Kuitansi (Pasal 8 Perbup 9/2025).
            </p>
          </div>
          <div className="card p-6 border-l-4 border-l-emerald-500">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">Penyaluran Tahap II (40%)</p>
            <h3 className="text-2xl font-bold text-[var(--text-primary)]">PBB-P2 100% Lunas</h3>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Syarat mutlak Tahap II: Setoran PBB-P2 desa wajib 100% lunas. Jika belum lunas, penyaluran ditunda.
            </p>
          </div>
        </div>

        {/* BHPR Table */}
        <div className="card overflow-hidden">
          <div className="px-6 py-5 border-b border-[var(--surface-3)] flex justify-between items-center">
            <div>
              <h2 className="font-bold text-base text-[var(--text-primary)]">
                Daftar Permohonan Penyaluran BHPR ({data.length} Desa)
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Kecamatan Kertanegara • Tahun Anggaran 2026
              </p>
            </div>
            <span className="font-bold text-sm text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg">
              Total Tahap I: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalNominalTahap1)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-premium">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Desa</th>
                  <th>No. Rekening Bank Jateng</th>
                  <th>Pagu Total (Rp)</th>
                  <th>Pencairan Tahap I 60% (Rp)</th>
                  <th>Status</th>
                  <th className="text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-[var(--text-muted)]">
                      Memuat data BHPR...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-[var(--text-muted)]">
                      Belum ada permohonan. Klik "Scan Surat Permohonan BHPR (OCR)" untuk mengunggah PDF scan Camat.
                    </td>
                  </tr>
                ) : (
                  data.map((row, idx) => (
                    <tr key={row.id}>
                      <td className="font-mono text-xs">{idx + 1}</td>
                      <td className="font-semibold text-[var(--text-primary)]">{row.desa}</td>
                      <td className="font-mono text-xs text-[var(--text-secondary)]">{row.no_rek}</td>
                      <td>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(row.pagu_total)}</td>
                      <td className="font-semibold text-amber-600">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(row.nominal_tahap_1)}
                      </td>
                      <td><span className="badge badge-success">{row.status_verifikasi}</span></td>
                      <td className="text-center">
                        <button
                          onClick={() => window.open(`/api/print/generate-spm?desa=${encodeURIComponent(row.desa)}&bulan=Tahap+I+2026&nominal=${row.nominal_tahap_1}`, '_blank')}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold text-xs rounded-lg transition-colors"
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
