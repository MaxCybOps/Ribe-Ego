import Link from 'next/link';
import { ShoppingBag, Store, ShieldAlert, Zap, ArrowRight, Layers, FileSpreadsheet, RefreshCw } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-4">
          <Zap className="h-3.5 w-3.5" />
          <span>Ribeègo Phase 0 Architecture Verification</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-stone-100">
          Wholesale Trade Marketplace,{' '}
          <span className="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
            Settled on Lightning
          </span>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-stone-400">
          Digitizing multi-location inventories, honest side-by-side RFQ negotiation, automatic stock-out ledgers, and sub-3-second Bitcoin Lightning settlement.
        </p>
      </div>

      {/* Surface Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Buyer Surface */}
        <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-6 flex flex-col justify-between hover:border-amber-500/40 transition">
          <div>
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 border border-blue-500/20">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-stone-100 mb-2">1. Buyer App</h2>
            <p className="text-xs text-stone-400 mb-4">
              Browse location-scoped fixed catalogs or post bulk RFQs fanning out to multiple stores/warehouses. Compare honest unranked offers and pay instantly via Lightning.
            </p>
            <div className="space-y-2 text-xs font-medium text-stone-300">
              <div className="flex items-center gap-2">✓ Fixed catalog with units of measure</div>
              <div className="flex items-center gap-2">✓ Broadcast RFQ to all locations</div>
              <div className="flex items-center gap-2">✓ Side-by-side unranked offer comparison</div>
              <div className="flex items-center gap-2">✓ 90-second rate-locked Lightning QR</div>
            </div>
          </div>
          <Link
            href="/buyer"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-stone-800 hover:bg-stone-700 py-2.5 px-4 text-xs font-bold text-stone-100 transition"
          >
            <span>Launch Buyer Experience</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Seller Surface */}
        <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-6 flex flex-col justify-between hover:border-amber-500/40 transition">
          <div>
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/20">
              <Store className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-stone-100 mb-2">2. Seller & Warehouse Portal</h2>
            <p className="text-xs text-stone-400 mb-4">
              Manage multi-location inventory (Storefront vs. Depot Warehouse), record stock-in events, respond to RFQ inboxes, and view live order fulfillment alerts.
            </p>
            <div className="space-y-2 text-xs font-medium text-stone-300">
              <div className="flex items-center gap-2">✓ Store vs Warehouse location switcher</div>
              <div className="flex items-center gap-2">✓ Stock-in audit trail & versioned pricing</div>
              <div className="flex items-center gap-2">✓ Location-level RFQ response inbox</div>
              <div className="flex items-center gap-2">✓ Automatic stock-out on payment</div>
            </div>
          </div>
          <Link
            href="/seller"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-2.5 px-4 text-xs font-bold text-stone-950 shadow-lg shadow-amber-500/20 transition"
          >
            <span>Launch Seller Portal</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Platform Admin Surface */}
        <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-6 flex flex-col justify-between hover:border-amber-500/40 transition">
          <div>
            <div className="h-12 w-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4 border border-purple-500/20">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-stone-100 mb-2">3. Platform Admin Console</h2>
            <p className="text-xs text-stone-400 mb-4">
              Maxwell & Jovanny's operations desk: seller & location verification, RFQ response health monitoring, and complete end-to-end financial transaction ledger audit.
            </p>
            <div className="space-y-2 text-xs font-medium text-stone-300">
              <div className="flex items-center gap-2">✓ Seller & Location verification scrutiny</div>
              <div className="flex items-center gap-2">✓ Immutable end-to-end ledger trace</div>
              <div className="flex items-center gap-2">✓ 7% Platform commission split tracking</div>
              <div className="flex items-center gap-2">✓ Node liquidity & dispute inspection</div>
            </div>
          </div>
          <Link
            href="/admin"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-stone-800 hover:bg-stone-700 py-2.5 px-4 text-xs font-bold text-stone-100 transition"
          >
            <span>Launch Admin Console</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Architecture Highlights */}
      <div className="mt-16 rounded-2xl border border-stone-800 bg-stone-900/40 p-8">
        <h3 className="text-lg font-bold text-stone-100 mb-4 flex items-center gap-2">
          <Layers className="h-5 w-5 text-amber-400" />
          <span>Phase 0 Core Engine Architecture</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-stone-400">
          <div>
            <h4 className="font-semibold text-stone-200 mb-1">Provider Abstraction Layer</h4>
            <p>
              Pluggable Lightning interface (`ILightningProvider`) supporting simulated instant test harness and Polar/LNbits local node integration without touching checkout logic.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-stone-200 mb-1">Idempotent Webhooks & Atomic Stock-Out</h4>
            <p>
              Webhook processing uses strict idempotency checking to prevent double-spending or duplicate stock deductions, automatically creating immutable `StockMovement` logs.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-stone-200 mb-1">Strict Location-Level Data Hierarchy</h4>
            <p>
              Inventory, stock movements, pricing, and RFQ offers operate strictly at the physical Location level under a parent Seller business entity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
