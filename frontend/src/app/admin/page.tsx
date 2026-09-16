'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Activity, FileSpreadsheet, CheckCircle2, AlertTriangle, RefreshCw, Zap, Store, Layers } from 'lucide-react';
import { fetchApi, formatFiat, formatSats } from '../../lib/api';

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [rfqHealth, setRfqHealth] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ledger' | 'verification' | 'disputes'>('ledger');

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [platformStats, healthStats, ledgerEntries, sellerList] = await Promise.all([
        fetchApi('/admin/stats'),
        fetchApi('/admin/kpi/rfq-health'),
        fetchApi('/admin/ledger'),
        fetchApi('/admin/sellers'),
      ]);

      setStats(platformStats);
      setRfqHealth(healthStats);
      setLedger(ledgerEntries);
      setSellers(sellerList);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load admin metrics:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleVerifySeller = async (sellerId: string, status: string) => {
    try {
      await fetchApi(`/admin/sellers/${sellerId}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ status, notes: 'Verified by Platform Admin desk' }),
      });
      loadAdminData();
    } catch (err: any) {
      alert(`Verification error: ${err.message}`);
    }
  };

  const handleVerifyLocation = async (locationId: string, isVerified: boolean) => {
    try {
      await fetchApi(`/admin/locations/${locationId}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ isVerified }),
      });
      loadAdminData();
    } catch (err: any) {
      alert(`Location verification error: ${err.message}`);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-stone-900 to-stone-950 border border-stone-800 shadow-xl mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
              Platform Admin Console
            </span>
            <span className="text-xs text-stone-400 font-mono">Founders: Maxwell & Jovanny</span>
          </div>
          <h1 className="text-2xl font-black text-stone-100">Financial Ledger & Operations</h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Real-time settlement tracking, commission splits, and multi-location seller verification.
          </p>
        </div>

        <button
          onClick={loadAdminData}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-stone-100 text-xs font-semibold"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-2xl border border-stone-800 bg-stone-900/60">
          <div className="text-xs text-stone-400 font-medium">Gross GMV (Volume)</div>
          <div className="text-xl font-black text-amber-400 mt-1 font-mono">
            {formatSats(stats?.grossVolumeSats || 0)}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">Settled across all locations</div>
        </div>

        <div className="p-4 rounded-2xl border border-stone-800 bg-stone-900/60">
          <div className="text-xs text-stone-400 font-medium">Take-Rate Revenue (7%)</div>
          <div className="text-xl font-black text-emerald-400 mt-1 font-mono">
            {formatSats(stats?.totalCommissionSats || 0)}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">Platform retained earnings</div>
        </div>

        <div className="p-4 rounded-2xl border border-stone-800 bg-stone-900/60">
          <div className="text-xs text-stone-400 font-medium">RFQ Negotiation Health</div>
          <div className="text-xl font-black text-purple-400 mt-1 font-mono">
            ~{rfqHealth?.avgTimeToFirstOfferMinutes || 0} min
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">
            {rfqHealth?.rfqsWithOffers || 0} RFQs got offers (avg {rfqHealth?.avgOffersPerRfq || 0} each)
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-stone-800 bg-stone-900/60">
          <div className="text-xs text-stone-400 font-medium">Verification Backlog</div>
          <div className="text-xl font-black text-amber-400 mt-1 font-mono">
            {sellers.filter(s => s.verificationStatus === 'PENDING').length} Sellers
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">Awaiting manual approval</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-800 mb-6 gap-2 sm:gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'ledger'
              ? 'border-purple-400 text-purple-400'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Traceable Financial Ledger</span>
          <span className="text-xs bg-stone-900 px-2 py-0.5 rounded-full text-stone-400 font-mono">
            {ledger.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('verification')}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'verification'
              ? 'border-purple-400 text-purple-400'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          <span>Verification Queue</span>
          <span className="text-xs bg-stone-900 px-2 py-0.5 rounded-full text-stone-400 font-mono">
            {sellers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('disputes')}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'disputes'
              ? 'border-red-400 text-red-400'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          <span>Disputes</span>
        </button>
      </div>


      {/* Tab 1: Traceable Financial Ledger */}
      {activeTab === 'ledger' && (
        <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-6 overflow-x-auto">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-200">
              End-to-End Financial Audit Trail
            </h3>
            <span className="text-xs text-stone-400">
              Trace: Invoice $\rightarrow$ Payment Hash $\rightarrow$ Gross Sats $\rightarrow$ 7% Take $\rightarrow$ Location Payout
            </span>
          </div>

          <table className="w-full text-left text-xs text-stone-400">
            <thead className="bg-stone-950 text-stone-300 font-semibold border-b border-stone-800">
              <tr>
                <th className="py-3 px-3">Order / Time</th>
                <th className="py-3 px-3">Buyer</th>
                <th className="py-3 px-3">Fulfilling Location</th>
                <th className="py-3 px-3 font-mono">Gross Sats</th>
                <th className="py-3 px-3 font-mono text-emerald-400">7% Platform Fee</th>
                <th className="py-3 px-3 font-mono text-stone-100">Seller Net Payout</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Payment Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800 font-mono">
              {ledger.map((entry) => (
                <tr key={entry.id} className="hover:bg-stone-900/80">
                  <td className="py-3 px-3">
                    <div className="font-bold text-stone-200">{entry.order?.orderNumber}</div>
                    <div className="text-[10px] text-stone-500 font-sans">
                      {new Date(entry.createdAt).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-sans text-stone-300 font-medium">
                    {entry.order?.buyer?.name}
                  </td>
                  <td className="py-3 px-3 font-sans">
                    <div className="font-semibold text-stone-200">{entry.location?.name}</div>
                    <div className="text-[10px] text-stone-500">{entry.order?.seller?.businessName}</div>
                  </td>
                  <td className="py-3 px-3 text-amber-400 font-bold">
                    {formatSats(entry.grossSats)}
                  </td>
                  <td className="py-3 px-3 text-emerald-400 font-bold">
                    +{formatSats(entry.commissionSats)}
                  </td>
                  <td className="py-3 px-3 text-stone-100 font-bold">
                    {formatSats(entry.sellerNetSats)}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {entry.settlementStatus}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-[10px] text-stone-500" title={entry.transaction?.paymentHash}>
                    {entry.transaction?.paymentHash?.slice(0, 12)}...
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Sellers & Verification Queue */}
      {activeTab === 'verification' && (
        <div className="space-y-4">
          {sellers.map((s) => (
            <div key={s.id} className="rounded-2xl border border-stone-800 bg-stone-900/60 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-stone-100">{s.businessName}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                      s.verificationStatus === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {s.verificationStatus}
                    </span>
                  </div>
                  <div className="text-xs text-stone-400 mt-1">
                    Contact: {s.contactEmail} • {s.contactPhone} • Commission Take-Rate: {(s.commissionRate * 100).toFixed(0)}%
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {s.verificationStatus !== 'VERIFIED' && (
                    <button
                      onClick={() => handleVerifySeller(s.id, 'VERIFIED')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs"
                    >
                      Approve Seller
                    </button>
                  )}
                </div>
              </div>

              {/* Locations underneath this seller */}
              <div className="mt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">
                  Physical Locations ({s.locations?.length || 0})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {s.locations?.map((loc: any) => (
                    <div
                      key={loc.id}
                      className="p-3.5 rounded-xl border border-stone-800 bg-stone-950 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-200 text-xs">{loc.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-900 text-stone-400 font-mono">
                            {loc.type}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5">{loc.address}, {loc.city}</div>
                      </div>

                      <button
                        onClick={() => handleVerifyLocation(loc.id, !loc.isVerified)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono transition ${
                          loc.isVerified
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {loc.isVerified ? '✓ Verified' : 'Pending Verification'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Disputes */}
      {activeTab === 'disputes' && (
        <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-6">
          <h3 className="text-base font-bold text-stone-100 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <span>Active Disputes Queue</span>
          </h3>
          <div className="text-sm text-stone-400">
            No active disputes. Buyers or Sellers can flag settled orders for Admin review.
          </div>
        </div>
      )}
    </div>
  );
}
