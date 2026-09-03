import { ILightningProvider, CreateInvoiceParams, LightningInvoice, InvoiceStatus } from './types.js';

/**
 * LNbitsLightningProvider: Connects to a self-hosted or cloud LNbits instance.
 * LNbits is a lightweight, battle-tested Lightning wallet and extension engine.
 */
export class LNbitsLightningProvider implements ILightningProvider {
  readonly providerName = 'LNbitsLightningProvider';
  private apiUrl: string;
  private apiKey: string;
  private webhookUrl?: string;

  constructor(
    apiUrl: string = process.env.LNBITS_API_URL || 'https://legend.lnbits.com',
    apiKey: string = process.env.LNBITS_API_KEY || '',
    webhookUrl?: string
  ) {
    this.apiUrl = apiUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.webhookUrl = webhookUrl || process.env.LIGHTNING_WEBHOOK_URL;
  }

  async createInvoice(params: CreateInvoiceParams): Promise<LightningInvoice> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey,
        },
        body: JSON.stringify({
          out: false,
          amount: params.amountSats,
          memo: params.memo,
          expiry: params.expirySeconds || 90,
          webhook: this.webhookUrl,
          extra: params.metadata,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`LNbits API error (${response.status}): ${errText}`);
      }

      const data = await response.json() as any;
      const paymentHash = data.payment_hash;
      const paymentRequest = data.payment_request;
      const expiresAt = new Date(Date.now() + (params.expirySeconds || 90) * 1000);

      return {
        paymentHash,
        paymentRequest,
        amountSats: params.amountSats,
        expiresAt,
        metadata: params.metadata,
      };
    } catch (error: any) {
      throw new Error(`LNbits createInvoice failed: ${error.message}`);
    }
  }

  async getInvoiceStatus(paymentHash: string): Promise<InvoiceStatus> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/payments/${paymentHash}`, {
        headers: {
          'X-Api-Key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`LNbits query error: ${response.statusText}`);
      }

      const data = await response.json() as any;
      const isSettled = data.paid === true;

      return {
        paymentHash,
        isSettled,
        settledAt: isSettled ? new Date(data.details?.payment_time * 1000 || Date.now()) : undefined,
        preimage: data.preimage,
        amountSats: Math.abs(data.details?.amount || 0) / 1000, // LNbits amounts can be in msats
      };
    } catch (error: any) {
      throw new Error(`LNbits getInvoiceStatus error: ${error.message}`);
    }
  }

  async simulatePaymentSettlement(paymentHash: string): Promise<InvoiceStatus> {
    return this.getInvoiceStatus(paymentHash);
  }
}
