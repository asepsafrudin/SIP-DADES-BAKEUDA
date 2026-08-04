'use client';

import React, { useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';

const templateTypes = [
  {
    id: 'add',
    name: 'Template ADD',
    description: 'Alokasi Dana Desa — ADDM (70%) & ADDP (30%)',
    icon: '🏘️',
    color: 'bg-indigo-500',
    fields: ['pagu_total', 'pagu_dasar_addm', 'pagu_proporsional_addp', 'pagu_siltap_jaminan'],
  },
  {
    id: 'bhpr',
    name: 'Template BHPR',
    description: 'Bagi Hasil Pajak & Retribusi — pagu_pbb_p2',
    icon: '💰',
    color: 'bg-amber-500',
    fields: ['pagu_bhpr', 'pagu_pbb_p2', 'alokasi_pajak', 'reward_petugas'],
  },
  {
    id: 'bkk',
    name: 'Template BKK',
    description: 'Bantuan Keuangan Khusus Sarpras — per termin',
    icon: '🏗️',
    color: 'bg-emerald-500',
    fields: ['pagu_bkk', 'termin_1', 'termin_2', 'termin_3'],
  },
  {
    id: 'bpjs',
    name: 'Template BPJS',
    description: 'Iuran JKN-KIS Perangkat Desa — 1% & 4%',
    icon: '🏥',
    color: 'bg-rose-500',
    fields: ['nama_perangkat', 'jabatan', 'iuran_4_persen', 'iuran_1_persen'],
  },
];

type UploadState = 'idle' | 'uploading' | 'validating' | 'staging' | 'submitted';

export default function DataIngestionPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');

  const handleFileUpload = () => {
    setUploadState('uploading');
    setTimeout(() => setUploadState('validating'), 1500);
    setTimeout(() => setUploadState('staging'), 3000);
  };

  const stateLabels: Record<UploadState, { text: string; color: string }> = {
    idle: { text: 'Menunggu file...', color: 'text-[var(--text-muted)]' },
    uploading: { text: '📤 Mengunggah file...', color: 'text-indigo-600' },
    validating: { text: '🔍 Memvalidasi data terhadap regulasi...', color: 'text-amber-600' },
    staging: { text: '✅ Validasi selesai — Siap diajukan', color: 'text-emerald-600' },
    submitted: { text: '📩 Draf telah diajukan ke Super Admin', color: 'text-violet-600' },
  };

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            Upload Master Data
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Import data pagu tahunan menggunakan Smart Template Excel — Maker/Checker Workflow
          </p>
        </div>

        {/* Step 1: Pilih Template */}
        <div>
          <h2 className="font-bold text-sm text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center">1</span>
            Pilih & Unduh Template
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 stagger-children">
            {templateTypes.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => setSelectedTemplate(tmpl.id)}
                className={`card p-5 text-left transition-all duration-200 hover:-translate-y-0.5 ${
                  selectedTemplate === tmpl.id
                    ? 'ring-2 ring-indigo-500 shadow-lg'
                    : ''
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl ${tmpl.color} flex items-center justify-center text-lg`}>
                    {tmpl.icon}
                  </div>
                  <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                    {tmpl.name}
                  </h3>
                </div>
                <p className="text-xs text-[var(--text-muted)]">{tmpl.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {tmpl.fields.map((f) => (
                    <span key={f} className="text-[10px] bg-[var(--surface-2)] text-[var(--text-muted)] px-2 py-0.5 rounded-full font-mono">
                      {f}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
          {selectedTemplate && (
            <button className="mt-4 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5">
              ⬇️ Unduh Template {templateTypes.find(t => t.id === selectedTemplate)?.name}.xlsx
            </button>
          )}
        </div>

        {/* Step 2: Upload */}
        <div>
          <h2 className="font-bold text-sm text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center">2</span>
            Unggah File yang Sudah Diisi
          </h2>
          <div className="card p-8">
            <label
              className="flex flex-col items-center justify-center border-2 border-dashed border-[var(--surface-3)] rounded-2xl p-10 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all duration-300 group"
            >
              <svg className="w-12 h-12 text-[var(--text-muted)] group-hover:text-indigo-500 transition-colors mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-sm font-medium text-[var(--text-secondary)] group-hover:text-indigo-600 transition-colors">
                Klik atau seret file Excel ke sini
              </span>
              <span className="text-xs text-[var(--text-muted)] mt-1">
                Format: .xlsx atau .xls • Maks 10MB
              </span>
              <input type="file" accept=".xls,.xlsx" className="hidden" onChange={handleFileUpload} />
            </label>

            {uploadState !== 'idle' && (
              <div className={`mt-4 text-sm font-semibold ${stateLabels[uploadState].color} animate-slide-up`}>
                {stateLabels[uploadState].text}
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Staging Area (Preview) */}
        {uploadState === 'staging' && (
          <div className="animate-slide-up">
            <h2 className="font-bold text-sm text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold flex items-center justify-center">3</span>
              Staging Area — Pratinjau & Validasi
            </h2>
            <div className="card overflow-hidden">
              <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                <span className="badge badge-dot badge-success">224 / 224 baris valid</span>
                <span className="text-xs text-[var(--text-muted)]">• 0 error • 0 warning</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full table-premium">
                  <thead>
                    <tr>
                      <th>✓</th>
                      <th>Kode Desa</th>
                      <th>Nama Desa</th>
                      <th>Pagu Total</th>
                      <th>Validasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { kode: '3303012001', nama: 'Kedungbenda', pagu: 373456000 },
                      { kode: '3303012002', nama: 'Bokol', pagu: 307615000 },
                      { kode: '3303012003', nama: 'Pelumutan', pagu: 367799000 },
                    ].map((row) => (
                      <tr key={row.kode}>
                        <td>
                          <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                            <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </td>
                        <td className="font-mono text-xs">{row.kode}</td>
                        <td className="font-semibold text-[var(--text-primary)]">{row.nama}</td>
                        <td>
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(row.pagu)}
                        </td>
                        <td><span className="badge badge-success">Valid</span></td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={5} className="text-center text-xs text-[var(--text-muted)] py-3">
                        ... dan 221 baris lainnya
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 border-t border-[var(--surface-3)] flex justify-end gap-3">
                <button
                  onClick={() => setUploadState('idle')}
                  className="px-5 py-2.5 rounded-xl border border-[var(--surface-3)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={() => setUploadState('submitted')}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5"
                >
                  📩 Ajukan Draf ke Super Admin
                </button>
              </div>
            </div>
          </div>
        )}

        {uploadState === 'submitted' && (
          <div className="card p-8 text-center animate-slide-up">
            <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Draf Berhasil Diajukan!</h3>
            <p className="text-sm text-[var(--text-muted)] mt-2 max-w-md mx-auto">
              Super Admin akan menerima notifikasi untuk meninjau dan menyetujui data master ini sebelum disinkronisasi ke database utama.
            </p>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
