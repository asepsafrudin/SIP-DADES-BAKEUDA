'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { databases } from '@/lib/appwrite';
import { Query } from 'appwrite';

const DB_ID = 'sipdades_db';

interface PaguSummary {
  jenis_dana: string;
  total_pagu: number;
  total_realisasi: number;
}

/* ─── Helpers ─── */
function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function pctOf(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

/* ─── Stat Card Component ─── */
function StatCard({
  title,
  value,
  subtitle,
  gradient,
  icon,
  delay,
}: {
  title: string;
  value: string;
  subtitle: string;
  gradient: string;
  icon: string;
  delay: number;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-lg ${gradient} animate-slide-up`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative z-10">
        <p className="text-white/70 text-sm font-medium">{title}</p>
        <h3 className="text-2xl font-bold mt-1 tracking-tight">{value}</h3>
        <p className="text-white/60 text-xs mt-2">{subtitle}</p>
      </div>
      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
      <div className="absolute top-4 right-4 opacity-20">
        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      </div>
    </div>
  );
}

/* ─── Quick Link Card ─── */
function QuickLinkCard({
  title,
  description,
  href,
  icon,
  color,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
  color: string;
}) {
  return (
    <Link href={href}>
      <div className="card p-5 group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
        <div className="flex items-start gap-4">
          <div
            className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0`}
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm text-[var(--text-primary)] group-hover:text-indigo-600 transition-colors">
              {title}
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {description}
            </p>
          </div>
          <svg className="w-4 h-4 text-[var(--text-muted)] ml-auto mt-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

/* ─── Main Dashboard Page ─── */
export default function DashboardPage() {
  const [paguData, setPaguData] = useState<PaguSummary[]>([]);
  const [totalDesa, setTotalDesa] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOverview() {
      try {
        // Fetch master desa count
        const desaRes = await databases.listDocuments(DB_ID, 'master_desa', [
          Query.limit(1),
        ]);
        setTotalDesa(desaRes.total);

        // Fetch pagu summary
        const paguRes = await databases.listDocuments(DB_ID, 'pagu_alokasi', [
          Query.limit(500),
        ]);

        // Aggregate by jenis_dana
        const aggregated: Record<string, PaguSummary> = {};
        for (const doc of paguRes.documents) {
          const jenis = (doc as any).jenis_dana || 'Lainnya';
          if (!aggregated[jenis]) {
            aggregated[jenis] = {
              jenis_dana: jenis,
              total_pagu: 0,
              total_realisasi: 0,
            };
          }
          aggregated[jenis].total_pagu += (doc as any).pagu_total || 0;
          aggregated[jenis].total_realisasi +=
            (doc as any).realisasi_kumulatif || 0;
        }
        setPaguData(Object.values(aggregated));
      } catch {
        // silently handle — data might not exist yet
        setPaguData([]);
      } finally {
        setLoading(false);
      }
    }
    fetchOverview();
  }, []);

  const totalPagu = paguData.reduce((s, p) => s + p.total_pagu, 0);
  const totalRealisasi = paguData.reduce((s, p) => s + p.total_realisasi, 0);
  const sisaPagu = totalPagu - totalRealisasi;

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Ringkasan Pengelolaan Dana Desa — Kabupaten Purbalingga TA 2026
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 stagger-children">
          <StatCard
            title="Total Pagu Anggaran"
            value={loading ? '...' : formatRupiah(totalPagu)}
            subtitle={`${totalDesa} desa terdaftar`}
            gradient="bg-gradient-to-br from-indigo-600 to-violet-700"
            icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            delay={0}
          />
          <StatCard
            title="Realisasi Pencairan"
            value={loading ? '...' : formatRupiah(totalRealisasi)}
            subtitle={`${pctOf(totalRealisasi, totalPagu)}% dari total pagu`}
            gradient="bg-gradient-to-br from-emerald-600 to-teal-700"
            icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            delay={60}
          />
          <StatCard
            title="Sisa Pagu"
            value={loading ? '...' : formatRupiah(sisaPagu)}
            subtitle={`${pctOf(sisaPagu, totalPagu)}% tersisa`}
            gradient="bg-gradient-to-br from-amber-500 to-orange-600"
            icon="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
            delay={120}
          />
          <StatCard
            title="Jenis Dana Aktif"
            value={loading ? '...' : `${paguData.length} Jenis`}
            subtitle="ADD, BKK, BHPR, DD"
            gradient="bg-gradient-to-br from-rose-500 to-pink-700"
            icon="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            delay={180}
          />
        </div>

        {/* Pagu Breakdown Table */}
        <div className="card overflow-hidden animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="px-6 py-5 border-b border-[var(--surface-3)]">
            <h2 className="font-bold text-base text-[var(--text-primary)]">
              Rincian Pagu per Jenis Dana
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-premium">
              <thead>
                <tr>
                  <th>Jenis Dana</th>
                  <th>Total Pagu</th>
                  <th>Realisasi</th>
                  <th>Sisa</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8">
                      <div className="skeleton h-4 w-48 mx-auto" />
                    </td>
                  </tr>
                ) : paguData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-8 text-[var(--text-muted)]"
                    >
                      Belum ada data pagu. Silakan upload Master Data melalui
                      menu Administrasi.
                    </td>
                  </tr>
                ) : (
                  paguData.map((p) => {
                    const pct = pctOf(p.total_realisasi, p.total_pagu);
                    return (
                      <tr key={p.jenis_dana}>
                        <td className="font-semibold text-[var(--text-primary)]">
                          {p.jenis_dana}
                        </td>
                        <td>{formatRupiah(p.total_pagu)}</td>
                        <td className="text-emerald-600 font-medium">
                          {formatRupiah(p.total_realisasi)}
                        </td>
                        <td>
                          {formatRupiah(
                            p.total_pagu - p.total_realisasi
                          )}
                        </td>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-[var(--surface-3)] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-indigo-500 transition-all duration-700"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-[var(--text-muted)] w-10 text-right">
                              {pct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="font-bold text-base text-[var(--text-primary)] mb-4">
            Akses Cepat
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger-children">
            <QuickLinkCard
              title="Dana Desa (ADD)"
              description="Kelola pengajuan dan verifikasi pencairan ADD bulanan"
              href="/dashboard/add"
              icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"
              color="bg-indigo-500"
            />
            <QuickLinkCard
              title="BKK Sarpras"
              description="Bantuan Keuangan Khusus — per termin penyaluran"
              href="/dashboard/bkk"
              icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"
              color="bg-emerald-500"
            />
            <QuickLinkCard
              title="Bagi Hasil Pajak (BHPR)"
              description="Alokasi BHPR desa dan status kewajiban pajak"
              href="/dashboard/bhpr"
              icon="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z"
              color="bg-amber-500"
            />
            <QuickLinkCard
              title="Upload Master Data"
              description="Import pagu tahunan dari template Excel"
              href="/admin/data-ingestion"
              icon="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              color="bg-violet-500"
            />
            <QuickLinkCard
              title="Billing & Usage"
              description="Monitor biaya operasional layanan pihak ketiga"
              href="/admin/billing"
              icon="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              color="bg-rose-500"
            />
            <QuickLinkCard
              title="Pusat Regulasi"
              description="Referensi Perbup, PMK, dan parameter finansial aktif"
              href="/dashboard/regulasi"
              icon="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253"
              color="bg-cyan-500"
            />
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
