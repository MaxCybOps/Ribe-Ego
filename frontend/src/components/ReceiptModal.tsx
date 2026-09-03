'use client';

import React from 'react';
import { Printer, X, CheckCircle2, ShieldCheck, MapPin, Zap } from 'lucide-react';
import { formatFiat, formatSats } from '../lib/api';

interface ReceiptModalProps {
  order: any;
  onClose: () => void;
}

export function ReceiptModal({ order, onClose }: ReceiptModalProps) {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border border-stone-800 bg-stone-900 p-8 shadow-2xl text-stone-100 print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between pb-6 border-b border-stone-800 print:hidden">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-stone-100">Permanent Digital Sales Receipt</h3>
              <p className="text-xs text-stone-400">Settled on Bitcoin Lightning Network</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-200 border border-stone-700"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Receipt</span>
            </button>
            <button onClick={onClose} className="text-stone-400 hover:text-stone-200 text-lg font-bold">
              ✕
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="mt-6 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start pb-6 border-b border-stone-800 print:border-gray-300">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-amber-400 print:text-black">RIBEÈGO ₿</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-stone-800 print:bg-gray-200 text-stone-300 print:text-black">
                  OFFICIAL RECEIPT
                </span>
              </div>
              <h2 className="text-lg font-bold text-stone-100 print:text-black mt-2">
                {order.seller?.businessName}
              </h2>
              <p className="text-xs text-stone-400 print:text-gray-600 flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 text-amber-400 print:text-black" />
                <span>{order.location?.name} • {order.location?.address}, {order.location?.city}</span>
              </p>
              <p className="text-xs text-stone-500 print:text-gray-500">Tel: {order.location?.contactPhone}</p>
            </div>

            <div className="text-right">
              <div className="text-xs text-stone-400 print:text-gray-600">Order Number</div>
              <div className="text-sm font-black font-mono text-amber-400 print:text-black">{order.orderNumber}</div>
              <div className="text-xs text-stone-400 print:text-gray-600 mt-2">Date & Time</div>
              <div className="text-xs font-mono text-stone-300 print:text-black">
                {new Date(order.createdAt).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-2 gap-4 pb-6 border-b border-stone-800 print:border-gray-300 text-xs">
            <div>
              <span className="font-bold text-stone-400 print:text-gray-600 uppercase tracking-wider text-[10px]">
                Billed To (Buyer)
              </span>
              <p className="font-bold text-stone-200 print:text-black text-sm mt-0.5">{order.buyer?.name}</p>
              <p className="text-stone-400 print:text-gray-600">{order.buyer?.email}</p>
              <p className="text-stone-400 print:text-gray-600">{order.buyer?.phoneNumber}</p>
            </div>

            <div>
              <span className="font-bold text-stone-400 print:text-gray-600 uppercase tracking-wider text-[10px]">
                Fulfillment Details
              </span>
              <p className="font-bold text-stone-200 print:text-black text-sm mt-0.5">Method: {order.fulfillmentType}</p>
              <p className="text-stone-400 print:text-gray-600">
                Destination: {order.deliveryAddress || `${order.location?.name} Pickup`}
              </p>
              <p className="text-stone-400 print:text-gray-600">Origin: {order.originType}</p>
            </div>
          </div>

          {/* Pickup Release PIN Banner */}
          {order.fulfillmentType === 'PICKUP' && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 print:border-black print:bg-gray-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 print:text-black">
                  Warehouse Pickup Verification PIN
                </span>
                <p className="text-xs text-stone-400 print:text-gray-600 mt-0.5">
                  Present this 6-digit code to warehouse staff to release physical stock.
                </p>
              </div>
              <div className="text-2xl font-black tracking-widest font-mono text-amber-400 print:text-black px-4 py-1.5 rounded-lg bg-stone-950 print:bg-white border border-amber-500/40 print:border-black">
                {order.pickupPin || 'PENDING'}
              </div>
            </div>
          )}

          {/* Itemized Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-stone-800 print:border-gray-400 text-stone-400 print:text-gray-600 font-semibold">
                <tr>
                  <th className="py-2.5">Item Description</th>
                  <th className="py-2.5">Unit of Measure</th>
                  <th className="py-2.5 text-center">Qty</th>
                  <th className="py-2.5 text-right">Unit Price</th>
                  <th className="py-2.5 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 print:divide-gray-200 font-mono">
                {order.items?.map((item: any) => (
                  <tr key={item.id}>
                    <td className="py-3 font-sans font-medium text-stone-200 print:text-black">{item.itemTitle}</td>
                    <td className="py-3">{item.unitOfMeasure}</td>
                    <td className="py-3 text-center">{item.quantity}</td>
                    <td className="py-3 text-right">{formatFiat(item.unitPriceFiat)}</td>
                    <td className="py-3 text-right font-bold text-stone-100 print:text-black">
                      {formatFiat(item.totalPriceFiat)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & Proof of Settlement */}
          <div className="pt-4 border-t border-stone-800 print:border-gray-300 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="text-xs space-y-1 text-stone-400 print:text-gray-600">
              <div className="flex items-center gap-1 text-emerald-400 print:text-black font-semibold">
                <ShieldCheck className="h-4 w-4" />
                <span>Lightning Network Cryptographic Settlement Proof</span>
              </div>
              <div className="font-mono text-[11px]">Payment Hash: {order.transaction?.paymentHash || 'N/A'}</div>
              {order.transaction?.preimage && (
                <div className="font-mono text-[11px] truncate max-w-sm">
                  Preimage: {order.transaction.preimage}
                </div>
              )}
              <div className="text-[11px]">Settlement Status: <strong className="text-emerald-400 print:text-black">{order.status}</strong></div>
            </div>

            <div className="w-full sm:w-64 space-y-2 text-right">
              <div className="flex justify-between text-xs text-stone-400 print:text-gray-600">
                <span>Subtotal (Fiat):</span>
                <span className="font-mono font-bold text-stone-200 print:text-black">{formatFiat(order.totalFiat)}</span>
              </div>
              <div className="flex justify-between text-xs text-stone-400 print:text-gray-600">
                <span>Settled in Satoshis:</span>
                <span className="font-mono font-bold text-amber-400 print:text-black">{formatSats(order.totalSats)}</span>
              </div>
              <div className="pt-2 border-t border-stone-800 print:border-gray-400 flex justify-between text-sm font-bold text-stone-100 print:text-black">
                <span>Total Paid:</span>
                <span className="font-mono text-amber-400 print:text-black">{formatFiat(order.totalFiat)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
