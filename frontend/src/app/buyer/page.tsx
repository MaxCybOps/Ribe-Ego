'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingBag, Sparkles, Zap, MapPin, Clock, CheckCircle2, ChevronRight, RefreshCw, FileText, ArrowRight, AlertTriangle } from 'lucide-react';
import { fetchApi, formatFiat, formatSats } from '../../lib/api';
import { calculateDistanceKm } from '../../lib/geo';
import { RfqModal } from '../../components/RfqModal';
import { LightningModal } from '../../components/LightningModal';
import { ReceiptModal } from '../../components/ReceiptModal';

// Mock buyer coordinates (e.g., Ikeja, Lagos) for Haversine distance
const BUYER_COORDS = { lat: 6.6018, lon: 3.3515 };

export default function BuyerPage() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'rfq' | 'orders'>('catalog');
  const [buyer, setBuyer] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);

  const [rfqs, setRfqs] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedRfqOffers, setSelectedRfqOffers] = useState<any>(null);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showRfqModal, setShowRfqModal] = useState(false);
  const [activeCheckoutOrderId, setActiveCheckoutOrderId] = useState<string | null>(null);

  // 1. Load initial buyer persona (Emeka)
  const loadData = async () => {
    try {
      setLoading(true);
      const users = await fetchApi('/auth/users');
      const emeka = users.find((u: any) => u.role === 'BUYER') || users[0];
      setBuyer(emeka);

      const [prods, buyerRfqs, buyerOrders] = await Promise.all([
        fetchApi('/catalog/products'),
        fetchApi(`/rfq/buyer/${emeka.id}`),
        fetchApi(`/orders/buyer/${emeka.id}`),
      ]);

      setProducts(prods);
      setRfqs(buyerRfqs);
      setOrders(buyerOrders);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load buyer data:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Direct catalog buy
  const handleDirectBuy = async (product: any) => {
    if (!buyer) return;
    try {
      const order = await fetchApi('/orders/direct', {
        method: 'POST',
        body: JSON.stringify({
          buyerId: buyer.id,
          locationId: product.locationId,
          items: [{ productId: product.id, quantity: 10 }],
          fulfillmentType: 'PICKUP',
        }),
      });
      setActiveCheckoutOrderId(order.id);
    } catch (err: any) {
      alert(`Order error: ${err.message}`);
    }
  };

  // Flag an order for dispute
  const handleFlagDispute = async (orderId: string, orderNumber: string) => {
    const notes = prompt(`Flag order ${orderNumber} for dispute?\n\nDescribe the issue:`);
    if (!notes) return;
    try {
      await fetchApi(`/orders/${orderId}/dispute`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
      });
      alert('Order flagged for Admin review. Our team will reach out within 24 hours.');
      loadData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // View RFQ offers
  const handleViewOffers = async (rfqId: string) => {
    try {
      const data = await fetchApi(`/rfq/${rfqId}/offers`);
      setSelectedRfqOffers(data);
    } catch (err: any) {
      alert(`Error fetching offers: ${err.message}`);
    }
  };

  // Accept offer
  const handleAcceptOffer = async (offerId: string) => {
    if (!buyer) return;
    try {
      const result = await fetchApi(`/rfq/offers/${offerId}/accept`, {
        method: 'POST',
        body: JSON.stringify({ buyerId: buyer.id }),
      });
      setSelectedRfqOffers(null);
      await loadData();
      setActiveCheckoutOrderId(result.order.id);
    } catch (err: any) {
      alert(`Error accepting offer: ${err.message}`);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Buyer Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-stone-900 to-stone-950 border border-stone-800 shadow-xl mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              Buyer Experience
            </span>
            <span className="text-xs text-stone-400 font-mono">Persona: Emeka the Contractor</span>
          </div>
          <h1 className="text-2xl font-black text-stone-100">Wholesale Sourcing & Settle</h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Buy bulk construction materials at listed prices or post RFQs for competing location quotes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowRfqModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition"
          >
            <Sparkles className="h-4 w-4 fill-stone-950" />
            <span>Post Bulk RFQ</span>
          </button>
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-800 mb-6 gap-2 sm:gap-6">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'catalog'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <ShoppingBag className="h-4 w-4" />
          <span>Fixed-Price Catalog</span>
          <span className="text-xs bg-stone-900 px-2 py-0.5 rounded-full text-stone-400 font-mono">
            {products.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('rfq')}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'rfq'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>My RFQ Negotiations</span>
          <span className="text-xs bg-stone-900 px-2 py-0.5 rounded-full text-stone-400 font-mono">
            {rfqs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'orders'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Digital Receipts & Orders</span>
          <span className="text-xs bg-stone-900 px-2 py-0.5 rounded-full text-stone-400 font-mono">
            {orders.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Fixed Catalog */}
      {activeTab === 'catalog' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((prod) => (
            <div
              key={prod.id}
              className="rounded-2xl border border-stone-800 bg-stone-900/60 p-5 flex flex-col justify-between hover:border-stone-700 transition"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-stone-400 mb-2">
                  <span className="font-semibold text-amber-400">{prod.category.replace('_', ' ')}</span>
                  <span className="px-2 py-0.5 rounded bg-stone-800 text-stone-300 font-mono text-[10px]">
                    Unit: {prod.unitOfMeasure}
                  </span>
                </div>
                <h3 className="font-bold text-stone-100 text-base">{prod.title}</h3>
                <p className="text-xs text-stone-400 mt-1 line-clamp-2">{prod.description}</p>

                {/* Location Badge */}
                <div className="mt-4 p-2.5 rounded-xl bg-stone-950/80 border border-stone-800/80 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-stone-300 font-medium">
                      <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <span>{prod.location?.name}</span>
                    </div>
                    {prod.location?.latitude && prod.location?.longitude && (
                      <span className="text-[10px] font-mono text-emerald-400">
                        {calculateDistanceKm(
                          BUYER_COORDS.lat, BUYER_COORDS.lon,
                          prod.location.latitude, prod.location.longitude
                        )} km
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5 pl-5">
                    {prod.location?.seller?.businessName} • Stock: {prod.currentStock} {prod.unitOfMeasure.toLowerCase()}s
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-stone-800 flex items-center justify-between">
                <div>
                  <div className="text-lg font-black text-amber-400 font-mono">
                    {formatFiat(prod.currentUnitPriceFiat)}
                  </div>
                  <div className="text-[10px] text-stone-500">per {prod.unitOfMeasure.toLowerCase()}</div>
                </div>

                <button
                  onClick={() => handleDirectBuy(prod)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-semibold text-xs border border-stone-700 transition"
                >
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  <span>Buy 10 ({prod.unitOfMeasure})</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: RFQs & Side-by-Side Offers */}
      {activeTab === 'rfq' && (
        <div className="space-y-6">
          {rfqs.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-stone-800 rounded-2xl">
              <Sparkles className="h-10 w-10 text-amber-500/50 mx-auto mb-3" />
              <h3 className="font-bold text-stone-200">No active RFQs posted yet</h3>
              <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                Post a bulk request to see competing offers from stores and bulk warehouses across sellers.
              </p>
              <button
                onClick={() => setShowRfqModal(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs"
              >
                Post Your First RFQ
              </button>
            </div>
          ) : (
            rfqs.map((rfq) => (
              <div key={rfq.id} className="rounded-2xl border border-stone-800 bg-stone-900/70 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                        rfq.status === 'AWARDED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {rfq.status}
                      </span>
                      <span className="text-xs text-stone-400 font-mono">
                        Quantity: {rfq.quantity} {rfq.unitOfMeasure}s
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-stone-100 mt-1">{rfq.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-stone-400 mt-1">
                      <span>🚚 Method: {rfq.deliveryPreference}</span>
                      <span>📍 Dest: {rfq.targetDeliveryLocation || 'Pickup'}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleViewOffers(rfq.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-bold text-amber-400 border border-stone-700 transition"
                  >
                    <span>View Competing Offers ({rfq.offers?.length || 0})</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Side-by-Side Honest Neutral Offer Comparison */}
                {selectedRfqOffers && selectedRfqOffers.rfq.id === rfq.id && (
                  <div className="mt-6 pt-2">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-300">
                        Competing Location Offers (Side-by-Side • No Auto-Ranking)
                      </h4>
                      <span className="text-[11px] text-stone-400">
                        {selectedRfqOffers.offers.length} responses received
                      </span>
                    </div>

                    {selectedRfqOffers.offers.length === 0 ? (
                      <p className="text-xs text-stone-500 italic py-4">Waiting for eligible locations to submit quotes...</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedRfqOffers.offers.map((offer: any, idx: number) => (
                          <div
                            key={offer.id}
                            className={`rounded-xl border p-4 flex flex-col justify-between transition ${
                              offer.status === 'ACCEPTED'
                                ? 'border-emerald-500/60 bg-emerald-950/20'
                                : 'border-stone-700 bg-stone-950/80 hover:border-amber-500/40'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between text-xs mb-2">
                                <span className="font-bold text-stone-200">
                                  {offer.location?.name} ({offer.location?.type})
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                                  offer.status === 'ACCEPTED'
                                    ? 'bg-emerald-500 text-stone-950'
                                    : 'bg-stone-800 text-stone-400'
                                }`}>
                                  {offer.status}
                                </span>
                              </div>
                              <p className="text-xs text-stone-400">{offer.seller?.businessName}</p>
                              <div className="text-xs text-stone-500 flex items-center justify-between mt-1">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-amber-400" />
                                  {offer.location?.address}, {offer.location?.city}
                                </span>
                                {offer.location?.latitude && offer.location?.longitude && (
                                  <span className="font-mono text-emerald-400">
                                    {calculateDistanceKm(
                                      BUYER_COORDS.lat, BUYER_COORDS.lon,
                                      offer.location.latitude, offer.location.longitude
                                    )} km away
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-stone-400 flex items-center gap-1 mt-1">
                                <Clock className="h-3 w-3 text-amber-400" />
                                <span>Lead Time: ~{offer.estimatedLeadTimeHours} hours</span>
                              </p>
                              {offer.notes && (
                                <p className="text-xs text-stone-400 mt-2 bg-stone-900 p-2 rounded border border-stone-800">
                                  "{offer.notes}"
                                </p>
                              )}
                            </div>

                            <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between">
                              <div>
                                <div className="text-base font-black text-amber-400 font-mono">
                                  {formatFiat(offer.totalPriceFiat)}
                                </div>
                                <div className="text-[10px] text-stone-500">
                                  ({formatFiat(offer.unitPriceFiat)} / {rfq.unitOfMeasure.toLowerCase()})
                                </div>
                              </div>

                              {rfq.status === 'OPEN' && offer.status === 'SUBMITTED' && (
                                <button
                                  onClick={() => handleAcceptOffer(offer.id)}
                                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>Accept & Pay</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Digital Receipts & Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-stone-800 rounded-2xl">
              <FileText className="h-10 w-10 text-stone-600 mx-auto mb-3" />
              <h3 className="font-bold text-stone-200">No orders yet</h3>
              <p className="text-xs text-stone-400 mt-1">Completed purchases will show permanent digital receipts here.</p>
            </div>
          ) : (
            orders.map((ord) => (
              <div
                key={ord.id}
                className="rounded-2xl border border-stone-800 bg-stone-900/70 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-amber-400">{ord.orderNumber}</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                      ord.status === 'PAID' || ord.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {ord.status}
                    </span>
                    <span className="text-xs text-stone-500 font-mono">
                      {new Date(ord.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-stone-200">
                    {ord.items?.map((i: any) => `${i.quantity}x ${i.itemTitle} (${i.unitOfMeasure})`).join(', ')}
                  </div>
                  <div className="text-xs text-stone-400 mt-1 flex items-center gap-2">
                    <span>Fulfilling Location: <strong className="text-stone-300">{ord.location?.name}</strong></span>
                    <span>• {ord.fulfillmentType}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-base font-black text-amber-400 font-mono">
                      {ord.totalSats > 0 ? formatSats(ord.totalSats) : formatFiat(ord.totalFiat)}
                    </div>
                    <div className="text-xs text-stone-500 font-mono">
                      ≈ {formatFiat(ord.totalFiat)}
                    </div>
                  </div>

                  {ord.status === 'PENDING_PAYMENT' ? (
                    <button
                      onClick={() => setActiveCheckoutOrderId(ord.id)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      <span>Pay Lightning</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedReceiptOrder(ord)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs border border-stone-700 transition"
                      >
                        <FileText className="h-3.5 w-3.5 text-amber-400" />
                        <span>View Receipt</span>
                      </button>
                      {(ord.status === 'COMPLETED' || ord.status === 'PAID') && !ord.disputeFlag && (
                        <button
                          onClick={() => handleFlagDispute(ord.id, ord.orderNumber)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs border border-red-500/20 transition"
                          title="Flag order for dispute"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Flag Issue</span>
                        </button>
                      )}
                      {ord.disputeFlag && (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 font-mono">
                          ⚠ Under Review
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* RFQ Creation Modal */}
      {showRfqModal && buyer && (
        <RfqModal
          buyerId={buyer.id}
          onClose={() => setShowRfqModal(false)}
          onCreated={(newRfq) => {
            setShowRfqModal(false);
            setActiveTab('rfq');
            loadData();
          }}
        />
      )}

      {/* Lightning Checkout Modal */}
      {activeCheckoutOrderId && (
        <LightningModal
          orderId={activeCheckoutOrderId}
          onClose={() => setActiveCheckoutOrderId(null)}
          onSettled={() => {
            setActiveCheckoutOrderId(null);
            loadData();
            setActiveTab('orders');
          }}
        />
      )}

      {/* Printable Receipt Modal */}
      {selectedReceiptOrder && (
        <ReceiptModal
          order={selectedReceiptOrder}
          onClose={() => setSelectedReceiptOrder(null)}
        />
      )}
    </div>
  );
}
