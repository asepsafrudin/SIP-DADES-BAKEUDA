'use client';

import React, { useState } from 'react';

interface PrintScanWorkflowProps {
  transactionId: string;
  desaName: string;
  bulan: string;
  nominal: number;
  initialStatus: string;
  onStatusChange?: (newStatus: string) => void;
}

export default function PrintScanWorkflow({
  transactionId,
  desaName,
  bulan,
  nominal,
  initialStatus,
  onStatusChange,
}: PrintScanWorkflowProps) {
  const [status, setStatus] = useState(initialStatus || 'DRAFT');
  const [isUploading, setIsUploading] = useState(false);

  const handlePrint = () => {
    window.open(
      `/api/print/generate-spm?desa=${encodeURIComponent(
        desaName
      )}&bulan=${encodeURIComponent(bulan)}&nominal=${nominal}`,
      '_blank'
    );
    const nextStatus = 'MENUNGGU_TTE';
    setStatus(nextStatus);
    if (onStatusChange) onStatusChange(nextStatus);
  };

  const handleScanBackUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);

    try {
      // Simulate file upload and QR verification
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const nextStatus = 'CAIR';
      setStatus(nextStatus);
      if (onStatusChange) onStatusChange(nextStatus);
      alert(
        '✅ Dokumen hasil scan TTE basah berhasil diverifikasi! Status transaksi diperbarui menjadi CAIR.'
      );
    } catch {
      alert('❌ Gagal memproses dokumen hasil scan.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const steps = [
    { key: 'DRAFT', label: 'Draft Pengajuan' },
    { key: 'MENUNGGU_TTE', label: 'Cetak & TTE Basah' },
    { key: 'CAIR', label: 'Cair / Selesai' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === status);

  return (
    <div className="card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-base text-[var(--text-primary)]">
            Alur Tanda Tangan Basah (Print & Scan-Back)
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            ID Transaksi: <code className="font-mono">{transactionId}</code> • Desa {desaName}
          </p>
        </div>
        <span
          className={`badge badge-dot ${
            status === 'CAIR'
              ? 'badge-success'
              : status === 'MENUNGGU_TTE'
              ? 'badge-warning'
              : 'badge-neutral'
          }`}
        >
          {status}
        </span>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between relative">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-[var(--surface-3)] -translate-y-1/2 z-0" />
        <div
          className="absolute top-1/2 left-0 h-1 bg-indigo-600 -translate-y-1/2 z-0 transition-all duration-500"
          style={{
            width: `${(Math.max(currentStepIndex, 0) / (steps.length - 1)) * 100}%`,
          }}
        />

        {steps.map((step, idx) => {
          const isDone = currentStepIndex > idx;
          const isCurrent = currentStepIndex === idx;
          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                  isDone
                    ? 'bg-indigo-600 text-white shadow-md'
                    : isCurrent
                    ? 'bg-white border-2 border-indigo-600 text-indigo-600 shadow-md ring-4 ring-indigo-100'
                    : 'bg-[var(--surface-3)] text-[var(--text-muted)]'
                }`}
              >
                {isDone ? '✓' : idx + 1}
              </div>
              <span className="text-[11px] font-medium text-[var(--text-secondary)] mt-2">
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Action Area */}
      <div className="bg-[var(--surface-2)] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {status === 'DRAFT' && (
          <>
            <p className="text-xs text-[var(--text-muted)]">
              Cetak fisik dokumen SPM/Kuitansi ini untuk dimintakan TTE basah pejabat.
            </p>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow transition-colors shrink-0 flex items-center gap-2"
            >
              🖨️ Cetak Fisik SPM (PDF)
            </button>
          </>
        )}

        {status === 'MENUNGGU_TTE' && (
          <>
            <div className="text-xs text-[var(--text-muted)]">
              <p className="font-semibold text-amber-600">Menunggu Tanda Tangan Basah</p>
              <p>Unggah kembali lembar fisik yang sudah distempel & ditandatangani.</p>
            </div>
            <label className="cursor-pointer px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow transition-colors shrink-0 flex items-center gap-2">
              {isUploading ? 'Memproses Scan...' : '📤 Ingest Hasil Scan TTE'}
              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={handleScanBackUpload}
                disabled={isUploading}
              />
            </label>
          </>
        )}

        {status === 'CAIR' && (
          <div className="w-full text-center text-xs font-semibold text-emerald-700 py-1">
            🎉 Transaksi telah selesai dan terverifikasi sah secara fisik & digital.
          </div>
        )}
      </div>
    </div>
  );
}
