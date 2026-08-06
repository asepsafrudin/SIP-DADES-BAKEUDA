'use client';

import React, { useState, useEffect } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';

/* ─── Mock Billing Data (Dynamic fields will override this) ─── */
const billingData = {
  currentMonth: 'Agustus 2026',
  monthlyHistory: [
    { month: 'Mei 2026', total: 180000 },
    { month: 'Jun 2026', total: 245000 },
    { month: 'Jul 2026', total: 310000 },
    { month: 'Agu 2026', total: 290000 },
  ],
};

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(num);
}

function StatusBadge({ status }: { status: 'active' | 'free' | 'paused' }) {
  const styles = {
    active: 'badge-success',
    free: 'badge-info',
    paused: 'badge-danger',
  };
  const labels = { active: 'Aktif', free: 'Gratis', paused: 'Dihentikan' };
  return <span className={`badge badge-dot ${styles[status]}`}>{labels[status]}</span>;
}

export default function BillingPage() {
  const [killSwitch, setKillSwitch] = useState({
    active: false,
    reason: 'Operational Normal',
    monthlyUsageCostUsd: 0,
    monthlyBudgetLimitUsd: 50.00
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadState() {
      try {
        const res = await fetch('/api/admin/kill-switch');
        const json = await res.json();
        if (json.status === 'success') {
          setKillSwitch(json.data);
        }
      } catch (err) {
        console.error('Failed to load billing state:', err);
      } finally {
        setLoading(false);
      }
    }
    loadState();
  }, []);

  const handleToggleKillSwitch = async () => {
    const newActive = !killSwitch.active;
    const newReason = newActive
      ? 'Disabled by Admin via Billing Dashboard'
      : 'Re-enabled by Admin via Billing Dashboard';
    try {
      const res = await fetch('/api/admin/kill-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: newActive, reason: newReason })
      });
      const json = await res.json();
      if (json.status === 'success') {
        setKillSwitch(json.data);
        alert(json.message);
      } else {
        throw new Error(json.error || 'Failed to update');
      }
    } catch (err: any) {
      alert(`Gagal merubah status Kill-Switch: ${err.message}`);
    }
  };

  // Convert USD costs to IDR (using 16000 exchange rate)
  const runpodCostIdr = Math.round(killSwitch.monthlyUsageCostUsd * 0.7 * 16000);
  const geminiCostIdr = Math.round(killSwitch.monthlyUsageCostUsd * 0.3 * 16000);
  const appwriteCostIdr = 150000;
  const vercelCostIdr = 0;

  const totalCost = appwriteCostIdr + runpodCostIdr + geminiCostIdr + vercelCostIdr;
  const budgetLimitIdr = Math.round(killSwitch.monthlyBudgetLimitUsd * 16000);

  const services = [
    {
      name: 'Appwrite Cloud',
      category: 'Database & Auth',
      usage: '2.1 GB Storage / 14.2 GB Bandwidth',
      cost: appwriteCostIdr,
      status: 'active' as const,
    },
    {
      name: 'RunPod Serverless GPU',
      category: 'AI / OCR Engine',
      usage: `${Math.round(killSwitch.monthlyUsageCostUsd * 1000)} detik GPU • real usage`,
      cost: runpodCostIdr,
      status: killSwitch.active ? ('paused' as const) : ('active' as const),
    },
    {
      name: 'Google Gemini API',
      category: 'AI Refinement',
      usage: 'Real-time extraction usage',
      cost: geminiCostIdr,
      status: killSwitch.active ? ('paused' as const) : ('active' as const),
    },
    {
      name: 'Vercel Hosting',
      category: 'Frontend Deployment',
      usage: 'Hobby Plan — 100 GB Bandwidth',
      cost: vercelCostIdr,
      status: 'free' as const,
    },
  ];

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Billing & Usage Control
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Pantau dan kendalikan biaya operasional layanan pihak ketiga — {billingData.currentMonth}
            </p>
          </div>
          <button
            className="self-start px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            📄 Export Invoice PDF
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 stagger-children">
          {/* Total Bulan Ini */}
          <div className="relative overflow-hidden rounded-2xl p-6 text-white bg-gradient-to-br from-indigo-600 to-violet-700 shadow-lg">
            <div className="relative z-10">
              <p className="text-indigo-200 text-sm font-medium">Total Biaya Bulan Ini</p>
              <h3 className="text-3xl font-bold mt-1">{loading ? '...' : formatRupiah(totalCost)}</h3>
              <p className="text-indigo-200/70 text-xs mt-2">
                {services.filter(s => s.status === 'active').length} layanan aktif
              </p>
            </div>
            <div className="absolute -bottom-6 -right-6 w-28 h-28 bg-white/10 rounded-full blur-2xl" />
          </div>

          {/* Kill Switch Card */}
          <div className="card p-6">
            <p className="text-[var(--text-muted)] text-sm font-medium">OCR Engine</p>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mt-1">
              Kill Switch
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">
              Matikan AI OCR untuk menghemat biaya. Staf akan menggunakan input manual.
            </p>
            <button
              onClick={handleToggleKillSwitch}
              className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
                !killSwitch.active ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${
                  !killSwitch.active ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
            <p className={`text-xs font-semibold mt-2 ${!killSwitch.active ? 'text-emerald-600' : 'text-rose-500'}`}>
              {!killSwitch.active ? '✅ OCR Engine Aktif' : '⛔ OCR Engine Dimatikan'}
            </p>
          </div>

          {/* Budget Cap */}
          <div className="card p-6">
            <p className="text-[var(--text-muted)] text-sm font-medium">Budget Cap</p>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mt-1">
              {loading ? '...' : formatRupiah(budgetLimitIdr)}<span className="text-sm font-normal text-[var(--text-muted)]"> / bulan</span>
            </h3>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                <span>Terpakai</span>
                <span>{loading ? '...' : `${Math.round((totalCost / budgetLimitIdr) * 100)}%`}</span>
              </div>
              <div className="h-2.5 bg-[var(--surface-3)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    totalCost / budgetLimitIdr > 0.8 ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${loading ? 0 : Math.min((totalCost / budgetLimitIdr) * 100, 100)}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Sisa: {loading ? '...' : formatRupiah(budgetLimitIdr - totalCost)}
            </p>
          </div>
        </div>

        {/* Service Detail Table */}
        <div className="card overflow-hidden">
          <div className="px-6 py-5 border-b border-[var(--surface-3)] flex items-center justify-between">
            <h2 className="font-bold text-base text-[var(--text-primary)]">
              Rincian Layanan
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-premium">
              <thead>
                <tr>
                  <th>Layanan</th>
                  <th>Kategori</th>
                  <th>Penggunaan</th>
                  <th>Biaya</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {services.map((svc) => (
                  <tr key={svc.name}>
                    <td className="font-semibold text-[var(--text-primary)]">{svc.name}</td>
                    <td>{svc.category}</td>
                    <td className="font-mono text-xs">{svc.usage}</td>
                    <td className="font-semibold">
                      {svc.cost === 0 ? (
                        <span className="text-emerald-600">Gratis</span>
                      ) : (
                        formatRupiah(svc.cost)
                      )}
                    </td>
                    <td><StatusBadge status={svc.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monthly History */}
        <div className="card p-6">
          <h2 className="font-bold text-base text-[var(--text-primary)] mb-4">
            Riwayat Biaya Bulanan
          </h2>
          <div className="space-y-3">
            {billingData.monthlyHistory.map((m) => {
              const pct = Math.round((m.total / 500000) * 100);
              return (
                <div key={m.month} className="flex items-center gap-4">
                  <span className="text-sm text-[var(--text-secondary)] w-24 shrink-0">
                    {m.month}
                  </span>
                  <div className="flex-1 h-3 bg-[var(--surface-2)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)] w-28 text-right">
                    {formatRupiah(m.total)}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-4 italic">
            💡 Data ini saat ini bersifat simulasi. Tahap 2 akan menarik data real-time dari Usage API masing-masing vendor.
          </p>
        </div>
      </div>
    </SidebarLayout>
  );
}
