'use client';

import React from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';

const regulasiList = [
  {
    nama: 'PMK No. 7 Tahun 2026',
    tentang: 'Pengelolaan Dana Desa Tahun Anggaran 2026',
    ditetapkan: '13 Februari 2026',
    sumber: 'Kementerian Keuangan RI',
    status: 'Berlaku',
    params: [
      { key: 'Halaman', value: '2.003 halaman (termasuk lampiran rincian seluruh desa)' },
    ],
  },
  {
    nama: 'Perbup ADD No. 1 Tahun 2026',
    tentang: 'Tata Cara Pengalokasian, Penyaluran, Penggunaan, dan Pertanggungjawaban ADD',
    ditetapkan: '2 Januari 2026',
    sumber: 'Bupati Purbalingga',
    status: 'Berlaku',
    params: [
      { key: 'ADDM (Merata)', value: '70% dari total ADD Kabupaten' },
      { key: 'ADDP (Proporsional)', value: '30% dari total ADD Kabupaten' },
      { key: 'Limit Pencairan Bulanan', value: '1/12 pagu tahunan (Pasal 21)' },
    ],
  },
  {
    nama: 'Perbup No. 9 Tahun 2025 (Induk BHPR)',
    tentang: 'Tata Cara Bagi Hasil Pajak Daerah dan Retribusi Daerah Kepada Desa',
    ditetapkan: '2 Januari 2025',
    sumber: 'Bupati Purbalingga',
    status: 'Berlaku (Induk)',
    params: [
      { key: 'Alokasi Dasar (AD)', value: '60% dibagi merata ke 224 desa' },
      { key: 'Alokasi Proporsional (AP)', value: '40% berbasis kinerja kontribusi' },
      { key: 'Cap Limit Kontribusi', value: 'Maksimal 2% (Pajak) & 3% (Retribusi)' },
      { key: 'Syarat Tahap II (40%)', value: 'Setoran PBB-P2 Wajib 100% Lunas' },
    ],
  },
  {
    nama: 'Perbup No. 5 Tahun 2026 (Perubahan BHPR)',
    tentang: 'Perubahan Perbup No. 9 tentang Tata Cara BHPR Kepada Desa',
    ditetapkan: '5 Januari 2026',
    sumber: 'Bupati Purbalingga',
    status: 'Berlaku',
    params: [
      { key: 'Min. Alokasi Pajak', value: '20% dari pagu BHPR (Naik dari 10%)' },
      { key: 'Maks. Reward Petugas', value: '10% dari pagu PBB-P2 desa' },
    ],
  },
  {
    nama: 'SK Bupati BHPR TA 2026',
    tentang: 'Penetapan Besaran Alokasi Bagi Hasil Pajak dan Retribusi Daerah Kepada Desa',
    ditetapkan: '2026',
    sumber: 'Bupati Purbalingga',
    status: 'Berlaku Operasional',
    params: [
      { key: 'Fungsi', value: 'Dasar hukum nominal rupiah riil per desa di database' },
      { key: 'Cakupan', value: '224 Desa se-Kabupaten Purbalingga' },
    ],
  },
  {
    nama: 'SK Bupati No. 900/113 TA 2026',
    tentang: 'Penetapan Alokasi Bantuan Keuangan Khusus (BKK) Kepada Desa',
    ditetapkan: '2026',
    sumber: 'Bupati Purbalingga',
    status: 'Berlaku Operasional',
    params: [
      { key: 'Fungsi', value: 'Dasar hukum penyaluran BKK Sarpras per termin' },
    ],
  },
  {
    nama: 'SK Bupati TMMD TA 2026',
    tentang: 'Penetapan Alokasi Bantuan Keuangan TMMD Kepada Desa Sasaran',
    ditetapkan: '2026',
    sumber: 'Bupati Purbalingga',
    status: 'Berlaku Operasional',
    params: [
      { key: 'Fungsi', value: 'Dasar hukum alokasi program Tentara Manunggal Membangun Desa' },
    ],
  },
  {
    nama: 'Surat Tagihan BPJS Kesehatan',
    tentang: 'Kewajiban Iuran JKN-KIS Perangkat Desa',
    ditetapkan: 'Bulanan (Juli 2026)',
    sumber: 'BPJS Kesehatan Cabang Purbalingga',
    status: 'Berlaku',
    params: [
      { key: 'Iuran Pemda (ADD)', value: '4% dari gaji pokok' },
      { key: 'Iuran Pribadi', value: '1% dari gaji pokok' },
      { key: 'Bulan Potongan', value: 'Januari (dipotong otomatis dari pencairan ADD)' },
    ],
  },
];

export default function RegulasiPage() {
  const [isExtracting, setIsExtracting] = React.useState(false);
  const [extractMessage, setExtractMessage] = React.useState<string | null>(null);

  const handleRunAiExtractor = async () => {
    setIsExtracting(true);
    setExtractMessage(null);
    try {
      const res = await fetch('/api/regulasi/extract-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extracted_text: 'PERATURAN BUPATI PURBALINGGA NOMOR 1 TAHUN 2026',
          tahun_anggaran: 2026,
        }),
      });
      const json = await res.json();
      setExtractMessage(`✅ ${json.message}`);
    } catch {
      setExtractMessage('❌ Gagal menjalankan ekstraksi AI.');
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Pusat Regulasi
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Referensi peraturan yang mendasari logika bisnis aplikasi SIP-DADES — Tahun Anggaran 2026
            </p>
          </div>
          <button
            onClick={handleRunAiExtractor}
            disabled={isExtracting}
            className="self-start px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
          >
            {isExtracting ? '🤖 Memproses AI Ekstraksi...' : '🤖 Ekstrak & Terapkan Regulasi via AI'}
          </button>
        </div>

        {extractMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium animate-slide-up">
            {extractMessage}
          </div>
        )}

        {/* Info Banner */}
        <div className="card-glass p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Parameter Regulasi Bersifat Dinamis (Per Tahun Anggaran)
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Angka-angka di bawah ini (70%, 1/12, 20%, 10%) tersimpan di koleksi <code className="bg-[var(--surface-2)] px-1.5 py-0.5 rounded text-[11px] font-mono">master_regulasi</code> dan dapat diubah oleh Super Admin saat pergantian tahun anggaran tanpa perlu mengubah kode program.
            </p>
          </div>
        </div>

        {/* Regulation Cards */}
        <div className="space-y-5 stagger-children">
          {regulasiList.map((reg) => (
            <div key={reg.nama} className="card overflow-hidden">
              <div className="px-6 py-5 border-b border-[var(--surface-3)] flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-[var(--text-primary)]">{reg.nama}</h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-0.5">{reg.tentang}</p>
                </div>
                <span className="badge badge-dot badge-success shrink-0">{reg.status}</span>
              </div>
              <div className="px-6 py-4 space-y-3">
                <div className="flex gap-8 text-xs text-[var(--text-muted)]">
                  <span>📅 {reg.ditetapkan}</span>
                  <span>📍 {reg.sumber}</span>
                </div>
                {reg.params.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                      Parameter Aktif
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {reg.params.map((p) => (
                        <div
                          key={p.key}
                          className="flex items-center gap-2 bg-[var(--surface-2)] rounded-lg px-3 py-2"
                        >
                          <span className="text-xs font-semibold text-[var(--text-secondary)]">
                            {p.key}:
                          </span>
                          <span className="text-xs text-indigo-600 font-bold">
                            {p.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SidebarLayout>
  );
}
