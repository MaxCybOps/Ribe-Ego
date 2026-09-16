'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Store, Layers, PlusCircle, Sparkles, Zap, DollarSign, Send, CheckCircle2, MapPin, Clock, RefreshCw, AlertCircle, Upload, ShieldCheck } from 'lucide-react';
import { fetchApi, formatFiat, formatSats, WS_BASE } from '../../lib/api';

export default function SellerPage() {
  const [seller, setSeller] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [activeLocationId, setActiveLocationId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'inventory' | 'rfq' | 'orders' | 'settlement'>('inventory');

  const [inventory, setInventory] = useState<any[]>([]);
  const [rfqInbox, setRfqInbox] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [stockLedger, setStockLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Stock-in modal state
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [stockInProduct, setStockInProduct] = useState<any>(null);
  const [stockInQuantity, setStockInQuantity] = useState(50);
  const [stockInBatch, setStockInBatch] = useState('TRUCK-DELIVERY-01');
  const [stockInNotes, setStockInNotes] = useState('Factory shipment intake');

  // RFQ quote state
  const [quotePrices, setQuotePrices] = useState<Record<string, { unitPrice: number; leadHours: number; notes: string }>>({});

  // Warehouse Pickup PIN verification state (keyed by orderId)
  const [pickupInputPins, setPickupInputPins] = useState<Record<string, string>>({});

  // CSV bulk import state
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState<string | null>(null);
  const csvFileRef = useRef<HTMLInputElement>(null);

  // 1. Initial Load: Oga Musa
  const loadSellerData = async () => {
    try {
      setLoading(true);
      const sellers = await fetchApi('/admin/sellers');
      const ogaMusa = sellers.find((s: any) => s.businessName.includes('Musa')) || sellers[0];
      setSeller(ogaMusa);
      setLocations(ogaMusa.locations || []);

      const initialLocId = activeLocationId || ogaMusa.locations[0]?.id;
      setActiveLocationId(initialLocId);

      if (initialLocId) {
        await loadLocationData(initialLocId);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error loading seller:', err);
      setLoading(false);
    }
  };

  const loadLocationData = async (locId: string) => {
    try {
      const [inv, rfqs, ords, ledger] = await Promise.all([
        fetchApi(`/inventory/location/${locId}`),
        fetchApi('/rfq/inbox'),
        fetchApi(`/orders/location/${locId}`),
        fetchApi(`/inventory/location/${locId}/ledger`),
      ]);
      setInventory(inv);
      setRfqInbox(rfqs);
      setOrders(ords);
      setStockLedger(ledger);
    } catch (err) {
      console.error('Error loading location details:', err);
    }
  };

  useEffect(() => {
    loadSellerData();
  }, []);

  // Switch location handler
  const handleLocationSwitch = (locId: string) => {
    setActiveLocationId(locId);
    loadLocationData(locId);
  };

  // Submit stock-in
  const handleStockInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockInProduct) return;
    try {
      await fetchApi('/inventory/stock-in', {
        method: 'POST',
        body: JSON.stringify({
          productId: stockInProduct.id,
          quantityDelta: Number(stockInQuantity),
          referenceId: stockInBatch,
          notes: stockInNotes,
        }),
      });
      setShowStockInModal(false);
      loadLocationData(activeLocationId);
    } catch (err: any) {
      alert(`Stock-in error: ${err.message}`);
    }
  };

  // Submit RFQ Quote
  const handleSubmitQuote = async (rfqId: string) => {
    const quote = quotePrices[rfqId];
    if (!quote || !quote.unitPrice) {
      alert('Please enter a unit price quote');
      return;
    }

    try {
      await fetchApi('/rfq/offers', {
        method: 'POST',
        body: JSON.stringify({
          requestId: rfqId,
          sellerId: seller.id,
          locationId: activeLocationId,
          unitPriceFiat: Number(quote.unitPrice),
          estimatedLeadTimeHours: Number(quote.leadHours || 4),
          notes: quote.notes || 'Available for immediate fulfillment',
        }),
      });
      alert('Offer submitted successfully to the buyer!');
      loadLocationData(activeLocationId);
    } catch (err: any) {
      alert(`Quote error: ${err.message}`);
    }
  };

  // Update order fulfillment status
  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      await fetchApi(`/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      loadLocationData(activeLocationId);
    } catch (err: any) {
      alert(`Status update error: ${err.message}`);
    }
  };

  // Verify Warehouse Pickup PIN — marks order COMPLETED on match
  const handleVerifyPickupPin = async (orderId: string) => {
    const pin = pickupInputPins[orderId]?.trim();
    if (!pin || pin.length !== 6) {
      alert('Please enter the 6-digit pickup verification PIN');
      return;
    }
    try {
      await fetchApi(`/orders/${orderId}/verify-pickup`, {
        method: 'POST',
        body: JSON.stringify({ pin, verifiedBy: seller?.id }),
      });
      setPickupInputPins((prev) => ({ ...prev, [orderId]: '' }));
      loadLocationData(activeLocationId);
    } catch (err: any) {
      alert(`PIN verification failed: ${err.message}`);
    }
  };

  // CSV Bulk Inventory Import
  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeLocationId) return;
    setCsvImporting(true);
    setCsvResult(null);
    try {
      const csvContent = await file.text();
      const res = await fetchApi('/inventory/import-csv', {
        method: 'POST',
        body: JSON.stringify({ locationId: activeLocationId, csvContent, recordedBy: seller?.id }),
      });
      setCsvResult(`✓ Imported ${res.count} product(s) from CSV`);
      loadLocationData(activeLocationId);
    } catch (err: any) {
      setCsvResult(`✗ Import failed: ${err.message}`);
    } finally {
      setCsvImporting(false);
      if (csvFileRef.current) csvFileRef.current.value = '';
    }
  };

  const activeLoc = locations.find((l) => l.id === activeLocationId);


  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Seller Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-stone-900 to-stone-950 border border-stone-800 shadow-xl mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              Seller & Warehouse Portal
            </span>
            <span className="text-xs text-stone-400 font-mono">
              Commission Take-Rate: {(seller?.commissionRate * 100).toFixed(0)}%
            </span>
          </div>
          <h1 className="text-2xl font-black text-stone-100">{seller?.businessName}</h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Independent physical locations, stock-in ledgers, and Lightning payouts.
          </p>
        </div>

        {/* Location Switcher */}
        <div className="flex items-center gap-2 bg-stone-900 p-1.5 rounded-xl border border-stone-800">
          <Store className="h-4 w-4 text-emerald-400 ml-2" />
          <span className="text-xs font-semibold text-stone-400">Location:</span>
          <select
            value={activeLocationId}
            onChange={(e) => handleLocationSwitch(e.target.value)}
            className="rounded-lg bg-stone-950 px-3 py-1.5 text-xs font-bold text-stone-100 border border-stone-700 focus:outline-none focus:border-emerald-500"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name} ({loc.type})
              </option>
            ))}
          </select>
          <button
            onClick={() => loadLocationData(activeLocationId)}
            className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-800 mb-6 gap-2 sm:gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'inventory'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Location Inventory & Stock</span>
          <span className="text-xs bg-stone-900 px-2 py-0.5 rounded-full text-stone-400 font-mono">
            {inventory.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('rfq')}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'rfq'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>RFQ Inbound Quotes Inbox</span>
          <span className="text-xs bg-stone-900 px-2 py-0.5 rounded-full text-stone-400 font-mono">
            {rfqInbox.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'orders'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <Zap className="h-4 w-4" />
          <span>Live Order Fulfillment Queue</span>
          <span className="text-xs bg-stone-900 px-2 py-0.5 rounded-full text-stone-400 font-mono">
            {orders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('settlement')}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'settlement'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <DollarSign className="h-4 w-4" />
          <span>Settlement & Payouts</span>
        </button>

        <button
          onClick={() => setActiveTab('settings' as any)}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === ('settings' as any)
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Settings & Locations</span>
        </button>
      </div>

      {/* Tab 1: Inventory & Stock Movements */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-stone-200">
                Active Stock at <span className="text-emerald-400">{activeLoc?.name}</span>
              </h3>
              <p className="text-xs text-stone-400">Automatic stock-out deducts on confirmed payment</p>
            </div>

            {/* CSV Bulk Import Control */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs font-bold text-stone-200 cursor-pointer transition">
                <Upload className="h-3.5 w-3.5 text-amber-400" />
                <span>{csvImporting ? 'Importing…' : 'Import CSV'}</span>
                <input
                  ref={csvFileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleCsvImport}
                  disabled={csvImporting}
                />
              </label>
            </div>
          </div>

          {/* CSV result toast */}
          {csvResult && (
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border ${
              csvResult.startsWith('✓')
                ? 'bg-emerald-950/50 border-emerald-800 text-emerald-400'
                : 'bg-red-950/50 border-red-800 text-red-400'
            }`}>
              {csvResult.startsWith('✓') ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <span>{csvResult}</span>
              <button className="ml-auto text-stone-400 hover:text-stone-200" onClick={() => setCsvResult(null)}>✕</button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {inventory.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-stone-800 bg-stone-900/60 p-5 flex flex-col justify-between"
              >

                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-stone-400 uppercase font-mono">{item.category}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-400 font-mono text-[11px] font-bold">
                      {item.currentStock} {item.unitOfMeasure.toLowerCase()}s in stock
                    </span>
                  </div>
                  <h4 className="font-bold text-stone-100 text-base">{item.title}</h4>
                  <p className="text-xs text-stone-400 mt-1 line-clamp-2">{item.description}</p>
                </div>

                <div className="mt-5 pt-4 border-t border-stone-800 flex items-center justify-between">
                  <div>
                    <div className="text-base font-black text-amber-400 font-mono">
                      {formatFiat(item.currentUnitPriceFiat)}
                    </div>
                    <div className="text-[10px] text-stone-500">Unit: {item.unitOfMeasure}</div>
                  </div>

                  <button
                    onClick={() => {
                      setStockInProduct(item);
                      setShowStockInModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 transition"
                  >
                    <PlusCircle className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Stock-In Intake</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Stock Movement Audit Log */}
          <div className="mt-10 rounded-2xl border border-stone-800 bg-stone-900/40 p-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-300 mb-4">
              Immutable Stock Movement Ledger ({activeLoc?.name})
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-400">
                <thead className="bg-stone-950/80 text-stone-300 font-semibold border-b border-stone-800">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3">Movement Type</th>
                    <th className="py-2.5 px-3">Delta</th>
                    <th className="py-2.5 px-3">Balance After</th>
                    <th className="py-2.5 px-3">Reference / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60 font-mono">
                  {stockLedger.map((m) => (
                    <tr key={m.id} className="hover:bg-stone-900/60">
                      <td className="py-2 px-3">{new Date(m.createdAt).toLocaleTimeString()}</td>
                      <td className="py-2 px-3 font-sans text-stone-200 font-medium">{m.product?.title}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.type === 'STOCK_IN' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {m.type}
                        </span>
                      </td>
                      <td className={`py-2 px-3 font-bold ${m.quantityDelta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta}
                      </td>
                      <td className="py-2 px-3 text-stone-200 font-bold">{m.balanceAfter}</td>
                      <td className="py-2 px-3 font-sans text-stone-400">{m.notes} ({m.referenceId})</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: RFQ Inbound Inbox */}
      {activeTab === 'rfq' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-200">
              Open Buyer Requests Fan-Out ({rfqInbox.length})
            </h3>
            <p className="text-xs text-stone-400">Respond with a competitive price quote from this location</p>
          </div>

          {rfqInbox.map((rfq) => {
            const currentQuote = quotePrices[rfq.id] || { unitPrice: 0, leadHours: 4, notes: '' };
            const myLocationOffer = rfq.offers?.find((o: any) => o.locationId === activeLocationId);

            return (
              <div key={rfq.id} className="rounded-2xl border border-stone-800 bg-stone-900/70 p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-stone-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold font-mono">
                        {rfq.quantity} {rfq.unitOfMeasure}s
                      </span>
                      <span className="text-xs text-stone-400 uppercase font-mono">{rfq.category}</span>
                    </div>
                    <h3 className="text-lg font-bold text-stone-100 mt-1">{rfq.title}</h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Requested by: <strong className="text-stone-300">{rfq.buyer?.name}</strong> • Method: {rfq.deliveryPreference}
                    </p>
                  </div>

                  {myLocationOffer ? (
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs">
                      <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Quote Submitted: {formatFiat(myLocationOffer.totalPriceFiat)}</span>
                      </div>
                      <div className="text-[11px] text-stone-400 mt-1">
                        Status: <strong className="font-mono text-stone-200">{myLocationOffer.status}</strong> (~{myLocationOffer.estimatedLeadTimeHours}h lead)
                      </div>
                    </div>
                  ) : (
                    <div className="w-full sm:w-80 bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-3">
                      <h4 className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                        <Send className="h-3.5 w-3.5 text-amber-400" />
                        <span>Submit Quote from {activeLoc?.name}</span>
                      </h4>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-stone-400 mb-1">Unit Price (Fiat)</label>
                          <input
                            type="number"
                            placeholder="8200"
                            value={currentQuote.unitPrice || ''}
                            onChange={(e) =>
                              setQuotePrices({
                                ...quotePrices,
                                [rfq.id]: { ...currentQuote, unitPrice: Number(e.target.value) },
                              })
                            }
                            className="w-full rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-1.5 text-xs text-stone-100 font-mono focus:border-amber-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-stone-400 mb-1">Lead Time (Hours)</label>
                          <input
                            type="number"
                            placeholder="4"
                            value={currentQuote.leadHours || ''}
                            onChange={(e) =>
                              setQuotePrices({
                                ...quotePrices,
                                [rfq.id]: { ...currentQuote, leadHours: Number(e.target.value) },
                              })
                            }
                            className="w-full rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-1.5 text-xs text-stone-100 font-mono focus:border-amber-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => handleSubmitQuote(rfq.id)}
                        className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md transition"
                      >
                        Send Quote ({formatFiat(Number(currentQuote.unitPrice || 0) * rfq.quantity)})
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 3: Live Order Queue */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-200">
              Paid Order Queue for <span className="text-emerald-400">{activeLoc?.name}</span>
            </h3>
            <p className="text-xs text-stone-400">Paid orders require fulfillment status progression</p>
          </div>

          {orders.map((ord) => (
            <div
              key={ord.id}
              className="rounded-2xl border border-stone-800 bg-stone-900/70 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-amber-400">{ord.orderNumber}</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                    ord.status === 'PAID' || ord.status === 'READY' || ord.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-stone-800 text-stone-400'
                  }`}>
                    {ord.status}
                  </span>
                  <span className="text-xs text-stone-400">Buyer: {ord.buyer?.name}</span>
                </div>
                <div className="text-sm font-bold text-stone-200">
                  {ord.items?.map((i: any) => `${i.quantity}x ${i.itemTitle} (${i.unitOfMeasure})`).join(', ')}
                </div>
                <div className="text-xs text-stone-500 mt-1">
                  Fulfillment: {ord.fulfillmentType} • {new Date(ord.createdAt).toLocaleTimeString()}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="text-right">
                  <div className="text-base font-black text-amber-400 font-mono">
                    {ord.totalSats > 0 ? formatSats(ord.totalSats) : formatFiat(ord.totalFiat)}
                  </div>
                  <div className="text-xs text-stone-500 font-mono">
                    Net: {formatSats(Math.round((ord.totalSats || 0) * (1 - (seller?.commissionRate || 0.07))))}
                  </div>
                </div>

                {/* Warehouse Pickup Verification PIN Flow */}
                {ord.fulfillmentType === 'PICKUP' && ord.status !== 'COMPLETED' && (
                  <div className="flex items-center gap-1.5 bg-stone-950 p-1.5 rounded-xl border border-stone-800">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="6-digit PIN"
                      value={pickupInputPins[ord.id] || ''}
                      onChange={(e) =>
                        setPickupInputPins({ ...pickupInputPins, [ord.id]: e.target.value })
                      }
                      className="w-24 text-center font-mono font-bold text-xs bg-stone-900 border border-stone-700 rounded-lg px-2 py-1.5 text-amber-400 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      onClick={() => handleVerifyPickupPin(ord.id)}
                      className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-lg shadow-sm"
                    >
                      Verify Release
                    </button>
                  </div>
                )}

                {/* Fulfillment Status Toggle for Non-Pickup or Standard Flow */}
                {ord.status === 'PAID' && (
                  <button
                    onClick={() => handleUpdateOrderStatus(ord.id, 'PREPARING')}
                    className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-200 border border-stone-700"
                  >
                    Start Preparing
                  </button>
                )}
                {ord.status === 'PREPARING' && (
                  <button
                    onClick={() => handleUpdateOrderStatus(ord.id, 'READY')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-stone-950"
                  >
                    Mark Ready
                  </button>
                )}
                {ord.status === 'READY' && ord.fulfillmentType !== 'PICKUP' && (
                  <button
                    onClick={() => handleUpdateOrderStatus(ord.id, 'COMPLETED')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-stone-950"
                  >
                    Complete Order
                  </button>
                )}
                {ord.status === 'COMPLETED' && (
                  <span className="text-xs text-emerald-400 font-bold px-2 py-1 bg-emerald-950/60 rounded border border-emerald-800">
                    ✓ Handed Over
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: Settlement & Payouts */}
      {activeTab === 'settlement' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl border border-stone-800 bg-stone-900/60">
              <div className="text-xs text-stone-400 font-medium">Payout Method</div>
              <div className="text-lg font-bold text-stone-100 mt-1 font-mono">{seller?.payoutMethod}</div>
              <div className="text-xs text-stone-500 mt-1 truncate">{seller?.payoutDestination}</div>
            </div>

            <div className="p-5 rounded-2xl border border-stone-800 bg-stone-900/60">
              <div className="text-xs text-stone-400 font-medium">Platform Fee Deduction</div>
              <div className="text-lg font-bold text-amber-400 mt-1 font-mono">
                {(seller?.commissionRate * 100).toFixed(0)}% Take-Rate
              </div>
              <div className="text-xs text-stone-500 mt-1">Deducted automatically at settlement</div>
            </div>

            <div className="p-5 rounded-2xl border border-stone-800 bg-stone-900/60">
              <div className="text-xs text-stone-400 font-medium">Settlement Schedule</div>
              <div className="text-lg font-bold text-emerald-400 mt-1">Platform-Mediated</div>
              <div className="text-xs text-stone-500 mt-1">Zero Bitcoin knowledge required for seller</div>
            </div>
          </div>
        </div>
      )}

      {/* Stock In Modal */}
      {showStockInModal && stockInProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-stone-800 bg-stone-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-emerald-400" />
                <span>Log Stock-In Event</span>
              </h3>
              <button onClick={() => setShowStockInModal(false)} className="text-stone-400 text-lg font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleStockInSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <span className="text-stone-400">Product:</span>
                <p className="text-sm font-bold text-stone-200 mt-0.5">{stockInProduct.title}</p>
                <p className="text-[11px] text-stone-500">Current Stock: {stockInProduct.currentStock} ({stockInProduct.unitOfMeasure})</p>
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">
                  Quantity to Add ({stockInProduct.unitOfMeasure}) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={stockInQuantity}
                  onChange={(e) => setStockInQuantity(Number(e.target.value))}
                  className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-stone-100 font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">Reference / Voucher ID</label>
                <input
                  type="text"
                  value={stockInBatch}
                  onChange={(e) => setStockInBatch(e.target.value)}
                  className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-stone-100 font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">Intake Notes</label>
                <input
                  type="text"
                  value={stockInNotes}
                  onChange={(e) => setStockInNotes(e.target.value)}
                  className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3 py-2 text-stone-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-stone-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowStockInModal(false)}
                  className="px-4 py-2 text-stone-400 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold"
                >
                  Commit Stock-In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab 5: Settings & Locations */}
      {activeTab === ('settings' as any) && (
        <div className="space-y-6">
          {/* Business Info */}
          <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-6">
            <h3 className="text-sm font-bold text-stone-200 mb-4 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Business & Verification Status
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <div className="text-stone-400 mb-1">Business Name</div>
                <div className="font-bold text-stone-100">{seller?.businessName}</div>
              </div>
              <div>
                <div className="text-stone-400 mb-1">Contact Email</div>
                <div className="font-bold text-stone-100">{seller?.contactEmail}</div>
              </div>
              <div>
                <div className="text-stone-400 mb-1">Verification Status</div>
                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono ${
                  seller?.verificationStatus === 'VERIFIED'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {seller?.verificationStatus}
                </span>
              </div>
              <div>
                <div className="text-stone-400 mb-1">Commission Rate</div>
                <div className="font-bold text-amber-400 font-mono">{((seller?.commissionRate || 0.07) * 100).toFixed(0)}%</div>
              </div>
            </div>
          </div>

          {/* My Locations */}
          <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-6">
            <h3 className="text-sm font-bold text-stone-200 mb-4 flex items-center gap-2">
              <Store className="h-4 w-4 text-emerald-400" />
              My Physical Locations ({locations.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {locations.map((loc) => (
                <div key={loc.id} className="p-4 rounded-xl bg-stone-950 border border-stone-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-stone-100 text-sm">{loc.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-400 font-mono">{loc.type}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                        loc.isVerified ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {loc.isVerified ? '✓ Verified' : 'Pending'}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-stone-500">{loc.address}, {loc.city}</div>
                </div>
              ))}
            </div>

            {/* Add New Location */}
            <AddLocationForm sellerId={seller?.id} onAdded={loadSellerData} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Add New Location Form ───────────────────────────────────────────────────

function AddLocationForm({ sellerId, onAdded }: { sellerId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'STORE' | 'WAREHOUSE'>('STORE');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerId) return;
    setSaving(true);
    try {
      await fetchApi(`/sellers/${sellerId}/locations`, {
        method: 'POST',
        body: JSON.stringify({ name, type, address, city, contactPhone: phone }),
      });
      setOpen(false);
      setName(''); setAddress(''); setCity(''); setPhone('');
      onAdded();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold border border-stone-700 transition"
      >
        <PlusCircle className="h-4 w-4 text-emerald-400" />
        Add New Location / Warehouse
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 p-4 rounded-xl bg-stone-950 border border-stone-700 space-y-3">
      <h4 className="text-sm font-bold text-stone-100">Add New Location</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-stone-400 mb-1">Location Name</label>
          <input
            required value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Alaba Depot Warehouse"
            className="w-full rounded-lg bg-stone-900 border border-stone-700 px-3 py-2 text-xs text-stone-100 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-400 mb-1">Type</label>
          <select
            value={type} onChange={e => setType(e.target.value as any)}
            className="w-full rounded-lg bg-stone-900 border border-stone-700 px-3 py-2 text-xs text-stone-100 focus:border-emerald-500 focus:outline-none"
          >
            <option value="STORE">STORE</option>
            <option value="WAREHOUSE">WAREHOUSE</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-stone-400 mb-1">Street Address</label>
          <input
            required value={address} onChange={e => setAddress(e.target.value)}
            placeholder="e.g. 14 Eko Road"
            className="w-full rounded-lg bg-stone-900 border border-stone-700 px-3 py-2 text-xs text-stone-100 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-stone-400 mb-1">City</label>
          <input
            required value={city} onChange={e => setCity(e.target.value)}
            placeholder="e.g. Lagos"
            className="w-full rounded-lg bg-stone-900 border border-stone-700 px-3 py-2 text-xs text-stone-100 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-stone-400 mb-1">Contact Phone</label>
          <input
            required value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="+234 800 000 0000"
            className="w-full rounded-lg bg-stone-900 border border-stone-700 px-3 py-2 text-xs text-stone-100 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-stone-400 font-semibold px-3 py-1.5">Cancel</button>
        <button type="submit" disabled={saving} className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-bold">
          {saving ? 'Submitting…' : 'Submit for Verification'}
        </button>
      </div>
    </form>
  );
}
