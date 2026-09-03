export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
export const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000/ws';

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || `HTTP error ${res.status}`);
  }
  return data.data;
}

export function formatSats(sats: number): string {
  return new Intl.NumberFormat('en-US').format(sats) + ' sats';
}

export function formatFiat(amount: number, currency: string = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
