import crypto from 'crypto';
import { ILightningProvider, CreateInvoiceParams, LightningInvoice, InvoiceStatus } from './types.js';

/**
 * OpenNodeLightningProvider: Connects to OpenNode Managed Lightning API.
 * Supports standard charge generation and HMAC-SHA256 signature validation.
 */
export class OpenNodeLightningProvider implements ILightningProvider {
  readonly providerName = 'OpenNodeLightningProvider';
  private apiUrl: string;
  private apiKey: string;
  private webhookSecret?: string;

  constructor(
    apiUrl: string = process.env.OPENNODE_API_URL || 'https://api.opennode.com',
    apiKey: string = process.env.OPENNODE_API_KEY || '',
    webhookSecret?: string
  ) {
    this.apiUrl = apiUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.webhookSecret = webhookSecret || process.env.OPENNODE_WEBHOOK_SECRET;
  }

  async createInvoice(params: CreateInvoiceParams): Promise<LightningInvoice> {
    try {
      const response = await fetch(`${this.apiUrl}/v1/charges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.apiKey,
        },
        body: JSON.stringify({
          amount: params.amountSats,
          description: params.memo,
          expiry: params.expirySeconds || 90,
          callback_url: process.env.LIGHTNING_WEBHOOK_URL,
          metadata: params.metadata,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenNode API error (${response.status}): ${errText}`);
      }

      const res = await response.json() as any;
      const charge = res.data;
      const paymentHash = charge.id;
      const paymentRequest = charge.lightning_invoice?.payreq || charge.uri;
      const expiresAt = new Date(Date.now() + (params.expirySeconds || 90) * 1000);

      return {
        paymentHash,
        paymentRequest,
        amountSats: params.amountSats,
        expiresAt,
        metadata: params.metadata,
      };
    } catch (error: any) {
      throw new Error(`OpenNode createInvoice failed: ${error.message}`);
    }
  }

  async getInvoiceStatus(chargeId: string): Promise<InvoiceStatus> {
    try {
      const response = await fetch(`${this.apiUrl}/v1/charge/${chargeId}`, {
        headers: {
          'Authorization': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`OpenNode query error: ${response.statusText}`);
      }

      const res = await response.json() as any;
      const charge = res.data;
      const isSettled = charge.status === 'paid';

      return {
        paymentHash: charge.id,
        isSettled,
        settledAt: isSettled ? new Date() : undefined,
        preimage: charge.hashed_order,
        amountSats: charge.amount,
      };
    } catch (error: any) {
      throw new Error(`OpenNode getInvoiceStatus error: ${error.message}`);
    }
  }

  async simulatePaymentSettlement(chargeId: string): Promise<InvoiceStatus> {
    return this.getInvoiceStatus(chargeId);
  }

  /**
   * Validate webhook HMAC-SHA256 signature
   */
  verifyWebhookSignature(payload: string, headerHmac: string): boolean {
    if (!this.webhookSecret) return true;
    const computedHmac = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');
    return computedHmac === headerHmac;
  }
}
