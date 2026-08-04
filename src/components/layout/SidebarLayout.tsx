'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

/* ─── Icon paths (Heroicons outline) ─── */
const icons = {
  dashboard:
    'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4',
  add: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  bkk: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  bhpr: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  regulasi:
    'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  billing:
    'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  ingestion:
    'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
  settings:
    'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  chevron: 'M19 9l-7 7-7-7',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'M6 18L18 6M6 6l12 12',
};

type NavSection = {
  label: string;
  items: { name: string; href: string; icon: string; badge?: string }[];
};

const navSections: NavSection[] = [
  {
    label: 'Operasional',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: icons.dashboard },
      { name: 'Dana Desa (ADD)', href: '/dashboard/add', icon: icons.add },
      { name: 'BKK Sarpras', href: '/dashboard/bkk', icon: icons.bkk },
      { name: 'Bagi Hasil (BHPR)', href: '/dashboard/bhpr', icon: icons.bhpr },
    ],
  },
  {
    label: 'Referensi',
    items: [
      {
        name: 'Pusat Regulasi',
        href: '/dashboard/regulasi',
        icon: icons.regulasi,
      },
    ],
  },
  {
    label: 'Administrasi',
    items: [
      {
        name: 'Upload Master Data',
        href: '/admin/data-ingestion',
        icon: icons.ingestion,
      },
      { name: 'Billing & Usage', href: '/admin/billing', icon: icons.billing },
      { name: 'Pengaturan', href: '/dashboard/settings', icon: icons.settings },
    ],
  },
];

function SvgIcon({
  d,
  className = '',
}: {
  d: string;
  className?: string;
}) {
  return (
    <svg
      className={`w-5 h-5 shrink-0 ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-indigo-500/30">
            SD
          </div>
          <div>
            <h1 className="font-bold tracking-wide text-sm text-slate-100 leading-tight">
              SIP-DADES
            </h1>
            <span className="text-[11px] text-slate-500 font-medium">
              BAKEUDA Purbalingga
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 mt-2 space-y-6 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' &&
                    pathname?.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                  >
                    <div
                      className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-indigo-500/15 text-indigo-400'
                          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                      }`}
                    >
                      <SvgIcon
                        d={item.icon}
                        className={
                          isActive
                            ? 'text-indigo-400'
                            : 'text-slate-600 group-hover:text-slate-400'
                        }
                      />
                      <span className="text-[13px] font-medium">
                        {item.name}
                      </span>
                      {item.badge && (
                        <span className="ml-auto text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-full font-semibold">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer — User Info */}
      <div className="p-3 mt-auto">
        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[11px] font-bold text-white shadow-md">
              SA
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-slate-200 truncate">
                Super Admin
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                DevOps • Full Access
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[var(--background)] flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — Desktop (fixed) */}
      <aside className="hidden lg:flex w-[260px] bg-[var(--sidebar-bg)] text-white flex-col fixed inset-y-0 z-30 border-r border-white/5">
        {sidebarContent}
      </aside>

      {/* Sidebar — Mobile (slide-in) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-[var(--sidebar-bg)] text-white flex flex-col transform transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/10 text-slate-400 hover:text-white hover:bg-white/20 transition-colors"
          aria-label="Close menu"
        >
          <SvgIcon d={icons.close} className="w-5 h-5" />
        </button>
        {sidebarContent}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-[260px] min-h-screen">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-[var(--surface-1)]/80 backdrop-blur-md border-b border-[var(--surface-3)] lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
            aria-label="Open menu"
          >
            <SvgIcon d={icons.menu} className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
          <span className="font-bold text-sm text-[var(--text-primary)]">
            SIP-DADES
          </span>
        </div>

        <div className="h-full">{children}</div>
      </main>
    </div>
  );
}
