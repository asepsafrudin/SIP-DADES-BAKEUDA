'use client';

import React, { useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { useAddTransactions } from '@/hooks/useAddTransactions';

export default function DashboardAddPage() {
  const [selectedBulan, setSelectedBulan] = useState('Agustus 2026');
  const { data, loading, error, refetch, updateStatus } = useAddTransactions(selectedBulan);
  
  const [isUploadingOCR, setIsUploadingOCR] = useState(false);
  const [isUploadingBPJS, setIsUploadingBPJS] = useState(false);

  const handleUploadOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploadingOCR(true);
    try {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        // Simulating the OCR API call
        const response = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: [base64] })
        });
        
        if (!response.ok) throw new Error('OCR Failed');
        // Trigger refetch or handle success
        alert('File berhasil diunggah dan sedang diproses oleh OCR.');
        refetch();
      };
    } catch (err) {
      alert('Gagal mengunggah dokumen.');
    } finally {
      setIsUploadingOCR(false);
      e.target.value = '';
    }
  };

  const handleUploadBPJS = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploadingBPJS(true);
    try {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bulan_tagihan', selectedBulan);
      
      const response = await fetch('/api/add/import-bpjs', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('Import BPJS Failed');
      const resData = await response.json();
      alert(resData.message || 'Import BPJS Berhasil!');
      refetch();
    } catch (err) {
      alert('Gagal mengimport file BPJS.');
    } finally {
      setIsUploadingBPJS(false);
      e.target.value = '';
    }
  };

  const handlePrintPDF = () => {
    window.open(`/api/add/rekap-spm?bulan=${encodeURIComponent(selectedBulan)}`, '_blank');
  };

  return (
    <SidebarLayout>
      <div className="p-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/60 p-6 rounded-2xl shadow-sm backdrop-blur-md border border-slate-200/50">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Village Funds (ADD)</h1>
            <p className="text-slate-500 text-sm mt-1">Manage and verify monthly village funds allocation.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <select 
              value={selectedBulan} 
              onChange={(e) => setSelectedBulan(e.target.value)}
              className="bg-white border border-slate-300 text-slate-700 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-2.5 shadow-sm"
            >
              <option value="Juli 2026">Juli 2026</option>
              <option value="Agustus 2026">Agustus 2026</option>
              <option value="September 2026">September 2026</option>
            </select>
          </div>
        </div>

        {/* Stats & Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden">
             <div className="relative z-10">
               <p className="text-blue-100 text-sm font-medium mb-1">Upload Data BPJS</p>
               <h3 className="text-2xl font-bold mb-4">Master Iuran</h3>
               <label className="cursor-pointer bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-md border border-white/30 text-white text-sm py-2 px-4 rounded-xl inline-flex items-center gap-2">
                 {isUploadingBPJS ? 'Mengunggah...' : 'Import Excel'}
                 <input type="file" accept=".xls,.xlsx" className="hidden" onChange={handleUploadBPJS} disabled={isUploadingBPJS} />
               </label>
             </div>
             {/* Decorative blob */}
             <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/50 relative overflow-hidden group">
             <p className="text-slate-500 text-sm font-medium mb-1">Pengajuan Baru</p>
             <h3 className="text-2xl font-bold text-slate-800 mb-4">Upload Pengantar (OCR)</h3>
             <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 transition-colors text-slate-700 text-sm py-2 px-4 rounded-xl inline-flex items-center gap-2 font-medium">
               {isUploadingOCR ? 'Menganalisis...' : 'Upload PDF/Scan'}
               <input type="file" accept="application/pdf,image/*" className="hidden" onChange={handleUploadOCR} disabled={isUploadingOCR} />
             </label>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/50 flex flex-col justify-between">
             <div>
               <p className="text-slate-500 text-sm font-medium mb-1">Rekapitulasi</p>
               <h3 className="text-2xl font-bold text-slate-800">SPM Transfer</h3>
             </div>
             <button onClick={handlePrintPDF} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors text-sm py-2 px-4 rounded-xl inline-flex items-center justify-center gap-2 font-medium w-full mt-4">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
               Cetak PDF
             </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-bold text-lg text-slate-800">Daftar Pengajuan ({data.length})</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">Nama Desa</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Pagu (Rp)</th>
                  <th className="px-6 py-4">Potongan BPJS (Rp)</th>
                  <th className="px-6 py-4">Net Amount (Rp)</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Loading data...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Belum ada transaksi untuk bulan ini.</td></tr>
                ) : (
                  data.map((row) => (
                    <tr key={row.$id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-800">{row.desa_id}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          row.status === 'DISETUJUI' ? 'bg-green-100 text-green-700' :
                          row.status === 'DITOLAK' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">{row.nominal_pengajuan?.toLocaleString('id-ID') || 0}</td>
                      <td className="px-6 py-4 text-red-500">{row.potongan_bpjs?.toLocaleString('id-ID') || 0}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{row.nominal_net?.toLocaleString('id-ID') || 0}</td>
                      <td className="px-6 py-4 text-center">
                        {row.status !== 'DISETUJUI' && (
                          <button 
                            onClick={async () => {
                              try {
                                await updateStatus(row.$id, 'DISETUJUI');
                                alert('Persetujuan berhasil diproses!');
                              } catch (err: any) {
                                alert(`PERINGATAN REGULASI:\n\n${err.message}`);
                              }
                            }}
                            className="text-white bg-green-500 hover:bg-green-600 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                          >
                            Setujui
                          </button>
                        )}
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
