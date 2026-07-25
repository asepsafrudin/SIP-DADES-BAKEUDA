'use client';

import { useState, useEffect, useMemo } from 'react';
import PrintableKuitansiGlobal, { PrintConfig } from '@/components/PrintableKuitansiGlobal';
import { KuitansiData } from '@/components/PrintableKuitansi';
import Link from 'next/link';

export default function KuitansiDashboard() {
  const [transactions, setTransactions] = useState<KuitansiData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State untuk Batch Selection (Menyimpan ID transaksi yang dicentang)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // State untuk Konfigurasi Pejabat & Kode
  const [config, setConfig] = useState<PrintConfig>({
    penyaluranKe: '11',
    kodeSubKegiatan: '02.2.04.08',
    namaSubKegiatan: 'Analisis Perencanaan dan Penyaluran Bantuan Keuangan',
    kodeRekening: '5.4.02.05.02.0003',
    namaPA: 'Imam Khasbulah, S.Sos., M.E.',
    nipPA: '19721014 199203 1 004',
    namaBendahara: 'Ari Purwaningsih, S.Sos.',
    nipBendahara: '19790720 199803 2 003',
    namaPPTK: 'Lindar Anton Hermawan, S.E., M.Ak.',
    nipPPTK: '19750718 199703 1 005',
    tanggalCetak: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
  });

  useEffect(() => {
    fetch('/api/kuitansi')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTransactions(data.data);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handlePrint = async () => {
    // Tampilkan dialog cetak browser
    window.print();
    
    // Konfirmasi apakah berhasil dicetak
    if (confirm('Apakah kuitansi berhasil dicetak? Jika ya, transaksi ini akan ditandai selesai (DICETAK).')) {
      const idsToUpdate = Array.from(selectedIds);
      try {
        const res = await fetch('/api/kuitansi/print', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: idsToUpdate })
        });
        const result = await res.json();
        
        if (result.success) {
          // Hapus dari daftar lokal
          setTransactions(prev => prev.filter(t => !selectedIds.has(t.id)));
          setSelectedIds(new Set());
          alert(result.message);
        } else {
          alert('Gagal mengupdate status: ' + result.error);
        }
      } catch (e: any) {
        alert('Terjadi kesalahan jaringan: ' + e.message);
      }
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map(t => t.id)));
    }
  };

  // Hitung properti dari yang terpilih
  const selectedTransactions = useMemo(() => {
    return transactions.filter(t => selectedIds.has(t.id));
  }, [transactions, selectedIds]);

  const totalNominal = selectedTransactions.reduce((acc, curr) => acc + curr.nominal, 0);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto print:hidden">
        
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Cetak Kuitansi Kolektif (Global)</h1>
            <p className="text-zinc-500 mt-2">Pilih beberapa transaksi sekaligus untuk dicetak dalam satu kuitansi.</p>
          </div>
          <Link href="/" className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg hover:bg-zinc-300 transition-colors">
            &larr; Kembali ke Home
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* KOLOM KIRI: Daftar Transaksi & Checkbox */}
          <div className="lg:col-span-4 bg-white dark:bg-zinc-800 rounded-xl shadow border border-zinc-200 dark:border-zinc-700 overflow-hidden flex flex-col h-[700px]">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 flex justify-between items-center">
              <h2 className="font-semibold">Daftar DRAFT ({transactions.length})</h2>
              <button onClick={selectAll} className="text-sm text-blue-600 font-medium">
                {selectedIds.size === transactions.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-2 space-y-2">
              {loading ? (
                <p className="p-4 text-center text-zinc-500">Memuat data...</p>
              ) : transactions.length === 0 ? (
                <p className="p-4 text-center text-zinc-500">Tidak ada transaksi DRAFT.</p>
              ) : (
                transactions.map((tx) => (
                  <label
                    key={tx.id}
                    className={`flex items-start gap-3 w-full text-left p-3 rounded-lg border cursor-pointer transition-all ${selectedIds.has(tx.id) ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
                  >
                    <input 
                      type="checkbox" 
                      className="mt-1 w-5 h-5 cursor-pointer"
                      checked={selectedIds.has(tx.id)}
                      onChange={() => toggleSelection(tx.id)}
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">{tx.namaDesa}</div>
                      <div className="text-xs text-zinc-500 mb-1">Surat: {tx.noRekomendasi || '-'}</div>
                      <div className="text-sm font-medium text-green-600 dark:text-green-400">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(tx.nominal)}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div className="p-4 bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-700">
              <div className="text-sm text-zinc-600 mb-1">Total Terpilih: {selectedIds.size} Kegiatan</div>
              <div className="text-xl font-bold text-zinc-900 dark:text-white">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalNominal)}
              </div>
            </div>
          </div>

          {/* KOLOM TENGAH: Form Konfigurasi Pejabat & Rekening */}
          <div className="lg:col-span-3 space-y-4 h-[700px] overflow-y-auto pr-2">
            
            <div className="bg-white dark:bg-zinc-800 p-5 rounded-xl shadow border border-zinc-200 dark:border-zinc-700">
              <h3 className="font-semibold mb-4 border-b pb-2">Informasi Kegiatan</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-500 block">Penyaluran Ke-</label>
                  <input type="text" value={config.penyaluranKe} onChange={e => setConfig({...config, penyaluranKe: e.target.value})} className="w-full p-1.5 border rounded text-sm bg-zinc-50 dark:bg-zinc-900" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block">Kode Sub Kegiatan</label>
                  <input type="text" value={config.kodeSubKegiatan} onChange={e => setConfig({...config, kodeSubKegiatan: e.target.value})} className="w-full p-1.5 border rounded text-sm font-mono bg-zinc-50 dark:bg-zinc-900" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block">Nama Sub Kegiatan</label>
                  <textarea value={config.namaSubKegiatan} onChange={e => setConfig({...config, namaSubKegiatan: e.target.value})} className="w-full p-1.5 border rounded text-sm bg-zinc-50 dark:bg-zinc-900" rows={2} />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block">Kode Rekening</label>
                  <input type="text" value={config.kodeRekening} onChange={e => setConfig({...config, kodeRekening: e.target.value})} className="w-full p-1.5 border rounded text-sm font-mono bg-zinc-50 dark:bg-zinc-900" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block">Tanggal Cetak</label>
                  <input type="text" value={config.tanggalCetak} onChange={e => setConfig({...config, tanggalCetak: e.target.value})} className="w-full p-1.5 border rounded text-sm bg-zinc-50 dark:bg-zinc-900" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-800 p-5 rounded-xl shadow border border-zinc-200 dark:border-zinc-700">
              <h3 className="font-semibold mb-4 border-b pb-2">Pejabat Penandatangan</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-blue-600 block">1. Pengguna Anggaran</label>
                  <input type="text" value={config.namaPA} onChange={e => setConfig({...config, namaPA: e.target.value})} className="w-full p-1.5 border-b focus:outline-none focus:border-blue-500 bg-transparent text-sm mb-1" placeholder="Nama" />
                  <input type="text" value={config.nipPA} onChange={e => setConfig({...config, nipPA: e.target.value})} className="w-full p-1.5 border-b focus:outline-none focus:border-blue-500 bg-transparent text-xs text-zinc-500 font-mono" placeholder="NIP" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-blue-600 block">2. Bendahara Pengeluaran</label>
                  <input type="text" value={config.namaBendahara} onChange={e => setConfig({...config, namaBendahara: e.target.value})} className="w-full p-1.5 border-b focus:outline-none focus:border-blue-500 bg-transparent text-sm mb-1" />
                  <input type="text" value={config.nipBendahara} onChange={e => setConfig({...config, nipBendahara: e.target.value})} className="w-full p-1.5 border-b focus:outline-none focus:border-blue-500 bg-transparent text-xs text-zinc-500 font-mono" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-blue-600 block">3. PPTK</label>
                  <input type="text" value={config.namaPPTK} onChange={e => setConfig({...config, namaPPTK: e.target.value})} className="w-full p-1.5 border-b focus:outline-none focus:border-blue-500 bg-transparent text-sm mb-1" />
                  <input type="text" value={config.nipPPTK} onChange={e => setConfig({...config, nipPPTK: e.target.value})} className="w-full p-1.5 border-b focus:outline-none focus:border-blue-500 bg-transparent text-xs text-zinc-500 font-mono" />
                </div>
              </div>
            </div>

          </div>

          {/* KOLOM KANAN: Preview & Print */}
          <div className="lg:col-span-5 bg-zinc-200 dark:bg-zinc-800 rounded-xl shadow border border-zinc-300 dark:border-zinc-700 flex flex-col items-center p-4 relative h-[700px]">
            <div className="w-full flex justify-between items-center mb-4 bg-white dark:bg-zinc-900 p-3 rounded-lg shadow-sm">
              <span className="font-semibold">Pratinjau Kuitansi Global</span>
              <button 
                onClick={handlePrint}
                disabled={selectedIds.size === 0}
                className="px-6 py-2 bg-black hover:bg-zinc-800 text-white font-medium rounded shadow transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                Cetak ({selectedIds.size})
              </button>
            </div>
            
            {/* Scrollable Preview Area */}
            <div className="w-full flex-1 overflow-y-auto bg-zinc-300 dark:bg-zinc-950 rounded border border-zinc-400 flex justify-center p-4 shadow-inner">
              {selectedIds.size === 0 ? (
                <div className="my-auto text-zinc-500 text-center">Centang desa di sebelah kiri untuk melihat Kuitansi Global.</div>
              ) : (
                <div className="scale-[0.65] origin-top">
                  <PrintableKuitansiGlobal dataList={selectedTransactions} config={config} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Komponen yang BENAR-BENAR dicetak (Tersembunyi di layar normal) */}
      {selectedIds.size > 0 && (
        <div className="hidden print:block w-full absolute top-0 left-0 bg-white z-50 text-black">
          <PrintableKuitansiGlobal dataList={selectedTransactions} config={config} />
        </div>
      )}
    </div>
  );
}
