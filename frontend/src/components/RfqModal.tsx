'use client';

import React, { useState } from 'react';
import { Send, AlertCircle, Sparkles } from 'lucide-react';
import { fetchApi } from '../lib/api';

interface RfqModalProps {
  buyerId: string;
  onClose: () => void;
  onCreated: (rfq: any) => void;
}

export function RfqModal({ buyerId, onClose, onCreated }: RfqModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('BUILDING_MATERIALS');
  const [quantity, setQuantity] = useState(50);
  const [unitOfMeasure, setUnitOfMeasure] = useState('BAG');
  const [targetLocation, setTargetLocation] = useState('Lekki Phase 2 Site, Lagos');
  const [deliveryPreference, setDeliveryPreference] = useState<'PICKUP' | 'SELLER_DELIVERY'>('PICKUP');
  const [deadlineHours, setDeadlineHours] = useState(24);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const rfq = await fetchApi('/rfq', {
        method: 'POST',
        body: JSON.stringify({
          buyerId,
          title,
          category,
          quantity: Number(quantity),
          unitOfMeasure,
          targetDeliveryLocation: targetLocation,
          deliveryPreference,
          deadlineHours: Number(deadlineHours),
        }),
      });
      onCreated(rfq);
    } catch (err: any) {
      setError(err.message || 'Failed to post RFQ');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl border border-stone-800 bg-stone-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div>
            <h3 className="text-lg font-bold text-stone-100 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-400" />
              <span>Post Request-for-Quote (RFQ)</span>
            </h3>
            <p className="text-xs text-stone-400">
              Fans out directly to every eligible store and warehouse location across sellers.
            </p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-200 text-lg font-bold">
            ✕
          </button>
        </div>

        {error && (
          <div className="my-4 p-3 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-xs flex gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1">
              Required Item / Material Specification *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Dangote 3X 42.5R Portland Cement 50kg"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3.5 py-2.5 text-stone-100 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3.5 py-2.5 text-stone-100 focus:border-amber-500 focus:outline-none"
              >
                <option value="BUILDING_MATERIALS">Building Materials</option>
                <option value="PLUMBING_ELECTRICAL">Plumbing & Electrical</option>
                <option value="TOOLS_EQUIPMENT">Tools & Equipment</option>
                <option value="HARDWARE_FASTENERS">Hardware & Fasteners</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">Unit of Measure *</label>
              <select
                value={unitOfMeasure}
                onChange={(e) => setUnitOfMeasure(e.target.value)}
                className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3.5 py-2.5 text-stone-100 focus:border-amber-500 focus:outline-none"
              >
                <option value="BAG">Bag</option>
                <option value="PIECE">Piece</option>
                <option value="ROLL">Roll</option>
                <option value="LENGTH">Length</option>
                <option value="CARTON">Carton</option>
                <option value="SQM">Square Meter (m²)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">Required Quantity *</label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3.5 py-2.5 text-stone-100 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">Response Window</label>
              <select
                value={deadlineHours}
                onChange={(e) => setDeadlineHours(Number(e.target.value))}
                className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3.5 py-2.5 text-stone-100 focus:border-amber-500 focus:outline-none"
              >
                <option value={12}>12 Hours</option>
                <option value={24}>24 Hours</option>
                <option value={48}>48 Hours</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1">
              Fulfillment Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeliveryPreference('PICKUP')}
                className={`p-3 rounded-xl border text-center font-medium transition ${
                  deliveryPreference === 'PICKUP'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                    : 'border-stone-800 bg-stone-950 text-stone-400 hover:border-stone-700'
                }`}
              >
                🚚 Buyer Pickup (Self-arranged)
              </button>
              <button
                type="button"
                onClick={() => setDeliveryPreference('SELLER_DELIVERY')}
                className={`p-3 rounded-xl border text-center font-medium transition ${
                  deliveryPreference === 'SELLER_DELIVERY'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                    : 'border-stone-800 bg-stone-950 text-stone-400 hover:border-stone-700'
                }`}
              >
                📦 Seller-Arranged Delivery
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1">
              Delivery / Project Destination
            </label>
            <input
              type="text"
              placeholder="e.g. Lekki Phase 2 Site, Lagos"
              value={targetLocation}
              onChange={(e) => setTargetLocation(e.target.value)}
              className="w-full rounded-xl border border-stone-700 bg-stone-950 px-3.5 py-2.5 text-stone-100 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-stone-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-400 hover:text-stone-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 disabled:opacity-50 transition"
            >
              <Send className="h-4 w-4" />
              <span>{loading ? 'Broadcasting...' : 'Broadcast RFQ to Locations'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
