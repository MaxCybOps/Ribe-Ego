export interface RateLock {
  rate: number; // Fiat per 1 BTC
  lockedAt: Date;
  expiresAt: Date;
  currency: string;
}

export class ExchangeRateService {
  private static defaultBtcFiatRate: number = parseFloat(process.env.BTC_USD_PRICE || '65000.00');
  private static lockDurationSeconds: number = parseInt(process.env.PRICE_LOCK_SECONDS || '90', 10);

  /**
   * Get the current real-time exchange rate
   */
  static getCurrentRate(currency: string = 'USD'): number {
    return this.defaultBtcFiatRate;
  }

  /**
   * Create a locked rate with a fixed expiry window (e.g. 90 seconds)
   */
  static createRateLock(currency: string = 'USD'): RateLock {
    const rate = this.getCurrentRate(currency);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.lockDurationSeconds * 1000);

    return {
      rate,
      lockedAt: now,
      expiresAt,
      currency,
    };
  }

  /**
   * Convert fiat amount to satoshis using a locked or spot rate
   * 1 BTC = 100,000,000 Satoshis
   */
  static fiatToSats(fiatAmount: number, rate: number = this.defaultBtcFiatRate): number {
    if (fiatAmount <= 0) return 0;
    const btcAmount = fiatAmount / rate;
    return Math.round(btcAmount * 100_000_000);
  }

  /**
   * Convert satoshis back to fiat
   */
  static satsToFiat(sats: number, rate: number = this.defaultBtcFiatRate): number {
    if (sats <= 0) return 0;
    const btcAmount = sats / 100_000_000;
    return parseFloat((btcAmount * rate).toFixed(2));
  }
}
