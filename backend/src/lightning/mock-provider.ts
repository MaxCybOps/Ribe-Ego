import crypto from 'crypto';
import { ILightningProvider, CreateInvoiceParams, LightningInvoice, InvoiceStatus } from './types.js';

interface StoredMockInvoice {
  paymentHash: string;
  paymentRequest: string;
  amountSats: number;
  memo: string;
  expiresAt: Date;
  isSettled: boolean;
  settledAt?: Date;
  preimage?: string;
  metadata?: Record<string, any>;
}

export class MockLightningProvider implements ILightningProvider {
  readonly providerName = 'MockLightningProvider';
  private invoices = new Map<string, StoredMockInvoice>();

  async createInvoice(params: CreateInvoiceParams): Promise<LightningInvoice> {
    const preimage = crypto.randomBytes(32).toString('hex');
    const paymentHash = crypto.createHash('sha256').update(Buffer.from(preimage, 'hex')).digest('hex');
    const expirySeconds = params.expirySeconds || 90;
    const expiresAt = new Date(Date.now() + expirySeconds * 1000);

    // Realistic bolt11 simulated invoice format
    const randomSuffix = crypto.randomBytes(16).toString('hex');
    const paymentRequest = `lnbc${params.amountSats}u1p${paymentHash.slice(0, 20)}${randomSuffix}`;

    const invoice: StoredMockInvoice = {
      paymentHash,
      paymentRequest,
      amountSats: params.amountSats,
      memo: params.memo,
      expiresAt,
      isSettled: false,
      metadata: params.metadata,
    };

    this.invoices.set(paymentHash, invoice);

    return {
      paymentHash,
      paymentRequest,
      amountSats: params.amountSats,
      expiresAt,
      metadata: params.metadata,
    };
  }

  async getInvoiceStatus(paymentHash: string): Promise<InvoiceStatus> {
    const invoice = this.invoices.get(paymentHash);
    if (!invoice) {
      throw new Error(`Invoice not found for paymentHash: ${paymentHash}`);
    }

    return {
      paymentHash: invoice.paymentHash,
      isSettled: invoice.isSettled,
      settledAt: invoice.settledAt,
      preimage: invoice.preimage,
      amountSats: invoice.amountSats,
    };
  }

  async simulatePaymentSettlement(paymentHash: string): Promise<InvoiceStatus> {
    const invoice = this.invoices.get(paymentHash);
    if (!invoice) {
      throw new Error(`Invoice not found for paymentHash: ${paymentHash}`);
    }

    if (!invoice.isSettled) {
      invoice.isSettled = true;
      invoice.settledAt = new Date();
      invoice.preimage = crypto.randomBytes(32).toString('hex');
      this.invoices.set(paymentHash, invoice);
    }

    return {
      paymentHash: invoice.paymentHash,
      isSettled: invoice.isSettled,
      settledAt: invoice.settledAt,
      preimage: invoice.preimage,
      amountSats: invoice.amountSats,
    };
  }
}
