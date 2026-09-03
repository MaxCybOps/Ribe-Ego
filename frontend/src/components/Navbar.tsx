'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, ShoppingBag, Store, ShieldAlert, Cpu } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/buyer', label: 'Buyer App (Emeka)', icon: ShoppingBag },
    { href: '/seller', label: 'Seller Portal (Oga Musa)', icon: Store },
    { href: '/admin', label: 'Platform Admin', icon: ShieldAlert },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-stone-800 bg-stone-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo & Tagline */}
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-stone-950 font-black text-xl shadow-lg shadow-amber-500/20">
            ₿
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-xl text-stone-100">
                RIBEÈGO
              </span>
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/30">
                Phase 0 Simulator
              </span>
            </div>
            <p className="text-xs text-stone-400 hidden sm:block">
              Bitcoin Lightning Wholesale Trade Marketplace
            </p>
          </div>
        </Link>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-stone-800 text-amber-400 border border-amber-500/30 shadow-sm'
                    : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Live Network Pill */}
        <div className="hidden md:flex items-center gap-2 text-xs font-mono bg-stone-900 px-3 py-1.5 rounded-full border border-stone-800 text-stone-300">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Lightning: Mock / Polar</span>
        </div>
      </div>
    </header>
  );
}
