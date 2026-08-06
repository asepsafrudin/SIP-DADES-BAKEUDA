'use client';

import React, { useState, useEffect } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';

interface Regulation {
  $id: string;
  tahun_anggaran: number;
  nama_peraturan: string;
  rules_json: string;
  is_active: boolean;
  status_persetujuan: string;
  $createdAt?: string;
}

export default function RegulasiApprovalPage() {
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReg, setSelectedReg] = useState<Regulation | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchRegulations = async () => {
    try {
      const res = await fetch('/api/admin/regulasi-approval');
      const json = await res.json();
      if (json.status === 'success') {
        setRegulations(json.data);
        if (json.data.length > 0 && !selectedReg) {
          setSelectedReg(json.data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load regulations for approval:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegulations();
  }, []);

  const handleAction = async (action: 'APPROVE' | 'REJECT') => {
    if (!selectedReg) return;
    const confirmMsg = action === 'APPROVE' 
      ? 'Apakah Anda yakin ingin menyetujui dan MENGAKTIFKAN regulasi ini di production?' 
      : 'Apakah Anda yakin ingin menolak draf regulasi ini?';
    
    if (!window.confirm(confirmMsg)) return;

    setProcessing(true);
    try {
      const res = await fetch('/api/admin/regulasi-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regulasi_id: selectedReg.$id,
          action,
          notes: actionNotes
        })
      });

      const json = await res.json();
      if (res.ok && json.status === 'success') {
        alert(json.message);
        setActionNotes('');
        await fetchRegulations();
      } else {
        throw new Error(json.error || 'Failed to process request');
      }
    } catch (err: any) {
      alert(`Gagal memproses aksi: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // Helper to parse rules JSON
  const getParsedRules = (rulesStr: string) => {
    try {
      return JSON.parse(rulesStr);
    } catch {
      return null;
    }
  };

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            Persetujuan Kebijakan (Rules-as-Code)
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Verifikasi, bandingkan, dan aktifkan parameter logika regulasi keuangan desa sebelum masuk ke production.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-[var(--text-muted)]">
            Memuat draf regulasi...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left side: List of regulations */}
            <div className="lg:col-span-1 space-y-4">
              <h2 className="font-bold text-lg text-[var(--text-primary)]">
                Daftar Draf & Versi
              </h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {regulations.map((reg) => (
                  <button
                    key={reg.$id}
                    onClick={() => setSelectedReg(reg)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedReg?.$id === reg.$id
                        ? 'border-indigo-500 bg-indigo-50/10 shadow-sm'
                        : 'border-[var(--surface-3)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)]'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950/55 dark:text-indigo-200">
                        TA {reg.tahun_anggaran}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        reg.status_persetujuan === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        reg.status_persetujuan === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {reg.status_persetujuan}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-[var(--text-primary)] mt-2 line-clamp-2">
                      {reg.nama_peraturan}
                    </h3>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">
                      Dibuat: {reg.$createdAt ? new Date(reg.$createdAt).toLocaleDateString('id-ID') : '-'}
                    </p>
                    {reg.is_active && (
                      <span className="inline-flex items-center text-[10px] text-emerald-600 font-semibold mt-2">
                        ● Aktif di Production
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Right side: Selected details & action pane */}
            <div className="lg:col-span-2 space-y-6">
              {selectedReg ? (
                <div className="card p-6 space-y-6">
                  {/* Title & Status */}
                  <div className="flex justify-between items-start border-b border-[var(--surface-3)] pb-4">
                    <div>
                      <span className="text-xs font-medium text-[var(--text-muted)]">Tinjau Regulasi</span>
                      <h2 className="text-xl font-bold text-[var(--text-primary)]">
                        {selectedReg.nama_peraturan}
                      </h2>
                    </div>
                    {selectedReg.is_active && (
                      <span className="px-3 py-1 rounded bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                        Aktif
                      </span>
                    )}
                  </div>

                  {/* Rules breakdown */}
                  {(() => {
                    const parsed = getParsedRules(selectedReg.rules_json);
                    if (!parsed) return <p className="text-rose-500">Gagal mengurai parameter JSON.</p>;
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* ADD Rules */}
                        <div className="p-4 rounded-xl bg-[var(--surface-2)] space-y-3">
                          <h4 className="font-bold text-sm text-indigo-600">1. Alokasi Dana Desa (ADD)</h4>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-[var(--text-secondary)]">Nomor Perbup:</span>
                              <span className="font-semibold text-[var(--text-primary)]">{parsed.perbup_add?.nomor || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[var(--text-secondary)]">ADD Minimum (ADDM):</span>
                              <span className="font-semibold text-[var(--text-primary)]">{(parsed.perbup_add?.addm_pct * 100) || 70}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[var(--text-secondary)]">ADD Proporsional (ADDP):</span>
                              <span className="font-semibold text-[var(--text-primary)]">{(parsed.perbup_add?.addp_pct * 100) || 30}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[var(--text-secondary)]">Limit Penyaluran Bulanan:</span>
                              <span className="font-mono font-semibold text-[var(--text-primary)]">{parsed.perbup_add?.limit_bulanan || 0.08333}</span>
                            </div>
                          </div>
                        </div>

                        {/* BHPR Rules */}
                        <div className="p-4 rounded-xl bg-[var(--surface-2)] space-y-3">
                          <h4 className="font-bold text-sm text-amber-600">2. BHPR (Pajak & Retribusi)</h4>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-[var(--text-secondary)]">Nomor Perbup:</span>
                              <span className="font-semibold text-[var(--text-primary)]">{parsed.perbup_bhpr?.nomor || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[var(--text-secondary)]">Min. Alokasi Pajak:</span>
                              <span className="font-semibold text-[var(--text-primary)]">{(parsed.perbup_bhpr?.min_alokasi_pajak_pct * 100) || 20}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[var(--text-secondary)]">Maks. Reward Petugas:</span>
                              <span className="font-semibold text-[var(--text-primary)]">{(parsed.perbup_bhpr?.max_reward_petugas_pct * 100) || 10}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[var(--text-secondary)]">Syarat Tahap II:</span>
                              <span className="font-semibold text-[var(--text-primary)]">{parsed.perbup_bhpr?.syarat_tahap_2 || 'Realisasi PBB-P2 100% Lunas'}</span>
                            </div>
                          </div>
                        </div>

                        {/* BPJS Rules */}
                        <div className="p-4 rounded-xl bg-[var(--surface-2)] space-y-3">
                          <h4 className="font-bold text-sm text-emerald-600">3. BPJS Kesehatan</h4>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-[var(--text-secondary)]">Iuran Pemda (ADD):</span>
                              <span className="font-semibold text-[var(--text-primary)]">{(parsed.bpjs?.iuran_pemda_pct * 100) || 4}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[var(--text-secondary)]">Iuran Mandiri Perangkat:</span>
                              <span className="font-semibold text-[var(--text-primary)]">{(parsed.bpjs?.iuran_pribadi_pct * 100) || 1}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[var(--text-secondary)]">Bulan Potongan Otomatis:</span>
                              <span className="font-semibold text-[var(--text-primary)]">{parsed.bpjs?.bulan_potongan || 'Januari'}</span>
                            </div>
                          </div>
                        </div>

                        {/* RAG & Extraction details */}
                        <div className="p-4 rounded-xl bg-[var(--surface-2)] space-y-3">
                          <h4 className="font-bold text-sm text-rose-600">4. Parameter AI</h4>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-[var(--text-secondary)]">Confidence Score:</span>
                              <span className="font-semibold text-[var(--text-primary)]">{parsed.confidence_score || '0.95'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[var(--text-secondary)]">Model Pengekstrak:</span>
                              <span className="font-semibold text-[var(--text-primary)]">{selectedReg.rules_json.includes('model_used') ? (JSON.parse(selectedReg.rules_json).model_used) : 'Gemini AI'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Actions log & Input notes */}
                  {selectedReg.status_persetujuan === 'PENDING' && (
                    <div className="border-t border-[var(--surface-3)] pt-6 space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                          Catatan Persetujuan / Penolakan (Wajib)
                        </label>
                        <textarea
                          value={actionNotes}
                          onChange={(e) => setActionNotes(e.target.value)}
                          placeholder="Tulis alasan menyetujui atau menolak draf parameter regulasi ini..."
                          rows={3}
                          className="w-full text-xs p-3 rounded-lg border border-[var(--surface-3)] bg-[var(--surface-2)] focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="flex justify-end gap-3">
                        <button
                          disabled={processing || !actionNotes.trim()}
                          onClick={() => handleAction('REJECT')}
                          className="px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          Reject Draft
                        </button>
                        <button
                          disabled={processing || !actionNotes.trim()}
                          onClick={() => handleAction('APPROVE')}
                          className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow transition-colors disabled:opacity-50"
                        >
                          {processing ? 'Memproses...' : 'Approve & Activate'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-[var(--text-muted)] card">
                  Pilih draf regulasi untuk ditinjau.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
