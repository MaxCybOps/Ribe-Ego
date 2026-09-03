import { ILightningProvider, CreateInvoiceParams, LightningInvoice, InvoiceStatus } from './types.js';

/**
 * PolarLightningProvider: Connects to local Polar LND / Core Lightning / LNbits REST API.
 * Uses standard REST endpoints when Polar is running in Docker.
 */
export class PolarLightningProvider implements ILightningProvider {
  readonly providerName = 'PolarLightningProvider';
  private apiUrl: string;
  private macaroon?: string;

  constructor(apiUrl: string = process.env.POLAR_API_URL || 'http://localhost:8080', macaroon?: string) {
    this.apiUrl = apiUrl;
    this.macaroon = macaroon || process.env.POLAR_MACAROON;
  }

  async createInvoice(params: CreateInvoiceParams): Promise<LightningInvoice> {
    try {
      const response = await fetch(`${this.apiUrl}/v1/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.macaroon ? { 'Grpc-Metadata-macaroon': this.macaroon } : {}),
        },
        body: JSON.stringify({
          value: params.amountSats,
          memo: params.memo,
          expiry: params.expirySeconds || 90,
        }),
      });

      if (!response.ok) {
        throw new Error(`Polar LND error: ${response.statusText}`);
      }

      const data = await response.json() as any;
      const paymentHash = Buffer.from(data.r_hash, 'base64').toString('hex');
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
      throw new Error(`PolarLightningProvider failed to create invoice: ${error.message}`);
    }
  }

  async getInvoiceStatus(paymentHash: string): Promise<InvoiceStatus> {
    try {
      const response = await fetch(`${this.apiUrl}/v1/invoice/${paymentHash}`, {
        headers: {
          ...(this.macaroon ? { 'Grpc-Metadata-macaroon': this.macaroon } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`Polar invoice query failed: ${response.statusText}`);
      }

      const data = await response.json() as any;
      const isSettled = data.settled === true;
      const preimage = data.r_preimage ? Buffer.from(data.r_preimage, 'base64').toString('hex') : undefined;

      return {
        paymentHash,
        isSettled,
        settledAt: isSettled ? new Date(parseInt(data.settle_date, 10) * 1000) : undefined,
        preimage,
        amountSats: parseInt(data.value, 10),
      };
    } catch (error: any) {
      throw new Error(`PolarLightningProvider getInvoiceStatus error: ${error.message}`);
    }
  }

  async simulatePaymentSettlement(paymentHash: string): Promise<InvoiceStatus> {
    // In polar, one can pay the invoice via the Polar GUI or API
    return this.getInvoiceStatus(paymentHash);
  }
}
