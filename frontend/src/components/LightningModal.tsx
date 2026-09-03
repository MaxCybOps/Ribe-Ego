'use client';

import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Zap, Clock, Copy, CheckCircle2, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import { fetchApi, formatSats, formatFiat, WS_BASE } from '../lib/api';

interface LightningModalProps {
  orderId: string;
  onClose: () => void;
  onSettled: (order: any) => void;
}

export function LightningModal({ orderId, onClose, onSettled }: LightningModalProps) {
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(90);
  const [isSettled, setIsSettled] = useState(false);
  const [settling, setSettling] = useState(false);
  const [copied, setCopied] = useState(false);

  // 1. Fetch Lightning invoice with price lock
  const fetchInvoice = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchApi('/payments/create-invoice', {
        method: 'POST',
        body: JSON.stringify({ orderId }),
      });
      setInvoiceData(data);

      const expires = new Date(data.expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expires - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to generate Lightning invoice');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [orderId]);

  // 2. Countdown timer for 90-second price lock
  useEffect(() => {
    if (secondsRemaining <= 0 || isSettled) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsRemaining, isSettled]);

  // 3. Listen to WebSocket for payment settlement
  useEffect(() => {
    let ws: WebSocket;
    try {
      ws = new WebSocket(WS_BASE);
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'IDENTIFY', role: 'BUYER' }));
      };
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'ORDER_PAID' && msg.payload.order?.id === orderId) {
            setIsSettled(true);
            setTimeout(() => {
              onSettled(msg.payload.order);
            }, 1500);
          }
        } catch (e) {
          // ignore
        }
      };
    } catch (e) {
      console.warn('WebSocket connection error:', e);
    }
    return () => {
      if (ws) ws.close();
    };
  }, [orderId, onSettled]);

  // 4. Simulate test payment
  const handleSimulatePayment = async () => {
    if (!invoiceData) return;
    try {
      setSettling(true);
      const res = await fetchApi('/payments/simulate-settlement', {
        method: 'POST',
        body: JSON.stringify({ paymentHash: invoiceData.paymentHash }),
      });
      setIsSettled(true);
      setTimeout(() => {
        onSettled(res.order);
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Simulation error');
      setSettling(false);
    }
  };

  const copyToClipboard = () => {
    if (invoiceData?.paymentRequest) {
      navigator.clipboard.writeText(invoiceData.paymentRequest);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-md rounded-2xl border border-stone-800 bg-stone-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-100">Bitcoin Lightning Checkout</h3>
              <p className="text-xs text-stone-400 font-mono">Order #{invoiceData?.orderNumber || '...'}</p>
            </div>
          </div>
          {!isSettled && (
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-200 text-lg font-bold px-2 py-1 rounded"
            >
              ✕
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
            <p className="text-sm text-stone-400">Generating locked-rate Lightning invoice...</p>
          </div>
        ) : error ? (
          <div className="my-6 p-4 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-sm flex gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
            <div>
              <p className="font-semibold">Invoice Error</p>
              <p className="text-xs">{error}</p>
              <button
                onClick={fetchInvoice}
                className="mt-3 text-xs bg-red-900/60 hover:bg-red-800 px-3 py-1 rounded border border-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        ) : isSettled ? (
          <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mb-4 border border-emerald-500/40">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h4 className="text-lg font-bold text-emerald-400">Payment Settled in Seconds!</h4>
            <p className="text-xs text-stone-400 mt-1 max-w-xs">
              Transaction verified on Lightning Network. Inventory has been automatically deducted and receipt recorded.
            </p>
            <div className="mt-4 px-3 py-1.5 rounded-full bg-stone-950 text-xs font-mono text-stone-400 border border-stone-800">
              Trace: {invoiceData?.paymentHash?.slice(0, 16)}...
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-center">
            {/* Price Lock Timer */}
            <div className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-stone-950 border border-stone-800 mb-4">
              <div className="flex items-center gap-2 text-xs text-stone-400">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                <span>Price Lock Window</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-xs font-bold text-amber-400">
                {secondsRemaining > 0 ? (
                  <span>{secondsRemaining}s remaining</span>
                ) : (
                  <span className="text-red-400">Lock Expired</span>
                )}
              </div>
            </div>

            {/* Total Amounts */}
            <div className="w-full text-center py-2">
              <div className="text-2xl font-black text-amber-400 tracking-tight font-mono">
                {formatSats(invoiceData.amountSats)}
              </div>
              <div className="text-xs text-stone-400">
                ≈ {formatFiat(invoiceData.amountFiat)} (Rate: 1 BTC = ${invoiceData.exchangeRate?.toLocaleString()})
              </div>
            </div>

            {/* QR Code */}
            <div className="my-4 p-4 rounded-xl bg-white shadow-xl">
              <QRCodeSVG
                value={invoiceData.paymentRequest}
                size={210}
                level="M"
                includeMargin={false}
              />
            </div>

            {/* Copy Bolt11 String */}
            <button
              onClick={copyToClipboard}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-stone-800 hover:bg-stone-750 text-xs text-stone-300 border border-stone-700 transition"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>{copied ? 'Copied Bolt11 Invoice!' : 'Copy Lightning Invoice (Bolt11)'}</span>
            </button>

            {/* Simulated Payment Trigger for Phase 0 */}
            <div className="mt-5 w-full pt-4 border-t border-stone-800 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs text-stone-400">
                <ShieldCheck className="h-4 w-4 text-amber-400" />
                <span className="font-semibold text-stone-300">Phase 0 Test Harness:</span>
              </div>
              <button
                onClick={handleSimulatePayment}
                disabled={settling || secondsRemaining <= 0}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-sm shadow-lg shadow-amber-500/20 disabled:opacity-50 transition"
              >
                <Zap className="h-4 w-4 fill-stone-950" />
                <span>{settling ? 'Settling on Lightning...' : '⚡ Simulate Instant Payment'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
